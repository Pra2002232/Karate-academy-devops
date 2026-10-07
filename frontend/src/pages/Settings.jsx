import React, { useEffect, useState } from "react";
import api from "../services/api";
import "./Settings.css";

const DEFAULT_SETTINGS = {
    academy_name: "",
    logo_url: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    head_instructor: "",

    default_batch: "",
    student_code_prefix: "KAR",
    currency: "INR",
    date_format: "DD-MM-YYYY",
    academic_year: "",
    default_belt: "White",
    grading_pass_percentage: 50,

    whatsapp_enabled: false,
    sms_enabled: false,
    email_enabled: false,
    competition_notifications: true,
    belt_notifications: true,
    fee_notifications: true,
    attendance_notifications: true,
    result_notifications: true,

    whatsapp_business_number: "",
    meta_business_account_id: "",
    meta_phone_number_id: "",
    meta_access_token: "",

    minimum_attendance_percentage: 75,
    kihon_weight: 25,
    kata_weight: 25,
    kumite_weight: 25,
    discipline_weight: 25,

    maintenance_mode: false
};

function Settings() {

    const [activeSection, setActiveSection] =
        useState("profile");

    const [settings, setSettings] =
        useState(DEFAULT_SETTINGS);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);


    // =====================================================
    // LOAD SETTINGS
    // =====================================================

    const loadSettings = async () => {

        try {

            setLoading(true);

            const response =
                await api.get("/settings");

            setSettings({
                ...DEFAULT_SETTINGS,
                ...(response.data?.settings || {})
            });

        } catch (error) {

            console.error(
                "Settings load error:",
                error
            );

            alert("Unable to load settings.");

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {
        loadSettings();
    }, []);


    // =====================================================
    // INPUT HANDLER
    // =====================================================

    const handleChange = (event) => {

        const {
            name,
            value,
            type,
            checked
        } = event.target;

        setSettings(prev => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    };


    // =====================================================
    // SAVE SETTINGS
    // =====================================================

    const saveSettings = async () => {

        try {

            setSaving(true);

            await api.put(
                "/settings",
                settings
            );

            alert(
                "Settings saved successfully."
            );

        } catch (error) {

            console.error(
                "Settings save error:",
                error
            );

            alert(
                error.response?.data?.error ||
                "Unable to save settings."
            );

        } finally {

            setSaving(false);
        }
    };


    // =====================================================
    // SECTION MENU
    // =====================================================

    const sections = [
        {
            id: "profile",
            icon: "🏫",
            title: "Academy Profile"
        },
        {
            id: "admin",
            icon: "👤",
            title: "Admin Account"
        },
        {
            id: "configuration",
            icon: "⚙️",
            title: "Academy Configuration"
        },
        {
            id: "notifications",
            icon: "🔔",
            title: "Notifications"
        },
        {
            id: "whatsapp",
            icon: "💬",
            title: "WhatsApp / Meta"
        },
        {
            id: "grading",
            icon: "🥋",
            title: "Grading Configuration"
        },
        {
            id: "system",
            icon: "🖥️",
            title: "System"
        }
    ];


    if (loading) {

        return (
            <div className="settings-loading">
                Loading settings...
            </div>
        );
    }


    return (

        <div className="settings-page">

            {/* HEADER */}

            <div className="settings-header">

                <div>

                    <div className="settings-title">
                        <div className="settings-title-icon">
                            ⚙️
                        </div>

                        <div>
                            <h1>Settings</h1>

                            <p>
                                Manage your academy
                                configuration and preferences.
                            </p>
                        </div>
                    </div>

                </div>


                <button
                    className="settings-save-top"
                    onClick={saveSettings}
                    disabled={saving}
                >
                    {saving
                        ? "Saving..."
                        : "Save Changes"}
                </button>

            </div>


            {/* MAIN */}

            <div className="settings-layout">

                {/* SIDEBAR */}

                <div className="settings-sidebar">

                    {sections.map(section => (

                        <button
                            key={section.id}
                            className={
                                activeSection === section.id
                                    ? "settings-menu active"
                                    : "settings-menu"
                            }
                            onClick={() =>
                                setActiveSection(section.id)
                            }
                        >

                            <span>
                                {section.icon}
                            </span>

                            {section.title}

                        </button>

                    ))}

                </div>


                {/* CONTENT */}

                <div className="settings-content">


                    {/* ================================= */}
                    {/* ACADEMY PROFILE */}
                    {/* ================================= */}

                    {activeSection === "profile" && (

                        <section className="settings-card">

                            <SettingsHeading
                                title="Academy Profile"
                                subtitle="Basic information about your karate academy."
                            />

                            <div className="settings-grid">

                                <Input
                                    label="Academy Name"
                                    name="academy_name"
                                    value={settings.academy_name}
                                    onChange={handleChange}
                                />

                                <Input
                                    label="Head Instructor"
                                    name="head_instructor"
                                    value={settings.head_instructor}
                                    onChange={handleChange}
                                />

                                <Input
                                    label="Phone"
                                    name="phone"
                                    value={settings.phone}
                                    onChange={handleChange}
                                />

                                <Input
                                    label="Email"
                                    name="email"
                                    value={settings.email}
                                    onChange={handleChange}
                                />

                                <Input
                                    label="Website"
                                    name="website"
                                    value={settings.website}
                                    onChange={handleChange}
                                />

                                <Input
                                    label="Logo URL"
                                    name="logo_url"
                                    value={settings.logo_url}
                                    onChange={handleChange}
                                />

                            </div>


                            <TextArea
                                label="Academy Address"
                                name="address"
                                value={settings.address}
                                onChange={handleChange}
                            />

                        </section>
                    )}


                    {/* ================================= */}
                    {/* ADMIN ACCOUNT */}
                    {/* ================================= */}

                    {activeSection === "admin" && (

                        <section className="settings-card">

                            <SettingsHeading
                                title="Admin Account"
                                subtitle="Manage administrator account information."
                            />

                            <div className="settings-info-box">
                                🔐 Admin authentication is managed
                                through the existing authentication
                                system.
                            </div>

                            <div className="settings-grid">

                                <Input
                                    label="Admin Role"
                                    value="Academy Administrator"
                                    disabled
                                />

                                <Input
                                    label="Account Status"
                                    value="Active"
                                    disabled
                                />

                            </div>

                            <div className="settings-note">
                                Password management can be connected
                                to the existing admin authentication
                                module.
                            </div>

                        </section>
                    )}


                    {/* ================================= */}
                    {/* CONFIGURATION */}
                    {/* ================================= */}

                    {activeSection === "configuration" && (

                        <section className="settings-card">

                            <SettingsHeading
                                title="Academy Configuration"
                                subtitle="Configure default academy behavior."
                            />

                            <div className="settings-grid">

                                <Input
                                    label="Default Batch"
                                    name="default_batch"
                                    value={settings.default_batch}
                                    onChange={handleChange}
                                />

                                <Input
                                    label="Student Code Prefix"
                                    name="student_code_prefix"
                                    value={settings.student_code_prefix}
                                    onChange={handleChange}
                                />

                                <Select
                                    label="Currency"
                                    name="currency"
                                    value={settings.currency}
                                    onChange={handleChange}
                                    options={[
                                        ["INR", "Indian Rupee (INR)"],
                                        ["USD", "US Dollar (USD)"]
                                    ]}
                                />

                                <Select
                                    label="Date Format"
                                    name="date_format"
                                    value={settings.date_format}
                                    onChange={handleChange}
                                    options={[
                                        ["DD-MM-YYYY", "DD-MM-YYYY"],
                                        ["MM-DD-YYYY", "MM-DD-YYYY"],
                                        ["YYYY-MM-DD", "YYYY-MM-DD"]
                                    ]}
                                />

                                <Input
                                    label="Academic Year"
                                    name="academic_year"
                                    value={settings.academic_year}
                                    onChange={handleChange}
                                />

                                <Select
                                    label="Default Belt"
                                    name="default_belt"
                                    value={settings.default_belt}
                                    onChange={handleChange}
                                    options={[
                                        ["White", "White"],
                                        ["Yellow", "Yellow"],
                                        ["Orange", "Orange"],
                                        ["Green", "Green"],
                                        ["Blue", "Blue"],
                                        ["Purple", "Purple"],
                                        ["Brown", "Brown"],
                                        ["Black", "Black"]
                                    ]}
                                />

                            </div>


                            <NumberInput
                                label="Grading Pass Percentage"
                                name="grading_pass_percentage"
                                value={settings.grading_pass_percentage}
                                onChange={handleChange}
                            />

                        </section>
                    )}


                    {/* ================================= */}
                    {/* NOTIFICATIONS */}
                    {/* ================================= */}

                    {activeSection === "notifications" && (

                        <section className="settings-card">

                            <SettingsHeading
                                title="Notification Settings"
                                subtitle="Control which academy events can trigger notifications."
                            />

                            <div className="toggle-list">

                                <Toggle
                                    label="WhatsApp Notifications"
                                    name="whatsapp_enabled"
                                    checked={settings.whatsapp_enabled}
                                    onChange={handleChange}
                                />

                                <Toggle
                                    label="SMS Notifications"
                                    name="sms_enabled"
                                    checked={settings.sms_enabled}
                                    onChange={handleChange}
                                />

                                <Toggle
                                    label="Email Notifications"
                                    name="email_enabled"
                                    checked={settings.email_enabled}
                                    onChange={handleChange}
                                />

                                <Toggle
                                    label="Competition Notifications"
                                    name="competition_notifications"
                                    checked={settings.competition_notifications}
                                    onChange={handleChange}
                                />

                                <Toggle
                                    label="Belt Promotion Notifications"
                                    name="belt_notifications"
                                    checked={settings.belt_notifications}
                                    onChange={handleChange}
                                />

                                <Toggle
                                    label="Fee Reminder Notifications"
                                    name="fee_notifications"
                                    checked={settings.fee_notifications}
                                    onChange={handleChange}
                                />

                                <Toggle
                                    label="Attendance Notifications"
                                    name="attendance_notifications"
                                    checked={settings.attendance_notifications}
                                    onChange={handleChange}
                                />

                                <Toggle
                                    label="Competition Result Notifications"
                                    name="result_notifications"
                                    checked={settings.result_notifications}
                                    onChange={handleChange}
                                />

                            </div>

                        </section>
                    )}


                    {/* ================================= */}
                    {/* WHATSAPP */}
                    {/* ================================= */}

                    {activeSection === "whatsapp" && (

                        <section className="settings-card">

                            <SettingsHeading
                                title="WhatsApp / Meta Integration"
                                subtitle="Prepare the academy for Meta WhatsApp Business API integration."
                            />

                            <div className="settings-info-box">
                                💬 WhatsApp integration will allow
                                the academy to send automated
                                messages to parents.
                            </div>

                            <div className="settings-grid">

                                <Input
                                    label="WhatsApp Business Number"
                                    name="whatsapp_business_number"
                                    value={settings.whatsapp_business_number}
                                    onChange={handleChange}
                                    placeholder="+91XXXXXXXXXX"
                                />

                                <Input
                                    label="Meta Business Account ID"
                                    name="meta_business_account_id"
                                    value={settings.meta_business_account_id}
                                    onChange={handleChange}
                                />

                                <Input
                                    label="Meta Phone Number ID"
                                    name="meta_phone_number_id"
                                    value={settings.meta_phone_number_id}
                                    onChange={handleChange}
                                />

                            </div>

                            <div className="settings-info-box warning">
                                🔒 The Meta access token should eventually
                                be stored securely on the backend/environment,
                                not exposed to the React frontend.
                            </div>

                        </section>
                    )}


                    {/* ================================= */}
                    {/* GRADING */}
                    {/* ================================= */}

                    {activeSection === "grading" && (

                        <section className="settings-card">

                            <SettingsHeading
                                title="Grading Configuration"
                                subtitle="Configure grading and promotion rules."
                            />

                            <div className="settings-grid">

                                <NumberInput
                                    label="Minimum Attendance %"
                                    name="minimum_attendance_percentage"
                                    value={settings.minimum_attendance_percentage}
                                    onChange={handleChange}
                                />

                                <NumberInput
                                    label="Passing Percentage"
                                    name="grading_pass_percentage"
                                    value={settings.grading_pass_percentage}
                                    onChange={handleChange}
                                />

                                <NumberInput
                                    label="Kihon Weight %"
                                    name="kihon_weight"
                                    value={settings.kihon_weight}
                                    onChange={handleChange}
                                />

                                <NumberInput
                                    label="Kata Weight %"
                                    name="kata_weight"
                                    value={settings.kata_weight}
                                    onChange={handleChange}
                                />

                                <NumberInput
                                    label="Kumite Weight %"
                                    name="kumite_weight"
                                    value={settings.kumite_weight}
                                    onChange={handleChange}
                                />

                                <NumberInput
                                    label="Discipline Weight %"
                                    name="discipline_weight"
                                    value={settings.discipline_weight}
                                    onChange={handleChange}
                                />

                            </div>


                            <div className="settings-note">
                                Recommended total grading weight:
                                <strong>
                                    {" "}
                                    {Number(settings.kihon_weight || 0) +
                                        Number(settings.kata_weight || 0) +
                                        Number(settings.kumite_weight || 0) +
                                        Number(settings.discipline_weight || 0)}
                                    %
                                </strong>
                            </div>

                        </section>
                    )}


                    {/* ================================= */}
                    {/* SYSTEM */}
                    {/* ================================= */}

                    {activeSection === "system" && (

                        <section className="settings-card">

                            <SettingsHeading
                                title="System"
                                subtitle="System-level academy settings."
                            />

                            <Toggle
                                label="Maintenance Mode"
                                name="maintenance_mode"
                                checked={settings.maintenance_mode}
                                onChange={handleChange}
                            />

                            <div className="settings-info-box">
                                ⚠️ Maintenance mode should only be
                                enabled when temporarily restricting
                                academy operations.
                            </div>

                            <div className="system-information">

                                <div>
                                    <span>Application</span>
                                    <strong>Karate Academy</strong>
                                </div>

                                <div>
                                    <span>Version</span>
                                    <strong>1.0</strong>
                                </div>

                                <div>
                                    <span>Backend</span>
                                    <strong>Node.js / Express</strong>
                                </div>

                                <div>
                                    <span>Database</span>
                                    <strong>PostgreSQL</strong>
                                </div>

                            </div>

                        </section>
                    )}

                </div>

            </div>

        </div>
    );
}


// =====================================================
// REUSABLE COMPONENTS
// =====================================================

function SettingsHeading({
    title,
    subtitle
}) {

    return (
        <div className="settings-card-heading">

            <h2>{title}</h2>

            <p>{subtitle}</p>

        </div>
    );
}


function Input({
    label,
    name,
    value,
    onChange,
    disabled = false,
    placeholder = ""
}) {

    return (
        <div className="settings-field">

            <label>{label}</label>

            <input
                type="text"
                name={name}
                value={value ?? ""}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
            />

        </div>
    );
}


function TextArea({
    label,
    name,
    value,
    onChange
}) {

    return (
        <div className="settings-field full">

            <label>{label}</label>

            <textarea
                name={name}
                value={value ?? ""}
                onChange={onChange}
                rows="4"
            />

        </div>
    );
}


function NumberInput({
    label,
    name,
    value,
    onChange
}) {

    return (
        <div className="settings-field">

            <label>{label}</label>

            <input
                type="number"
                name={name}
                value={value ?? ""}
                onChange={onChange}
                min="0"
                max="100"
            />

        </div>
    );
}


function Select({
    label,
    name,
    value,
    onChange,
    options
}) {

    return (
        <div className="settings-field">

            <label>{label}</label>

            <select
                name={name}
                value={value ?? ""}
                onChange={onChange}
            >

                {options.map(
                    ([optionValue, optionLabel]) => (

                        <option
                            key={optionValue}
                            value={optionValue}
                        >
                            {optionLabel}
                        </option>

                    )
                )}

            </select>

        </div>
    );
}


function Toggle({
    label,
    name,
    checked,
    onChange
}) {

    return (
        <label className="settings-toggle">

            <div>

                <strong>{label}</strong>

            </div>

            <input
                type="checkbox"
                name={name}
                checked={Boolean(checked)}
                onChange={onChange}
            />

            <span className="toggle-slider"></span>

        </label>
    );
}


export default Settings;
