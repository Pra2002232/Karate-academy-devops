import { useEffect, useState } from "react";
import api from "../services/api";
import BranchAttendanceSummary from "../components/BranchAttendanceSummary";

import ModuleTopBar from "../components/ModuleTopBar";
import LiveUpcomingCompetitions from "../components/LiveUpcomingCompetitions";
function Icon({ children, className = "" }) {
    return (
        <svg
            className={`svg-icon ${className}`}
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

function Dashboard() {
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    const [feeSummary, setFeeSummary] = useState({});
    const [feeBranches, setFeeBranches] = useState([]);
    const [feeTypes, setFeeTypes] = useState([]);
    const [showFeeCollection, setShowFeeCollection] =
        useState(false);

    const storedUser = (() => {

        try {

            return JSON.parse(
                localStorage.getItem("admin_user") ||
                "{}"
            );

        } catch {

            return {};

        }

    })();

    const isSuperAdmin =
        storedUser.role === "SUPER_ADMIN";

    const today = new Date();

const todayString =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const [selectedDate, setSelectedDate] =
    useState(todayString);

const formattedDate = new Date(
    `${selectedDate}T00:00:00`
).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
});

    useEffect(() => {
        loadDashboard(selectedDate);
    }, [selectedDate]);

    async function loadDashboard(date) {
        try {
            setLoading(true);

            const [studentsResponse, attendanceResponse, feeResponse] =
                await Promise.all([

                    api.get("/students", {
                        params: { date }
                    }),

                    api.get(
                        `/attendance/date/${date}`
                    ),

                    isSuperAdmin
                        ? api.get("/fees/dashboard")
                        : Promise.resolve({
                            data: {
                                summary: {},
                                branches: [],
                                fee_types: []
                            }
                        })
                ]);

            setStudents(
                studentsResponse.data.students || []
            );

            setAttendance(
                attendanceResponse.data.attendance || []
            );

            setFeeSummary(
                feeResponse.data.summary || {}
            );

            setFeeBranches(
                feeResponse.data.branches || []
            );

            setFeeTypes(
                feeResponse.data.fee_types || []
            );
        } catch (error) {
            console.error("Dashboard loading error:", error);

            try {
                const studentsResponse = await api.get("/students", { params: { date } });
                setStudents(studentsResponse.data.students || []);
            } catch (studentError) {
                console.error(studentError);
            }

            setAttendance([]);
        } finally {
            setLoading(false);
        }
    }

    const totalStudents = students.length;

    const presentCount = attendance.filter(
        (item) => item.status === "PRESENT"
    ).length;

    const absentCount = attendance.filter(
        (item) => item.status === "ABSENT"
    ).length;

    const lateCount = attendance.filter(
        (item) => item.status === "LATE"
    ).length;

    const attendancePercentage =
        totalStudents > 0
            ? Math.round((presentCount / totalStudents) * 100)
            : 0;

    function getStudentName(attendanceItem) {
        if (attendanceItem.student_name) {
            return attendanceItem.student_name;
        }

        const student = students.find(
            (item) => item.id === attendanceItem.student_id
        );

        return student?.name || `Student #${attendanceItem.student_id}`;
    }

    function getInitials(name) {
        if (!name) return "ST";

        return name
            .split(" ")
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase();
    }

    function getStatusClass(status) {
        if (status === "PRESENT") return "status-present";
        if (status === "ABSENT") return "status-absent";
        if (status === "LATE") return "status-late";

        return "";
    }

    return (
        <div className="dashboard-page">

            {/* TOP BAR */}
            <ModuleTopBar moduleName="Dashboard" />

            <div className="dashboard-container">

                {/* PAGE HEADER */}
                <section className="dashboard-heading">

                    <div>
                        <div className="eyebrow">
                            ACADEMY OVERVIEW
                        </div>

                        <h1>
                            Good morning, Admin
                            <span className="heading-wave">👋</span>
                        </h1>

                        <p>
                            Here's what's happening at your academy today.
                        </p>
                    </div>

                    <div className="date-display">
                        <div className="date-icon">
                            <Icon>
                                <rect
                                    x="3"
                                    y="4"
                                    width="18"
                                    height="17"
                                    rx="2"
                                />
                                <path d="M16 2v4M8 2v4M3 10h18" />
                            </Icon>
                        </div>
			
	    <div>
        <span>
            {selectedDate === todayString
                ? "Today"
                : "Selected Date"}
        </span>

        <strong>{formattedDate}</strong>
    </div>

    <input
        type="date"
        value={selectedDate}
        onChange={(event) =>
            setSelectedDate(event.target.value)
        }
        className="dashboard-date-input"
        aria-label="Select dashboard date"
    />

</div>
			

                </section>

                {/* STAT CARDS */}
                <section className="stats-grid">

                    <div className="premium-stat-card students-card">
                        <div className="stat-card-top">
                            <div className="stat-icon-wrapper">
                                <Icon>
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </Icon>
                            </div>

                            <span className="stat-menu">•••</span>
                        </div>

                        <div className="stat-label">
                            TOTAL STUDENTS
                        </div>

                        <div className="stat-value">
                            {loading ? "—" : totalStudents}
                        </div>

                        <div className="stat-bottom">
                            <span className="trend positive">
                                <Icon>
                                    <path d="m5 12 4-4 4 4 6-6" />
                                    <path d="M19 6h-6v6" />
                                </Icon>
                                8.2%
                            </span>

                            <span>vs last month</span>
                        </div>
                    </div>

                    <div className="premium-stat-card present-card">
                        <div className="stat-card-top">
                            <div className="stat-icon-wrapper">
                                <Icon>
                                    <path d="m5 12 4 4L19 6" />
                                </Icon>
                            </div>

                            <span className="stat-menu">•••</span>
                        </div>

                        <div className="stat-label">
                            PRESENT TODAY
                        </div>

                        <div className="stat-value">
                            {loading ? "—" : presentCount}
                        </div>

                        <div className="stat-bottom">
                            <span className="trend positive">
                                {attendancePercentage}%
                            </span>

                            <span>attendance rate</span>
                        </div>
                    </div>

                    <div className="premium-stat-card absent-card">
                        <div className="stat-card-top">
                            <div className="stat-icon-wrapper">
                                <Icon>
                                    <path d="M6 6l12 12M18 6 6 18" />
                                </Icon>
                            </div>

                            <span className="stat-menu">•••</span>
                        </div>

                        <div className="stat-label">
                            ABSENT TODAY
                        </div>

                        <div className="stat-value">
                            {loading ? "—" : absentCount}
                        </div>

                        <div className="stat-bottom">
                            <span className="trend negative">
                                Needs attention
                            </span>
                        </div>
                    </div>

                    <div
                        className="premium-stat-card fees-card fee-card-clickable"
                        onClick={() => {
                            if (isSuperAdmin) {
                                setShowFeeCollection(true);
                            }
                        }}
                        onKeyDown={(event) => {

                            if (
                                isSuperAdmin &&
                                (
                                    event.key === "Enter" ||
                                    event.key === " "
                                )
                            ) {

                                event.preventDefault();

                                setShowFeeCollection(true);

                            }

                        }}
                        role={
                            isSuperAdmin
                                ? "button"
                                : undefined
                        }
                        tabIndex={
                            isSuperAdmin
                                ? 0
                                : undefined
                        }
                    >
                        <div className="stat-card-top">
                            <div className="stat-icon-wrapper">
                                <Icon>
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M15 8.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.2 2 3 2 3 .8 3 2-1.3 2-3 2c-1.3 0-2.3-.3-3-1" />
                                    <path d="M12 5.5v2M12 16.5v2" />
                                </Icon>
                            </div>

                            <span className="stat-menu">•••</span>
                        </div>

                        <div className="stat-label">
                            FEES COLLECTION
                        </div>

                        <div className="stat-value">
                            ₹{
                                Number(
                                    feeSummary.this_month || 0
                                ).toLocaleString("en-IN")
                            }
                        </div>

                        <div className="stat-bottom">
                            <span className="trend neutral">
                                {
                                    Number(
                                        feeSummary.this_month || 0
                                    ) > 0
                                        ? "Collected"
                                        : "No payments"
                                }
                            </span>

                            <span>this month</span>
                        </div>
                    </div>

                </section>

                {/* QUICK ACTIONS */}
                <section className="quick-actions-card">

                    <div className="quick-actions-title">
                        <div>
                            <h2>Quick Actions</h2>
                            <p>Frequently used academy operations</p>
                        </div>
                    </div>

                    <div className="quick-actions">

                        <a
                            href="/students"
                            className="quick-action"
                        >
                            <div className="quick-action-icon red">
                                <Icon>
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M19 8v6M22 11h-6" />
                                </Icon>
                            </div>

                            <div>
                                <strong>Add Student</strong>
                                <span>Register new student</span>
                            </div>

                            <span className="quick-arrow">→</span>
                        </a>

                        <a
                            href="/attendance"
                            className="quick-action"
                        >
                            <div className="quick-action-icon green">
                                <Icon>
                                    <rect
                                        x="3"
                                        y="4"
                                        width="18"
                                        height="17"
                                        rx="2"
                                    />
                                    <path d="M16 2v4M8 2v4M3 10h18" />
                                    <path d="m8 15 2 2 5-5" />
                                </Icon>
                            </div>

                            <div>
                                <strong>Mark Attendance</strong>
                                <span>Record today's attendance</span>
                            </div>

                            <span className="quick-arrow">→</span>
                        </a>

                        <a
                            href="/fees"
                            className="quick-action"
                        >
                            <div className="quick-action-icon gold">
                                <Icon>
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M15 8.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.2 2 3 2 3 .8 3 2-1.3 2-3 2c-1.3 0-2.3-.3-3-1" />
                                    <path d="M12 5.5v2M12 16.5v2" />
                                </Icon>
                            </div>

                            <div>
                                <strong>Record Payment</strong>
                                <span>Update student fees</span>
                            </div>

                            <span className="quick-arrow">→</span>
                        </a>

                        <a
                            href="/messages"
                            className="quick-action"
                        >
                            <div className="quick-action-icon blue">
                                <Icon>
                                    <path d="M20 11.5a8 8 0 0 1-8 8 8.5 8.5 0 0 1-4-.9L3 20l1.4-4.2A8 8 0 1 1 20 11.5Z" />
                                    <path d="M8 12h.01M12 12h.01M16 12h.01" />
                                </Icon>
                            </div>

                            <div>
                                <strong>Send Message</strong>
                                <span>Contact parents</span>
                            </div>

                            <span className="quick-arrow">→</span>
                        </a>

                    </div>
                </section>
{/* LOWER GRID */}
                <section className="dashboard-lower-grid">

                    {/* ATTENDANCE */}
                    <div className="dashboard-panel attendance-panel">

                        <div className="panel-header">
                            <div>
                                <h2>Today's Attendance</h2>
                                <p>Student attendance overview</p>
                            </div>

                            <a href="/attendance">
                                View all →
                            </a>
                        </div>

                        <div className="attendance-summary">

                            <div className="attendance-circle">
                                <div>
                                    <strong>
                                        {attendancePercentage}%
                                    </strong>

                                    <span>
                                        Present
                                    </span>
                                </div>
                            </div>

                            <div className="attendance-legend">

                                <div className="legend-item">
                                    <span className="legend-dot present"></span>

                                    <div>
                                        <strong>{presentCount}</strong>
                                        <span>Present</span>
                                    </div>
                                </div>

                                <div className="legend-item">
                                    <span className="legend-dot absent"></span>

                                    <div>
                                        <strong>{absentCount}</strong>
                                        <span>Absent</span>
                                    </div>
                                </div>

                                <div className="legend-item">
                                    <span className="legend-dot late"></span>

                                    <div>
                                        <strong>{lateCount}</strong>
                                        <span>Late</span>
                                    </div>
                                </div>

                            </div>

                        </div>


                        {/* BRANCH ATTENDANCE SUMMARY */}

                        <BranchAttendanceSummary
                            students={students}
                            attendance={attendance}
                        />

                        <div className="attendance-table-wrapper">

                            {attendance.length === 0 ? (
                                <div className="dashboard-empty">
                                    <div className="empty-icon">
                                        <Icon>
                                            <rect
                                                x="3"
                                                y="4"
                                                width="18"
                                                height="17"
                                                rx="2"
                                            />
                                            <path d="M16 2v4M8 2v4M3 10h18" />
                                        </Icon>
                                    </div>

                                    <strong>
                                        No attendance marked
                                    </strong>

                                    <span>
                                        Attendance records for today will
                                        appear here.
                                    </span>

                                    <a
                                        href="/attendance"
                                        className="empty-action"
                                    >
                                        Mark Attendance
                                    </a>
                                </div>
                            ) : (
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>STUDENT</th>
                                            <th>BELT</th>
                                            <th>BATCH</th>
                                            <th>STATUS</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {attendance
                                            .slice(0, 5)
                                            .map((item) => {
                                                const name =
                                                    getStudentName(item);

                                                const student =
                                                    students.find(
                                                        (s) =>
                                                            s.id ===
                                                            item.student_id
                                                    );

                                                return (
                                                    <tr key={item.id || item.student_id}>
                                                        <td>
                                                            <div className="student-cell">
                                                                <div className="student-avatar">
                                                                    {getInitials(
                                                                        name
                                                                    )}
                                                                </div>

                                                                <div>
                                                                    <strong>
                                                                        {name}
                                                                    </strong>

                                                                    <span>
                                                                        Student
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            {student?.belt ||
                                                                "—"}
                                                        </td>

                                                        <td>
                                                            {student?.batch ||
                                                                "—"}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`status-badge ${getStatusClass(
                                                                    item.status
                                                                )}`}
                                                            >
                                                                <span></span>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                    </div>

                    {/* UPCOMING EVENTS */}
                    <div className="dashboard-panel">

                        <div className="panel-header">
                            <div>
                                <h2>Upcoming Competitions &amp; Events</h2>
                                <p>Academy schedule &amp; competitions</p>
                            </div>

                            <a href="/competitions">
                                Manage →
                            </a>
                        </div>

                        <div className="events-list">
                            <LiveUpcomingCompetitions />

                            <div className="event-item">

                                <div className="event-date red-date">
                                    <strong>15</strong>
                                    <span>SEP</span>
                                </div>

                                <div className="event-details">
                                    <strong>
                                        Belt Examination
                                    </strong>

                                    <span>
                                        All eligible students
                                    </span>

                                    <small>
                                        10:00 AM · Academy Hall
                                    </small>
                                </div>

                                <span className="event-arrow">
                                    →
                                </span>
                            </div>

                            <div className="event-item">

                                <div className="event-date dark-date">
                                    <strong>22</strong>
                                    <span>SEP</span>
                                </div>

                                <div className="event-details">
                                    <strong>
                                        Inter Academy Championship
                                    </strong>

                                    <span>
                                        Competition event
                                    </span>

                                    <small>
                                        9:00 AM · City Sports Complex
                                    </small>
                                </div>

                                <span className="event-arrow">
                                    →
                                </span>
                            </div>

                            <div className="event-item">

                                <div className="event-date gold-date">
                                    <strong>05</strong>
                                    <span>OCT</span>
                                </div>

                                <div className="event-details">
                                    <strong>
                                        Grading Ceremony
                                    </strong>

                                    <span>
                                        Belt promotion ceremony
                                    </span>

                                    <small>
                                        6:00 PM · Academy Hall
                                    </small>
                                </div>

                                <span className="event-arrow">
                                    →
                                </span>
                            </div>

                        </div>

                    </div>

                </section>

                {/* BOTTOM INFORMATION */}
                <section className="dashboard-bottom-grid">

                    <div className="welcome-banner">

                        <div className="banner-content">
                            <div className="banner-label">
                                KARATE ACADEMY
                            </div>

                            <h2>
                                Discipline. Strength. Excellence.
                            </h2>

                            <p>
                                Building confident athletes through
                                discipline, dedication and the spirit of
                                Karate.
                            </p>
                        </div>

                        <div className="banner-symbol">
                            拳
                        </div>

                    </div>

                    <div className="performance-card">

                        <div className="panel-header">
                            <div>
                                <h2>Academy Performance</h2>
                                <p>This month's overview</p>
                            </div>
                        </div>

                        <div className="performance-item">
                            <div className="performance-label">
                                <span>Attendance</span>
                                <strong>
                                    {attendancePercentage}%
                                </strong>
                            </div>

                            <div className="progress">
                                <div
                                    style={{
                                        width: `${attendancePercentage}%`
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div className="performance-item">
                            <div className="performance-label">
                                <span>Student Growth</span>
                                <strong>82%</strong>
                            </div>

                            <div className="progress">
                                <div style={{ width: "82%" }}></div>
                            </div>
                        </div>

                        <div className="performance-item">
                            <div className="performance-label">
                                <span>Fee Collection</span>
                                <strong>70%</strong>
                            </div>

                            <div className="progress">
                                <div style={{ width: "70%" }}></div>
                            </div>
                        </div>

                    </div>

                </section>

            {showFeeCollection && isSuperAdmin && (
                <div
                    className="fee-collection-overlay"
                    onClick={() =>
                        setShowFeeCollection(false)
                    }
                >

                    <div
                        className="fee-collection-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <style>{`

                            .fee-collection-overlay {
                                position: fixed;
                                inset: 0;
                                z-index: 9999;
                                background:
                                    rgba(8,15,28,.62);
                                backdrop-filter:
                                    blur(8px);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                padding: 24px;
                            }

                            .fee-collection-modal {
                                width: min(1200px,96vw);
                                max-height: 90vh;
                                overflow-y: auto;
                                background: #fff;
                                border-radius: 24px;
                                padding: 28px;
                                box-shadow:
                                    0 30px 80px
                                    rgba(0,0,0,.25);
                            }

                            .fee-modal-header {
                                display: flex;
                                justify-content:
                                    space-between;
                                align-items:
                                    flex-start;
                                margin-bottom: 24px;
                            }

                            .fee-modal-eyebrow {
                                color: #c8102e;
                                font-size: 11px;
                                font-weight: 800;
                                letter-spacing: 1.5px;
                                text-transform: uppercase;
                            }

                            .fee-modal-title {
                                margin: 6px 0 0;
                                color: #10233f;
                                font-size: 26px;
                            }

                            .fee-modal-subtitle {
                                margin-top: 6px;
                                color: #7a8798;
                                font-size: 13px;
                            }

                            .fee-modal-close {
                                width: 40px;
                                height: 40px;
                                border:
                                    1px solid #e5eaf0;
                                border-radius: 12px;
                                background: #fff;
                                cursor: pointer;
                                font-size: 21px;
                            }

                            .fee-summary-grid {
                                display: grid;
                                grid-template-columns:
                                    repeat(4,minmax(0,1fr));
                                gap: 14px;
                            }

                            .fee-summary-card {
                                background: #f8fafc;
                                border:
                                    1px solid #e8edf3;
                                border-radius: 16px;
                                padding: 18px;
                            }

                            .fee-summary-label {
                                color: #7c8798;
                                font-size: 10px;
                                font-weight: 800;
                                letter-spacing: .7px;
                                text-transform: uppercase;
                            }

                            .fee-summary-value {
                                margin-top: 8px;
                                color: #10233f;
                                font-size: 23px;
                                font-weight: 800;
                            }

                            .fee-panel {
                                margin-top: 22px;
                                border:
                                    1px solid #e8edf3;
                                border-radius: 18px;
                                overflow: hidden;
                            }

                            .fee-panel-header {
                                display: flex;
                                align-items: center;
                                justify-content:
                                    space-between;
                                padding: 18px 20px;
                                border-bottom:
                                    1px solid #edf1f5;
                            }

                            .fee-panel-header h3 {
                                margin: 0;
                                color: #172b49;
                                font-size: 16px;
                            }

                            .fee-panel-header span {
                                color: #8b95a5;
                                font-size: 12px;
                            }

                            .fee-table-wrap {
                                width: 100%;
                                overflow-x: auto;
                            }

                            .fee-table {
                                width: 100%;
                                min-width: 850px;
                                border-collapse:
                                    collapse;
                            }

                            .fee-table th,
                            .fee-table td {
                                padding: 13px 15px;
                                border-bottom:
                                    1px solid #f0f3f6;
                                text-align: right;
                                white-space:
                                    nowrap;
                            }

                            .fee-table th:first-child,
                            .fee-table td:first-child {
                                text-align: left;
                            }

                            .fee-table th {
                                background: #fbfcfe;
                                color: #7d8898;
                                font-size: 10px;
                                font-weight: 800;
                                text-transform:
                                    uppercase;
                            }

                            .fee-table td {
                                color: #3b4758;
                                font-size: 13px;
                            }

                            .fee-table td strong {
                                color: #12243e;
                            }

                            .fee-type-grid {
                                display: grid;
                                grid-template-columns:
                                    repeat(3,minmax(0,1fr));
                                gap: 14px;
                                padding: 18px;
                            }

                            .fee-type-card {
                                padding: 16px;
                                border:
                                    1px solid #e8edf3;
                                border-radius: 14px;
                                background: #fcfdff;
                            }

                            .fee-type-name {
                                color: #6f7a8a;
                                font-size: 11px;
                                font-weight: 800;
                            }

                            .fee-type-value {
                                margin-top: 7px;
                                color: #10233f;
                                font-size: 21px;
                                font-weight: 800;
                            }

                            .fee-type-count {
                                margin-top: 4px;
                                color: #8b95a5;
                                font-size: 12px;
                            }

                            .fee-card-clickable {
                                cursor: pointer;
                            }

                            .fee-card-clickable:focus {
                                outline:
                                    3px solid
                                    rgba(200,16,46,.16);
                                outline-offset: 2px;
                            }

                            @media (max-width: 900px) {

                                .fee-summary-grid {
                                    grid-template-columns:
                                        repeat(2,minmax(0,1fr));
                                }

                                .fee-type-grid {
                                    grid-template-columns: 1fr;
                                }

                            }

                            @media (max-width: 560px) {

                                .fee-collection-overlay {
                                    padding: 10px;
                                }

                                .fee-collection-modal {
                                    padding: 18px;
                                    border-radius: 18px;
                                }

                                .fee-summary-grid {
                                    grid-template-columns: 1fr;
                                }

                            }

                        `}</style>

                        <div className="fee-modal-header">

                            <div>

                                <div className="fee-modal-eyebrow">
                                    Academy Finance
                                </div>

                                <h2 className="fee-modal-title">
                                    Fee Collection Overview
                                </h2>

                                <div className="fee-modal-subtitle">
                                    Super Admin • All active branches
                                </div>

                            </div>

                            <button
                                className="fee-modal-close"
                                onClick={() =>
                                    setShowFeeCollection(false)
                                }
                            >
                                ×
                            </button>

                        </div>

                        <div className="fee-summary-grid">

                            <div className="fee-summary-card">
                                <div className="fee-summary-label">
                                    Today
                                </div>

                                <div className="fee-summary-value">
                                    ₹{
                                        Number(
                                            feeSummary.today || 0
                                        ).toLocaleString("en-IN")
                                    }
                                </div>
                            </div>

                            <div className="fee-summary-card">
                                <div className="fee-summary-label">
                                    Yesterday
                                </div>

                                <div className="fee-summary-value">
                                    ₹{
                                        Number(
                                            feeSummary.yesterday || 0
                                        ).toLocaleString("en-IN")
                                    }
                                </div>
                            </div>

                            <div className="fee-summary-card">
                                <div className="fee-summary-label">
                                    Last 7 Days
                                </div>

                                <div className="fee-summary-value">
                                    ₹{
                                        Number(
                                            feeSummary.last_7_days || 0
                                        ).toLocaleString("en-IN")
                                    }
                                </div>
                            </div>

                            <div className="fee-summary-card">
                                <div className="fee-summary-label">
                                    Last 30 Days
                                </div>

                                <div className="fee-summary-value">
                                    ₹{
                                        Number(
                                            feeSummary.last_30_days || 0
                                        ).toLocaleString("en-IN")
                                    }
                                </div>
                            </div>

                        </div>

                        <div
                            className="fee-summary-grid"
                            style={{
                                marginTop: "14px"
                            }}
                        >

                            <div className="fee-summary-card">

                                <div className="fee-summary-label">
                                    This Month
                                </div>

                                <div className="fee-summary-value">
                                    ₹{
                                        Number(
                                            feeSummary.this_month || 0
                                        ).toLocaleString("en-IN")
                                    }
                                </div>

                            </div>

                            <div className="fee-summary-card">

                                <div className="fee-summary-label">
                                    Total Collected
                                </div>

                                <div className="fee-summary-value">
                                    ₹{
                                        Number(
                                            feeSummary.total_collected || 0
                                        ).toLocaleString("en-IN")
                                    }
                                </div>

                            </div>

                        </div>

                        <div className="fee-panel">

                            <div className="fee-panel-header">

                                <h3>
                                    Branch-wise Collection
                                </h3>

                                <span>
                                    Completed payments
                                </span>

                            </div>

                            <div className="fee-table-wrap">

                                <table className="fee-table">

                                    <thead>

                                        <tr>
                                            <th>Branch</th>
                                            <th>Today</th>
                                            <th>Yesterday</th>
                                            <th>Last 7 Days</th>
                                            <th>Last 30 Days</th>
                                            <th>This Month</th>
                                            <th>Total</th>
                                        </tr>

                                    </thead>

                                    <tbody>

                                        {feeBranches.length === 0 ? (

                                            <tr>
                                                <td colSpan="7">
                                                    No collection data available.
                                                </td>
                                            </tr>

                                        ) : (

                                            feeBranches.map(
                                                branch => (

                                                    <tr
                                                        key={
                                                            branch.branch_id
                                                        }
                                                    >

                                                        <td>

                                                            <strong>
                                                                {
                                                                    branch.branch_name
                                                                }
                                                            </strong>

                                                            <br />

                                                            <small>
                                                                {
                                                                    branch.branch_code
                                                                }
                                                            </small>

                                                        </td>

                                                        <td>
                                                            ₹{
                                                                Number(
                                                                    branch.today || 0
                                                                ).toLocaleString("en-IN")
                                                            }
                                                        </td>

                                                        <td>
                                                            ₹{
                                                                Number(
                                                                    branch.yesterday || 0
                                                                ).toLocaleString("en-IN")
                                                            }
                                                        </td>

                                                        <td>
                                                            ₹{
                                                                Number(
                                                                    branch.last_7_days || 0
                                                                ).toLocaleString("en-IN")
                                                            }
                                                        </td>

                                                        <td>
                                                            ₹{
                                                                Number(
                                                                    branch.last_30_days || 0
                                                                ).toLocaleString("en-IN")
                                                            }
                                                        </td>

                                                        <td>
                                                            ₹{
                                                                Number(
                                                                    branch.this_month || 0
                                                                ).toLocaleString("en-IN")
                                                            }
                                                        </td>

                                                        <td>

                                                            <strong>
                                                                ₹{
                                                                    Number(
                                                                        branch.total_collected || 0
                                                                    ).toLocaleString("en-IN")
                                                                }
                                                            </strong>

                                                        </td>

                                                    </tr>

                                                )
                                            )

                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                        <div className="fee-panel">

                            <div className="fee-panel-header">

                                <h3>
                                    Fee Type Collection
                                </h3>

                                <span>
                                    Completed payments
                                </span>

                            </div>

                            <div className="fee-type-grid">

                                {feeTypes.length === 0 ? (

                                    <div className="fee-type-card">
                                        No collection data available.
                                    </div>

                                ) : (

                                    feeTypes.map(
                                        type => (

                                            <div
                                                className="fee-type-card"
                                                key={
                                                    type.fee_type
                                                }
                                            >

                                                <div className="fee-type-name">
                                                    {
                                                        type.fee_type
                                                    }
                                                </div>

                                                <div className="fee-type-value">
                                                    ₹{
                                                        Number(
                                                            type.total_collected || 0
                                                        ).toLocaleString("en-IN")
                                                    }
                                                </div>

                                                <div className="fee-type-count">
                                                    {
                                                        type.payment_count
                                                    }{" "}
                                                    payments
                                                </div>

                                            </div>

                                        )
                                    )

                                )}

                            </div>

                        </div>

                    </div>

                </div>
            )}


            </div>
        </div>
    );
}

export default Dashboard;
