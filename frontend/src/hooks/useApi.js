import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

/**
 * Custom hook để xử lý các API requests
 * @returns {Object} Các phương thức và state để tương tác với API
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const activeRequests = useRef({});
  const router = useRouter();

  // Tạo axios instance với các cấu hình mặc định
  const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/",
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Hàm để hủy request nếu component unmount hoặc request mới được gọi
  const cancelRequest = useCallback((requestId) => {
    if (activeRequests.current[requestId]) {
      activeRequests.current[requestId].cancel('Request cancelled by user');
      delete activeRequests.current[requestId];
    }
  }, []);

  // Hàm chung xử lý các request
  const request = useCallback(async (method, url, data = null, config = {}) => {
    // Tạo một ID duy nhất cho request này
    const requestId = `${method}:${url}:${Date.now()}`;
    
    // Tạo CancelToken
    const source = axios.CancelToken.source();
    activeRequests.current[requestId] = source;
    
    // Kết hợp cấu hình với cancelToken
    const requestConfig = {
      ...config,
      cancelToken: source.token,
      headers: {
        ...config.headers,
      }
    };

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient({
        method,
        url,
        data,
        ...requestConfig
      });
      
      return response.data;
    } catch (err) {
      // Kiểm tra xem request có bị hủy bởi người dùng không
      if (axios.isCancel(err)) {
        console.log('Request cancelled:', err.message);
        return null;
      }
      
      // Xử lý các mã lỗi HTTP
      if (err.response) {
        // Xử lý trường hợp hết hạn phiên hoặc chưa đăng nhập
        if (err.response.status === 401) {
          // Thử refresh token hoặc chuyển hướng đến trang login
          router.push('/login');
        }
        
        // Tạo thông báo lỗi từ response
        const errorMessage = err.response.data?.detail || err.response.data?.message || 'An error occurred';
        setError(errorMessage);
        throw new Error(errorMessage);
      } else if (err.request) {
        // Request đã được gửi nhưng không nhận được response
        setError('No response received from server. Please check your connection.');
        throw new Error('Network error. Please check your connection.');
      } else {
        // Lỗi khi thiết lập request
        setError('Request setup error: ' + err.message);
        throw err;
      }
    } finally {
      setLoading(false);
      // Xóa request khỏi danh sách active requests
      delete activeRequests.current[requestId];
    }
  }, [router]);
  
  // Các helper methods cho các loại request khác nhau
  const get = useCallback((url, config = {}) => request('get', url, null, config), [request]);
  const post = useCallback((url, data, config = {}) => request('post', url, data, config), [request]);
  const put = useCallback((url, data, config = {}) => request('put', url, data, config), [request]);
  const patch = useCallback((url, data, config = {}) => request('patch', url, data, config), [request]);
  const del = useCallback((url, config = {}) => request('delete', url, null, config), [request]);
  
  // Hàm upload file với FormData
  const uploadFile = useCallback(async (url, formData, onProgress = null, config = {}) => {
    const uploadConfig = {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers,
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      } : undefined,
    };
    
    return post(url, formData, uploadConfig);
  }, [post]);
  
  // Cleanup function khi component unmount
  const cancelAll = useCallback(() => {
    Object.keys(activeRequests.current).forEach(requestId => {
      cancelRequest(requestId);
    });
  }, [cancelRequest]);

  return {
    loading,
    error,
    setError,
    get,
    post,
    put,
    patch,
    delete: del,
    uploadFile,
    cancelRequest,
    cancelAll,
  };
}

export default useApi;