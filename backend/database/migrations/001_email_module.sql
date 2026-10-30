CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    branch_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_history (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id INTEGER,
    recipient_name VARCHAR(200),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    branch_id INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'FAILED',
    provider_response TEXT,
    error_message TEXT,
    created_by INTEGER,
    created_by_role VARCHAR(40),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_history_branch_created
ON email_history (branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_templates_branch
ON email_templates (branch_id);
