const axios = require("axios");

const GRAPH_API_VERSION =
    process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";

const PHONE_NUMBER_ID =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

const ACCESS_TOKEN =
    process.env.WHATSAPP_ACCESS_TOKEN;


/*
|--------------------------------------------------------------------------
| Validate Configuration
|--------------------------------------------------------------------------
*/

function validateWhatsAppConfig() {

    if (!PHONE_NUMBER_ID) {
        throw new Error(
            "WHATSAPP_PHONE_NUMBER_ID is missing in .env"
        );
    }

    if (!ACCESS_TOKEN) {
        throw new Error(
            "WHATSAPP_ACCESS_TOKEN is missing in .env"
        );
    }
}


/*
|--------------------------------------------------------------------------
| Send WhatsApp Text Message
|--------------------------------------------------------------------------
*/

async function sendWhatsAppMessage(
    phoneNumber,
    message
) {

    validateWhatsAppConfig();

    const url =
        `https://graph.facebook.com/` +
        `${GRAPH_API_VERSION}/` +
        `${PHONE_NUMBER_ID}/messages`;

    try {

        const response = await axios.post(
            url,
            {
                messaging_product: "whatsapp",

                recipient_type: "individual",

                to: phoneNumber,

                type: "text",

                text: {
                    preview_url: false,
                    body: message
                }
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${ACCESS_TOKEN}`,

                    "Content-Type":
                        "application/json"
                }
            }
        );

        return response.data;

    } catch (error) {

        console.error(
            "WhatsApp API Error:",
            error.response?.data ||
            error.message
        );

        throw error;
    }
}


/*
|--------------------------------------------------------------------------
| Test Configuration
|--------------------------------------------------------------------------
*/

function getWhatsAppConfig() {

    return {
        configured:
            Boolean(
                PHONE_NUMBER_ID &&
                ACCESS_TOKEN
            ),

        phoneNumberId:
            PHONE_NUMBER_ID
                ? "CONFIGURED"
                : "MISSING",

        accessToken:
            ACCESS_TOKEN
                ? "CONFIGURED"
                : "MISSING",

        graphApiVersion:
            GRAPH_API_VERSION
    };
}


module.exports = {
    sendWhatsAppMessage,
    getWhatsAppConfig
};
