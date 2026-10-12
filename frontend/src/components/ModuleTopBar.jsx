import React from "react";

function Icon({ children, className = "" }) {
    return (
        <svg
            className={`module-topbar-icon ${className}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {children}
        </svg>
    );
}

export default function ModuleTopBar({
    moduleName = "Dashboard"
}) {

    let user = {};

    try {
        user = JSON.parse(
            localStorage.getItem("admin_user") || "{}"
        );
    } catch {
        user = {};
    }

    const fullName =
        user.full_name ||
        user.fullName ||
        "Academy Admin";

    let role = "Administrator";

    if (user.role === "SUPER_ADMIN") {
        role = "Super Administrator";
    } else if (user.role === "BRANCH_ADMIN") {
        role = "Branch Administrator";
    } else if (user.role === "PARENT") {
        role = "Parent";
    }

    const initials =
        fullName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(
                part =>
                    part.charAt(0).toUpperCase()
            )
            .join("") || "A";

    return (
        <header className="topbar module-topbar">

            <div className="module-breadcrumb">

                <span className="module-breadcrumb-root">
                    ACADEMY
                </span>

                <span className="module-breadcrumb-separator">
                    /
                </span>

                <strong className="module-breadcrumb-current">
                    {moduleName}
                </strong>

            </div>

            <div className="topbar-right">

                <button
                    className="icon-button"
                    type="button"
                    aria-label="Notifications"
                >

                    <Icon>

                        <path
                            d="
                                M18 8
                                a6 6 0 0 0-12 0
                                c0 7-3 7-3 9
                                h18
                                c0-2-3-2-3-9
                            "
                        />

                        <path d="M10 21h4" />

                    </Icon>

                    <span className="notification-dot"></span>

                </button>

                <div className="topbar-divider"></div>

                <div className="topbar-user">

                    <div
                        className="topbar-avatar"
                        title={fullName}
                        aria-label={fullName}
                    >
                        {initials}
                    </div>

                    <div className="topbar-user-info">

                        <strong>
                            {fullName}
                        </strong>

                        <span>
                            {role}
                        </span>

                    </div>

                    <Icon className="chevron">

                        <path d="m6 9 6 6 6-6" />

                    </Icon>

                </div>

            </div>

        </header>
    );
}
