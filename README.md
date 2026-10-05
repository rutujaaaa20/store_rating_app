# ⭐ RateSphere — Full-Stack Store Rating & Feedback Platform

RateSphere is a comprehensive, production-grade store rating, review, and management platform built with **React**, **Node.js/Express**, and **PostgreSQL**. It features role-based access control (Admin, Store Owner, Normal User) wrapped in a futuristic dark glassmorphic UI.

---

## 🚀 Key Features

### 👤 Normal User Portal
- **Browse & Search Stores**: Instant filter by store name or address.
- **Sorting**: Sort stores by highest/lowest average rating or name.
- **Submit & Modify Ratings**: Interactive 1–5 star rating system with instant feedback updates.
- **User Dashboard**: View rating history, edit existing ratings, and change account passwords.

### 🏪 Store Owner Portal
- **Owner Dashboard**: Real-time store performance metrics.
- **Customer Feedback Breakdown**: Detailed table showing who rated their store, user emails, star ratings, and timestamps.
- **Rating Statistics**: Average rating score, total count of submitted ratings, and distribution.

### 🛡️ System Admin Portal
- **Platform Analytics**: Total user count, store count, and submitted ratings count.
- **User Management**: Search, filter by role (Admin, Normal User, Store Owner), sort by name/email/address, and add new users directly with custom roles.
- **Store Directory Management**: Add new stores, assign store owners, and monitor all ratings across the ecosystem.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Modern Vanilla CSS (Custom Design System, Glassmorphism, Micro-animations)
- **Backend**: Node.js, Express.js, REST API architecture
- **Database**: PostgreSQL (with connection pooling via `pg`)
- **Authentication**: JWT (JSON Web Tokens), `bcryptjs` password hashing, Role-Based Access Control (RBAC) middleware

---

## 📦 Project Structure

```text
store_rating_app/
├── backend/
│   ├── middleware/        # JWT auth & role authorization middleware
│   ├── routes/            # auth, admin, store, and owner endpoints
│   ├── db.js              # PostgreSQL client configuration
│   ├── seed_data.js       # Database schema & sample dataset seeder
│   ├── server.js          # Express app entry point
│   ├── .env.example       # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Navbar, Modals, Rating controls, etc.
│   │   ├── pages/         # Login/Signup, Admin, Owner, User dashboards
│   │   ├── App.jsx        # Main application router & state
│   │   ├── App.css        # Glassmorphism component styles
│   │   └── index.css      # Design tokens & dark theme foundation
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## ⚙️ Getting Started Locally

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **PostgreSQL** (v14+ installed and running)

### 2. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your PostgreSQL database credentials:
   ```env
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=store_rating_db
   DB_PASSWORD=your_password
   DB_PORT=5432
   JWT_SECRET=your_secret_key
   PORT=5000
   ```
5. Seed database schema and sample data:
   ```bash
   node seed_data.js
   ```
6. Start the backend development server:
   ```bash
   npm run dev
   ```
   *Backend runs on `http://localhost:5000`*

### 3. Frontend Setup
1. In another terminal, navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend runs on `http://localhost:5173`*

---

## 👥 Default Demo Credentials (from Seed)

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **System Admin** | Chief Administrator | `admin@system.com` | `admin1234` |
| **Store Owner** | Jane Doe | `jane.doe@bookhaven.com` | `owner1234` |
| **Store Owner** | Bob Vance | `bob.vance@techhub.com` | `owner1234` |
| **Normal User** | Alice Smith | `alice.smith@example.com` | `user1234` |
| **Normal User** | Charlie Brown | `charlie.brown@example.com` | `user1234` |

---

## 🔒 Security Best Practices
- Passwords hashed using `bcryptjs` with salt rounds.
- Protected routes guarded with Bearer JWT tokens.
- Sensitive environment variables and `node_modules` excluded from version control.
