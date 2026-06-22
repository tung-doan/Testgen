import { useState, useCallback } from "react";
import OnlineExamService from "@/services/onlineExam.service";

export function useOnlineExam() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getPendingExams = useCallback(async (studentId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await OnlineExamService.getPendingExams(studentId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const startExam = useCallback(async (examId, studentId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await OnlineExamService.startExam(examId, studentId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getExamAttempt = useCallback(async (attemptId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await OnlineExamService.getExamAttempt(attemptId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAnswers = useCallback(async (attemptId, answers) => {
    try {
      const data = await OnlineExamService.saveAnswers(attemptId, answers);
      return data;
    } catch (err) {
      // Silent fail for auto-save - don't set error state
      console.warn("Auto-save failed:", err.message);
      throw err;
    }
  }, []);

  const submitExam = useCallback(async (attemptId, answers) => {
    try {
      setLoading(true);
      setError(null);
      const data = await OnlineExamService.submitExam(attemptId, answers);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCompletedExams = useCallback(async (studentId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await OnlineExamService.getCompletedExams(studentId);
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to fetch completed exams";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getPendingExams,
    startExam,
    getExamAttempt,
    saveAnswers,
    submitExam,
    getCompletedExams,
  };
}
