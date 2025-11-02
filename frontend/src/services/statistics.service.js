import apiClient from "./api-client";

const StatisticsService = {
  getTopStudents: async () => {
    try {
      const response = await apiClient.get("api/statistics/top-students/");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch top students"
      );
    }
  },

  getTestStatistics: async () => {
    try {
      const response = await apiClient.get("api/statistics/test-statistics/");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch test statistics"
      );
    }
  },

  getTestQuestionStats: async (testId) => {
    try {
      const response = await apiClient.get(
        `api/statistics/${testId}/test-question-stats/`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch question statistics"
      );
    }
  },
};

export default StatisticsService;
