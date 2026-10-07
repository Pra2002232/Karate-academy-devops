const express = require("express");
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
router.post("/examinations", async (req, res) => {
    try {
        const {
            student_id,
            current_belt_id,
            target_belt_id,
            examination_date,
            examiner,
            exam_fee,
            notes
        } = req.body;

        if (
            !student_id ||
            !target_belt_id ||
            !examination_date
        ) {
            return res.status(400).json({
                message: "student_id, target_belt_id and examination_date are required"
            });
        }

        const studentCheck = await pool.query(
            `
            SELECT id, name, belt
            FROM students
            WHERE id = $1
            `,
            [student_id]
        );

        if (studentCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO grading_examinations (
                student_id,
                current_belt_id,
                target_belt_id,
                examination_date,
                examiner,
                exam_fee,
                result,
                notes
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                'SCHEDULED',
                $7
            )
            RETURNING *
            `,
            [
                student_id,
                current_belt_id || null,
                target_belt_id,
                examination_date,
                examiner || null,
                exam_fee || null,
                notes || null
            ]
        );

        res.status(201).json({
            message: "Grading examination scheduled successfully",
            examination: result.rows[0]
        });

    } catch (error) {
        console.error("POST /api/belts/examinations error:", error);
        res.status(500).json({
            message: "Failed to schedule grading examination"
        });
    }
});


/*
|--------------------------------------------------------------------------
| PUT /api/belts/examinations/:id
| Update examination scores/result
|--------------------------------------------------------------------------
*/
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

        /*
         * Get student
         */
        const studentResult = await client.query(
            `
            SELECT id, name, belt
            FROM students
            WHERE id = $1
            FOR UPDATE
            `,
            [student_id]
        );

        if (studentResult.rows.length === 0) {
            throw new Error("Student not found");
        }

        const student = studentResult.rows[0];

        /*
         * Get target belt
         */
        const beltResult = await client.query(
            `
            SELECT
                id,
                belt_name,
                kyu_level
            FROM belt_levels
            WHERE id = $1
            AND is_active = TRUE
            `,
            [target_belt_id]
        );

        if (beltResult.rows.length === 0) {
            throw new Error("Target belt not found");
        }

        const targetBelt = beltResult.rows[0];

        /*
         * Mark existing current grades as history
         */
        await client.query(
            `
            UPDATE student_grades
            SET status = 'HISTORY'
            WHERE student_id = $1
            AND status = 'CURRENT'
            `,
            [student_id]
        );

        /*
         * Create new current grade
         */
        await client.query(
            `
            INSERT INTO student_grades (
                student_id,
                belt_level_id,
                grade,
                promoted_date,
                status
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

        /*
         * Add belt history
         */
        await client.query(
            `
            INSERT INTO belt_history (
                student_id,
                previous_belt,
                new_belt,
                grading_date,
                remarks
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                student_id,
                student.belt,
                targetBelt.belt_name.toUpperCase(),
                promoted_date,
                remarks || null
            ]
        );

        /*
         * Update student's current belt
         */
        await client.query(
            `
            UPDATE students
            SET belt = $1
            WHERE id = $2
            `,
            [
                targetBelt.belt_name.toUpperCase(),
                student_id
            ]
        );

        /*
         * Mark examination as passed
         */
        if (examination_id) {
            await client.query(
                `
                UPDATE grading_examinations
                SET
                    result = 'PASSED',
                    target_belt_id = $1
                WHERE id = $2
                AND student_id = $3
                `,
                [
                    target_belt_id,
                    examination_id,
                    student_id
                ]
            );
        }

        await client.query("COMMIT");

        res.json({
            message: "Student promoted successfully",
            student_id,
            student_name: student.name,
            previous_belt: student.belt,
            new_belt: targetBelt.belt_name.toUpperCase(),
            grade: grade || targetBelt.kyu_level,
            promoted_date
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("POST /api/belts/promote error:", error);

        res.status(500).json({
            message: error.message || "Failed to promote student"
        });

    } finally {
        client.release();
    }
});


module.exports = router;
