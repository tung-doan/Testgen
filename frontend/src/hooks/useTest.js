import { useState, useCallback } from "react";
import TestService from "@/services/test.service";

export function useTest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAllTests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TestService.getAllTests();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTestSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TestService.getTestSummary();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTestById = useCallback(async (testId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await TestService.getTestById(testId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTest = useCallback(async (testData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await TestService.createTest(testData);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTest = useCallback(async (testId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await TestService.deleteTest(testId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAnswerKeys = useCallback(async (testId, answerKeys) => {
    try {
      setLoading(true);
      setError(null);

      // Format answer keys: ensure all keys are strings and values are uppercase letters
      const formattedAnswerKeys = {};
      Object.keys(answerKeys).forEach((key) => {
        const value = answerKeys[key];
        if (value) {
          // Only include non-empty values
          formattedAnswerKeys[String(key)] = String(value).toUpperCase();
        }
      });
      const data = await TestService.saveAnswerKeys(
        testId,
        formattedAnswerKeys
      );
      return data;
    } catch (err) {
      console.error("Save answer keys error:", err); // Debug log
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Failed to save answer keys";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAnswerKeys = useCallback(async (testId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await TestService.getAnswerKeys(testId);
      if (data && data.answer_keys) {
        return data.answer_keys;
      }
      return data || {};
    } catch (err) {
      console.error("Get answer keys error:", err); 
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  const previewTestPDF = useCallback(async (testData) => {
    try {
      setLoading(true);
      setError(null);
      const blob = await TestService.previewTestPDF(testData);

      const url = window.URL.createObjectURL(blob); // mở url trong tab mới
      window.open(url, "_blank");

      return blob;
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
    getAllTests,
    getTestSummary,
    getTestById,
    createTest,
    deleteTest,
    saveAnswerKeys,
    getAnswerKeys,
    previewTestPDF,
  };
}
