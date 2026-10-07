import { useState } from "react";
import api from "../services/api";
import "./ParentLogin.css";

export default function ParentLogin() {

    const [username, setUsername] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [showPassword, setShowPassword] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");


    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");

        if (!username || !password) {

            setError(
                "Please enter username and password."
            );

            return;
        }


        try {

            setLoading(true);

            const response =
                await api.post(
                    "/auth/login",
                    {
                        username,
                        password
                    }
                );


            const user =
                response.data.user ||
                response.data.admin;


            if (!user || user.role !== "PARENT") {

                localStorage.removeItem(
                    "admin_token"
                );

                localStorage.removeItem(
                    "admin_user"
                );

                setError(
                    "This login is for Parent Portal accounts only."
                );

                return;
            }


            localStorage.setItem(
                "admin_token",
                response.data.token
            );

            localStorage.setItem(
                "admin_user",
                JSON.stringify(user)
            );


            window.location.href =
                "/parent-dashboard";

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Invalid username or password."
            );

        } finally {

            setLoading(false);

        }
    };


    return (

        <div className="parent-login-page">

            <div className="parent-login-hero">

                <div className="parent-login-overlay" />

                <div className="parent-login-brand">

                    <div className="parent-login-mark">
                        空
                    </div>

                    <div>
                        <strong>
                            UNITED SHOTOKAN
                        </strong>

                        <span>
                            KARATE ASSOCIATION INDIA
                        </span>
                    </div>

                </div>


                <div className="parent-hero-copy">

                    <span>
                        PARENT PORTAL
                    </span>

                    <h1>
                        Support their
                        <em> journey.</em>
                    </h1>

                    <p>
                        Follow your child's
                        attendance, progress,
                        fees and competition
                        achievements in one place.
                    </p>

                </div>


                <div className="parent-hero-values">

                    <div>
                        <b>01</b>
                        <span>
                            Growth
                        </span>
                    </div>

                    <div>
                        <b>02</b>
                        <span>
                            Discipline
                        </span>
                    </div>

                    <div>
                        <b>03</b>
                        <span>
                            Excellence
                        </span>
                    </div>

                </div>

            </div>


            <div className="parent-login-panel">

                <div className="parent-login-card">

                    <div className="parent-login-card-brand">

                        <div className="parent-login-icon">
                            🥋
                        </div>

                        <div>

                            <strong>
                                Parent Portal
                            </strong>

                            <span>
                                USKAI MANAGEMENT SYSTEM
                            </span>

                        </div>

                    </div>


                    <div className="parent-login-heading">

                        <span>
                            SECURE FAMILY ACCESS
                        </span>

                        <h2>
                            Welcome back
                        </h2>

                        <p>
                            Sign in to view your
                            child's academy journey.
                        </p>

                    </div>


                    {error && (

                        <div className="parent-login-error">
                            {error}
                        </div>

                    )}


                    <form
                        className="parent-login-form"
                        onSubmit={handleSubmit}
                    >

                        <label>

                            <span>
                                Username
                            </span>

                            <div className="parent-login-input">

                                <b>U</b>

                                <input
                                    value={username}
                                    onChange={e =>
                                        setUsername(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                />

                            </div>

                        </label>


                        <label>

                            <span>
                                Password
                            </span>

                            <div className="parent-login-input">

                                <b>••</b>

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={password}
                                    onChange={e =>
                                        setPassword(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                />

                                <button
                                    type="button"
                                    className="parent-password-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            value =>
                                                !value
                                        )
                                    }
                                >
                                    {
                                        showPassword
                                            ? "HIDE"
                                            : "SHOW"
                                    }
                                </button>

                            </div>

                        </label>


                        <button
                            className="parent-login-button"
                            type="submit"
                            disabled={loading}
                        >

                            {loading
                                ? "Signing in..."
                                : "Sign in to Parent Portal"
                            }

                        </button>

                    </form>


                    <div className="parent-login-security">

                        <span>
                            🔒
                        </span>

                        <div>

                            <strong>
                                Private & view-only
                            </strong>

                            <p>
                                Your account can only
                                access information
                                linked to your child.
                            </p>

                        </div>

                    </div>


                    <div className="parent-login-footer">

                        UNITED SHOTOKAN KARATE
                        ASSOCIATION INDIA

                    </div>

                </div>

            </div>

        </div>
    );
}
