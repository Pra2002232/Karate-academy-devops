import {
    useEffect,
    useMemo,
    useState
} from "react";

import { Navigate } from "react-router-dom";
import api from "../services/api";
import "./AdminManagement.css";

export default function AdminManagement() {

    let sessionUser = null;

    try {

        sessionUser = JSON.parse(
            localStorage.getItem("admin_user") ||
            "null"
        );

    } catch {

        sessionUser = null;

    }

    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);

    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState("users");

    const [search, setSearch] = useState("");

    const [showUserModal, setShowUserModal] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const [editingUser, setEditingUser] = useState(null);
    const [editingBranch, setEditingBranch] = useState(null);
    const [passwordUser, setPasswordUser] = useState(null);

    const [userForm, setUserForm] = useState({
        username: "",
        password: "",
        full_name: "",
        mobile: "",
        email: "",
        role: "BRANCH_ADMIN",
        branch_id: ""
    });

    const [branchForm, setBranchForm] = useState({
        branch_name: "",
        branch_code: "",
        address: "",
        contact_number: "",
        email: ""
    });

    const [newPassword, setNewPassword] = useState("");

    const token = localStorage.getItem("admin_token");

    const headers = {
        Authorization: `Bearer ${token}`
    };


    // =================================================
    // LOAD DATA
    // =================================================

    const loadData = async () => {

        try {

            setLoading(true);

            const [
                usersResponse,
                branchesResponse
            ] = await Promise.all([
                api.get("/users", { headers }),
                api.get("/branches", { headers })
            ]);

            setUsers(
                usersResponse.data?.users || []
            );

            setBranches(
                usersResponse.data?.branches
                    ? usersResponse.data.branches
                    : branchesResponse.data?.branches || []
            );

        } catch (error) {

            console.error(
                "Admin Management Error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to load administration data"
            );

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {
        loadData();
    }, []);


    // =================================================
    // USER FILTER
    // =================================================

    const filteredUsers = useMemo(() => {

        const value =
            search.trim().toLowerCase();

        if (!value) {
            return users;
        }

        return users.filter(user =>
            [
                user.username,
                user.full_name,
                user.email,
                user.role,
                user.branch_name
            ]
                .filter(Boolean)
                .some(field =>
                    String(field)
                        .toLowerCase()
                        .includes(value)
                )
        );

    }, [users, search]);


    // =================================================
    // COUNTS
    // =================================================

    const activeUsers =
        users.filter(
            user => user.status === "ACTIVE"
        ).length;

    const branchAdmins =
        users.filter(
            user => user.role === "BRANCH_ADMIN"
        ).length;

    const parents =
        users.filter(
            user => user.role === "PARENT"
        ).length;


    // =================================================
    // USER MODAL
    // =================================================

    const openCreateUser = () => {

        setEditingUser(null);

        setUserForm({
            username: "",
            password: "",
            full_name: "",
            mobile: "",
            email: "",
            role: "BRANCH_ADMIN",
            branch_id: ""
        });

        setShowUserModal(true);
    };


    const openEditUser = (user) => {

        setEditingUser(user);

        setUserForm({
            username: user.username || "",
            password: "",
            full_name: user.full_name || "",
            mobile: user.mobile || "",
            email: user.email || "",
            role: user.role || "PARENT",
            branch_id: user.branch_id || ""
        });

        setShowUserModal(true);
    };


    const closeUserModal = () => {

        setShowUserModal(false);
        setEditingUser(null);

        setUserForm({
            username: "",
            password: "",
            full_name: "",
            mobile: "",
            email: "",
            role: "BRANCH_ADMIN",
            branch_id: ""
        });
    };


    const handleUserChange = (field, value) => {

        setUserForm(prev => ({
            ...prev,
            [field]: value
        }));
    };


    const saveUser = async (event) => {

        event.preventDefault();

        try {

            if (editingUser) {

                await api.put(
                    `/users/${editingUser.id}`,
                    {
                        full_name: userForm.full_name,
                        mobile: userForm.mobile,
                        email: userForm.email,
                        role: userForm.role,
                        branch_id:
                            userForm.branch_id || null
                    },
                    { headers }
                );

                alert(
                    "User updated successfully"
                );

            } else {

                await api.post(
                    "/users",
                    {
                        username:
                            userForm.username,
                        password:
                            userForm.password,
                        full_name:
                            userForm.full_name,
                        mobile:
                            userForm.mobile,
                        email:
                            userForm.email,
                        role:
                            userForm.role,
                        branch_id:
                            userForm.branch_id || null
                    },
                    { headers }
                );

                alert(
                    "User created successfully"
                );
            }

            closeUserModal();
            loadData();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to save user"
            );
        }
    };


    // =================================================
    // PASSWORD RESET
    // =================================================

    const openPasswordModal = (user) => {

        setPasswordUser(user);
        setNewPassword("");
        setShowPasswordModal(true);
    };


    const resetPassword = async (event) => {

        event.preventDefault();

        if (newPassword.length < 6) {

            alert(
                "Password must contain at least 6 characters"
            );

            return;
        }

        try {

            await api.post(
                `/users/${passwordUser.id}/reset-password`,
                {
                    password: newPassword
                },
                { headers }
            );

            alert(
                "Password reset successfully"
            );

            setShowPasswordModal(false);
            setPasswordUser(null);
            setNewPassword("");

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to reset password"
            );
        }
    };


    // =================================================
    // USER STATUS / DELETE
    // =================================================

    const disableUser = async (user) => {

        if (
            !window.confirm(
                `Deactivate ${user.username}?`
            )
        ) {
            return;
        }

        try {

            await api.delete(
                `/users/${user.id}`,
                { headers }
            );

            loadData();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to deactivate user"
            );
        }
    };


    const activateUser = async (user) => {

        try {

            await api.put(
                `/users/${user.id}`,
                {
                    full_name: user.full_name,
                    mobile: user.mobile,
                    email: user.email,
                    role: user.role,
                    branch_id: user.branch_id,
                    status: "ACTIVE"
                },
                { headers }
            );

            loadData();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to activate user"
            );
        }
    };


    // =================================================
    // BRANCH MODAL
    // =================================================

    const openCreateBranch = () => {

        setEditingBranch(null);

        setBranchForm({
            branch_name: "",
            branch_code: "",
            address: "",
            contact_number: "",
            email: ""
        });

        setShowBranchModal(true);
    };


    const openEditBranch = (branch) => {

        setEditingBranch(branch);

        setBranchForm({
            branch_name:
                branch.branch_name || "",
            branch_code:
                branch.branch_code || "",
            address:
                branch.address || "",
            contact_number:
                branch.contact_number || "",
            email:
                branch.email || ""
        });

        setShowBranchModal(true);
    };


    const closeBranchModal = () => {

        setShowBranchModal(false);
        setEditingBranch(null);

        setBranchForm({
            branch_name: "",
            branch_code: "",
            address: "",
            contact_number: "",
            email: ""
        });
    };


    const handleBranchChange = (
        field,
        value
    ) => {

        setBranchForm(prev => ({
            ...prev,
            [field]: value
        }));
    };


    const saveBranch = async (event) => {

        event.preventDefault();

        try {

            if (editingBranch) {

                await api.put(
                    `/branches/${editingBranch.id}`,
                    branchForm,
                    { headers }
                );

                alert(
                    "Branch updated successfully"
                );

            } else {

                await api.post(
                    "/branches",
                    branchForm,
                    { headers }
                );

                alert(
                    "Branch created successfully"
                );
            }

            closeBranchModal();
            loadData();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to save branch"
            );
        }
    };


    const toggleBranch = async (branch) => {

        const nextStatus =
            branch.status === "ACTIVE"
                ? "INACTIVE"
                : "ACTIVE";

        try {

            await api.patch(
                `/branches/${branch.id}/status`,
                {
                    status: nextStatus
                },
                { headers }
            );

            loadData();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to update branch status"
            );
        }
    };


    const deleteBranch = async (branch) => {

        if (
            !window.confirm(
                `Delete ${branch.branch_name}?`
            )
        ) {
            return;
        }

        try {

            await api.delete(
                `/branches/${branch.id}`,
                { headers }
            );

            loadData();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to delete branch"
            );
        }
    };


    if (
        sessionUser?.role !==
        "SUPER_ADMIN"
    ) {

        return (
            <Navigate
                to="/"
                replace
            />
        );
    }



    // =================================================
    // LOADING
    // =================================================

    if (loading) {

        return (
            <div className="admin-page">

                <div className="admin-loading-card">

                    <div className="admin-loader"></div>

                    <h3>
                        Loading administration
                    </h3>

                    <p>
                        Preparing academy controls...
                    </p>

                </div>

            </div>
        );
    }


    // =================================================
    // RENDER
    // =================================================

    return (

        <div className="admin-page">

            {/* PAGE HEADER */}

            <div className="admin-hero">

                <div className="admin-hero-content">

                    <div className="admin-kicker">
                        SUPER ADMIN
                    </div>

                    <h1>
                        Academy Administration
                    </h1>

                    <p>
                        Manage branches, administrators
                        and parent accounts from one place.
                    </p>

                </div>


                <div className="admin-summary-grid">

                    <div className="admin-summary-card">

                        <div className="admin-summary-icon">
                            🏢
                        </div>

                        <div>
                            <strong>
                                {branches.length}
                            </strong>

                            <span>
                                Branches
                            </span>
                        </div>

                    </div>


                    <div className="admin-summary-card">

                        <div className="admin-summary-icon">
                            👥
                        </div>

                        <div>
                            <strong>
                                {users.length}
                            </strong>

                            <span>
                                Total Users
                            </span>
                        </div>

                    </div>


                    <div className="admin-summary-card">

                        <div className="admin-summary-icon">
                            🛡
                        </div>

                        <div>
                            <strong>
                                {branchAdmins}
                            </strong>

                            <span>
                                Branch Admins
                            </span>
                        </div>

                    </div>


                    <div className="admin-summary-card">

                        <div className="admin-summary-icon">
                            👨‍👩‍👧
                        </div>

                        <div>
                            <strong>
                                {parents}
                            </strong>

                            <span>
                                Parents
                            </span>

                        </div>

                    </div>

                </div>

            </div>


            {/* TABS */}

            <div className="admin-tabs">

                <button
                    className={
                        activeTab === "users"
                            ? "admin-tab active"
                            : "admin-tab"
                    }
                    onClick={() =>
                        setActiveTab("users")
                    }
                >
                    <span>👥</span>
                    User Management
                </button>


                <button
                    className={
                        activeTab === "branches"
                            ? "admin-tab active"
                            : "admin-tab"
                    }
                    onClick={() =>
                        setActiveTab("branches")
                    }
                >
                    <span>🏢</span>
                    Branch Management
                </button>

            </div>


            {/* USER MANAGEMENT */}

            {activeTab === "users" && (

                <div className="admin-section">

                    <div className="admin-section-header">

                        <div>

                            <div className="section-kicker">
                                ACCOUNTS
                            </div>

                            <h2>
                                User Management
                            </h2>

                            <p>
                                Control branch administrators
                                and parent accounts.
                            </p>

                        </div>


                        <button
                            className="admin-primary-btn"
                            onClick={openCreateUser}
                        >
                            <span>＋</span>
                            Create User
                        </button>

                    </div>


                    {/* TOOLBAR */}

                    <div className="admin-toolbar">

                        <div className="admin-search">

                            <span>
                                🔎
                            </span>

                            <input
                                value={search}
                                onChange={e =>
                                    setSearch(
                                        e.target.value
                                    )
                                }
                                placeholder={
                                    "Search users, role or branch..."
                                }
                            />

                        </div>


                        <div className="toolbar-count">

                            {filteredUsers.length}
                            {" "}
                            Accounts

                        </div>

                    </div>


                    {/* USER TABLE */}

                    <div className="admin-table-wrap">

                        <table className="admin-table">

                            <thead>

                                <tr>

                                    <th>
                                        USER
                                    </th>

                                    <th>
                                        ROLE
                                    </th>

                                    <th>
                                        BRANCH
                                    </th>

                                    <th>
                                        STATUS
                                    </th>

                                    <th>
                                        LAST LOGIN
                                    </th>

                                    <th className="actions-head">
                                        ACTIONS
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {filteredUsers.map(
                                    user => (

                                    <tr key={user.id}>

                                        <td>

                                            <div className="user-cell">

                                                <div className="user-avatar">
                                                    {(
                                                        user.full_name ||
                                                        user.username ||
                                                        "U"
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>

                                                <div>

                                                    <strong>
                                                        {user.full_name}
                                                    </strong>

                                                    <small>
                                                        @{user.username}
                                                    </small>

                                                </div>

                                            </div>

                                        </td>


                                        <td>

                                            <span
                                                className={
                                                    `role-chip role-${String(
                                                        user.role || ""
                                                    ).toLowerCase()}`
                                                }
                                            >
                                                {user.role}
                                            </span>

                                        </td>


                                        <td>

                                            <div className="branch-cell">

                                                <span>
                                                    📍
                                                </span>

                                                {
                                                    user.branch_name ||
                                                    "All Branches"
                                                }

                                            </div>

                                        </td>


                                        <td>

                                            <span
                                                className={
                                                    user.status === "ACTIVE"
                                                        ? "status-chip active"
                                                        : "status-chip inactive"
                                                }
                                            >
                                                <i></i>
                                                {user.status}
                                            </span>

                                        </td>


                                        <td>

                                            <span className="last-login">
                                                {user.last_login
                                                    ? new Date(
                                                        user.last_login
                                                    ).toLocaleDateString(
                                                        "en-IN",
                                                        {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric"
                                                        }
                                                    )
                                                    : "Never"}
                                            </span>

                                        </td>


                                        <td>

                                            <div className="row-actions">

                                                <button
                                                    className="action-btn"
                                                    onClick={() =>
                                                        openEditUser(
                                                            user
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </button>


                                                <button
                                                    className="action-btn"
                                                    onClick={() =>
                                                        openPasswordModal(
                                                            user
                                                        )
                                                    }
                                                >
                                                    Reset
                                                </button>


                                                {user.status ===
                                                "ACTIVE" ? (

                                                    <button
                                                        className="action-btn warning"
                                                        onClick={() =>
                                                            disableUser(
                                                                user
                                                            )
                                                        }
                                                    >
                                                        Disable
                                                    </button>

                                                ) : (

                                                    <button
                                                        className="action-btn success"
                                                        onClick={() =>
                                                            activateUser(
                                                                user
                                                            )
                                                        }
                                                    >
                                                        Activate
                                                    </button>

                                                )}


                                                {user.role !==
                                                "SUPER_ADMIN" && (

                                                    <button
                                                        className="action-btn danger"
                                                        onClick={() =>
                                                            disableUser(
                                                                user
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                )}

                                            </div>

                                        </td>

                                    </tr>

                                ))}


                                {filteredUsers.length === 0 && (

                                    <tr>

                                        <td
                                            colSpan="6"
                                            className="empty-table"
                                        >
                                            No users found.
                                        </td>

                                    </tr>

                                )}

                            </tbody>

                        </table>

                    </div>

                </div>
            )}


            {/* BRANCH MANAGEMENT */}

            {activeTab === "branches" && (

                <div className="admin-section">

                    <div className="admin-section-header">

                        <div>

                            <div className="section-kicker">
                                ACADEMY NETWORK
                            </div>

                            <h2>
                                Branch Management
                            </h2>

                            <p>
                                Manage academy locations
                                and branch activity.
                            </p>

                        </div>


                        <button
                            className="admin-primary-btn"
                            onClick={openCreateBranch}
                        >
                            <span>＋</span>
                            Add Branch
                        </button>

                    </div>


                    {/* BRANCH CARDS */}

                    <div className="branch-grid">

                        {branches.map(branch => {

                            const branchUsers =
                                users.filter(
                                    user =>
                                        Number(
                                            user.branch_id
                                        ) ===
                                        Number(branch.id)
                                );

                            const branchAdmins =
                                branchUsers.filter(
                                    user =>
                                        user.role ===
                                        "BRANCH_ADMIN"
                                ).length;

                            const activeBranchUsers =
                                branchUsers.filter(
                                    user =>
                                        user.status ===
                                        "ACTIVE"
                                ).length;

                            return (

                                <div
                                    className="branch-premium-card"
                                    key={branch.id}
                                >

                                    <div className="branch-card-header">

                                        <div className="branch-mark">
                                            🥋
                                        </div>

                                        <span
                                            className={
                                                branch.status ===
                                                "ACTIVE"
                                                    ? "status-chip active"
                                                    : "status-chip inactive"
                                            }
                                        >
                                            <i></i>
                                            {branch.status}
                                        </span>

                                    </div>


                                    <div className="branch-card-content">

                                        <h3>
                                            {branch.branch_name}
                                        </h3>

                                        <span className="branch-code">
                                            {branch.branch_code}
                                        </span>

                                        <p>
                                            {branch.address ||
                                                "Branch address not configured"}
                                        </p>

                                    </div>


                                    <div className="branch-metrics">

                                        <div>
                                            <strong>
                                                {branch.student_count ||
                                                    0}
                                            </strong>

                                            <span>
                                                Students
                                            </span>
                                        </div>


                                        <div>
                                            <strong>
                                                {activeBranchUsers}
                                            </strong>

                                            <span>
                                                Active Users
                                            </span>
                                        </div>


                                        <div>
                                            <strong>
                                                {branchAdmins}
                                            </strong>

                                            <span>
                                                Admins
                                            </span>
                                        </div>

                                    </div>


                                    <div className="branch-card-footer">

                                        <button
                                            className="action-btn"
                                            onClick={() =>
                                                openEditBranch(
                                                    branch
                                                )
                                            }
                                        >
                                            Edit
                                        </button>


                                        <button
                                            className={
                                                branch.status ===
                                                "ACTIVE"
                                                    ? "action-btn warning"
                                                    : "action-btn success"
                                            }
                                            onClick={() =>
                                                toggleBranch(
                                                    branch
                                                )
                                            }
                                        >
                                            {branch.status ===
                                            "ACTIVE"
                                                ? "Disable"
                                                : "Activate"}
                                        </button>


                                        <button
                                            className="action-btn danger"
                                            onClick={() =>
                                                deleteBranch(
                                                    branch
                                                )
                                            }
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>

                            );

                        })}


                        {branches.length === 0 && (

                            <div className="empty-branch">
                                No branches configured.
                            </div>

                        )}

                    </div>

                </div>
            )}


            {/* =================================================
                USER MODAL
               ================================================= */}

            {showUserModal && (

                <div className="admin-modal-overlay">

                    <div className="admin-modal">

                        <div className="admin-modal-header">

                            <div>

                                <div className="section-kicker">
                                    USER ACCOUNT
                                </div>

                                <h2>
                                    {editingUser
                                        ? "Edit User"
                                        : "Create User"}
                                </h2>

                            </div>


                            <button
                                className="modal-close"
                                onClick={closeUserModal}
                            >
                                ×
                            </button>

                        </div>


                        <form
                            className="admin-form"
                            onSubmit={saveUser}
                        >

                            {!editingUser && (

                                <div className="form-field">

                                    <label>
                                        Username
                                    </label>

                                    <input
                                        value={
                                            userForm.username
                                        }
                                        onChange={e =>
                                            handleUserChange(
                                                "username",
                                                e.target.value
                                            )
                                        }
                                        required
                                    />

                                </div>
                            )}


                            {!editingUser && (

                                <div className="form-field">

                                    <label>
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        value={
                                            userForm.password
                                        }
                                        onChange={e =>
                                            handleUserChange(
                                                "password",
                                                e.target.value
                                            )
                                        }
                                        required
                                    />

                                </div>
                            )}


                            <div className="form-field">

                                <label>
                                    Full Name
                                </label>

                                <input
                                    value={
                                        userForm.full_name
                                    }
                                    onChange={e =>
                                        handleUserChange(
                                            "full_name",
                                            e.target.value
                                        )
                                    }
                                    required
                                />

                            </div>


                            <div className="form-two">

                                <div className="form-field">

                                    <label>
                                        Mobile
                                    </label>

                                    <input
                                        value={
                                            userForm.mobile
                                        }
                                        onChange={e =>
                                            handleUserChange(
                                                "mobile",
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>


                                <div className="form-field">

                                    <label>
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        value={
                                            userForm.email
                                        }
                                        onChange={e =>
                                            handleUserChange(
                                                "email",
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>

                            </div>


                            <div className="form-two">

                                <div className="form-field">

                                    <label>
                                        Role
                                    </label>

                                    <select
                                        value={
                                            userForm.role
                                        }
                                        onChange={e =>
                                            handleUserChange(
                                                "role",
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option value="BRANCH_ADMIN">
                                            Branch Admin
                                        </option>

                                        <option value="PARENT">
                                            Parent
                                        </option>

                                    </select>

                                </div>


                                <div className="form-field">

                                    <label>
                                        Branch
                                    </label>

                                    <select
                                        value={
                                            userForm.branch_id
                                        }
                                        onChange={e =>
                                            handleUserChange(
                                                "branch_id",
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option value="">
                                            All / Not Assigned
                                        </option>

                                        {branches.map(
                                            branch => (

                                            <option
                                                key={branch.id}
                                                value={branch.id}
                                            >
                                                {
                                                    branch.branch_name
                                                }
                                            </option>

                                        ))}

                                    </select>

                                </div>

                            </div>


                            <div className="admin-modal-actions">

                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={
                                        closeUserModal
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="primary-btn"
                                >
                                    {editingUser
                                        ? "Save Changes"
                                        : "Create User"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {/* =================================================
                PASSWORD MODAL
               ================================================= */}

            {showPasswordModal && (

                <div className="admin-modal-overlay">

                    <div className="admin-modal small">

                        <div className="admin-modal-header">

                            <div>

                                <div className="section-kicker">
                                    SECURITY
                                </div>

                                <h2>
                                    Reset Password
                                </h2>

                            </div>


                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowPasswordModal(
                                        false
                                    )
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            className="admin-form"
                            onSubmit={resetPassword}
                        >

                            <div className="password-user">

                                <div className="user-avatar large">
                                    {passwordUser?.full_name
                                        ?.charAt(0)
                                        ?.toUpperCase() ||
                                        "U"}
                                </div>

                                <div>

                                    <strong>
                                        {passwordUser?.full_name}
                                    </strong>

                                    <span>
                                        @{passwordUser?.username}
                                    </span>

                                </div>

                            </div>


                            <div className="form-field">

                                <label>
                                    New Password
                                </label>

                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e =>
                                        setNewPassword(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Minimum 6 characters"
                                    required
                                />

                            </div>


                            <div className="admin-modal-actions">

                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() =>
                                        setShowPasswordModal(
                                            false
                                        )
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="primary-btn"
                                >
                                    Reset Password
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {/* =================================================
                BRANCH MODAL
               ================================================= */}

            {showBranchModal && (

                <div className="admin-modal-overlay">

                    <div className="admin-modal">

                        <div className="admin-modal-header">

                            <div>

                                <div className="section-kicker">
                                    ACADEMY BRANCH
                                </div>

                                <h2>
                                    {editingBranch
                                        ? "Edit Branch"
                                        : "Create Branch"}
                                </h2>

                            </div>


                            <button
                                className="modal-close"
                                onClick={
                                    closeBranchModal
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            className="admin-form"
                            onSubmit={saveBranch}
                        >

                            <div className="form-two">

                                <div className="form-field">

                                    <label>
                                        Branch Name
                                    </label>

                                    <input
                                        value={
                                            branchForm.branch_name
                                        }
                                        onChange={e =>
                                            handleBranchChange(
                                                "branch_name",
                                                e.target.value
                                            )
                                        }
                                        required
                                    />

                                </div>


                                <div className="form-field">

                                    <label>
                                        Branch Code
                                    </label>

                                    <input
                                        value={
                                            branchForm.branch_code
                                        }
                                        onChange={e =>
                                            handleBranchChange(
                                                "branch_code",
                                                e.target.value
                                            )
                                        }
                                        required
                                    />

                                </div>

                            </div>


                            <div className="form-field">

                                <label>
                                    Address
                                </label>

                                <textarea
                                    value={
                                        branchForm.address
                                    }
                                    onChange={e =>
                                        handleBranchChange(
                                            "address",
                                            e.target.value
                                        )
                                    }
                                />

                            </div>


                            <div className="form-two">

                                <div className="form-field">

                                    <label>
                                        Contact Number
                                    </label>

                                    <input
                                        value={
                                            branchForm.contact_number
                                        }
                                        onChange={e =>
                                            handleBranchChange(
                                                "contact_number",
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>


                                <div className="form-field">

                                    <label>
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        value={
                                            branchForm.email
                                        }
                                        onChange={e =>
                                            handleBranchChange(
                                                "email",
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>

                            </div>


                            <div className="admin-modal-actions">

                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={
                                        closeBranchModal
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="primary-btn"
                                >
                                    {editingBranch
                                        ? "Save Changes"
                                        : "Create Branch"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}
