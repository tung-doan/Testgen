import { useState, useCallback } from "react";
import QuestionBankService from "@/services/questionBank.service";
import extractErrorMessage from "@/lib/extractErrorMessage";

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
      const errorMsg = extractErrorMessage(err, "Failed to fetch subjects");
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
      const errorMsg = extractErrorMessage(err, "Failed to create subject");
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
      const errorMsg = extractErrorMessage(err, "Failed to delete subject");
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSubject = useCallback(async (id, data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.updateSubject(id, data);
      return response.data;
    } catch (err) {
      const errorMsg = extractErrorMessage(err, "Failed to update subject");
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteChapter = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      await QuestionBankService.deleteChapter(id);
    } catch (err) {
      const errorMsg = extractErrorMessage(err, "Failed to delete chapter");
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateChapter = useCallback(async (id, data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.updateChapter(id, data);
      return response.data;
    } catch (err) {
      const errorMsg = extractErrorMessage(err, "Failed to update chapter");
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSection = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      await QuestionBankService.deleteSection(id);
    } catch (err) {
      const errorMsg = extractErrorMessage(err, "Failed to delete section");
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSection = useCallback(async (id, data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await QuestionBankService.updateSection(id, data);
      return response.data;
    } catch (err) {
      const errorMsg = extractErrorMessage(err, "Failed to update section");
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
      const errorMsg = extractErrorMessage(err, "Failed to fetch chapters");
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
      const errorMsg = extractErrorMessage(err, "Failed to create chapter");
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
      const errorMsg = extractErrorMessage(err, "Failed to fetch sections");
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
      const errorMsg = extractErrorMessage(err, "Failed to create section");
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
      const errorMsg = extractErrorMessage(err, "Failed to fetch questions");
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
      const errorMsg = extractErrorMessage(err, "Failed to create question");
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadQuestions = useCallback(async (file, sectionId) => {
    // Client-side file size validation (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const errorMsg = `File size (${sizeMB}MB) exceeds the 10MB limit. Please use a smaller file.`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    // Client-side format check
    if (!file.name.toLowerCase().endsWith('.docx')) {
      const errorMsg = `Invalid file format: '${file.name}'. Only .docx files are accepted.`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("section_id", sectionId);

      const response = await QuestionBankService.uploadQuestions(formData);
      return response.data;
    } catch (err) {
      let errorMsg;

      // Timeout error
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMsg = "Upload timed out. The file may be too large or the server is busy. Please try again.";
      }
      // Server returned structured error
      else if (err.response?.data) {
        const data = err.response.data;
        errorMsg = data.error || data.detail || "Failed to upload questions";

        // Attach full error data for detailed UI display
        const enrichedError = new Error(errorMsg);
        enrichedError.validationErrors = data.validation_errors || [];
        enrichedError.serverErrors = data.errors || [];
        enrichedError.details = data.details || [];
        enrichedError.errorType = data.error_type || "unknown";
        setError(errorMsg);
        throw enrichedError;
      }
      else {
        errorMsg = extractErrorMessage(err, "Failed to upload questions");
      }

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
      const errorMsg = extractErrorMessage(err, "Failed to delete question");
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
    updateSubject,
    fetchChapters,
    createChapter,
    deleteChapter,
    updateChapter,
    fetchSections,
    createSection,
    deleteSection,
    updateSection,
    fetchQuestions,
    createQuestion,
    uploadQuestions,
    deleteQuestion,
  };
}
