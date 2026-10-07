import { useEffect, useState } from "react";
import api from "../services/api";
import BranchAttendanceSummary from "../components/BranchAttendanceSummary";

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

            const [studentsResponse, attendanceResponse] =
                await Promise.all([
                    api.get("/students"),
                    api.get(`/attendance/date/${date}`)
                ]);

            setStudents(studentsResponse.data.students || []);
            setAttendance(attendanceResponse.data.attendance || []);
        } catch (error) {
            console.error("Dashboard loading error:", error);

            try {
                const studentsResponse = await api.get("/students");
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
            <header className="topbar">

                <div className="mobile-brand">
                    <div className="mobile-brand-symbol">
                        拳
                    </div>

                    <div>
                        <strong>KARATE</strong>
                        <span>ACADEMY</span>
                    </div>
                </div>

                <div className="topbar-right">

                    <button className="icon-button">
                        <Icon>
                            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                            <path d="M10 21h4" />
                        </Icon>

                        <span className="notification-dot"></span>
                    </button>

                    <div className="topbar-divider"></div>

                    <div className="topbar-user">
                        <div className="topbar-avatar">
                            A
                        </div>

                        <div className="topbar-user-info">
                            <strong>Academy Admin</strong>
                            <span>Administrator</span>
                        </div>

                        <Icon className="chevron">
                            <path d="m6 9 6 6 6-6" />
                        </Icon>
                    </div>
                </div>
            </header>

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

                    <div className="premium-stat-card fees-card">
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
                            ₹0
                        </div>

                        <div className="stat-bottom">
                            <span className="trend neutral">
                                No payments
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
                                <h2>Upcoming Events</h2>
                                <p>Academy schedule</p>
                            </div>

                            <a href="/competitions">
                                Manage →
                            </a>
                        </div>

                        <div className="events-list">

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

            </div>
        </div>
    );
}

export default Dashboard;
