import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AdminLoginLayout from "./AdminLoginLayout";

/**
 * Admin login adapter.
 * Keeps the existing backend endpoint, JWT storage keys, error handling,
 * and post-login route while using the new NextGen visual layout.
 */
export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin({ username, password }) {
    if (!username?.trim() || !password) {
      setError("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/login", {
        username: username.trim(),
        password,
      });

      const { token, admin } = response.data;

      // Preserve the existing authentication storage contract.
      localStorage.setItem("admin_token", token);
      localStorage.setItem("admin_user", JSON.stringify(admin));

      navigate("/", { replace: true });
    } catch (loginError) {
      setError(
        loginError.response?.data?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    // Preserve the current application's existing forgot-password behaviour.
    window.alert("Please contact the academy administrator.");
  }

  return (
    <AdminLoginLayout
      onLogin={handleLogin}
      onForgotPassword={handleForgotPassword}
      loading={loading}
      error={error}
    />
  );
}
