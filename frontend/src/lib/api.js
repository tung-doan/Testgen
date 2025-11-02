import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// Add request interceptor for auth headers
apiClient.interceptors.request.use((config) => {
  // You can add auth headers here if needed
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors globally
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const AuthService = {
  login: (username, password) => 
    apiClient.post('/users/login/', { username, password }),
  
  register: (userData) => 
    apiClient.post('/users/register/', userData),
  
  logout: () => 
    apiClient.post('/users/logout/'),
  
  getUser: () => 
    apiClient.get('/users/me/'),
};

// Test Service
export const TestService = {
  createTest: (testData) => 
    apiClient.post('/api/tests/', testData),
  
  getTests: () => 
    apiClient.get('/api/tests/'),
  
  getTest: (id) => 
    apiClient.get(`/api/tests/${id}/`),
  
  saveAnswerKeys: (testId, answerKeys) => 
    apiClient.post(`/api/tests/${testId}/save_answer_keys/`, { answer_keys: answerKeys }),
  
  getAnswerKeys: (testId) => 
    apiClient.get(`/api/tests/${testId}/get_answer_keys/`),
};

// Submission Service
export const SubmissionService = {
  uploadSubmission: (formData) => 
    apiClient.post('/api/submissions/upload_submission/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  getSubmissions: () => 
    apiClient.get('/api/submissions/submission_summary/'),
  
  deleteSubmission: (id) => 
    apiClient.delete(`/api/submissions/${id}/`),
  
  getSubmissionDetails: (id) => 
    apiClient.get(`/api/submissions/${id}/detail/`),
};

// Classroom Service
export const ClassroomService = {
  createClass: (classData) => 
    apiClient.post('/classroom/', classData),
  
  getClasses: () => 
    apiClient.get('/classroom/'),
  
  getClassroom: (id) => 
    apiClient.get(`/classroom/${id}/`),
  
  deleteClassroom: (id) => 
    apiClient.delete(`/classroom/${id}/`),
  
  addStudent: (classId, studentData) => 
    apiClient.post(`/classroom/${classId}/add_student/`, studentData),
};

export default apiClient;