import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./EmailMessages.css";

function readUser() {
    try {
        return JSON.parse(localStorage.getItem("admin_user") || "null");
    } catch {
        return null;
    }
}

function Status({ children, type = "neutral" }) {
    return <span className={`email-status email-status--${type}`}>{children}</span>;
}

export default function EmailMessages() {
    const user = useMemo(readUser, []);
    const isSuperAdmin = String(user?.role || "").toUpperCase() === "SUPER_ADMIN";

    const [activeTab, setActiveTab] = useState("Overview");
    const [connection, setConnection] = useState(null);
    const [parents, setParents] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [history, setHistory] = useState([]);
    const [selectedParents, setSelectedParents] = useState([]);
    const [search, setSearch] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [templateName, setTemplateName] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    async function loadData() {
        setLoading(true);
        setError("");

        const requests = await Promise.allSettled([
            api.get("/email/status"),
            api.get("/email/parents"),
            api.get("/email/templates"),
            api.get("/email/history")
        ]);

        if (requests[0].status === "fulfilled") {
            setConnection(requests[0].value.data);
        } else {
            setConnection({
                success: false,
                message: "Gmail connection could not be verified."
            });
        }

        if (requests[1].status === "fulfilled") {
            setParents(requests[1].value.data.parents || []);
        } else {
            setError(
                requests[1].reason?.response?.data?.message ||
                "Unable to load parent email contacts."
            );
        }

        if (requests[2].status === "fulfilled") {
            setTemplates(requests[2].value.data.templates || []);
        }

        if (requests[3].status === "fulfilled") {
            setHistory(requests[3].value.data.history || []);
        }

        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, []);

    const filteredParents = parents.filter(parent => {
        const value = [
            parent.parent_name,
            parent.email,
            parent.student_names
        ].join(" ").toLowerCase();

        return value.includes(search.toLowerCase());
    });

    function toggleParent(parentId) {
        setSelectedParents(current =>
            current.includes(parentId)
                ? current.filter(id => id !== parentId)
                : [...current, parentId]
        );
    }

    function selectAllVisible() {
        const visibleIds = filteredParents.map(parent => parent.parent_user_id);

        setSelectedParents(current => [
            ...new Set([...current, ...visibleIds])
        ]);
    }

    function clearSelection() {
        setSelectedParents([]);
    }

    function applyTemplate(templateId) {
        setSelectedTemplate(templateId);

        const template = templates.find(
            item => String(item.id) === String(templateId)
        );

        if (template) {
            setSubject(template.subject || "");
            setBody(template.body || "");
        }
    }

    async function saveTemplate() {
        setError("");
        setNotice("");

        if (!templateName.trim() || !subject.trim() || !body.trim()) {
            setError("Enter a template name, subject and message first.");
            return;
        }

        try {
            await api.post("/email/templates", {
                name: templateName.trim(),
                subject: subject.trim(),
                body: body.trim()
            });

            setNotice("Email template saved successfully.");
            setTemplateName("");
            setSelectedTemplate("");
            const response = await api.get("/email/templates");
            setTemplates(response.data.templates || []);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "Unable to save the email template."
            );
        }
    }

    async function sendEmails(event) {
        event.preventDefault();
        setError("");
        setNotice("");

        if (selectedParents.length === 0) {
            setError("Select at least one parent.");
            return;
        }

        if (!subject.trim() || !body.trim()) {
            setError("Email subject and message are required.");
            return;
        }

        const confirmed = window.confirm(
            `Send this email to ${selectedParents.length} selected parent account(s)?`
        );

        if (!confirmed) return;

        setSending(true);

        try {
            const response = await api.post("/email/send", {
                parentUserIds: selectedParents,
                subject: subject.trim(),
                body: body.trim()
            });

            setNotice(response.data.message || "Email request processed.");
            setSelectedParents([]);

            const historyResponse = await api.get("/email/history");
            setHistory(historyResponse.data.history || []);
            setActiveTab("History");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "Email sending failed. Please check Gmail SMTP settings."
            );
        } finally {
            setSending(false);
        }
    }

    const acceptedCount = history.filter(
        item => item.status === "ACCEPTED"
    ).length;

    const failedCount = history.filter(
        item => item.status === "FAILED"
    ).length;

    return (
        <div className="email-page">
            <header className="email-header">
                <div>
                    <div className="email-eyebrow">COMMUNICATION CENTER</div>
                    <h1>Email Messages</h1>
                    <p>Send academy updates and notifications to parents using Gmail.</p>
                </div>

                <button
                    className="email-button email-button--primary"
                    onClick={() => setActiveTab("Compose")}
                >
                    + Compose Email
                </button>
            </header>

            <div className={`email-connection ${connection?.success ? "is-connected" : "is-disconnected"}`}>
                <div className="email-connection-dot" />
                <div>
                    <strong>
                        {connection?.success
                            ? "Gmail SMTP connected"
                            : "Gmail connection not verified"}
                    </strong>
                    <span>
                        {connection?.success
                            ? `Sender: ${connection.sender}`
                            : "Check your backend Gmail SMTP configuration."}
                    </span>
                </div>
                <button
                    className="email-button email-button--secondary"
                    onClick={loadData}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            <nav className="email-tabs">
                {["Overview", "Compose", "Templates", "History"].map(tab => (
                    <button
                        key={tab}
                        className={activeTab === tab ? "email-tab active" : "email-tab"}
                        onClick={() => {
                            setActiveTab(tab);
                            setError("");
                            setNotice("");
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </nav>

            <div className="email-scope">
                <span>
                    Access: <strong>{isSuperAdmin ? "All branches" : "Assigned branch only"}</strong>
                </span>
                <span>
                    {parents.length} parent contact(s) with email addresses
                </span>
            </div>

            {error && <div className="email-alert email-alert--error">{error}</div>}
            {notice && <div className="email-alert email-alert--success">{notice}</div>}

            {loading ? (
                <section className="email-panel">
                    Loading email module...
                </section>
            ) : (
                <>
                    {activeTab === "Overview" && (
                        <>
                            <div className="email-stats">
                                <article className="email-stat">
                                    <span>Parent email contacts</span>
                                    <strong>{parents.length}</strong>
                                    <small>Available in your permitted branch scope</small>
                                </article>

                                <article className="email-stat">
                                    <span>Saved templates</span>
                                    <strong>{templates.length}</strong>
                                    <small>Reusable email messages</small>
                                </article>

                                <article className="email-stat">
                                    <span>SMTP accepted</span>
                                    <strong>{acceptedCount}</strong>
                                    <small>Recorded in current email history</small>
                                </article>

                                <article className="email-stat">
                                    <span>Failed attempts</span>
                                    <strong>{failedCount}</strong>
                                    <small>Review history for error details</small>
                                </article>
                            </div>

                            <section className="email-panel">
                                <div className="email-panel-heading">
                                    <div>
                                        <h2>Quick actions</h2>
                                        <p>Manage parent communication from one place.</p>
                                    </div>
                                </div>

                                <div className="email-action-grid">
                                    <button onClick={() => setActiveTab("Compose")}>
                                        <span>✉</span>
                                        <strong>Compose email</strong>
                                        <small>Send an individual or bulk parent email.</small>
                                    </button>

                                    <button onClick={() => setActiveTab("Templates")}>
                                        <span>▤</span>
                                        <strong>Email templates</strong>
                                        <small>Save fee reminders and academy announcements.</small>
                                    </button>

                                    <button onClick={() => setActiveTab("History")}>
                                        <span>◷</span>
                                        <strong>Email history</strong>
                                        <small>Review accepted and failed email attempts.</small>
                                    </button>
                                </div>
                            </section>
                        </>
                    )}

                    {activeTab === "Compose" && (
                        <form className="email-compose-grid" onSubmit={sendEmails}>
                            <section className="email-panel">
                                <div className="email-panel-heading">
                                    <div>
                                        <h2>Compose email</h2>
                                        <p>Choose parent contacts and prepare your message.</p>
                                    </div>
                                    <Status type="neutral">Gmail SMTP</Status>
                                </div>

                                <div className="email-field">
                                    <label htmlFor="email-template">Use saved template</label>
                                    <select
                                        id="email-template"
                                        value={selectedTemplate}
                                        onChange={event => applyTemplate(event.target.value)}
                                    >
                                        <option value="">Choose a template</option>
                                        {templates.map(template => (
                                            <option key={template.id} value={template.id}>
                                                {template.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="email-field">
                                    <label htmlFor="email-subject">Subject</label>
                                    <input
                                        id="email-subject"
                                        value={subject}
                                        onChange={event => setSubject(event.target.value)}
                                        placeholder="Example: Monthly fee reminder"
                                        maxLength={255}
                                        required
                                    />
                                </div>

                                <div className="email-field">
                                    <label htmlFor="email-body">Message</label>
                                    <textarea
                                        id="email-body"
                                        value={body}
                                        onChange={event => setBody(event.target.value)}
                                        placeholder="Write your email message..."
                                        rows={12}
                                        required
                                    />
                                    <small>
                                        Available placeholders: {"{parent_name}"} and {"{student_names}"}
                                    </small>
                                </div>

                                <div className="email-field">
                                    <label htmlFor="email-template-name">Save as a new template (optional)</label>
                                    <input
                                        id="email-template-name"
                                        value={templateName}
                                        onChange={event => setTemplateName(event.target.value)}
                                        placeholder="Example: Monthly Fee Reminder"
                                    />
                                    <button
                                        type="button"
                                        className="email-button email-button--secondary"
                                        onClick={saveTemplate}
                                    >
                                        Save Template
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    className="email-button email-button--primary email-send-button"
                                    disabled={sending || !connection?.success}
                                >
                                    {sending ? "Sending..." : `Send Email (${selectedParents.length})`}
                                </button>

                                {!connection?.success && (
                                    <p className="email-help">
                                        Sending is disabled until Gmail SMTP connection is verified.
                                    </p>
                                )}
                            </section>

                            <section className="email-panel">
                                <div className="email-panel-heading">
                                    <div>
                                        <h2>Select recipients</h2>
                                        <p>Only parent accounts with a saved email address are listed.</p>
                                    </div>
                                    <Status>{selectedParents.length} selected</Status>
                                </div>

                                <div className="email-recipient-tools">
                                    <input
                                        value={search}
                                        onChange={event => setSearch(event.target.value)}
                                        placeholder="Search parent, student or email..."
                                    />
                                    <div>
                                        <button type="button" onClick={selectAllVisible}>
                                            Select visible
                                        </button>
                                        <button type="button" onClick={clearSelection}>
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                <div className="email-recipient-list">
                                    {filteredParents.map(parent => (
                                        <label className="email-recipient" key={parent.parent_user_id}>
                                            <input
                                                type="checkbox"
                                                checked={selectedParents.includes(parent.parent_user_id)}
                                                onChange={() => toggleParent(parent.parent_user_id)}
                                            />
                                            <span className="email-recipient-info">
                                                <strong>{parent.parent_name || "Parent"}</strong>
                                                <small>{parent.email}</small>
                                                <small>Student(s): {parent.student_names || "Not available"}</small>
                                            </span>
                                        </label>
                                    ))}

                                    {filteredParents.length === 0 && (
                                        <div className="email-empty">
                                            No parent contacts found.
                                        </div>
                                    )}
                                </div>
                            </section>
                        </form>
                    )}

                    {activeTab === "Templates" && (
                        <section className="email-panel">
                            <div className="email-panel-heading">
                                <div>
                                    <h2>Email templates</h2>
                                    <p>Templates are shared globally or restricted to their own branch.</p>
                                </div>
                                <button
                                    className="email-button email-button--primary"
                                    onClick={() => setActiveTab("Compose")}
                                >
                                    Create Template
                                </button>
                            </div>

                            {templates.length === 0 ? (
                                <div className="email-empty">
                                    No templates saved yet. Create one from the Compose Email screen.
                                </div>
                            ) : (
                                <div className="email-template-list">
                                    {templates.map(template => (
                                        <article className="email-template" key={template.id}>
                                            <div>
                                                <strong>{template.name}</strong>
                                                <p>{template.subject}</p>
                                                <small>{template.body}</small>
                                            </div>
                                            <button
                                                className="email-button email-button--secondary"
                                                onClick={() => {
                                                    applyTemplate(template.id);
                                                    setActiveTab("Compose");
                                                }}
                                            >
                                                Use Template
                                            </button>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === "History" && (
                        <section className="email-panel">
                            <div className="email-panel-heading">
                                <div>
                                    <h2>Email history</h2>
                                    <p>Latest 200 email attempts.</p>
                                </div>
                                <button
                                    className="email-button email-button--secondary"
                                    onClick={loadData}
                                >
                                    Refresh History
                                </button>
                            </div>

                            <div className="email-table-wrap">
                                <table className="email-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Parent</th>
                                            <th>Email</th>
                                            <th>Subject</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(item => (
                                            <tr key={item.id}>
                                                <td>{new Date(item.created_at).toLocaleString()}</td>
                                                <td>{item.recipient_name || "Parent"}</td>
                                                <td>{item.recipient_email}</td>
                                                <td>{item.subject}</td>
                                                <td>
                                                    {item.status === "ACCEPTED"
                                                        ? <Status type="success">SMTP accepted</Status>
                                                        : <Status type="danger">Failed</Status>}
                                                    {item.error_message && (
                                                        <small className="email-error-detail">
                                                            {item.error_message}
                                                        </small>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {history.length === 0 && (
                                    <div className="email-empty">No email history yet.</div>
                                )}
                            </div>

                            <p className="email-help">
                                "SMTP accepted" means Gmail accepted the message for processing. It does not confirm that the recipient received it or that it reached the inbox.
                            </p>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
