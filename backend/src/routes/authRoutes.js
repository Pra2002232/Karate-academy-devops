const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();


// =====================================================
// LOGIN
// =====================================================

router.post("/login", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;


        if (!username || !password) {

            return res.status(400).json({
                message:
                    "Username and password are required"
            });

        }


        const result = await pool.query(
            `
            SELECT
                u.id,
                u.username,
                u.password_hash,
                u.full_name,
                u.mobile,
                u.email,
                u.role,
                u.branch_id,
                u.status,

                b.branch_name,
                b.branch_code

            FROM users u

            LEFT JOIN branches b
                ON b.id = u.branch_id

            WHERE LOWER(u.username) =
                  LOWER($1)

            LIMIT 1
            `,
            [username.trim()]
        );


        if (result.rows.length === 0) {

            return res.status(401).json({
                message:
                    "Invalid username or password"
            });

        }


        const user =
            result.rows[0];


        if (user.status !== "ACTIVE") {

            return res.status(403).json({
                message:
                    "User account is inactive"
            });

        }


        const validPassword =
            await bcrypt.compare(
                password,
                user.password_hash
            );


        if (!validPassword) {

            return res.status(401).json({
                message:
                    "Invalid username or password"
            });

        }


        if (!process.env.JWT_SECRET) {

            return res.status(500).json({
                message:
                    "JWT_SECRET is not configured"
            });

        }


        const token =
            jwt.sign(
                {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    branch_id: user.branch_id || null,
                    branch_name:
                        user.branch_name || null,
                    branch_code:
                        user.branch_code || null
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "8h"
                }
            );


        await pool.query(
            `
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [user.id]
        );


        res.json({

            message:
                "Login successful",

            token,

            admin: {

                id:
                    user.id,

                username:
                    user.username,

                full_name:
                    user.full_name,

                mobile:
                    user.mobile,

                email:
                    user.email,

                role:
                    user.role,

                branch_id:
                    user.branch_id || null,

                branch_name:
                    user.branch_name || null,

                branch_code:
                    user.branch_code || null

            }

        });

    } catch (error) {

        console.error(
            "Login Error:",
            error
        );

        res.status(500).json({
            message:
                "Internal server error"
        });

    }

});


module.exports = router;
