import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./BeltGrades.css";

const EMPTY_EXAM = {
    student_id: "",
    current_belt_id: "",
    target_belt_id: "",
    examination_date: new Date().toISOString().split("T")[0],
    examiner: "",
    exam_fee: "",
    reporting_time: "09:00",
    venue: "",
    notes: ""
};

const EMPTY_RESULT = {
    kihon_score: "",
    kata_score: "",
    kumite_score: "",
    discipline_score: "",
    result: "SCHEDULED",
    examiner: "",
    exam_fee: "",
    notes: ""
};

function BeltGrades() {
    const [dashboard, setDashboard] = useState({
        total_students: 0,
        black_belts: 0,
        upcoming_gradings: 0,
        passed_gradings: 0,
        belt_distribution: []
    });

    const [students, setStudents] = useState([]);
    const [belts, setBelts] = useState([]);
    const [examinations, setExaminations] = useState([]);
    const [history, setHistory] = useState([]);

    const [activeTab, setActiveTab] = useState("overview");
    const [search, setSearch] = useState("");

    const [showSchedule, setShowSchedule] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [showPromotion, setShowPromotion] = useState(false);

    const [selectedExam, setSelectedExam] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [examForm, setExamForm] = useState(EMPTY_EXAM);
    const [resultForm, setResultForm] = useState(EMPTY_RESULT);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const [
                dashboardRes,
                studentsRes,
                beltsRes,
                examinationsRes,
                historyRes
            ] = await Promise.all([
                api.get("/belts/dashboard"),
                api.get("/belts/students"),
                api.get("/belts"),
                api.get("/belts/examinations"),
                api.get("/belts/history")
            ]);

            setDashboard(dashboardRes.data);
            setStudents(studentsRes.data.students || []);
            setBelts(beltsRes.data.belts || []);
            setExaminations(examinationsRes.data.examinations || []);
            setHistory(historyRes.data.history || []);
        } catch (err) {
            console.error(err);
            setError(
                err.response?.data?.message ||
                "Unable to load Belt & Grades data."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredStudents = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return students;

        return students.filter((student) =>
            [
                student.name,
                student.student_code,
                student.current_belt,
                student.belt_name,
                student.batch
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(term)
                )
        );
    }, [students, search]);

    const getBeltClass = (belt) => {
        return String(belt || "white")
            .toLowerCase()
            .replace(/\s+/g, "-");
    };

    const handleScheduleChange = (e) => {
        const { name, value } = e.target;

        setExamForm((prev) => ({
            ...prev,
            [name]: value
        }));

        if (name === "student_id") {
            const student = students.find(
                (item) => String(item.id) === String(value)
            );

            if (student) {
                setExamForm((prev) => ({
                    ...prev,
                    student_id: value,
                    current_belt_id: student.belt_level_id || ""
                }));
            }
        }
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);

            await api.post("/belts/examinations", {
                student_id: Number(examForm.student_id),
                current_belt_id: examForm.current_belt_id
                    ? Number(examForm.current_belt_id)
                    : null,
                target_belt_id: Number(examForm.target_belt_id),
                examination_date: examForm.examination_date,
                examiner: examForm.examiner,
                exam_fee: examForm.exam_fee
                    ? Number(examForm.exam_fee)
                    : null,
                reporting_time: examForm.reporting_time,
                venue: examForm.venue.trim(),
                notes: examForm.notes
            });

            setShowSchedule(false);
            setExamForm(EMPTY_EXAM);

            await loadData();

            alert("Grading examination scheduled successfully.");
        } catch (err) {
            alert(
                err.response?.data?.message ||
                "Failed to schedule examination."
            );
        } finally {
            setSaving(false);
        }
    };

    const openResultModal = (exam) => {
        setSelectedExam(exam);

        setResultForm({
            kihon_score: exam.kihon_score ?? "",
            kata_score: exam.kata_score ?? "",
            kumite_score: exam.kumite_score ?? "",
            discipline_score: exam.discipline_score ?? "",
            result: exam.result || "SCHEDULED",
            examiner: exam.examiner || "",
            exam_fee: exam.exam_fee ?? "",
            notes: exam.notes || ""
        });

        setShowResult(true);
    };

    const handleResultSubmit = async (e) => {
        e.preventDefault();

        if (!selectedExam) return;

        try {
            setSaving(true);

            await api.put(
                `/belts/examinations/${selectedExam.id}`,
                {
                    kihon_score:
                        resultForm.kihon_score === ""
                            ? null
                            : Number(resultForm.kihon_score),

                    kata_score:
                        resultForm.kata_score === ""
                            ? null
                            : Number(resultForm.kata_score),

                    kumite_score:
                        resultForm.kumite_score === ""
                            ? null
                            : Number(resultForm.kumite_score),

                    discipline_score:
                        resultForm.discipline_score === ""
                            ? null
                            : Number(resultForm.discipline_score),

                    result: resultForm.result,
                    examiner: resultForm.examiner,
                    exam_fee:
                        resultForm.exam_fee === ""
                            ? null
                            : Number(resultForm.exam_fee),
                    notes: resultForm.notes
                }
            );

            setShowResult(false);
            setSelectedExam(null);

            await loadData();

            alert("Examination updated successfully.");
        } catch (err) {
            alert(
                err.response?.data?.message ||
                "Failed to update examination."
            );
        } finally {
            setSaving(false);
        }
    };

    const openPromotion = (exam) => {
        if (exam.result !== "PASSED") {
            alert("Only a PASSED examination can be promoted.");
            return;
        }

        setSelectedExam(exam);

        setSelectedStudent(
            students.find(
                (student) =>
                    Number(student.id) === Number(exam.student_id)
            ) || null
        );

        setShowPromotion(true);
    };

    const handlePromotion = async () => {
        if (!selectedExam || !selectedStudent) return;

        if (
            !window.confirm(
                `Confirm promotion of ${selectedStudent.name} to ${selectedExam.target_belt}?`
            )
        ) {
            return;
        }

        try {
            setSaving(true);

            await api.post("/belts/promote", {
                student_id: Number(selectedExam.student_id),
                examination_id: Number(selectedExam.id),
                target_belt_id: Number(selectedExam.target_belt_id),
                grade:
                    selectedExam.target_kyu ||
                    selectedExam.target_belt,
                promoted_date: new Date()
                    .toISOString()
                    .split("T")[0],
                remarks:
                    `Promoted after grading examination. Examiner: ${
                        selectedExam.examiner || "N/A"
                    }`
            });

            setShowPromotion(false);
            setSelectedExam(null);
            setSelectedStudent(null);

            await loadData();

            alert("Student promoted successfully.");
        } catch (err) {
            alert(
                err.response?.data?.message ||
                "Failed to promote student."
            );
        } finally {
            setSaving(false);
        }
    };

    const getTotalScore = () => {
        const values = [
            resultForm.kihon_score,
            resultForm.kata_score,
            resultForm.kumite_score,
            resultForm.discipline_score
        ];

        if (values.some((value) => value === "")) {
            return "-";
        }

        const total =
            values.reduce(
                (sum, value) => sum + Number(value || 0),
                0
            ) / 4;

        return total.toFixed(2);
    };

    return (
        <div className="belt-page">

            {/* Header */}

            <div className="belt-header">

                <div>
                    <div className="belt-title-row">
                        <div className="belt-title-icon">🥋</div>

                        <div>
                            <h1>Belt & Grades</h1>

                            <p>
                                Manage karate grades, examinations,
                                promotions and belt progression.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    className="primary-belt-btn"
                    onClick={() => {
                        setExamForm(EMPTY_EXAM);
                        setShowSchedule(true);
                    }}
                >
                    + Schedule Grading
                </button>

            </div>


            {/* Error */}

            {error && (
                <div className="belt-error">
                    {error}
                </div>
            )}


            {/* Statistics */}

            <div className="belt-stat-grid">

                <div className="belt-stat-card">
                    <div className="stat-icon students-icon">
                        👥
                    </div>

                    <div>
                        <span>Active Students</span>
                        <strong>{dashboard.total_students}</strong>
                    </div>
                </div>


                <div className="belt-stat-card">
                    <div className="stat-icon grading-icon">
                        📅
                    </div>

                    <div>
                        <span>Upcoming Grading</span>
                        <strong>{dashboard.upcoming_gradings}</strong>
                    </div>
                </div>


                <div className="belt-stat-card">
                    <div className="stat-icon passed-icon">
                        ✓
                    </div>

                    <div>
                        <span>Passed Examinations Student Count</span>
                        <strong>{dashboard.passed_gradings}</strong>
                    </div>
                </div>

            </div>



	    {/* Belt-wise Student Distribution */}

<section className="belt-distribution-card">

    <div className="section-heading">

        <div>
            <h2>Belt-wise Student Distribution</h2>

            <p>
                View the number of students currently enrolled
                in each belt level.
            </p>
        </div>

        <div className="distribution-total">
            {dashboard.total_students} Students
        </div>

    </div>


    <div className="belt-distribution-grid">

        {dashboard.belt_distribution.map((belt) => {

            const studentCount =
                Number(belt.student_count || 0);

            return (
                <div
                    className="belt-distribution-item"
                    key={belt.belt_name}
                >

                    <div className="distribution-top">

                        <div
                            className={`distribution-belt-circle ${getBeltClass(
                                belt.belt_name
                            )}`}
                        />

                        <div>

                            <h3>
                                {belt.belt_name}
                            </h3>

                            <span>
                                {belt.sequence_order === 8
                                    ? "Dan Grade"
                                    : belt.kyu_level}
                            </span>

                        </div>

                    </div>


                    <div className="distribution-count">

                        <strong>
                            {studentCount}
                        </strong>

                        <span>
                            {studentCount === 1
                                ? "Student"
                                : "Students"}
                        </span>

                    </div>


                    <div className="distribution-bar">

                        <div
                            style={{
                                width:
                                    dashboard.total_students > 0
                                        ? `${Math.min(
                                              100,
                                              (studentCount /
                                                  dashboard.total_students) *
                                                  100
                                          )}%`
                                        : "0%"
                            }}
                        />

                    </div>

                </div>
            );
        })}

    </div>

</section>
	



            {/* Navigation Tabs */}

            <div className="belt-tabs">

                <button
                    className={
                        activeTab === "overview"
                            ? "active"
                            : ""
                    }
                    onClick={() => setActiveTab("overview")}
                >
                    Student Belt Status
                </button>

                <button
                    className={
                        activeTab === "examinations"
                            ? "active"
                            : ""
                    }
                    onClick={() => setActiveTab("examinations")}
                >
                    Grading Examinations
                </button>

                <button
                    className={
                        activeTab === "history"
                            ? "active"
                            : ""
                    }
                    onClick={() => setActiveTab("history")}
                >
                    Promotion History
                </button>

            </div>


            {/* Student Overview */}

            {activeTab === "overview" && (
                <section className="belt-content-card">

                    <div className="content-toolbar">

                        <div>
                            <h2>Student Belt Status</h2>

                            <p>
                                Track current belt, grade and next
                                promotion level.
                            </p>
                        </div>

                        <div className="belt-search">
                            🔍

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


                    {loading ? (
                        <div className="belt-empty">
                            Loading student data...
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="belt-empty">
                            No students found.
                        </div>
                    ) : (
                        <div className="student-belt-grid">

                            {filteredStudents.map((student) => (
                                <div
                                    className="student-belt-card"
                                    key={student.id}
                                >

                                    <div className="student-card-top">

                                        <div className="student-avatar">
                                            {student.name
                                                ?.charAt(0)
                                                ?.toUpperCase()}
                                        </div>

                                        <div>
                                            <h3>{student.name}</h3>

                                            <span>
                                                {student.student_code}
                                            </span>
                                        </div>

                                    </div>


                                    <div className="current-belt-display">

                                        <div
                                            className={`large-belt-circle ${getBeltClass(
                                                student.current_belt
                                            )}`}
                                        />

                                        <div>
                                            <span>
                                                Current Belt
                                            </span>

                                            <strong>
                                                {student.belt_name ||
                                                    student.current_belt ||
                                                    "White"}
                                            </strong>

                                            <small>
                                                {student.kyu_level ||
                                                    student.grade ||
                                                    "10th Kyu"}
                                            </small>
                                        </div>

                                    </div>


                                    <div className="student-progress-info">

                                        <div>
                                            <span>
                                                Last Promotion
                                            </span>

                                            <strong>
                                                {student.promoted_date
                                                    ? new Date(
                                                          student.promoted_date
                                                      ).toLocaleDateString()
                                                    : "Not recorded"}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Next Belt
                                            </span>

                                            <strong>
                                                {student.next_belt ||
                                                    "Highest Level"}
                                            </strong>
                                        </div>

                                    </div>

                                    <div className="student-card-footer">
                                        <span>
                                            Batch:{" "}
                                            {student.batch || "Not assigned"}
                                        </span>
                                    </div>

                                </div>
                            ))}

                        </div>
                    )}

                </section>
            )}


            {/* Examinations */}

            {activeTab === "examinations" && (
                <section className="belt-content-card">

                    <div className="content-toolbar">

                        <div>
                            <h2>Grading Examinations</h2>

                            <p>
                                Schedule examinations, enter scores
                                and process promotions.
                            </p>
                        </div>

                        <button
                            className="primary-belt-btn small-btn"
                            onClick={() => {
                                setExamForm(EMPTY_EXAM);
                                setShowSchedule(true);
                            }}
                        >
                            + New Examination
                        </button>

                    </div>


                    {examinations.length === 0 ? (
                        <div className="belt-empty large-empty">
                            <div>🥋</div>

                            <h3>No examinations yet</h3>

                            <p>
                                Schedule the first grading
                                examination for your students.
                            </p>
                        </div>
                    ) : (
                        <div className="belt-table-wrapper">

                            <table className="belt-table">

                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Current</th>
                                        <th>Target</th>
                                        <th>Exam Date</th>
                                        <th>Examiner</th>
                                        <th>Score</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {examinations.map((exam) => (
                                        <tr key={exam.id}>

                                            <td>
                                                <strong>
                                                    {exam.student_name}
                                                </strong>

                                                <small>
                                                    {exam.student_code}
                                                </small>
                                            </td>

                                            <td>
                                                <span className="table-belt">
                                                    {exam.current_belt ||
                                                        "-"}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="target-belt">
                                                    {exam.target_belt ||
                                                        "-"}
                                                </span>
                                            </td>

                                            <td>
                                                {exam.examination_date
                                                    ? new Date(
                                                          exam.examination_date
                                                      ).toLocaleDateString()
                                                    : "-"}
                                            </td>

                                            <td>
                                                {exam.examiner || "-"}
                                            </td>

                                            <td>
                                                {exam.total_score !== null &&
                                                exam.total_score !== undefined
                                                    ? Number(
                                                          exam.total_score
                                                      ).toFixed(2)
                                                    : "-"}
                                            </td>

                                            <td>
                                                <span
                                                    className={`exam-status ${String(
                                                        exam.result
                                                    ).toLowerCase()}`}
                                                >
                                                    {exam.result}
                                                </span>
                                            </td>

                                            <td>

                                                <div className="action-buttons">

                                                    <button
                                                        className="table-action-btn"
                                                        onClick={() =>
                                                            openResultModal(
                                                                exam
                                                            )
                                                        }
                                                    >
                                                        Scores
                                                    </button>

                                                    {exam.result ===
                                                        "PASSED" && (
                                                        <button
                                                            className="promote-btn"
                                                            onClick={() =>
                                                                openPromotion(
                                                                    exam
                                                                )
                                                            }
                                                        >
                                                            Promote
                                                        </button>
                                                    )}

                                                </div>

                                            </td>

                                        </tr>
                                    ))}

                                </tbody>

                            </table>

                        </div>
                    )}

                </section>
            )}


            {/* History */}

            {activeTab === "history" && (
                <section className="belt-content-card">

                    <div className="content-toolbar">

                        <div>
                            <h2>Promotion History</h2>

                            <p>
                                Complete belt promotion records.
                            </p>
                        </div>

                    </div>


                    {history.length === 0 ? (
                        <div className="belt-empty large-empty">

                            <div>📜</div>

                            <h3>No promotion history</h3>

                            <p>
                                Promotion records will appear here
                                after students complete grading.
                            </p>

                        </div>
                    ) : (
                        <div className="history-timeline">

                            {history.map((item) => (
                                <div
                                    className="history-item"
                                    key={item.id}
                                >

                                    <div className="history-date">
                                        {new Date(
                                            item.grading_date
                                        ).toLocaleDateString()}
                                    </div>

                                    <div className="history-line" />

                                    <div className="history-card">

                                        <div className="history-student">
                                            <div className="student-avatar">
                                                {item.student_name
                                                    ?.charAt(0)
                                                    ?.toUpperCase()}
                                            </div>

                                            <div>
                                                <strong>
                                                    {item.student_name}
                                                </strong>

                                                <span>
                                                    {item.student_code}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="history-transition">

                                            <span className="history-old">
                                                {item.previous_belt ||
                                                    "New Student"}
                                            </span>

                                            <span>→</span>

                                            <span className="history-new">
                                                {item.new_belt}
                                            </span>

                                        </div>

                                        {item.remarks && (
                                            <p>
                                                {item.remarks}
                                            </p>
                                        )}

                                    </div>

                                </div>
                            ))}

                        </div>
                    )}

                </section>
            )}


            {/* Schedule Examination Modal */}

            {showSchedule && (
                <div className="belt-modal-overlay">

                    <div className="belt-modal">

                        <div className="modal-header">

                            <div>
                                <h2>Schedule Grading</h2>
                                <p>
                                    Create a new belt grading
                                    examination.
                                </p>
                            </div>

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowSchedule(false)
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={handleScheduleSubmit}
                            className="belt-form"
                        >

                            <div className="form-grid">

                                <label>
                                    Student *

                                    <select
                                        name="student_id"
                                        value={examForm.student_id}
                                        onChange={
                                            handleScheduleChange
                                        }
                                        required
                                    >
                                        <option value="">
                                            Select Student
                                        </option>

                                        {students.map((student) => (
                                            <option
                                                key={student.id}
                                                value={student.id}
                                            >
                                                {student.name} —{" "}
                                                {student.current_belt}
                                            </option>
                                        ))}
                                    </select>
                                </label>


                                <label>
                                    Current Belt

                                    <select
                                        name="current_belt_id"
                                        value={
                                            examForm.current_belt_id
                                        }
                                        onChange={
                                            handleScheduleChange
                                        }
                                    >
                                        <option value="">
                                            Select Current Belt
                                        </option>

                                        {belts.map((belt) => (
                                            <option
                                                key={belt.id}
                                                value={belt.id}
                                            >
                                                {belt.belt_name} —{" "}
                                                {belt.kyu_level}
                                            </option>
                                        ))}
                                    </select>
                                </label>


                                <label>
                                    Target Belt *

                                    <select
                                        name="target_belt_id"
                                        value={
                                            examForm.target_belt_id
                                        }
                                        onChange={
                                            handleScheduleChange
                                        }
                                        required
                                    >
                                        <option value="">
                                            Select Target Belt
                                        </option>

                                        {belts.map((belt) => (
                                            <option
                                                key={belt.id}
                                                value={belt.id}
                                            >
                                                {belt.belt_name} —{" "}
                                                {belt.kyu_level}
                                            </option>
                                        ))}
                                    </select>
                                </label>


                                <label>
                                    Examination Date *

                                    <input
                                        type="date"
                                        name="examination_date"
                                        value={
                                            examForm.examination_date
                                        }
                                        onChange={
                                            handleScheduleChange
                                        }
                                        required
                                    />
                                </label>


                                <label>
                                    Examiner

                                    <input
                                        type="text"
                                        name="examiner"
                                        placeholder="Examiner name"
                                        value={examForm.examiner}
                                        onChange={
                                            handleScheduleChange
                                        }
                                    />
                                </label>


                                <label>
                                    Examination Fee

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="exam_fee"
                                        placeholder="0.00"
                                        value={examForm.exam_fee}
                                        onChange={
                                            handleScheduleChange
                                        }
                                    />
                                </label>

                                <label>
                                    Reporting Time *

                                    <input
                                        type="time"
                                        name="reporting_time"
                                        value={examForm.reporting_time}
                                        onChange={handleScheduleChange}
                                        required
                                    />
                                </label>

                                <label>
                                    Venue *

                                    <input
                                        type="text"
                                        name="venue"
                                        placeholder="Main Branch"
                                        value={examForm.venue}
                                        onChange={handleScheduleChange}
                                        maxLength={255}
                                        required
                                    />
                                </label>

                            </div>


                            <label>
                                Notes

                                <textarea
                                    name="notes"
                                    rows="3"
                                    placeholder="Additional examination notes..."
                                    value={examForm.notes}
                                    onChange={
                                        handleScheduleChange
                                    }
                                />
                            </label>


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() =>
                                        setShowSchedule(false)
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="primary-belt-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Scheduling..."
                                        : "Schedule Examination"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}


            {/* Examination Result Modal */}

            {showResult && selectedExam && (
                <div className="belt-modal-overlay">

                    <div className="belt-modal">

                        <div className="modal-header">

                            <div>
                                <h2>Examination Scores</h2>

                                <p>
                                    {selectedExam.student_name} —{" "}
                                    {selectedExam.target_belt}
                                </p>
                            </div>

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowResult(false)
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={handleResultSubmit}
                            className="belt-form"
                        >

                            <div className="score-grid">

                                <label>
                                    Kihon

                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={
                                            resultForm.kihon_score
                                        }
                                        onChange={(e) =>
                                            setResultForm((prev) => ({
                                                ...prev,
                                                kihon_score:
                                                    e.target.value
                                            }))
                                        }
                                    />
                                </label>


                                <label>
                                    Kata

                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={
                                            resultForm.kata_score
                                        }
                                        onChange={(e) =>
                                            setResultForm((prev) => ({
                                                ...prev,
                                                kata_score:
                                                    e.target.value
                                            }))
                                        }
                                    />
                                </label>


                                <label>
                                    Kumite

                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={
                                            resultForm.kumite_score
                                        }
                                        onChange={(e) =>
                                            setResultForm((prev) => ({
                                                ...prev,
                                                kumite_score:
                                                    e.target.value
                                            }))
                                        }
                                    />
                                </label>


                                <label>
                                    Discipline

                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={
                                            resultForm.discipline_score
                                        }
                                        onChange={(e) =>
                                            setResultForm((prev) => ({
                                                ...prev,
                                                discipline_score:
                                                    e.target.value
                                            }))
                                        }
                                    />
                                </label>

                            </div>


                            <div className="total-score-box">

                                <span>Average Score</span>

                                <strong>
                                    {getTotalScore()}
                                </strong>

                                <small>/ 100</small>

                            </div>


                            <div className="form-grid">

                                <label>
                                    Result

                                    <select
                                        value={resultForm.result}
                                        onChange={(e) =>
                                            setResultForm((prev) => ({
                                                ...prev,
                                                result:
                                                    e.target.value
                                            }))
                                        }
                                    >
                                        <option value="SCHEDULED">
                                            Scheduled
                                        </option>

                                        <option value="PASSED">
                                            Passed
                                        </option>

                                        <option value="FAILED">
                                            Failed
                                        </option>
                                    </select>
                                </label>


                                <label>
                                    Examiner

                                    <input
                                        type="text"
                                        value={
                                            resultForm.examiner
                                        }
                                        onChange={(e) =>
                                            setResultForm((prev) => ({
                                                ...prev,
                                                examiner:
                                                    e.target.value
                                            }))
                                        }
                                    />
                                </label>

                            </div>


                            <label>
                                Notes

                                <textarea
                                    rows="3"
                                    value={resultForm.notes}
                                    onChange={(e) =>
                                        setResultForm((prev) => ({
                                            ...prev,
                                            notes: e.target.value
                                        }))
                                    }
                                />
                            </label>


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() =>
                                        setShowResult(false)
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="primary-belt-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Save Result"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}


            {/* Promotion Confirmation Modal */}

            {showPromotion && selectedExam && selectedStudent && (
                <div className="belt-modal-overlay">

                    <div className="belt-modal promotion-modal">

                        <div className="promotion-icon">
                            🥋
                        </div>

                        <h2>Confirm Promotion</h2>

                        <p className="promotion-description">
                            Confirm the belt promotion after the
                            successful grading examination.
                        </p>


                        <div className="promotion-student">

                            <div className="student-avatar">
                                {selectedStudent.name
                                    ?.charAt(0)
                                    ?.toUpperCase()}
                            </div>

                            <div>
                                <strong>
                                    {selectedStudent.name}
                                </strong>

                                <span>
                                    {selectedStudent.student_code}
                                </span>
                            </div>

                        </div>


                        <div className="promotion-transition">

                            <div>
                                <span>Current Belt</span>
                                <strong>
                                    {selectedExam.current_belt}
                                </strong>
                            </div>

                            <div className="promotion-arrow">
                                →
                            </div>

                            <div>
                                <span>New Belt</span>
                                <strong>
                                    {selectedExam.target_belt}
                                </strong>
                            </div>

                        </div>


                        <div className="promotion-warning">
                            This will update the student's current
                            belt, create a grade record and add an
                            entry to belt history.
                        </div>


                        <div className="modal-actions">

                            <button
                                className="secondary-btn"
                                onClick={() =>
                                    setShowPromotion(false)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                className="promote-confirm-btn"
                                onClick={handlePromotion}
                                disabled={saving}
                            >
                                {saving
                                    ? "Promoting..."
                                    : "Confirm Promotion"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default BeltGrades;
