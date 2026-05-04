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
      const errorMessage = err.message || "Failed to create test";
      setError(errorMessage);
      throw new Error(errorMessage);
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

      // Format answer keys
      const formattedAnswerKeys = {};
      Object.keys(answerKeys).forEach((key) => {
        const value = answerKeys[key];
        if (value) {
          formattedAnswerKeys[String(key)] = String(value).toUpperCase();
        }
      });

      const data = await TestService.saveAnswerKeys(
        testId,
        formattedAnswerKeys,
      );
      return data;
    } catch (err) {
      const errorMessage = err.message || "Failed to save answer keys";
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
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  const generateFullTestPDF = useCallback(async (testData) => {
    try {
      setLoading(true);
      setError(null);
      const blob = await TestService.generateFullTestPDF(testData);
      return blob;
    } catch (err) {
      const errorMessage = err.message || "Failed to generate full test PDF";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadAllVariants = useCallback(async (testId) => {
    try {
      setLoading(true);
      setError(null);
      const blob = await TestService.downloadAllVariants(testId);
      return blob;
    } catch (err) {
      const errorMessage = err.message || "Failed to download variants";
      setError(errorMessage);
      throw new Error(errorMessage);
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
    generateFullTestPDF,
    downloadAllVariants,
  };
}
