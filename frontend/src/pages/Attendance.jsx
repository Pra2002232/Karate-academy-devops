import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function Icon({ children, className = "" }) {
    return (
        <svg
            className={`page-icon ${className}`}
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

function Attendance() {
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});

    const [date, setDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [batchFilter, setBatchFilter] = useState("ALL");
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadData();
    }, [date]);

	async function loadData() {
    try {
        setLoading(true);
        setMessage("");

        const [studentsResponse, attendanceResponse] =
            await Promise.all([
                api.get("/students", { params: { date: date } }),
                api.get(`/attendance/date/${date}`)
            ]);

        console.log(
            "Students API:",
            studentsResponse.data
        );

        console.log(
            "Attendance API:",
            attendanceResponse.data
        );

        const studentList =
            studentsResponse.data.students || [];

        const records =
            attendanceResponse.data.attendance || [];

        setStudents(studentList);

        const attendanceMap = {};

        records.forEach((record) => {
            attendanceMap[record.student_id] =
                record.status;
        });

        setAttendance(attendanceMap);

    } catch (error) {
        console.error(
            "Attendance loading error:",
            error
        );

        setStudents([]);
        setAttendance({});

        setMessage(
            "Unable to load attendance data."
        );
    } finally {
        setLoading(false);
    }
}
   

    function setStudentStatus(studentId, status) {
        setAttendance((previous) => ({
            ...previous,
            [studentId]: status
        }));
    }

    function markAllPresent() {
        const updated = {};

        filteredStudents.forEach((student) => {
            updated[student.id] = "PRESENT";
        });

        setAttendance((previous) => ({
            ...previous,
            ...updated
        }));
    }

    function clearAttendance() {
        const updated = {};

        filteredStudents.forEach((student) => {
            updated[student.id] = "";
        });

        setAttendance((previous) => ({
            ...previous,
            ...updated
        }));
    }

    async function saveAttendance() {
        try {
            setSaving(true);
            setMessage("");

            const records = students
                .filter((student) => attendance[student.id])
                .map((student) => ({
                    student_id: student.id,
                    attendance_date: date,
                    status: attendance[student.id]
                }));

            for (const record of records) {
                await api.post(
                    "/attendance",
                    record
                );
            }

            setMessage(
                `${records.length} attendance records saved successfully.`
            );

            await loadData();
        } catch (error) {
            console.error("Attendance save error:", error);

            setMessage(
                "Unable to save attendance. Please try again."
            );
        } finally {
            setSaving(false);
        }
    }

    const filteredStudents = useMemo(() => {
        const query = search.trim().toLowerCase();

        return students.filter((student) => {
            const matchesSearch =
                !query ||
                student.name
                    ?.toLowerCase()
                    .includes(query) ||
                student.student_code
                    ?.toLowerCase()
                    .includes(query);

            const matchesBatch =
                batchFilter === "ALL" ||
                student.batch === batchFilter;

            return matchesSearch && matchesBatch;
        });
    }, [
        students,
        search,
        batchFilter
    ]);

    const presentCount = students.filter(
        (student) =>
            attendance[student.id] === "PRESENT"
    ).length;

    const absentCount = students.filter(
        (student) =>
            attendance[student.id] === "ABSENT"
    ).length;

    const lateCount = students.filter(
        (student) =>
            attendance[student.id] === "LATE"
    ).length;

    const markedCount =
        presentCount +
        absentCount +
        lateCount;

    const attendancePercentage =
        students.length > 0
            ? Math.round(
                (presentCount / students.length) *
                100
            )
            : 0;

    function getInitials(name) {
        if (!name) return "ST";

        return name
            .split(" ")
            .slice(0, 2)
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase();
    }

    function getBeltClass(belt) {
        return `belt-${String(
            belt || "white"
        ).toLowerCase()}`;
    }

    function formatDate(value) {
        if (!value) return "";

        return new Date(
            `${value}T00:00:00`
        ).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    return (
        <div className="module-screen">

            {/* TOP BAR */}
            <header className="topbar module-topbar">

                <div className="module-breadcrumb">
                    <span>ACADEMY</span>
                    <strong>/</strong>
                    <strong>Attendance</strong>
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

                        <Icon>
                            <path d="m6 9 6 6 6-6" />
                        </Icon>

                    </div>
                </div>

            </header>

            <main className="module-container">

                {/* HEADER */}
                <section className="module-heading">

                    <div>
                        <div className="eyebrow">
                            DAILY OPERATIONS
                        </div>

                        <h1>Attendance</h1>

                        <p>
                            Record and manage daily student
                            attendance.
                        </p>
                    </div>

                    <button
                        className="primary-button save-attendance-button"
                        onClick={saveAttendance}
                        disabled={saving || loading}
                    >
                        <Icon>
                            <path d="M5 12h14" />
                            <path d="m13 6 6 6-6 6" />
                        </Icon>

                        {saving
                            ? "Saving..."
                            : "Save Attendance"}
                    </button>

                </section>

                {/* FILTER BAR */}
                <section className="attendance-filter-card">

                    <div className="filter-field date-field">

                        <label>
                            DATE
                        </label>

                        <div className="input-with-icon">
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

                            <input
                                type="date"
                                value={date}
                                onChange={(e) =>
                                    setDate(e.target.value)
                                }
                            />
                        </div>

                        <small>
                            {formatDate(date)}
                        </small>

                    </div>

                    <div className="filter-field">

                        <label>
                            TRAINING BATCH
                        </label>

                        <select
                            value={batchFilter}
                            onChange={(e) =>
                                setBatchFilter(e.target.value)
                            }
                        >
                            <option value="ALL">
                                All Batches
                            </option>
                            <option value="Morning Batch">
                                Morning Batch
                            </option>
                            <option value="Evening Batch">
                                Evening Batch
                            </option>
                        </select>

                    </div>

                    <div className="filter-field search-field">

                        <label>
                            SEARCH
                        </label>

                        <div className="input-with-icon">
                            <Icon>
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-4-4" />
                            </Icon>

                            <input
                                type="text"
                                placeholder="Search student..."
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                            />
                        </div>

                    </div>

                </section>

                {/* SUMMARY */}
                <section className="attendance-stats">

                    <div className="attendance-stat total">

                        <div className="attendance-stat-icon">
                            <Icon>
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                            </Icon>
                        </div>

                        <div>
                            <span>Total Students</span>
                            <strong>
                                {students.length}
                            </strong>
                        </div>

                    </div>

                    <div className="attendance-stat present">

                        <div className="attendance-stat-icon">
                            <Icon>
                                <path d="m5 12 4 4L19 6" />
                            </Icon>
                        </div>

                        <div>
                            <span>Present</span>
                            <strong>
                                {presentCount}
                            </strong>
                        </div>

                    </div>

                    <div className="attendance-stat absent">

                        <div className="attendance-stat-icon">
                            <Icon>
                                <path d="M6 6l12 12M18 6 6 18" />
                            </Icon>
                        </div>

                        <div>
                            <span>Absent</span>
                            <strong>
                                {absentCount}
                            </strong>
                        </div>

                    </div>

                    <div className="attendance-stat late">

                        <div className="attendance-stat-icon">
                            <Icon>
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3 2" />
                            </Icon>
                        </div>

                        <div>
                            <span>Late</span>
                            <strong>
                                {lateCount}
                            </strong>
                        </div>

                    </div>

                    <div className="attendance-rate">

                        <div className="rate-ring">
                            <strong>
                                {attendancePercentage}%
                            </strong>
                        </div>

                        <div>
                            <span>Attendance Rate</span>
                            <strong>
                                {markedCount} of{" "}
                                {students.length} marked
                            </strong>
                        </div>

                    </div>

                </section>

                {/* ATTENDANCE TABLE */}
                <section className="data-card attendance-data-card">

                    <div className="data-card-header">

                        <div>
                            <h2>Mark Attendance</h2>

                            <p>
                                {filteredStudents.length} students
                                in selected view
                            </p>
                        </div>

                        <div className="attendance-header-actions">

                            <button
                                className="outline-action green-action"
                                onClick={markAllPresent}
                            >
                                <Icon>
                                    <path d="m5 12 4 4L19 6" />
                                </Icon>

                                Mark All Present
                            </button>

                            <button
                                className="outline-action"
                                onClick={clearAttendance}
                            >
                                Clear
                            </button>

                        </div>

                    </div>

                    {message && (
                        <div
                            className={`attendance-message ${
                                message.includes("successfully")
                                    ? "success"
                                    : "error"
                            }`}
                        >
                            <span>
                                {message.includes(
                                    "successfully"
                                )
                                    ? "✓"
                                    : "!"}
                            </span>

                            {message}
                        </div>
                    )}

                    {loading ? (
                        <div className="page-loading">
                            <div className="spinner"></div>
                            <span>
                                Loading attendance...
                            </span>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="page-empty">

                            <div className="empty-large-icon">
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

                            <h3>
                                No students found
                            </h3>

                            <p>
                                Try changing the search or
                                batch filter.
                            </p>

                        </div>
                    ) : (
                        <div className="table-scroll">

                            <table className="attendance-premium-table">

                                <thead>
                                    <tr>
                                        <th>STUDENT</th>
                                        <th>BELT</th>
                                        <th>BATCH</th>
                                        <th>ATTENDANCE</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredStudents.map(
                                        (student) => {
                                            const status =
                                                attendance[
                                                    student.id
                                                ] || "";

                                            return (
                                                <tr
                                                    key={
                                                        student.id
                                                    }
                                                >

                                                    <td>
                                                        <div className="student-profile-cell">

                                                            <div className="large-student-avatar">
                                                                {getInitials(
                                                                    student.name
                                                                )}
                                                            </div>

                                                            <div>
                                                                <strong>
                                                                    {
                                                                        student.name
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    {student.student_code ||
                                                                        "Student"}
                                                                </span>
                                                            </div>

                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`belt-badge ${getBeltClass(
                                                                student.belt
                                                            )}`}
                                                        >
                                                            <span></span>
                                                            {student.belt ||
                                                                "WHITE"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="batch-badge">
                                                            {student.batch ||
                                                                "—"}
                                                        </span>
                                                    </td>

                                                    <td>

                                                        <div className="attendance-buttons">

                                                            <button
                                                                className={
                                                                    status ===
                                                                    "PRESENT"
                                                                        ? "selected present"
                                                                        : ""
                                                                }
                                                                onClick={() =>
                                                                    setStudentStatus(
                                                                        student.id,
                                                                        "PRESENT"
                                                                    )
                                                                }
                                                            >
                                                                <span></span>
                                                                Present
                                                            </button>

                                                            <button
                                                                className={
                                                                    status ===
                                                                    "ABSENT"
                                                                        ? "selected absent"
                                                                        : ""
                                                                }
                                                                onClick={() =>
                                                                    setStudentStatus(
                                                                        student.id,
                                                                        "ABSENT"
                                                                    )
                                                                }
                                                            >
                                                                <span></span>
                                                                Absent
                                                            </button>

                                                            <button
                                                                className={
                                                                    status ===
                                                                    "LATE"
                                                                        ? "selected late"
                                                                        : ""
                                                                }
                                                                onClick={() =>
                                                                    setStudentStatus(
                                                                        student.id,
                                                                        "LATE"
                                                                    )
                                                                }
                                                            >
                                                                <span></span>
                                                                Late
                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>

                            </table>

                        </div>
                    )}

                    <div className="attendance-footer">

                        <span>
                            {markedCount} of{" "}
                            {filteredStudents.length} displayed
                            students marked
                        </span>

                        <button
                            className="primary-button"
                            onClick={saveAttendance}
                            disabled={saving || loading}
                        >
                            {saving
                                ? "Saving..."
                                : "Save Attendance"}
                        </button>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default Attendance;
