import { useState, useCallback } from "react";
import axios from "axios";

export function useStatistics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const getTopStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${apiUrl}api/statistics/top-students/`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || "Failed to fetch top students";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const getTestStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${apiUrl}api/statistics/test-statistics/`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || "Failed to fetch test statistics";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const getTestQuestionStats = useCallback(
    async (testId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `${apiUrl}api/statistics/${testId}/test-question-stats/`,
          { withCredentials: true }
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.detail || "Failed to fetch question statistics";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  return {
    loading,
    error,
    getTopStudents,
    getTestStatistics,
    getTestQuestionStats,
  };
}

export default useStatistics;
