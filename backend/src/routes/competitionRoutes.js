const express = require("express");

const router = express.Router();

const pool = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(authenticateToken);


/*
|--------------------------------------------------------------------------
| GET ALL COMPETITIONS
|--------------------------------------------------------------------------
|
| SUPER_ADMIN:
|   All branches
|
| BRANCH_ADMIN:
|   Own branch
|
| PARENT:
|   View only
|
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                c.id,
                c.competition_name,
                c.competition_date,
                c.location,
                c.organizer,
                c.description,
                c.created_at,

                c.branch_id,

                b.branch_name,
                b.branch_code,

                COUNT(cp.id)::int
                    AS registered_students

            FROM competitions c

            LEFT JOIN branches b
                ON b.id = c.branch_id

            LEFT JOIN competition_participants cp
                ON cp.competition_id = c.id
               AND cp.registration_status != 'CANCELLED'

            GROUP BY
                c.id,
                b.branch_name,
                b.branch_code

            ORDER BY
                c.competition_date ASC,
                c.id DESC
        `);

        res.json({
            competitions:
                result.rows
        });

    } catch (error) {

        console.error(
            "Get competitions error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch competitions"
        });

    }

});


/*
|--------------------------------------------------------------------------
| GET COMPETITION DASHBOARD SUMMARY
|--------------------------------------------------------------------------
*/

router.get("/dashboard", async (req, res) => {

    try {

        const result =
            await pool.query(`
                SELECT

                    COUNT(*) FILTER (
                        WHERE competition_date >= CURRENT_DATE
                    )::int
                    AS upcoming_competitions,

                    COUNT(*) FILTER (
                        WHERE competition_date < CURRENT_DATE
                    )::int
                    AS completed_competitions

                FROM competitions
            `);

        const registrations =
            await pool.query(`
                SELECT
                    COUNT(*)::int
                    AS total_registrations

                FROM competition_participants

                WHERE registration_status != 'CANCELLED'
            `);

        res.json({

            upcoming_competitions:
                result.rows[0]
                    .upcoming_competitions,

            completed_competitions:
                result.rows[0]
                    .completed_competitions,

            total_registrations:
                registrations.rows[0]
                    .total_registrations

        });

    } catch (error) {

        console.error(
            "Competition dashboard error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to load competition dashboard"
        });

    }

});


/*
|--------------------------------------------------------------------------
| GET ACTIVE BRANCHES FOR SUPER ADMIN
|--------------------------------------------------------------------------
*/

router.get(
    "/branches",
    authorizeRoles("SUPER_ADMIN"),
    async (req, res) => {

        try {

            const result =
                await pool.query(`
                    SELECT
                        id,
                        branch_name,
                        branch_code
                    FROM branches
                    WHERE status = 'ACTIVE'
                    ORDER BY branch_name
                `);

            res.json({
                branches:
                    result.rows
            });

        } catch (error) {

            console.error(
                "Competition branches error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load branches"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| GET ALL COMPETITION RESULTS
|--------------------------------------------------------------------------
*/

router.get("/results", async (req, res) => {

    try {

        const result =
            await pool.query(`
                SELECT

                    cr.id,
                    cr.competition_id,
                    cr.student_id,

                    c.competition_name,
                    c.competition_date,
                    c.location,

                    c.branch_id,
                    b.branch_name,
                    b.branch_code,

                    s.student_code,
                    s.name,
                    s.belt,

                    cr.category,
                    cr.event,
                    cr.result,
                    cr.medal,
                    cr.position,
                    cr.remarks

                FROM competition_results cr

                JOIN competitions c
                    ON c.id =
                       cr.competition_id

                LEFT JOIN branches b
                    ON b.id =
                       c.branch_id

                JOIN students s
                    ON s.id =
                       cr.student_id

                ORDER BY
                    c.competition_date DESC,
                    cr.position NULLS LAST,
                    s.name ASC
            `);

        res.json({
            results:
                result.rows
        });

    } catch (error) {

        console.error(
            "Get competition results error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch competition results"
        });

    }

});


/*
|--------------------------------------------------------------------------
| GET SINGLE COMPETITION
|--------------------------------------------------------------------------
*/

router.get("/:id", async (req, res) => {

    try {

        const {
            id
        } = req.params;

        const competition =
            await pool.query(
                `
                SELECT

                    c.id,
                    c.competition_name,
                    c.competition_date,
                    c.location,
                    c.organizer,
                    c.description,
                    c.created_at,

                    c.branch_id,

                    b.branch_name,
                    b.branch_code

                FROM competitions c

                LEFT JOIN branches b
                    ON b.id = c.branch_id

                WHERE c.id = $1
                `,
                [id]
            );

        if (
            competition.rows.length === 0
        ) {

            return res.status(404).json({
                message:
                    "Competition not found"
            });

        }

        const participants =
            await pool.query(
                `
                SELECT

                    cp.id,
                    cp.student_id,

                    s.student_code,
                    s.name,
                    s.belt,

                    cp.category,
                    cp.event,
                    cp.registration_status,
                    cp.fee_status,
                    cp.registered_at,
                    cp.remarks

                FROM competition_participants cp

                JOIN students s
                    ON cp.student_id = s.id

                WHERE
                    cp.competition_id = $1

                ORDER BY
                    s.name ASC
                `,
                [id]
            );

        const results =
            await pool.query(
                `
                SELECT

                    cr.id,
                    cr.student_id,

                    s.student_code,
                    s.name,

                    cr.category,
                    cr.event,
                    cr.result,
                    cr.medal,
                    cr.position,
                    cr.remarks

                FROM competition_results cr

                JOIN students s
                    ON s.id = cr.student_id

                WHERE
                    cr.competition_id = $1

                ORDER BY
                    cr.position NULLS LAST,
                    s.name ASC
                `,
                [id]
            );

        res.json({

            competition:
                competition.rows[0],

            participants:
                participants.rows,

            results:
                results.rows

        });

    } catch (error) {

        console.error(
            "Get competition error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch competition"
        });

    }

});


/*
|--------------------------------------------------------------------------
| CREATE COMPETITION
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                competition_name,
                competition_date,
                location,
                organizer,
                description
            } = req.body;

            if (
                !competition_name ||
                !competition_date
            ) {

                return res.status(400).json({
                    message:
                        "Competition name and date are required"
                });

            }

            /*
             * SUPER_ADMIN
             * -----------
             * Competition is academy-wide.
             * branch_id = NULL.
             *
             * BRANCH_ADMIN
             * ------------
             * Automatically use the branch assigned
             * to the logged-in admin.
             *
             * No branch selector is required in the UI.
             */

            let branchId = null;

            if (
                req.user.role ===
                "BRANCH_ADMIN"
            ) {

                /*
                 * Resolve branch from the database as well.
                 * This prevents an old/stale JWT branch_id
                 * from breaking competition creation.
                 */

                const userResult =
                    await pool.query(
                        `
                        SELECT
                            branch_id
                        FROM users
                        WHERE id = $1
                          AND role = 'BRANCH_ADMIN'
                          AND status = 'ACTIVE'
                        `,
                        [req.user.id]
                    );

                branchId =
                    userResult.rows[0]?.branch_id ||
                    null;

                if (!branchId) {

                    return res.status(400).json({
                        message:
                            "Branch Admin is not assigned to a branch"
                    });

                }

            }

            /*
             * Super Admin intentionally leaves
             * branchId as NULL.
             */

            const result =
                await pool.query(
                    `
                    INSERT INTO competitions
                    (
                        competition_name,
                        competition_date,
                        location,
                        organizer,
                        description,
                        branch_id
                    )

                    VALUES
                    ($1,$2,$3,$4,$5,$6)

                    RETURNING *
                    `,
                    [
                        competition_name.trim(),
                        competition_date,
                        location || null,
                        organizer || null,
                        description || null,
                        branchId
                    ]
                );

            res.status(201).json({

                message:
                    "Competition created successfully",

                competition:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "Create competition error:",
                error
            );

            res.status(500).json({

                message:
                    error.message ||
                    "Failed to create competition"

            });

        }

    }
);



router.put(
    "/:id",
    authorizeRoles("SUPER_ADMIN", "BRANCH_ADMIN"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const {
                competition_name,
                competition_date,
                location,
                organizer,
                description,
                branch_id
            } = req.body;

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: "Invalid competition ID"
                });
            }

            if (!competition_name?.trim() || !competition_date) {
                return res.status(400).json({
                    message: "Competition name and date are required"
                });
            }

            const current = await pool.query(
                `SELECT id, branch_id
                 FROM competitions
                 WHERE id = $1`,
                [id]
            );

            if (current.rows.length === 0) {
                return res.status(404).json({
                    message: "Competition not found"
                });
            }

            const currentBranchId = current.rows[0].branch_id;
            let finalBranchId = currentBranchId;

            if (req.user.role === "BRANCH_ADMIN") {
                // Resolve current assignment from the database rather
                // than relying on a potentially stale JWT branch_id.
                const assigned = await pool.query(
                    `SELECT u.branch_id
                     FROM users u
                     JOIN branches b
                       ON b.id = u.branch_id
                      AND b.status = 'ACTIVE'
                     WHERE u.id = $1
                       AND u.role = 'BRANCH_ADMIN'
                       AND u.status = 'ACTIVE'`,
                    [req.user.id]
                );

                const ownBranchId = assigned.rows[0]?.branch_id;

                if (!ownBranchId) {
                    return res.status(400).json({
                        message: "Branch Admin has no active branch assignment"
                    });
                }

                if (
                    currentBranchId == null ||
                    Number(currentBranchId) !== Number(ownBranchId)
                ) {
                    return res.status(403).json({
                        message: "You can only edit competitions belonging to your branch"
                    });
                }

                finalBranchId = Number(ownBranchId);
            } else if (
                req.user.role === "SUPER_ADMIN" &&
                Object.prototype.hasOwnProperty.call(req.body, "branch_id")
            ) {
                // A supplied blank/null branch explicitly means academy-wide.
                if (branch_id === null || branch_id === "") {
                    finalBranchId = null;
                } else {
                    const targetBranchId = Number(branch_id);

                    if (
                        !Number.isSafeInteger(targetBranchId) ||
                        targetBranchId <= 0
                    ) {
                        return res.status(400).json({
                            message: "Selected branch is invalid or inactive"
                        });
                    }

                    const activeBranch = await pool.query(
                        `SELECT id
                         FROM branches
                         WHERE id = $1
                           AND status = 'ACTIVE'`,
                        [targetBranchId]
                    );

                    if (activeBranch.rows.length === 0) {
                        return res.status(400).json({
                            message: "Selected branch is invalid or inactive"
                        });
                    }

                    finalBranchId = targetBranchId;
                }
            }
            // If branch_id was omitted, preserve the current branch_id.
            // In particular, a NULL branch remains valid for Super Admin.

            const updated = await pool.query(
                `UPDATE competitions
                 SET competition_name = $1,
                     competition_date = $2,
                     location = $3,
                     organizer = $4,
                     description = $5,
                     branch_id = $6
                 WHERE id = $7
                 RETURNING *`,
                [
                    competition_name.trim(),
                    competition_date,
                    location || null,
                    organizer || null,
                    description || null,
                    finalBranchId,
                    id
                ]
            );

            res.json({
                message: "Competition updated successfully",
                competition: updated.rows[0]
            });
        } catch (error) {
            console.error("Update competition error:", error);
            res.status(500).json({
                message: error.message || "Failed to update competition"
            });
        }
    }
);


router.delete(
    "/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const current =
                await pool.query(
                    `
                    SELECT
                        id,
                        branch_id

                    FROM competitions

                    WHERE id = $1
                    `,
                    [id]
                );

            if (
                current.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Competition not found"
                });

            }

            if (
                req.user.role ===
                "BRANCH_ADMIN" &&
                Number(
                    current.rows[0].branch_id
                ) !==
                Number(
                    req.user.branch_id
                )
            ) {

                return res.status(403).json({
                    message:
                        "You can only delete competitions belonging to your branch"
                });

            }

            await pool.query(
                `
                DELETE FROM competitions
                WHERE id = $1
                `,
                [id]
            );

            res.json({
                message:
                    "Competition deleted successfully"
            });

        } catch (error) {

            console.error(
                "Delete competition error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to delete competition"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| REGISTER STUDENT
|--------------------------------------------------------------------------
*/

router.post(
    "/:competitionId/register",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                competitionId
            } = req.params;

            const {
                student_id,
                category,
                event,
                remarks
            } = req.body;

            if (!student_id) {

                return res.status(400).json({
                    message:
                        "Student is required"
                });

            }

            const competition =
                await pool.query(
                    `
                    SELECT
                        id,
                        branch_id

                    FROM competitions

                    WHERE id = $1
                    `,
                    [competitionId]
                );

            if (
                competition.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Competition not found"
                });

            }

            if (
                req.user.role ===
                "BRANCH_ADMIN" &&
                Number(
                    competition.rows[0].branch_id
                ) !==
                Number(
                    req.user.branch_id
                )
            ) {

                return res.status(403).json({
                    message:
                        "Competition does not belong to your branch"
                });

            }

            const student =
                await pool.query(
                    `
                    SELECT
                        id,
                        name,
                        branch_id

                    FROM students

                    WHERE id = $1
                      AND status = 'ACTIVE'
                    `,
                    [student_id]
                );

            if (
                student.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Active student not found"
                });

            }

            const result =
                await pool.query(
                    `
                    INSERT INTO competition_participants
                    (
                        competition_id,
                        student_id,
                        category,
                        event,
                        registration_status,
                        fee_status,
                        remarks
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        'REGISTERED',
                        'PENDING',
                        $5
                    )

                    RETURNING *
                    `,
                    [
                        competitionId,
                        student_id,
                        category || null,
                        event || null,
                        remarks || null
                    ]
                );

            res.status(201).json({

                message:
                    "Student registered successfully",

                participant:
                    result.rows[0]

            });

        } catch (error) {

            if (
                error.code === "23505"
            ) {

                return res.status(409).json({
                    message:
                        "Student is already registered for this competition and event"
                });

            }

            console.error(
                "Register student error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to register student"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| UPDATE REGISTRATION
|--------------------------------------------------------------------------
*/


router.put(
    "/registration/:id/fee",
    authorizeRoles("SUPER_ADMIN", "BRANCH_ADMIN"),
    async (req, res) => {
        try {
            const registrationId = Number(req.params.id);

            if (!Number.isSafeInteger(registrationId) || registrationId <= 0) {
                return res.status(400).json({
                    message: "Invalid registration ID"
                });
            }

            const current = await pool.query(
                `SELECT
                    cp.id,
                    cp.student_id,
                    cp.competition_id,
                    s.branch_id AS student_branch_id,
                    c.branch_id AS competition_branch_id
                 FROM public.competition_participants cp
                 JOIN public.students s
                   ON s.id = cp.student_id
                 JOIN public.competitions c
                   ON c.id = cp.competition_id
                 WHERE cp.id = $1`,
                [registrationId]
            );

            if (!current.rows.length) {
                return res.status(404).json({
                    message: "Registration not found"
                });
            }

            if (req.user.role === "BRANCH_ADMIN") {
                const assignment = await pool.query(
                    `SELECT u.branch_id
                     FROM public.users u
                     JOIN public.branches b
                       ON b.id = u.branch_id
                      AND b.status = 'ACTIVE'
                     WHERE u.id = $1
                       AND u.role = 'BRANCH_ADMIN'
                       AND u.status = 'ACTIVE'`,
                    [req.user.id]
                );

                const ownBranchId = assignment.rows[0]?.branch_id;
                const registration = current.rows[0];

                if (!ownBranchId) {
                    return res.status(403).json({
                        message: "Branch Admin does not have an active branch assignment"
                    });
                }

                // Branch Admin can mark fees for their own branch's students,
                // including those registered in academy-wide competitions.
                if (
                    Number(registration.student_branch_id) !== Number(ownBranchId) ||
                    (
                        registration.competition_branch_id != null &&
                        Number(registration.competition_branch_id) !== Number(ownBranchId)
                    )
                ) {
                    return res.status(403).json({
                        message: "You can update fees only for your own branch"
                    });
                }
            }

            const updated = await pool.query(
                `UPDATE public.competition_participants
                 SET fee_status = 'PAID'
                 WHERE id = $1
                 RETURNING id, competition_id, student_id, fee_status`,
                [registrationId]
            );

            if (!updated.rows.length) {
                return res.status(404).json({
                    message: "Registration not found"
                });
            }

            res.json({
                message: "Competition fee marked as completed",
                registration: updated.rows[0]
            });
        } catch (error) {
            console.error("Mark competition fee completed error:", error);
            res.status(500).json({
                message: "Unable to update competition fee"
            });
        }
    }
);

router.put(
    "/registration/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const {
                category,
                event,
                registration_status,
                fee_status,
                remarks
            } = req.body;

            const result =
                await pool.query(
                    `
                    UPDATE competition_participants

                    SET
                        category = $1,
                        event = $2,
                        registration_status = $3,
                        fee_status = $4,
                        remarks = $5

                    WHERE id = $6

                    RETURNING *
                    `,
                    [
                        category || null,
                        event || null,
                        registration_status,
                        fee_status,
                        remarks || null,
                        id
                    ]
                );

            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Registration not found"
                });

            }

            res.json({

                message:
                    "Registration updated successfully",

                participant:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "Update registration error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to update registration"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| GET RESULTS FOR ONE COMPETITION
|--------------------------------------------------------------------------
*/

router.get(
    "/:competitionId/results",
    async (req, res) => {

        try {

            const {
                competitionId
            } = req.params;

            const result =
                await pool.query(
                    `
                    SELECT

                        cr.id,
                        cr.student_id,

                        s.student_code,
                        s.name,

                        cr.category,
                        cr.event,
                        cr.result,
                        cr.medal,
                        cr.position,
                        cr.remarks

                    FROM competition_results cr

                    JOIN students s
                        ON s.id =
                           cr.student_id

                    WHERE
                        cr.competition_id =
                        $1

                    ORDER BY
                        cr.position NULLS LAST,
                        s.name ASC
                    `,
                    [competitionId]
                );

            res.json({
                results:
                    result.rows
            });

        } catch (error) {

            console.error(
                "Competition result fetch error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch competition results"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| CREATE COMPETITION RESULT
|--------------------------------------------------------------------------
*/

router.post(
    "/results",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                competition_id,
                student_id,
                category,
                event,
                result,
                medal,
                position,
                remarks
            } = req.body;

            if (
                !competition_id ||
                !student_id ||
                !result
            ) {

                return res.status(400).json({
                    message:
                        "competition_id, student_id and result are required"
                });

            }

            const competition =
                await pool.query(
                    `
                    SELECT
                        id,
                        branch_id

                    FROM competitions

                    WHERE id = $1
                    `,
                    [competition_id]
                );

            if (
                competition.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Competition not found"
                });

            }

            if (
                req.user.role ===
                "BRANCH_ADMIN" &&
                Number(
                    competition.rows[0].branch_id
                ) !==
                Number(
                    req.user.branch_id
                )
            ) {

                return res.status(403).json({
                    message:
                        "Competition does not belong to your branch"
                });

            }

            const inserted =
                await pool.query(
                    `
                    INSERT INTO competition_results
                    (
                        competition_id,
                        student_id,
                        category,
                        event,
                        result,
                        medal,
                        position,
                        remarks
                    )

                    VALUES
                    (
                        $1,$2,$3,$4,
                        $5,$6,$7,$8
                    )

                    RETURNING *
                    `,
                    [
                        competition_id,
                        student_id,
                        category || null,
                        event || null,
                        result,
                        medal || null,
                        position || null,
                        remarks || null
                    ]
                );

            res.status(201).json({

                message:
                    "Competition result saved successfully",

                result:
                    inserted.rows[0]

            });

        } catch (error) {

            console.error(
                "Create competition result error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to save competition result"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| UPDATE COMPETITION RESULT
|--------------------------------------------------------------------------
*/

router.put(
    "/results/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "BRANCH_ADMIN"
    ),
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const {
                category,
                event,
                result,
                medal,
                position,
                remarks
            } = req.body;

            const ownership =
                await pool.query(
                    `
                    SELECT
                        cr.id,
                        c.branch_id

                    FROM competition_results cr

                    JOIN competitions c
                        ON c.id =
                           cr.competition_id

                    WHERE cr.id = $1
                    `,
                    [id]
                );

            if (
                ownership.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Competition result not found"
                });

            }

            if (
                req.user.role ===
                "BRANCH_ADMIN" &&
                Number(
                    ownership.rows[0].branch_id
                ) !==
                Number(
                    req.user.branch_id
                )
            ) {

                return res.status(403).json({
                    message:
                        "You can only update results for your branch"
                });

            }

            const updated =
                await pool.query(
                    `
                    UPDATE competition_results

                    SET
                        category = $1,
                        event = $2,
                        result = $3,
                        medal = $4,
                        position = $5,
                        remarks = $6

                    WHERE id = $7

                    RETURNING *
                    `,
                    [
                        category || null,
                        event || null,
                        result || null,
                        medal || null,
                        position || null,
                        remarks || null,
                        id
                    ]
                );

            res.json({

                message:
                    "Competition result updated successfully",

                result:
                    updated.rows[0]

            });

        } catch (error) {

            console.error(
                "Update competition result error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to update competition result"
            });

        }

    }
);


module.exports = router;
