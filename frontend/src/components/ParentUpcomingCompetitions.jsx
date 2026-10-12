import { useEffect, useState } from "react";
import api from "../services/api";
import "./ParentUpcomingCompetitions.css";

const CATEGORY_OPTIONS = [{"value": "CHILDREN", "label": "Children"}, {"value": "CADET", "label": "Cadet"}, {"value": "JUNIOR", "label": "Junior"}, {"value": "SENIOR", "label": "Senior"}, {"value": "OPEN", "label": "Open"}];
const EVENT_OPTIONS = [{"value": "KATA", "label": "Kata"}, {"value": "KUMITE", "label": "Kumite"}, {"value": "TEAM_KATA", "label": "Team Kata"}, {"value": "TEAM_KUMITE", "label": "Team Kumite"}];

function formatDate(value) {
    if (!value) return "Date not announced";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

function statusLabel(status) {
    return ({
        REGISTERED: "Registered",
        CONFIRMED: "Confirmed",
        CANCELLED: "Cancelled"
    })[status] || status || "Not registered";
}

function feeLabel(status) {
    return status === "PAID" ? "Fee Completed" : "Fee Pending";
}

export default function ParentUpcomingCompetitions() {
    const [competitions, setCompetitions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({
        student_id: "", category: "", event: "", remarks: ""
    });
    const [loading, setLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadList = async () => {
        const response = await api.get("/parents/portal/competitions");
        const list = Array.isArray(response.data?.competitions)
            ? response.data.competitions : [];
        setCompetitions(list);
        setSelected(current => current
            ? (list.find(item => String(item.id) === String(current.id)) || current)
            : current);
        return list;
    };

    useEffect(() => {
        let active = true;

        const refresh = async () => {
            try {
                const response = await api.get("/parents/portal/competitions");
                if (!active) return;

                const list = Array.isArray(response.data?.competitions)
                    ? response.data.competitions : [];

                setCompetitions(list);
                setSelected(current => current
                    ? (list.find(item => String(item.id) === String(current.id)) || current)
                    : current);
                setError("");
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to load upcoming competitions."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        refresh();
        const timer = window.setInterval(refresh, 20000);
        window.addEventListener("focus", refresh);

        return () => {
            active = false;
            window.clearInterval(timer);
            window.removeEventListener("focus", refresh);
        };
    }, []);

    const openDetails = async (id) => {
        const card = competitions.find(item => Number(item.id) === Number(id));
        setSelected(card || null);
        setForm({
            student_id: card?.eligible_students?.[0]
                ? String(card.eligible_students[0].id) : "",
            category: "", event: "", remarks: ""
        });
        setNotice("");
        setError("");
        setDetailsLoading(true);

        try {
            const response = await api.get(`/parents/portal/competitions/${id}`);
            setSelected(response.data?.competition || null);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load competition details."
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    const refreshSelected = async (id) => {
        const response = await api.get(`/parents/portal/competitions/${id}`);
        setSelected(response.data?.competition || null);
        await loadList();
    };

    const registerStudent = async (event) => {
        event.preventDefault();

        if (!selected || !form.student_id) {
            setError("Please select your child.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setNotice("");

            const response = await api.post(
                `/parents/portal/competitions/${selected.id}/register`,
                {
                    student_id: Number(form.student_id),
                    category: form.category || null,
                    event: form.event || null,
                    remarks: form.remarks || null
                }
            );

            setNotice(
                `${response.data?.student_name || "Student"} registered successfully.`
            );

            await refreshSelected(selected.id);
            setForm(current => ({
                ...current, category: "", event: "", remarks: ""
            }));
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to register your child."
            );
        } finally {
            setSaving(false);
        }
    };

    const eligibleStudents = selected?.eligible_students || [];

    return (
        <div className="parent-upcoming-competitions">
            {loading ? (
                <div className="puc-empty">Loading upcoming competitions…</div>
            ) : competitions.length === 0 ? (
                <div className="puc-empty">
                    <span className="puc-empty-icon">🏆</span>
                    <strong>No upcoming competitions available</strong>
                    <span>Competitions applicable to your child will appear here.</span>
                    {error && <p className="puc-error">{error}</p>}
                </div>
            ) : (
                <div className="puc-grid">
                    {competitions.map(item => (
                        <button
                            type="button"
                            className="puc-card"
                            key={item.id}
                            onClick={() => openDetails(item.id)}
                        >
                            <span className="puc-card-top">
                                <span className="puc-kicker">UPCOMING</span>
                                <span className="puc-date">{formatDate(item.date)}</span>
                            </span>
                            <strong className="puc-title">{item.name}</strong>
                            <span className="puc-meta">
                                📍 {item.location || "Location to be announced"}
                            </span>
                            <span className="puc-meta">
                                🏛️ {item.branch_name || "Academy-wide"}
                            </span>
                            <span className="puc-card-bottom">
                                <span>{(item.eligible_students || []).length} eligible student(s)</span>
                                <span className="puc-view-link">View details →</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {error && competitions.length > 0 && (
                <div className="puc-error" role="alert">{error}</div>
            )}

            {selected && (
                <div className="puc-overlay" onClick={() => setSelected(null)}>
                    <section
                        className="puc-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="puc-detail-title"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="puc-modal-header">
                            <div>
                                <span className="puc-kicker">COMPETITION DETAILS</span>
                                <h3 id="puc-detail-title">{selected.name}</h3>
                                <p className="puc-subtitle">
                                    {selected.location || "Location to be announced"}
                                    {" · "}{formatDate(selected.date)}
                                </p>
                            </div>
                            <button
                                className="puc-close"
                                type="button"
                                onClick={() => setSelected(null)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        {detailsLoading ? (
                            <div className="puc-empty">Loading details…</div>
                        ) : (
                            <>
                                <div className="puc-detail-grid">
                                    <div>
                                        <span>Organized by</span>
                                        <strong>{selected.branch_name || "Academy-wide"}</strong>
                                    </div>
                                    <div>
                                        <span>Organizer</span>
                                        <strong>
                                            {selected.organizer ||
                                                "United Shotokan Karate Association India"}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Location</span>
                                        <strong>{selected.location || "To be announced"}</strong>
                                    </div>
                                    <div>
                                        <span>Description</span>
                                        <strong>{selected.description || "No additional description."}</strong>
                                    </div>
                                </div>

                                <div className="puc-registration-section">
                                    <h4>Registration and fee status</h4>

                                    {eligibleStudents.map(student => (
                                        <div className="puc-status-card" key={student.id}>
                                            <strong>{student.name}</strong>
                                            <span className="puc-student-meta">
                                                {[student.studentCode, student.belt]
                                                    .filter(Boolean).join(" · ")}
                                            </span>

                                            {(student.registrations || []).length === 0 ? (
                                                <span className="puc-status">Not registered</span>
                                            ) : (
                                                <div className="puc-registration-history">
                                                    {student.registrations.map(item => (
                                                        <div className="puc-registration-history-row" key={item.id}>
                                                            <span>
                                                                {[item.category, item.event]
                                                                    .filter(Boolean).join(" · ") ||
                                                                    "General registration"}
                                                            </span>
                                                            <span>{statusLabel(item.registration_status)}</span>
                                                            <span className={
                                                                item.fee_status === "PAID"
                                                                    ? "puc-status registered"
                                                                    : "puc-status pending"
                                                            }>
                                                                {feeLabel(item.fee_status)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {eligibleStudents.length === 0 && (
                                        <p>No linked student is eligible for this competition.</p>
                                    )}
                                </div>

                                {eligibleStudents.length > 0 && (
                                    <form className="puc-register-form" onSubmit={registerStudent}>
                                        <h4>Register Student</h4>

                                        <label htmlFor="puc-student">Student *</label>
                                        <select
                                            id="puc-student"
                                            required
                                            value={form.student_id}
                                            onChange={event => setForm({
                                                ...form, student_id: event.target.value
                                            })}
                                        >
                                            <option value="">Select student</option>
                                            {eligibleStudents.map(student => (
                                                <option key={student.id} value={String(student.id)}>
                                                    {student.name}
                                                    {student.studentCode
                                                        ? ` (${student.studentCode})` : ""}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="puc-form-row">
                                            <div className="puc-field">
                                                <label htmlFor="puc-category">Category</label>
                                                <select
                                                    id="puc-category"
                                                    value={form.category}
                                                    onChange={event => setForm({
                                                        ...form, category: event.target.value
                                                    })}
                                                >
                                                    <option value="">Select category</option>
                                                    {CATEGORY_OPTIONS.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="puc-field">
                                                <label htmlFor="puc-event">Event</label>
                                                <select
                                                    id="puc-event"
                                                    value={form.event}
                                                    onChange={event => setForm({
                                                        ...form, event: event.target.value
                                                    })}
                                                >
                                                    <option value="">Select event</option>
                                                    {EVENT_OPTIONS.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <label htmlFor="puc-remarks">Remarks</label>
                                        <textarea
                                            id="puc-remarks"
                                            rows="3"
                                            placeholder="Optional registration notes…"
                                            value={form.remarks}
                                            onChange={event => setForm({
                                                ...form, remarks: event.target.value
                                            })}
                                        />

                                        {notice && <div className="puc-success">{notice}</div>}
                                        {error && <div className="puc-error" role="alert">{error}</div>}

                                        <button
                                            type="submit"
                                            className="puc-register-button"
                                            disabled={saving || !form.student_id}
                                        >
                                            {saving ? "Registering…" : "Register Student"}
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
