const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = {
  // Classes
  getClasses: async () => {
    const res = await fetch(`${API_URL}/classes`);
    return res.json();
  },

  // Students
  getStudents: async () => {
    const res = await fetch(`${API_URL}/students`);
    return res.json();
  },

  getStudentsByClass: async (classId) => {
    const res = await fetch(`${API_URL}/students/class/${classId}`);
    return res.json();
  },

  addStudent: async (studentData) => {
    const res = await fetch(`${API_URL}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentData),
    });
    return res.json();
  },

  // Attendance
  markAttendance: async (attendanceData) => {
    const res = await fetch(`${API_URL}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attendanceData),
    });
    return res.json();
  },

  getAttendance: async (classId, date) => {
    const res = await fetch(`${API_URL}/attendance/${classId}/${date}`);
    return res.json();
  },

  getStudentAttendance: async (studentId) => {
    const res = await fetch(`${API_URL}/attendance/student/${studentId}`);
    return res.json();
  },
};
