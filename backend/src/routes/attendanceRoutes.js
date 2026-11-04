const express = require("express");
const pool = require("../config/db");

const { sendWhatsAppTemplateMessage } = require("../services/whatsappService");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

// ==================================================
// WHATSAPP ATTENDANCE NOTIFICATIONS
// ==================================================

const ATTENDANCE_TEMPLATE_NAME = "karate_attendance_update";

function formatAttendanceDate(value) {
    const raw = value instanceof Date
        ? value.toISOString().slice(0, 10)
        : String(value || "").slice(0, 10);

    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return raw || "Not specified";

    const [, year, month, day] = match;
    const date = new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day)
    ));

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
    }).format(date);
}

function getAttendanceStatusLabel(status) {
    const labels = {
        PRESENT: "Present",
        ABSENT: "Absent",
        LATE: "Late"
    };

    return labels[String(status || "").toUpperCase()] || String(status || "");
}

async function sendAttendanceWhatsAppNotification({
    attendance,
    student,
    req,
    triggerEvent
}) {
    const phone = student.parent_mobile || null;
    const role = String(req.user?.role || "").toUpperCase();

    let notificationStatus = "FAILED";
    let messageId = null;
    let errorMessage = null;

    if (!["SUPER_ADMIN", "BRANCH_ADMIN"].includes(role)) {
        notificationStatus = "SKIPPED_ROLE";
        errorMessage = "Only Super Admin and Branch Admin can send attendance notifications.";
    } else if (student.whatsapp_opt_in !== true) {
        notificationStatus = "SKIPPED_CONSENT";
        errorMessage = "Parent WhatsApp consent is not recorded.";
    } else if (!phone || !String(phone).trim()) {
        notificationStatus = "SKIPPED_NO_PHONE";
        errorMessage = "Parent mobile number is not available.";
    } else {
        try {
            const response = await sendWhatsAppTemplateMessage(
                phone,
                ATTENDANCE_TEMPLATE_NAME,
                [
                    student.parent_name || "Parent",
                    student.name || "Student",
                    getAttendanceStatusLabel(attendance.status),
                    formatAttendanceDate(attendance.attendance_date),
                    student.batch || "Not specified",
                    student.branch_name || "Karate Academy"
                ],
                "en_US"
            );

            messageId = response.messages?.[0]?.id || null;
            notificationStatus = "ACCEPTED";

        } catch (error) {
            notificationStatus = "FAILED";
            errorMessage = error.response?.data
                ? JSON.stringify(error.response.data)
                : error.message;

            console.error(
                "Attendance WhatsApp notification failed:",
                error.response?.data || error.message
            );
        }
    }

    let logSaved = false;

    try {
        await pool.query(
            `
            INSERT INTO attendance_whatsapp_notification_logs (
                attendance_id,
                student_id,
                branch_id,
                recipient_phone,
                template_name,
                message_id,
                status,
                trigger_event,
                error_message,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `,
            [
                attendance.id,
                student.id,
                student.branch_id || null,
                phone,
                ATTENDANCE_TEMPLATE_NAME,
                messageId,
                notificationStatus,
                triggerEvent,
                errorMessage,
                req.user?.id || req.user?.user_id || null
            ]
        );

        logSaved = true;

    } catch (logError) {
        console.error(
            "Attendance WhatsApp log insert failed:",
            logError.message
        );
    }

    return {
        status: notificationStatus,
        messageId,
        logSaved
    };
}




// ==================================================
// 1. MARK ATTENDANCE
// ==================================================

router.post("/", async (req, res) => {
    const body = req.body || {};
    const studentId = Number(body.student_id);
    const attendanceDate = String(body.attendance_date || "").trim();
    const status = String(body.status || "").trim().toUpperCase();

    if (!Number.isSafeInteger(studentId) || studentId < 1) {
        return res.status(400).json({
            message: "A valid student_id is required"
        });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
        return res.status(400).json({
            message: "attendance_date must use YYYY-MM-DD format"
        });
    }

    const parsedDate = new Date(`${attendanceDate}T00:00:00.000Z`);

    if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== attendanceDate
    ) {
        return res.status(400).json({
            message: "Invalid attendance date"
        });
    }

    const allowedStatus = ["PRESENT", "ABSENT", "LATE"];

    if (!allowedStatus.includes(status)) {
        return res.status(400).json({
            message: "Invalid status. Use PRESENT, ABSENT or LATE"
        });
    }

    let client = null;
    let student = null;
    let attendance = null;
    let shouldNotify = false;
    let triggerEvent = null;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        // Serialize writes for this student's attendance on this date.
        await client.query(
            "SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",
            [`karate-attendance-${studentId}-${attendanceDate}`]
        );

        const studentResult = await client.query(
            `
            SELECT
                s.id,
                s.student_code,
                s.name,
                s.parent_name,
                s.parent_mobile,
                s.joining_date,
                s.batch,
                s.branch_id,
                s.whatsapp_opt_in,
                b.branch_name
            FROM students s
            LEFT JOIN branches b
                ON b.id = s.branch_id
            WHERE s.id = $1
            `,
            [studentId]
        );

        if (studentResult.rows.length === 0) {
            await client.query("ROLLBACK");
            client.release();
            client = null;

            return res.status(404).json({
                message: "Student not found or not accessible to your branch"
            });
        }

        student = studentResult.rows[0];

        const joiningDate = student.joining_date
            ? String(student.joining_date).slice(0, 10)
            : null;

        if (joiningDate && attendanceDate < joiningDate) {
            await client.query("ROLLBACK");
            client.release();
            client = null;

            return res.status(400).json({
                message: "Attendance cannot be marked before the student's joining date.",
                joining_date: joiningDate,
                attendance_date: attendanceDate
            });
        }

        const existingResult = await client.query(
            `
            SELECT id, status
            FROM attendance
            WHERE student_id = $1
              AND attendance_date = $2
            FOR UPDATE
            `,
            [studentId, attendanceDate]
        );

        const existing = existingResult.rows[0] || null;

        const result = await client.query(
            `
            INSERT INTO attendance (
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
                studentId,
                attendanceDate,
                status,
                req.user.id
            ]
        );

        attendance = result.rows[0];

        const isNewAttendance = !existing;
        const isStatusChanged = existing &&
            String(existing.status).toUpperCase() !== status;

        shouldNotify = Boolean(isNewAttendance || isStatusChanged);

        if (isNewAttendance) {
            triggerEvent = "ATTENDANCE_CREATED";
        } else if (isStatusChanged) {
            triggerEvent = "ATTENDANCE_STATUS_CHANGED";
        }

        await client.query("COMMIT");
        client.release();
        client = null;

    } catch (error) {
        // Destroy a failed transaction connection. PostgreSQL rolls
        // back the open transaction when that connection is closed.
        if (client) {
            client.release(error);
            client = null;
        }

        console.error("Attendance save error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Attendance already exists for this student on this date"
            });
        }

        return res.status(500).json({
            message: "Unable to save attendance",
            error: error.message
        });
    }

    // Attendance is already committed. A WhatsApp failure must not
    // undo the saved attendance.
    let whatsappNotification = {
        status: "SKIPPED_UNCHANGED",
        messageId: null,
        logSaved: false
    };

    if (shouldNotify) {
        whatsappNotification = await sendAttendanceWhatsAppNotification({
            attendance,
            student,
            req,
            triggerEvent
        });
    }

    return res.status(201).json({
        message: "Attendance marked successfully",
        student: {
            id: student.id,
            student_code: student.student_code,
            name: student.name,
            parent_name: student.parent_name,
            parent_mobile: student.parent_mobile
        },
        attendance,
        whatsapp_notification: whatsappNotification
    });
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
