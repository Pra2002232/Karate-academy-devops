const express = require("express");

const {
    sendWhatsAppMessage,
    getWhatsAppConfig
} = require("../services/whatsappService");

const router = express.Router();


/*
|--------------------------------------------------------------------------
| WhatsApp Configuration Check
|--------------------------------------------------------------------------
*/

router.get("/status", (req, res) => {

    try {

        const config =
            getWhatsAppConfig();

        res.json({
            success: true,
            whatsapp: config
        });

    } catch (error) {

        console.error(
            "WhatsApp status error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to check WhatsApp configuration"
        });
    }
});


/*
|--------------------------------------------------------------------------
| Send Test WhatsApp Message
|--------------------------------------------------------------------------
*/

router.post("/send", async (req, res) => {

    try {

        const {
            phoneNumber,
            message
        } = req.body;


        if (!phoneNumber) {

            return res.status(400).json({
                success: false,
                message:
                    "phoneNumber is required"
            });
        }


        if (!message) {

            return res.status(400).json({
                success: false,
                message:
                    "message is required"
            });
        }


        const result =
            await sendWhatsAppMessage(
                phoneNumber,
                message
            );


        res.json({
            success: true,
            message:
                "WhatsApp message sent successfully",
            data: result
        });


    } catch (error) {

        console.error(
            "WhatsApp send error:",
            error.response?.data ||
            error.message
        );


        res.status(
            error.response?.status || 500
        ).json({

            success: false,

            message:
                "Failed to send WhatsApp message",

            error:
                error.response?.data ||
                error.message
        });
    }
});


module.exports = router;
