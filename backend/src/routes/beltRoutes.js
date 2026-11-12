const express = require("express");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const {
    sendWhatsAppTemplateMessage
} = require("../services/whatsappService");

const router = express.Router();

/*
 * All fee/belt API calls require an authenticated
 * academy user. This also establishes the PostgreSQL
 * role/branch request context used by RLS.
 */
router.use(authenticateToken);

const pool = require("../config/db");

/*
|--------------------------------------------------------------------------
| GET /api/belts
| Get all belt levels
|--------------------------------------------------------------------------
*/
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                belt_name,
                belt_color,
                kyu_level,
                sequence_order,
                description,
                is_active
            FROM belt_levels
            WHERE is_active = TRUE
            ORDER BY sequence_order
        `);

        res.json({
            total_belts: result.rows.length,
            belts: result.rows
        });
    } catch (error) {
        console.error("GET /api/belts error:", error);
        res.status(500).json({
            message: "Failed to fetch belt levels"
        });
    }
});


/*
|--------------------------------------------------------------------------
| GET /api/belts/dashboard
| Belt dashboard statistics
|--------------------------------------------------------------------------
*/
router.get("/dashboard", async (req, res) => {
    try {
        const totalStudents = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM students
            WHERE status = 'ACTIVE'
        `);

        const blackBelts = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM students
            WHERE UPPER(belt) = 'BLACK'
            AND status = 'ACTIVE'
        `);

        const upcomingGradings = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM grading_examinations
            WHERE result = 'SCHEDULED'
            AND examination_date >= CURRENT_DATE
        `);

        const passedGradings = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM grading_examinations
            WHERE result = 'PASSED'
        `);

        const beltDistribution = await pool.query(`
            SELECT
                bl.belt_name,
                bl.belt_color,
                bl.sequence_order,
                COUNT(s.id)::int AS student_count
            FROM belt_levels bl
            LEFT JOIN students s
                ON UPPER(s.belt) = UPPER(bl.belt_name)
                AND s.status = 'ACTIVE'
            GROUP BY
                bl.id,
                bl.belt_name,
                bl.belt_color,
                bl.sequence_order
            ORDER BY bl.sequence_order
        `);

        res.json({
            total_students: totalStudents.rows[0].count,
            black_belts: blackBelts.rows[0].count,
            upcoming_gradings: upcomingGradings.rows[0].count,
            passed_gradings: passedGradings.rows[0].count,
            belt_distribution: beltDistribution.rows
        });

    } catch (error) {
        console.error("GET /api/belts/dashboard error:", error);
        res.status(500).json({
            message: "Failed to fetch belt dashboard"
        });
    }
});


/*
|--------------------------------------------------------------------------
| GET /api/belts/students
| Students with current belt, grade and next belt
|--------------------------------------------------------------------------
*/
router.get("/students", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                s.id,
                s.student_code,
                s.name,
                s.parent_name,
                s.parent_mobile,
                s.belt AS current_belt,
                s.batch,
                s.status,

                sg.grade,
                sg.promoted_date,

                bl.id AS belt_level_id,
                bl.belt_name,
                bl.belt_color,
                bl.kyu_level,
                bl.sequence_order,

                next_bl.belt_name AS next_belt,
                next_bl.kyu_level AS next_kyu

            FROM students s

            LEFT JOIN student_grades sg
                ON sg.student_id = s.id
                AND sg.status = 'CURRENT'

            LEFT JOIN belt_levels bl
                ON UPPER(bl.belt_name) = UPPER(s.belt)

            LEFT JOIN belt_levels next_bl
                ON next_bl.sequence_order = bl.sequence_order + 1

            WHERE s.status = 'ACTIVE'

            ORDER BY s.name
        `);

        res.json({
            total_students: result.rows.length,
            students: result.rows
        });

    } catch (error) {
        console.error("GET /api/belts/students error:", error);
        res.status(500).json({
            message: "Failed to fetch belt students"
        });
    }
});


/*
|--------------------------------------------------------------------------
| GET /api/belts/history
| Complete belt promotion history
|--------------------------------------------------------------------------
*/
router.get("/history", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                bh.id,
                bh.student_id,
                s.student_code,
                s.name AS student_name,
                bh.previous_belt,
                bh.new_belt,
                bh.grading_date,
                bh.remarks
            FROM belt_history bh
            INNER JOIN students s
                ON s.id = bh.student_id
            ORDER BY bh.grading_date DESC, bh.id DESC
        `);

        res.json({
            total_history: result.rows.length,
            history: result.rows
        });

    } catch (error) {
        console.error("GET /api/belts/history error:", error);
        res.status(500).json({
            message: "Failed to fetch belt history"
        });
    }
});


/*
|--------------------------------------------------------------------------
| GET /api/belts/examinations
| All grading examinations
|--------------------------------------------------------------------------
*/
router.get("/examinations", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                ge.id,
                ge.student_id,
                s.student_code,
                s.name AS student_name,

		ge.current_belt_id,
		ge.target_belt_id,

                current_bl.belt_name AS current_belt,
                current_bl.kyu_level AS current_kyu,

                target_bl.belt_name AS target_belt,
                target_bl.kyu_level AS target_kyu,

                ge.examination_date,
                ge.examiner,
                ge.exam_fee,

                ge.kihon_score,
                ge.kata_score,
                ge.kumite_score,
                ge.discipline_score,
                ge.total_score,

                ge.result,
                ge.notes,
                ge.created_at

            FROM grading_examinations ge

            INNER JOIN students s
                ON s.id = ge.student_id

            LEFT JOIN belt_levels current_bl
                ON current_bl.id = ge.current_belt_id

            LEFT JOIN belt_levels target_bl
                ON target_bl.id = ge.target_belt_id

            ORDER BY ge.examination_date DESC, ge.id DESC
        `);

        res.json({
            total_examinations: result.rows.length,
            examinations: result.rows
        });

    } catch (error) {
        console.error("GET /api/belts/examinations error:", error);
        res.status(500).json({
            message: "Failed to fetch grading examinations"
        });
    }
});


/*
|--------------------------------------------------------------------------
| POST /api/belts/examinations
| Schedule a grading examination
|--------------------------------------------------------------------------
*/
router.post(
    "/examinations",
    authorizeRoles("SUPER_ADMIN", "BRANCH_ADMIN"),
    async (req, res) => {
        let student;
        let examination;

        // First save the examination.
        try {
            const {
                student_id,
                current_belt_id,
                target_belt_id,
                examination_date,
                reporting_time,
                venue,
                examiner,
                exam_fee,
                notes
            } = req.body;

            if (
                !student_id ||
                !target_belt_id ||
                !examination_date ||
                !reporting_time ||
                !venue ||
                !String(venue).trim()
            ) {
                return res.status(400).json({
                    message: "Student, target belt, examination date, reporting time and venue are required"
                });
            }

            if (!/^\d{2}:\d{2}$/.test(String(reporting_time))) {
                return res.status(400).json({
                    message: "Invalid reporting time. Use HH:MM format."
                });
            }

            const studentResult = await pool.query(
                `
                SELECT
                    s.id,
                    s.name,
                    s.parent_name,
                    s.parent_mobile,
                    s.whatsapp_opt_in,
                    s.branch_id,
                    COALESCE(
                        bl.belt_name,
                        s.belt,
                        'Not specified'
                    ) AS current_belt
                FROM students s
                LEFT JOIN belt_levels bl
                    ON bl.id = $2
                WHERE s.id = $1
                `,
                [student_id, current_belt_id || null]
            );

            if (!studentResult.rows.length) {
                return res.status(404).json({
                    message: "Student not found"
                });
            }

            student = studentResult.rows[0];

            const insertResult = await pool.query(
                `
                INSERT INTO grading_examinations (
                    student_id,
                    current_belt_id,
                    target_belt_id,
                    examination_date,
                    reporting_time,
                    venue,
                    examiner,
                    exam_fee,
                    result,
                    notes
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8,
                    'SCHEDULED', $9
                )
                RETURNING *
                `,
                [
                    student_id,
                    current_belt_id || null,
                    target_belt_id,
                    examination_date,
                    reporting_time,
                    String(venue).trim(),
                    examiner || null,
                    exam_fee || null,
                    notes || null
                ]
            );

            examination = insertResult.rows[0];

        } catch (error) {
            console.error("Grading examination save error:", error);

            return res.status(500).json({
                message: "Failed to schedule grading examination"
            });
        }

        // Notification is processed only after the examination is saved.
        let whatsappNotification = {
            status: "NOT_PROCESSED"
        };

        try {
            const rawPhone = String(
                student.parent_mobile || ""
            ).replace(/\D/g, "");

            let normalizedPhone = rawPhone;

            if (normalizedPhone.length === 10) {
                normalizedPhone = "91" + normalizedPhone;
            } else if (
                normalizedPhone.length === 11 &&
                normalizedPhone.startsWith("0")
            ) {
                normalizedPhone = "91" + normalizedPhone.slice(1);
            }

            const validPhone = /^\d{11,15}$/.test(normalizedPhone);

            let initialStatus;

            if (student.whatsapp_opt_in !== true) {
                initialStatus = "SKIPPED_CONSENT";
            } else if (!rawPhone) {
                initialStatus = "SKIPPED_NO_PHONE";
            } else if (!validPhone) {
                initialStatus = "SKIPPED_INVALID_PHONE";
            } else {
                initialStatus = "SENDING";
            }

            const logResult = await pool.query(
                `
                INSERT INTO grading_whatsapp_notification_logs (
                    grading_examination_id,
                    student_id,
                    branch_id,
                    recipient_key,
                    recipient_phone,
                    parent_name,
                    template_name,
                    status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (grading_examination_id)
                DO NOTHING
                RETURNING id
                `,
                [
                    examination.id,
                    student.id,
                    student.branch_id,
                    validPhone ? normalizedPhone : `STUDENT_${student.id}`,
                    validPhone ? normalizedPhone : null,
                    student.parent_name || null,
                    "karate_belt_grading_reminder",
                    initialStatus
                ]
            );

            if (!logResult.rows.length) {
                whatsappNotification = {
                    status: "ALREADY_PROCESSED"
                };
            } else if (initialStatus !== "SENDING") {
                whatsappNotification = {
                    status: initialStatus
                };
            } else {
                const logId = logResult.rows[0].id;

                const examinationDateValue = examination.examination_date;

                const dateString = examinationDateValue instanceof Date
                    ? examinationDateValue.toISOString().slice(0, 10)
                    : String(examinationDateValue).slice(0, 10);

                const dateParts = dateString.split("-");

                const monthNames = [
                    "January", "February", "March", "April",
                    "May", "June", "July", "August",
                    "September", "October", "November", "December"
                ];

                const formattedDate = dateParts.length === 3
                    ? `${Number(dateParts[2])} ${monthNames[Number(dateParts[1]) - 1]} ${dateParts[0]}`
                    : dateString;

                const timeParts = String(
                    examination.reporting_time
                ).slice(0, 5).split(":");

                let formattedTime = String(examination.reporting_time);

                if (timeParts.length === 2) {
                    let hour = Number(timeParts[0]);
                    const minute = timeParts[1];
                    const suffix = hour >= 12 ? "PM" : "AM";

                    hour = hour % 12 || 12;

                    formattedTime =
                        `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
                }

                const parameters = [
                    student.parent_name || "Parent",
                    student.name || "Student",
                    student.current_belt || "Not specified",
                    formattedDate,
                    formattedTime,
                    examination.venue
                ];

                let waResult;
                let sendSucceeded = false;

                // Keep the provider request separate from database logging.
                try {
                    waResult = await sendWhatsAppTemplateMessage(
                        normalizedPhone,
                        "karate_belt_grading_reminder",
                        parameters,
                        "en_US"
                    );
                    sendSucceeded = true;
                } catch (waError) {
                    const definiteFailure = Boolean(
                        waError.response?.data?.error
                    );

                    const failureStatus = definiteFailure
                        ? "FAILED"
                        : "SENDING";

                    const errorMessage = String(
                        waError.response?.data?.error?.message ||
                        waError.message ||
                        "WhatsApp request failed"
                    ).slice(0, 2000);

                    try {
                        await pool.query(
                            `
                            UPDATE grading_whatsapp_notification_logs
                            SET
                                status = $2,
                                error_message = $3,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                            `,
                            [logId, failureStatus, errorMessage]
                        );
                    } catch (logError) {
                        console.error(
                            "WhatsApp failure log update failed:",
                            logError
                        );
                    }

                    console.error(
                        "Grading WhatsApp error:",
                        errorMessage
                    );

                    whatsappNotification = {
                        status: failureStatus,
                        message: definiteFailure
                            ? "WhatsApp provider rejected the message"
                            : "Delivery outcome uncertain; automatic retry disabled"
                    };
                }

                // Meta accepted the request. A later DB error must not
                // reclassify the WhatsApp send as failed.
                if (sendSucceeded) {
                    const messageId =
                        waResult?.messages?.[0]?.id || null;

                    whatsappNotification = {
                        status: "ACCEPTED",
                        messageId
                    };

                    try {
                        await pool.query(
                            `
                            UPDATE grading_whatsapp_notification_logs
                            SET
                                status = 'ACCEPTED',
                                message_id = $2,
                                error_message = NULL,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                            `,
                            [logId, messageId]
                        );
                    } catch (logError) {
                        console.error(
                            "WhatsApp accepted-message log update failed:",
                            logError
                        );

                        whatsappNotification.logWarning =
                            "Meta accepted the message, but the database log update failed. Do not resend automatically.";
                    }
                }

            }

        } catch (notificationError) {
            console.error(
                "Grading WhatsApp processing error:",
                notificationError
            );

            whatsappNotification = {
                status: "LOG_FAILED",
                message: "Examination saved, but notification processing failed"
            };
        }

        return res.status(201).json({
            message: "Grading examination scheduled successfully",
            examination,
            whatsappNotification
        });
    }
);


router.put("/examinations/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            kihon_score,
            kata_score,
            kumite_score,
            discipline_score,
            result,
            examiner,
            exam_fee,
            notes
        } = req.body;

        const scores = [
            kihon_score,
            kata_score,
            kumite_score,
            discipline_score
        ]
            .filter(value => value !== undefined && value !== null && value !== "")
            .map(Number);

        let total_score = null;

        if (scores.length === 4 && scores.every(score => !Number.isNaN(score))) {
            total_score =
                scores.reduce((sum, score) => sum + score, 0) / 4;
        }

        const updateResult = await pool.query(
            `
            UPDATE grading_examinations
            SET
                kihon_score = $1,
                kata_score = $2,
                kumite_score = $3,
                discipline_score = $4,
                total_score = $5,
                result = COALESCE($6, result),
                examiner = COALESCE($7, examiner),
                exam_fee = COALESCE($8, exam_fee),
                notes = COALESCE($9, notes)
            WHERE id = $10
            RETURNING *
            `,
            [
                kihon_score ?? null,
                kata_score ?? null,
                kumite_score ?? null,
                discipline_score ?? null,
                total_score,
                result || null,
                examiner || null,
                exam_fee ?? null,
                notes || null,
                id
            ]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                message: "Grading examination not found"
            });
        }

        res.json({
            message: "Grading examination updated successfully",
            examination: updateResult.rows[0]
        });

    } catch (error) {
        console.error("PUT /api/belts/examinations/:id error:", error);
        res.status(500).json({
            message: "Failed to update grading examination"
        });
    }
});


/*
|--------------------------------------------------------------------------
| POST /api/belts/promote
| Confirm student promotion
|--------------------------------------------------------------------------
*/
router.post("/promote", async (req, res) => {
    const client = await pool.connect();
    let transactionStarted = false;
    let transactionCommitted = false;

    try {
        const {
            student_id,
            examination_id,
            target_belt_id,
            grade,
            promoted_date,
            remarks
        } = req.body;

        if (!student_id || !target_belt_id || !promoted_date) {
            return res.status(400).json({
                message: "student_id, target_belt_id and promoted_date are required"
            });
        }

        await client.query("BEGIN");
        transactionStarted = true;

        const studentResult = await client.query(
            `
            SELECT
                id, name, belt, parent_name, parent_mobile,
                whatsapp_opt_in, branch_id
            FROM students
            WHERE id = $1
            FOR UPDATE
            `,
            [student_id]
        );

        if (!studentResult.rows.length) {
            throw new Error("Student not found");
        }

        const student = studentResult.rows[0];
        let examination = null;

        if (examination_id) {
            const examinationResult = await client.query(
                `
                SELECT id, examination_date
                FROM grading_examinations
                WHERE id = $1 AND student_id = $2
                FOR UPDATE
                `,
                [examination_id, student_id]
            );

            if (!examinationResult.rows.length) {
                throw new Error("Grading examination not found for this student");
            }

            examination = examinationResult.rows[0];
        }

        const beltResult = await client.query(
            `
            SELECT id, belt_name, kyu_level
            FROM belt_levels
            WHERE id = $1 AND is_active = TRUE
            `,
            [target_belt_id]
        );

        if (!beltResult.rows.length) {
            throw new Error("Target belt not found");
        }

        const targetBelt = beltResult.rows[0];
        const newBelt = targetBelt.belt_name.toUpperCase();

        await client.query(
            `
            UPDATE student_grades
            SET status = 'HISTORY'
            WHERE student_id = $1 AND status = 'CURRENT'
            `,
            [student_id]
        );

        await client.query(
            `
            INSERT INTO student_grades (
                student_id, belt_level_id, grade, promoted_date, status
            )
            VALUES ($1, $2, $3, $4, 'CURRENT')
            `,
            [
                student_id,
                targetBelt.id,
                grade || targetBelt.kyu_level,
                promoted_date
            ]
        );

        await client.query(
            `
            INSERT INTO belt_history (
                student_id, previous_belt, new_belt, grading_date, remarks
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [student_id, student.belt, newBelt, promoted_date, remarks || null]
        );

        await client.query(
            `UPDATE students SET belt = $1 WHERE id = $2`,
            [newBelt, student_id]
        );

        if (examination_id) {
            await client.query(
                `
                UPDATE grading_examinations
                SET result = 'PASSED', target_belt_id = $1
                WHERE id = $2 AND student_id = $3
                `,
                [target_belt_id, examination_id, student_id]
            );
        }

        // Commit the promotion before attempting WhatsApp.
        await client.query("COMMIT");
        transactionCommitted = true;

        let whatsappNotification = {
            status: examination_id
                ? "NOT_PROCESSED"
                : "SKIPPED_NO_EXAMINATION"
        };

        if (examination) {
            try {
                const rawPhone = String(student.parent_mobile || "").trim();
                let normalizedPhone = rawPhone.replace(/\D/g, "");

                if (normalizedPhone.startsWith("0")) {
                    normalizedPhone = "91" + normalizedPhone.slice(1);
                } else if (normalizedPhone.length === 10) {
                    normalizedPhone = "91" + normalizedPhone;
                }

                const validPhone = /^\d{11,15}$/.test(normalizedPhone);
                let initialStatus;

                if (student.whatsapp_opt_in !== true) {
                    initialStatus = "SKIPPED_CONSENT";
                } else if (!rawPhone) {
                    initialStatus = "SKIPPED_NO_PHONE";
                } else if (!validPhone) {
                    initialStatus = "SKIPPED_INVALID_PHONE";
                } else {
                    initialStatus = "SENDING";
                }

                // Unique examination ID prevents duplicate result messages.
                const logResult = await client.query(
                    `
                    INSERT INTO grading_result_whatsapp_notification_logs (
                        grading_examination_id,
                        student_id,
                        branch_id,
                        recipient_key,
                        recipient_phone,
                        parent_name,
                        template_name,
                        status,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (grading_examination_id) DO NOTHING
                    RETURNING id
                    `,
                    [
                        examination.id,
                        student.id,
                        student.branch_id,
                        validPhone ? normalizedPhone : `STUDENT_${student.id}`,
                        validPhone ? normalizedPhone : null,
                        student.parent_name || null,
                        "karate_belt_grading_result",
                        initialStatus,
                        req.user?.id || null
                    ]
                );

                if (!logResult.rows.length) {
                    whatsappNotification = { status: "ALREADY_PROCESSED" };

                } else if (initialStatus !== "SENDING") {
                    whatsappNotification = { status: initialStatus };

                } else {
                    const logId = logResult.rows[0].id;
                    const dateValue = examination.examination_date;

                    const dateString = dateValue instanceof Date
                        ? dateValue.toISOString().slice(0, 10)
                        : String(dateValue).slice(0, 10);

                    const dateParts = dateString.split("-");
                    const monthNames = [
                        "January", "February", "March", "April",
                        "May", "June", "July", "August",
                        "September", "October", "November", "December"
                    ];

                    const examinationDate = dateParts.length === 3
                        ? `${Number(dateParts[2])} ${monthNames[Number(dateParts[1]) - 1]} ${dateParts[0]}`
                        : dateString;

                    let waResult;
                    let sendSucceeded = false;

                    try {
                        waResult = await sendWhatsAppTemplateMessage(
                            normalizedPhone,
                            "karate_belt_grading_result",
                            [
                                student.parent_name || "Parent",
                                student.name || "Student",
                                student.belt || "Not specified",
                                newBelt,
                                examinationDate,
                                "Passed / Promoted"
                            ],
                            "en_US"
                        );

                        sendSucceeded = true;

                    } catch (waError) {
                        const definiteFailure = Boolean(
                            waError.response?.data?.error
                        );

                        const failureStatus = definiteFailure
                            ? "FAILED"
                            : "SENDING";

                        const errorMessage = String(
                            waError.response?.data?.error?.message ||
                            waError.message ||
                            "WhatsApp request failed"
                        ).slice(0, 2000);

                        try {
                            await client.query(
                                `
                                UPDATE grading_result_whatsapp_notification_logs
                                SET status = $2,
                                    error_message = $3,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = $1
                                `,
                                [logId, failureStatus, errorMessage]
                            );
                        } catch (logError) {
                            console.error(
                                "Grading result WhatsApp failure log update failed:",
                                logError
                            );
                        }

                        console.error(
                            "Grading result WhatsApp error:",
                            errorMessage
                        );

                        whatsappNotification = {
                            status: failureStatus,
                            message: definiteFailure
                                ? "WhatsApp provider rejected the message"
                                : "Delivery outcome uncertain; automatic retry disabled"
                        };
                    }

                    if (sendSucceeded) {
                        const messageId =
                            waResult?.messages?.[0]?.id || null;

                        whatsappNotification = {
                            status: "ACCEPTED",
                            messageId
                        };

                        try {
                            await client.query(
                                `
                                UPDATE grading_result_whatsapp_notification_logs
                                SET status = 'ACCEPTED',
                                    message_id = $2,
                                    error_message = NULL,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = $1
                                `,
                                [logId, messageId]
                            );
                        } catch (logError) {
                            console.error(
                                "Grading result WhatsApp accepted-message log update failed:",
                                logError
                            );

                            whatsappNotification.logWarning =
                                "Meta accepted the message, but the database log update failed. Do not resend automatically.";
                        }
                    }
                }

            } catch (notificationError) {
                console.error(
                    "Grading result WhatsApp processing error:",
                    notificationError
                );

                whatsappNotification = {
                    status: "LOG_FAILED",
                    message: "Promotion succeeded, but notification processing failed"
                };
            }
        }

        return res.json({
            message: "Student promoted successfully",
            student_id,
            student_name: student.name,
            previous_belt: student.belt,
            new_belt: newBelt,
            grade: grade || targetBelt.kyu_level,
            promoted_date,
            whatsappNotification
        });

    } catch (error) {
        if (transactionStarted && !transactionCommitted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Promotion transaction rollback error:", rollbackError);
            }
        }

        console.error("POST /api/belts/promote error:", error);

        return res.status(500).json({
            message: error.message || "Failed to promote student"
        });

    } finally {
        client.release();
    }
});


module.exports = router;
