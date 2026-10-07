const express = require("express");

const pool = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

router.use(
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    )
);


// ============================================================
// HELPERS
// ============================================================

function applyDateFilter(
    conditions,
    params,
    column,
    fromDate,
    toDate
) {

    if (fromDate) {

        params.push(fromDate);

        conditions.push(
            `${column} >= $${params.length}`
        );

    }

    if (toDate) {

        params.push(toDate);

        conditions.push(
            `${column} <= $${params.length}`
        );

    }

}


function applyBranchFilter(
    conditions,
    params,
    req,
    studentAlias = "s"
) {

    if (
        req.user.role ===
        "BRANCH_ADMIN"
    ) {

        if (!req.user.branch_id) {

            throw new Error(
                "Branch Admin is not assigned to a branch"
            );

        }

        params.push(
            req.user.branch_id
        );

        conditions.push(
            `${studentAlias}.branch_id = $${params.length}`
        );

    }

}


function respond(
    res,
    reportName,
    rows,
    filters
) {

    return res.json({

        report:
            reportName,

        total:
            rows.length,

        filters,

        data:
            rows

    });

}


// ============================================================
// STUDENT REPORT
// ============================================================

router.get(
    "/students",
    async (req, res) => {

        try {

            const {
                from_date,
                to_date,
                batch,
                status
            } = req.query;

            const conditions = [];
            const params = [];

            applyDateFilter(
                conditions,
                params,
                "s.joining_date",
                from_date,
                to_date
            );

            applyBranchFilter(
                conditions,
                params,
                req
            );

            if (batch) {

                params.push(batch);

                conditions.push(
                    `s.batch = $${params.length}`
                );

            }

            if (status) {

                params.push(status);

                conditions.push(
                    `s.status = $${params.length}`
                );

            }

            const query = `

                SELECT

                    s.id,

                    s.student_code,

                    s.name,

                    s.date_of_birth,

                    s.gender,

                    s.parent_name,

                    s.parent_mobile,

                    s.joining_date,

                    s.belt,

                    s.batch,

                    s.status,

                    b.id AS branch_id,

                    b.branch_name,

                    b.branch_code,

                    s.created_at

                FROM students s

                LEFT JOIN branches b
                    ON b.id = s.branch_id

                ${
                    conditions.length
                        ? "WHERE " +
                          conditions.join(" AND ")
                        : ""
                }

                ORDER BY

                    s.joining_date DESC,

                    s.name

            `;

            const result =
                await pool.query(
                    query,
                    params
                );

            return respond(
                res,
                "students",
                result.rows,
                {
                    from_date:
                        from_date || null,

                    to_date:
                        to_date || null,

                    batch:
                        batch || null,

                    status:
                        status || null
                }
            );

        } catch (error) {

            console.error(
                "Student reporting error:",
                error
            );

            return res.status(500).json({

                message:
                    error.message ||
                    "Failed to generate student report"

            });

        }

    }
);


// ============================================================
// ATTENDANCE REPORT
// ============================================================

router.get(
    "/attendance",
    async (req, res) => {

        try {

            const {
                from_date,
                to_date,
                batch,
                status
            } = req.query;

            const conditions = [];
            const params = [];

            applyDateFilter(
                conditions,
                params,
                "a.attendance_date",
                from_date,
                to_date
            );

            applyBranchFilter(
                conditions,
                params,
                req
            );

            if (batch) {

                params.push(batch);

                conditions.push(
                    `s.batch = $${params.length}`
                );

            }

            if (status) {

                params.push(status);

                conditions.push(
                    `a.status = $${params.length}`
                );

            }

            const query = `

                SELECT

                    a.id,

                    a.student_id,

                    a.attendance_date,

                    a.status,

                    a.marked_by,

                    a.created_at,

                    s.student_code,

                    s.name AS student_name,

                    s.belt,

                    s.batch,

                    b.id AS branch_id,

                    b.branch_name,

                    b.branch_code

                FROM attendance a

                JOIN students s
                    ON s.id = a.student_id

                LEFT JOIN branches b
                    ON b.id = s.branch_id

                ${
                    conditions.length
                        ? "WHERE " +
                          conditions.join(" AND ")
                        : ""
                }

                ORDER BY

                    a.attendance_date DESC,

                    s.name

            `;

            const result =
                await pool.query(
                    query,
                    params
                );

            return respond(
                res,
                "attendance",
                result.rows,
                {
                    from_date:
                        from_date || null,

                    to_date:
                        to_date || null,

                    batch:
                        batch || null,

                    status:
                        status || null
                }
            );

        } catch (error) {

            console.error(
                "Attendance reporting error:",
                error
            );

            return res.status(500).json({

                message:
                    error.message ||
                    "Failed to generate attendance report"

            });

        }

    }
);


// ============================================================
// FEES REPORT
// ============================================================

router.get(
    "/fees",
    async (req, res) => {

        try {

            const {
                from_date,
                to_date,
                batch,
                status
            } = req.query;

            const conditions = [];
            const params = [];

            /*
             * Fee records do not contain branch_id.
             *
             * Branch is resolved through:
             *
             * fees.student_id
             *        ->
             * students.branch_id
             */

            applyDateFilter(
                conditions,
                params,
                "COALESCE(f.due_date, f.created_at::date)",
                from_date,
                to_date
            );

            applyBranchFilter(
                conditions,
                params,
                req
            );

            if (batch) {

                params.push(batch);

                conditions.push(
                    `s.batch = $${params.length}`
                );

            }

            if (status) {

                params.push(status);

                conditions.push(
                    `f.status = $${params.length}`
                );

            }

            const query = `

                SELECT

                    f.id,

                    f.student_id,

                    s.student_code,

                    s.name AS student_name,

                    s.parent_name,

                    s.parent_mobile,

                    s.batch,

                    b.id AS branch_id,

                    b.branch_name,

                    b.branch_code,

                    f.fee_type,

                    f.description,

                    f.month,

                    f.year,

                    f.amount,

                    f.due_date,

                    f.paid_date,

                    f.status,

                    f.payment_reference,

                    f.created_at

                FROM fees f

                JOIN students s
                    ON s.id = f.student_id

                LEFT JOIN branches b
                    ON b.id = s.branch_id

                ${
                    conditions.length
                        ? "WHERE " +
                          conditions.join(" AND ")
                        : ""
                }

                ORDER BY

                    COALESCE(
                        f.due_date,
                        f.created_at::date
                    ) DESC,

                    s.name

            `;

            const result =
                await pool.query(
                    query,
                    params
                );

            return respond(
                res,
                "fees",
                result.rows,
                {
                    from_date:
                        from_date || null,

                    to_date:
                        to_date || null,

                    batch:
                        batch || null,

                    status:
                        status || null
                }
            );

        } catch (error) {

            console.error(
                "Fees reporting error:",
                error
            );

            return res.status(500).json({

                message:
                    error.message ||
                    "Failed to generate fees report"

            });

        }

    }
);


// ============================================================
// BELT & GRADING REPORT
// ============================================================

router.get(
    "/belts",
    async (req, res) => {

        try {

            const {
                from_date,
                to_date,
                batch
            } = req.query;

            const conditions = [];
            const params = [];

            applyDateFilter(
                conditions,
                params,
                "bh.grading_date",
                from_date,
                to_date
            );

            applyBranchFilter(
                conditions,
                params,
                req
            );

            if (batch) {

                params.push(batch);

                conditions.push(
                    `s.batch = $${params.length}`
                );

            }

            const query = `

                SELECT

                    bh.id,

                    bh.student_id,

                    s.student_code,

                    s.name AS student_name,

                    s.batch,

                    s.belt AS current_belt,

                    b.id AS branch_id,

                    b.branch_name,

                    b.branch_code,

                    bh.previous_belt,

                    bh.new_belt,

                    bh.grading_date,

                    bh.remarks

                FROM belt_history bh

                JOIN students s
                    ON s.id = bh.student_id

                LEFT JOIN branches b
                    ON b.id = s.branch_id

                ${
                    conditions.length
                        ? "WHERE " +
                          conditions.join(" AND ")
                        : ""
                }

                ORDER BY

                    bh.grading_date DESC,

                    s.name

            `;

            const result =
                await pool.query(
                    query,
                    params
                );

            return respond(
                res,
                "belts",
                result.rows,
                {
                    from_date:
                        from_date || null,

                    to_date:
                        to_date || null,

                    batch:
                        batch || null
                }
            );

        } catch (error) {

            console.error(
                "Belt reporting error:",
                error
            );

            return res.status(500).json({

                message:
                    error.message ||
                    "Failed to generate belt report"

            });

        }

    }
);


// ============================================================
// COMPETITION REPORT
// ============================================================

router.get(
    "/competitions",
    async (req, res) => {

        try {

            const {
                from_date,
                to_date,
                batch
            } = req.query;

            const conditions = [];
            const params = [];

            applyDateFilter(
                conditions,
                params,
                "c.competition_date",
                from_date,
                to_date
            );

            if (
                req.user.role ===
                "BRANCH_ADMIN"
            ) {

                if (!req.user.branch_id) {

                    return res.status(403).json({

                        message:
                            "Branch Admin is not assigned to a branch"

                    });

                }

                params.push(
                    req.user.branch_id
                );

                conditions.push(
                    `s.branch_id = $${params.length}`
                );

            }

            if (batch) {

                params.push(batch);

                conditions.push(
                    `s.batch = $${params.length}`
                );

            }

            const query = `

                SELECT DISTINCT

                    c.id,

                    c.competition_name,

                    c.competition_date,

                    c.location,

                    c.organizer,

                    c.description,

                    b.id AS branch_id,

                    b.branch_name,

                    b.branch_code

                FROM competitions c

                LEFT JOIN competition_participants cp
                    ON cp.competition_id = c.id

                LEFT JOIN students s
                    ON s.id = cp.student_id

                LEFT JOIN branches b
                    ON b.id = s.branch_id

                ${
                    conditions.length
                        ? "WHERE " +
                          conditions.join(" AND ")
                        : ""
                }

                ORDER BY

                    c.competition_date DESC,

                    c.competition_name

            `;

            const result =
                await pool.query(
                    query,
                    params
                );

            return respond(
                res,
                "competitions",
                result.rows,
                {
                    from_date:
                        from_date || null,

                    to_date:
                        to_date || null,

                    batch:
                        batch || null
                }
            );

        } catch (error) {

            console.error(
                "Competition reporting error:",
                error
            );

            return res.status(500).json({

                message:
                    error.message ||
                    "Failed to generate competition report"

            });

        }

    }
);


// ============================================================
// RESULTS & WINNERS REPORT
// ============================================================

router.get(
    "/results",
    async (req, res) => {

        try {

            const {
                from_date,
                to_date,
                batch
            } = req.query;

            const conditions = [];
            const params = [];

            applyDateFilter(
                conditions,
                params,
                "c.competition_date",
                from_date,
                to_date
            );

            applyBranchFilter(
                conditions,
                params,
                req
            );

            if (batch) {

                params.push(batch);

                conditions.push(
                    `s.batch = $${params.length}`
                );

            }

            const query = `

                SELECT

                    cr.id,

                    cr.competition_id,

                    cr.student_id,

                    cr.category,

                    cr.event,

                    cr.result,

                    cr.medal,

                    cr.position,

                    cr.remarks,

                    c.competition_name,

                    c.competition_date,

                    c.location,

                    s.student_code,

                    s.name AS student_name,

                    s.batch,

                    b.id AS branch_id,

                    b.branch_name,

                    b.branch_code

                FROM competition_results cr

                JOIN competitions c
                    ON c.id = cr.competition_id

                JOIN students s
                    ON s.id = cr.student_id

                LEFT JOIN branches b
                    ON b.id = s.branch_id

                ${
                    conditions.length
                        ? "WHERE " +
                          conditions.join(" AND ")
                        : ""
                }

                ORDER BY

                    c.competition_date DESC,

                    cr.position ASC NULLS LAST,

                    s.name

            `;

            const result =
                await pool.query(
                    query,
                    params
                );

            return respond(
                res,
                "results",
                result.rows,
                {
                    from_date:
                        from_date || null,

                    to_date:
                        to_date || null,

                    batch:
                        batch || null
                }
            );

        } catch (error) {

            console.error(
                "Results reporting error:",
                error
            );

            return res.status(500).json({

                message:
                    error.message ||
                    "Failed to generate results report"

            });

        }

    }
);


module.exports = router;
