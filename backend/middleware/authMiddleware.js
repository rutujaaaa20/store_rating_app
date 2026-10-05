const jwt = require("jsonwebtoken");

const authenticationMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decodedToken = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decodedToken;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }
};

module.exports = authenticationMiddleware;