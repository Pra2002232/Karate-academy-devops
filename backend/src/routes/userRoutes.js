const express = require("express");
const bcrypt = require("bcrypt");

const pool = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();


// ============================================================
// GET USERS
// SUPER_ADMIN ONLY
// ============================================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const result = await pool.query(`
                SELECT
                    u.id,
                    u.username,
                    u.full_name,
                    u.mobile,
                    u.email,
                    u.role,
                    u.branch_id,
                    u.status,
                    u.created_at,
                    u.last_login,
                    b.branch_name,
                    b.branch_code

                FROM users u

                LEFT JOIN branches b
                    ON b.id = u.branch_id

                ORDER BY u.id DESC
            `);

            res.json({
                users: result.rows
            });

        } catch (error) {

            console.error(
                "Get users error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch users"
            });
        }
    }
);


// ============================================================
// CREATE USER
// ============================================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const {
                username,
                password,
                full_name,
                mobile,
                email,
                role,
                branch_id
            } = req.body;


            if (
                !username ||
                !password ||
                !full_name ||
                !role
            ) {

                return res.status(400).json({
                    message:
                        "username, password, full_name and role are required"
                });
            }


            if (
                ![
                    "BRANCH_ADMIN",
                    "PARENT"
                ].includes(role)
            ) {

                return res.status(400).json({
                    message:
                        "Invalid user role"
                });
            }


            if (
                role === "BRANCH_ADMIN" &&
                !branch_id
            ) {

                return res.status(400).json({
                    message:
                        "Branch Admin must have a branch"
                });
            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );


            const result =
                await pool.query(
                    `
                    INSERT INTO users
                    (
                        username,
                        password_hash,
                        full_name,
                        mobile,
                        email,
                        role,
                        branch_id,
                        status
                    )

                    VALUES
                    (
                        $1,$2,$3,$4,$5,$6,$7,'ACTIVE'
                    )

                    RETURNING
                        id,
                        username,
                        full_name,
                        role,
                        branch_id,
                        status
                    `,
                    [
                        username.trim(),
                        passwordHash,
                        full_name.trim(),
                        mobile || null,
                        email || null,
                        role,
                        branch_id || null
                    ]
                );


            res.status(201).json({
                message:
                    "User created successfully",
                user:
                    result.rows[0]
            });

        } catch (error) {

            console.error(
                "Create user error:",
                error
            );


            if (
                error.code === "23505"
            ) {

                return res.status(409).json({
                    message:
                        "Username already exists"
                });
            }


            res.status(500).json({
                message:
                    "Failed to create user"
            });
        }
    }
);


// ============================================================
// UPDATE USER
// ============================================================

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const { id } =
                req.params;

            const {
                full_name,
                mobile,
                email,
                role,
                branch_id,
                status
            } = req.body;


            if (
                role &&
                ![
                    "SUPER_ADMIN",
                    "BRANCH_ADMIN",
                    "PARENT"
                ].includes(role)
            ) {

                return res.status(400).json({
                    message:
                        "Invalid role"
                });
            }


            const result =
                await pool.query(
                    `
                    UPDATE users

                    SET
                        full_name =
                            COALESCE($1, full_name),

                        mobile =
                            COALESCE($2, mobile),

                        email =
                            COALESCE($3, email),

                        role =
                            COALESCE($4, role),

                        branch_id =
                            $5,

                        status =
                            COALESCE($6, status)

                    WHERE id = $7

                    RETURNING
                        id,
                        username,
                        full_name,
                        mobile,
                        email,
                        role,
                        branch_id,
                        status
                    `,
                    [
                        full_name || null,
                        mobile || null,
                        email || null,
                        role || null,
                        branch_id || null,
                        status || null,
                        id
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "User not found"
                });
            }


            res.json({
                message:
                    "User updated successfully",
                user:
                    result.rows[0]
            });

        } catch (error) {

            console.error(
                "Update user error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to update user"
            });
        }
    }
);


// ============================================================
// RESET PASSWORD
// SUPER_ADMIN ONLY
// ============================================================

router.post(
    "/:id/reset-password",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const { id } =
                req.params;

            const { password } =
                req.body;


            if (
                !password ||
                password.length < 6
            ) {

                return res.status(400).json({
                    message:
                        "Password must contain at least 6 characters"
                });
            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );


            const result =
                await pool.query(
                    `
                    UPDATE users

                    SET
                        password_hash = $1,
                        status = 'ACTIVE'

                    WHERE id = $2

                    RETURNING
                        id,
                        username,
                        full_name,
                        role
                    `,
                    [
                        passwordHash,
                        id
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "User not found"
                });
            }


            res.json({
                message:
                    "Password reset successfully",
                user:
                    result.rows[0]
            });

        } catch (error) {

            console.error(
                "Password reset error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to reset password"
            });
        }
    }
);


// ============================================================
// DELETE / DEACTIVATE USER
// ============================================================

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const { id } =
                req.params;


            if (
                Number(id) ===
                Number(req.user.id)
            ) {

                return res.status(400).json({
                    message:
                        "You cannot delete your own account"
                });
            }


            const result =
                await pool.query(
                    `
                    UPDATE users

                    SET status = 'INACTIVE'

                    WHERE id = $1

                    RETURNING
                        id,
                        username,
                        status
                    `,
                    [id]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "User not found"
                });
            }


            res.json({
                message:
                    "User deactivated successfully",
                user:
                    result.rows[0]
            });

        } catch (error) {

            console.error(
                "Deactivate user error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to deactivate user"
            });
        }
    }
);


// ============================================================
// BRANCH ACTIVITY
// ============================================================

router.get(
    "/branch-activity",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const result =
                await pool.query(`
                    SELECT

                        b.id,
                        b.branch_name,
                        b.branch_code,
                        b.status,

                        COUNT(
                            DISTINCT s.id
                        ) AS total_students,

                        COUNT(
                            DISTINCT
                            CASE
                                WHEN s.status =
                                'ACTIVE'
                                THEN s.id
                            END
                        ) AS active_students,

                        COUNT(
                            DISTINCT
                            CASE
                                WHEN u.role =
                                'BRANCH_ADMIN'
                                AND u.status =
                                'ACTIVE'
                                THEN u.id
                            END
                        ) AS branch_admins

                    FROM branches b

                    LEFT JOIN students s
                        ON s.branch_id = b.id

                    LEFT JOIN users u
                        ON u.branch_id = b.id

                    GROUP BY
                        b.id,
                        b.branch_name,
                        b.branch_code,
                        b.status

                    ORDER BY
                        b.branch_name
                `);


            res.json({
                branches:
                    result.rows
            });

        } catch (error) {

            console.error(
                "Branch activity error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch branch activity"
            });
        }
    }
);


module.exports = router;
