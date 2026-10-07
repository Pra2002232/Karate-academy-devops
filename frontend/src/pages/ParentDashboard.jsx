import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./ParentDashboard.css";

function formatDate(value) {

    if (!value) return "—";

    return new Date(
        `${String(value).slice(0, 10)}T00:00:00`
    ).toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatFeeType(value) {

    const labels = {
        MONTHLY: "Monthly Fees",
        COSTUME: "Costume Fees",
        COMPETITION: "Competition Fees"
    };

    return labels[value] || value || "Fee";
}


function formatMonth(month, year) {

    if (!month || !year) {

        return "Fee";

    }

    return new Date(
        Number(year),
        Number(month) - 1,
        1
    ).toLocaleDateString(
        "en-IN",
        {
            month: "long",
            year: "numeric"
        }
    );
}


export default function ParentDashboard() {

    const [dashboard, setDashboard] =
        useState(null);

    const [selectedChildId, setSelectedChildId] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");


    const loadDashboard = async () => {

        try {

            const response =
                await api.get(
                    "/parents/dashboard"
                );

            const data =
                response.data || {};

            setDashboard(data);

            if (
                !selectedChildId &&
                data.children?.length
            ) {

                setSelectedChildId(
                    data.children[0].id
                );
            }

            setError("");

        } catch (err) {

            console.error(
                "Parent dashboard:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to load your child's information."
            );

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {

        loadDashboard();

        const refresh =
            setInterval(
                loadDashboard,
                30000
            );

        return () =>
            clearInterval(refresh);

    }, []);


    const children =
        dashboard?.children || [];


    const selectedChild =
        children.find(
            child =>
                child.id === selectedChildId
        ) || children[0];


    const pendingAmount =
        useMemo(() => {

            if (!selectedChild) return 0;

            return (
                selectedChild
                    .fees
                    ?.pending || []
            ).reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.amount || 0
                    ),
                0
            );

        }, [selectedChild]);


    const completedAmount =
        useMemo(() => {

            if (!selectedChild) return 0;

            return (
                selectedChild
                    .fees
                    ?.completed || []
            ).reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.amount || 0
                    ),
                0
            );

        }, [selectedChild]);


    const logout = () => {

        localStorage.removeItem(
            "admin_token"
        );

        localStorage.removeItem(
            "admin_user"
        );

        window.location.href =
            "/parent-login";
    };


    if (loading && !dashboard) {

        return (
            <div className="parent-dashboard-page">
                <div className="parent-loading">
                    <div className="parent-loading-mark">
                        🥋
                    </div>

                    <h2>
                        Loading your child's portal
                    </h2>

                    <p>
                        Fetching the latest academy updates...
                    </p>
                </div>
            </div>
        );
    }


    if (error && !dashboard) {

        return (
            <div className="parent-dashboard-page">
                <div className="parent-error-state">

                    <div className="parent-state-icon">
                        !
                    </div>

                    <h2>
                        Unable to load portal
                    </h2>

                    <p>
                        {error}
                    </p>

                    <button
                        onClick={loadDashboard}
                    >
                        Try Again
                    </button>

                </div>
            </div>
        );
    }


    if (!selectedChild) {

        return (
            <div className="parent-dashboard-page">

                <header className="parent-topbar">

                    <div className="parent-brand">
                        <div className="parent-brand-mark">
                            空
                        </div>

                        <div>
                            <strong>
                                USKAI
                            </strong>

                            <span>
                                PARENT PORTAL
                            </span>
                        </div>
                    </div>

                    <button
                        className="parent-logout"
                        onClick={logout}
                    >
                        Sign out
                    </button>

                </header>

                <div className="parent-empty-state">

                    <div className="parent-state-icon">
                        👤
                    </div>

                    <h2>
                        No linked child found
                    </h2>

                    <p>
                        Your parent account has not
                        been linked to a student yet.
                        Please contact the academy.
                    </p>

                    <button
                        onClick={logout}
                    >
                        Sign out
                    </button>

                </div>

            </div>
        );
    }


    const attendanceSummary =
        selectedChild.attendance
            ?.summary || {
                total: 0,
                present: 0,
                absent: 0,
                late: 0,
                rate: 0
            };


    const upcomingCompetitions =
        selectedChild.competitions
            ?.upcoming || [];


    const results =
        selectedChild.competitions
            ?.results || [];


    const beltHistory =
        selectedChild.growth
            ?.history || [];


    const attendanceRecords =
        selectedChild.attendance
            ?.records || [];


    const pendingFees =
        selectedChild.fees
            ?.pending || [];


    const completedFees =
        selectedChild.fees
            ?.completed || [];


    return (

        <div className="parent-dashboard-page">

            <header className="parent-topbar">

                <div className="parent-brand">

                    <div className="parent-brand-mark">
                        空
                    </div>

                    <div>
                        <strong>
                            UNITED SHOTOKAN
                        </strong>

                        <span>
                            PARENT PORTAL
                        </span>
                    </div>

                </div>


                <div className="parent-topbar-right">

                    <div className="parent-user">

                        <div className="parent-avatar">
                            {
                                dashboard
                                    ?.parent
                                    ?.full_name
                                    ?.split(" ")
                                    ?.slice(0, 2)
                                    ?.map(
                                        value =>
                                            value[0]
                                    )
                                    ?.join("")
                                    ?.toUpperCase()
                                    || "P"
                            }
                        </div>

                        <div>
                            <strong>
                                {
                                    dashboard
                                        ?.parent
                                        ?.full_name
                                    || "Parent"
                                }
                            </strong>

                            <span>
                                Family Account
                            </span>
                        </div>

                    </div>


                    <button
                        className="parent-logout"
                        onClick={logout}
                    >
                        Sign out
                    </button>

                </div>

            </header>


            <main className="parent-main">

                <section className="parent-welcome">

                    <div>

                        <span>
                            YOUR CHILD'S JOURNEY
                        </span>

                        <h1>
                            Welcome to the
                            Parent Portal
                        </h1>

                        <p>
                            Stay connected with
                            training, attendance,
                            progress and achievements.
                        </p>

                    </div>


                    <div className="parent-live-status">
                        <i />
                        Live academy updates
                    </div>

                </section>


                {children.length > 1 && (

                    <section className="parent-child-selector">

                        <div>
                            <span>
                                CHILDREN
                            </span>

                            <strong>
                                Select a child
                            </strong>
                        </div>

                        <select
                            value={
                                selectedChildId ||
                                ""
                            }
                            onChange={event =>
                                setSelectedChildId(
                                    Number(
                                        event.target.value
                                    )
                                )
                            }
                        >

                            {children.map(child => (

                                <option
                                    key={child.id}
                                    value={child.id}
                                >
                                    {child.name}
                                    {" • "}
                                    {child.studentCode}
                                </option>

                            ))}

                        </select>

                    </section>

                )}


                <section className="parent-student-card">

                    <div className="parent-student-identity">

                        <div className="parent-student-avatar">
                            {
                                selectedChild.name
                                    ?.split(" ")
                                    ?.slice(0, 2)
                                    ?.map(
                                        value =>
                                            value[0]
                                    )
                                    ?.join("")
                                    ?.toUpperCase()
                            }
                        </div>

                        <div>

                            <span>
                                STUDENT PROFILE
                            </span>

                            <h2>
                                {selectedChild.name}
                            </h2>

                            <p>
                                {selectedChild.studentCode}
                                {" • "}
                                {selectedChild.batch || "Batch"}
                                {" • "}
                                {selectedChild.branchName || "Academy"}
                            </p>

                        </div>

                    </div>


                    <div className="parent-student-belt">

                        <span>
                            CURRENT BELT
                        </span>

                        <strong>
                            {selectedChild.belt || "WHITE"}
                        </strong>

                    </div>

                </section>


                <section className="parent-stats-grid">

                    <div className="parent-stat-card">

                        <div className="parent-stat-icon">
                            %
                        </div>

                        <div>
                            <span>
                                ATTENDANCE RATE
                            </span>

                            <strong>
                                {attendanceSummary.rate}%
                            </strong>
                        </div>

                    </div>


                    <div className="parent-stat-card">

                        <div className="parent-stat-icon">
                            ✓
                        </div>

                        <div>
                            <span>
                                PRESENT DAYS
                            </span>

                            <strong>
                                {attendanceSummary.present}
                            </strong>
                        </div>

                    </div>


                    <div className="parent-stat-card">

                        <div className="parent-stat-icon">
                            ◈
                        </div>

                        <div>
                            <span>
                                BELT PROGRESS
                            </span>

                            <strong>
                                {beltHistory.length}
                            </strong>

                            <small>
                                recorded promotions
                            </small>
                        </div>

                    </div>


                    <div className="parent-stat-card">

                        <div className="parent-stat-icon">
                            ₹
                        </div>

                        <div>
                            <span>
                                PENDING FEES
                            </span>

                            <strong>
                                ₹
                                {pendingAmount.toLocaleString(
                                    "en-IN"
                                )}
                            </strong>
                        </div>

                    </div>

                </section>


                <section className="parent-content-grid">

                    <div className="parent-panel">

                        <div className="parent-panel-heading">

                            <div>

                                <span>
                                    ATTENDANCE
                                </span>

                                <h3>
                                    Daily attendance
                                </h3>

                            </div>

                            <div className="parent-attendance-rate">
                                {attendanceSummary.rate}%
                            </div>

                        </div>


                        <div className="parent-attendance-summary">

                            <div>
                                <b>
                                    {attendanceSummary.present}
                                </b>
                                <span>
                                    Present
                                </span>
                            </div>

                            <div>
                                <b>
                                    {attendanceSummary.late}
                                </b>
                                <span>
                                    Late
                                </span>
                            </div>

                            <div>
                                <b>
                                    {attendanceSummary.absent}
                                </b>
                                <span>
                                    Absent
                                </span>
                            </div>

                            <div>
                                <b>
                                    {attendanceSummary.total}
                                </b>
                                <span>
                                    Total
                                </span>
                            </div>

                        </div>


                        <div className="parent-table">

                            {attendanceRecords.length === 0 ? (

                                <div className="parent-empty-row">
                                    No attendance records yet.
                                </div>

                            ) : (

                                attendanceRecords
                                    .slice(0, 12)
                                    .map(record => (

                                        <div
                                            className="parent-row"
                                            key={record.id}
                                        >

                                            <span>
                                                {formatDate(
                                                    record.date
                                                )}
                                            </span>

                                            <span
                                                className={
                                                    `parent-status ${String(
                                                        record.status
                                                    ).toLowerCase()}`
                                                }
                                            >
                                                {record.status}
                                            </span>

                                        </div>

                                    ))

                            )}

                        </div>

                    </div>


                    <div className="parent-panel">

                        <div className="parent-panel-heading">

                            <div>

                                <span>
                                    PROGRESS
                                </span>

                                <h3>
                                    Growth & belt history
                                </h3>

                            </div>

                            <div className="parent-belt-pill">
                                {selectedChild.belt}
                            </div>

                        </div>


                        <div className="parent-progress-current">

                            <span>
                                Current belt
                            </span>

                            <strong>
                                {selectedChild.belt}
                            </strong>

                        </div>


                        <div className="parent-timeline">

                            {beltHistory.length === 0 ? (

                                <div className="parent-empty-row">
                                    No belt history recorded yet.
                                </div>

                            ) : (

                                beltHistory
                                    .slice(0, 8)
                                    .map(item => (

                                        <div
                                            className="parent-timeline-item"
                                            key={item.id}
                                        >

                                            <div className="parent-timeline-dot" />

                                            <div>

                                                <strong>
                                                    {item.previousBelt || "Start"}
                                                    {" → "}
                                                    {item.newBelt}
                                                </strong>

                                                <span>
                                                    {formatDate(
                                                        item.gradingDate
                                                    )}
                                                </span>

                                                {item.remarks && (

                                                    <p>
                                                        {item.remarks}
                                                    </p>

                                                )}

                                            </div>

                                        </div>

                                    ))

                            )}

                        </div>

                    </div>

                </section>


                <section className="parent-content-grid">

                    <div className="parent-panel">

                        <div className="parent-panel-heading">

                            <div>

                                <span>
                                    FEES
                                </span>

                                <h3>
                                    Pending fees
                                </h3>

                            </div>

                            <div className="parent-money-danger">
                                ₹{pendingAmount.toLocaleString("en-IN")}
                            </div>

                        </div>


                        <div className="parent-table">

                            {pendingFees.length === 0 ? (

                                <div className="parent-empty-row success-row">
                                    No pending fees.
                                </div>

                            ) : (

                                pendingFees.map(item => (

                                    <div
                                        className="parent-fee-row"
                                        key={item.id}
                                    >

                                        <div>

                                            <strong>
                                                {formatFeeType(
                                                    item.feeType
                                                )}
                                            </strong>

                                            <span>
                                                {
                                                    item.month &&
                                                    item.year
                                                        ? formatMonth(
                                                            item.month,
                                                            item.year
                                                        )
                                                        : (
                                                            item.description ||
                                                            "Fee record"
                                                        )
                                                }
                                            </span>

                                        </div>

                                        <b>
                                            ₹
                                            {Number(
                                                item.amount || 0
                                            ).toLocaleString(
                                                "en-IN"
                                            )}
                                        </b>

                                    </div>

                                ))

                            )}

                        </div>

                    </div>


                    <div className="parent-panel">

                        <div className="parent-panel-heading">

                            <div>

                                <span>
                                    FEES
                                </span>

                                <h3>
                                    Completed fees
                                </h3>

                            </div>

                            <div className="parent-money-success">
                                ₹{completedAmount.toLocaleString("en-IN")}
                            </div>

                        </div>


                        <div className="parent-table">

                            {completedFees.length === 0 ? (

                                <div className="parent-empty-row">
                                    No completed payments yet.
                                </div>

                            ) : (

                                completedFees
                                    .slice(0, 8)
                                    .map(item => (

                                        <div
                                            className="parent-fee-row"
                                            key={item.id}
                                        >

                                            <div>

                                                <strong>
                                                    {formatFeeType(
                                                        item.feeType
                                                    )}
                                                </strong>

                                                <span>
                                                    {formatDate(
                                                        item.paidDate
                                                    )}
                                                </span>

                                            </div>

                                            <b>
                                                ₹
                                                {Number(
                                                    item.amount || 0
                                                ).toLocaleString(
                                                    "en-IN"
                                                )}
                                            </b>

                                        </div>

                                    ))

                            )}

                        </div>

                    </div>

                </section>


                <section className="parent-content-grid">

                    <div className="parent-panel">

                        <div className="parent-panel-heading">

                            <div>

                                <span>
                                    UPCOMING
                                </span>

                                <h3>
                                    Competitions
                                </h3>

                            </div>

                        </div>


                        <div className="parent-competition-list">

                            {upcomingCompetitions.length === 0 ? (

                                <div className="parent-empty-row">
                                    No upcoming competitions.
                                </div>

                            ) : (

                                upcomingCompetitions
                                    .slice(0, 8)
                                    .map(item => (

                                        <div
                                            className="parent-competition-item"
                                            key={item.id}
                                        >

                                            <div className="parent-date-box">

                                                <b>
                                                    {new Date(
                                                        `${String(item.date).slice(0, 10)}T00:00:00`
                                                    ).getDate()}
                                                </b>

                                                <span>
                                                    {new Date(
                                                        `${String(item.date).slice(0, 10)}T00:00:00`
                                                    ).toLocaleDateString(
                                                        "en-IN",
                                                        {
                                                            month: "short"
                                                        }
                                                    )}
                                                </span>

                                            </div>

                                            <div>

                                                <strong>
                                                    {item.name}
                                                </strong>

                                                <span>
                                                    {item.location || "Location to be announced"}
                                                </span>

                                                {item.participating && (

                                                    <em>
                                                        Registered participant
                                                    </em>

                                                )}

                                            </div>

                                        </div>

                                    ))

                            )}

                        </div>

                    </div>


                    <div className="parent-panel">

                        <div className="parent-panel-heading">

                            <div>

                                <span>
                                    ACHIEVEMENTS
                                </span>

                                <h3>
                                    Competition results
                                </h3>

                            </div>

                        </div>


                        <div className="parent-results-list">

                            {results.length === 0 ? (

                                <div className="parent-empty-row">
                                    No competition results yet.
                                </div>

                            ) : (

                                results
                                    .slice(0, 8)
                                    .map(item => (

                                        <div
                                            className="parent-result-item"
                                            key={item.id}
                                        >

                                            <div>

                                                <strong>
                                                    {item.competitionName}
                                                </strong>

                                                <span>
                                                    {
                                                        formatDate(
                                                            item.competitionDate
                                                        )
                                                    }
                                                    {" • "}
                                                    {item.event || "Event"}
                                                </span>

                                            </div>


                                            <div className="parent-result-value">

                                                <b>
                                                    {item.medal || item.result || "Result"}
                                                </b>

                                                {item.position && (

                                                    <span>
                                                        Position {item.position}
                                                    </span>

                                                )}

                                            </div>

                                        </div>

                                    ))

                            )}

                        </div>

                    </div>

                </section>


                <section className="parent-readonly-note">

                    <div className="parent-readonly-icon">
                        🔒
                    </div>

                    <div>

                        <strong>
                            Parent account is view-only
                        </strong>

                        <p>
                            Attendance, fees, belt progression,
                            competitions and results are maintained
                            by the Super Admin or respective Branch Admin.
                            Updates appear here automatically.
                        </p>

                    </div>

                </section>


                <footer className="parent-footer">

                    <span>
                        UNITED SHOTOKAN KARATE ASSOCIATION INDIA
                    </span>

                    <span>
                        Parent Portal • Secure View-Only Access
                    </span>

                </footer>

            </main>

        </div>
    );
}
