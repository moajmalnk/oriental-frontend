import axios from "axios";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        if (refreshToken) {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/token/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;
          localStorage.setItem(ACCESS_TOKEN, access);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Announcement API functions
export const announcementAPI = {
  // Get all announcements
  getAnnouncements: () => api.get("/api/users/announcements/"),

  // Get active announcements (public)
  getActiveAnnouncements: () => api.get("/api/users/announcements/active/"),

  // Get single announcement
  getAnnouncement: (id: number) => api.get(`/api/users/announcements/${id}/`),

  // Create announcement
  createAnnouncement: (data: {
    message: string;
    is_active: boolean;
    expires_by: string;
  }) => api.post("/api/users/announcements/create/", data),

  // Update announcement
  updateAnnouncement: (
    id: number,
    data: {
      message: string;
      is_active: boolean;
      expires_by: string;
    }
  ) => api.put(`/api/users/announcements/${id}/`, data),

  // Delete announcement
  deleteAnnouncement: (id: number) =>
    api.delete(`/api/users/announcements/${id}/`),
};

// Workshop API functions
export const workshopAPI = {
  // Get all workshops
  getWorkshops: () => api.get("/api/workshop/list/"),

  // Get single workshop
  getWorkshop: (id: number) => api.get(`/api/workshop/${id}/`),

  // Create workshop (with optional logo file)
  createWorkshop: (data: {
    name: string;
    duration_days: number;
    start_date: string;
    end_date?: string | null;
    place: string;
    description: string;
    logo?: File | null;
    background_color: string;
    border_color: string;
    title_color: string;
    name_color: string;
    text_color: string;
  }) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("duration_days", data.duration_days.toString());
    formData.append("start_date", data.start_date);
    if (data.end_date) formData.append("end_date", data.end_date);
    formData.append("place", data.place);
    formData.append("description", data.description);
    if (data.logo) formData.append("logo", data.logo);
    formData.append("background_color", data.background_color);
    formData.append("border_color", data.border_color);
    formData.append("title_color", data.title_color);
    formData.append("name_color", data.name_color);
    formData.append("text_color", data.text_color);

    return api.post("/api/workshop/create/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Update workshop (with optional logo file)
  updateWorkshop: (
    id: number,
    data: {
      name: string;
      duration_days: number;
      start_date: string;
      end_date?: string | null;
      place: string;
      description: string;
      logo?: File | null;
    background_color: string;
      border_color: string;
      title_color: string;
      name_color: string;
      text_color: string;
    }
  ) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("duration_days", data.duration_days.toString());
    formData.append("start_date", data.start_date);
    if (data.end_date) formData.append("end_date", data.end_date);
    formData.append("place", data.place);
    formData.append("description", data.description);
    if (data.logo) formData.append("logo", data.logo);
    formData.append("background_color", data.background_color);
    formData.append("border_color", data.border_color);
    formData.append("title_color", data.title_color);
    formData.append("name_color", data.name_color);
    formData.append("text_color", data.text_color);

    return api.put(`/api/workshop/update/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Delete workshop
  deleteWorkshop: (id: number) => api.delete(`/api/workshop/delete/${id}/`),

  // Get participants for a specific workshop
  getWorkshopParticipants: (workshopId: number) =>
    api.get(`/api/workshop/${workshopId}/participants/`),
};

// Participant API functions - completely separate from Student system
export const participantAPI = {
  // Get all participants
  getParticipants: () => api.get("/api/workshop/participants/"),

  // Get single participant
  getParticipant: (id: number) => api.get(`/api/workshop/participants/${id}/`),

  // Create participant
  createParticipant: (data: {
    name: string;
    email: string;
    phone: string;
    gender: "male" | "female" | "other";
    address?: string | null;
    participant_type: "kug_student" | "external";
    workshops: number[];
  }) => api.post("/api/workshop/participants/create/", data),

  // Update participant
  updateParticipant: (
    id: number,
    data: {
      name: string;
      email: string;
      phone: string;
      gender: "male" | "female" | "other";
      address?: string | null;
      participant_type: "kug_student" | "external";
      workshops: number[];
    }
  ) => api.put(`/api/workshop/participants/update/${id}/`, data),

  // Delete participant
  deleteParticipant: (id: number) =>
    api.delete(`/api/workshop/participants/delete/${id}/`),
};

export default api;
