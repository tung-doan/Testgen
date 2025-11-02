import apiClient from "./api-client";

const SubmissionService = {
  uploadSubmission: async (formData, onProgress) => {
    try {
      const response = await apiClient.post(
        "api/submissions/upload_submission/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: onProgress
            ? (progressEvent) => {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                onProgress(percentCompleted);
              }
            : undefined,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to upload submission"
      );
    }
  },

  getSubmissionSummary: async (testId, studentId = null) => {
    try {
      const params = new URLSearchParams();
      if (testId) params.append("test_id", testId);
      if (studentId) params.append("student_id", studentId);

      const response = await apiClient.get(
        `api/submissions/submission_summary/?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch submission summary"
      );
    }
  },

  getSubmissionDetails: async (submissionId) => {
    try {
      const response = await apiClient.get(
        `api/submissions/${submissionId}/detail/`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch submission details"
      );
    }
  },

  deleteSubmission: async (submissionId) => {
    try {
      const response = await apiClient.delete(
        `api/submissions/${submissionId}/`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to delete submission"
      );
    }
  },

  getStudentDetails: async (name = "", className = "") => {
    try {
      const params = new URLSearchParams();
      if (name) params.append("name", name);
      if (className) params.append("class", className);

      const response = await apiClient.get(
        `api/submissions/student_details/?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch student details"
      );
    }
  },
};

export default SubmissionService;
