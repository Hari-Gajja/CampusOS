export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  HOD: 'hod',
  ADMIN: 'admin',
};

export const ATTENDANCE_STATUS = {
  ON_TIME: 'on-time',
  LATE: 'late',
  ABSENT: 'absent',
};
