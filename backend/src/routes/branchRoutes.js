const express = require("express");
const pool = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// GET ALL BRANCHES
// SUPER ADMIN ONLY
// =====================================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const result = await pool.query(`
                SELECT
                    b.id,
                    b.branch_name,
                    b.branch_code,
                    b.address,
                    b.contact_number,
                    b.email,
                    b.status,
                    b.created_at,

                    COUNT(DISTINCT s.id) AS student_count,
                    COUNT(DISTINCT u.id) AS user_count

                FROM branches b

                LEFT JOIN students s
                    ON s.branch_id = b.id

                LEFT JOIN users u
                    ON u.branch_id = b.id

                GROUP BY
                    b.id

                ORDER BY
                    b.id DESC
            `);

            res.json({
                branches: result.rows
            });

        } catch (error) {

            console.error("Get Branches Error:", error);

            res.status(500).json({
                message: "Failed to fetch branches"
            });

        }

    }
);


// =====================================================
// CREATE BRANCH
// SUPER ADMIN ONLY
// =====================================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const {
                branch_name,
                branch_code,
                address,
                contact_number,
                email
            } = req.body;

            if (!branch_name || !branch_code) {

                return res.status(400).json({
                    message:
                        "branch_name and branch_code are required"
                });

            }

            const result = await pool.query(
                `
                INSERT INTO branches
                (
                    branch_name,
                    branch_code,
                    address,
                    contact_number,
                    email,
                    status
                )
                VALUES
                ($1,$2,$3,$4,$5,'ACTIVE')

                RETURNING *
                `,
                [
                    branch_name.trim(),
                    branch_code.trim().toUpperCase(),
                    address || null,
                    contact_number || null,
                    email || null
                ]
            );

            res.status(201).json({
                message: "Branch created successfully",
                branch: result.rows[0]
            });

        } catch (error) {

            console.error("Create Branch Error:", error);

            if (error.code === "23505") {

                return res.status(409).json({
                    message:
                        "Branch code already exists"
                });

            }

            res.status(500).json({
                message: "Failed to create branch"
            });

        }

    }
);


// =====================================================
// UPDATE BRANCH
// SUPER ADMIN ONLY
// =====================================================

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const { id } = req.params;

            const {
                branch_name,
                branch_code,
                address,
                contact_number,
                email
            } = req.body;

            const result = await pool.query(
                `
                UPDATE branches

                SET
                    branch_name =
                        COALESCE($1, branch_name),

                    branch_code =
                        COALESCE($2, branch_code),

                    address =
                        COALESCE($3, address),

                    contact_number =
                        COALESCE($4, contact_number),

                    email =
                        COALESCE($5, email)

                WHERE id = $6

                RETURNING *
                `,
                [
                    branch_name || null,
                    branch_code
                        ? branch_code.trim().toUpperCase()
                        : null,
                    address || null,
                    contact_number || null,
                    email || null,
                    id
                ]
            );

            if (result.rows.length === 0) {

                return res.status(404).json({
                    message: "Branch not found"
                });

            }

            res.json({
                message: "Branch updated successfully",
                branch: result.rows[0]
            });

        } catch (error) {

            console.error("Update Branch Error:", error);

            if (error.code === "23505") {

                return res.status(409).json({
                    message:
                        "Branch code already exists"
                });

            }

            res.status(500).json({
                message: "Failed to update branch"
            });

        }

    }
);


// =====================================================
// ACTIVATE / DEACTIVATE BRANCH
// SUPER ADMIN ONLY
// =====================================================

router.patch(
    "/:id/status",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const { id } = req.params;
            const { status } = req.body;

            if (
                !["ACTIVE", "INACTIVE"].includes(status)
            ) {

                return res.status(400).json({
                    message:
                        "Status must be ACTIVE or INACTIVE"
                });

            }

            const result = await pool.query(
                `
                UPDATE branches
                SET status = $1
                WHERE id = $2
                RETURNING *
                `,
                [status, id]
            );

            if (result.rows.length === 0) {

                return res.status(404).json({
                    message: "Branch not found"
                });

            }

            res.json({
                message: "Branch status updated successfully",
                branch: result.rows[0]
            });

        } catch (error) {

            console.error(
                "Branch Status Error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to update branch status"
            });

        }

    }
);


// =====================================================
// DELETE BRANCH
// SUPER ADMIN ONLY
// =====================================================

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const { id } = req.params;

            const students = await pool.query(
                `
                SELECT COUNT(*)::int AS count
                FROM students
                WHERE branch_id = $1
                `,
                [id]
            );

            if (students.rows[0].count > 0) {

                return res.status(409).json({
                    message:
                        "Cannot delete branch because students are assigned to it"
                });

            }

            const result = await pool.query(
                `
                DELETE FROM branches
                WHERE id = $1
                RETURNING *
                `,
                [id]
            );

            if (result.rows.length === 0) {

                return res.status(404).json({
                    message: "Branch not found"
                });

            }

            res.json({
                message: "Branch deleted successfully",
                branch: result.rows[0]
            });

        } catch (error) {

            console.error(
                "Delete Branch Error:",
                error
            );

            res.status(500).json({
                message: "Failed to delete branch"
            });

        }

    }
);


module.exports = router;
