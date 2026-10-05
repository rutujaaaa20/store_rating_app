const express = require("express");
const pool = require("../db");
const authenticationMiddleware = require("../middleware/authMiddleware");
const roleAuthorizer = require("../middleware/authorizeRoles");
const bcrypt = require("bcryptjs");

const router = express.Router();

router.get(
    "/dashboard",
    authenticationMiddleware,
    roleAuthorizer("system_admin"),
    async (req, res) => {
        try {
            const usersResult = await pool.query(
                "SELECT COUNT(*) FROM users"
            );

            const storesResult = await pool.query(
                "SELECT COUNT(*) FROM stores"
            );

            const ratingsResult = await pool.query(
                "SELECT COUNT(*) FROM ratings"
            );

            res.json({
                totalUsers: Number(usersResult.rows[0].count),
                totalStores: Number(storesResult.rows[0].count),
                totalRatings: Number(ratingsResult.rows[0].count)
            });
        } catch (error) {
            console.error("Dashboard error:", error.message);

            res.status(500).json({
                message: "Failed to load dashboard data"
            });
        }
    }
);


router.post(
    "/users",
    authenticationMiddleware,
    roleAuthorizer("system_admin"),
    async (req, res) => {
        try {
            const { name, email, password, address, role } = req.body;

            // 1. Check required fields
            if (!name || !email || !password || !role) {
                return res.status(400).json({
                    message: "Name, email, password, and role are required"
                });
            }

            // 2. Validate name
            if (name.trim().length < 20 || name.trim().length > 60) {
                return res.status(400).json({
                    message: "Name must be between 20 and 60 characters"
                });
            }

            // 3. Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    message: "Please provide a valid email address"
                });
            }

            // 4. Validate password
            const passwordRegex =
                /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;

            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    message:
                        "Password must be 8-16 characters and contain an uppercase letter and a special character"
                });
            }

            // 5. Validate address
            if (address && address.length > 400) {
                return res.status(400).json({
                    message: "Address cannot exceed 400 characters"
                });
            }

            // 6. Validate role
            if (!["normal_user", "store_owner", "system_admin"].includes(role)) {
                return res.status(400).json({
                    message:
                        "Role must be normal_user, store_owner, or system_admin"
                });
            }

            // 7. Check duplicate email
            const existingUser = await pool.query(
                "SELECT id FROM users WHERE email = $1",
                [email.trim().toLowerCase()]
            );

            if (existingUser.rows.length > 0) {
                return res.status(409).json({
                    message: "An account with this email already exists"
                });
            }

            // 8. Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // 9. Create user
            const result = await pool.query(
                `INSERT INTO users
                (name, email, password, address, role)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, name, email, address, role, created_at`,
                [
                    name.trim(),
                    email.trim().toLowerCase(),
                    hashedPassword,
                    address?.trim() || null,
                    role
                ]
            );

            // 10. Return created user
            return res.status(201).json({
                message: "User created successfully",
                user: result.rows[0]
            });

        } catch (error) {
            console.error("Admin create user error:", error.message);

            return res.status(500).json({
                message: "Failed to create user"
            });
        }
    }
);

router.post(
    "/stores",
    authenticationMiddleware,
    roleAuthorizer("system_admin"),
    async (req, res) => {
        try {
            const { name, email, address, owner_id } = req.body;

            if (!name || !email || !address || !owner_id) {
                return res.status(400).json({
                    message: "Name, email, address and owner_id are required"
                });
            }

            if (name.trim().length < 20 || name.trim().length > 60) {
                return res.status(400).json({
                    message: "Store name must be between 20 and 60 characters"
                });
            }

            if (address.trim().length > 400) {
                return res.status(400).json({
                    message: "Address cannot exceed 400 characters"
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    message: "Invalid email address"
                });
            }

            // Check that owner exists and is actually a store owner
            const ownerResult = await pool.query(
                `SELECT id FROM users
                 WHERE id = $1 AND role = 'store_owner'`,
                [owner_id]
            );

            if (ownerResult.rows.length === 0) {
                return res.status(400).json({
                    message: "Invalid store owner"
                });
            }

            const existingStore = await pool.query(
                "SELECT id FROM stores WHERE email = $1",
                [email.trim().toLowerCase()]
            );

            if (existingStore.rows.length > 0) {
                return res.status(409).json({
                    message: "A store with this email already exists"
                });
            }

            const result = await pool.query(
                `INSERT INTO stores
                (name, email, address, owner_id)
                VALUES ($1, $2, $3, $4)
                RETURNING id, name, email, address, owner_id, created_at`,
                [
                    name.trim(),
                    email.trim().toLowerCase(),
                    address.trim(),
                    owner_id
                ]
            );

            res.status(201).json({
                message: "Store created successfully",
                store: result.rows[0]
            });

        } catch (error) {
            console.error("Create store error:", error.message);

            res.status(500).json({
                message: "Failed to create store"
            });
        }
    }
);

router.get(
    "/stores",
    authenticationMiddleware,
    roleAuthorizer("system_admin"),
    async (req, res) => {
        try {
            const {
                name = "",
                email = "",
                address = "",
                sortBy = "name",
                order = "asc"
            } = req.query;

            const allowedSortFields = {
                name: "s.name",
                email: "s.email",
                address: "s.address",
                rating: "average_rating",
                created_at: "s.created_at"
            };

            const sortColumn =
                allowedSortFields[sortBy] || allowedSortFields.name;

            const sortOrder = order.toLowerCase() === "desc"
                ? "DESC"
                : "ASC";

            const conditions = [];
            const values = [];

            if (name) {
                values.push(`%${name}%`);
                conditions.push(`s.name ILIKE $${values.length}`);
            }

            if (email) {
                values.push(`%${email}%`);
                conditions.push(`s.email ILIKE $${values.length}`);
            }

            if (address) {
                values.push(`%${address}%`);
                conditions.push(`s.address ILIKE $${values.length}`);
            }

            const whereClause =
                conditions.length > 0
                    ? `WHERE ${conditions.join(" AND ")}`
                    : "";

            const result = await pool.query(
                `SELECT
                    s.id,
                    s.name,
                    s.email,
                    s.address,
                    s.owner_id,
                    u.name AS owner_name,
                    COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) AS average_rating,
                    COUNT(r.id)::int AS total_ratings,
                    s.created_at
                 FROM stores s
                 LEFT JOIN users u ON s.owner_id = u.id
                 LEFT JOIN ratings r ON s.id = r.store_id
                 ${whereClause}
                 GROUP BY s.id, u.name
                 ORDER BY ${sortColumn} ${sortOrder}`,
                values
            );

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

router.get(
    "/users",
    authenticationMiddleware,
    roleAuthorizer("system_admin"),
    async (req, res) => {
        try {
            const {
                name = "",
                email = "",
                address = "",
                role = "",
                sortBy = "name",
                order = "asc"
            } = req.query;

            const allowedSortFields = {
                name: "u.name",
                email: "u.email",
                address: "u.address",
                role: "u.role",
                created_at: "u.created_at",
                owner_rating: "owner_rating"
            };

            const sortColumn =
                allowedSortFields[sortBy] || allowedSortFields.name;

            const sortOrder = order.toLowerCase() === "desc"
                ? "DESC"
                : "ASC";

            const conditions = [];
            const values = [];

            if (name) {
                values.push(`%${name}%`);
                conditions.push(`u.name ILIKE $${values.length}`);
            }

            if (email) {
                values.push(`%${email}%`);
                conditions.push(`u.email ILIKE $${values.length}`);
            }

            if (address) {
                values.push(`%${address}%`);
                conditions.push(`u.address ILIKE $${values.length}`);
            }

            if (role) {
                values.push(role);
                conditions.push(`u.role = $${values.length}`);
            }

            const whereClause =
                conditions.length > 0
                    ? `WHERE ${conditions.join(" AND ")}`
                    : "";

            const result = await pool.query(
                `SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.address,
                    u.role,
                    u.created_at,
                    CASE 
                        WHEN u.role = 'store_owner' THEN COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)
                        ELSE NULL
                    END AS owner_rating
                 FROM users u
                 LEFT JOIN stores s ON s.owner_id = u.id
                 LEFT JOIN ratings r ON r.store_id = s.id
                 ${whereClause}
                 GROUP BY u.id
                 ORDER BY ${sortColumn} ${sortOrder}`,
                values
            );

            res.json({
                users: result.rows
            });

        } catch (error) {
            console.error("Get users error:", error.message);

            res.status(500).json({
                message: "Failed to fetch users"
            });
        }
    }
);

router.get(
    "/users/:id",
    authenticationMiddleware,
    roleAuthorizer("system_admin"),
    async (req, res) => {
        try {
            const { id } = req.params;

            const userResult = await pool.query(
                `SELECT
                    id,
                    name,
                    email,
                    address,
                    role,
                    created_at
                 FROM users
                 WHERE id = $1`,
                [id]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const user = userResult.rows[0];

            let stores = [];

            if (user.role === "store_owner") {
                const storesResult = await pool.query(
                    `SELECT
                        s.id,
                        s.name,
                        s.email,
                        s.address,
                        COALESCE(
                            ROUND(AVG(r.rating)::numeric, 2),
                            0
                        ) AS average_rating
                     FROM stores s
                     LEFT JOIN ratings r
                        ON s.id = r.store_id
                     WHERE s.owner_id = $1
                     GROUP BY s.id
                     ORDER BY s.name ASC`,
                    [id]
                );

                stores = storesResult.rows;
            }

            res.json({
                user,
                stores
            });

        } catch (error) {
            console.error("User details error:", error.message);

            res.status(500).json({
                message: "Failed to fetch user details"
            });
        }
    }
);

module.exports = router;