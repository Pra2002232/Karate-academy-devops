import { useMemo, useState } from "react";
import "./Messages.css";

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("admin_user") || "null");
  } catch {
    return null;
  }
}

const TEMPLATES = [
  {
    name: "karate_fee_reminder",
    category: "Utility",
    language: "English (US)",
    status: "Pending approval",
    description: "Fee reminders for monthly, costume and competition fees.",
  },
  {
    name: "hello_world",
    category: "Utility",
    language: "English (US)",
    status: "Approved",
    description: "Meta's standard test message.",
  },
];

function StatusPill({ children, status = "neutral" }) {
  return <span className={`msg-status msg-status--${status}`}>{children}</span>;
}

function MessageIcon({ children }) {
  return <span className="msg-icon" aria-hidden="true">{children}</span>;
}

export default function Messages() {
  const user = useMemo(readUser, []);
  const role = String(user?.role || "SUPER_ADMIN").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const assignedBranch =
    user?.branch_name ||
    user?.branchName ||
    user?.branch?.name ||
    user?.assignedBranch?.name ||
    "Assigned branch";

  const [activeTab, setActiveTab] = useState("Overview");
  const [messageType, setMessageType] = useState("fee");
  const [feeType, setFeeType] = useState("Monthly Fees");
  const [parentName, setParentName] = useState("Test Parent");
  const [studentName, setStudentName] = useState("Test Student");
  const [amount, setAmount] = useState("1500");
  const [dueDate, setDueDate] = useState("2026-10-31");
  const [attendanceStatus, setAttendanceStatus] = useState("Present");
  const [recipientGroup, setRecipientGroup] = useState("pending");
  const [branch, setBranch] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const previewMessage =
    messageType === "fee"
      ? `Hello ${parentName || "[Parent name]"},

This is a fee reminder from Karate Academy.

Student: ${studentName || "[Student name]"}
Fee type: ${feeType}
Amount due: ₹${amount || "0"}
Due date: ${dueDate || "[Due date]"}

If you have already paid, please contact the academy to update our records.

Thank you,
Karate Academy`
      : `Hello ${parentName || "[Parent name]"},

Attendance update from Karate Academy.

Student: ${studentName || "[Student name]"}
Attendance: ${attendanceStatus}
Date: [Attendance date]

Thank you,
Karate Academy`;

  const filteredTemplates = TEMPLATES.filter((template) =>
    `${template.name} ${template.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function openComposer() {
    setActiveTab("Compose");
    setNotice("");
  }

  function previewMessageAction(event) {
    event.preventDefault();
    setNotice("Preview updated. No WhatsApp message has been sent.");
  }

  function renderOverview() {
    return (
      <>
        <div className="msg-stat-grid">
          <article className="msg-stat-card">
            <div className="msg-stat-heading">
              <span>WhatsApp test sender</span>
              <MessageIcon>WA</MessageIcon>
            </div>
            <strong className="msg-stat-value">Connected for testing</strong>
            <span className="msg-stat-note">+1 555-666-8014</span>
          </article>

          <article className="msg-stat-card">
            <div className="msg-stat-heading">
              <span>Fee reminder template</span>
              <MessageIcon>TM</MessageIcon>
            </div>
            <strong className="msg-stat-value">Pending approval</strong>
            <span className="msg-stat-note">karate_fee_reminder</span>
          </article>

          <article className="msg-stat-card">
            <div className="msg-stat-heading">
              <span>Application automation</span>
              <MessageIcon>API</MessageIcon>
            </div>
            <strong className="msg-stat-value">Not connected</strong>
            <span className="msg-stat-note">Fee-trigger integration is next</span>
          </article>

          <article className="msg-stat-card">
            <div className="msg-stat-heading">
              <span>Message history</span>
              <MessageIcon>↗</MessageIcon>
            </div>
            <strong className="msg-stat-value">Not available yet</strong>
            <span className="msg-stat-note">History API not integrated</span>
          </article>
        </div>

        <div className="msg-content-grid">
          <section className="msg-panel">
            <div className="msg-panel-heading">
              <div>
                <h2>Quick actions</h2>
                <p>Prepare a notification for your academy.</p>
              </div>
            </div>

            <button className="msg-action-card" onClick={openComposer}>
              <MessageIcon>✉</MessageIcon>
              <span>
                <strong>Compose a message</strong>
                <small>Prepare a fee reminder or attendance update.</small>
              </span>
              <span className="msg-action-arrow">→</span>
            </button>

            <button
              className="msg-action-card"
              onClick={() => setActiveTab("Templates")}
            >
              <MessageIcon>▤</MessageIcon>
              <span>
                <strong>Manage templates</strong>
                <small>Review template approval status.</small>
              </span>
              <span className="msg-action-arrow">→</span>
            </button>

            <button
              className="msg-action-card"
              onClick={() => setActiveTab("History")}
            >
              <MessageIcon>◷</MessageIcon>
              <span>
                <strong>Message history</strong>
                <small>View this module's delivery records once connected.</small>
              </span>
              <span className="msg-action-arrow">→</span>
            </button>
          </section>

          <section className="msg-panel">
            <div className="msg-panel-heading">
              <div>
                <h2>Setup checklist</h2>
                <p>Current WhatsApp integration readiness.</p>
              </div>
            </div>

            <div className="msg-check-item">
              <span className="msg-check-icon msg-check-icon--done">✓</span>
              <div>
                <strong>Meta test sender</strong>
                <p>Test message received successfully.</p>
              </div>
              <StatusPill status="success">Complete</StatusPill>
            </div>

            <div className="msg-check-item">
              <span className="msg-check-icon">2</span>
              <div>
                <strong>Fee reminder template</strong>
                <p>Waiting for Meta to approve the template.</p>
              </div>
              <StatusPill status="warning">Pending</StatusPill>
            </div>

            <div className="msg-check-item">
              <span className="msg-check-icon">3</span>
              <div>
                <strong>Connect fee automation</strong>
                <p>Link the approved template to fee status changes.</p>
              </div>
              <StatusPill>Next</StatusPill>
            </div>

            <div className="msg-check-item">
              <span className="msg-check-icon">4</span>
              <div>
                <strong>Delivery tracking</strong>
                <p>Store message IDs and webhook status updates.</p>
              </div>
              <StatusPill>Planned</StatusPill>
            </div>
          </section>
        </div>
      </>
    );
  }

  function renderComposer() {
    return (
      <div className="msg-composer-grid">
        <section className="msg-panel">
          <div className="msg-panel-heading">
            <div>
              <h2>Compose notification</h2>
              <p>Choose a message type and set the preview values.</p>
            </div>
            <StatusPill status="warning">Preview mode</StatusPill>
          </div>

          <form className="msg-form" onSubmit={previewMessageAction}>
            <div className="msg-field">
              <label htmlFor="msg-type">Message type</label>
              <select
                id="msg-type"
                value={messageType}
                onChange={(event) => {
                  setMessageType(event.target.value);
                  setNotice("");
                }}
              >
                <option value="fee">Fee reminder</option>
                <option value="attendance">Attendance update</option>
              </select>
            </div>

            <div className="msg-field">
              <label htmlFor="msg-branch">Branch scope</label>
              {isSuperAdmin ? (
                <select
                  id="msg-branch"
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                >
                  <option value="all">All branches</option>
                  <option value="selected">
                    Selected branch (branch list integration pending)
                  </option>
                </select>
              ) : (
                <input
                  id="msg-branch"
                  value={assignedBranch}
                  readOnly
                  aria-readonly="true"
                />
              )}
              <small>
                {isSuperAdmin
                  ? "Branch selection will be connected to the branch API."
                  : "Your messages are scoped to your assigned branch."}
              </small>
            </div>

            <div className="msg-field">
              <label htmlFor="msg-audience">Recipients</label>
              <select
                id="msg-audience"
                value={recipientGroup}
                onChange={(event) => setRecipientGroup(event.target.value)}
              >
                <option value="pending">Parents with pending fees</option>
                <option value="individual">A specific parent</option>
                <option value="all">All opted-in parents in scope</option>
              </select>
            </div>

            {messageType === "fee" && (
              <>
                <div className="msg-field">
                  <label htmlFor="msg-fee-type">Fee category</label>
                  <select
                    id="msg-fee-type"
                    value={feeType}
                    onChange={(event) => setFeeType(event.target.value)}
                  >
                    <option>Monthly Fees</option>
                    <option>Costume Fees</option>
                    <option>Competition Fees</option>
                  </select>
                </div>

                <div className="msg-field-row">
                  <div className="msg-field">
                    <label htmlFor="msg-amount">Amount (₹)</label>
                    <input
                      id="msg-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>

                  <div className="msg-field">
                    <label htmlFor="msg-due-date">Due date</label>
                    <input
                      id="msg-due-date"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {messageType === "attendance" && (
              <div className="msg-field">
                <label htmlFor="msg-attendance">Attendance status</label>
                <select
                  id="msg-attendance"
                  value={attendanceStatus}
                  onChange={(event) => setAttendanceStatus(event.target.value)}
                >
                  <option>Present</option>
                  <option>Absent</option>
                  <option>Late</option>
                </select>
              </div>
            )}

            <div className="msg-field">
              <label htmlFor="msg-parent">Parent name (preview)</label>
              <input
                id="msg-parent"
                value={parentName}
                onChange={(event) => setParentName(event.target.value)}
                maxLength={100}
              />
            </div>

            <div className="msg-field">
              <label htmlFor="msg-student">Student name (preview)</label>
              <input
                id="msg-student"
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                maxLength={100}
              />
            </div>

            <div className="msg-template-note">
              <span className="msg-template-note-icon">i</span>
              <div>
                <strong>
                  {messageType === "fee"
                    ? "karate_fee_reminder"
                    : "Attendance template"}
                </strong>
                <p>
                  {messageType === "fee"
                    ? "Fee reminder is awaiting Meta approval."
                    : "An approved attendance template and backend integration are required."}
                </p>
              </div>
            </div>

            <div className="msg-form-actions">
              <button className="msg-btn msg-btn--primary" type="submit">
                Preview message
              </button>
              <button
                className="msg-btn msg-btn--secondary"
                type="button"
                onClick={() => {
                  setMessageType("fee");
                  setFeeType("Monthly Fees");
                  setParentName("Test Parent");
                  setStudentName("Test Student");
                  setAmount("1500");
                  setDueDate("2026-10-31");
                  setNotice("");
                }}
              >
                Reset
              </button>
            </div>

            {notice && <p className="msg-inline-notice">{notice}</p>}

            <p className="msg-disabled-note">
              Live sending is disabled until template approval, recipient
              selection, backend authorization and message logging are connected.
            </p>
          </form>
        </section>

        <section className="msg-preview-panel">
          <div className="msg-preview-top">
            <div>
              <span className="msg-preview-label">LIVE PREVIEW</span>
              <h2>WhatsApp message</h2>
            </div>
            <span className="msg-whatsapp-mark">WA</span>
          </div>

          <div className="msg-phone">
            <div className="msg-phone-header">
              <span className="msg-phone-avatar">K</span>
              <div>
                <strong>Karate Academy</strong>
                <small>Business account · Preview</small>
              </div>
            </div>
            <div className="msg-phone-chat">
              <div className="msg-chat-bubble">
                {previewMessage}
                <div className="msg-chat-time">Preview only</div>
              </div>
            </div>
            <div className="msg-phone-footer">
              <span>Template preview</span>
              <span>Not sent</span>
            </div>
          </div>

          <div className="msg-preview-footnote">
            <span>ⓘ</span>
            <p>
              This preview uses sample details. Real recipients and fee values
              will come from the backend after the integration is enabled.
            </p>
          </div>
        </section>
      </div>
    );
  }

  function renderTemplates() {
    return (
      <section className="msg-panel">
        <div className="msg-panel-heading msg-template-heading">
          <div>
            <h2>Message templates</h2>
            <p>Templates currently configured for WhatsApp testing.</p>
          </div>
          <input
            className="msg-search"
            placeholder="Search templates..."
            aria-label="Search templates"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="msg-table-wrap">
          <table className="msg-table">
            <thead>
              <tr>
                <th>Template</th>
                <th>Category</th>
                <th>Language</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map((template) => (
                <tr key={template.name}>
                  <td>
                    <strong>{template.name}</strong>
                    <small>{template.description}</small>
                  </td>
                  <td>{template.category}</td>
                  <td>{template.language}</td>
                  <td>
                    <StatusPill
                      status={
                        template.status === "Approved" ? "success" : "warning"
                      }
                    >
                      {template.status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
              {filteredTemplates.length === 0 && (
                <tr>
                  <td colSpan="4" className="msg-empty-cell">
                    No matching templates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="msg-table-note">
          Statuses shown here reflect the latest information available during
          setup. Live template status sync will be added through the backend.
        </p>
      </section>
    );
  }

  function renderHistory() {
    return (
      <section className="msg-panel msg-history-empty">
        <div className="msg-history-symbol">◷</div>
        <h2>No application messages yet</h2>
        <p>
          Messages sent manually from the Meta dashboard are not yet stored in
          this application's history.
        </p>
        <p>
          We'll show recipients, message type, send time, delivery status and
          failure details here when message logging and webhook updates are
          connected.
        </p>
        <button className="msg-btn msg-btn--primary" onClick={openComposer}>
          Prepare a message
        </button>
      </section>
    );
  }

  return (
    <div className="messages-page">
      <header className="msg-page-header">
        <div>
          <div className="msg-eyebrow">COMMUNICATION CENTER</div>
          <h1>Messages & Notifications</h1>
          <p>
            Manage WhatsApp notifications for fees, attendance and academy
            updates.
          </p>
        </div>
        <button className="msg-btn msg-btn--primary" onClick={openComposer}>
          <span aria-hidden="true">＋</span> Compose message
        </button>
      </header>

      <div className="msg-current-config">
        <span className="msg-config-dot" />
        <div>
          <strong>WhatsApp test environment</strong>
          <span>
            Sender: +1 555-666-8014 &nbsp;·&nbsp; Fee template awaiting approval
          </span>
        </div>
        <StatusPill status="warning">Test mode</StatusPill>
      </div>

      <nav className="msg-tabs" aria-label="Messages sections">
        {["Overview", "Compose", "Templates", "History"].map((tab) => (
          <button
            key={tab}
            className={`msg-tab ${activeTab === tab ? "msg-tab--active" : ""}`}
            onClick={() => {
              setActiveTab(tab);
              setNotice("");
            }}
          >
            {tab}
            {tab === "Templates" && (
              <span className="msg-tab-count">2</span>
            )}
          </button>
        ))}
      </nav>

      <div className="msg-scope-line">
        <span>
          {isSuperAdmin ? "Academy-wide access" : `Branch access: ${assignedBranch}`}
        </span>
        <span>{isSuperAdmin ? "Role: Admin" : "Role: Branch Admin"}</span>
      </div>

      {activeTab === "Overview" && renderOverview()}
      {activeTab === "Compose" && renderComposer()}
      {activeTab === "Templates" && renderTemplates()}
      {activeTab === "History" && renderHistory()}

      <footer className="msg-page-footer">
        <span>Karate Academy · Messages module</span>
        <span>Sending is not enabled in this UI-only stage.</span>
      </footer>
    </div>
  );
}
