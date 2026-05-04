import { useState, useCallback } from "react";
import StatisticsService from "@/services/statistics.service";

export function useStatistics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getTopStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await StatisticsService.getTopStudents();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTestStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await StatisticsService.getTestStatistics();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTestQuestionStats = useCallback(async (testId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await StatisticsService.getTestQuestionStats(testId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await StatisticsService.getDashboardStats();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getTopStudents,
    getTestStatistics,
    getTestQuestionStats,
    getDashboardStats,
  };
}

export default useStatistics;
