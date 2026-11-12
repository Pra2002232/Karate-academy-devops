const express = require("express");

const router = express.Router();

const pool = require("../config/db");

const {
    sendWhatsAppTemplateMessage,
    getWhatsAppConfig
} = require("../services/whatsappService");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(authenticateToken);


/*
|--------------------------------------------------------------------------
| GET ALL COMPETITIONS
|--------------------------------------------------------------------------
|
| SUPER_ADMIN:
|   All branches
|
| BRANCH_ADMIN:
|   Own branch
|
| PARENT:
|   View only
|
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                c.id,
                c.competition_name,
                c.competition_date,
                c.reporting_time,
                c.location,
                c.organizer,
                c.description,
                c.created_at,

                c.branch_id,

                b.branch_name,
                b.branch_code,

                COUNT(cp.id)::int
                    AS registered_students

            FROM competitions c

            LEFT JOIN branches b
                ON b.id = c.branch_id

            LEFT JOIN competition_participants cp
                ON cp.competition_id = c.id
               AND cp.registration_status != 'CANCELLED'

            GROUP BY
                c.id,
                b.branch_name,
                b.branch_code

            ORDER BY
                c.competition_date ASC,
                c.id DESC
        `);

        res.json({
            competitions:
                result.rows
        });

    } catch (error) {

        console.error(
            "Get competitions error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch competitions"
        });

    }

});


/*
|--------------------------------------------------------------------------
| GET COMPETITION DASHBOARD SUMMARY
|--------------------------------------------------------------------------
*/

router.get("/dashboard", async (req, res) => {

    try {

        const result =
            await pool.query(`
                SELECT

                    COUNT(*) FILTER (
                        WHERE competition_date >= CURRENT_DATE
                    )::int
                    AS upcoming_competitions,

                    COUNT(*) FILTER (
                        WHERE competition_date < CURRENT_DATE
                    )::int
                    AS completed_competitions

                FROM competitions
            `);

        const registrations =
            await pool.query(`
                SELECT
                    COUNT(*)::int
                    AS total_registrations

                FROM competition_participants

                WHERE registration_status != 'CANCELLED'
            `);

        res.json({

            upcoming_competitions:
                result.rows[0]
                    .upcoming_competitions,

            completed_competitions:
                result.rows[0]
                    .completed_competitions,

            total_registrations:
                registrations.rows[0]
                    .total_registrations

        });

    } catch (error) {

        console.error(
            "Competition dashboard error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to load competition dashboard"
        });

    }

});


/*
|--------------------------------------------------------------------------
| GET ACTIVE BRANCHES FOR SUPER ADMIN
|--------------------------------------------------------------------------
*/

router.get(
    "/branches",
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const result =
                await pool.query(`
                    SELECT
                        id,
                        branch_name,
                        branch_code
                    FROM branches
                    WHERE status = 'ACTIVE'
                    ORDER BY branch_name
                `);

            res.json({
                branches:
                    result.rows
            });

        } catch (error) {

            console.error(
                "Competition branches error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load branches"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| GET ALL COMPETITION RESULTS
|--------------------------------------------------------------------------
*/

router.get("/results", async (req, res) => {

    try {

        const result =
            await pool.query(`
                SELECT

                    cr.id,
                    cr.competition_id,
                    cr.student_id,

                    c.competition_name,
                    c.competition_date,
                    c.location,

                    c.branch_id,
                    b.branch_name,
                    b.branch_code,

                    s.student_code,
                    s.name,
                    s.belt,

                    cr.category,
                    cr.event,
                    cr.result,
                    cr.medal,
                    cr.position,
                    cr.remarks

                FROM competition_results cr

                JOIN competitions c
                    ON c.id =
                       cr.competition_id

                LEFT JOIN branches b
                    ON b.id =
                       c.branch_id

                JOIN students s
                    ON s.id =
                       cr.student_id

                ORDER BY
                    c.competition_date DESC,
                    cr.position NULLS LAST,
                    s.name ASC
            `);

        res.json({
            results:
                result.rows
        });

    } catch (error) {

        console.error(
            "Get competition results error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch competition results"
        });

    }

});


/*
|--------------------------------------------------------------------------
| GET SINGLE COMPETITION
|--------------------------------------------------------------------------
*/

router.get("/:id", async (req, res) => {

    try {

        const {
            id
        } = req.params;

        const competition =
            await pool.query(
                `
                SELECT

                    c.id,
                    c.competition_name,
                    c.competition_date,
                    c.reporting_time,
                    c.location,
                    c.organizer,
                    c.description,
                    c.created_at,

                    c.branch_id,

                    b.branch_name,
                    b.branch_code

                FROM competitions c

                LEFT JOIN branches b
                    ON b.id = c.branch_id

                WHERE c.id = $1
                `,
                [id]
            );

        if (
            competition.rows.length === 0
        ) {

            return res.status(404).json({
                message:
                    "Competition not found"
            });

        }

        const participants =
            await pool.query(
                `
                SELECT

                    cp.id,
                    cp.student_id,

                    s.student_code,
                    s.name,
                    s.belt,

                    cp.category,
                    cp.event,
                    cp.registration_status,
                    cp.fee_status,
                    cp.registered_at,
                    cp.remarks

                FROM competition_participants cp

                JOIN students s
                    ON cp.student_id = s.id

                WHERE
                    cp.competition_id = $1

                ORDER BY
                    s.name ASC
                `,
                [id]
            );

        const results =
            await pool.query(
                `
                SELECT

                    cr.id,
                    cr.student_id,

                    s.student_code,
                    s.name,

                    cr.category,
                    cr.event,
                    cr.result,
                    cr.medal,
                    cr.position,
                    cr.remarks

                FROM competition_results cr

                JOIN students s
                    ON s.id = cr.student_id

                WHERE
                    cr.competition_id = $1

                ORDER BY
                    cr.position NULLS LAST,
                    s.name ASC
                `,
                [id]
            );

        res.json({

            competition:
                competition.rows[0],

            participants:
                participants.rows,

            results:
                results.rows

        });

    } catch (error) {

        console.error(
            "Get competition error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch competition"
        });

    }

});


/*
|--------------------------------------------------------------------------
| CREATE COMPETITION
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                competition_name,
                competition_date,
                reporting_time,
                location,
                organizer,
                description
            } = req.body;

            if (
                !competition_name ||
                !competition_date
            ) {

                return res.status(400).json({
                    message:
                        "Competition name and date are required"
                });

            }

            /*
             * SUPER_ADMIN
             * -----------
             * Competition is academy-wide.
             * branch_id = NULL.
             *
             * BRANCH_ADMIN
             * ------------
             * Automatically use the branch assigned
             * to the logged-in admin.
             *
             * No branch selector is required in the UI.
             */

            let branchId = null;

            if (
                req.user.role ===
                "BRANCH_ADMIN"
            ) {

                /*
                 * Resolve branch from the database as well.
                 * This prevents an old/stale JWT branch_id
                 * from breaking competition creation.
                 */

                const userResult =
                    await pool.query(
                        `
                        SELECT
                            branch_id
                        FROM users
                        WHERE id = $1
                          AND role = 'BRANCH_ADMIN'
                          AND status = 'ACTIVE'
                        `,
                        [req.user.id]
                    );

                branchId =
                    userResult.rows[0]?.branch_id ||
                    null;

                if (!branchId) {

                    return res.status(400).json({
                        message:
                            "Branch Admin is not assigned to a branch"
                    });

                }

            }

            /*
             * Super Admin intentionally leaves
             * branchId as NULL.
             */

            const result =
                await pool.query(
                    `
                    INSERT INTO competitions
                    (
                        competition_name,
                        competition_date,
                        reporting_time,
                        location,
                        organizer,
                        description,
                        branch_id
                    )

                    VALUES
                    ($1,$2,$3,$4,$5,$6,$7)

                    RETURNING *
                    `,
                    [
                        competition_name.trim(),
                        competition_date,
                        reporting_time || null,
                        location || null,
                        organizer || null,
                        description || null,
                        branchId
                    ]
                );

            res.status(201).json({

                message:
                    "Competition created successfully",

                competition:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "Create competition error:",
                error
            );

            res.status(500).json({

                message:
                    error.message ||
                    "Failed to create competition"

            });

        }

    }
);



router.put(
    "/:id",
    authorizeRoles("SUPER_ADMIN", "BRANCH_ADMIN"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const {
                competition_name,
                competition_date,
                reporting_time,
                location,
                organizer,
                description,
                branch_id
            } = req.body;

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: "Invalid competition ID"
                });
            }

            if (!competition_name?.trim() || !competition_date) {
                return res.status(400).json({
                    message: "Competition name and date are required"
                });
            }

            const current = await pool.query(
                `SELECT id, branch_id
                 FROM competitions
                 WHERE id = $1`,
                [id]
            );

            if (current.rows.length === 0) {
                return res.status(404).json({
                    message: "Competition not found"
                });
            }

            const currentBranchId = current.rows[0].branch_id;
            let finalBranchId = currentBranchId;

            if (req.user.role === "BRANCH_ADMIN") {
                // Resolve current assignment from the database rather
                // than relying on a potentially stale JWT branch_id.
                const assigned = await pool.query(
                    `SELECT u.branch_id
                     FROM users u
                     JOIN branches b
                       ON b.id = u.branch_id
                      AND b.status = 'ACTIVE'
                     WHERE u.id = $1
                       AND u.role = 'BRANCH_ADMIN'
                       AND u.status = 'ACTIVE'`,
                    [req.user.id]
                );

                const ownBranchId = assigned.rows[0]?.branch_id;

                if (!ownBranchId) {
                    return res.status(400).json({
                        message: "Branch Admin has no active branch assignment"
                    });
                }

                if (
                    currentBranchId == null ||
                    Number(currentBranchId) !== Number(ownBranchId)
                ) {
                    return res.status(403).json({
                        message: "You can only edit competitions belonging to your branch"
                    });
                }

                finalBranchId = Number(ownBranchId);
            } else if (
                req.user.role === "SUPER_ADMIN" &&
                Object.prototype.hasOwnProperty.call(req.body, "branch_id")
            ) {
                // A supplied blank/null branch explicitly means academy-wide.
                if (branch_id === null || branch_id === "") {
                    finalBranchId = null;
                } else {
                    const targetBranchId = Number(branch_id);

                    if (
                        !Number.isSafeInteger(targetBranchId) ||
                        targetBranchId <= 0
                    ) {
                        return res.status(400).json({
                            message: "Selected branch is invalid or inactive"
                        });
                    }

                    const activeBranch = await pool.query(
                        `SELECT id
                         FROM branches
                         WHERE id = $1
                           AND status = 'ACTIVE'`,
                        [targetBranchId]
                    );

                    if (activeBranch.rows.length === 0) {
                        return res.status(400).json({
                            message: "Selected branch is invalid or inactive"
                        });
                    }

                    finalBranchId = targetBranchId;
                }
            }
            // If branch_id was omitted, preserve the current branch_id.
            // In particular, a NULL branch remains valid for Super Admin.

            const updated = await pool.query(
                `UPDATE competitions
                 SET competition_name = $1,
                     competition_date = $2,
                     reporting_time = $3,
                     location = $4,
                     organizer = $5,
                     description = $6,
                     branch_id = $7
                 WHERE id = $8
                 RETURNING *`,
                [
                    competition_name.trim(),
                    competition_date,
                    reporting_time || null,
                    location || null,
                    organizer || null,
                    description || null,
                    finalBranchId,
                    id
                ]
            );

            res.json({
                message: "Competition updated successfully",
                competition: updated.rows[0]
            });
        } catch (error) {
            console.error("Update competition error:", error);
            res.status(500).json({
                message: error.message || "Failed to update competition"
            });
        }
    }
);


router.delete(
    "/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const current =
                await pool.query(
                    `
                    SELECT
                        id,
                        branch_id

                    FROM competitions

                    WHERE id = $1
                    `,
                    [id]
                );

            if (
                current.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Competition not found"
                });

            }

            if (
                req.user.role ===
                "BRANCH_ADMIN" &&
                Number(
                    current.rows[0].branch_id
                ) !==
                Number(
                    req.user.branch_id
                )
            ) {

                return res.status(403).json({
                    message:
                        "You can only delete competitions belonging to your branch"
                });

            }

            await pool.query(
                `
                DELETE FROM competitions
                WHERE id = $1
                `,
                [id]
            );

            res.json({
                message:
                    "Competition deleted successfully"
            });

        } catch (error) {

            console.error(
                "Delete competition error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to delete competition"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| REGISTER STUDENT
|--------------------------------------------------------------------------
*/

router.post(
    "/:competitionId/register",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                competitionId
            } = req.params;

            const {
                student_id,
                category,
                event,
                remarks
            } = req.body;

            if (!student_id) {

                return res.status(400).json({
                    message:
                        "Student is required"
                });

            }

            const competition =
                await pool.query(
                    `
                    SELECT
                        id,
                        branch_id

                    FROM competitions

                    WHERE id = $1
                    `,
                    [competitionId]
                );

            if (
                competition.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Competition not found"
                });

            }

            if (
                req.user.role ===
                "BRANCH_ADMIN" &&
                Number(
                    competition.rows[0].branch_id
                ) !==
                Number(
                    req.user.branch_id
                )
            ) {

                return res.status(403).json({
                    message:
                        "Competition does not belong to your branch"
                });

            }

            const student =
                await pool.query(
                    `
                    SELECT
                        id,
                        name,
                        branch_id

                    FROM students

                    WHERE id = $1
                      AND status = 'ACTIVE'
                    `,
                    [student_id]
                );

            if (
                student.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Active student not found"
                });

            }

            const result =
                await pool.query(
                    `
                    INSERT INTO competition_participants
                    (
                        competition_id,
                        student_id,
                        category,
                        event,
                        registration_status,
                        fee_status,
                        remarks
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        'REGISTERED',
                        'PENDING',
                        $5
                    )

                    RETURNING *
                    `,
                    [
                        competitionId,
                        student_id,
                        category || null,
                        event || null,
                        remarks || null
                    ]
                );

            res.status(201).json({

                message:
                    "Student registered successfully",

                participant:
                    result.rows[0]

            });

        } catch (error) {

            if (
                error.code === "23505"
            ) {

                return res.status(409).json({
                    message:
                        "Student is already registered for this competition and event"
                });

            }

            console.error(
                "Register student error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to register student"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| UPDATE REGISTRATION
|--------------------------------------------------------------------------
*/


router.put(
    "/registration/:id/fee",
    authorizeRoles("SUPER_ADMIN", "BRANCH_ADMIN"),
    async (req, res) => {
        try {
            const registrationId = Number(req.params.id);

            if (!Number.isSafeInteger(registrationId) || registrationId <= 0) {
                return res.status(400).json({
                    message: "Invalid registration ID"
                });
            }

            const current = await pool.query(
                `SELECT
                    cp.id,
                    cp.student_id,
                    cp.competition_id,
                    s.branch_id AS student_branch_id,
                    c.branch_id AS competition_branch_id
                 FROM public.competition_participants cp
                 JOIN public.students s
                   ON s.id = cp.student_id
                 JOIN public.competitions c
                   ON c.id = cp.competition_id
                 WHERE cp.id = $1`,
                [registrationId]
            );

            if (!current.rows.length) {
                return res.status(404).json({
                    message: "Registration not found"
                });
            }

            if (req.user.role === "BRANCH_ADMIN") {
                const assignment = await pool.query(
                    `SELECT u.branch_id
                     FROM public.users u
                     JOIN public.branches b
                       ON b.id = u.branch_id
                      AND b.status = 'ACTIVE'
                     WHERE u.id = $1
                       AND u.role = 'BRANCH_ADMIN'
                       AND u.status = 'ACTIVE'`,
                    [req.user.id]
                );

                const ownBranchId = assignment.rows[0]?.branch_id;
                const registration = current.rows[0];

                if (!ownBranchId) {
                    return res.status(403).json({
                        message: "Branch Admin does not have an active branch assignment"
                    });
                }

                // Branch Admin can mark fees for their own branch's students,
                // including those registered in academy-wide competitions.
                if (
                    Number(registration.student_branch_id) !== Number(ownBranchId) ||
                    (
                        registration.competition_branch_id != null &&
                        Number(registration.competition_branch_id) !== Number(ownBranchId)
                    )
                ) {
                    return res.status(403).json({
                        message: "You can update fees only for your own branch"
                    });
                }
            }

            const updated = await pool.query(
                `UPDATE public.competition_participants
                 SET fee_status = 'PAID'
                 WHERE id = $1
                 RETURNING id, competition_id, student_id, fee_status`,
                [registrationId]
            );

            if (!updated.rows.length) {
                return res.status(404).json({
                    message: "Registration not found"
                });
            }

            res.json({
                message: "Competition fee marked as completed",
                registration: updated.rows[0]
            });
        } catch (error) {
            console.error("Mark competition fee completed error:", error);
            res.status(500).json({
                message: "Unable to update competition fee"
            });
        }
    }
);

router.put(
    "/registration/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const {
                category,
                event,
                registration_status,
                fee_status,
                remarks
            } = req.body;

            const result =
                await pool.query(
                    `
                    UPDATE competition_participants

                    SET
                        category = $1,
                        event = $2,
                        registration_status = $3,
                        fee_status = $4,
                        remarks = $5

                    WHERE id = $6

                    RETURNING *
                    `,
                    [
                        category || null,
                        event || null,
                        registration_status,
                        fee_status,
                        remarks || null,
                        id
                    ]
                );

            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Registration not found"
                });

            }

            res.json({

                message:
                    "Registration updated successfully",

                participant:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "Update registration error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to update registration"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| GET RESULTS FOR ONE COMPETITION
|--------------------------------------------------------------------------
*/

router.get(
    "/:competitionId/results",
    async (req, res) => {

        try {

            const {
                competitionId
            } = req.params;

            const result =
                await pool.query(
                    `
                    SELECT

                        cr.id,
                        cr.student_id,

                        s.student_code,
                        s.name,

                        cr.category,
                        cr.event,
                        cr.result,
                        cr.medal,
                        cr.position,
                        cr.remarks

                    FROM competition_results cr

                    JOIN students s
                        ON s.id =
                           cr.student_id

                    WHERE
                        cr.competition_id =
                        $1

                    ORDER BY
                        cr.position NULLS LAST,
                        s.name ASC
                    `,
                    [competitionId]
                );

            res.json({
                results:
                    result.rows
            });

        } catch (error) {

            console.error(
                "Competition result fetch error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch competition results"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| CREATE COMPETITION RESULT
|--------------------------------------------------------------------------
*/

router.post(
    "/results",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                competition_id,
                student_id,
                category,
                event,
                result,
                medal,
                position,
                remarks
            } = req.body;

            if (
                !competition_id ||
                !student_id ||
                !result
            ) {

                return res.status(400).json({
                    message:
                        "competition_id, student_id and result are required"
                });

            }

            const competition =
                await pool.query(
                    `
                    SELECT
                        id,
                        branch_id

                    FROM competitions

                    WHERE id = $1
                    `,
                    [competition_id]
                );

            if (
                competition.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Competition not found"
                });

            }

            if (
                req.user.role ===
                "BRANCH_ADMIN" &&
                Number(
                    competition.rows[0].branch_id
                ) !==
                Number(
                    req.user.branch_id
                )
            ) {

                return res.status(403).json({
                    message:
                        "Competition does not belong to your branch"
                });

            }

            const inserted =
                await pool.query(
                    `
                    INSERT INTO competition_results
                    (
                        competition_id,
                        student_id,
                        category,
                        event,
                        result,
                        medal,
                        position,
                        remarks
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                    RETURNING *
                    `,
                    [
                        competition_id,
                        student_id,
                        category || null,
                        event || null,
                        result,
                        medal || null,
                        position || null,
                        remarks || null
                    ]
                );

            const savedResult = inserted.rows[0];

            // WhatsApp notification is separate from result saving.
            // A WhatsApp failure must never undo the saved result.
            let whatsappNotification = {
                status: "NOT_PROCESSED"
            };

            try {
                const notificationData = await pool.query(
                    `
                    SELECT
                        s.id AS student_id,
                        s.name AS student_name,
                        s.parent_name,
                        s.parent_mobile,
                        s.whatsapp_opt_in,
                        s.branch_id,
                        c.id AS competition_id,
                        c.competition_name,
                        TO_CHAR(c.competition_date, 'YYYY-MM-DD')
                            AS competition_date
                    FROM students s
                    JOIN competitions c
                        ON c.id = $2
                    WHERE s.id = $1
                    `,
                    [student_id, competition_id]
                );

                if (notificationData.rows.length === 0) {
                    throw new Error(
                        "Student or competition details unavailable for WhatsApp notification"
                    );
                }

                const details = notificationData.rows[0];

                let skipStatus = null;

                if (details.whatsapp_opt_in !== true) {
                    skipStatus = "SKIPPED_CONSENT";
                } else if (!details.parent_mobile) {
                    skipStatus = "SKIPPED_NO_PHONE";
                }

                let normalizedPhone = "";

                if (!skipStatus) {
                    normalizedPhone = String(details.parent_mobile)
                        .replace(/\D/g, "");

                    if (normalizedPhone.length === 10) {
                        normalizedPhone = "91" + normalizedPhone;
                    } else if (
                        normalizedPhone.length === 11 &&
                        normalizedPhone.startsWith("0")
                    ) {
                        normalizedPhone = "91" + normalizedPhone.slice(1);
                    }

                    if (
                        normalizedPhone.length < 11 ||
                        normalizedPhone.length > 15
                    ) {
                        skipStatus = "SKIPPED_INVALID_PHONE";
                    }
                }

                const logInsert = await pool.query(
                    `
                    INSERT INTO competition_result_whatsapp_logs
                    (
                        result_id,
                        competition_id,
                        student_id,
                        branch_id,
                        recipient_key,
                        recipient_phone,
                        parent_name,
                        template_name,
                        status,
                        created_by
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9)
                    ON CONFLICT (result_id) DO NOTHING
                    RETURNING id
                    `,
                    [
                        savedResult.id,
                        competition_id,
                        student_id,
                        details.branch_id,
                        normalizedPhone || `RESULT_${savedResult.id}`,
                        normalizedPhone || null,
                        details.parent_name || null,
                        "karate_competition_result",
                        req.user.id
                    ]
                );

                if (logInsert.rows.length === 0) {
                    whatsappNotification = {
                        status: "ALREADY_PROCESSED"
                    };
                } else {
                    const logId = logInsert.rows[0].id;

                    if (skipStatus) {
                        await pool.query(
                            `
                            UPDATE competition_result_whatsapp_logs
                            SET status = $1, updated_at = CURRENT_TIMESTAMP
                            WHERE id = $2
                            `,
                            [skipStatus, logId]
                        );

                        whatsappNotification = {
                            status: skipStatus
                        };
                    } else {
                        await pool.query(
                            `
                            UPDATE competition_result_whatsapp_logs
                            SET status = 'SENDING',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1 AND status = 'PENDING'
                            `,
                            [logId]
                        );

                        const positionText = detailsPosition => {
                            const number = Number(detailsPosition);
                            if (!Number.isInteger(number) || number < 1) {
                                return "";
                            }

                            const suffix =
                                number % 100 >= 11 && number % 100 <= 13
                                    ? "th"
                                    : ({ 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th");

                            return `${number}${suffix} Position`;
                        };

                        const placement = [
                            positionText(savedResult.position),
                            savedResult.medal
                        ].filter(Boolean).join(" - ") || "Participation";

                        const dateParts = String(details.competition_date)
                            .split("-");

                        const formattedDate =
                            dateParts.length === 3
                                ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
                                : String(details.competition_date);

                        const parameters = [
                            details.parent_name || "Parent",
                            details.student_name || "Student",
                            details.competition_name || "Competition",
                            formattedDate,
                            savedResult.result || "Result announced",
                            placement
                        ];

                        try {
                            const waResponse =
                                await sendWhatsAppTemplateMessage(
                                    normalizedPhone,
                                    "karate_competition_result",
                                    parameters,
                                    "en_US"
                                );

                            const messageId =
                                waResponse?.messages?.[0]?.id || null;

                            await pool.query(
                                `
                                UPDATE competition_result_whatsapp_logs
                                SET status = 'ACCEPTED',
                                    message_id = $1,
                                    error_message = NULL,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = $2
                                `,
                                [messageId, logId]
                            );

                            whatsappNotification = {
                                status: "ACCEPTED",
                                messageId
                            };

                        } catch (waError) {
                            const errorMessage =
                                waError.response?.data?.error?.message ||
                                waError.message ||
                                "WhatsApp sending failed";

                            // Definitive Meta rejection: FAILED.
                            // Timeout/network error: keep SENDING because
                            // Meta may already have accepted the message.
                            const definitiveRejection =
                                Boolean(waError.response?.data?.error);

                            const logStatus = definitiveRejection
                                ? "FAILED"
                                : "SENDING";

                            try {
                                await pool.query(
                                    `
                                    UPDATE competition_result_whatsapp_logs
                                    SET status = $1,
                                        error_message = $2,
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE id = $3
                                    `,
                                    [
                                        logStatus,
                                        String(errorMessage).slice(0, 4000),
                                        logId
                                    ]
                                );
                            } catch (logError) {
                                console.error(
                                    "Could not update WhatsApp notification log:",
                                    logError.message
                                );
                            }

                            whatsappNotification = {
                                status: logStatus,
                                message: errorMessage
                            };
                        }
                    }
                }

            } catch (notificationError) {
                console.error(
                    "Competition result WhatsApp notification error:",
                    notificationError.message
                );

                whatsappNotification = {
                    status: "FAILED",
                    message: notificationError.message
                };
            }

            return res.status(201).json({
                message: "Competition result saved successfully",
                result: savedResult,
                whatsappNotification
            });

        } catch (error) {

            console.error(
                "Create competition result error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to save competition result"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| UPDATE COMPETITION RESULT
|--------------------------------------------------------------------------
*/

router.put(
    "/results/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const {
                category,
                event,
                result,
                medal,
                position,
                remarks
            } = req.body;

            const ownership =
                await pool.query(
                    `
                    SELECT
                        cr.id,
                        c.branch_id

                    FROM competition_results cr

                    JOIN competitions c
                        ON c.id =
                           cr.competition_id

                    WHERE cr.id = $1
                    `,
                    [id]
                );

            if (
                ownership.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Competition result not found"
                });

            }

            if (
                req.user.role ===
                "BRANCH_ADMIN" &&
                Number(
                    ownership.rows[0].branch_id
                ) !==
                Number(
                    req.user.branch_id
                )
            ) {

                return res.status(403).json({
                    message:
                        "You can only update results for your branch"
                });

            }

            const updated =
                await pool.query(
                    `
                    UPDATE competition_results

                    SET
                        category = $1,
                        event = $2,
                        result = $3,
                        medal = $4,
                        position = $5,
                        remarks = $6

                    WHERE id = $7

                    RETURNING *
                    `,
                    [
                        category || null,
                        event || null,
                        result || null,
                        medal || null,
                        position || null,
                        remarks || null,
                        id
                    ]
                );

            res.json({

                message:
                    "Competition result updated successfully",

                result:
                    updated.rows[0]

            });

        } catch (error) {

            console.error(
                "Update competition result error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to update competition result"
            });

        }

    }
);



// ======================================================
// WHATSAPP COMPETITION ANNOUNCEMENT PREVIEW
// Preview only: this route NEVER sends WhatsApp messages.
// ======================================================

router.post(
    "/:id/announcement-preview",
    authorizeRoles("SUPER_ADMIN", "BRANCH_ADMIN"),
    async (req, res) => {
        try {
            const competitionId = Number(req.params.id);

            if (!Number.isInteger(competitionId) || competitionId <= 0) {
                return res.status(400).json({
                    message: "Invalid competition ID"
                });
            }

            const competitionResult = await pool.query(
                `
                SELECT
                    id,
                    competition_name,
                    TO_CHAR(competition_date, 'YYYY-MM-DD') AS competition_date,
                    reporting_time,
                    location,
                    branch_id
                FROM competitions
                WHERE id = $1
                `,
                [competitionId]
            );

            if (competitionResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Competition not found"
                });
            }

            const competition = competitionResult.rows[0];
            let targetBranchId = competition.branch_id;

            if (req.user.role === "BRANCH_ADMIN") {
                const adminResult = await pool.query(
                    `
                    SELECT branch_id
                    FROM users
                    WHERE id = $1
                      AND role = 'BRANCH_ADMIN'
                      AND status = 'ACTIVE'
                    `,
                    [req.user.id]
                );

                if (
                    adminResult.rows.length === 0 ||
                    !adminResult.rows[0].branch_id
                ) {
                    return res.status(403).json({
                        message: "Active Branch Admin assignment not found"
                    });
                }

                const assignedBranchId =
                    Number(adminResult.rows[0].branch_id);

                if (
                    Number(req.user.branch_id) !== assignedBranchId
                ) {
                    return res.status(409).json({
                        message: "Your login branch assignment is outdated. Please log out and log in again."
                    });
                }

                if (
                    competition.branch_id === null ||
                    Number(competition.branch_id) !== assignedBranchId
                ) {
                    return res.status(403).json({
                        message: "You can announce competitions only for your own branch"
                    });
                }

                targetBranchId = assignedBranchId;
            }

            let studentQuery = `
                SELECT
                    branch_id,
                    parent_name,
                    parent_mobile,
                    whatsapp_opt_in
                FROM students
                WHERE status = 'ACTIVE'
            `;

            const queryValues = [];

            if (targetBranchId !== null) {
                queryValues.push(targetBranchId);
                studentQuery += ` AND branch_id = $1`;
            }

            const studentResult = await pool.query(
                studentQuery,
                queryValues
            );

            let optedOutStudents = 0;
            let missingPhoneStudents = 0;
            let invalidPhoneStudents = 0;
            let validOptInStudents = 0;

            const recipients = new Map();

            for (const student of studentResult.rows) {
                if (student.whatsapp_opt_in !== true) {
                    optedOutStudents++;
                    continue;
                }

                const rawPhone = String(
                    student.parent_mobile || ""
                ).trim();

                if (!rawPhone) {
                    missingPhoneStudents++;
                    continue;
                }

                let phone = rawPhone.replace(/\D/g, "");

                if (phone.length === 10) {
                    phone = "91" + phone;
                } else if (
                    phone.length === 11 &&
                    phone.startsWith("0")
                ) {
                    phone = "91" + phone.substring(1);
                }

                if (phone.length < 11 || phone.length > 15) {
                    invalidPhoneStudents++;
                    continue;
                }

                validOptInStudents++;

                if (!recipients.has(phone)) {
                    recipients.set(phone, {
                        recipientKey: phone,
                        phone,
                        parentName: student.parent_name || "Parent",
                        studentCount: 0
                    });
                }

                recipients.get(phone).studentCount++;
            }

            const eligibleRecipients = recipients.size;

            const reportingTime = competition.reporting_time
                ? String(competition.reporting_time).substring(0, 5)
                : null;

            return res.json({
                previewOnly: true,
                messagesSent: 0,
                competition: {
                    id: competition.id,
                    competition_name: competition.competition_name,
                    competition_date: competition.competition_date,
                    reporting_time: reportingTime,
                    location: competition.location,
                    branch_id: competition.branch_id
                },
                audience: {
                    scope: targetBranchId === null
                        ? "ALL_BRANCHES"
                        : "SINGLE_BRANCH",
                    activeStudentRecords: studentResult.rows.length,
                    eligibleRecipients,
                    optedOutStudents,
                    missingPhoneStudents,
                    invalidPhoneStudents,
                    validOptInStudentRecords: validOptInStudents,
                    duplicateStudentRecords:
                        validOptInStudents - eligibleRecipients
                },
                template: {
                    name: "karate_upcoming_competition",
                    language: "en_US",
                    parameterCount: 6
                },
                message: "Preview generated successfully. No WhatsApp messages were sent."
            });

        } catch (error) {
            console.error(
                "Competition WhatsApp preview error:",
                error
            );

            return res.status(500).json({
                message: "Failed to generate competition announcement preview"
            });
        }
    }
);



// ======================================================
// SEND WHATSAPP COMPETITION ANNOUNCEMENT
// Requires explicit confirmation from the logged-in admin.
// ======================================================

router.post(
    "/:id/announcement-send",
    authorizeRoles("SUPER_ADMIN", "BRANCH_ADMIN"),
    async (req, res) => {
        try {
            if (req.body?.confirm !== true) {
                return res.status(400).json({
                    message: "Explicit confirmation is required before sending."
                });
            }

            const config = getWhatsAppConfig();

            if (!config.configured) {
                return res.status(503).json({
                    message: "Meta WhatsApp credentials are not configured."
                });
            }

            const competitionId = Number(req.params.id);

            if (!Number.isInteger(competitionId) || competitionId <= 0) {
                return res.status(400).json({
                    message: "Invalid competition ID"
                });
            }

            const competitionResult = await pool.query(
                `
                SELECT
                    id,
                    competition_name,
                    TO_CHAR(competition_date, 'YYYY-MM-DD') AS competition_date,
                    reporting_time,
                    location,
                    branch_id
                FROM competitions
                WHERE id = $1
                `,
                [competitionId]
            );

            if (competitionResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Competition not found"
                });
            }

            const competition = competitionResult.rows[0];
            let targetBranchId = competition.branch_id;

            if (req.user.role === "BRANCH_ADMIN") {
                const adminResult = await pool.query(
                    `
                    SELECT branch_id
                    FROM users
                    WHERE id = $1
                      AND role = 'BRANCH_ADMIN'
                      AND status = 'ACTIVE'
                    `,
                    [req.user.id]
                );

                if (
                    adminResult.rows.length === 0 ||
                    !adminResult.rows[0].branch_id
                ) {
                    return res.status(403).json({
                        message: "Active Branch Admin assignment not found"
                    });
                }

                const assignedBranchId =
                    Number(adminResult.rows[0].branch_id);

                if (Number(req.user.branch_id) !== assignedBranchId) {
                    return res.status(409).json({
                        message: "Your login branch assignment is outdated. Please log in again."
                    });
                }

                if (
                    competition.branch_id === null ||
                    Number(competition.branch_id) !== assignedBranchId
                ) {
                    return res.status(403).json({
                        message: "You can announce competitions only for your own branch"
                    });
                }

                targetBranchId = assignedBranchId;
            }

            if (!competition.reporting_time) {
                return res.status(400).json({
                    message: "Please add the competition reporting time before sending the announcement."
                });
            }

            const dateValue = String(
                competition.competition_date || ""
            ).trim();

            const dateParts = dateValue.split("-");

            if (
                dateParts.length !== 3 ||
                !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)
            ) {
                return res.status(400).json({
                    message: "Competition date is invalid."
                });
            }

            const [year, month, day] = dateParts.map(Number);

            const competitionDate = new Date(
                Date.UTC(year, month - 1, day)
            );

            if (
                competitionDate.getUTCFullYear() !== year ||
                competitionDate.getUTCMonth() !== month - 1 ||
                competitionDate.getUTCDate() !== day
            ) {
                return res.status(400).json({
                    message: "Competition date is invalid."
                });
            }

            const formattedDate = competitionDate.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC"
                }
            );

            const timeParts = String(
                competition.reporting_time
            ).substring(0, 5).split(":");

            let formattedTime = String(competition.reporting_time);

            if (timeParts.length === 2) {
                let hour = Number(timeParts[0]);
                const minute = timeParts[1];
                const suffix = hour >= 12 ? "PM" : "AM";
                hour = hour % 12 || 12;
                formattedTime =
                    `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
            }

            const studentValues = [];
            let studentQuery = `
                SELECT
                    id,
                    branch_id,
                    parent_name,
                    parent_mobile,
                    whatsapp_opt_in
                FROM students
                WHERE status = 'ACTIVE'
            `;

            if (targetBranchId !== null) {
                studentValues.push(targetBranchId);
                studentQuery += " AND branch_id = $1";
            }

            studentQuery += " ORDER BY branch_id, id";

            const studentResult = await pool.query(
                studentQuery,
                studentValues
            );

            const recipients = new Map();
            const skipped = [];

            for (const student of studentResult.rows) {
                const branchId = Number(student.branch_id);

                if (student.whatsapp_opt_in !== true) {
                    skipped.push({
                        student,
                        branchId,
                        status: "SKIPPED_CONSENT",
                        key: `SKIPPED_CONSENT_${student.id}`
                    });
                    continue;
                }

                const rawPhone = String(
                    student.parent_mobile || ""
                ).trim();

                if (!rawPhone) {
                    skipped.push({
                        student,
                        branchId,
                        status: "SKIPPED_NO_PHONE",
                        key: `SKIPPED_NO_PHONE_${student.id}`
                    });
                    continue;
                }

                let phone = rawPhone.replace(/\D/g, "");

                if (phone.length === 10) {
                    phone = "91" + phone;
                } else if (
                    phone.length === 11 &&
                    phone.startsWith("0")
                ) {
                    phone = "91" + phone.substring(1);
                }

                if (phone.length < 11 || phone.length > 15) {
                    skipped.push({
                        student,
                        branchId,
                        status: "SKIPPED_INVALID_PHONE",
                        key: `SKIPPED_INVALID_PHONE_${student.id}`
                    });
                    continue;
                }

                if (!recipients.has(phone)) {
                    recipients.set(phone, {
                        phone,
                        parentName: student.parent_name || "Parent",
                        branchId,
                        studentCount: 0
                    });
                }

                recipients.get(phone).studentCount++;
            }

            // Record skipped student records for reporting.
            for (const item of skipped) {
                await pool.query(
                    `
                    INSERT INTO competition_whatsapp_notification_logs
                    (
                        competition_id,
                        competition_name,
                        branch_id,
                        recipient_key,
                        recipient_phone,
                        parent_name,
                        student_count,
                        template_name,
                        status,
                        error_message,
                        created_by
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8,$9,$10)
                    ON CONFLICT (competition_id, recipient_key)
                    WHERE competition_id IS NOT NULL
                    DO NOTHING
                    `,
                    [
                        competition.id,
                        competition.competition_name,
                        item.branchId,
                        item.key,
                        item.student.parent_mobile || null,
                        item.student.parent_name || null,
                        "karate_upcoming_competition",
                        item.status,
                        item.status,
                        req.user.id
                    ]
                );
            }

            const summary = {
                eligibleRecipients: recipients.size,
                accepted: 0,
                failed: 0,
                alreadyProcessed: 0,
                skippedConsent: skipped.filter(
                    item => item.status === "SKIPPED_CONSENT"
                ).length,
                skippedNoPhone: skipped.filter(
                    item => item.status === "SKIPPED_NO_PHONE"
                ).length,
                skippedInvalidPhone: skipped.filter(
                    item => item.status === "SKIPPED_INVALID_PHONE"
                ).length
            };

            for (const recipient of recipients.values()) {
                const inserted = await pool.query(
                    `
                    INSERT INTO competition_whatsapp_notification_logs
                    (
                        competition_id,
                        competition_name,
                        branch_id,
                        recipient_key,
                        recipient_phone,
                        parent_name,
                        student_count,
                        template_name,
                        status,
                        created_by
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9)
                    ON CONFLICT (competition_id, recipient_key)
                    WHERE competition_id IS NOT NULL
                    DO NOTHING
                    RETURNING id
                    `,
                    [
                        competition.id,
                        competition.competition_name,
                        recipient.branchId,
                        recipient.phone,
                        recipient.phone,
                        recipient.parentName,
                        recipient.studentCount,
                        "karate_upcoming_competition",
                        req.user.id
                    ]
                );

                let logId = inserted.rows[0]?.id;

                if (!logId) {
                    const existing = await pool.query(
                        `
                        SELECT id, status
                        FROM competition_whatsapp_notification_logs
                        WHERE competition_id = $1
                          AND recipient_key = $2
                        `,
                        [competition.id, recipient.phone]
                    );

                    if (!existing.rows.length) {
                        summary.failed++;
                        continue;
                    }

                    const previousStatus = existing.rows[0].status;

                    if (
                        previousStatus !== "PENDING" &&
                        previousStatus !== "FAILED"
                    ) {
                        summary.alreadyProcessed++;
                        continue;
                    }

                    logId = existing.rows[0].id;
                }

                // Atomic claim prevents two requests sending the same message.
                const claimed = await pool.query(
                    `
                    UPDATE competition_whatsapp_notification_logs
                    SET status = 'SENDING',
                        error_message = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                      AND status IN ('PENDING', 'FAILED')
                    RETURNING id
                    `,
                    [logId]
                );

                if (!claimed.rows.length) {
                    summary.alreadyProcessed++;
                    continue;
                }

                try {
                    const response = await sendWhatsAppTemplateMessage(
                        recipient.phone,
                        "karate_upcoming_competition",
                        [
                            recipient.parentName,
                            "Your child",
                            competition.competition_name,
                            formattedDate,
                            formattedTime,
                            competition.location || "Venue to be confirmed"
                        ],
                        "en_US"
                    );

                    const messageId =
                        response?.messages?.[0]?.id || null;

                    await pool.query(
                        `
                        UPDATE competition_whatsapp_notification_logs
                        SET status = 'ACCEPTED',
                            message_id = $1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                        `,
                        [messageId, logId]
                    );

                    summary.accepted++;

                } catch (sendError) {
                    const errorMessage = String(
                        sendError.response?.data?.error?.message ||
                        sendError.message ||
                        "WhatsApp send failed"
                    ).substring(0, 1000);

                    await pool.query(
                        `
                        UPDATE competition_whatsapp_notification_logs
                        SET status = 'FAILED',
                            error_message = $1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                        `,
                        [errorMessage, logId]
                    );

                    summary.failed++;
                }
            }

            return res.json({
                message: "Competition WhatsApp announcement processing completed.",
                competition: {
                    id: competition.id,
                    competition_name: competition.competition_name,
                    competition_date: dateValue,
                    reporting_time: formattedTime,
                    location: competition.location
                },
                summary,
                note: "ACCEPTED means Meta accepted the message request; it does not confirm delivery or reading."
            });

        } catch (error) {
            console.error(
                "Competition WhatsApp send error:",
                error
            );

            return res.status(500).json({
                message: "Failed to process competition WhatsApp announcement."
            });
        }
    }
);


module.exports = router;
