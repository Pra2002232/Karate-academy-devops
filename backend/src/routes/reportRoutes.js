const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// =====================================================
// STUDENT REPORT
// GET /api/reports/students
// =====================================================
router.get("/students", async (req, res) => {
    try {
        const result = await pool.query(`
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
                s.created_at
            FROM students s
            ORDER BY s.id DESC
        `);

        res.json({
            report: "students",
            total: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Student report error:", error);

        res.status(500).json({
            error: "Failed to generate student report"
        });
    }
});


// =====================================================
// ATTENDANCE REPORT
// GET /api/reports/attendance
// =====================================================
router.get("/attendance", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                a.*,
                s.name AS student_name,
                s.student_code
            FROM attendance a
            JOIN students s
                ON s.id = a.student_id
            ORDER BY a.id DESC
        `);

        res.json({
            report: "attendance",
            total: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Attendance report error:", error);

        res.status(500).json({
            error: "Failed to generate attendance report"
        });
    }
});


// =====================================================
// FEES REPORT
// GET /api/reports/fees
// =====================================================
router.get("/fees", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                f.*,
                s.name AS student_name,
                s.student_code
            FROM fees f
            JOIN students s
                ON s.id = f.student_id
            ORDER BY f.id DESC
        `);

        res.json({
            report: "fees",
            total: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Fees report error:", error);

        res.status(500).json({
            error: "Failed to generate fees report"
        });
    }
});


// =====================================================
// BELT & GRADING REPORT
// GET /api/reports/belts
// =====================================================
router.get("/belts", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                bg.id,
                bg.student_id,
                s.name AS student_name,
                s.student_code,
                bg.previous_belt,
                bg.new_belt,
                bg.grading_date,
                bg.remarks
            FROM belt_history bg
            JOIN students s
                ON s.id = bg.student_id
            ORDER BY bg.grading_date DESC, bg.id DESC
        `);

        res.json({
            report: "belts",
            total: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Belt report error:", error);

        res.status(500).json({
            error: "Failed to generate belt report"
        });
    }
});


// =====================================================
// COMPETITIONS REPORT
// GET /api/reports/competitions
// =====================================================
router.get("/competitions", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                c.id,
                c.competition_name,
                c.competition_date,
                c.location,
                c.organizer,
                c.description,
                c.created_at
            FROM competitions c
            ORDER BY c.competition_date DESC, c.id DESC
        `);

        res.json({
            report: "competitions",
            total: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Competition report error:", error);

        res.status(500).json({
            error: "Failed to generate competition report"
        });
    }
});


// =====================================================
// RESULTS & WINNERS REPORT
// GET /api/reports/results
// =====================================================
router.get("/results", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                cr.id,
                cr.competition_id,
                c.competition_name,
                c.competition_date,

                cr.student_id,
                s.name AS student_name,
                s.student_code,

                cr.category,
                cr.event,
                cr.result,
                cr.medal,
                cr.position,
                cr.remarks

            FROM competition_results cr

            JOIN competitions c
                ON c.id = cr.competition_id

            JOIN students s
                ON s.id = cr.student_id

            ORDER BY
                c.competition_date DESC,
                cr.position ASC NULLS LAST,
                cr.id DESC
        `);

        res.json({
            report: "results",
            total: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Results report error:", error);

        res.status(500).json({
            error: "Failed to generate results report"
        });
    }
});


module.exports = router;
