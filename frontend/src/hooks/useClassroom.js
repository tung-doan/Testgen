import { useState, useCallback } from "react";
import axios from "axios";

export function useClassroom() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const getAllClassrooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${apiUrl}classroom/`, {
        withCredentials: true,
      });
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to fetch classrooms";
      setError(errorMsg);
      if (err.response?.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const getClassroomById = useCallback(
    async (classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${apiUrl}classroom/${classroomId}/`, {
          withCredentials: true,
        });
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to fetch classroom";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const createClassroom = useCallback(
    async (classroomData) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.post(
          `${apiUrl}classroom/`,
          classroomData,
          {
            withCredentials: true,
          }
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to create classroom";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const deleteClassroom = useCallback(
    async (classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.delete(
          `${apiUrl}classroom/${classroomId}/`,
          {
            withCredentials: true,
          }
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to delete classroom";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const getStudents = useCallback(
    async (classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `${apiUrl}classroom/${classroomId}/students/`,
          {
            withCredentials: true,
          }
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to fetch students";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const addStudent = useCallback(
    async (classroomId, studentData) => {
      try {
        setLoading(true);
        setError(null);
        const payload = { ...studentData, classroom: classroomId };
        const response = await axios.post(`${apiUrl}classroom/students/`, payload, {
          withCredentials: true,
        });
        return response.data;
      } catch (err) {
        const errorMsg = err.response?.data?.error || "Failed to add student";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  const deleteStudent = useCallback(
    async (studentId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.delete(
          `${apiUrl}classroom/students/${studentId}/`,
          {
            withCredentials: true,
          }
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to delete student";
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
    getAllClassrooms,
    getClassroomById,
    createClassroom,
    deleteClassroom,
    getStudents,
    addStudent,
    deleteStudent,
  };
}

export default useClassroom;
