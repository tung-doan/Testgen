import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Thêm token hoặc xử lý trước khi gửi request
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

// Response interceptor - Xử lý response và errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Xử lý lỗi 401 (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Bỏ qua với yêu cầu login hoặc chính yêu cầu refresh để tránh loop
      if (originalRequest.url?.includes('/login') || originalRequest.url?.includes('student-login') || originalRequest.url?.includes('users/refresh')) {
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

      // Thử refresh token ở đây
      try {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/";
        // Sử dụng axios độc lập để không kích hoạt interceptor
        await axios.post(`${baseURL}users/refresh/`, {}, { withCredentials: true });
        
        isRefreshing = false;
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        
        // Nếu refresh thất bại, redirect về login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Kết nối Axios interceptors với LoadingContext toàn cục.
 * Gọi hàm này 1 lần trong component cha (ví dụ: layout hoặc provider).
 *
 * Sử dụng config.silent = true để bỏ qua loading indicator cho request ngầm.
 * Ví dụ: apiClient.get('/health/', { silent: true })
 */
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
