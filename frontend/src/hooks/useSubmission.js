import { useState, useCallback } from "react";
import axios from "axios";

export function useSubmission() {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const uploadSubmission = useCallback(
    async (formData) => {
      try {
        setLoading(true);
        setError(null);
        setUploadProgress(0);

        const response = await axios.post(
          `${apiUrl}api/submissions/upload_submission/`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            withCredentials: true,
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            },
          }
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.detail || "Failed to upload submission";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
        setUploadProgress(0);
      }
    },
    [apiUrl]
  );

  const getSubmissionSummary = useCallback(
    async (testId, studentId = null) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (testId) params.append("test_id", testId);
        if (studentId) params.append("student_id", studentId);

        const response = await axios.get(
          `${apiUrl}api/submissions/submission_summary/?${params.toString()}`,
          { withCredentials: true }
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.detail || "Failed to fetch submissions";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const getSubmissionDetails = useCallback(
    async (submissionId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `${apiUrl}api/submissions/${submissionId}/detail/`,
          { withCredentials: true }
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.detail || "Failed to fetch submission details";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const deleteSubmission = useCallback(
    async (submissionId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.delete(
          `${apiUrl}api/submissions/${submissionId}/`,
          { withCredentials: true }
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.detail || "Failed to delete submission";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const getStudentDetails = useCallback(
    async (name = "", className = "") => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (name) params.append("name", name);
        if (className) params.append("class", className);

        const response = await axios.get(
          `${apiUrl}api/submissions/student_details/?${params.toString()}`,
          { withCredentials: true }
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.detail || "Failed to fetch student details";
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
    uploadProgress,
    error,
    uploadSubmission,
    getSubmissionSummary,
    getSubmissionDetails,
    deleteSubmission,
    getStudentDetails,
  };
}

export default useSubmission;
