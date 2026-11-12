const express = require("express");
const router = express.Router();

const pool = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

router.use(authenticateToken);

// =====================================================
// GET AVAILABLE BATCHES
// Super Admin: all batches
// Branch Admin: global + own branch batches
// =====================================================

router.get(
    "/",
    authorizeRoles("SUPER_ADMIN", "BRANCH_ADMIN"),
    async (req, res) => {
        try {
            const includeInactive =
                req.user.role === "SUPER_ADMIN" &&
                req.query.include_inactive === "true";

            let query = `
                SELECT
                    b.id,
                    b.batch_name,
                    b.branch_id,
                    br.branch_name,
                    b.days,
                    b.start_time,
                    b.end_time,
                    b.is_active,
                    b.is_legacy,
                    b.created_at,
                    b.updated_at
                FROM batches b
                LEFT JOIN branches br
                    ON br.id = b.branch_id
                WHERE TRUE
            `;

            const params = [];

            if (req.user.role === "BRANCH_ADMIN") {
                query += " AND (b.branch_id IS NULL OR b.branch_id = $1)";
                params.push(req.user.branch_id);
            }

            if (!includeInactive) {
                query += " AND b.is_active = TRUE";
            }

            query += `
                ORDER BY
                    b.batch_name ASC,
                    b.branch_id NULLS FIRST,
                    b.start_time ASC NULLS LAST,
                    b.id ASC
            `;

            const result = await pool.query(query, params);

            res.json({
                batches: result.rows
            });

        } catch (error) {
            console.error("Batch fetch error:", error);

            res.status(500).json({
                error: "Failed to fetch batches"
            });
        }
    }
);

// =====================================================
// CREATE BATCH – SUPER ADMIN ONLY
// branch_id = null means all branches
// =====================================================

router.post(
    "/",
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {
        try {
            const {
                batch_name,
                branch_id,
                days,
                start_time,
                end_time
            } = req.body;

            if (
                typeof batch_name !== "string" ||
                !batch_name.trim()
            ) {
                return res.status(400).json({
                    error: "Batch name is required"
                });
            }

            if (
                !Array.isArray(days) ||
                days.length === 0 ||
                days.some(day => !DAYS.includes(day)) ||
                new Set(days).size !== days.length
            ) {
                return res.status(400).json({
                    error: "Select valid training days"
                });
            }

            const hasStartTime = start_time !== undefined && start_time !== null && start_time !== "";
            const hasEndTime = end_time !== undefined && end_time !== null && end_time !== "";

            if (
                hasStartTime !== hasEndTime ||
                (hasStartTime && (
                    !/^\d{2}:\d{2}$/.test(start_time) ||
                    !/^\d{2}:\d{2}$/.test(end_time) ||
                    start_time >= end_time
                ))
            ) {
                return res.status(400).json({
                    error: "Provide both valid times, or leave both empty"
                });
            }

            let finalBranchId = null;

            if (
                branch_id !== null &&
                branch_id !== undefined &&
                branch_id !== ""
            ) {
                finalBranchId = Number(branch_id);

                if (
                    !Number.isInteger(finalBranchId) ||
                    finalBranchId <= 0
                ) {
                    return res.status(400).json({
                        error: "Invalid branch selection"
                    });
                }

                const branchCheck = await pool.query(
                    `
                    SELECT id
                    FROM branches
                    WHERE id = $1
                    AND status = 'ACTIVE'
                    `,
                    [finalBranchId]
                );

                if (branchCheck.rows.length === 0) {
                    return res.status(400).json({
                        error: "Selected branch is invalid or inactive"
                    });
                }
            }

            const result = await pool.query(
                `
                INSERT INTO batches (
                    batch_name,
                    branch_id,
                    days,
                    start_time,
                    end_time,
                    created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
                `,
                [
                    batch_name.trim(),
                    finalBranchId,
                    days,
                    hasStartTime ? start_time : null,
                    hasEndTime ? end_time : null,
                    req.user.id
                ]
            );

            res.status(201).json({
                message: "Batch created successfully",
                batch: result.rows[0]
            });

        } catch (error) {
            console.error("Batch creation error:", error);

            if (error.code === "23505") {
                return res.status(409).json({
                    error: "This batch with the same schedule already exists"
                });
            }

            res.status(500).json({
                error: "Failed to create batch"
            });
        }
    }
);

// =====================================================
// UPDATE BATCH – SUPER ADMIN ONLY
// =====================================================

router.put(
    "/:id",
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {
        try {
            const batchId = Number(req.params.id);

            const {
                batch_name,
                branch_id,
                days,
                start_time,
                end_time
            } = req.body;

            if (
                !Number.isInteger(batchId) ||
                batchId <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid batch ID"
                });
            }

            if (
                typeof batch_name !== "string" ||
                !batch_name.trim()
            ) {
                return res.status(400).json({
                    error: "Batch name is required"
                });
            }

            if (
                !Array.isArray(days) ||
                days.length === 0 ||
                days.some(day => !DAYS.includes(day)) ||
                new Set(days).size !== days.length
            ) {
                return res.status(400).json({
                    error: "Select valid training days"
                });
            }

            const hasStartTime = start_time !== undefined && start_time !== null && start_time !== "";
            const hasEndTime = end_time !== undefined && end_time !== null && end_time !== "";

            if (
                hasStartTime !== hasEndTime ||
                (hasStartTime && (
                    !/^\d{2}:\d{2}$/.test(start_time) ||
                    !/^\d{2}:\d{2}$/.test(end_time) ||
                    start_time >= end_time
                ))
            ) {
                return res.status(400).json({
                    error: "Provide both valid times, or leave both empty"
                });
            }

            let finalBranchId = null;

            if (
                branch_id !== null &&
                branch_id !== undefined &&
                branch_id !== ""
            ) {
                finalBranchId = Number(branch_id);

                if (
                    !Number.isInteger(finalBranchId) ||
                    finalBranchId <= 0
                ) {
                    return res.status(400).json({
                        error: "Invalid branch selection"
                    });
                }

                const branchCheck = await pool.query(
                    `
                    SELECT id
                    FROM branches
                    WHERE id = $1
                    AND status = 'ACTIVE'
                    `,
                    [finalBranchId]
                );

                if (branchCheck.rows.length === 0) {
                    return res.status(400).json({
                        error: "Selected branch is invalid or inactive"
                    });
                }
            }

            const assignedCheck = await pool.query(
                "SELECT branch_id FROM batches WHERE id = $1",
                [batchId]
            );

            if (assignedCheck.rows.length === 0) {
                return res.status(404).json({
                    error: "Batch not found"
                });
            }

            if (assignedCheck.rows[0].branch_id !== finalBranchId) {
                const studentCheck = await pool.query(
                    "SELECT 1 FROM students WHERE batch_id = $1 LIMIT 1",
                    [batchId]
                );

                if (studentCheck.rows.length > 0) {
                    return res.status(409).json({
                        error: "Cannot change the branch of a batch assigned to students"
                    });
                }
            }

            const result = await pool.query(
                `
                UPDATE batches
                SET
                    batch_name = $1,
                    branch_id = $2,
                    days = $3,
                    start_time = $4,
                    end_time = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *
                `,
                [
                    batch_name.trim(),
                    finalBranchId,
                    days,
                    hasStartTime ? start_time : null,
                    hasEndTime ? end_time : null,
                    batchId
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Batch not found"
                });
            }

            res.json({
                message: "Batch updated successfully",
                batch: result.rows[0]
            });

        } catch (error) {
            console.error("Batch update error:", error);

            if (error.code === "23505") {
                return res.status(409).json({
                    error: "This batch with the same schedule already exists"
                });
            }

            res.status(500).json({
                error: "Failed to update batch"
            });
        }
    }
);

// =====================================================
// ACTIVATE / DEACTIVATE BATCH
// =====================================================

router.patch(
    "/:id/status",
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {
        try {
            const batchId = Number(req.params.id);
            const { is_active } = req.body;

            if (
                !Number.isInteger(batchId) ||
                batchId <= 0 ||
                typeof is_active !== "boolean"
            ) {
                return res.status(400).json({
                    error: "Valid batch ID and status are required"
                });
            }

            const result = await pool.query(
                `
                UPDATE batches
                SET
                    is_active = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
                `,
                [is_active, batchId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Batch not found"
                });
            }

            res.json({
                message: is_active
                    ? "Batch activated successfully"
                    : "Batch deactivated successfully",
                batch: result.rows[0]
            });

        } catch (error) {
            console.error("Batch status error:", error);

            res.status(500).json({
                error: "Failed to update batch status"
            });
        }
    }
);

// =====================================================
// DELETE BATCH – ONLY IF NOT ASSIGNED TO STUDENTS
// =====================================================

router.delete(
    "/:id",
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {
        try {
            const batchId = Number(req.params.id);

            if (
                !Number.isInteger(batchId) ||
                batchId <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid batch ID"
                });
            }

            const result = await pool.query(
                `
                DELETE FROM batches
                WHERE id = $1
                RETURNING id
                `,
                [batchId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Batch not found"
                });
            }

            res.json({
                message: "Batch deleted successfully"
            });

        } catch (error) {
            console.error("Batch deletion error:", error);

            if (error.code === "23503") {
                return res.status(409).json({
                    error: "This batch is assigned to students. Deactivate it instead of deleting it."
                });
            }

            res.status(500).json({
                error: "Failed to delete batch"
            });
        }
    }
);

module.exports = router;
