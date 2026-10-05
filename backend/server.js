require("dotenv").config();
const express = require("express"); // importing express
const cors = require("cors");

const app = express();
const port = 5000;
const pool = require("./db");
const authRoutes = require("./routes/auth");
const authenticationMiddleware = require("./middleware/authMiddleware");
const roleAuthorizer = require("./middleware/authorizeRoles");
const adminRoutes = require("./routes/admin");
const storeRoutes = require("./routes/store");
const ownerRoutes = require("./routes/owner");

app.use(cors());
app.use(express.json()); // a middleware used to read JSON requests from react
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/owner", ownerRoutes);





app.get("/", (req, res) => {
    res.send("Store Rating API is running")
});

app.get("/api/health", (req, res) => {
    res.json(
        {
            status: "Success",
            message: "Backend is working correctly",

        }
    );
});


app.get("/api/db-health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            status: "success",
            message: "Database connected successfully!",
            databaseTime: result.rows[0].now,
        });
    } catch (error) {
        console.error("Database connection error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Database connection failed",
        });
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost : ${port}`);
});