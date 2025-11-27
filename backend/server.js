const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Get all classes
app.get("/api/classes", (req, res) => {
  db.all("SELECT * FROM classes", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get students by class
app.get("/api/students/class/:classId", (req, res) => {
  const { classId } = req.params;
  db.all(
    "SELECT * FROM students WHERE class_id = ?",
    [classId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get all students
app.get("/api/students", (req, res) => {
  db.all("SELECT * FROM students", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Mark attendance
app.post("/api/attendance", (req, res) => {
  const { student_id, class_id, date, status, timestamp } = req.body;

  const query = `
    INSERT INTO attendance (student_id, class_id, date, status, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [student_id, class_id, date, status, timestamp],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: "Attendance marked successfully" });
    }
  );
});

// Get attendance by class and date
app.get("/api/attendance/:classId/:date", (req, res) => {
  const { classId, date } = req.params;

  const query = `
    SELECT a.*, s.name, s.student_id as sid
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.class_id = ? AND a.date = ?
    ORDER BY a.timestamp
  `;

  db.all(query, [classId, date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get attendance history for a student
app.get("/api/attendance/student/:studentId", (req, res) => {
  const { studentId } = req.params;

  const query = `
    SELECT a.*, c.name as class_name
    FROM attendance a
    JOIN classes c ON a.class_id = c.id
    WHERE a.student_id = ?
    ORDER BY a.date DESC
  `;

  db.all(query, [studentId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add new student
app.post("/api/students", (req, res) => {
  const { student_id, name, email, class_id } = req.body;

  const query = `
    INSERT INTO students (student_id, name, email, class_id)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [student_id, name, email, class_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: "Student added successfully" });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
