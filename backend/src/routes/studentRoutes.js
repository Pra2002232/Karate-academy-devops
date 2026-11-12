const express = require("express");
const pool = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// GET ALL STUDENTS
// =====================================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const requestedDate =
                req.query.date || null;

            // If no date is supplied, use today.
            const effectiveDate =
                requestedDate ||
                new Date().toISOString().slice(0, 10);

            // Validate YYYY-MM-DD
            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    effectiveDate
                )
            ) {
                return res.status(400).json({
                    message:
                        "Invalid date. Use YYYY-MM-DD"
                });
            }

            let result;

            if (
                req.user.role ===
                "SUPER_ADMIN"
            ) {

                result = await pool.query(
                    `
                    SELECT
                        s.*,
                        b.branch_name,
                        b.branch_code
                    FROM students s
                    LEFT JOIN branches b
                        ON b.id = s.branch_id
                    WHERE s.joining_date <= $1
                    ORDER BY s.name
                    `,
                    [
                        effectiveDate
                    ]
                );

            } else {

                result = await pool.query(
                    `
                    SELECT
                        s.*,
                        b.branch_name,
                        b.branch_code
                    FROM students s
                    LEFT JOIN branches b
                        ON b.id = s.branch_id
                    WHERE s.branch_id = $1
                      AND s.joining_date <= $2
                    ORDER BY s.name
                    `,
                    [
                        req.user.branch_id,
                        effectiveDate
                    ]
                );

            }

            res.json({

                total_students:
                    result.rows.length,

                date:
                    effectiveDate,

                students:
                    result.rows

            });

        } catch (error) {

            console.error(
                "Get Students Error:",
                error
            );

            res.status(500).json({
                message:
                    "Internal server error"
            });

        }

    }
);

// =====================================================
// GET STUDENT BY ID
// =====================================================

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                id
            } = req.params;


            let result;


            if (
                req.user.role ===
                "SUPER_ADMIN"
            ) {

                result = await pool.query(
                    `
                    SELECT
                        s.*,
                        b.branch_name,
                        b.branch_code
                    FROM students s
                    LEFT JOIN branches b
                        ON b.id = s.branch_id
                    WHERE s.id = $1
                    `,
                    [id]
                );

            } else {

                result = await pool.query(
                    `
                    SELECT
                        s.*,
                        b.branch_name,
                        b.branch_code
                    FROM students s
                    LEFT JOIN branches b
                        ON b.id = s.branch_id
                    WHERE s.id = $1
                    AND s.branch_id = $2
                    `,
                    [
                        id,
                        req.user.branch_id
                    ]
                );

            }


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Student not found"
                });

            }


            res.json({
                student:
                    result.rows[0]
            });

        } catch (error) {

            console.error(
                "Get Student Error:",
                error
            );

            res.status(500).json({
                message:
                    "Internal server error"
            });

        }

    }
);


// =====================================================
// CREATE STUDENT
// =====================================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                student_code,
                name,
                date_of_birth,
                gender,
                parent_name,
                parent_mobile,
                address,
                joining_date,
                belt,
                batch,
                batch_id,
                branch_id
            } = req.body;


            // ---------------------------------------------
            // BASIC VALIDATION
            // ---------------------------------------------

            if (!student_code) {

                return res.status(400).json({
                    message:
                        "student_code is required"
                });

            }

            if (!name) {

                return res.status(400).json({
                    message:
                        "name is required"
                });

            }

            if (!parent_name) {

                return res.status(400).json({
                    message:
                        "parent_name is required"
                });

            }

            if (!parent_mobile) {

                return res.status(400).json({
                    message:
                        "parent_mobile is required"
                });

            }


            // ---------------------------------------------
            // RESOLVE BRANCH
            // ---------------------------------------------

            let finalBranchId = null;


            // ---------------------------------------------
            // BRANCH ADMIN
            // ---------------------------------------------

            if (
                req.user.role ===
                "BRANCH_ADMIN"
            ) {

                finalBranchId =
                    req.user.branch_id ||
                    null;


                // Handle old JWT without branch_id
                if (!finalBranchId) {

                    const branchUser =
                        await pool.query(
                            `
                            SELECT branch_id
                            FROM users
                            WHERE id = $1
                            AND role = 'BRANCH_ADMIN'
                            AND status = 'ACTIVE'
                            `,
                            [req.user.id]
                        );


                    finalBranchId =
                        branchUser.rows[0]
                            ?.branch_id ||
                        null;

                }


                if (!finalBranchId) {

                    return res.status(400).json({
                        message:
                            "Branch Admin is not assigned to a branch"
                    });

                }

            }


            // ---------------------------------------------
            // SUPER ADMIN
            // ---------------------------------------------

            if (
                req.user.role ===
                "SUPER_ADMIN"
            ) {

                finalBranchId =
                    branch_id ||
                    null;


                // Existing Add Student form does not
                // send branch_id yet.
                // In that case use MAIN branch.

                if (!finalBranchId) {

                    const mainBranch =
                        await pool.query(
                            `
                            SELECT id
                            FROM branches
                            WHERE UPPER(branch_code)
                                  = 'MAIN'
                            AND status = 'ACTIVE'
                            ORDER BY id
                            LIMIT 1
                            `
                        );


                    finalBranchId =
                        mainBranch.rows[0]
                            ?.id ||
                        null;

                }


                if (!finalBranchId) {

                    return res.status(400).json({
                        message:
                            "No active MAIN branch is configured"
                    });

                }

            }


            // ---------------------------------------------
            // VERIFY BRANCH EXISTS
            // ---------------------------------------------

            const branchCheck =
                await pool.query(
                    `
                    SELECT
                        id,
                        branch_name,
                        branch_code
                    FROM branches
                    WHERE id = $1
                    AND status = 'ACTIVE'
                    `,
                    [finalBranchId]
                );


            if (
                branchCheck.rows.length === 0
            ) {

                return res.status(400).json({
                    message:
                        "Invalid or inactive branch"
                });

            }


            // ---------------------------------------------
            // ---------------------------------------------
            // VALIDATE DYNAMIC BATCH
            // ---------------------------------------------

            let finalBatchId = null;
            let finalBatchName = null;

            if (batch_id !== undefined && batch_id !== null && batch_id !== "") {
                const selectedBatchId = Number(batch_id);

                if (!Number.isInteger(selectedBatchId) || selectedBatchId <= 0) {
                    return res.status(400).json({
                        message: "Invalid batch selection"
                    });
                }

                const batchCheck = await pool.query(
                    `
                    SELECT id, batch_name
                    FROM batches
                    WHERE id = $1
                      AND is_active = TRUE
                      AND (branch_id IS NULL OR branch_id = $2)
                    `,
                    [selectedBatchId, finalBranchId]
                );

                if (batchCheck.rows.length === 0) {
                    return res.status(400).json({
                        message: "Selected batch is inactive or unavailable for this branch"
                    });
                }

                finalBatchId = batchCheck.rows[0].id;
                finalBatchName = batchCheck.rows[0].batch_name;

            } else if (batch && batch.trim()) {
                const legacyBatch = await pool.query(
                    `
                    SELECT id, batch_name
                    FROM batches
                    WHERE LOWER(batch_name) = LOWER($1)
                      AND is_active = TRUE
                      AND (branch_id IS NULL OR branch_id = $2)
                    ORDER BY (branch_id IS NULL) ASC, id ASC
                    LIMIT 1
                    `,
                    [batch.trim(), finalBranchId]
                );

                if (legacyBatch.rows.length === 0) {
                    return res.status(400).json({
                        message: "Selected batch is not available. Please select a valid batch."
                    });
                }

                finalBatchId = legacyBatch.rows[0].id;
                finalBatchName = legacyBatch.rows[0].batch_name;
            }

            // ---------------------------------------------
            // INSERT STUDENT
            // ---------------------------------------------

            const result = await pool.query(
                `
                INSERT INTO students
                (
                    student_code,
                    name,
                    date_of_birth,
                    gender,
                    parent_name,
                    parent_mobile,
                    address,
                    joining_date,
                    belt,
                    batch,
                    batch_id,
                    branch_id
                )
                VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
                `,
                [
                    student_code.trim(),
                    name.trim(),
                    date_of_birth || null,
                    gender || null,
                    parent_name.trim(),
                    parent_mobile.trim(),
                    address || null,
                    joining_date || null,
                    belt || "WHITE",
                    finalBatchName,
                    finalBatchId,
                    finalBranchId
                ]
            );

            res.status(201).json({

                message:
                    "Student created successfully",

                student:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "Create Student Error:",
                error
            );


            if (
                error.code ===
                "23505"
            ) {

                return res.status(409).json({
                    message:
                        "Student code already exists"
                });

            }


            if (
                error.code ===
                "23503"
            ) {

                return res.status(400).json({
                    message:
                        "Invalid branch assignment"
                });

            }


            if (
                error.code ===
                "42501"
            ) {

                return res.status(403).json({
                    message:
                        "You are not allowed to create a student in this branch"
                });

            }


            res.status(500).json({
                message:
                    "Internal server error"
            });

        }

    }
);


// =====================================================
// UPDATE STUDENT
// =====================================================

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN", "BRANCH_ADMIN"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: "Invalid student ID"
                });
            }

            const {
                name,
                date_of_birth,
                gender,
                parent_name,
                parent_mobile,
                address,
                belt,
                batch,
                status,
                batch_id
            } = req.body;

            // Fetch student within the caller's permitted scope.
            let studentResult;

            if (req.user.role === "SUPER_ADMIN") {
                studentResult = await pool.query(
                    `
                    SELECT id, branch_id, batch_id, batch
                    FROM students
                    WHERE id = $1
                    `,
                    [id]
                );
            } else {
                studentResult = await pool.query(
                    `
                    SELECT id, branch_id, batch_id, batch
                    FROM students
                    WHERE id = $1
                      AND branch_id = $2
                    `,
                    [id, req.user.branch_id]
                );
            }

            if (studentResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Student not found"
                });
            }

            const existingStudent = studentResult.rows[0];
            const studentBranchId = existingStudent.branch_id;

            let finalBatchId = existingStudent.batch_id;
            let finalBatchName = existingStudent.batch;

            // Only change batch assignment if the request includes it.
            if (Object.prototype.hasOwnProperty.call(req.body, "batch_id")) {

                if (batch_id === null || batch_id === "") {
                    finalBatchId = null;
                    finalBatchName = null;

                } else {
                    const selectedBatchId = Number(batch_id);

                    if (!Number.isInteger(selectedBatchId) || selectedBatchId <= 0) {
                        return res.status(400).json({
                            message: "Invalid batch selection"
                        });
                    }

                    const batchCheck = await pool.query(
                        `
                        SELECT id, batch_name
                        FROM batches
                        WHERE id = $1
                          AND is_active = TRUE
                          AND (branch_id IS NULL OR branch_id = $2)
                        `,
                        [selectedBatchId, studentBranchId]
                    );

                    if (batchCheck.rows.length === 0) {
                        return res.status(400).json({
                            message: "Selected batch is inactive or unavailable for this student's branch"
                        });
                    }

                    finalBatchId = batchCheck.rows[0].id;
                    finalBatchName = batchCheck.rows[0].batch_name;
                }

            } else if (Object.prototype.hasOwnProperty.call(req.body, "batch")) {

                if (batch === null || batch === "") {
                    finalBatchId = null;
                    finalBatchName = null;

                } else {
                    const legacyBatch = await pool.query(
                        `
                        SELECT id, batch_name
                        FROM batches
                        WHERE LOWER(batch_name) = LOWER($1)
                          AND is_active = TRUE
                          AND (branch_id IS NULL OR branch_id = $2)
                        ORDER BY (branch_id IS NULL) ASC, id ASC
                        LIMIT 1
                        `,
                        [String(batch).trim(), studentBranchId]
                    );

                    if (legacyBatch.rows.length === 0) {
                        return res.status(400).json({
                            message: "Selected batch is not available for this student's branch"
                        });
                    }

                    finalBatchId = legacyBatch.rows[0].id;
                    finalBatchName = legacyBatch.rows[0].batch_name;
                }
            }

            const values = [
                name || null,                  // $1
                date_of_birth || null,          // $2
                gender || null,                 // $3
                parent_name || null,            // $4
                parent_mobile || null,          // $5
                address || null,                // $6
                belt || null,                   // $7
                status || null,                 // $8
                finalBatchId,                   // $9
                finalBatchName,                 // $10
                id                              // $11
            ];

            let result;

            if (req.user.role === "SUPER_ADMIN") {
                result = await pool.query(
                    `
                    UPDATE students
                    SET
                        name = COALESCE($1, name),
                        date_of_birth = COALESCE($2, date_of_birth),
                        gender = COALESCE($3, gender),
                        parent_name = COALESCE($4, parent_name),
                        parent_mobile = COALESCE($5, parent_mobile),
                        address = COALESCE($6, address),
                        belt = COALESCE($7, belt),
                        status = COALESCE($8, status),
                        batch_id = $9,
                        batch = $10
                    WHERE id = $11
                    RETURNING *
                    `,
                    values
                );
            } else {
                result = await pool.query(
                    `
                    UPDATE students
                    SET
                        name = COALESCE($1, name),
                        date_of_birth = COALESCE($2, date_of_birth),
                        gender = COALESCE($3, gender),
                        parent_name = COALESCE($4, parent_name),
                        parent_mobile = COALESCE($5, parent_mobile),
                        address = COALESCE($6, address),
                        belt = COALESCE($7, belt),
                        status = COALESCE($8, status),
                        batch_id = $9,
                        batch = $10
                    WHERE id = $11
                      AND branch_id = $12
                    RETURNING *
                    `,
                    [...values, req.user.branch_id]
                );
            }

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Student not found"
                });
            }

            res.json({
                message: "Student updated successfully",
                student: result.rows[0]
            });

        } catch (error) {
            console.error("Update Student Error:", error);

            if (error.code === "23503") {
                return res.status(400).json({
                    message: "Invalid batch or student reference"
                });
            }

            if (error.code === "42501") {
                return res.status(403).json({
                    message: "You are not allowed to update this student"
                });
            }

            res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);


// DELETE STUDENT
// =====================================================

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            let result;


            if (
                req.user.role ===
                "SUPER_ADMIN"
            ) {

                result = await pool.query(
                    `
                    DELETE FROM students
                    WHERE id = $1
                    RETURNING id,
                              student_code,
                              name
                    `,
                    [id]
                );

            } else {

                result = await pool.query(
                    `
                    DELETE FROM students
                    WHERE id = $1
                    AND branch_id = $2

                    RETURNING id,
                              student_code,
                              name
                    `,
                    [
                        id,
                        req.user.branch_id
                    ]
                );

            }


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Student not found"
                });

            }


            res.json({

                message:
                    "Student deleted successfully",

                student:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "Delete Student Error:",
                error
            );

            res.status(500).json({
                message:
                    "Internal server error"
            });

        }

    }
);


module.exports = router;
