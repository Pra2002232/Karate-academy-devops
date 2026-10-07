const jwt = require("jsonwebtoken");

const {
    runWithUser
} = require("./requestContext");


// ============================================================
// AUTHENTICATE JWT
// ============================================================

const authenticateToken = (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Authorization token required"
            });
        }

        const parts = authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {
            return res.status(401).json({
                message: "Invalid authorization format"
            });
        }

        const token = parts[1];

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: "JWT_SECRET is not configured"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        runWithUser(
            req.user,
            next
        );

    } catch (error) {

        console.error(
            "Authentication error:",
            error.message
        );

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};


// ============================================================
// ROLE AUTHORIZATION
// ============================================================

const authorizeRoles = (...allowedRoles) => {

    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        next();
    };
};


// ============================================================
// BRANCH ACCESS
// ============================================================

const authorizeBranchAccess = async (req, res, next) => {

    try {

        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }


        // Super Admin can access every branch
        if (req.user.role === "SUPER_ADMIN") {
            return next();
        }


        // Branch Admin must have branch_id
        if (req.user.role === "BRANCH_ADMIN") {

            if (!req.user.branch_id) {
                return res.status(403).json({
                    message: "Branch is not assigned"
                });
            }

            req.branchId = req.user.branch_id;

            return next();
        }


        // Parent does not receive branch-admin access
        if (req.user.role === "PARENT") {

            return res.status(403).json({
                message: "Parent access is restricted"
            });
        }


        return res.status(403).json({
            message: "Branch access denied"
        });

    } catch (error) {

        console.error(
            "Branch authorization error:",
            error
        );

        return res.status(500).json({
            message: "Authorization error"
        });
    }
};


module.exports = {
    authenticateToken,
    authorizeRoles,
    authorizeBranchAccess
};
