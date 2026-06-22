import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL === "http://localhost:8000/api/" ? "/api/" : (process.env.NEXT_PUBLIC_API_URL || "/api/"),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});


apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue = [];
let authFailureHandled = false;

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

const isAuthEndpoint = (url = "") =>
  url.includes("/login") ||
  url.includes("student-login") ||
  url.includes("users/refresh");

const handleAuthFailure = () => {
  if (typeof window === "undefined" || authFailureHandled) return;

  authFailureHandled = true;
  localStorage.removeItem("user");
  localStorage.removeItem("student");

  const loginPaths = ["/login", "/student/login"];
  if (!loginPaths.includes(window.location.pathname)) {
    window.location.replace("/login");
  }
};

// Response interceptor - Xử lý response và errors
apiClient.interceptors.response.use(
  (response) => {
    authFailureHandled = false;
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Xử lý lỗi 401 (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Bỏ qua với yêu cầu login hoặc chính yêu cầu refresh để tránh loop
      if (isAuthEndpoint(originalRequest.url)) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const baseURL = process.env.NEXT_PUBLIC_API_URL === "http://localhost:8000/api/" ? "/api/" : (process.env.NEXT_PUBLIC_API_URL || "/api/");
        await axios.post(`${baseURL}users/refresh/`, {}, { withCredentials: true });
        
        isRefreshing = false;
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        
        handleAuthFailure();
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export function wireLoadingInterceptors(startLoading, stopLoading) {
  apiClient.interceptors.request.use(
    (config) => {
      if (!config.silent) startLoading();
      return config;
    },
    (error) => {
      stopLoading();
      return Promise.reject(error);
    }
  );

  apiClient.interceptors.response.use(
    (response) => {
      if (!response.config.silent) stopLoading();
      return response;
    },
    (error) => {
      if (!error.config?.silent) stopLoading();
      return Promise.reject(error);
    }
  );
}

export default apiClient;
