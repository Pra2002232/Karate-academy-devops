CREATE TABLE IF NOT EXISTS whatsapp_notification_logs (
    id BIGSERIAL PRIMARY KEY,
    fee_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    branch_id INTEGER,
    recipient_phone VARCHAR(30),
    template_name VARCHAR(100) NOT NULL,
    message_id VARCHAR(255),
    status VARCHAR(30) NOT NULL,
    trigger_event VARCHAR(40) NOT NULL,
    error_message TEXT,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_fee
ON whatsapp_notification_logs (fee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_logs_branch
ON whatsapp_notification_logs (branch_id, created_at DESC);
