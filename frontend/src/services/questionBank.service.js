import apiClient from "./api-client";

const QuestionBankService = {
  // Subject APIs
  getAllSubjects: () => {
    console.log("Fetching subjects from:", "question-bank/subjects/");
    return apiClient.get("question-bank/subjects/");
  },

  createSubject: (data) => {
    console.log("Creating subject:", data);
    return apiClient.post("question-bank/subjects/", data);
  },

  updateSubject: (id, data) =>
    apiClient.put(`question-bank/subjects/${id}/`, data),
  deleteSubject: (id) => apiClient.delete(`question-bank/subjects/${id}/`),

  getSubjectChapters: (subjectId) =>
    apiClient.get(`question-bank/subjects/${subjectId}/chapters/`),
  // Chapter APIs
  getAllChapters: (subjectId = null) => {
    const url = subjectId
      ? `question-bank/chapters/?subject_id=${subjectId}`
      : "question-bank/chapters/";
    console.log("Fetching chapters from:", url);
    return apiClient.get(url);
  },

  createChapter: (data) => {
    console.log("Creating chapter:", data);
    return apiClient.post("question-bank/chapters/", data);
  },

  updateChapter: (id, data) =>
    apiClient.put(`question-bank/chapters/${id}/`, data),
  deleteChapter: (id) => apiClient.delete(`/api/question-bank/chapters/${id}/`),

  getChapterSections: (chapterId) =>
    apiClient.get(`question-bank/chapters/${chapterId}/sections/`),

  // Section APIs
  getAllSections: (chapterId = null) => {
    const url = chapterId
      ? `question-bank/sections/?chapter_id=${chapterId}`
      : "question-bank/sections/";
    console.log("Fetching sections from:", url);
    return apiClient.get(url);
  },

  createSection: (data) => {
    console.log("Creating section:", data);
    return apiClient.post("question-bank/sections/", data);
  },

  updateSection: (id, data) =>
    apiClient.put(`question-bank/sections/${id}/`, data),

  deleteSection: (id) => apiClient.delete(`question-bank/sections/${id}/`),

  getSectionQuestions: (sectionId) =>
    apiClient.get(`question-bank/sections/${sectionId}/questions/`),

  // Question APIs
  getAllQuestions: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiClient.get(`question-bank/questions/?${params}`);
  },

  createQuestion: (data) =>
    apiClient.post("question-bank/questions/", data),
  updateQuestion: (id, data) =>
    apiClient.put(`question-bank/questions/${id}/`, data),

  deleteQuestion: (id) =>
    apiClient.delete(`question-bank/questions/${id}/`),

  getQuestionDetails: (id) =>
    apiClient.get(`question-bank/questions/${id}/`),

  duplicateQuestion: (id) =>
    apiClient.post(`question-bank/questions/${id}/duplicate/`),

  uploadQuestions: (formData) => {
    console.log("Uploading questions...");
    return apiClient.post(
      "question-bank/questions/upload-questions/",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  getQuestionsByType: (type) =>
    apiClient.get(`question-bank/questions/by-type/?type=${type}`),
};

export default QuestionBankService;
