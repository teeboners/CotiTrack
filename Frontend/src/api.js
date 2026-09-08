import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
    timeout: 5000,
});

export default api;