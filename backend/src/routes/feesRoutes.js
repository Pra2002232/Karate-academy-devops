const express = require("express");
const pool = require("../config/db");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * All fee/belt API calls require an authenticated
 * academy user. This also establishes the PostgreSQL
 * role/branch request context used by RLS.
 */
router.use(authenticateToken);


const ALLOWED_FEE_TYPES = [
    "MONTHLY",
    "COSTUME",
    "COMPETITION"
];

const ALLOWED_STATUS = [
    "PENDING",
    "COMPLETED"
];


// ==================================================
// ==================================================
// 1. GET ALL FEES
// ==================================================

router.get("/", async (req, res) => {

    try {

        const params = [];
        let branchFilter = "";

        /*
         * SUPER_ADMIN:
         *   Can see fees from all branches.
         *
         * BRANCH_ADMIN:
         *   Can only see fees belonging to students
         *   from the admin's assigned branch.
         *
         * Branch is derived from:
         * fees.student_id
         *      -> students.branch_id
         *      -> branches.id
         */

        if (req.user.role === "BRANCH_ADMIN") {

            if (!req.user.branch_id) {
                return res.status(403).json({
                    message: "Branch Admin is not assigned to a branch"
                });
            }

            branchFilter = "WHERE s.branch_id = $1";
            params.push(req.user.branch_id);
        }

        const result = await pool.query(`
            SELECT
                f.id,
                f.student_id,
                s.student_code,
                s.name AS student_name,
                s.parent_name,
                s.parent_mobile,

                s.branch_id,
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
                ON f.student_id = s.id

            LEFT JOIN branches b
                ON s.branch_id = b.id

            ${branchFilter}

            ORDER BY
                f.created_at DESC,
                s.name
        `, params);

        res.json({
            total_fees: result.rows.length,
            fees: result.rows
        });

    } catch (error) {

        console.error("Get Fees Error:", error);

        res.status(500).json({
            message: "Internal server error"
        });

    }

});


// ==================================================
// 2. GET FEES FOR ONE STUDENT
// ==================================================

router.get("/student/:studentId", async (req, res) => {

    try {

        const { studentId } = req.params;

        const params = [studentId];
        let branchFilter = "";

        /*
         * BRANCH_ADMIN can only access students
         * belonging to their assigned branch.
         */

        if (req.user.role === "BRANCH_ADMIN") {

            if (!req.user.branch_id) {
                return res.status(403).json({
                    message: "Branch Admin is not assigned to a branch"
                });
            }

            branchFilter = "AND s.branch_id = $2";
            params.push(req.user.branch_id);
        }

        const result = await pool.query(`
            SELECT
                f.id,
                f.student_id,
                s.student_code,
                s.name AS student_name,
                s.parent_name,
                s.parent_mobile,

                s.branch_id,
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
                ON f.student_id = s.id

            LEFT JOIN branches b
                ON s.branch_id = b.id

            WHERE f.student_id = $1
            ${branchFilter}

            ORDER BY
                f.year DESC NULLS LAST,
                f.month DESC NULLS LAST,
                f.created_at DESC
        `, params);

        res.json({
            student_id: studentId,
            fees: result.rows
        });

    } catch (error) {

        console.error(
            "Get Student Fees Error:",
            error
        );

        res.status(500).json({
            message: "Internal server error"
        });

    }

});


router.post("/", async (req, res) => {

    try {

        const {
            student_id,
            fee_type,
            description,
            month,
            year,
            amount,
            due_date,
            status,
            payment_reference
        } = req.body;


        // ------------------------------
        // Validation
        // ------------------------------

        if (!student_id) {

            return res.status(400).json({
                message: "student_id is required"
            });

        }

        if (!fee_type) {

            return res.status(400).json({
                message: "fee_type is required"
            });

        }

        if (!ALLOWED_FEE_TYPES.includes(fee_type)) {

            return res.status(400).json({
                message:
                    "Invalid fee_type. Use MONTHLY, COSTUME or COMPETITION"
            });

        }

        if (
            amount === undefined ||
            amount === null ||
            amount === ""
        ) {

            return res.status(400).json({
                message: "amount is required"
            });

        }

        if (Number(amount) < 0) {

            return res.status(400).json({
                message: "amount cannot be negative"
            });

        }


        // ------------------------------
        // Check student
        // ------------------------------

        const studentResult = await pool.query(
            `
            SELECT
                id,
                student_code,
                name,
                parent_name,
                parent_mobile
            FROM students
            WHERE id = $1
            `,
            [student_id]
        );

        if (studentResult.rows.length === 0) {

            return res.status(404).json({
                message: "Student not found"
            });

        }


        // ------------------------------
        // Status
        // ------------------------------

        const feeStatus =
            status || "PENDING";

        if (!ALLOWED_STATUS.includes(feeStatus)) {

            return res.status(400).json({
                message:
                    "Invalid status. Use PENDING or COMPLETED"
            });

        }


        // ------------------------------
        // Paid date
        // ------------------------------

        const paidDate =
            feeStatus === "COMPLETED"
                ? new Date()
                : null;


        // ------------------------------
        // Insert
        // ------------------------------

        const result = await pool.query(
            `
            INSERT INTO fees
            (
                student_id,
                fee_type,
                description,
                month,
                year,
                amount,
                due_date,
                paid_date,
                status,
                payment_reference
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10
            )

            RETURNING *
            `,
            [
                student_id,
                fee_type,
                description || null,
                month || null,
                year || null,
                amount,
                due_date || null,
                paidDate,
                feeStatus,
                payment_reference || null
            ]
        );


        res.status(201).json({

            message: "Fee created successfully",

            student: studentResult.rows[0],

            fee: result.rows[0]

        });

    } catch (error) {

        console.error("Create Fee Error:", error);


        // Monthly duplicate
        if (error.code === "23505") {

            return res.status(409).json({
                message:
                    "Monthly fee already exists for this student and month"
            });

        }


        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });

    }

});


// ==================================================
// 4. UPDATE FEE
// ==================================================

router.put("/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            fee_type,
            description,
            month,
            year,
            amount,
            due_date,
            status,
            payment_reference
        } = req.body;


        if (
            fee_type &&
            !ALLOWED_FEE_TYPES.includes(fee_type)
        ) {

            return res.status(400).json({
                message: "Invalid fee_type"
            });

        }


        if (
            status &&
            !ALLOWED_STATUS.includes(status)
        ) {

            return res.status(400).json({
                message: "Invalid status"
            });

        }


        if (
            amount !== undefined &&
            Number(amount) < 0
        ) {

            return res.status(400).json({
                message: "amount cannot be negative"
            });

        }


        const existing = await pool.query(
            `SELECT * FROM fees WHERE id = $1`,
            [id]
        );


        if (existing.rows.length === 0) {

            return res.status(404).json({
                message: "Fee not found"
            });

        }


        const current = existing.rows[0];

        const newStatus =
            status || current.status;

        const newPaidDate =
            newStatus === "COMPLETED"
                ? (current.paid_date || new Date())
                : null;


        const result = await pool.query(
            `
            UPDATE fees

            SET
                fee_type = $1,
                description = $2,
                month = $3,
                year = $4,
                amount = $5,
                due_date = $6,
                paid_date = $7,
                status = $8,
                payment_reference = $9

            WHERE id = $10

            RETURNING *
            `,
            [
                fee_type || current.fee_type,
                description !== undefined
                    ? description
                    : current.description,
                month !== undefined
                    ? month
                    : current.month,
                year !== undefined
                    ? year
                    : current.year,
                amount !== undefined
                    ? amount
                    : current.amount,
                due_date !== undefined
                    ? due_date
                    : current.due_date,
                newPaidDate,
                newStatus,
                payment_reference !== undefined
                    ? payment_reference
                    : current.payment_reference,
                id
            ]
        );


        res.json({

            message: "Fee updated successfully",

            fee: result.rows[0]

        });

    } catch (error) {

        console.error("Update Fee Error:", error);

        if (error.code === "23505") {

            return res.status(409).json({
                message:
                    "Monthly fee already exists for this student and month"
            });

        }

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });

    }

});


// ==================================================
// 5. DELETE FEE
// ==================================================

router.delete("/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const result = await pool.query(
            `
            DELETE FROM fees
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Fee not found"
            });

        }


        res.json({

            message: "Fee deleted successfully",

            fee: result.rows[0]

        });

    } catch (error) {

        console.error("Delete Fee Error:", error);

        res.status(500).json({
            message: "Internal server error"
        });

    }

});



// ==================================================
// SUPER ADMIN FEE COLLECTION DASHBOARD
// GET /api/fees/dashboard
//
// READ ONLY.
// Existing fee creation/update and WhatsApp
// pending-fee mechanism are intentionally untouched.
// ==================================================

router.get("/dashboard", async (req, res) => {

    try {

        if (
            !req.user ||
            req.user.role !== "SUPER_ADMIN"
        ) {

            return res.status(403).json({
                message:
                    "Super Admin access required"
            });

        }

        // --------------------------------------------------
        // Overall academy collection
        // --------------------------------------------------

        const summaryResult =
            await pool.query(`
                SELECT

                    COALESCE(
                        SUM(
                            CASE
                                WHEN f.paid_date::date =
                                     CURRENT_DATE
                                THEN f.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS today,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN f.paid_date::date =
                                     CURRENT_DATE - 1
                                THEN f.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS yesterday,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN f.paid_date::date >=
                                     CURRENT_DATE - 6
                                THEN f.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS last_7_days,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN f.paid_date::date >=
                                     CURRENT_DATE - 29
                                THEN f.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS last_30_days,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN date_trunc(
                                    'month',
                                    f.paid_date
                                ) =
                                date_trunc(
                                    'month',
                                    CURRENT_DATE
                                )
                                THEN f.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS this_month,

                    COALESCE(
                        SUM(f.amount),
                        0
                    ) AS total_collected

                FROM fees f

                JOIN students s
                    ON s.id = f.student_id

                WHERE f.status = 'COMPLETED'
                  AND f.paid_date IS NOT NULL
                  AND s.joining_date <=
                      f.paid_date::date
            `);

        // --------------------------------------------------
        // Branch-wise collection
        // --------------------------------------------------

        const branchResult =
            await pool.query(`
                SELECT

                    b.id AS branch_id,
                    b.branch_name,
                    b.branch_code,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN f.paid_date::date =
                                     CURRENT_DATE
                                THEN f.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS today,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN f.paid_date::date =
                                     CURRENT_DATE - 1
                                THEN f.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS yesterday,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN f.paid_date::date >=
                                     CURRENT_DATE - 6
                                THEN f.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS last_7_days,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN f.paid_date::date >=
                                     CURRENT_DATE - 29
                                THEN f.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS last_30_days,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN date_trunc(
                                    'month',
                                    f.paid_date
                                ) =
                                date_trunc(
                                    'month',
                                    CURRENT_DATE
                                )
                                THEN f.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS this_month,

                    COALESCE(
                        SUM(f.amount),
                        0
                    ) AS total_collected

                FROM branches b

                LEFT JOIN students s
                    ON s.branch_id = b.id

                LEFT JOIN fees f
                    ON f.student_id = s.id
                   AND f.status = 'COMPLETED'
                   AND f.paid_date IS NOT NULL
                   AND s.joining_date <=
                       f.paid_date::date

                WHERE b.status = 'ACTIVE'

                GROUP BY
                    b.id,
                    b.branch_name,
                    b.branch_code

                ORDER BY
                    b.branch_name
            `);

        // --------------------------------------------------
        // Fee type summary
        // --------------------------------------------------

        const typeResult =
            await pool.query(`
                SELECT

                    f.fee_type,

                    COALESCE(
                        SUM(f.amount),
                        0
                    ) AS total_collected,

                    COUNT(*) AS payment_count

                FROM fees f

                JOIN students s
                    ON s.id = f.student_id

                WHERE f.status = 'COMPLETED'
                  AND f.paid_date IS NOT NULL
                  AND s.joining_date <=
                      f.paid_date::date

                GROUP BY
                    f.fee_type

                ORDER BY
                    f.fee_type
            `);

        const summary =
            summaryResult.rows[0] || {};

        res.json({

            summary: {

                today:
                    Number(
                        summary.today || 0
                    ),

                yesterday:
                    Number(
                        summary.yesterday || 0
                    ),

                last_7_days:
                    Number(
                        summary.last_7_days || 0
                    ),

                last_30_days:
                    Number(
                        summary.last_30_days || 0
                    ),

                this_month:
                    Number(
                        summary.this_month || 0
                    ),

                total_collected:
                    Number(
                        summary.total_collected || 0
                    )
            },

            branches:
                branchResult.rows.map(
                    row => ({

                        branch_id:
                            row.branch_id,

                        branch_name:
                            row.branch_name,

                        branch_code:
                            row.branch_code,

                        today:
                            Number(
                                row.today || 0
                            ),

                        yesterday:
                            Number(
                                row.yesterday || 0
                            ),

                        last_7_days:
                            Number(
                                row.last_7_days || 0
                            ),

                        last_30_days:
                            Number(
                                row.last_30_days || 0
                            ),

                        this_month:
                            Number(
                                row.this_month || 0
                            ),

                        total_collected:
                            Number(
                                row.total_collected || 0
                            )
                    })
                ),

            fee_types:
                typeResult.rows.map(
                    row => ({

                        fee_type:
                            row.fee_type,

                        total_collected:
                            Number(
                                row.total_collected || 0
                            ),

                        payment_count:
                            Number(
                                row.payment_count || 0
                            )
                    })
                )
        });

    } catch (error) {

        console.error(
            "Fee dashboard error:",
            error
        );

        res.status(500).json({
            message:
                "Unable to load fee dashboard"
        });

    }

});


module.exports = router;
