const express = require("express");
const pool = require("../db");
const authenticationMiddleware = require("../middleware/authMiddleware");
const roleAuthorizer = require("../middleware/authorizeRoles");

const router = express.Router();

router.get(
    "/",
    authenticationMiddleware,
    roleAuthorizer("normal_user"),
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    s.id,
                    s.name,
                    s.email,
                    s.address,
                    COALESCE(AVG(r.rating), 0) AS overall_rating,
                    ur.rating AS user_rating
                FROM stores s
                LEFT JOIN ratings r
                    ON s.id = r.store_id
                LEFT JOIN ratings ur
                    ON s.id = ur.store_id
                    AND ur.user_id = $1
                GROUP BY s.id, ur.rating
                ORDER BY s.name ASC
            `, [req.user.userId]);

            res.json({
                stores: result.rows
            });

        } catch (error) {
            console.error("Get stores error:", error.message);

            res.status(500).json({
                message: "Failed to fetch stores"
            });
        }
    }
);

router.post(
    "/:storeId/rating",
    authenticationMiddleware,
    roleAuthorizer("normal_user"),
    async (req, res) => {
        try {
            const { storeId } = req.params;
            const { rating } = req.body;

            if (!rating || rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
                return res.status(400).json({
                    message: "Rating must be an integer between 1 and 5"
                });
            }

            const storeResult = await pool.query(
                "SELECT id FROM stores WHERE id = $1",
                [storeId]
            );

            if (storeResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Store not found"
                });
            }

            const result = await pool.query(
                `INSERT INTO ratings (user_id, store_id, rating)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, store_id)
                 DO UPDATE SET
                    rating = EXCLUDED.rating,
                    updated_at = CURRENT_TIMESTAMP
                 RETURNING id, user_id, store_id, rating, updated_at`,
                [
                    req.user.userId,
                    storeId,
                    Number(rating)
                ]
            );

            res.json({
                message: "Rating submitted successfully",
                rating: result.rows[0]
            });

        } catch (error) {
            console.error("Submit rating error:", error.message);

            res.status(500).json({
                message: "Failed to submit rating"
            });
        }
    }
);

module.exports = router;