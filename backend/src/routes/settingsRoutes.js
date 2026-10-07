const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// =====================================================
// GET SETTINGS
// =====================================================

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,

                academy_name,
                logo_url,
                address,
                phone,
                email,
                website,
                head_instructor,

                default_batch,
                student_code_prefix,
                currency,
                date_format,
                academic_year,
                default_belt,
                grading_pass_percentage,

                whatsapp_enabled,
                sms_enabled,
                email_enabled,
                competition_notifications,
                belt_notifications,
                fee_notifications,
                attendance_notifications,
                result_notifications,

                whatsapp_business_number,
                meta_business_account_id,
                meta_phone_number_id,

                minimum_attendance_percentage,
                kihon_weight,
                kata_weight,
                kumite_weight,
                discipline_weight,

                maintenance_mode,

                created_at,
                updated_at

            FROM academy_settings
            WHERE id = 1
        `);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Settings not found"
            });
        }

        res.json({
            settings: result.rows[0]
        });

    } catch (error) {
        console.error("Settings fetch error:", error);

        res.status(500).json({
            error: "Failed to fetch settings"
        });
    }
});


// =====================================================
// UPDATE SETTINGS
// =====================================================

router.put("/", async (req, res) => {

    try {

        const {
            academy_name,
            logo_url,
            address,
            phone,
            email,
            website,
            head_instructor,

            default_batch,
            student_code_prefix,
            currency,
            date_format,
            academic_year,
            default_belt,
            grading_pass_percentage,

            whatsapp_enabled,
            sms_enabled,
            email_enabled,
            competition_notifications,
            belt_notifications,
            fee_notifications,
            attendance_notifications,
            result_notifications,

            whatsapp_business_number,
            meta_business_account_id,
            meta_phone_number_id,
            meta_access_token,

            minimum_attendance_percentage,
            kihon_weight,
            kata_weight,
            kumite_weight,
            discipline_weight,

            maintenance_mode
        } = req.body;


        const result = await pool.query(
            `
            UPDATE academy_settings

            SET

                academy_name = $1,
                logo_url = $2,
                address = $3,
                phone = $4,
                email = $5,
                website = $6,
                head_instructor = $7,

                default_batch = $8,
                student_code_prefix = $9,
                currency = $10,
                date_format = $11,
                academic_year = $12,
                default_belt = $13,
                grading_pass_percentage = $14,

                whatsapp_enabled = $15,
                sms_enabled = $16,
                email_enabled = $17,
                competition_notifications = $18,
                belt_notifications = $19,
                fee_notifications = $20,
                attendance_notifications = $21,
                result_notifications = $22,

                whatsapp_business_number = $23,
                meta_business_account_id = $24,
                meta_phone_number_id = $25,
                meta_access_token =
                    COALESCE(NULLIF($26, ''), meta_access_token),

                minimum_attendance_percentage = $27,
                kihon_weight = $28,
                kata_weight = $29,
                kumite_weight = $30,
                discipline_weight = $31,

                maintenance_mode = $32,

                updated_at = CURRENT_TIMESTAMP

            WHERE id = 1

            RETURNING *
            `,
            [
                academy_name,
                logo_url,
                address,
                phone,
                email,
                website,
                head_instructor,

                default_batch,
                student_code_prefix,
                currency,
                date_format,
                academic_year,
                default_belt,
                grading_pass_percentage,

                whatsapp_enabled,
                sms_enabled,
                email_enabled,
                competition_notifications,
                belt_notifications,
                fee_notifications,
                attendance_notifications,
                result_notifications,

                whatsapp_business_number,
                meta_business_account_id,
                meta_phone_number_id,
                meta_access_token,

                minimum_attendance_percentage,
                kihon_weight,
                kata_weight,
                kumite_weight,
                discipline_weight,

                maintenance_mode
            ]
        );

        res.json({
            message: "Settings updated successfully",
            settings: result.rows[0]
        });

    } catch (error) {

        console.error("Settings update error:", error);

        res.status(500).json({
            error: "Failed to update settings"
        });
    }
});


// =====================================================
// TEST SETTINGS API
// =====================================================

router.get("/health", async (req, res) => {

    try {

        const result = await pool.query(
            "SELECT id FROM academy_settings WHERE id = 1"
        );

        res.json({
            status: "UP",
            settings_configured: result.rows.length > 0
        });

    } catch (error) {

        res.status(500).json({
            status: "DOWN"
        });
    }
});


module.exports = router;
