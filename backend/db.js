const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create/connect to database
const db = new sqlite3.Database(path.join(__dirname, "database.db"), (err) => {
  if (err) {
    console.error("Error connecting to database:", err);
  } else {
    console.log("Connected to SQLite database");
    initDatabase();
  }
});

function initDatabase() {
  // Create tables
  db.serialize(() => {
    // Classes table
    db.run(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        teacher TEXT NOT NULL,
        schedule TEXT
      )
    `);

    // Students table
    db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        class_id INTEGER,
        FOREIGN KEY (class_id) REFERENCES classes(id)
      )
    `);

    // Attendance table
    db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (class_id) REFERENCES classes(id)
      )
    `);

    // Insert sample data if tables are empty
    db.get("SELECT COUNT(*) as count FROM classes", [], (err, row) => {
      if (!err && row.count === 0) {
        insertSampleData();
      }
    });
  });
}

function insertSampleData() {
  console.log("Inserting sample data...");

  // Insert classes
  const classes = [
    ["Computer Science 101", "Prof. Smith"],
    ["Mathematics 201", "Ms. Johnson"],
    ["Physics 301", "Dr. Williams"],
    ["English Literature 102", "Prof. Davis"],
    ["Chemistry 202", "Dr. Brown"],
  ];

  const classStmt = db.prepare(
    "INSERT INTO classes (name, teacher) VALUES (?, ?)"
  );
  classes.forEach((cls) => classStmt.run(cls));
  classStmt.finalize();

  // Insert students
  const students = [
    ["ST92731", "John Doe", "john@example.com", 1],
    ["ST84521", "Jane Smith", "jane@example.com", 1],
    ["ST73642", "Mike Johnson", "mike@example.com", 1],

  ];

  const studentStmt = db.prepare(
    "INSERT INTO students (student_id, name, email, class_id) VALUES (?, ?, ?, ?)"
  );
  students.forEach((student) => studentStmt.run(student));
  studentStmt.finalize();

  console.log("Sample data inserted successfully");
}

module.exports = db;
