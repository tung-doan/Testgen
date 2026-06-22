import apiClient from "./api-client";

const OnlineExamService = {
  // Exam Management (Teacher)
  createExam: async (data) => {
    const response = await apiClient.post("online-exams/exams/", data);
    return response.data;
  },

  getExams: async () => {
    const response = await apiClient.get("online-exams/exams/");
    return response.data;
  },

  getExamDetail: async (id) => {
    const response = await apiClient.get(`online-exams/exams/${id}/`);
    return response.data;
  },

  updateExam: async (id, data) => {
    const response = await apiClient.put(`online-exams/exams/${id}/`, data);
    return response.data;
  },

  deleteExam: async (id) => {
    await apiClient.delete(`online-exams/exams/${id}/`);
  },

  updateExamQuestions: async (id, questions) => {
    const response = await apiClient.post(
      `online-exams/exams/${id}/update_questions/`,
      { questions }
    );
    return response.data;
  },

  getExamQuestions: async (id) => {
    const response = await apiClient.get(
      `online-exams/exams/${id}/questions/`
    );
    return response.data;
  },

  getExamAttempts: async (examId) => {
    const response = await apiClient.get(
      `online-exams/exams/${examId}/attempts/`
    );
    return response.data;
  },

  getExamStatistics: async (examId) => {
    const response = await apiClient.get(
      `online-exams/exams/${examId}/statistics/`
    );
    return response.data;
  },

  // Student Exam Taking
  getPendingExams: async (studentId) => {
    try {
      const response = await apiClient.get(
        `online-exams/attempts/pending-exams/?student_id=${studentId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch pending exams"
      );
    }
  },

  getCompletedExams: (studentId) => {
    return apiClient.get(`online-exams/attempts/?student=${studentId}&status=COMPLETED`);
  },

  startExam: async (examId, studentId) => {
    try {
      const response = await apiClient.post(
        "online-exams/attempts/start-exam/",
        {
          exam_id: examId,
          student_id: studentId,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to start exam");
    }
  },

  getExamAttempt: async (attemptId) => {
    try {
      const response = await apiClient.get(
        `online-exams/attempts/${attemptId}/`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch exam attempt"
      );
    }
  },

  saveAnswers: async (attemptId, answers) => {
    try {
      const response = await apiClient.post(
        `online-exams/attempts/${attemptId}/save-answers/`,
        { answers }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to save answers"
      );
    }
  },

  submitExam: async (attemptId, answers) => {
    try {
      const response = await apiClient.post(
        `online-exams/attempts/${attemptId}/submit-exam/`,
        { answers }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to submit exam");
    }
  },

  getAttemptResults: async (attemptId) => {
    const response = await apiClient.get(
      `online-exams/attempts/${attemptId}/results/`
    );
    return response.data;
  },

  getMyAttempts: async (studentId) => {
    const response = await apiClient.get(
      "online-exams/attempts/my-attempts/",
      {
        params: { student_id: studentId },
      }
    );
    return response.data;
  },

  getAttemptDetail: async (attemptId) => {
    const response = await apiClient.get(
      `online-exams/attempts/${attemptId}/`
    );
    return response.data;
  },
};

export default OnlineExamService;
