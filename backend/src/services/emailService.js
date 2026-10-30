const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
    const {
        EMAIL_HOST,
        EMAIL_PORT,
        EMAIL_SECURE,
        EMAIL_USER,
        EMAIL_APP_PASSWORD
    } = process.env;

    if (
        !EMAIL_HOST ||
        !EMAIL_PORT ||
        !EMAIL_USER ||
        !EMAIL_APP_PASSWORD
    ) {
        throw new Error("Gmail SMTP settings are incomplete.");
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: EMAIL_HOST,
            port: Number(EMAIL_PORT),
            secure: String(EMAIL_SECURE).toLowerCase() === "true",
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_APP_PASSWORD
            },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000
        });
    }

    return transporter;
}

async function verifyEmailConnection() {
    return getTransporter().verify();
}

async function sendEmail({ to, subject, text }) {
    const mailer = getTransporter();

    const fromName =
        process.env.EMAIL_FROM_NAME || "Karate Academy";

    return mailer.sendMail({
        from: `"${fromName}" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text
    });
}

module.exports = {
    verifyEmailConnection,
    sendEmail
};
