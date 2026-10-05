const roleAuthorizer = (...requiredRoles) => {
    return (req, res, next) => {
        // user authentication step
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const userRole = req.user.role;

        //users role checking
        if (!requiredRoles.includes(userRole)) {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

        next();
    };
};

module.exports = roleAuthorizer;