import { useState, useCallback } from "react";
import SubmissionService from "@/services/submission.service";

export function useSubmission() {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploadSubmission = useCallback(async (formData, onProgress) => {
    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      const data = await SubmissionService.uploadSubmission(formData);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, []);

  const uploadBatchSubmission = useCallback(async (formData) => {
    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      const data = await SubmissionService.uploadBatchSubmission(formData, (pct) => {
        setUploadProgress(pct);
      });
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, []);

  const getSubmissionSummary = useCallback(
    async (testId = null, studentId = null) => {
      try {
        setLoading(true);
        setError(null);
        const data = await SubmissionService.getSubmissionSummary(testId, studentId);
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getSubmissionDetails = useCallback(async (submissionId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await SubmissionService.getSubmissionDetail(submissionId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSubmission = useCallback(async (submissionId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await SubmissionService.deleteSubmission(submissionId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentDetails = useCallback(
    async (searchQuery = "", className = "") => {
      try {
        setLoading(true);
        setError(null);
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (className) params.class = className;

        const data = await SubmissionService.getStudentDetails(params);
        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    uploadProgress,
    error,
    uploadSubmission,
    uploadBatchSubmission,
    getSubmissionSummary,
    getSubmissionDetails,
    deleteSubmission,
    getStudentDetails,
  };
}

export default useSubmission;
