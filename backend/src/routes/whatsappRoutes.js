const express = require("express");
const crypto = require("crypto");

const {
    sendWhatsAppMessage,
    getWhatsAppConfig
} = require("../services/whatsappService");

const router = express.Router();

// Existing configuration endpoint
router.get("/status", (req, res) => {
    try {
        const config = getWhatsAppConfig();

        res.json({
            success: true,
            whatsapp: config
        });
    } catch (error) {
        console.error("WhatsApp status error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to check WhatsApp configuration"
        });
    }
});

// Existing send endpoint
router.post("/send", async (req, res) => {
    try {
        const { phoneNumber, message } = req.body || {};

        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                message: "phoneNumber and message are required"
            });
        }

        const result = await sendWhatsAppMessage(
            phoneNumber,
            message
        );

        return res.json({
            success: true,
            message: "WhatsApp message sent successfully",
            data: result
        });
    } catch (error) {
        console.error(
            "WhatsApp send error:",
            error.response?.data || error.message
        );

        return res.status(error.response?.status || 500).json({
            success: false,
            message: "Failed to send WhatsApp message",
            error: error.response?.data || error.message
        });
    }
});

// Meta webhook verification (GET)
router.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (!expectedToken) {
        console.error("WhatsApp verification token is missing");
        return res.sendStatus(500);
    }

    if (
        mode === "subscribe" &&
        typeof token === "string" &&
        typeof challenge === "string" &&
        token === expectedToken
    ) {
        console.log("WhatsApp webhook verification successful");
        return res.status(200).type("text/plain").send(challenge);
    }

    return res.sendStatus(403);
});

// Verify Meta's X-Hub-Signature-256 header
function isValidMetaSignature(req) {
    const appSecret = process.env.META_APP_SECRET;
    const signature = req.get("x-hub-signature-256");
    const rawBody = req.rawBody;

    if (!appSecret || !signature || !Buffer.isBuffer(rawBody)) {
        return false;
    }

    const expected = "sha256=" + crypto
        .createHmac("sha256", appSecret)
        .update(rawBody)
        .digest("hex");

    const receivedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");

    return receivedBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

// Meta webhook events (POST)
router.post("/webhook", (req, res) => {
    if (!isValidMetaSignature(req)) {
        return res.sendStatus(401);
    }

    const body = req.body;

    if (body?.object !== "whatsapp_business_account") {
        return res.sendStatus(404);
    }

    for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
            const value = change.value || {};

            for (const message of value.messages || []) {
                console.log("Incoming WhatsApp message", {
                    from: message.from,
                    type: message.type
                });
            }

            for (const status of value.statuses || []) {
                console.log("WhatsApp delivery status", {
                    id: status.id,
                    status: status.status,
                    timestamp: status.timestamp
                });
            }
        }
    }

    return res.sendStatus(200);
});

module.exports = router;
