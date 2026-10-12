import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./BranchDashboard.css";

import CompetitionDashboardWidget from "../components/CompetitionDashboardWidget";
import LiveUpcomingCompetitions from "../components/LiveUpcomingCompetitions";
import BranchUpcomingCompetitions from "../components/BranchUpcomingCompetitions";
export default function BranchDashboard() {

    const user = JSON.parse(
        localStorage.getItem("admin_user") || "null"
    );

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const loadStudents = async () => {

            try {

                const response =
                    await api.get("/students");

                setStudents(
                    response.data?.students || []
                );

            } catch (error) {

                console.error(
                    "Branch Dashboard Error:",
                    error
                );

            } finally {

                setLoading(false);

            }

        };

        if (user?.role === "BRANCH_ADMIN") {
            loadStudents();
        } else {
            setLoading(false);
        }

    }, []);


    const activeStudents = useMemo(
        () =>
            students.filter(
                student =>
                    student.status === "ACTIVE"
            ).length,
        [students]
    );


    const inactiveStudents = useMemo(
        () =>
            students.filter(
                student =>
                    student.status !== "ACTIVE"
            ).length,
        [students]
    );


    const beltDistribution = useMemo(() => {

        return students.reduce(
            (result, student) => {

                const belt =
                    student.belt || "WHITE";

                result[belt] =
                    (result[belt] || 0) + 1;

                return result;

            },
            {}
        );

    }, [students]);


    const branchName =
        user?.branch_name ||
        "My Branch";

    const branchCode =
        user?.branch_code ||
        "BRANCH";


    if (user?.role !== "BRANCH_ADMIN") {

        return (
            <div className="branch-dashboard-page">

            <BranchUpcomingCompetitions />


                
                <section className="branch-upcoming-competitions">

                    <div className="branch-upcoming-header">

                        <div>

                            <h2>
                                Upcoming Competitions
                            </h2>

                            <p>
                                Your branch competition schedule
                            </p>

                        </div>

                        <a href="/competitions">
                            Manage →
                        </a>

                    </div>

                    <div className="events-list branch-events-list">

                        <LiveUpcomingCompetitions
                            compact={true}
                        />

                    </div>

                </section>

                <CompetitionDashboardWidget />
                <div className="branch-access-card">
                    <h2>Access Restricted</h2>
                    <p>
                        This page is available only to
                        Branch Administrators.
                    </p>
                </div>
            </div>
        );

    }


    if (loading) {

        return (
            <div className="branch-dashboard-page">

                <div className="branch-loading-card">

                    <div className="branch-spinner"></div>

                    <h3>
                        Loading branch dashboard
                    </h3>

                    <p>
                        Preparing your branch information...
                    </p>

                </div>

            </div>
        );
    }


    return (

        <div className="branch-dashboard-page">

            {/* =========================================
                HEADER
               ========================================= */}

            <div className="branch-dashboard-header">

                <div className="branch-title-area">

                    <div className="branch-kicker">
                        BRANCH ADMINISTRATION
                    </div>

                    <h1>
                        {branchName}
                    </h1>

                    <p>
                        Manage students and daily academy
                        operations for your assigned branch.
                    </p>

                    <span className="branch-code">
                        {branchCode}
                    </span>

                </div>


                <div className="branch-profile-card">

                    <div className="branch-profile-avatar">
                        {(user.full_name || "A")
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div>

                        <strong>
                            {user.full_name}
                        </strong>

                        <span>
                            Branch Administrator
                        </span>

                    </div>

                </div>

            </div>


            {/* =========================================
                STATS
               ========================================= */}

            <div className="branch-stat-grid">

                <div className="branch-stat-card">

                    <div className="branch-stat-top">

                        <div className="branch-stat-icon">
                            👥
                        </div>

                        <span>
                            STUDENTS
                        </span>

                    </div>

                    <strong>
                        {students.length}
                    </strong>

                    <small>
                        Total registered
                    </small>

                </div>


                <div className="branch-stat-card">

                    <div className="branch-stat-top">

                        <div className="branch-stat-icon green">
                            ✓
                        </div>

                        <span>
                            ACTIVE
                        </span>

                    </div>

                    <strong>
                        {activeStudents}
                    </strong>

                    <small>
                        Currently active
                    </small>

                </div>


                <div className="branch-stat-card">

                    <div className="branch-stat-top">

                        <div className="branch-stat-icon amber">
                            ◷
                        </div>

                        <span>
                            INACTIVE
                        </span>

                    </div>

                    <strong>
                        {inactiveStudents}
                    </strong>

                    <small>
                        Not currently active
                    </small>

                </div>


                <div className="branch-stat-card">

                    <div className="branch-stat-top">

                        <div className="branch-stat-icon purple">
                            🥋
                        </div>

                        <span>
                            BELTS
                        </span>

                    </div>

                    <strong>
                        {Object.keys(
                            beltDistribution
                        ).length}
                    </strong>

                    <small>
                        Active belt levels
                    </small>

                </div>

            </div>


            {/* =========================================
                QUICK OPERATIONS
               ========================================= */}

            <section className="branch-panel">

                <div className="branch-panel-header">

                    <div>

                        <span>
                            DAILY OPERATIONS
                        </span>

                        <h2>
                            Branch Management
                        </h2>

                        <p>
                            Quickly access your branch
                            operational modules.
                        </p>

                    </div>

                </div>


                <div className="branch-operation-grid">

                    <Link
                        to="/students"
                        className="branch-operation-card"
                    >
                        <div className="operation-icon">
                            👥
                        </div>

                        <div>
                            <strong>
                                Students
                            </strong>

                            <span>
                                Add and manage students
                            </span>
                        </div>

                        <b>→</b>
                    </Link>


                    <Link
                        to="/attendance"
                        className="branch-operation-card"
                    >
                        <div className="operation-icon green">
                            ✓
                        </div>

                        <div>
                            <strong>
                                Attendance
                            </strong>

                            <span>
                                Manage daily attendance
                            </span>
                        </div>

                        <b>→</b>
                    </Link>


                    <Link
                        to="/fees"
                        className="branch-operation-card"
                    >
                        <div className="operation-icon orange">
                            ₹
                        </div>

                        <div>
                            <strong>
                                Fees Management
                            </strong>

                            <span>
                                Track branch fees
                            </span>
                        </div>

                        <b>→</b>
                    </Link>


                    <Link
                        to="/belts"
                        className="branch-operation-card"
                    >
                        <div className="operation-icon purple">
                            🥋
                        </div>

                        <div>
                            <strong>
                                Belt & Grades
                            </strong>

                            <span>
                                Manage student progression
                            </span>
                        </div>

                        <b>→</b>
                    </Link>


                    <Link
                        to="/competitions"
                        className="branch-operation-card"
                    >
                        <div className="operation-icon blue">
                            🏆
                        </div>

                        <div>
                            <strong>
                                Competitions
                            </strong>

                            <span>
                                Manage branch events
                            </span>
                        </div>

                        <b>→</b>
                    </Link>


                    <Link
                        to="/results"
                        className="branch-operation-card"
                    >
                        <div className="operation-icon gold">
                            🏅
                        </div>

                        <div>
                            <strong>
                                Results & Winners
                            </strong>

                            <span>
                                Record achievements
                            </span>
                        </div>

                        <b>→</b>
                    </Link>


                    <Link
                        to="/reports"
                        className="branch-operation-card"
                    >
                        <div className="operation-icon slate">
                            📊
                        </div>

                        <div>
                            <strong>
                                Reports
                            </strong>

                            <span>
                                View branch reports
                            </span>
                        </div>

                        <b>→</b>
                    </Link>


                    <Link
                        to="/messages"
                        className="branch-operation-card"
                    >
                        <div className="operation-icon red">
                            💬
                        </div>

                        <div>
                            <strong>
                                Messages
                            </strong>

                            <span>
                                Branch communication
                            </span>
                        </div>

                        <b>→</b>
                    </Link>

                </div>

            </section>


            {/* =========================================
                LOWER AREA
               ========================================= */}

            <div className="branch-lower-grid">

                {/* BELT DISTRIBUTION */}

                <section className="branch-panel">

                    <div className="branch-panel-header compact">

                        <div>

                            <span>
                                STUDENT PROFILE
                            </span>

                            <h2>
                                Belt Distribution
                            </h2>

                        </div>

                    </div>


                    <div className="branch-belt-list">

                        {Object.entries(
                            beltDistribution
                        ).map(
                            ([belt, count]) => {

                            const percentage =
                                students.length
                                    ? Math.round(
                                        (
                                            count /
                                            students.length
                                        ) * 100
                                    )
                                    : 0;

                            return (

                                <div
                                    key={belt}
                                    className="branch-belt-row"
                                >

                                    <div className="branch-belt-name">
                                        <span></span>
                                        {belt}
                                    </div>

                                    <div className="branch-belt-track">

                                        <i
                                            style={{
                                                width:
                                                    `${percentage}%`
                                            }}
                                        ></i>

                                    </div>

                                    <strong>
                                        {count}
                                    </strong>

                                </div>

                            );

                        })}


                        {!students.length && (

                            <div className="branch-empty">
                                No student belt data available.
                            </div>

                        )}

                    </div>

                </section>


                {/* RECENT STUDENTS */}

                <section className="branch-panel">

                    <div className="branch-panel-header compact">

                        <div>

                            <span>
                                STUDENT DIRECTORY
                            </span>

                            <h2>
                                Recent Students
                            </h2>

                        </div>

                        <Link
                            to="/students"
                            className="branch-view-link"
                        >
                            View All →
                        </Link>

                    </div>


                    <div className="branch-recent-list">

                        {students.slice(0, 5).map(
                            student => (

                            <div
                                key={student.id}
                                className="branch-student-row"
                            >

                                <div className="student-mini-avatar">
                                    {(student.name || "S")
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>

                                <div className="branch-student-info">

                                    <strong>
                                        {student.name}
                                    </strong>

                                    <span>
                                        {student.student_code}
                                    </span>

                                </div>

                                <span className="branch-student-belt">
                                    {student.belt || "WHITE"}
                                </span>

                            </div>

                        ))}


                        {!students.length && (

                            <div className="branch-empty">
                                No students found.
                            </div>

                        )}

                    </div>

                </section>

            </div>

        </div>
    );
}
