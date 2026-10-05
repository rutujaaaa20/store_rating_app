import { useEffect, useState, useMemo, useCallback } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePasswordRules(pwd) {
  return {
    length:    pwd.length >= 8 && pwd.length <= 16,
    uppercase: /[A-Z]/.test(pwd),
    special:   /[^A-Za-z0-9]/.test(pwd),
  };
}

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function formatRating(val) {
  return Number(val || 0).toFixed(2);
}

function StarDisplay({ value = 0, size = "1rem" }) {
  const full  = Math.floor(value);
  const half  = value - full >= 0.5;
  return (
    <span className="star-display" style={{ fontSize: size }}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i}>★</span>;
        if (i === full && half) return <span key={i} style={{ opacity: 0.6 }}>★</span>;
        return <span key={i} className="star-empty">★</span>;
      })}
    </span>
  );
}

function RoleTag({ role }) {
  if (role === "system_admin")
    return <span className="role-tag admin">System Admin</span>;
  if (role === "store_owner")
    return <span className="role-tag owner">Store Owner</span>;
  return <span className="role-tag user">Normal User</span>;
}

/* ============================================================
   ROOT
   ============================================================ */
function App() {
  const [token, setToken]   = useState(localStorage.getItem("token"));
  const [user, setUser]     = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [authMode, setAuthMode] = useState("login");
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4200);
  }, []);

  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const login = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    addToast(`Welcome back, ${data.user.name.split(" ")[0]}! 🎉`, "success");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setAuthMode("login");
    addToast("You've been logged out.", "info");
  };

  if (!token || !user) {
    return (
      <>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <AuthPage onLogin={login} mode={authMode} setMode={setAuthMode} addToast={addToast} />
      </>
    );
  }

  return (
    <div className="app-container">
      {/* Animated dark background — same as auth page */}
      <div className="page-blob page-blob-1" />
      <div className="page-blob page-blob-2" />
      <div className="page-blob page-blob-3" />
      <div className="page-grid" />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Navbar user={user} onOpenChangePw={() => setChangePwOpen(true)} onLogout={logout} />

      <div className="page-wrapper">
        <main className="main-content">
          {user.role === "system_admin" && <AdminDashboard token={token} addToast={addToast} />}
          {user.role === "store_owner"  && <OwnerDashboard token={token} user={user} addToast={addToast} />}
          {user.role === "normal_user"  && <UserDashboard  token={token} addToast={addToast} />}
        </main>
      </div>

      {changePwOpen && (
        <ChangePasswordModal token={token} onClose={() => setChangePwOpen(false)} addToast={addToast} />
      )}
    </div>
  );
}

/* ============================================================
   TOAST
   ============================================================ */
function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">{icons[t.type] || "💬"}</span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => onRemove(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   NAVBAR
   ============================================================ */
function Navbar({ user, onOpenChangePw, onLogout }) {
  return (
    <header className="navbar">
      <div className="brand">
        <div className="brand-icon">⭐</div>
        <div>
          <span className="brand-text-main">RateSphere</span>
          <span className="brand-text-sub">Store Ratings Platform</span>
        </div>
      </div>

      <div className="nav-user">
        <div className="user-profile-badge">
          <div className="user-avatar">{getInitials(user.name)}</div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <RoleTag role={user.role} />
          </div>
        </div>

        <div className="nav-actions">
          <button className="btn-nav btn-nav-outline" onClick={onOpenChangePw} title="Change Password">
            🔐 Password
          </button>
          <button className="btn-nav btn-nav-danger" onClick={onLogout} title="Log Out">
            ⏻ Logout
          </button>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   AUTH PAGE
   ============================================================ */
function AuthPage({ onLogin, mode, setMode, addToast }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [address,  setAddress]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const pwdRules    = useMemo(() => validatePasswordRules(password), [password]);
  const isNameValid = name.trim().length >= 20 && name.trim().length <= 60;
  const isAddrValid = address.trim().length <= 400;
  const isEmailValid = EMAIL_REGEX.test(email);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Sign in failed");
      onLogin(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!isNameValid)  return setError("Name must be 20–60 characters");
    if (!isEmailValid) return setError("Enter a valid email address");
    if (!pwdRules.length || !pwdRules.uppercase || !pwdRules.special)
      return setError("Password does not meet all requirements");
    if (!isAddrValid) return setError("Address cannot exceed 400 characters");

    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, address: address.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      addToast("Account created! Please sign in. 🎉", "success");
      setMode("login");
      setName(""); setPassword(""); setAddress("");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const switchMode = (m) => { setMode(m); setError(""); };

  return (
    <div className="auth-wrapper">
      {/* Animated blobs */}
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />
      <div className="auth-grid" />

      {/* Left hero panel */}
      <div className="auth-left-panel">
        <div className="auth-hero-content">
          <div className="auth-hero-icon">⭐</div>
          <h1 className="auth-hero-title">
            Rate &amp; Discover<br /><span>Local Stores</span>
          </h1>
          <p className="auth-hero-subtitle">
            RateSphere makes it easy to find the best shops near you,
            share honest reviews, and help businesses grow.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">🏬</div>
              <span className="auth-feature-text">Browse hundreds of local stores instantly</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">⭐</div>
              <span className="auth-feature-text">Leave honest 1–5 star ratings anytime</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">📊</div>
              <span className="auth-feature-text">Owners track real-time feedback & analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-right-panel">
        <div className="auth-card">
          <div className="auth-card-inner">
            <h2 className="auth-card-title">
              {mode === "login" ? "Sign In" : "Create Account"}
            </h2>
            <p className="auth-card-subtitle">
              {mode === "login"
                ? "Welcome back! Enter your credentials to continue."
                : "Join RateSphere today — it's free for customers."}
            </p>

            <div className="auth-tabs">
              <button className={`auth-tab ${mode === "login"  ? "active" : ""}`} onClick={() => switchMode("login")}>Sign In</button>
              <button className={`auth-tab ${mode === "signup" ? "active" : ""}`} onClick={() => switchMode("signup")}>Sign Up</button>
            </div>

            {error && <div className="error">{error}</div>}

            {mode === "login" ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="input-field" type="email" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="input-field" type="password" placeholder="Your password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "0.25rem" }}>
                  {loading ? "Signing in…" : "Sign In →"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <div className="form-label">
                    <span>Full Name</span>
                    <span className={`form-counter ${name.length === 0 ? "" : isNameValid ? "valid" : "invalid"}`}>
                      {name.length}/60 (min 20)
                    </span>
                  </div>
                  <input className={`input-field ${name.length > 0 && !isNameValid ? "input-error" : ""}`}
                    type="text" placeholder="Full legal name (20–60 characters)"
                    value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className={`input-field ${email.length > 0 && !isEmailValid ? "input-error" : ""}`}
                    type="email" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="input-field" type="password" placeholder="Create a strong password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <div className="password-rules">
                    <div className={`rule-item ${pwdRules.length    ? "rule-passed" : ""}`}>{pwdRules.length    ? "✓" : "○"} 8–16 characters</div>
                    <div className={`rule-item ${pwdRules.uppercase ? "rule-passed" : ""}`}>{pwdRules.uppercase ? "✓" : "○"} At least one uppercase letter</div>
                    <div className={`rule-item ${pwdRules.special   ? "rule-passed" : ""}`}>{pwdRules.special   ? "✓" : "○"} At least one special character</div>
                  </div>
                </div>

                <div className="form-group">
                  <div className="form-label">
                    <span>Address <span style={{ fontWeight: 400, color: "var(--slate-400)" }}>(optional)</span></span>
                    <span className={`form-counter ${isAddrValid ? "valid" : "invalid"}`}>{address.length}/400</span>
                  </div>
                  <textarea className={`input-field ${!isAddrValid ? "input-error" : ""}`}
                    placeholder="Your address (optional)"
                    value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>

                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "0.25rem" }}>
                  {loading ? "Creating account…" : "Create Account →"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CHANGE PASSWORD MODAL
   ============================================================ */
function ChangePasswordModal({ token, onClose, addToast }) {
  const [current,  setCurrent]  = useState("");
  const [newPwd,   setNewPwd]   = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const pwdRules = useMemo(() => validatePasswordRules(newPwd), [newPwd]);
  const match    = newPwd === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (!current) return setError("Enter your current password");
    if (!pwdRules.length || !pwdRules.uppercase || !pwdRules.special)
      return setError("New password does not meet requirements");
    if (!match) return setError("Passwords do not match");

    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update password");
      addToast("Password updated successfully! 🔐", "success");
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🔐 Change Password</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="input-field" type="password" placeholder="Your current password"
                value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="input-field" type="password" placeholder="New password"
                value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
              <div className="password-rules">
                <div className={`rule-item ${pwdRules.length    ? "rule-passed" : ""}`}>{pwdRules.length    ? "✓" : "○"} 8–16 characters</div>
                <div className={`rule-item ${pwdRules.uppercase ? "rule-passed" : ""}`}>{pwdRules.uppercase ? "✓" : "○"} At least one uppercase letter</div>
                <div className={`rule-item ${pwdRules.special   ? "rule-passed" : ""}`}>{pwdRules.special   ? "✓" : "○"} At least one special character</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className={`input-field ${confirm && !match ? "input-error" : ""}`}
                type="password" placeholder="Repeat new password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              {confirm && !match && (
                <p style={{ fontSize: "0.75rem", color: "var(--rose-500)", marginTop: "0.3rem", fontWeight: 600 }}>
                  Passwords don't match
                </p>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-action-primary" disabled={loading}>
              {loading ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
function AdminDashboard({ token, addToast }) {
  const [activeTab,  setActiveTab]  = useState("overview");
  const [stats,      setStats]      = useState({ totalUsers: 0, totalStores: 0, totalRatings: 0 });
  const [users,      setUsers]      = useState([]);
  const [stores,     setStores]     = useState([]);

  const [userSearch,      setUserSearch]      = useState("");
  const [userRoleFilter,  setUserRoleFilter]  = useState("");
  const [userSortBy,      setUserSortBy]      = useState("name");
  const [userSortOrder,   setUserSortOrder]   = useState("asc");

  const [storeSearch,     setStoreSearch]     = useState("");
  const [storeSortBy,     setStoreSortBy]     = useState("name");
  const [storeSortOrder,  setStoreSortOrder]  = useState("asc");

  const [addUserOpen,  setAddUserOpen]  = useState(false);
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [userDetail,   setUserDetail]   = useState(null);

  const authH = { Authorization: `Bearer ${token}` };

  const fetchStats = async () => {
    const r = await fetch(`${API}/admin/dashboard`, { headers: authH });
    if (r.ok) setStats(await r.json());
  };

  const fetchUsers = async () => {
    const q = new URLSearchParams();
    if (userSearch)     q.append("name", userSearch);
    if (userRoleFilter) q.append("role", userRoleFilter);
    q.append("sortBy", userSortBy); q.append("order", userSortOrder);
    const r = await fetch(`${API}/admin/users?${q}`, { headers: authH });
    if (r.ok) setUsers((await r.json()).users || []);
  };

  const fetchStores = async () => {
    const q = new URLSearchParams();
    if (storeSearch) q.append("name", storeSearch);
    q.append("sortBy", storeSortBy); q.append("order", storeSortOrder);
    const r = await fetch(`${API}/admin/stores?${q}`, { headers: authH });
    if (r.ok) setStores((await r.json()).stores || []);
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchUsers(); }, [userSearch, userRoleFilter, userSortBy, userSortOrder]);
  useEffect(() => { fetchStores(); }, [storeSearch, storeSortBy, storeSortOrder]);

  const toggleUserSort  = (col) => { if (userSortBy === col) setUserSortOrder(o => o === "asc" ? "desc" : "asc"); else { setUserSortBy(col); setUserSortOrder("asc"); } };
  const toggleStoreSort = (col) => { if (storeSortBy === col) setStoreSortOrder(o => o === "asc" ? "desc" : "asc"); else { setStoreSortBy(col); setStoreSortOrder("asc"); } };

  const sortArrow = (col, activeSortBy, activeSortOrder) => (
    <span className={`sort-icon ${activeSortBy === col ? "active" : ""}`}>
      {activeSortBy === col ? (activeSortOrder === "asc" ? " ▲" : " ▼") : " ▲"}
    </span>
  );

  const handleViewUser = async (id) => {
    const r = await fetch(`${API}/admin/users/${id}`, { headers: authH });
    if (r.ok) setUserDetail(await r.json());
    else addToast("Failed to load user details", "error");
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ System Administration</h1>
          <p className="page-desc">Manage all users, stores, and monitor platform activity.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-secondary" onClick={() => setAddUserOpen(true)}>＋ New User</button>
          <button className="btn-action-primary" onClick={() => setAddStoreOpen(true)}>＋ New Store</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        {[
          { id: "overview", label: "📊 Overview" },
          { id: "users",    label: "👥 Users",  badge: users.length },
          { id: "stores",   label: "🏬 Stores", badge: stores.length },
        ].map(({ id, label, badge }) => (
          <button key={id} className={`tab-btn ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
            {label}
            {badge !== undefined && <span className="tab-badge">{badge}</span>}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <>
          <div className="stats-grid">
            <StatCard icon="👥" label="Total Users"   value={stats.totalUsers}   type="users" />
            <StatCard icon="🏬" label="Total Stores"  value={stats.totalStores}  type="stores" />
            <StatCard icon="⭐" label="Total Ratings" value={stats.totalRatings} type="ratings" />
          </div>

          <div className="panel-box">
            <div className="panel-box-header">
              <div className="panel-box-title">Quick Actions</div>
              <div className="panel-box-subtitle">Shortcuts to common administrative tasks.</div>
            </div>
            <div className="quick-actions-grid">
              <QuickActionCard icon="👤" iconBg="rgba(99,102,241,0.12)" iconColor="#4f46e5"
                title="Create User" desc="Add a new Normal User, Store Owner, or Admin"
                onClick={() => setAddUserOpen(true)} />
              <QuickActionCard icon="🏬" iconBg="rgba(16,185,129,0.12)" iconColor="#059669"
                title="Register Store" desc="Onboard a verified store and assign an owner"
                onClick={() => setAddStoreOpen(true)} />
              <QuickActionCard icon="🔍" iconBg="rgba(245,158,11,0.12)" iconColor="#b45309"
                title="Search Users" desc="Filter and inspect registered user accounts"
                onClick={() => setActiveTab("users")} />
              <QuickActionCard icon="📋" iconBg="rgba(6,182,212,0.12)" iconColor="#0369a1"
                title="Browse Stores" desc="View all stores and their aggregated ratings"
                onClick={() => setActiveTab("stores")} />
            </div>
          </div>
        </>
      )}

      {/* USERS */}
      {activeTab === "users" && (
        <>
          <div className="toolbar-card">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input className="input-field" placeholder="Search by name or email…"
                value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            </div>
            <div className="filter-actions">
              <select className="filter-select" value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}>
                <option value="">All Roles</option>
                <option value="normal_user">Normal User</option>
                <option value="store_owner">Store Owner</option>
                <option value="system_admin">System Admin</option>
              </select>
              {(userSearch || userRoleFilter) && (
                <button className="btn-secondary" onClick={() => { setUserSearch(""); setUserRoleFilter(""); }}>
                  Reset
                </button>
              )}
              <button className="btn-action-primary" onClick={() => setAddUserOpen(true)}>＋ Add User</button>
            </div>
          </div>

          <div className="table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => toggleUserSort("name")}>Name{sortArrow("name", userSortBy, userSortOrder)}</th>
                    <th className="sortable" onClick={() => toggleUserSort("email")}>Email{sortArrow("email", userSortBy, userSortOrder)}</th>
                    <th className="sortable" onClick={() => toggleUserSort("address")}>Address{sortArrow("address", userSortBy, userSortOrder)}</th>
                    <th className="sortable" onClick={() => toggleUserSort("role")}>Role{sortArrow("role", userSortBy, userSortOrder)}</th>
                    <th className="sortable" onClick={() => toggleUserSort("owner_rating")}>Owner Rating{sortArrow("owner_rating", userSortBy, userSortOrder)}</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className="table-empty">
                          <span className="table-empty-icon">👤</span>
                          No users match your criteria.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: "50%",
                              background: "var(--grad-brand)", color: "white",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.72rem", fontWeight: 800, flexShrink: 0,
                            }}>{getInitials(u.name)}</div>
                            <span style={{ fontWeight: 700, color: "var(--slate-800)" }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ color: "var(--slate-500)" }}>{u.email}</td>
                        <td style={{ maxWidth: 200, color: "var(--slate-500)", fontSize: "0.825rem" }}>
                          {u.address ? u.address.substring(0, 60) + (u.address.length > 60 ? "…" : "") : <span style={{ color: "var(--slate-300)" }}>—</span>}
                        </td>
                        <td><RoleTag role={u.role} /></td>
                        <td>
                          {u.role === "store_owner" ? (
                            <div className="rating-display">
                              <StarDisplay value={Number(u.owner_rating || 0)} />
                              <span className="rating-stars-text">{formatRating(u.owner_rating)}</span>
                            </div>
                          ) : (
                            <span style={{ color: "var(--slate-300)" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button className="table-btn" onClick={() => handleViewUser(u.id)}>
                            View →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* STORES */}
      {activeTab === "stores" && (
        <>
          <div className="toolbar-card">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input className="input-field" placeholder="Search stores by name or address…"
                value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} />
            </div>
            <div className="filter-actions">
              {storeSearch && <button className="btn-secondary" onClick={() => setStoreSearch("")}>Reset</button>}
              <button className="btn-action-primary" onClick={() => setAddStoreOpen(true)}>＋ Add Store</button>
            </div>
          </div>

          <div className="table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => toggleStoreSort("name")}>Store Name{sortArrow("name", storeSortBy, storeSortOrder)}</th>
                    <th className="sortable" onClick={() => toggleStoreSort("email")}>Email{sortArrow("email", storeSortBy, storeSortOrder)}</th>
                    <th className="sortable" onClick={() => toggleStoreSort("address")}>Address{sortArrow("address", storeSortBy, storeSortOrder)}</th>
                    <th>Owner</th>
                    <th className="sortable" onClick={() => toggleStoreSort("rating")}>Avg Rating{sortArrow("rating", storeSortBy, storeSortOrder)}</th>
                    <th>Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className="table-empty">
                          <span className="table-empty-icon">🏬</span>
                          No stores found.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    stores.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.1rem" }}>🏬</span>
                            <strong style={{ color: "var(--slate-800)" }}>{s.name}</strong>
                          </div>
                        </td>
                        <td style={{ color: "var(--slate-500)", fontSize: "0.825rem" }}>{s.email}</td>
                        <td style={{ maxWidth: 220, color: "var(--slate-500)", fontSize: "0.825rem" }}>
                          {s.address.substring(0, 55)}{s.address.length > 55 ? "…" : ""}
                        </td>
                        <td>
                          <span className="pill pill-purple">{s.owner_name || `ID#${s.owner_id}`}</span>
                        </td>
                        <td>
                          <div className="rating-display">
                            <StarDisplay value={Number(s.average_rating || 0)} />
                            <span className="rating-stars-text">{formatRating(s.average_rating)}</span>
                          </div>
                        </td>
                        <td>
                          <span className="pill pill-green">
                            {s.total_ratings || 0} reviews
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {addUserOpen && (
        <AddUserModal token={token} onClose={() => setAddUserOpen(false)}
          onSuccess={() => { fetchUsers(); fetchStats(); setAddUserOpen(false); }} addToast={addToast} />
      )}
      {addStoreOpen && (
        <AddStoreModal token={token} onClose={() => setAddStoreOpen(false)}
          onSuccess={() => { fetchStores(); fetchStats(); setAddStoreOpen(false); }} addToast={addToast} />
      )}
      {userDetail && (
        <UserDetailModal details={userDetail} onClose={() => setUserDetail(null)} />
      )}
    </div>
  );
}

/* Small helper sub-components */
function StatCard({ icon, label, value, type }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${type}`}>{icon}</div>
      <div className="stat-details">
        <span className="stat-value">{value.toLocaleString()}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

function QuickActionCard({ icon, iconBg, iconColor, title, desc, onClick }) {
  return (
    <div className="quick-action-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div className="qa-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div>
        <div className="qa-title">{title}</div>
        <div className="qa-desc">{desc}</div>
      </div>
    </div>
  );
}

/* ============================================================
   ADD USER MODAL (ADMIN)
   ============================================================ */
function AddUserModal({ token, onClose, onSuccess, addToast }) {
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [pwd, setPwd]       = useState("");
  const [addr, setAddr]     = useState("");
  const [role, setRole]     = useState("normal_user");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const pwdRules     = useMemo(() => validatePasswordRules(pwd), [pwd]);
  const isNameValid  = name.trim().length >= 20 && name.trim().length <= 60;
  const isEmailValid = EMAIL_REGEX.test(email);
  const isAddrValid  = addr.trim().length <= 400;

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (!isNameValid)  return setError("Name must be 20–60 characters");
    if (!isEmailValid) return setError("Enter a valid email address");
    if (!pwdRules.length || !pwdRules.uppercase || !pwdRules.special) return setError("Password does not meet requirements");
    if (!isAddrValid)  return setError("Address cannot exceed 400 characters");

    setLoading(true);
    try {
      const res  = await fetch(`${API}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password: pwd, address: addr.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create user");
      addToast(`User "${name.trim()}" created! ✅`, "success");
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">👤 Create New User</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error">{error}</div>}
            <div className="form-group">
              <div className="form-label">
                <span>Full Name</span>
                <span className={`form-counter ${name.length === 0 ? "" : isNameValid ? "valid" : "invalid"}`}>{name.length}/60 (min 20)</span>
              </div>
              <input className={`input-field ${name.length > 0 && !isNameValid ? "input-error" : ""}`}
                type="text" placeholder="Legal full name (20–60 chars)" value={name}
                onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className={`input-field ${email.length > 0 && !isEmailValid ? "input-error" : ""}`}
                type="email" placeholder="user@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Assign Role</label>
              <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="normal_user">Normal User (Customer)</option>
                <option value="store_owner">Store Owner</option>
                <option value="system_admin">System Administrator</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Temporary Password</label>
              <input className="input-field" type="password" placeholder="8–16 chars, uppercase, special char"
                value={pwd} onChange={(e) => setPwd(e.target.value)} required />
              <div className="password-rules">
                <div className={`rule-item ${pwdRules.length    ? "rule-passed" : ""}`}>{pwdRules.length    ? "✓" : "○"} 8–16 characters</div>
                <div className={`rule-item ${pwdRules.uppercase ? "rule-passed" : ""}`}>{pwdRules.uppercase ? "✓" : "○"} 1+ Uppercase letter</div>
                <div className={`rule-item ${pwdRules.special   ? "rule-passed" : ""}`}>{pwdRules.special   ? "✓" : "○"} 1+ Special character</div>
              </div>
            </div>
            <div className="form-group">
              <div className="form-label">
                <span>Address</span>
                <span className={`form-counter ${isAddrValid ? "valid" : "invalid"}`}>{addr.length}/400</span>
              </div>
              <textarea className="input-field" placeholder="Physical address (optional)"
                value={addr} onChange={(e) => setAddr(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-action-primary" disabled={loading}>
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   ADD STORE MODAL (ADMIN)
   ============================================================ */
function AddStoreModal({ token, onClose, onSuccess, addToast }) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [addr,  setAddr]  = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [owners,  setOwners]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const isNameValid  = name.trim().length >= 20 && name.trim().length <= 60;
  const isEmailValid = EMAIL_REGEX.test(email);
  const isAddrValid  = addr.trim().length > 0 && addr.trim().length <= 400;

  useEffect(() => {
    fetch(`${API}/admin/users?role=store_owner`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const list = d.users || [];
        setOwners(list);
        if (list.length > 0) setOwnerId(list[0].id);
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (!isNameValid)  return setError("Store name must be 20–60 characters");
    if (!isEmailValid) return setError("Enter a valid email address");
    if (!isAddrValid)  return setError("Address is required (max 400 chars)");
    if (!ownerId)      return setError("Please select a Store Owner");

    setLoading(true);
    try {
      const res  = await fetch(`${API}/admin/stores`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), address: addr.trim(), owner_id: Number(ownerId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create store");
      addToast(`Store "${name.trim()}" registered! 🏬`, "success");
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🏬 Register New Store</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error">{error}</div>}
            <div className="form-group">
              <div className="form-label">
                <span>Store Name</span>
                <span className={`form-counter ${name.length === 0 ? "" : isNameValid ? "valid" : "invalid"}`}>{name.length}/60 (min 20)</span>
              </div>
              <input className={`input-field ${name.length > 0 && !isNameValid ? "input-error" : ""}`}
                type="text" placeholder="Official store name (20–60 chars)" value={name}
                onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Store Email</label>
              <input className={`input-field ${email.length > 0 && !isEmailValid ? "input-error" : ""}`}
                type="email" placeholder="store@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Assign Store Owner</label>
              {owners.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--rose-500)", padding: "0.5rem 0", fontWeight: 600 }}>
                  ⚠️ No store owners exist. Create a user with role "Store Owner" first.
                </p>
              ) : (
                <select className="input-field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <div className="form-label">
                <span>Store Address</span>
                <span className={`form-counter ${isAddrValid ? "valid" : "invalid"}`}>{addr.length}/400</span>
              </div>
              <textarea className="input-field" placeholder="Full store address (required, max 400 chars)"
                value={addr} onChange={(e) => setAddr(e.target.value)} required />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-action-primary" disabled={loading || owners.length === 0}>
              {loading ? "Registering…" : "Register Store"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   USER DETAIL MODAL (ADMIN)
   ============================================================ */
function UserDetailModal({ details, onClose }) {
  const { user, stores = [] } = details;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: "var(--grad-brand)",
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "0.9rem",
            }}>{getInitials(user.name)}</div>
            <h2 className="modal-title">{user.name}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="detail-rows">
            {[
              { label: "Email",   value: user.email },
              { label: "Address", value: user.address || "Not provided" },
              { label: "Role",    value: <RoleTag role={user.role} /> },
              { label: "Joined",  value: user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="detail-row">
                <span className="detail-label">{label}</span>
                <span className="detail-value">{value}</span>
              </div>
            ))}
          </div>

          {user.role === "store_owner" && (
            <>
              <div className="owner-stores-section-title">
                <span>Owned Stores</span>
                <span className="section-count-badge">{stores.length}</span>
              </div>
              {stores.length === 0 ? (
                <div className="empty-state" style={{ padding: "1.5rem 0" }}>
                  <span className="empty-state-emoji" style={{ fontSize: "1.5rem" }}>🏬</span>
                  <p className="empty-state-desc">No stores assigned to this owner yet.</p>
                </div>
              ) : (
                stores.map((s) => (
                  <div key={s.id} className="owner-store-item">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="owner-store-name">{s.name}</div>
                      <span className="owner-store-rating">⭐ {formatRating(s.average_rating)}</span>
                    </div>
                    <div className="owner-store-meta">
                      <span>{s.email}</span>
                      <span>•</span>
                      <span>{s.address}</span>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   NORMAL USER DASHBOARD
   ============================================================ */
function UserDashboard({ token, addToast }) {
  const [stores,     setStores]     = useState([]);
  const [search,     setSearch]     = useState("");
  const [sortBy,     setSortBy]     = useState("rating_desc");
  const [filterMode, setFilterMode] = useState("all");
  const [loading,    setLoading]    = useState(true);

  const loadStores = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/stores`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStores((await res.json()).stores || []);
    } catch { addToast("Failed to load stores", "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadStores(); }, []);

  const handleRate = async (storeId, score) => {
    if (!score || score < 1 || score > 5) return addToast("Select a rating from 1–5", "error");
    try {
      const res  = await fetch(`${API}/stores/${storeId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: score }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not submit rating");
      addToast("Rating saved! ⭐", "success");
      loadStores();
    } catch (err) { addToast(err.message, "error"); }
  };

  const filtered = useMemo(() => {
    return stores
      .filter((s) => {
        const q = search.toLowerCase();
        const m = s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
        if (!m) return false;
        if (filterMode === "rated")   return s.user_rating != null;
        if (filterMode === "unrated") return s.user_rating == null;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rating_desc") return Number(b.overall_rating) - Number(a.overall_rating);
        if (sortBy === "rating_asc")  return Number(a.overall_rating) - Number(b.overall_rating);
        if (sortBy === "name_asc")    return a.name.localeCompare(b.name);
        if (sortBy === "name_desc")   return b.name.localeCompare(a.name);
        if (sortBy === "my_rating")   return (Number(b.user_rating) || 0) - (Number(a.user_rating) || 0);
        return 0;
      });
  }, [stores, search, sortBy, filterMode]);

  const ratedCount   = useMemo(() => stores.filter((s) => s.user_rating != null).length, [stores]);
  const unratedCount = stores.length - ratedCount;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏬 Discover Stores</h1>
          <p className="page-desc">Browse, rate, and track all registered stores in one place.</p>
        </div>
      </div>

      {/* Mini stats */}
      <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
        <StatCard icon="🏬" label="Total Stores"  value={stores.length} type="stores" />
        <StatCard icon="✅" label="Stores Rated"  value={ratedCount}    type="ratings" />
        <StatCard icon="⏳" label="Yet to Rate"   value={unratedCount}  type="reviews" />
      </div>

      <div className="toolbar-card">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input className="input-field" placeholder="Search stores by name or address…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-actions">
          <select className="filter-select" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
            <option value="all">All Stores</option>
            <option value="rated">Stores I've Rated</option>
            <option value="unrated">Not Yet Rated</option>
          </select>
          <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="rating_desc">Highest Rated ⭐</option>
            <option value="rating_asc">Lowest Rated</option>
            <option value="name_asc">Name (A → Z)</option>
            <option value="name_desc">Name (Z → A)</option>
            <option value="my_rating">My Highest Rating</option>
          </select>
          {(search || filterMode !== "all") && (
            <button className="btn-secondary" onClick={() => { setSearch(""); setFilterMode("all"); }}>Reset</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="spinner-container">
          <div className="spinner" />
          Loading stores…
        </div>
      ) : filtered.length === 0 ? (
        <div className="table-card">
          <div className="empty-state">
            <span className="empty-state-emoji">🔍</span>
            <div className="empty-state-title">No stores found</div>
            <p className="empty-state-desc">Try adjusting your search or filter to find what you're looking for.</p>
          </div>
        </div>
      ) : (
        <div className="stores-grid">
          {filtered.map((store) => (
            <StoreRatingCard key={store.id} store={store} onSubmitRating={(s) => handleRate(store.id, s)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   STORE RATING CARD (Normal User)
   ============================================================ */
function StoreRatingCard({ store, onSubmitRating }) {
  const [selected, setSelected] = useState(store.user_rating || 0);
  const [hovered,  setHovered]  = useState(0);

  useEffect(() => { setSelected(store.user_rating || 0); }, [store.user_rating]);

  const active = hovered || selected;
  const changed = selected !== (store.user_rating || 0);

  return (
    <div className="store-card">
      <div className="store-card-body">
        <div className="store-card-header">
          <div className="store-avatar">🏬</div>
          <div className="store-meta">
            <div className="store-title" title={store.name}>{store.name}</div>
            <div className="store-email">{store.email}</div>
          </div>
        </div>

        <div className="store-address-tag">
          <span className="store-address-pin">📍</span>
          <span>{store.address}</span>
        </div>

        <div className="rating-row">
          <div className="rating-score">
            <span className="score-big">{Number(store.overall_rating || 0).toFixed(1)}</span>
            <span className="score-slash">/5</span>
            <span className="score-stars">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} style={{ color: i < Math.round(store.overall_rating) ? "var(--amber-400)" : "var(--slate-200)" }}>★</span>
              ))}
            </span>
          </div>

          {store.user_rating != null ? (
            <div className="user-badge rated">
              ✓ My rating: {store.user_rating}⭐
            </div>
          ) : (
            <div className="user-badge unrated">Not rated yet</div>
          )}
        </div>
      </div>

      <div className="store-card-footer">
        <div className="star-rating-label">
          <span>{store.user_rating ? "Modify your rating" : "Rate this store"}</span>
          {active > 0 && (
            <span style={{ color: "var(--amber-500)", fontWeight: 800 }}>{active} ★</span>
          )}
        </div>
        <div className="stars-interactive">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star-btn ${star <= active ? "active" : ""}`}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setSelected(star)}
              title={`${star} star${star > 1 ? "s" : ""}`}
            >★</button>
          ))}
        </div>
        <button
          className="btn-submit-rating"
          onClick={() => onSubmitRating(selected)}
          disabled={!selected || !changed}
        >
          {store.user_rating ? "Update Rating ✓" : "Submit Rating →"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   OWNER DASHBOARD
   ============================================================ */
function OwnerDashboard({ token, user, addToast }) {
  const [data,      setData]      = useState({ stores: [], ratings: [] });
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [sortBy,    setSortBy]    = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetch(`${API}/owner/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => addToast("Failed to load dashboard", "error"))
      .finally(() => setLoading(false));
  }, []);

  const avgRating = useMemo(() => {
    if (!data.stores.length) return "0.00";
    return (data.stores.reduce((a, s) => a + Number(s.average_rating || 0), 0) / data.stores.length).toFixed(2);
  }, [data.stores]);

  const handleSort = (col) => {
    if (sortBy === col) setSortOrder((o) => o === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortOrder("asc"); }
  };

  const sortArrow = (col) => (
    <span className={`sort-icon ${sortBy === col ? "active" : ""}`}>
      {sortBy === col ? (sortOrder === "asc" ? " ▲" : " ▼") : " ▲"}
    </span>
  );

  const filteredRatings = useMemo(() => {
    return (data.ratings || [])
      .filter((r) => {
        const q = search.toLowerCase();
        return r.user_name.toLowerCase().includes(q) || r.user_email.toLowerCase().includes(q) || r.store_name.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortBy === "rating")     return sortOrder === "asc" ? a.rating - b.rating : b.rating - a.rating;
        if (sortBy === "created_at") return sortOrder === "asc" ? new Date(a.created_at) - new Date(b.created_at) : new Date(b.created_at) - new Date(a.created_at);
        const va = String(a[sortBy] || "").toLowerCase();
        const vb = String(b[sortBy] || "").toLowerCase();
        return sortOrder === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      });
  }, [data.ratings, search, sortBy, sortOrder]);

  if (loading) return <div className="spinner-container"><div className="spinner" /> Loading dashboard…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏪 Owner Dashboard</h1>
          <p className="page-desc">Monitor real-time ratings and customer feedback across your stores.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="🏬" label="Your Stores"      value={data.stores.length}  type="stores" />
        <StatCard icon="⭐" label="Average Rating"   value={Number(avgRating)}   type="ratings" />
        <StatCard icon="💬" label="Customer Reviews" value={data.ratings.length} type="reviews" />
      </div>

      {/* Your Stores */}
      <div className="section-header">
        <div className="section-title">
          Your Stores
          <span className="section-count-badge">{data.stores.length}</span>
        </div>
      </div>

      {data.stores.length === 0 ? (
        <div className="panel-box" style={{ marginBottom: "2rem" }}>
          <div className="empty-state">
            <span className="empty-state-emoji">🏬</span>
            <div className="empty-state-title">No stores assigned</div>
            <p className="empty-state-desc">Contact your administrator to have stores assigned to your account.</p>
          </div>
        </div>
      ) : (
        <div className="stores-grid" style={{ marginBottom: "2.5rem" }}>
          {data.stores.map((s) => (
            <div key={s.id} className="store-card">
              <div className="store-card-body">
                <div className="store-card-header">
                  <div className="store-avatar">🏬</div>
                  <div className="store-meta">
                    <div className="store-title" title={s.name}>{s.name}</div>
                    <div className="store-email">{s.email}</div>
                  </div>
                </div>
                <div className="store-address-tag">
                  <span className="store-address-pin">📍</span>
                  <span>{s.address}</span>
                </div>
                <div className="rating-row">
                  <div className="rating-score">
                    <span className="score-big">{Number(s.average_rating || 0).toFixed(2)}</span>
                    <span className="score-slash">/5</span>
                    <span className="score-stars">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} style={{ color: i < Math.round(s.average_rating) ? "var(--amber-400)" : "var(--slate-200)" }}>★</span>
                      ))}
                    </span>
                  </div>
                  <span className="user-badge rated">Your Store ✓</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ratings Table */}
      <div className="section-header">
        <div className="section-title">
          Customer Reviews
          <span className="section-count-badge">{data.ratings.length}</span>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input className="input-field" placeholder="Search by customer name, email, or store…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {search && <button className="btn-secondary" onClick={() => setSearch("")}>Reset</button>}
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort("user_name")}>Customer{sortArrow("user_name")}</th>
                <th className="sortable" onClick={() => handleSort("user_email")}>Email{sortArrow("user_email")}</th>
                <th className="sortable" onClick={() => handleSort("store_name")}>Store{sortArrow("store_name")}</th>
                <th className="sortable" onClick={() => handleSort("rating")}>Rating{sortArrow("rating")}</th>
                <th className="sortable" onClick={() => handleSort("created_at")}>Date{sortArrow("created_at")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRatings.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state" style={{ padding: "3rem 1rem" }}>
                      <span className="empty-state-emoji">💬</span>
                      <div className="empty-state-title">No reviews yet</div>
                      <p className="empty-state-desc">Customer ratings will appear here once submitted.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRatings.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "var(--grad-brand)", color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.68rem", fontWeight: 800, flexShrink: 0,
                        }}>{getInitials(r.user_name)}</div>
                        <strong style={{ color: "var(--slate-800)" }}>{r.user_name}</strong>
                      </div>
                    </td>
                    <td style={{ color: "var(--slate-500)", fontSize: "0.825rem" }}>{r.user_email}</td>
                    <td>
                      <span className="pill pill-purple">{r.store_name}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{
                          color: r.rating >= 4 ? "var(--amber-500)" : r.rating >= 3 ? "var(--amber-400)" : "var(--rose-400)",
                          fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.02em",
                        }}>
                          {"★".repeat(r.rating)}
                          <span style={{ color: "var(--slate-200)" }}>{"★".repeat(5 - r.rating)}</span>
                        </span>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--slate-500)" }}>
                          ({r.rating}/5)
                        </span>
                      </div>
                    </td>
                    <td style={{ color: "var(--slate-500)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;