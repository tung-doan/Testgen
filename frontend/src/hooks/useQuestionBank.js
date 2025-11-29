import { useState, useCallback } from "react";
import QuestionBankService from "@/services/questionBank.service";

export function useQuestionBank() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Subject operations
  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.getAllSubjects();
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to fetch subjects";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubject = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.createSubject(data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to create subject";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSubject = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      await QuestionBankService.deleteSubject(id);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to delete subject";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Chapter operations
  const fetchChapters = useCallback(async (subjectId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.getAllChapters(subjectId);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to fetch chapters";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const createChapter = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.createChapter(data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to create chapter";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Section operations
  const fetchSections = useCallback(async (chapterId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.getAllSections(chapterId);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to fetch sections";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSection = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.createSection(data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to create section";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Question operations
  const fetchQuestions = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.getAllQuestions(filters);
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || "Failed to fetch questions";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const createQuestion = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.createQuestion(data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to create question";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadQuestions = useCallback(async (file, sectionId) => {
    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("section_id", sectionId);

      const response = await QuestionBankService.uploadQuestions(formData);
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to upload questions";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteQuestion = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      await QuestionBankService.deleteQuestion(id);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to delete question";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchSubjects,
    createSubject,
    deleteSubject,
    fetchChapters,
    createChapter,
    fetchSections,
    createSection,
    fetchQuestions,
    createQuestion,
    uploadQuestions,
    deleteQuestion,
  };
}
