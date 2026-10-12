import { useEffect, useState } from "react";
import api from "../services/api";
import "./Competitions.css";

const emptyForm = {
    competition_name: "",
    competition_date: "",
    location: "",
    organizer: "",
    description: ""
};

function Competitions() {
    const [competitions, setCompetitions] = useState([]);
    const [dashboard, setDashboard] = useState({
        upcoming_competitions: 0,
        completed_competitions: 0,
        total_registrations: 0
    });

    const [students, setStudents] = useState([]);
const currentUser = (() => {
        try {
            return JSON.parse(
                localStorage.getItem("admin_user") || "{}"
            );
        } catch {
            return {};
        }
    })();

    const isSuperAdmin =
        currentUser.role === "SUPER_ADMIN";

    const isBranchAdmin =
        currentUser.role === "BRANCH_ADMIN";

const [selectedCompetition, setSelectedCompetition] = useState(null);

    const [showCompetitionModal, setShowCompetitionModal] = useState(false);
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const [registration, setRegistration] = useState({
        student_id: "",
        category: "",
        event: "",
        remarks: ""
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            const [
                competitionRes,
                dashboardRes,
                studentsRes ] = await Promise.all([
                    api.get("/competitions"),
                    api.get("/competitions/dashboard"),
                    api.get("/students")
                ]);

            setCompetitions(competitionRes.data.competitions || []);
            setDashboard(
                dashboardRes.data || {
                    upcoming_competitions: 0,
                    completed_competitions: 0,
                    total_registrations: 0
                }
            );

            setStudents(studentsRes.data.students || []);

            const competitionQueryId =
                new URLSearchParams(
                    window.location.search
                ).get("id");

            if (competitionQueryId) {

                const targetCompetition =
                    (
                        competitionRes.data.competitions ||
                        []
                    ).find(
                        item =>
                            String(item.id) ===
                            String(competitionQueryId)
                    );

                if (targetCompetition) {

                    setTimeout(
                        () =>
                            openDetails(
                                targetCompetition
                            ),
                        0
                    );

                }

            }
} catch (err) {
            console.error(err);
            setError("Unable to load competition data.");
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleRegistrationChange = (e) => {
        setRegistration({
            ...registration,
            [e.target.name]: e.target.value
        });
    };

    const openCreateModal = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError("");
        setMessage("");
        setShowCompetitionModal(true);
    };

    const openEditModal = (competition) => {
        setEditingId(competition.id);

        setForm({
            competition_name: competition.competition_name || "",
            competition_date: competition.competition_date
                ? competition.competition_date.substring(0, 10)
                : "",
            location: competition.location || "",
            organizer: competition.organizer || "",
            description:
                competition.description || "",

        });

        setError("");
        setMessage("");
        setShowCompetitionModal(true);
    };

    const saveCompetition = async (e) => {
        e.preventDefault();

        if (
            !form.competition_name ||
            !form.competition_date
        ) {
            setError(
                "Competition name and date are required."
            );
            return;
        }

        try {
            setSaving(true);
            setError("");

            if (editingId) {
                await api.put(`/competitions/${editingId}`, form);
                setMessage("Competition updated successfully.");
            } else {
                await api.post("/competitions", form);
                setMessage("Competition created successfully.");
            }

            setShowCompetitionModal(false);
            setForm(emptyForm);
            setEditingId(null);

            await loadData();
        } catch (err) {
            console.error(err);
            setError(
                err.response?.data?.message ||
                "Unable to save competition."
            );
        } finally {
            setSaving(false);
        }
    };

    const deleteCompetition = async (id) => {
        const confirmed = window.confirm(
            "Delete this competition? All registrations will also be removed."
        );

        if (!confirmed) return;

        try {
            await api.delete(`/competitions/${id}`);
            setMessage("Competition deleted successfully.");
            await loadData();
        } catch (err) {
            console.error(err);
            setError(
                err.response?.data?.message ||
                "Unable to delete competition."
            );
        }
    };

    const openDetails = async (competition) => {
        try {
            const response = await api.get(
                `/competitions/${competition.id}`
            );

            setSelectedCompetition(response.data);
            setShowDetailsModal(true);
        } catch (err) {
            console.error(err);
            setError("Unable to load competition details.");
        }
    };

    const openRegistration = async (competition) => {
        try {
            const response = await api.get(
                `/competitions/${competition.id}`
            );

            setSelectedCompetition(response.data);

            setRegistration({
                student_id: "",
                category: "",
                event: "",
                remarks: ""
            });

            setError("");
            setShowRegistrationModal(true);
        } catch (err) {
            console.error(err);
            setError("Unable to open registration.");
        }
    };

    const registerStudent = async (e) => {
        e.preventDefault();

        if (!registration.student_id) {
            setError("Please select a student.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            await api.post(
                `/competitions/${selectedCompetition.competition.id}/register`,
                registration
            );

            setMessage("Student registered successfully.");
            setShowRegistrationModal(false);

            await loadData();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to register student."
            );
        } finally {
            setSaving(false);
        }
    };

    
const markCompetitionFeeCompleted = async (participant) => {
    const competitionId = selectedCompetition?.competition?.id;

    if (!competitionId || !participant?.id) {
        setError("Unable to identify the competition registration.");
        return;
    }

    const confirmed = window.confirm(
        `Confirm that the competition fee for ${participant.name} has been received?`
    );

    if (!confirmed) return;

    try {
        setSaving(true);
        setError("");
        setMessage("");

        await api.put(
            `/competitions/registration/${participant.id}/fee`,
            {}
        );

        const response = await api.get(`/competitions/${competitionId}`);
        setSelectedCompetition(response.data);
        setMessage(
            `${participant.name}'s competition fee is marked Fee Completed.`
        );

        await loadData();
    } catch (error) {
        console.error("Competition fee update error:", error);
        setError(
            error.response?.data?.message ||
            "Unable to mark the competition fee completed."
        );
    } finally {
        setSaving(false);
    }
};

const formatDate = (date) => {
        if (!date) return "-";

        return new Date(date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const isUpcoming = (date) => {
        if (!date) return false;

        const competitionDate = new Date(date);
        competitionDate.setHours(23, 59, 59, 999);

        return competitionDate >= new Date();
    };

    return (
        <div className="competition-page">

            {/* HEADER */}
            <div className="competition-header">
                <div>
                    <div className="competition-eyebrow">
                        COMPETITION MANAGEMENT
                    </div>

                    <h1>Competitions</h1>

                    <p>
                        Manage tournaments, student registrations,
                        events and competition activities.
                    </p>
                </div>

                <button
                    className="competition-primary-btn"
                    onClick={openCreateModal}
                >
                    + Create Competition
                </button>
            </div>

            {/* ALERTS */}
            {message && (
                <div className="competition-alert success">
                    ✓ {message}
                </div>
            )}

            {error && (
                <div className="competition-alert error">
                    ⚠ {error}
                    <button onClick={() => setError("")}>×</button>
                </div>
            )}

            {/* STATS */}
            <div className="competition-stats">

                <div className="competition-stat-card">
                    <div className="stat-icon upcoming">🏆</div>
                    <div>
                        <span>Upcoming</span>
                        <strong>{dashboard.upcoming_competitions}</strong>
                    </div>
                </div>

                <div className="competition-stat-card">
                    <div className="stat-icon completed">✓</div>
                    <div>
                        <span>Completed</span>
                        <strong>{dashboard.completed_competitions}</strong>
                    </div>
                </div>

                <div className="competition-stat-card">
                    <div className="stat-icon registrations">👥</div>
                    <div>
                        <span>Registrations</span>
                        <strong>{dashboard.total_registrations}</strong>
                    </div>
                </div>

                <div className="competition-stat-card">
                    <div className="stat-icon announcement">📢</div>
                    <div>
                        <span>Parent Announcements</span>
                        <strong>Ready</strong>
                    </div>
                </div>

            </div>

            {/* UPCOMING / ALL COMPETITIONS */}
            <div className="competition-section">

                <div className="section-heading">
                    <div>
                        <h2>Competition Calendar</h2>
                        <p>Upcoming and completed academy competitions</p>
                    </div>
                </div>

                {loading ? (
                    <div className="competition-empty">
                        Loading competitions...
                    </div>
                ) : competitions.length === 0 ? (
                    <div className="competition-empty">
                        <div className="empty-icon">🏆</div>
                        <h3>No competitions created</h3>
                        <p>
                            Create your first competition to start
                            registrations and parent announcements.
                        </p>

                        <button
                            className="competition-primary-btn"
                            onClick={openCreateModal}
                        >
                            + Create Competition
                        </button>
                    </div>
                ) : (
                    <div className="competition-grid">

                        {competitions.map((competition) => (
                            <div
                                    className="competition-card competition-card-clickable"
                                    key={competition.id}
                                    onClick={() =>
                                        openDetails(competition)
                                    }
                                >

                                <div className="competition-card-top">

                                    <span
                                        className={
                                            isUpcoming(
                                                competition.competition_date
                                            )
                                                ? "competition-status upcoming-status"
                                                : "competition-status completed-status"
                                        }
                                    >
                                        {isUpcoming(
                                            competition.competition_date
                                        )
                                            ? "UPCOMING"
                                            : "COMPLETED"}
                                    </span>

                                    <span className="competition-date">
                                        {formatDate(
                                            competition.competition_date
                                        )}
                                    </span>

                                </div>

                                <h3>
                                    {competition.competition_name}
                                </h3>

                                    {competition.branch_name && (
                                        <div className="competition-branch">
                                            📍 {competition.branch_name}
                                        </div>
                                    )}


                                <div className="competition-info">

                                    <div>
                                        <span>📍</span>
                                        <p>
                                            {competition.location ||
                                                "Location not specified"}
                                        </p>
                                    </div>

                                    <div>
                                        <span>🏢</span>
                                        <p>
                                            {competition.organizer ||
                                                "Organizer not specified"}
                                        </p>
                                    </div>

                                    <div>
                                        <span>👥</span>
                                        <p>
                                            {competition.registered_students ||
                                                0}{" "}
                                            registered students
                                        </p>
                                    </div>

                                </div>

                                {competition.description && (
                                    <p className="competition-description">
                                        {competition.description}
                                    </p>
                                )}

                                <div
                                    className="competition-actions"
                                    onClick={event =>
                                        event.stopPropagation()
                                    }
                                >

                                    <button
                                        className="action-btn view"
                                        onClick={() =>
                                            openDetails(competition)
                                        }
                                    >
                                        View
                                    </button>

                                    <button
                                        className="action-btn register"
                                        onClick={() =>
                                            openRegistration(competition)
                                        }
                                    >
                                        Register
                                    </button>

                                    {isUpcoming(
                                        competition.competition_date
                                    ) && (
                                        <button
                                            className="action-btn announce"
                                            onClick={() => {
                                                setSelectedCompetition({
                                                    competition
                                                });
                                                setShowAnnouncementModal(
                                                    true
                                                );
                                            }}
                                        >
                                            📢 Announce
                                        </button>
                                    )}

                                    <button
                                        className="action-btn edit"
                                        onClick={() =>
                                            openEditModal(competition)
                                        }
                                    >
                                        Edit
                                    </button>

                                    <button
                                        className="action-btn delete"
                                        onClick={() =>
                                            deleteCompetition(
                                                competition.id
                                            )
                                        }
                                    >
                                        Delete
                                    </button>

                                </div>

                            </div>
                        ))}

                    </div>
                )}

            </div>

            {/* CREATE / EDIT MODAL */}
            {showCompetitionModal && (
                <div className="competition-modal-overlay">

                    <div className="competition-modal">

                        <div className="modal-header">
                            <div>
                                <h2>
                                    {editingId
                                        ? "Edit Competition"
                                        : "Create Competition"}
                                </h2>

                                <p>
                                    Add competition information for
                                    the academy.
                                </p>
                            </div>

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowCompetitionModal(false)
                                }
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={saveCompetition}
                            className="competition-form"
                        >

                            <div className="form-group full">
                                <label>Competition Name *</label>

                                <input
                                    name="competition_name"
                                    value={
                                        form.competition_name
                                    }
                                    onChange={handleFormChange}
                                    placeholder="Example: Maharashtra State Karate Championship"
                                />
                            </div>

                            <div className="form-row">

                                <div className="form-group">
                                    <label>Competition Date *</label>

                                    <input
                                        type="date"
                                        name="competition_date"
                                        value={
                                            form.competition_date
                                        }
                                        onChange={handleFormChange}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Location</label>

                                    <input
                                        name="location"
                                        value={form.location}
                                        onChange={handleFormChange}
                                        placeholder="Mumbai, Maharashtra"
                                    />
                                </div>

                            </div>

                            <div className="form-group full">
                                <label>Organizer</label>

                                <input
                                    name="organizer"
                                    value={form.organizer}
                                    onChange={handleFormChange}
                                    placeholder="Competition organizer"
                                />
                            </div>

<div className="form-group full">
                                <label>Description</label>

                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleFormChange}
                                    placeholder="Competition details, rules, registration information..."
                                    rows="4"
                                />
                            </div>

                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() =>
                                        setShowCompetitionModal(false)
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="competition-primary-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingId
                                            ? "Update Competition"
                                            : "Create Competition"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* REGISTRATION MODAL */}
            {showRegistrationModal &&
                selectedCompetition && (
                    <div className="competition-modal-overlay">

                        <div className="competition-modal">

                            <div className="modal-header">

                                <div>
                                    <div className="modal-label">
                                        STUDENT REGISTRATION
                                    </div>

                                    <h2>
                                        {
                                            selectedCompetition
                                                .competition
                                                .competition_name
                                        }
                                    </h2>

                                    <p>
                                        Register a student for
                                        this competition.
                                    </p>
                                </div>

                                <button
                                    className="modal-close"
                                    onClick={() =>
                                        setShowRegistrationModal(
                                            false
                                        )
                                    }
                                >
                                    ×
                                </button>

                            </div>

                            <form
                                onSubmit={registerStudent}
                                className="competition-form"
                            >

                                <div className="form-group full">
                                    <label>Student *</label>

                                    <select
                                        name="student_id"
                                        value={
                                            registration.student_id
                                        }
                                        onChange={
                                            handleRegistrationChange
                                        }
                                    >
                                        <option value="">
                                            Select student
                                        </option>

                                        {students.map(
                                            (student) => (
                                                <option
                                                    key={
                                                        student.id
                                                    }
                                                    value={
                                                        student.id
                                                    }
                                                >
                                                    {
                                                        student.name
                                                    }{" "}
                                                    —{" "}
                                                    {
                                                        student.student_code
                                                    }
                                                </option>
                                            )
                                        )}

                                    </select>
                                </div>

                                <div className="form-row">

                                    <div className="form-group">
                                        <label>Category</label>

                                        <select
                                            name="category"
                                            value={
                                                registration.category
                                            }
                                            onChange={
                                                handleRegistrationChange
                                            }
                                        >
                                            <option value="">
                                                Select category
                                            </option>
                                            <option value="CHILDREN">
                                                Children
                                            </option>
                                            <option value="CADET">
                                                Cadet
                                            </option>
                                            <option value="JUNIOR">
                                                Junior
                                            </option>
                                            <option value="SENIOR">
                                                Senior
                                            </option>
                                            <option value="OPEN">
                                                Open
                                            </option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Event</label>

                                        <select
                                            name="event"
                                            value={
                                                registration.event
                                            }
                                            onChange={
                                                handleRegistrationChange
                                            }
                                        >
                                            <option value="">
                                                Select event
                                            </option>
                                            <option value="KATA">
                                                Kata
                                            </option>
                                            <option value="KUMITE">
                                                Kumite
                                            </option>
                                            <option value="TEAM_KATA">
                                                Team Kata
                                            </option>
                                            <option value="TEAM_KUMITE">
                                                Team Kumite
                                            </option>
                                        </select>
                                    </div>

                                </div>

                                <div className="form-group full">
                                    <label>Remarks</label>

                                    <textarea
                                        name="remarks"
                                        value={
                                            registration.remarks
                                        }
                                        onChange={
                                            handleRegistrationChange
                                        }
                                        rows="3"
                                        placeholder="Optional registration notes..."
                                    />
                                </div>

                                <div className="modal-footer">

                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={() =>
                                            setShowRegistrationModal(
                                                false
                                            )
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="competition-primary-btn"
                                        disabled={saving}
                                    >
                                        {saving
                                            ? "Registering..."
                                            : "Register Student"}
                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>
                )}

            {/* DETAILS MODAL */}
            {showDetailsModal &&
                selectedCompetition && (
                    <div className="competition-modal-overlay">

                        <div className="competition-modal details-modal">

                            <div className="modal-header">

                                <div>
                                    <div className="modal-label">
                                        COMPETITION DETAILS
                                    </div>

                                    <h2>
                                        {
                                            selectedCompetition
                                                .competition
                                                .competition_name
                                        }
                                    </h2>

                                    <p>
                                        {
                                            selectedCompetition
                                                .competition
                                                .location
                                        }{" "}
                                        •{" "}
                                        {formatDate(
                                            selectedCompetition
                                                .competition
                                                .competition_date
                                        )}
                                    </p>
                                </div>

                                <button
                                    className="modal-close"
                                    onClick={() =>
                                        setShowDetailsModal(false)
                                    }
                                >
                                    ×
                                </button>

                            </div>

                            <div className="details-summary">

                                <div>
                                    <span>Registered</span>
                                    <strong>
                                        {
                                            selectedCompetition
                                                .participants
                                                .filter(
                                                    (p) =>
                                                        p.registration_status !==
                                                        "CANCELLED"
                                                ).length
                                        }
                                    </strong>
                                </div>

                                <div>
                                    <span>Confirmed</span>
                                    <strong>
                                        {
                                            selectedCompetition
                                                .participants
                                                .filter(
                                                    (p) =>
                                                        p.registration_status ===
                                                        "CONFIRMED"
                                                ).length
                                        }
                                    </strong>
                                </div>

                                <div>
                                    <span>Paid</span>
                                    <strong>
                                        {
                                            selectedCompetition
                                                .participants
                                                .filter(
                                                    (p) =>
                                                        p.fee_status ===
                                                        "PAID"
                                                ).length
                                        }
                                    </strong>
                                </div>

                            </div>

                            <div className="participant-table-wrapper">

                                {selectedCompetition
                                    .participants.length === 0 ? (
                                    <div className="competition-empty small">
                                        No students registered yet.
                                    </div>
                                ) : (
                                    <>
                                    <table className="participant-table">

                                        <thead>
                                            <tr>
                                                <th>Student</th>
                                                <th>Category</th>
                                                <th>Event</th>
                                                <th>Status</th>
                                                <th>Fee</th>
                                            </tr>
                                        </thead>

                                        <tbody>

                                            {selectedCompetition
                                                .participants
                                                .map(
                                                    (participant) => (
                                                        <tr
                                                            key={
                                                                participant.id
                                                            }
                                                        >
                                                            <td>
                                                                <strong>
                                                                    {
                                                                        participant.name
                                                                    }
                                                                </strong>

                                                                <small>
                                                                    {
                                                                        participant.student_code
                                                                    }
                                                                </small>
                                                            </td>

                                                            <td>
                                                                {
                                                                    participant.category ||
                                                                    "-"
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    participant.event ||
                                                                    "-"
                                                                }
                                                            </td>

                                                            <td>
                                                                <span className="table-badge">
                                                                    {
                                                                        participant.registration_status
                                                                    }
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={
                                                                        participant.fee_status ===
                                                                        "PAID"
                                                                            ? "fee-paid"
                                                                            : "fee-pending"
                                                                    }
                                                                >
                                                                    {
                                                                        participant.fee_status
                                                                    }
                                                                </span>
                                                            </td>

                                                        </tr>
                                                    )
                                                )}

                                        </tbody>

                                    </table>

                        <section className="competition-fee-management">
                            <div className="competition-fee-heading">
                                <h3>Competition Fee Management</h3>
                                <p>After receiving the payment, update the registration status below.</p>
                            </div>

                            {(selectedCompetition?.participants || []).length === 0 ? (
                                <p className="competition-fee-empty">
                                    No student registrations yet.
                                </p>
                            ) : (
                                <div className="competition-fee-list">
                                    {selectedCompetition.participants.map((participant) => (
                                        <div className="competition-fee-row" key={participant.id}>
                                            <div className="competition-fee-student">
                                                <strong>{participant.name}</strong>
                                                <span>
                                                    {[participant.category, participant.event]
                                                        .filter(Boolean)
                                                        .join(" · ") || "Category/event not specified"}
                                                </span>
                                            </div>

                                            {participant.fee_status === "PAID" ? (
                                                <span className="competition-fee-completed">
                                                    ✓ Fee Completed
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="competition-fee-button"
                                                    disabled={saving}
                                                    onClick={() =>
                                                        markCompetitionFeeCompleted(participant)
                                                    }
                                                >
                                                    {saving ? "Updating..." : "Mark Fee Completed"}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                                    </>
                                )}

                            </div>

                        </div>

                    </div>
                )}

            {/* ANNOUNCEMENT MODAL */}
            {showAnnouncementModal &&
                selectedCompetition && (
                    <div className="competition-modal-overlay">

                        <div className="competition-modal announcement-modal">

                            <div className="modal-header">

                                <div>
                                    <div className="modal-label">
                                        PARENT ANNOUNCEMENT
                                    </div>

                                    <h2>
                                        📢 Upcoming Competition
                                    </h2>

                                    <p>
                                        Send registration invitation
                                        to active students' parents.
                                    </p>
                                </div>

                                <button
                                    className="modal-close"
                                    onClick={() =>
                                        setShowAnnouncementModal(
                                            false
                                        )
                                    }
                                >
                                    ×
                                </button>

                            </div>

                            <div className="announcement-preview">

                                <div className="preview-audience">
                                    <span>Audience</span>
                                    <strong>
                                        ALL ACTIVE STUDENTS' PARENTS
                                    </strong>
                                </div>

                                <div className="preview-message">

                                    <p>
                                        Dear Parent,
                                    </p>

                                    <p>
                                        Our academy is participating
                                        in{" "}
                                        <strong>
                                            {
                                                selectedCompetition
                                                    .competition
                                                    .competition_name
                                            }
                                        </strong>
                                        .
                                    </p>

                                    <p>
                                        📅 Date:{" "}
                                        <strong>
                                            {formatDate(
                                                selectedCompetition
                                                    .competition
                                                    .competition_date
                                            )}
                                        </strong>
                                    </p>

                                    <p>
                                        📍 Location:{" "}
                                        <strong>
                                            {
                                                selectedCompetition
                                                    .competition
                                                    .location
                                            }
                                        </strong>
                                    </p>

                                    <p>
                                        Students interested in
                                        participating are requested
                                        to register with the academy
                                        before the registration
                                        deadline.
                                    </p>

                                    <p>
                                        Thank you,
                                        <br />
                                        United Shotokan Karate
                                        Association India
                                    </p>

                                </div>

                            </div>

                            <div className="announcement-note">
                                <strong>WhatsApp integration:</strong>

                                <span>
                                    This announcement will be connected
                                    to the centralized Meta WhatsApp
                                    notification system after the
                                    messaging module is completed.
                                </span>
                            </div>

                            <div className="modal-footer">

                                <button
                                    className="secondary-btn"
                                    onClick={() =>
                                        setShowAnnouncementModal(
                                            false
                                        )
                                    }
                                >
                                    Close
                                </button>

                                <button
                                    className="competition-primary-btn"
                                    onClick={() => {
                                        setMessage(
                                            "Announcement is ready. Meta WhatsApp integration will be connected later."
                                        );
                                        setShowAnnouncementModal(
                                            false
                                        );
                                    }}
                                >
                                    Prepare Announcement
                                </button>

                            </div>

                        </div>

                    </div>
                )}

        </div>
    );
}

export default Competitions;
