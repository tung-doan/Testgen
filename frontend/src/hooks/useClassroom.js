import { useState, useCallback } from "react";
import apiClient from "@/services/api-client";

export function useClassroom() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAllClassrooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`classroom/`);
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
  }, []);

  const getClassroomById = useCallback(
    async (classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(`classroom/${classroomId}/`);
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
    [],
  );

  const createClassroom = useCallback(
    async (classroomData) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.post(`classroom/`, classroomData);
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
    [],
  );

  const updateClassroom = useCallback(
    async (classroomId, classroomData) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.patch(`classroom/${classroomId}/`, classroomData);
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to update classroom";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteClassroom = useCallback(
    async (classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.delete(`classroom/${classroomId}/`);
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
    [],
  );

  const getStudents = useCallback(
    async (classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(
          `classroom/${classroomId}/students/`,
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
    [],
  );

  const getClassroomStudentInfo = useCallback(
    async (studentId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(
          `classroom/student-info/?student_id=${studentId}`,
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
    [],
  );

  const deleteStudent = useCallback(
    async (studentId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.delete(
          `classroom/students/${studentId}/`,
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
    [],
  );

  // ============================================
  // Teacher Invitation Methods
  // ============================================

  const inviteStudent = useCallback(
    async (classroomId, email) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.post(
          `classroom/${classroomId}/invite-student/`,
          { email },
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to send invitation";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ============================================
  // Enrollment Request Methods (Student -> Teacher)
  // ============================================

  const getAllAvailableClassrooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`classroom/all/`);
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to fetch available classrooms";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestEnrollment = useCallback(
    async (classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.post(
          `classroom/enrollment-requests/`,
          { classroom_id: classroomId },
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
    [],
  );

  const getEnrollmentRequests = useCallback(
    async (classroomId, statusFilter = "pending") => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(
          `classroom/${classroomId}/enrollment-requests/?status=${statusFilter}`,
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
    [],
  );

  const getEnrollmentRequestsCount = useCallback(
    async (classroomId) => {
      try {
        const response = await apiClient.get(
          `classroom/${classroomId}/enrollment-requests/count/`,
        );
        return response.data.count;
      } catch (err) {
        return 0;
      }
    },
    [],
  );

  const handleEnrollmentRequest = useCallback(
    async (requestId, action) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.patch(
          `classroom/enrollment-requests/${requestId}/action/`,
          { action },
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
    [],
  );

  const getMyEnrolledClassrooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`classroom/my-classes/`);
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to fetch enrolled classrooms";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const unenrollFromClassroom = useCallback(
    async (classroomId) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.post(
          `classroom/students/remove-from-classroom-self/`,
          { classroom_id: classroomId },
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
    [],
  );

  // ============================================
  // Student Invitation Methods (Teacher -> Student)
  // ============================================

  const getMyInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`classroom/my-invitations/`);
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to fetch invitations";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyInvitationsCount = useCallback(async () => {
    try {
      const response = await apiClient.get(`classroom/my-invitations/count/`);
      return response.data.count;
    } catch (err) {
      return 0;
    }
  }, []);

  const handleInvitation = useCallback(
    async (invitationId, action) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.patch(
          `classroom/invitations/${invitationId}/action/`,
          { action },
        );
        return response.data;
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to handle invitation";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    getAllClassrooms,
    getClassroomById,
    createClassroom,
    updateClassroom,
    deleteClassroom,
    getStudents,
    deleteStudent,
    getClassroomStudentInfo,
    // Teacher invitation
    inviteStudent,
    // Enrollment (student -> teacher)
    getAllAvailableClassrooms,
    requestEnrollment,
    getEnrollmentRequests,
    getEnrollmentRequestsCount,
    handleEnrollmentRequest,
    getMyEnrolledClassrooms,
    unenrollFromClassroom,
    // Student invitations (teacher -> student)
    getMyInvitations,
    getMyInvitationsCount,
    handleInvitation,
  };
}

export default useClassroom;
