
const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const jwt = require("jsonwebtoken");
const authenticationMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, address } = req.body;


        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email, and password are required",
            });
        }


        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Please provide a valid email address",
            });
        }



        if (name.trim().length < 20 || name.trim().length > 60) {
            return res.status(400).json({
                message: "Name must be between 20 and 60 characters",
            });
        }


        const passwordRegex =
            /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message:
                    "Password must be 8-16 characters and contain an uppercase letter and a special character",
            });
        }


        if (address && address.length > 400) {
            return res.status(400).json({
                message: "Address cannot exceed 400 characters",
            });
        }


        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email.trim().toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists",
            });
        }


        const hashedPassword = await bcrypt.hash(password, 12);


        const result = await pool.query(
            `INSERT INTO users (name, email, password, address, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, address, role, created_at`,
            [
                name.trim(),
                email.trim().toLowerCase(),
                hashedPassword,
                address?.trim() || null,
                "normal_user",
            ]
        );


        return res.status(201).json({
            message: "Registration successful",
            user: result.rows[0],
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        return res.status(500).json({
            message: "An internal server error occurred",
        });
    }
});


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        // 2. Check JWT configuration
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");

            return res.status(500).json({
                message: "Server configuration error",
            });
        }

        // 3. Find the user by email
        const result = await pool.query(
            `SELECT id, name, email, password, role
       FROM users
       WHERE email = $1`,
            [email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const user = result.rows[0];

        // 4. Compare the submitted password with its hash
        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        // 5. Generate a signed JWT
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h",
            }
        );

        // 6. Return the token and safe user details
        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "An internal server error occurred",
        });
    }
});

router.put(
    "/password",
    authenticationMiddleware,
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    message: "Current password and new password are required"
                });
            }

            const passwordRegex =
                /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;

            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({
                    message:
                        "New password must be 8-16 characters and contain an uppercase letter and a special character"
                });
            }

            const userResult = await pool.query(
                "SELECT id, password FROM users WHERE id = $1",
                [req.user.userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const user = userResult.rows[0];

            const passwordMatches = await bcrypt.compare(
                currentPassword,
                user.password
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    message: "Current password is incorrect"
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);

            await pool.query(
                "UPDATE users SET password = $1 WHERE id = $2",
                [hashedPassword, req.user.userId]
            );

            res.json({
                message: "Password updated successfully"
            });

        } catch (error) {
            console.error("Password update error:", error.message);

            res.status(500).json({
                message: "Failed to update password"
            });
        }
    }
);

module.exports = router;
