import axios from "axios";

const API_BASE_URL =
    "http://172.16.0.175:5000/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
});


api.interceptors.request.use(
    (config) => {

        const token =
            localStorage.getItem("admin_token");

        if (token) {

            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },

    (error) =>
        Promise.reject(error)
);


api.interceptors.response.use(
    (response) =>
        response,

    (error) => {

        if (
            error.response &&
            error.response.status === 401
        ) {

            localStorage.removeItem(
                "admin_token"
            );

            localStorage.removeItem(
                "admin_user"
            );

            let storedUser = null;

            try {
                storedUser = JSON.parse(
                    localStorage.getItem("admin_user") || "null"
                );
            } catch {
                storedUser = null;
            }

            window.location.href =
                storedUser?.role === "PARENT"
                    ? "/parent-login"
                    : "/login";
        }

        return Promise.reject(error);
    }
);


export default api;
