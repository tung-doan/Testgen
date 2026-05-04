import apiClient from "./api-client";

const TestService = {
  // ============ Paper Tests ============
  getAllTests: async () => {
    try {
      const response = await apiClient.get("exam/tests/");
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch tests");
    }
  },

  getTestById: async (id, config = {}) => {
    try {
      const response = await apiClient.get(`exam/tests/${id}/`, config);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch test");
    }
  },

  createTest: async (data) => {
    try {
      const response = await apiClient.post("exam/tests/", data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to create test");
    }
  },

  updateTest: async (id, data) => {
    try {
      const response = await apiClient.put(`exam/tests/${id}/`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to update test");
    }
  },

  deleteTest: async (testId) => {
    try {
      const response = await apiClient.delete(`exam/tests/${testId}/`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete test");
    }
  },

  getTestSummary: async () => {
    try {
      const response = await apiClient.get("exam/tests/test_summary/");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch test summary",
      );
    }
  },

  getAnswerKeys: async (testId) => {
    try {
      const response = await apiClient.get(
        `exam/tests/${testId}/get_answer_keys/`,
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch answer keys",
      );
    }
  },

  // ============ PDF Generation ============
  generateFullTestPDF: async (data) => {
    try {
      const response = await apiClient.post(
        "exam/tests/generate_full_test_pdf/",
        data,
        {
          responseType: "blob",
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to generate PDF");
    }
  },

  downloadAllVariants: async (testId) => {
    try {
      const response = await apiClient.get(
        `exam/tests/${testId}/download-all-variants/`,
        {
          responseType: "blob",
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to download variants",
      );
    }
  },

};

export default TestService;
