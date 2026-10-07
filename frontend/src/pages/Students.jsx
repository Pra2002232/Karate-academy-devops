import { useEffect, useState } from "react";
import api from "../services/api";

function Students() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);

    const [form, setForm] = useState({
        student_code: "",
        name: "",
        date_of_birth: "",
        gender: "",
        parent_name: "",
        parent_mobile: "",
        address: "",
        joining_date: "",
        belt: "WHITE",
        batch: "Morning Batch"
    });

    useEffect(() => {
        loadStudents();
    }, []);

    async function loadStudents() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/students");

            console.log("Students API:", response.data);

            setStudents(response.data.students || []);
        } catch (err) {
            console.error("Students loading error:", err);
            setStudents([]);
            setError("Unable to load students.");
        } finally {
            setLoading(false);
        }
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    }

    function openAddForm() {
        setEditingStudent(null);

        setForm({
            student_code: `KAR${String(
                students.length + 1
            ).padStart(3, "0")}`,
            name: "",
            date_of_birth: "",
            gender: "",
            parent_name: "",
            parent_mobile: "",
            address: "",
            joining_date: "",
            belt: "WHITE",
            batch: "Morning Batch"
        });

        setShowForm(true);
    }

    function openEditForm(student) {
        setEditingStudent(student);

        setForm({
            student_code: student.student_code || "",
            name: student.name || "",
            date_of_birth: student.date_of_birth
                ? student.date_of_birth.substring(0, 10)
                : "",
            gender: student.gender || "",
            parent_name: student.parent_name || "",
            parent_mobile: student.parent_mobile || "",
            address: student.address || "",
            joining_date: student.joining_date
                ? student.joining_date.substring(0, 10)
                : "",
            belt: student.belt || "WHITE",
            batch: student.batch || "Morning Batch"
        });

        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingStudent(null);
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            if (editingStudent) {
                await api.put(
                    `/students/${editingStudent.id}`,
                    form
                );
            } else {
                await api.post("/students", form);
            }

            closeForm();
            await loadStudents();
        } catch (err) {
            console.error("Save student error:", err);

            alert(
                err.response?.data?.message ||
                "Unable to save student."
            );
        }
    }

    async function handleDelete(student) {
        const confirmed = window.confirm(
            `Delete ${student.name}?`
        );

        if (!confirmed) {
            return;
        }

        try {
            await api.delete(
                `/students/${student.id}`
            );

            await loadStudents();
        } catch (err) {
            console.error("Delete student error:", err);

            alert("Unable to delete student.");
        }
    }

    function getInitials(name) {
        if (!name) {
            return "ST";
        }

        return name
            .split(" ")
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase();
    }

    return (
        <div className="module-screen">

            <div className="module-container">

                <div className="module-heading">

                    <div>
                        <div className="eyebrow">
                            STUDENT MANAGEMENT
                        </div>

                        <h1>Students</h1>

                        <p>
                            Manage Karate Academy students
                            and their parent information.
                        </p>
                    </div>

                    <button
                        className="primary-button"
                        onClick={openAddForm}
                    >
                        + Add Student
                    </button>

                </div>

                <div className="mini-stats">

                    <div className="mini-stat">
                        <div>
                            <span>Total Students</span>
                            <strong>
                                {students.length}
                            </strong>
                        </div>
                    </div>

                    <div className="mini-stat">
                        <div>
                            <span>Active Students</span>
                            <strong>
                                {
                                    students.filter(
                                        (student) =>
                                            !student.status ||
                                            student.status ===
                                                "ACTIVE"
                                    ).length
                                }
                            </strong>
                        </div>
                    </div>

                    <div className="mini-stat">
                        <div>
                            <span>White Belts</span>
                            <strong>
                                {
                                    students.filter(
                                        (student) =>
                                            student.belt ===
                                            "WHITE"
                                    ).length
                                }
                            </strong>
                        </div>
                    </div>

                    <div className="mini-stat">
                        <div>
                            <span>Black Belts</span>
                            <strong>
                                {
                                    students.filter(
                                        (student) =>
                                            student.belt ===
                                            "BLACK"
                                    ).length
                                }
                            </strong>
                        </div>
                    </div>

                </div>

                <section className="data-card">

                    <div className="data-card-header">

                        <div>
                            <h2>
                                Student Directory
                            </h2>

                            <p>
                                {students.length} students
                                registered
                            </p>
                        </div>

                    </div>

                    {loading && (
                        <div className="page-loading">
                            Loading students...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="page-error">
                            <strong>{error}</strong>

                            <button
                                className="secondary-button"
                                onClick={loadStudents}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        students.length === 0 && (
                            <div className="page-empty">

                                <h3>
                                    No students found
                                </h3>

                                <p>
                                    Add your first Karate
                                    Academy student.
                                </p>

                                <button
                                    className="primary-button"
                                    onClick={openAddForm}
                                >
                                    + Add Student
                                </button>

                            </div>
                        )}

                    {!loading &&
                        !error &&
                        students.length > 0 && (
                            <div className="table-scroll">

                                <table className="students-table">

                                    <thead>
                                        <tr>
                                            <th>
                                                STUDENT
                                            </th>

                                            <th>
                                                PARENT
                                            </th>

                                            <th>
                                                MOBILE
                                            </th>

                                            <th>
                                                BELT
                                            </th>

                                            <th>
                                                BATCH
                                            </th>

                                            <th>
                                                STATUS
                                            </th>

                                            <th>
                                                ACTIONS
                                            </th>
                                            <th>
                                                BRANCH
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {students.map(
                                            (student) => (
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
                                                                    {
                                                                        student.student_code
                                                                    }
                                                                </span>
                                                            </div>

                                                        </div>
                                                    </td>

                                                    <td>
                                                        {
                                                            student.parent_name ||
                                                            "—"
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            student.parent_mobile ||
                                                            "—"
                                                        }
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`belt-badge belt-${String(
                                                                student.belt ||
                                                                    "white"
                                                            ).toLowerCase()}`}
                                                        >
                                                            {
                                                                student.belt ||
                                                                "WHITE"
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="batch-badge">
                                                            {
                                                                student.batch ||
                                                                "—"
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="active-badge">
                                                            <span></span>

                                                            {
                                                                student.status ||
                                                                "ACTIVE"
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="row-actions">

                                                            <button
                                                                onClick={() =>
                                                                    openEditForm(
                                                                        student
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                            </button>

                                                            <button
                                                                className="delete-action"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        student
                                                                    )
                                                                }
                                                            >
                                                                Delete
                                                            </button>

                                                        </div>
                                                    </td>

                                                
                                                    <td>
                                                        <span className="student-branch-name">
                                                            {student.branch_name || "—"}
                                                        </span>
                                                    </td>
</tr>
                                            )
                                        )}

                                    </tbody>

                                </table>

                            </div>
                        )}

                </section>

            </div>

            {showForm && (
                <div className="modal-overlay">

                    <div className="premium-modal">

                        <div className="modal-header">

                            <div>
                                <div className="modal-kicker">
                                    STUDENT PROFILE
                                </div>

                                <h2>
                                    {editingStudent
                                        ? "Edit Student"
                                        : "Add Student"}
                                </h2>

                                <p>
                                    Enter student and parent
                                    details.
                                </p>
                            </div>

                            <button
                                className="modal-close"
                                onClick={closeForm}
                            >
                                ×
                            </button>

                        </div>

                        <form
                            className="student-form"
                            onSubmit={handleSubmit}
                        >

                            <div className="form-section-title">
                                Student Information
                            </div>

                            <div className="form-grid">

                                <label>
                                    <span>
                                        Student Code
                                    </span>

                                    <input
                                        name="student_code"
                                        value={
                                            form.student_code
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        Student Name *
                                    </span>

                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    <span>
                                        Date of Birth
                                    </span>

                                    <input
                                        type="date"
                                        name="date_of_birth"
                                        value={
                                            form.date_of_birth
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        Gender
                                    </span>

                                    <select
                                        name="gender"
                                        value={form.gender}
                                        onChange={
                                            handleChange
                                        }
                                    >
                                        <option value="">
                                            Select
                                        </option>

                                        <option value="MALE">
                                            Male
                                        </option>

                                        <option value="FEMALE">
                                            Female
                                        </option>

                                        <option value="OTHER">
                                            Other
                                        </option>
                                    </select>
                                </label>

                                <label>
                                    <span>
                                        Belt
                                    </span>

                                    <select
                                        name="belt"
                                        value={form.belt}
                                        onChange={
                                            handleChange
                                        }
                                    >
                                        <option value="WHITE">
                                            White
                                        </option>

                                        <option value="YELLOW">
                                            Yellow
                                        </option>

                                        <option value="ORANGE">
                                            Orange
                                        </option>

                                        <option value="GREEN">
                                            Green
                                        </option>

                                        <option value="BLUE">
                                            Blue
                                        </option>

                                        <option value="BROWN">
                                            Brown
                                        </option>

                                        <option value="BLACK">
                                            Black
                                        </option>
                                    </select>
                                </label>

                                <label>
                                    <span>
                                        Training Batch
                                    </span>

                                    <select
                                        name="batch"
                                        value={form.batch}
                                        onChange={
                                            handleChange
                                        }
                                    >
                                        <option value="Morning Batch">
                                            Morning Batch
                                        </option>

                                        <option value="Evening Batch">
                                            Evening Batch
                                        </option>
                                    </select>
                                </label>

                            </div>

                            <div className="form-section-title">
                                Parent / Guardian
                            </div>

                            <div className="form-grid">

                                <label>
                                    <span>
                                        Parent Name *
                                    </span>

                                    <input
                                        name="parent_name"
                                        value={
                                            form.parent_name
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    <span>
                                        WhatsApp / Mobile
                                    </span>

                                    <input
                                        name="parent_mobile"
                                        value={
                                            form.parent_mobile
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                </label>

                                <label className="full-width">
                                    <span>
                                        Address
                                    </span>

                                    <textarea
                                        name="address"
                                        value={
                                            form.address
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        rows="3"
                                    />
                                </label>

                            </div>

                            <div className="form-section-title">
                                Academy Information
                            </div>

                            <div className="form-grid">

                                <label>
                                    <span>
                                        Joining Date
                                    </span>

                                    <input
                                        type="date"
                                        name="joining_date"
                                        value={
                                            form.joining_date
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                </label>

                            </div>

                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={closeForm}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="primary-button"
                                >
                                    {editingStudent
                                        ? "Update Student"
                                        : "Create Student"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

        </div>
    );
}

export default Students;
