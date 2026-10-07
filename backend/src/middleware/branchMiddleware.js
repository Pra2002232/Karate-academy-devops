/*
=====================================================
BRANCH ACCESS MIDDLEWARE
=====================================================
*/

const authorizeBranchAccess = (req, res, next) => {

    try {

        if (!req.user) {

            return res.status(401).json({
                message: "Authentication required"
            });

        }

        /*
        -----------------------------------------------
        SUPER_ADMIN
        -----------------------------------------------
        */

        if (req.user.role === "SUPER_ADMIN") {

            return next();

        }

        /*
        -----------------------------------------------
        BRANCH_ADMIN
        -----------------------------------------------
        */

        if (req.user.role === "BRANCH_ADMIN") {

            if (!req.user.branch_id) {

                return res.status(403).json({
                    message:
                        "Branch administrator is not assigned to a branch"
                });

            }

            /*
             * Store the branch ID on request.
             *
             * Routes can use req.user.branch_id
             * to restrict database queries.
             */

            req.branchId = req.user.branch_id;

            return next();

        }

        /*
        -----------------------------------------------
        Other roles
        -----------------------------------------------
        */

        return res.status(403).json({
            message: "Branch access denied"
        });

    } catch (error) {

        console.error(
            "Branch authorization error:",
            error
        );

        return res.status(500).json({
            message: "Branch authorization failed"
        });

    }

};


module.exports = {
    authorizeBranchAccess
};
