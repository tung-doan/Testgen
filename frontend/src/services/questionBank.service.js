import apiClient from "./api-client";

const QuestionBankService = {
  // Subject APIs
  getAllSubjects: () => {
    console.log("Fetching subjects from:", "/api/question-bank/subjects/");
    return apiClient.get("/api/question-bank/subjects/");
  },

  createSubject: (data) => {
    console.log("Creating subject:", data);
    return apiClient.post("/api/question-bank/subjects/", data);
  },

  updateSubject: (id, data) =>
    apiClient.put(`/api/question-bank/subjects/${id}/`, data),

  deleteSubject: (id) => apiClient.delete(`/api/question-bank/subjects/${id}/`),

  getSubjectChapters: (subjectId) =>
    apiClient.get(`/api/question-bank/subjects/${subjectId}/chapters/`),

  // Chapter APIs
  getAllChapters: (subjectId = null) => {
    const url = subjectId
      ? `/api/question-bank/chapters/?subject_id=${subjectId}`
      : "/api/question-bank/chapters/";
    console.log("Fetching chapters from:", url);
    return apiClient.get(url);
  },

  createChapter: (data) => {
    console.log("Creating chapter:", data);
    return apiClient.post("/api/question-bank/chapters/", data);
  },

  updateChapter: (id, data) =>
    apiClient.put(`/api/question-bank/chapters/${id}/`, data),

  deleteChapter: (id) => apiClient.delete(`/api/question-bank/chapters/${id}/`),

  getChapterSections: (chapterId) =>
    apiClient.get(`/api/question-bank/chapters/${chapterId}/sections/`),

  // Section APIs
  getAllSections: (chapterId = null) => {
    const url = chapterId
      ? `/api/question-bank/sections/?chapter_id=${chapterId}`
      : "/api/question-bank/sections/";
    console.log("Fetching sections from:", url);
    return apiClient.get(url);
  },

  createSection: (data) => {
    console.log("Creating section:", data);
    return apiClient.post("/api/question-bank/sections/", data);
  },

  updateSection: (id, data) =>
    apiClient.put(`/api/question-bank/sections/${id}/`, data),

  deleteSection: (id) => apiClient.delete(`/api/question-bank/sections/${id}/`),

  getSectionQuestions: (sectionId) =>
    apiClient.get(`/api/question-bank/sections/${sectionId}/questions/`),

  // Question APIs
  getAllQuestions: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiClient.get(`/api/question-bank/questions/?${params}`);
  },

  createQuestion: (data) =>
    apiClient.post("/api/question-bank/questions/", data),

  updateQuestion: (id, data) =>
    apiClient.put(`/api/question-bank/questions/${id}/`, data),

  deleteQuestion: (id) =>
    apiClient.delete(`/api/question-bank/questions/${id}/`),

  getQuestionDetails: (id) =>
    apiClient.get(`/api/question-bank/questions/${id}/`),

  duplicateQuestion: (id) =>
    apiClient.post(`/api/question-bank/questions/${id}/duplicate/`),

  uploadQuestions: (formData) => {
    console.log("Uploading questions...");
    return apiClient.post(
      "/api/question-bank/questions/upload-questions/",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  getQuestionsByType: (type) =>
    apiClient.get(`/api/question-bank/questions/by-type/?type=${type}`),
};

export default QuestionBankService;
