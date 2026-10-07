import React, {
    useEffect,
    useState
} from "react";

import api from "../services/api";


export default function UserManagement() {

    const [users, setUsers] =
        useState([]);

    const [branches, setBranches] =
        useState([]);

    const [activity, setActivity] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [showForm, setShowForm] =
        useState(false);

    const [form, setForm] = useState({
        username: "",
        password: "",
        full_name: "",
        mobile: "",
        email: "",
        role: "BRANCH_ADMIN",
        branch_id: ""
    });


    const loadData = async () => {

        try {

            setLoading(true);

            const [
                usersResponse,
                branchResponse
            ] = await Promise.all([
                api.get("/users"),
                api.get("/users/branch-activity")
            ]);

            setUsers(
                usersResponse.data.users || []
            );

            setActivity(
                branchResponse.data.branches || []
            );

        } catch (error) {

            console.error(
                "User management error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to load user management"
            );

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {
        loadData();
    }, []);


    const handleChange = (e) => {

        setForm({
            ...form,
            [e.target.name]:
                e.target.value
        });
    };


    const createUser = async (e) => {

        e.preventDefault();

        try {

            await api.post(
                "/users",
                form
            );

            alert(
                "User created successfully"
            );

            setForm({
                username: "",
                password: "",
                full_name: "",
                mobile: "",
                email: "",
                role: "BRANCH_ADMIN",
                branch_id: ""
            });

            setShowForm(false);

            loadData();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Failed to create user"
            );
        }
    };


    const resetPassword = async (user) => {

        const password =
            window.prompt(
                `Enter new password for ${user.username}:`
            );

        if (!password) {
            return;
        }

        try {

            await api.post(
                `/users/${user.id}/reset-password`,
                { password }
            );

            alert(
                "Password reset successfully"
            );

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Password reset failed"
            );
        }
    };


    const deactivateUser = async (user) => {

        if (
            !window.confirm(
                `Deactivate ${user.username}?`
            )
        ) {
            return;
        }

        try {

            await api.delete(
                `/users/${user.id}`
            );

            loadData();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Failed to deactivate user"
            );
        }
    };


    if (loading) {

        return (
            <div style={{
                padding: 30
            }}>
                Loading user management...
            </div>
        );
    }


    return (
        <div
            style={{
                padding: "30px",
                maxWidth: "1400px",
                margin: "0 auto"
            }}
        >

            <div
                style={{
                    display: "flex",
                    justifyContent:
                        "space-between",
                    alignItems: "center",
                    marginBottom: 25
                }}
            >

                <div>

                    <h1>
                        User Management
                    </h1>

                    <p>
                        Manage branch administrators
                        and parent accounts.
                    </p>

                </div>


                <button
                    onClick={() =>
                        setShowForm(!showForm)
                    }
                >
                    + Create User
                </button>

            </div>


            {showForm && (

                <form
                    onSubmit={createUser}
                    style={{
                        background: "#fff",
                        padding: 25,
                        borderRadius: 12,
                        marginBottom: 30
                    }}
                >

                    <h2>
                        Create User
                    </h2>


                    <input
                        name="full_name"
                        placeholder="Full Name"
                        value={form.full_name}
                        onChange={handleChange}
                        required
                    />


                    <input
                        name="username"
                        placeholder="Username"
                        value={form.username}
                        onChange={handleChange}
                        required
                    />


                    <input
                        name="password"
                        type="password"
                        placeholder="Temporary Password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />


                    <input
                        name="mobile"
                        placeholder="Mobile"
                        value={form.mobile}
                        onChange={handleChange}
                    />


                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                    />


                    <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                    >

                        <option value="BRANCH_ADMIN">
                            Branch Admin
                        </option>

                        <option value="PARENT">
                            Parent
                        </option>

                    </select>


                    {form.role ===
                        "BRANCH_ADMIN" && (

                        <input
                            name="branch_id"
                            placeholder="Branch ID"
                            value={form.branch_id}
                            onChange={handleChange}
                            required
                        />

                    )}


                    <br /><br />

                    <button type="submit">
                        Create User
                    </button>

                </form>
            )}


            <section>

                <h2>
                    Branch Activity
                </h2>


                <table
                    border="1"
                    cellPadding="10"
                    style={{
                        width: "100%",
                        background: "#fff",
                        marginBottom: 35
                    }}
                >

                    <thead>

                        <tr>
                            <th>Branch</th>
                            <th>Code</th>
                            <th>Total Students</th>
                            <th>Active Students</th>
                            <th>Branch Admins</th>
                            <th>Status</th>
                        </tr>

                    </thead>


                    <tbody>

                        {activity.map(
                            branch => (

                            <tr key={branch.id}>

                                <td>
                                    {branch.branch_name}
                                </td>

                                <td>
                                    {branch.branch_code}
                                </td>

                                <td>
                                    {branch.total_students}
                                </td>

                                <td>
                                    {branch.active_students}
                                </td>

                                <td>
                                    {branch.branch_admins}
                                </td>

                                <td>
                                    {branch.status}
                                </td>

                            </tr>
                        ))}

                    </tbody>

                </table>

            </section>


            <section>

                <h2>
                    Accounts
                </h2>


                <table
                    border="1"
                    cellPadding="10"
                    style={{
                        width: "100%",
                        background: "#fff"
                    }}
                >

                    <thead>

                        <tr>
                            <th>Username</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Branch</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th>Actions</th>
                        </tr>

                    </thead>


                    <tbody>

                        {users.map(
                            user => (

                            <tr key={user.id}>

                                <td>
                                    {user.username}
                                </td>

                                <td>
                                    {user.full_name}
                                </td>

                                <td>
                                    {user.role}
                                </td>

                                <td>
                                    {user.branch_name ||
                                        "All Branches"}
                                </td>

                                <td>
                                    {user.status}
                                </td>

                                <td>
                                    {user.last_login ||
                                        "Never"}
                                </td>

                                <td>

                                    <button
                                        onClick={() =>
                                            resetPassword(
                                                user
                                            )
                                        }
                                    >
                                        Reset Password
                                    </button>


                                    {" "}


                                    {user.role !==
                                        "SUPER_ADMIN" && (

                                        <button
                                            onClick={() =>
                                                deactivateUser(
                                                    user
                                                )
                                            }
                                        >
                                            Deactivate
                                        </button>

                                    )}

                                </td>

                            </tr>
                        ))}

                    </tbody>

                </table>

            </section>

        </div>
    );
}
