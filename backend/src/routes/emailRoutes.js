const express = require("express");
const pool = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const {
    verifyEmailConnection,
    sendEmail
} = require("../services/emailService");

const router = express.Router();

router.use(
    authenticateToken,
    authorizeRoles("SUPER_ADMIN", "BRANCH_ADMIN")
);

function getActorId(user) {
    const id = Number(user.id || user.user_id);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function getBranchScope(user, requestedBranchId) {
    if (user.role === "BRANCH_ADMIN") {
        const branchId = Number(user.branch_id);

        if (!Number.isInteger(branchId) || branchId < 1) {
            const error = new Error("Your admin account has no assigned branch.");
            error.status = 403;
            throw error;
        }

        return branchId;
    }

    if (requestedBranchId === undefined || requestedBranchId === null ||
        requestedBranchId === "" || requestedBranchId === "all") {
        return null;
    }

    const branchId = Number(requestedBranchId);

    if (!Number.isInteger(branchId) || branchId < 1) {
        const error = new Error("Invalid branch selection.");
        error.status = 400;
        throw error;
    }

    return branchId;
}

function fillTemplate(value, parent) {
    return String(value)
        .replaceAll("{parent_name}", parent.parent_name || "Parent")
        .replaceAll("{student_names}", parent.student_names || "your child");
}

/* Gmail SMTP connection status */
router.get("/status", async (req, res) => {
    try {
        await verifyEmailConnection();

        res.json({
            success: true,
            configured: true,
            sender: process.env.EMAIL_USER,
            message: "Gmail SMTP connection verified."
        });
    } catch (error) {
        console.error("Email connection check failed:", error.message);

        res.status(503).json({
            success: false,
            configured: false,
            message: "Gmail SMTP connection failed. Check the backend email configuration."
        });
    }
});

/* Parent contacts available to the logged-in admin */
router.get("/parents", async (req, res) => {
    try {
        const branchId = getBranchScope(req.user, req.query.branch_id);

        const result = await pool.query(
            `
            SELECT
                u.id AS parent_user_id,
                u.full_name AS parent_name,
                u.email,
                ARRAY_AGG(DISTINCT s.name)
                    FILTER (WHERE s.name IS NOT NULL) AS student_names,
                ARRAY_AGG(DISTINCT s.branch_id)
                    FILTER (WHERE s.branch_id IS NOT NULL) AS branch_ids
            FROM parent_students ps
            JOIN users u
                ON u.id = ps.parent_user_id
            JOIN students s
                ON s.id = ps.student_id
            WHERE u.role = 'PARENT'
              AND u.email IS NOT NULL
              AND TRIM(u.email) <> ''
              AND ($1::INTEGER IS NULL OR s.branch_id = $1)
            GROUP BY u.id, u.full_name, u.email
            ORDER BY u.full_name
            `,
            [branchId]
        );

        res.json({
            total: result.rows.length,
            parents: result.rows.map(parent => ({
                ...parent,
                student_names: (parent.student_names || []).join(", ")
            }))
        });
    } catch (error) {
        console.error("Email parent lookup failed:", error.message);

        res.status(error.status || 500).json({
            message: error.status ? error.message : "Unable to load parent contacts."
        });
    }
});

/* Read templates visible to this admin */
router.get("/templates", async (req, res) => {
    try {
        const branchId = getBranchScope(req.user, req.query.branch_id);

        const result = await pool.query(
            `
            SELECT id, name, subject, body, branch_id, created_at
            FROM email_templates
            WHERE branch_id IS NULL
               OR branch_id = $1
            ORDER BY name
            `,
            [branchId]
        );

        res.json({ templates: result.rows });
    } catch (error) {
        console.error("Email templates fetch failed:", error.message);

        res.status(error.status || 500).json({
            message: error.status ? error.message : "Unable to load email templates."
        });
    }
});

/* Create a template */
router.post("/templates", async (req, res) => {
    try {
        const { name, subject, body } = req.body || {};

        if (
            !String(name || "").trim() ||
            !String(subject || "").trim() ||
            !String(body || "").trim()
        ) {
            return res.status(400).json({
                message: "Template name, subject and body are required."
            });
        }

        const branchId = getBranchScope(req.user, req.body.branch_id);

        const result = await pool.query(
            `
            INSERT INTO email_templates
                (name, subject, body, branch_id, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [
                String(name).trim(),
                String(subject).trim(),
                String(body).trim(),
                branchId,
                getActorId(req.user)
            ]
        );

        res.status(201).json({
            message: "Email template saved.",
            template: result.rows[0]
        });
    } catch (error) {
        console.error("Email template save failed:", error.message);

        res.status(error.status || 500).json({
            message: error.status ? error.message : "Unable to save email template."
        });
    }
});

/* Send an email to selected parent accounts */
router.post("/send", async (req, res) => {
    try {
        const {
            parentUserIds,
            subject,
            body,
            branch_id
        } = req.body || {};

        if (
            !Array.isArray(parentUserIds) ||
            parentUserIds.length === 0 ||
            parentUserIds.length > 100
        ) {
            return res.status(400).json({
                message: "Select between 1 and 100 parent contacts."
            });
        }

        if (
            !String(subject || "").trim() ||
            !String(body || "").trim()
        ) {
            return res.status(400).json({
                message: "Email subject and message are required."
            });
        }

        const ids = [...new Set(parentUserIds.map(Number))];

        if (ids.some(id => !Number.isInteger(id) || id < 1)) {
            return res.status(400).json({
                message: "One or more selected parent IDs are invalid."
            });
        }

        const branchId = getBranchScope(req.user, branch_id);

        const contacts = await pool.query(
            `
            SELECT
                u.id AS parent_user_id,
                u.full_name AS parent_name,
                u.email,
                STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name)
                    AS student_names
            FROM parent_students ps
            JOIN users u
                ON u.id = ps.parent_user_id
            JOIN students s
                ON s.id = ps.student_id
            WHERE u.role = 'PARENT'
              AND u.id = ANY($1::INTEGER[])
              AND ($2::INTEGER IS NULL OR s.branch_id = $2)
            GROUP BY u.id, u.full_name, u.email
            ORDER BY u.full_name
            `,
            [ids, branchId]
        );

        const foundIds = new Set(
            contacts.rows.map(row => Number(row.parent_user_id))
        );

        const unavailable = ids.filter(id => !foundIds.has(id));

        if (unavailable.length > 0) {
            return res.status(400).json({
                message: "Some selected parent accounts are unavailable in your branch scope.",
                unavailableParentIds: unavailable
            });
        }

        const invalidEmails = contacts.rows.filter(
            parent => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent.email || "")
        );

        if (invalidEmails.length > 0) {
            return res.status(400).json({
                message: "Some selected parents do not have a valid email address.",
                parentUserIds: invalidEmails.map(item => item.parent_user_id)
            });
        }

        const results = [];

        for (const parent of contacts.rows) {
            const personalizedSubject = fillTemplate(subject.trim(), parent);
            const personalizedBody = fillTemplate(body.trim(), parent);

            try {
                const info = await sendEmail({
                    to: parent.email,
                    subject: personalizedSubject,
                    text: personalizedBody
                });

                await pool.query(
                    `
                    INSERT INTO email_history (
                        recipient_user_id,
                        recipient_name,
                        recipient_email,
                        subject,
                        body,
                        branch_id,
                        status,
                        provider_response,
                        created_by,
                        created_by_role
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 'ACCEPTED', $7, $8, $9)
                    `,
                    [
                        parent.parent_user_id,
                        parent.parent_name,
                        parent.email,
                        personalizedSubject,
                        personalizedBody,
                        branchId,
                        info.messageId || null,
                        getActorId(req.user),
                        req.user.role
                    ]
                );

                results.push({
                    parentUserId: parent.parent_user_id,
                    email: parent.email,
                    status: "ACCEPTED"
                });
            } catch (sendError) {
                console.error(
                    "Email send failed:",
                    parent.email,
                    sendError.message
                );

                await pool.query(
                    `
                    INSERT INTO email_history (
                        recipient_user_id,
                        recipient_name,
                        recipient_email,
                        subject,
                        body,
                        branch_id,
                        status,
                        error_message,
                        created_by,
                        created_by_role
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 'FAILED', $7, $8, $9)
                    `,
                    [
                        parent.parent_user_id,
                        parent.parent_name,
                        parent.email,
                        personalizedSubject,
                        personalizedBody,
                        branchId,
                        sendError.message,
                        getActorId(req.user),
                        req.user.role
                    ]
                );

                results.push({
                    parentUserId: parent.parent_user_id,
                    email: parent.email,
                    status: "FAILED"
                });
            }
        }

        const accepted = results.filter(item => item.status === "ACCEPTED").length;
        const failed = results.length - accepted;

        res.json({
            success: failed === 0,
            message: `${accepted} email(s) accepted by Gmail SMTP; ${failed} failed.`,
            accepted,
            failed,
            results,
            note: "SMTP acceptance does not confirm delivery to the recipient's inbox."
        });
    } catch (error) {
        console.error("Email send request failed:", error.message);

        res.status(error.status || 500).json({
            message: error.status ? error.message : "Unable to process email request."
        });
    }
});

/* Email history */
router.get("/history", async (req, res) => {
    try {
        const branchId = getBranchScope(req.user, req.query.branch_id);

        const result = await pool.query(
            `
            SELECT
                id,
                recipient_name,
                recipient_email,
                subject,
                status,
                error_message,
                branch_id,
                created_by_role,
                created_at
            FROM email_history
            WHERE ($1::INTEGER IS NULL OR branch_id = $1)
            ORDER BY created_at DESC
            LIMIT 200
            `,
            [branchId]
        );

        res.json({
            total: result.rows.length,
            history: result.rows
        });
    } catch (error) {
        console.error("Email history fetch failed:", error.message);

        res.status(error.status || 500).json({
            message: error.status ? error.message : "Unable to load email history."
        });
    }
});

module.exports = router;
