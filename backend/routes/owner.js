const express = require("express");
const pool = require("../db");
const authenticationMiddleware = require("../middleware/authMiddleware");
const roleAuthorizer = require("../middleware/authorizeRoles");

const router = express.Router();

router.get(
    "/dashboard",
    authenticationMiddleware,
    roleAuthorizer("store_owner"),
    async (req, res) => {
        try {
            // Get stores owned by the logged-in owner
            const storesResult = await pool.query(
                `SELECT
                    s.id,
                    s.name,
                    s.email,
                    s.address,
                    COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) AS average_rating
                 FROM stores s
                 LEFT JOIN ratings r
                    ON s.id = r.store_id
                 WHERE s.owner_id = $1
                 GROUP BY s.id
                 ORDER BY s.name ASC`,
                [req.user.userId]
            );

            // Get users who submitted ratings
            const ratingsResult = await pool.query(
                `SELECT
                    r.id,
                    r.rating,
                    r.created_at,
                    u.id AS user_id,
                    u.name AS user_name,
                    u.email AS user_email,
                    s.id AS store_id,
                    s.name AS store_name
                 FROM ratings r
                 JOIN users u
                    ON r.user_id = u.id
                 JOIN stores s
                    ON r.store_id = s.id
                 WHERE s.owner_id = $1
                 ORDER BY r.created_at DESC`,
                [req.user.userId]
            );

            res.json({
                stores: storesResult.rows,
                ratings: ratingsResult.rows
            });

        } catch (error) {
            console.error("Owner dashboard error:", error.message);

            res.status(500).json({
                message: "Failed to load owner dashboard"
            });
        }
    }
);

module.exports = router;