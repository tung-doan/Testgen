import apiClient from "./api-client";

const SubmissionService = {
  uploadSubmission: async (formData) => {
    try {
      const response = await apiClient.post(
        "exam/submissions/upload_submission/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to upload submission",
      );
    }
  },

  uploadBatchSubmission: async (formData, onProgress) => {
    try {
      const response = await apiClient.post(
        "exam/submissions/upload_batch/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: onProgress
            ? (progressEvent) => {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total,
                );
                onProgress(percentCompleted);
              }
            : undefined,
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to upload batch submission",
      );
    }
  },

  getSubmissionSummary: async (testId = null, studentId = null) => {
    try {
      const params = {};
      if (testId) params.test_id = testId;
      if (studentId) params.student_id = studentId;

      const response = await apiClient.get(
        "exam/submissions/submission_summary/",
        {
          params,
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch submission summary",
      );
    }
  },

  getSubmissionResults: async (id) => {
    try {
      const response = await apiClient.get(`exam/submissions/${id}/results/`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch submission results",
      );
    }
  },

  getSubmissionDetail: async (id) => {
    try {
      const response = await apiClient.get(`exam/submissions/${id}/detail/`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch submission detail",
      );
    }
  },

  deleteSubmission: async (id) => {
    try {
      const response = await apiClient.delete(`exam/submissions/${id}/`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete submission",
      );
    }
  },

  getStudentDetails: async (params) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await apiClient.get(
        `exam/submissions/student_details/?${queryString}`,
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch student details",
      );
    }
  },
};

export default SubmissionService;
