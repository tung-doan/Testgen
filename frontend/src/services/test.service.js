import apiClient from './api-client';

const TestService = {
  getAllTests: async () => {
    try {
      const response = await apiClient.get('api/tests/');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch tests');
    }
  },

  getTestSummary: async () => {
    try {
      const response = await apiClient.get('api/tests/test_summary/');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch test summary');
    }
  },

  getTestById: async (testId) => {
    try {
      const response = await apiClient.get(`api/tests/${testId}/`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch test details');
    }
  },

  createTest: async (testData) => {
    try {
      const response = await apiClient.post('api/tests/', testData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to create test');
    }
  },

  deleteTest: async (testId) => {
    try {
      const response = await apiClient.delete(`api/tests/${testId}/`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to delete test');
    }
  },

  saveAnswerKeys: async (testId, answerKeys) => {
    try {
      const response = await apiClient.post(
        `api/tests/${testId}/save_answer_keys/`,
        { answer_keys: answerKeys }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to save answer keys');
    }
  },

  getAnswerKeys: async (testId) => {
    try {
      const response = await apiClient.get(`api/tests/${testId}/get_answer_keys/`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch answer keys');
    }
  },

  previewTestPDF: async (testData) => {
    try {
      const response = await apiClient.post(
        'api/tests/preview_test_pdf/',
        testData,
        {
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to generate PDF preview');
    }
  },
};

export default TestService;