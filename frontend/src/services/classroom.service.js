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
};

export default ClassroomService;
