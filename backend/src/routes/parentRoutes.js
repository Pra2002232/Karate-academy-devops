const express = require("express");

const pool = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();


/*
=========================================================
PARENT DASHBOARD
=========================================================
GET /api/parents/dashboard
=========================================================
*/

router.get(
    "/dashboard",
    authenticateToken,
    authorizeRoles("PARENT"),
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        public.parent_dashboard()
                            AS dashboard
                    `
                );

            res.json(
                result.rows[0].dashboard
            );

        } catch (error) {

            console.error(
                "Parent dashboard error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load parent dashboard"
            });
        }
    }
);


/*
=========================================================
PARENT CHILDREN
Legacy-compatible endpoint
=========================================================
*/

router.get(
    "/children",
    authenticateToken,
    authorizeRoles("PARENT"),
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        public.parent_dashboard()
                            AS dashboard
                    `
                );

            const dashboard =
                result.rows[0].dashboard;

            res.json({
                children:
                    dashboard.children || []
            });

        } catch (error) {

            console.error(
                "Parent children error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch children"
            });
        }
    }
);


/*
=========================================================
PARENT CHILD PROFILE
=========================================================
*/

router.get(
    "/children/:studentId",
    authenticateToken,
    authorizeRoles("PARENT"),
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        public.parent_dashboard()
                            AS dashboard
                    `
                );

            const dashboard =
                result.rows[0].dashboard;

            const student =
                (dashboard.children || [])
                    .find(
                        item =>
                            String(item.id)
                            ===
                            String(req.params.studentId)
                    );


            if (!student) {

                return res.status(404).json({
                    message:
                        "Student not found"
                });

            }


            res.json({
                student
            });

        } catch (error) {

            console.error(
                "Parent student error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch student"
            });
        }
    }
);


module.exports = router;
