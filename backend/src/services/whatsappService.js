const axios = require("axios");

const GRAPH_API_VERSION =
    process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";

const PHONE_NUMBER_ID =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

const ACCESS_TOKEN =
    process.env.WHATSAPP_ACCESS_TOKEN;

function validateWhatsAppConfig() {
    if (!PHONE_NUMBER_ID) {
        throw new Error("WHATSAPP_PHONE_NUMBER_ID is missing in .env");
    }

    if (!ACCESS_TOKEN) {
        throw new Error("WHATSAPP_ACCESS_TOKEN is missing in .env");
    }
}

function normalizePhoneNumber(phoneNumber) {
    let number = String(phoneNumber || "").replace(/\D/g, "");

    // Indian mobile number without country code
    if (number.length === 10) {
        number = "91" + number;
    } else if (number.length === 11 && number.startsWith("0")) {
        number = "91" + number.substring(1);
    }

    if (number.length < 11 || number.length > 15) {
        throw new Error("Invalid WhatsApp recipient number.");
    }

    return number;
}

function getMessagesUrl() {
    return `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
}

// Existing plain-text messaging function
async function sendWhatsAppMessage(phoneNumber, message) {
    validateWhatsAppConfig();

    const response = await axios.post(
        getMessagesUrl(),
        {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: normalizePhoneNumber(phoneNumber),
            type: "text",
            text: {
                preview_url: false,
                body: message
            }
        },
        {
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            timeout: 20000
        }
    );

    return response.data;
}

// New Meta approved template messaging function
async function sendWhatsAppTemplateMessage(
    phoneNumber,
    templateName,
    parameters,
    languageCode = "en_US"
) {
    validateWhatsAppConfig();

    if (!templateName) {
        throw new Error("WhatsApp template name is required.");
    }

    if (!Array.isArray(parameters)) {
        throw new Error("Template parameters must be an array.");
    }

    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizePhoneNumber(phoneNumber),
        type: "template",
        template: {
            name: templateName,
            language: {
                code: languageCode
            },
            components: [
                {
                    type: "body",
                    parameters: parameters.map(value => ({
                        type: "text",
                        text: String(value ?? "")
                    }))
                }
            ]
        }
    };

    try {
        const response = await axios.post(
            getMessagesUrl(),
            payload,
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json"
                },
                timeout: 20000
            }
        );

        return response.data;

    } catch (error) {
        console.error(
            "WhatsApp template API error:",
            error.response?.data || error.message
        );

        throw error;
    }
}

function getWhatsAppConfig() {
    return {
        configured: Boolean(PHONE_NUMBER_ID && ACCESS_TOKEN),
        phoneNumberId: PHONE_NUMBER_ID ? "CONFIGURED" : "MISSING",
        accessToken: ACCESS_TOKEN ? "CONFIGURED" : "MISSING",
        graphApiVersion: GRAPH_API_VERSION
    };
}

module.exports = {
    sendWhatsAppMessage,
    sendWhatsAppTemplateMessage,
    getWhatsAppConfig
};
