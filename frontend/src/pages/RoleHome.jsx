import Dashboard from "./Dashboard";
import BranchDashboard from "./BranchDashboard";
import ParentDashboard from "./ParentDashboard";

export default function RoleHome() {

    let user = null;

    try {

        user = JSON.parse(
            localStorage.getItem("admin_user") ||
            "null"
        );

    } catch {

        user = null;

    }


    if (
        user?.role ===
        "BRANCH_ADMIN"
    ) {

        return (
            <BranchDashboard />
        );
    }


    if (
        user?.role ===
        "PARENT"
    ) {

        return (
            <ParentDashboard />
        );
    }


    return (
        <Dashboard />
    );
}
