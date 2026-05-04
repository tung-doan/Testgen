import apiClient from "./api-client";

const ClassroomService = {
  getAllClassrooms: async () => {
    try {
      const response = await apiClient.get("classroom/");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch classrooms"
      );
    }
  },

  getClassroomById: async (classroomId) => {
    try {
      const response = await apiClient.get(`classroom/${classroomId}/`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch classroom"
      );
    }
  },

  getStudentClassrooms: async (studentId) => {
    try {
      const response = await apiClient.get(
        `classroom/student-classrooms/?student_id=${studentId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch classrooms"
      );
    }
  },

  getClassroomDetail: async (
    classroomId,
    studentId,
    page = 1,
    pageSize = 20
  ) => {
    try {
      const response = await apiClient.get(
        `classroom/${classroomId}/detail/?student_id=${studentId}&page=${page}&page_size=${pageSize}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch classroom detail"
      );
    }
  },

  addStudentToClassroom: async (classroomId, studentData) => {
    try {
      const response = await apiClient.post(
        `classroom/${classroomId}/add_student/`,
        studentData
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to add student");
    }
  },

  removeStudentFromClassroom: async (classroomId, studentId) => {
    try {
      const response = await apiClient.post(
        `classroom/${classroomId}/remove_student/`,
        { student_id: studentId }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to remove student"
      );
    }
  },

  createClassroom: async (classroomData) => {
    try {
      const response = await apiClient.post("classroom/", classroomData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to create classroom"
      );
    }
  },

  deleteClassroom: async (classroomId) => {
    try {
      const response = await apiClient.delete(`classroom/${classroomId}/`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to delete classroom"
      );
    }
  },

  getStudents: async (classroomId) => {
    try {
      const response = await apiClient.get(
        `classroom/${classroomId}/students/`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch students"
      );
    }
  },

  addStudent: async (classroomId, studentData) => {
    try {
      const response = await apiClient.post(
        `classroom/${classroomId}/add_student/`,
        studentData
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || "Failed to add student");
    }
  },

  deleteStudent: async (studentId) => {
    try {
      const response = await apiClient.delete(
        `classroom/students/${studentId}/`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to delete student"
      );
    }
  },

  // ============================================
  // Enrollment Request APIs
  // ============================================

  /** Browse all available classrooms (for students) */
  getAllAvailableClassrooms: async () => {
    try {
      const response = await apiClient.get("classroom/all/");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch available classrooms"
      );
    }
  },

  /** Student requests to join a classroom */
  requestEnrollment: async (classroomId) => {
    try {
      const response = await apiClient.post("classroom/enrollment-requests/", {
        classroom_id: classroomId,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to send enrollment request"
      );
    }
  },

  /** Teacher gets pending enrollment requests for a classroom */
  getEnrollmentRequests: async (classroomId, status = "pending") => {
    try {
      const response = await apiClient.get(
        `classroom/${classroomId}/enrollment-requests/?status=${status}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch enrollment requests"
      );
    }
  },

  /** Get count of pending enrollment requests */
  getEnrollmentRequestsCount: async (classroomId) => {
    try {
      const response = await apiClient.get(
        `classroom/${classroomId}/enrollment-requests/count/`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch request count"
      );
    }
  },

  /** Teacher approves or rejects an enrollment request */
  handleEnrollmentRequest: async (requestId, action) => {
    try {
      const response = await apiClient.patch(
        `classroom/enrollment-requests/${requestId}/action/`,
        { action }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to handle enrollment request"
      );
    }
  },

  /** Get student's enrolled classrooms */
  getMyEnrolledClassrooms: async () => {
    try {
      const response = await apiClient.get("classroom/my-classes/");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch enrolled classrooms"
      );
    }
  },
};

export default ClassroomService;
