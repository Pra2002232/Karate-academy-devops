const express = require("express");
const pool = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);


// ==================================================
// 1. MARK ATTENDANCE
// ==================================================

router.post("/", async (req, res) => {

    try {

        const {
            student_id,
            attendance_date,
            status,
            marked_by
        } = req.body;


        // ------------------------------
        // Validation
        // ------------------------------

        if (!student_id) {
            return res.status(400).json({
                message: "student_id is required"
            });
        }

        if (!attendance_date) {
            return res.status(400).json({
                message: "attendance_date is required"
            });
        }

        if (!status) {
            return res.status(400).json({
                message: "status is required"
            });
        }


        // ------------------------------
        // Validate attendance status
        // ------------------------------

        const allowedStatus = [
            "PRESENT",
            "ABSENT",
            "LATE"
        ];

        if (!allowedStatus.includes(status)) {

            return res.status(400).json({
                message:
                    "Invalid status. Use PRESENT, ABSENT or LATE"
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


        // --------------------------------------------------
        // Student must have joined on/before attendance date
        // --------------------------------------------------

        const joiningDate =
            studentResult.rows[0]?.joining_date;

        if (
            joiningDate &&
            String(attendance_date) <
            String(joiningDate)
        ) {
            return res.status(400).json({
                message:
                    "Attendance cannot be marked before the student's joining date.",
                joining_date:
                    joiningDate,
                attendance_date:
                    attendance_date
            });
        }

        if (studentResult.rows.length === 0) {

            return res.status(404).json({
                message: "Student not found"
            });

        }


        // ------------------------------
        // Insert / Update attendance
        // ------------------------------
        //
        // One attendance record is allowed per
        // student per date.
        //
        // New record  -> INSERT
        // Existing    -> UPDATE
        // ------------------------------

        const result = await pool.query(
            `
            INSERT INTO attendance
            (
                student_id,
                attendance_date,
                status,
                marked_by
            )
            VALUES ($1, $2, $3, $4)

            ON CONFLICT (student_id, attendance_date)
            DO UPDATE SET
                status = EXCLUDED.status,
                marked_by = EXCLUDED.marked_by

            RETURNING *
            `,
            [
                student_id,
                attendance_date,
                status,
                req.user.id
            ]
        );


        // ------------------------------
        // Response
        // ------------------------------

        res.status(201).json({

            message: "Attendance marked successfully",

            student: studentResult.rows[0],

            attendance: result.rows[0]

        });

    }

    catch (error) {

        console.error("Attendance Error:", error);


        // Duplicate attendance
        if (error.code === "23505") {

            return res.status(409).json({

                message:
                    "Attendance already exists for this student on this date"

            });

        }


        res.status(500).json({

            message: "Internal server error",

            error: error.message

        });

    }

});


// ==================================================
// 2. GET ATTENDANCE FOR A DATE
// ==================================================

router.get("/date/:date", async (req, res) => {

    try {

        const { date } = req.params;


        const result = await pool.query(
            `
            SELECT

                a.id,

                s.id AS student_id,

                s.student_code,

                s.name AS student_name,

                s.parent_name,

                s.parent_mobile,

                s.belt,

                s.batch,

                a.attendance_date,

                a.status,

                a.marked_by,

                a.created_at

            FROM attendance a

            JOIN students s
                ON a.student_id = s.id

            LEFT JOIN branches b
                ON s.branch_id = b.id

            WHERE a.attendance_date = $1
              AND s.joining_date <= $1

            ORDER BY s.name
            `,
            [date]
        );


        res.json({

            date: date,

            total_students: result.rows.length,

            attendance: result.rows

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Internal server error"

        });

    }

});


// ==================================================
// 3. GET STUDENT ATTENDANCE HISTORY
// ==================================================

router.get("/student/:studentId", async (req, res) => {

    try {

        const { studentId } = req.params;


        const result = await pool.query(
            `
            SELECT

                a.id,

                s.student_code,

                s.name AS student_name,

                a.attendance_date,

                a.status,

                a.marked_by,

                a.created_at

            FROM attendance a

            JOIN students s
                ON a.student_id = s.id

            WHERE a.student_id = $1

            ORDER BY a.attendance_date DESC
            `,
            [studentId]
        );


        res.json({

            student_id: studentId,

            total_records: result.rows.length,

            attendance: result.rows

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Internal server error"

        });

    }

});


// ==================================================
// 4. GET MONTHLY ATTENDANCE SUMMARY
// ==================================================

router.get("/summary/:studentId/:year/:month", async (req, res) => {

    try {

        const {
            studentId,
            year,
            month
        } = req.params;


        const result = await pool.query(
            `
            SELECT

                COUNT(*) AS total_days,

                COUNT(*) FILTER (
                    WHERE status = 'PRESENT'
                ) AS present_days,

                COUNT(*) FILTER (
                    WHERE status = 'ABSENT'
                ) AS absent_days,

                COUNT(*) FILTER (
                    WHERE status = 'LATE'
                ) AS late_days

            FROM attendance

            WHERE student_id = $1

            AND EXTRACT(YEAR FROM attendance_date) = $2

            AND EXTRACT(MONTH FROM attendance_date) = $3
            `,
            [
                studentId,
                year,
                month
            ]
        );


        res.json({

            student_id: studentId,

            year: year,

            month: month,

            summary: result.rows[0]

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Internal server error"

        });

    }

});




// ==================================================
// BRANCH-WISE ATTENDANCE SUMMARY

// ==================================================
// BRANCH-WISE ATTENDANCE SUMMARY
// ==================================================

router.get(
    "/branch-summary/:date",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const { date } = req.params;

            if (!date) {

                return res.status(400).json({
                    message:
                        "Attendance date is required"
                });

            }

            let sql = `
                SELECT

                    b.id AS branch_id,

                    b.branch_name,

                    b.branch_code,

                    COUNT(
                        DISTINCT s.id
                    ) AS total_students,

                    COUNT(
                        DISTINCT CASE
                            WHEN a.status = 'PRESENT'
                            THEN a.student_id
                        END
                    ) AS present_students,

                    COUNT(
                        DISTINCT CASE
                            WHEN a.status = 'ABSENT'
                            THEN a.student_id
                        END
                    ) AS absent_students,

                    COUNT(
                        DISTINCT CASE
                            WHEN a.status = 'LATE'
                            THEN a.student_id
                        END
                    ) AS late_students,

                    COUNT(
                        DISTINCT CASE
                            WHEN a.id IS NOT NULL
                            THEN a.student_id
                        END
                    ) AS marked_students

                FROM branches b

                LEFT JOIN students s
                    ON s.branch_id = b.id
                    AND s.status = 'ACTIVE'

                LEFT JOIN attendance a
                    ON a.student_id = s.id
                    AND a.attendance_date = $1
            `;

            const params = [date];

            /*
             * Super Admin:
             *   all active branches.
             *
             * Branch Admin:
             *   only assigned branch.
             */

            if (
                req.user.role === "BRANCH_ADMIN"
            ) {

                if (!req.user.branch_id) {

                    return res.status(403).json({
                        message:
                            "Branch Admin is not assigned to a branch"
                    });

                }

                sql += `
                    WHERE b.id = $2
                `;

                params.push(
                    req.user.branch_id
                );

            }

            sql += `

                AND b.status = 'ACTIVE'

                GROUP BY
                    b.id,
                    b.branch_name,
                    b.branch_code

                ORDER BY
                    b.branch_name
            `;

            const result =
                await pool.query(
                    sql,
                    params
                );

            const branches =
                result.rows.map(
                    function (row) {

                        const total =
                            Number(
                                row.total_students || 0
                            );

                        const present =
                            Number(
                                row.present_students || 0
                            );

                        const absent =
                            Number(
                                row.absent_students || 0
                            );

                        const late =
                            Number(
                                row.late_students || 0
                            );

                        const marked =
                            Number(
                                row.marked_students || 0
                            );

                        const percentage =
                            total > 0
                                ? Number(
                                    (
                                        present /
                                        total *
                                        100
                                    ).toFixed(1)
                                )
                                : 0;

                        return {

                            branch_id:
                                row.branch_id,

                            branch_name:
                                row.branch_name,

                            branch_code:
                                row.branch_code,

                            total_students:
                                total,

                            present:
                                present,

                            absent:
                                absent,

                            late:
                                late,

                            marked:
                                marked,

                            not_marked:
                                Math.max(
                                    total - marked,
                                    0
                                ),

                            attendance_percentage:
                                percentage

                        };

                    }
                );

            const totals =
                branches.reduce(
                    function (acc, branch) {

                        acc.total_students +=
                            branch.total_students;

                        acc.present +=
                            branch.present;

                        acc.absent +=
                            branch.absent;

                        acc.late +=
                            branch.late;

                        acc.marked +=
                            branch.marked;

                        acc.not_marked +=
                            branch.not_marked;

                        return acc;

                    },
                    {
                        total_students: 0,
                        present: 0,
                        absent: 0,
                        late: 0,
                        marked: 0,
                        not_marked: 0
                    }
                );

            totals.attendance_percentage =
                totals.total_students > 0
                    ? Number(
                        (
                            totals.present /
                            totals.total_students *
                            100
                        ).toFixed(1)
                    )
                    : 0;

            res.json({

                date: date,

                totals: totals,

                branches: branches

            });

        } catch (error) {

            console.error(
                "Branch attendance summary error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to fetch branch attendance summary",

                error:
                    error.message

            });

        }

    }
);


module.exports = router;
