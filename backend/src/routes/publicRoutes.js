const express = require("express");

const pool = require("../config/db");

const router = express.Router();


/*
=====================================================
PUBLIC ACADEMY INFORMATION
=====================================================
*/

router.get(
    "/academy",
    async (req, res) => {

        try {

            const branches =
                await pool.query(`
                    SELECT
                        id,
                        branch_name,
                        branch_code,
                        address,
                        contact_number,
                        email
                    FROM branches
                    WHERE status = 'ACTIVE'
                    ORDER BY branch_name
                `);


            const students =
                await pool.query(`
                    SELECT COUNT(*)::int AS total
                    FROM students
                    WHERE status = 'ACTIVE'
                `);


            const competitions =
                await pool.query(`
                    SELECT
                        id,
                        competition_name,
                        competition_date,
                        location,
                        status
                    FROM competitions
                    WHERE competition_date >= CURRENT_DATE
                    ORDER BY competition_date
                    LIMIT 10
                `);


            res.json({

                academy: {
                    total_students:
                        students.rows[0].total
                },

                branches:
                    branches.rows,

                upcoming_competitions:
                    competitions.rows

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message:
                    "Failed to load public academy information"
            });

        }

    }
);


module.exports = router;
