const axios = require("axios");

function normalizePhoneNumber(phone) {
  // Pass an international number, including its country code.
  // Example for India: 918767527520
  const digits = String(phone || "").replace(/\D/g, "");

  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error(
      "Recipient phone number must include its country code."
    );
  }

  return digits;
}

function textParameter(value, name) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();

  if (!text) {
    throw new Error(`Missing WhatsApp template parameter: ${name}`);
  }

  return text;
}

async function sendTemplateMessage({
  to,
  templateName,
  languageCode,
  parameters,
}) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION;

  if (!accessToken || !phoneNumberId || !apiVersion) {
    throw new Error("WhatsApp API environment variables are missing.");
  }

  const url =
    `https://graph.facebook.com/${apiVersion}/` +
    `${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizePhoneNumber(to),
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: "body",
          parameters: parameters.map(({ name, value }) => ({
            type: "text",
            text: textParameter(value, name),
          })),
        },
      ],
    },
  };

  const response = await axios.post(url, payload, {
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  return {
    messageId: response.data?.messages?.[0]?.id,
    recipientId: response.data?.contacts?.[0]?.wa_id,
  };
}

async function sendFeeReminder({
  parentPhone,
  parentName,
  feeType,
  studentName,
  amount,
  dueDate,
  parentWhatsAppOptIn,
}) {
  // Do not send to parents without recorded consent.
  if (!parentWhatsAppOptIn) {
    return {
      skipped: true,
      reason: "WhatsApp consent has not been recorded.",
    };
  }

  return sendTemplateMessage({
    to: parentPhone,
    templateName: process.env.WHATSAPP_TEMPLATE_FEE_REMINDER,
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
    parameters: [
      { name: "parentName", value: parentName },
      { name: "feeType", value: feeType },
      { name: "studentName", value: studentName },
      { name: "amount", value: amount },
      { name: "dueDate", value: dueDate },
    ],
  });
}

module.exports = {
  sendTemplateMessage,
  sendFeeReminder,
};
