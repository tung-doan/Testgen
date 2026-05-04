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
    [apiUrl],
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
          },
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
    [apiUrl],
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
          },
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
    [apiUrl],
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
          },
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
    [apiUrl],
  );

  const getClassroomStudentInfo = useCallback(
    async (studentId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `${apiUrl}classroom/student-info/?student_id=${studentId}`,
          {
            withCredentials: true,
          },
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to fetch classroom info";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl],
  );

  const addStudent = useCallback(
    async (classroomId, studentData) => {
      try {
        setLoading(true);
        setError(null);
        const payload = { ...studentData, classroom: classroomId };
        const response = await axios.post(
          `${apiUrl}classroom/students/`,
          payload,
          {
            withCredentials: true,
          },
        );
        return response.data;
      } catch (err) {
        const errorMsg = err.response?.data?.error || "Failed to add student";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl],
  );

  const addStudentToClassroom = useCallback(
    async (studentId, classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.post(
          `${apiUrl}classroom/students/${studentId}/add-to-classroom/`,
          { classroom_id: classroomId },
          { withCredentials: true },
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to add student to classroom";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl],
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
          },
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
    [apiUrl],
  );

  // ============================================
  // Enrollment Request Methods
  // ============================================

  const getAllAvailableClassrooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${apiUrl}classroom/all/`, {
        withCredentials: true,
      });
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to fetch available classrooms";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const requestEnrollment = useCallback(
    async (classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.post(
          `${apiUrl}classroom/enrollment-requests/`,
          { classroom_id: classroomId },
          { withCredentials: true },
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to send enrollment request";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl],
  );

  const getEnrollmentRequests = useCallback(
    async (classroomId, statusFilter = "pending") => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `${apiUrl}classroom/${classroomId}/enrollment-requests/?status=${statusFilter}`,
          { withCredentials: true },
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to fetch enrollment requests";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl],
  );

  const getEnrollmentRequestsCount = useCallback(
    async (classroomId) => {
      try {
        const response = await axios.get(
          `${apiUrl}classroom/${classroomId}/enrollment-requests/count/`,
          { withCredentials: true },
        );
        return response.data.count;
      } catch (err) {
        return 0;
      }
    },
    [apiUrl],
  );

  const handleEnrollmentRequest = useCallback(
    async (requestId, action) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.patch(
          `${apiUrl}classroom/enrollment-requests/${requestId}/action/`,
          { action },
          { withCredentials: true },
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to handle enrollment request";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl],
  );

  const getMyEnrolledClassrooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${apiUrl}classroom/my-classes/`, {
        withCredentials: true,
      });
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to fetch enrolled classrooms";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const unenrollFromClassroom = useCallback(
    async (classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.post(
          `${apiUrl}classroom/students/remove-from-classroom-self/`,
          { classroom_id: classroomId },
          { withCredentials: true },
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to unenroll from classroom";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl],
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
    getClassroomStudentInfo,
    addStudentToClassroom,
    // Enrollment
    getAllAvailableClassrooms,
    requestEnrollment,
    getEnrollmentRequests,
    getEnrollmentRequestsCount,
    handleEnrollmentRequest,
    getMyEnrolledClassrooms,
    unenrollFromClassroom,
  };
}

export default useClassroom;
