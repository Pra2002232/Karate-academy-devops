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



/*
|--------------------------------------------------------------------------
| PARENT COMPETITIONS - READ ONLY
|--------------------------------------------------------------------------
*/

router.get(
    "/competitions",
    authenticateToken,
    authorizeRoles("PARENT"),
    async (req, res) => {

        try {

            const upcoming =
                await pool.query(`
                    SELECT
                        c.id,
                        c.competition_name,
                        c.competition_date,
                        c.location,
                        c.organizer,
                        c.description,
                        c.branch_id,

                        b.branch_name,
                        b.branch_code

                    FROM competitions c

                    LEFT JOIN branches b
                        ON b.id = c.branch_id

                    WHERE
                        c.competition_date >=
                        CURRENT_DATE

                    ORDER BY
                        c.competition_date ASC,
                        c.id DESC
                `);

            const results =
                await pool.query(
                    `
                    SELECT

                        cr.id,
                        cr.competition_id,

                        c.competition_name,
                        c.competition_date,
                        c.location,

                        c.branch_id,
                        b.branch_name,
                        b.branch_code,

                        cr.student_id,
                        s.student_code,
                        s.name AS student_name,

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

                    JOIN parent_students ps
                        ON ps.student_id =
                           s.id

                    WHERE
                        ps.parent_user_id =
                        $1

                    ORDER BY
                        c.competition_date DESC,
                        cr.position NULLS LAST,
                        s.name ASC
                    `,
                    [req.user.id]
                );

            res.json({

                upcoming:
                    upcoming.rows,

                results:
                    results.rows

            });

        } catch (error) {

            console.error(
                "Parent competition feed error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load parent competitions"
            });

        }

    }
);




/*
|--------------------------------------------------------------------------
| PARENT COMPETITION FEED
|--------------------------------------------------------------------------
| Parents can see upcoming competitions across the academy.
| Registration information is limited to their own children.
*/

router.get(
    "/competitions",
    authorizeRoles("PARENT"),
    async (req, res) => {

        try {

            const childrenResult =
                await pool.query(
                    `
                    SELECT
                        s.id,
                        s.name,
                        s.student_code
                    FROM parent_students ps
                    JOIN students s
                        ON s.id = ps.student_id
                    WHERE ps.parent_user_id = $1
                      AND s.status = 'ACTIVE'
                    ORDER BY s.name
                    `,
                    [req.user.id]
                );

            const competitionResult =
                await pool.query(
                    `
                    SELECT
                        c.id,
                        c.competition_name,
                        c.competition_date,
                        c.location,
                        c.organizer,
                        c.description,
                        c.branch_id,
                        b.branch_name,
                        b.branch_code,
                        COUNT(cp.id)
                            FILTER (
                                WHERE cp.registration_status
                                    != 'CANCELLED'
                            )::int AS registered_students
                    FROM competitions c
                    LEFT JOIN branches b
                        ON b.id = c.branch_id
                    LEFT JOIN competition_participants cp
                        ON cp.competition_id = c.id
                    WHERE c.competition_date >= CURRENT_DATE
                    GROUP BY
                        c.id,
                        b.branch_name,
                        b.branch_code
                    ORDER BY
                        c.competition_date ASC,
                        c.id ASC
                    `
                );

            const competitions =
                competitionResult.rows.map(
                    competition => ({
                        ...competition,
                        children:
                            childrenResult.rows.map(
                                child => ({
                                    ...child,
                                    registration_status:
                                        null
                                })
                            )
                    })
                );

            /*
             * Load this parent's registrations separately.
             */
            const registrationResult =
                await pool.query(
                    `
                    SELECT
                        cp.competition_id,
                        cp.student_id,
                        cp.registration_status,
                        cp.category,
                        cp.event,
                        cp.registered_at
                    FROM competition_participants cp
                    JOIN parent_students ps
                        ON ps.student_id =
                           cp.student_id
                    WHERE ps.parent_user_id = $1
                    `,
                    [req.user.id]
                );

            const registrationMap =
                new Map();

            for (
                const registration
                of registrationResult.rows
            ) {

                registrationMap.set(
                    `${registration.competition_id}:${registration.student_id}`,
                    registration
                );

            }

            for (
                const competition
                of competitions
            ) {

                competition.children =
                    competition.children.map(
                        child => {

                            const registration =
                                registrationMap.get(
                                    `${competition.id}:${child.id}`
                                );

                            return {
                                ...child,
                                registration_status:
                                    registration
                                        ?.registration_status ||
                                    null,
                                registration_id:
                                    registration?.id ||
                                    null,
                                category:
                                    registration?.category ||
                                    null,
                                event:
                                    registration?.event ||
                                    null,
                                registered_at:
                                    registration?.registered_at ||
                                    null
                            };

                        }
                    );

            }

            res.json({
                competitions,
                children:
                    childrenResult.rows
            });

        } catch (error) {

            console.error(
                "Parent competition feed error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load upcoming competitions"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| PARENT COMPETITION DETAILS
|--------------------------------------------------------------------------
*/

router.get(
    "/competitions/:competitionId",
    authorizeRoles("PARENT"),
    async (req, res) => {

        try {

            const {
                competitionId
            } = req.params;

            const competitionResult =
                await pool.query(
                    `
                    SELECT
                        c.id,
                        c.competition_name,
                        c.competition_date,
                        c.location,
                        c.organizer,
                        c.description,
                        c.branch_id,
                        b.branch_name,
                        b.branch_code
                    FROM competitions c
                    LEFT JOIN branches b
                        ON b.id = c.branch_id
                    WHERE c.id = $1
                      AND c.competition_date >= CURRENT_DATE
                    `,
                    [competitionId]
                );

            if (
                competitionResult.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Upcoming competition not found"
                });

            }

            const childrenResult =
                await pool.query(
                    `
                    SELECT
                        s.id,
                        s.name,
                        s.student_code
                    FROM parent_students ps
                    JOIN students s
                        ON s.id = ps.student_id
                    WHERE ps.parent_user_id = $1
                      AND s.status = 'ACTIVE'
                    ORDER BY s.name
                    `,
                    [req.user.id]
                );

            const participantResult =
                await pool.query(
                    `
                    SELECT
                        cp.id,
                        cp.student_id,
                        cp.category,
                        cp.event,
                        cp.registration_status,
                        cp.fee_status,
                        cp.registered_at,
                        cp.remarks,
                        s.name AS student_name
                    FROM competition_participants cp
                    JOIN parent_students ps
                        ON ps.student_id =
                           cp.student_id
                    JOIN students s
                        ON s.id = cp.student_id
                    WHERE cp.competition_id = $1
                      AND ps.parent_user_id = $2
                    ORDER BY s.name
                    `,
                    [
                        competitionId,
                        req.user.id
                    ]
                );

            res.json({

                competition:
                    competitionResult.rows[0],

                children:
                    childrenResult.rows,

                registrations:
                    participantResult.rows

            });

        } catch (error) {

            console.error(
                "Parent competition details error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load competition details"
            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| PARENT REGISTER OWN STUDENT
|--------------------------------------------------------------------------
*/

router.post(
    "/competitions/:competitionId/register",
    authorizeRoles("PARENT"),
    async (req, res) => {

        try {

            const {
                competitionId
            } = req.params;

            const {
                student_id
            } = req.body;

            if (!student_id) {

                return res.status(400).json({
                    message:
                        "Please select a student"
                });

            }

            /*
             * Verify the competition is upcoming.
             */

            const competitionResult =
                await pool.query(
                    `
                    SELECT id
                    FROM competitions
                    WHERE id = $1
                      AND competition_date >= CURRENT_DATE
                    `,
                    [competitionId]
                );

            if (
                competitionResult.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Competition is not available for registration"
                });

            }

            /*
             * CRITICAL SECURITY CHECK:
             * student must belong to logged-in parent.
             */

            const childResult =
                await pool.query(
                    `
                    SELECT
                        s.id,
                        s.name
                    FROM parent_students ps
                    JOIN students s
                        ON s.id = ps.student_id
                    WHERE ps.parent_user_id = $1
                      AND ps.student_id = $2
                      AND s.status = 'ACTIVE'
                    `,
                    [
                        req.user.id,
                        student_id
                    ]
                );

            if (
                childResult.rows.length === 0
            ) {

                return res.status(403).json({
                    message:
                        "You can register only your own student"
                });

            }

            const result =
                await pool.query(
                    `
                    INSERT INTO competition_participants
                    (
                        competition_id,
                        student_id,
                        registration_status,
                        fee_status
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        'REGISTERED',
                        'PENDING'
                    )
                    RETURNING *
                    `,
                    [
                        competitionId,
                        student_id
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
                        "This student is already registered for this competition"
                });

            }

            console.error(
                "Parent registration error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to register student"
            });

        }

    }
);



// ---------------------------------------------------------
// PARENT UPCOMING COMPETITIONS
// Uses the existing secure parent dashboard function.
// ---------------------------------------------------------
router.get(
    "/upcoming-list",
    authenticateToken,
    authorizeRoles("PARENT"),
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT public.parent_dashboard() AS dashboard
            `);

            const dashboard = result.rows[0]?.dashboard || {};
            const children = Array.isArray(dashboard.children)
                ? dashboard.children
                : [];

            const byId = new Map();

            for (const child of children) {
                const upcoming = child?.competitions?.upcoming || [];

                for (const item of upcoming) {
                    if (item.id === undefined || item.id === null) {
                        continue;
                    }

                    const key = String(item.id);

                    if (!byId.has(key)) {
                        byId.set(key, {
                            id: item.id,
                            name: item.name,
                            date: item.date,
                            location: item.location,
                            organizer: item.organizer,
                            description: item.description,
                            eligible_student_ids: [],
                            participating_student_ids: []
                        });
                    }

                    const competition = byId.get(key);
                    const childId = child.id;

                    if (
                        !competition.eligible_student_ids.some(
                            id => String(id) === String(childId)
                        )
                    ) {
                        competition.eligible_student_ids.push(childId);
                    }

                    if (
                        item.participating &&
                        !competition.participating_student_ids.some(
                            id => String(id) === String(childId)
                        )
                    ) {
                        competition.participating_student_ids.push(childId);
                    }
                }
            }

            res.json({
                competitions: Array.from(byId.values())
                    .sort((a, b) =>
                        String(a.date).localeCompare(String(b.date))
                    )
            });
        } catch (error) {
            console.error(
                "Parent upcoming competitions error:",
                error
            );

            res.status(500).json({
                message: "Unable to load upcoming competitions"
            });
        }
    }
);


// Parent-safe list of upcoming competitions for linked children.
router.get(
    "/upcoming-competitions",
    authenticateToken,
    authorizeRoles("PARENT"),
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT public.parent_dashboard() AS dashboard`
            );

            const dashboard = result.rows[0]?.dashboard || {};
            const children = Array.isArray(dashboard.children)
                ? dashboard.children
                : [];

            const byCompetition = new Map();

            for (const child of children) {
                const childCompetitions =
                    child?.competitions?.upcoming || [];

                for (const item of childCompetitions) {
                    if (item.id == null) continue;

                    const key = String(item.id);

                    if (!byCompetition.has(key)) {
                        byCompetition.set(key, {
                            id: item.id,
                            name: item.name,
                            date: item.date,
                            location: item.location,
                            organizer: item.organizer,
                            description: item.description,
                            eligible_student_ids: [],
                            participating_student_ids: []
                        });
                    }

                    const competition = byCompetition.get(key);
                    const childId = child.id;

                    if (!competition.eligible_student_ids.some(
                        value => String(value) === String(childId)
                    )) {
                        competition.eligible_student_ids.push(childId);
                    }

                    if (item.participating &&
                        !competition.participating_student_ids.some(
                            value => String(value) === String(childId)
                        )) {
                        competition.participating_student_ids.push(childId);
                    }
                }
            }

            res.json({
                competitions: Array.from(byCompetition.values()).sort(
                    (a, b) => String(a.date).localeCompare(String(b.date))
                )
            });
        } catch (error) {
            console.error("Parent upcoming competitions error:", error);
            res.status(500).json({
                message: "Unable to load upcoming competitions"
            });
        }
    }
);


/* PARENT PORTAL COMPETITIONS V2 START */

async function loadParentPortalCompetitions() {
    const result = await pool.query(
        "SELECT public.parent_upcoming_competitions() AS competitions"
    );
    const value = result.rows[0]?.competitions;
    return Array.isArray(value) ? value : [];
}

router.get(
    "/portal/competitions",
    authenticateToken,
    authorizeRoles("PARENT"),
    async (req, res) => {
        try {
            res.json({
                competitions: await loadParentPortalCompetitions()
            });
        } catch (error) {
            console.error("Parent competition list error:", error);
            res.status(500).json({
                message: "Unable to load upcoming competitions"
            });
        }
    }
);

router.get(
    "/portal/competitions/:competitionId",
    authenticateToken,
    authorizeRoles("PARENT"),
    async (req, res) => {
        try {
            const id = Number(req.params.competitionId);

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: "Invalid competition ID"
                });
            }

            const rows = await loadParentPortalCompetitions();
            const competition = rows.find(item => Number(item.id) === id);

            if (!competition) {
                return res.status(404).json({
                    message: "Competition is not available to your children"
                });
            }

            res.json({ competition });
        } catch (error) {
            console.error("Parent competition details error:", error);
            res.status(500).json({
                message: "Unable to load competition details"
            });
        }
    }
);

router.post(
    "/portal/competitions/:competitionId/register",
    authenticateToken,
    authorizeRoles("PARENT"),
    async (req, res) => {
        try {
            const competitionId = Number(req.params.competitionId);
            const studentId = Number(req.body?.student_id);

            const category = String(req.body?.category || "").trim() || null;
            const event = String(req.body?.event || "").trim() || null;
            const remarks = String(req.body?.remarks || "").trim() || null;

            if (
                !Number.isSafeInteger(competitionId) ||
                competitionId <= 0 ||
                !Number.isSafeInteger(studentId) ||
                studentId <= 0
            ) {
                return res.status(400).json({
                    message: "Select a valid competition and student"
                });
            }

            if (
                (category && category.length > 100) ||
                (event && event.length > 100)
            ) {
                return res.status(400).json({
                    message: "Category and event must not exceed 100 characters"
                });
            }

            const rows = await loadParentPortalCompetitions();
            const competition = rows.find(
                item => Number(item.id) === competitionId
            );

            if (!competition) {
                return res.status(404).json({
                    message: "Competition is not available to your children"
                });
            }

            const student = (competition.eligible_students || []).find(
                item => Number(item.id) === studentId
            );

            if (!student) {
                return res.status(403).json({
                    message: "You can register only your own eligible child"
                });
            }

            // Permit several events/categories for one child, but prevent
            // duplicate active registrations for the same combination.
            const duplicate = await pool.query(
                `SELECT id
                 FROM public.competition_participants
                 WHERE competition_id = $1
                   AND student_id = $2
                   AND COALESCE(category, '') = COALESCE($3, '')
                   AND COALESCE(event, '') = COALESCE($4, '')
                   AND registration_status <> 'CANCELLED'
                 LIMIT 1`,
                [competitionId, studentId, category, event]
            );

            if (duplicate.rows.length) {
                return res.status(409).json({
                    message: "This student is already registered for this category and event"
                });
            }

            // Reactivate a cancelled matching registration when possible.
            const cancelled = await pool.query(
                `SELECT id
                 FROM public.competition_participants
                 WHERE competition_id = $1
                   AND student_id = $2
                   AND COALESCE(category, '') = COALESCE($3, '')
                   AND COALESCE(event, '') = COALESCE($4, '')
                   AND registration_status = 'CANCELLED'
                 ORDER BY id DESC
                 LIMIT 1`,
                [competitionId, studentId, category, event]
            );

            let registration;

            if (cancelled.rows.length) {
                const updated = await pool.query(
                    `UPDATE public.competition_participants
                     SET registration_status = 'REGISTERED',
                         fee_status = 'PENDING',
                         remarks = $1,
                         registered_at = CURRENT_TIMESTAMP
                     WHERE id = $2
                     RETURNING id, competition_id, student_id, category, event,
                               remarks, registration_status, fee_status, registered_at`,
                    [remarks, cancelled.rows[0].id]
                );
                registration = updated.rows[0];
            } else {
                const inserted = await pool.query(
                    `INSERT INTO public.competition_participants
                        (competition_id, student_id, category, event,
                         remarks, registration_status, fee_status)
                     VALUES ($1, $2, $3, $4, $5, 'REGISTERED', 'PENDING')
                     RETURNING id, competition_id, student_id, category, event,
                               remarks, registration_status, fee_status, registered_at`,
                    [competitionId, studentId, category, event, remarks]
                );
                registration = inserted.rows[0];
            }

            res.status(201).json({
                message: "Student registered successfully",
                student_name: student.name,
                registration
            });
        } catch (error) {
            if (error.code === "23505") {
                return res.status(409).json({
                    message: "This student is already registered for this category and event"
                });
            }

            console.error("Parent competition registration error:", error);
            res.status(500).json({
                message: "Unable to register student"
            });
        }
    }
);

/* PARENT PORTAL COMPETITIONS V2 END */



module.exports = router;
