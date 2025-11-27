import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  Clock,
  UserCheck,
  AlertCircle,
  Camera,
  X,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

// API Configuration
const API_URL = "attendance-system-production-022d.up.railway.app"; 

const api = {
  getClasses: async () => {
    const res = await fetch(`${API_URL}/classes`);
    return res.json();
  },
  getStudents: async () => {
    const res = await fetch(`${API_URL}/students`);
    return res.json();
  },
  markAttendance: async (data) => {
    const res = await fetch(`${API_URL}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

const AttendanceSystem = () => {
  const [view, setView] = useState("login");
  const [selectedClass, setSelectedClass] = useState(null);
  const [scannedStudents, setScannedStudents] = useState(new Set());
  const [scanInput, setScanInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesData, studentsData] = await Promise.all([
        api.getClasses(),
        api.getStudents(),
      ]);
      setClasses(classesData);
      setStudents(studentsData);
    } catch (error) {
      console.error("Error loading data:", error);
      setFeedback({
        type: "error",
        message: "Failed to load data. Using offline mode.",
      });
      // Fallback to demo data
      setClasses([
        { id: 1, name: "Computer Science 101", teacher: "Prof. Smith" },
        { id: 2, name: "Mathematics 201", teacher: "Ms. Johnson" },
      ]);
      setStudents([
        { id: 1, student_id: "ST92731", name: "John Doe", class_id: 1 },
        { id: 2, student_id: "ST84521", name: "Jane Smith", class_id: 1 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "scan" && inputRef.current && !isCameraOpen) {
      inputRef.current.focus();
    }
  }, [view, feedback, isCameraOpen]);

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch((err) => console.log(err));
      }
    };
  }, []);

  const handleClassSelect = (classId) => {
    setSelectedClass(classId);
    setView("scan");
    setScannedStudents(new Set());
    setAttendanceRecords([]);
  };

  const processBarcode = async (barcode) => {
    const studentId = barcode.trim().toUpperCase();

    if (!studentId) return;

    const student = students.find((s) => s.student_id === studentId);

    if (!student) {
      setFeedback({
        type: "error",
        message: "Student ID not found in database!",
      });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    if (student.class_id !== selectedClass) {
      setFeedback({
        type: "error",
        message: `${student.name} is not registered for this class!`,
      });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    if (scannedStudents.has(studentId)) {
      setFeedback({
        type: "warning",
        message: `${student.name} already marked present!`,
      });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    // Mark attendance in database
    try {
      await api.markAttendance({
        student_id: student.id,
        class_id: selectedClass,
        date: new Date().toISOString().split("T")[0],
        status: "present",
        timestamp: new Date().toISOString(),
      });

      const newScanned = new Set(scannedStudents);
      newScanned.add(studentId);
      setScannedStudents(newScanned);

      const record = {
        studentId: student.student_id,
        name: student.name,
        time: new Date().toLocaleTimeString(),
        status: "present",
      };
      setAttendanceRecords([...attendanceRecords, record]);

      setFeedback({ type: "success", message: `✓ ${student.name} - Present` });
      setTimeout(() => setFeedback(null), 2000);
    } catch (error) {
      console.error("Error marking attendance:", error);
      setFeedback({
        type: "error",
        message: "Failed to save attendance. Please try again.",
      });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleScan = () => {
    processBarcode(scanInput);
    setScanInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleScan();
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsCameraOpen(true);

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          processBarcode(decodedText);
          html5QrCode.pause(true);
          setTimeout(() => {
            if (html5QrCodeRef.current) {
              html5QrCode.resume();
            }
          }, 1500);
        },
        (errorMessage) => {
          // Scanning errors are normal, ignore them
        }
      );
    } catch (err) {
      setCameraError("Unable to access camera. Please check permissions.");
      setIsCameraOpen(false);
      console.error(err);
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.error(err);
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const getClassStudents = () => {
    return students.filter((s) => s.class_id === selectedClass);
  };

  const getPresentCount = () => {
    return scannedStudents.size;
  };

  const getAbsentStudents = () => {
    const classStudents = getClassStudents();
    return classStudents.filter((s) => !scannedStudents.has(s.student_id));
  };

  const finalizeAttendance = () => {
    if (isCameraOpen) {
      stopCamera();
    }
    alert(
      `Attendance finalized!\nPresent: ${getPresentCount()}\nAbsent: ${
        getAbsentStudents().length
      }`
    );
  };

  const selectedClassInfo = classes.find((c) => c.id === selectedClass);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-xl text-gray-700">Loading attendance system...</p>
        </div>
      </div>
    );
  }

  if (view === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <Users className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-800">
                Class Attendance System
              </h1>
              <p className="text-gray-600 mt-2">
                Select your class to begin taking attendance
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Available Classes:
              </h2>
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => handleClassSelect(cls.id)}
                  className="w-full bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {cls.name}
                      </h3>
                      <p className="text-gray-600 text-sm">{cls.teacher}</p>
                    </div>
                    <div className="text-indigo-600">→</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setView("teacher")}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Teacher Dashboard →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "scan") {
    const classStudents = getClassStudents();
    const absentStudents = getAbsentStudents();

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {selectedClassInfo?.name}
                </h1>
                <p className="text-gray-600">{selectedClassInfo?.teacher}</p>
              </div>
              <button
                onClick={() => {
                  if (isCameraOpen) stopCamera();
                  setView("login");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                ← Back
              </button>
            </div>

            <div className="flex items-center gap-2 text-gray-600 mb-6">
              <Calendar className="w-5 h-5" />
              <span>{currentDate}</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">Total</span>
                </div>
                <p className="text-3xl font-bold text-blue-700">
                  {classStudents.length}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Present</span>
                </div>
                <p className="text-3xl font-bold text-green-700">
                  {getPresentCount()}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-semibold">Absent</span>
                </div>
                <p className="text-3xl font-bold text-red-700">
                  {absentStudents.length}
                </p>
              </div>
            </div>

            {!isCameraOpen ? (
              <div className="mb-6">
                <div className="flex gap-4 mb-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type or scan student ID here (try: ST92731)..."
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                    autoFocus
                  />
                  <button
                    onClick={handleScan}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                  >
                    Mark Present
                  </button>
                </div>
                <div className="text-center">
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    <Camera className="w-5 h-5" />
                    Scan with Camera
                  </button>
                  {cameraError && (
                    <p className="text-red-600 mt-2 text-sm">{cameraError}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <div id="qr-reader" className="w-full"></div>
                  <button
                    onClick={stopCamera}
                    className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-center mt-4 text-gray-600">
                  Position the barcode within the frame to scan
                </p>
              </div>
            )}

            {feedback && (
              <div
                className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                  feedback.type === "success"
                    ? "bg-green-100 text-green-800"
                    : feedback.type === "error"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {feedback.type === "success" && (
                  <CheckCircle className="w-6 h-6" />
                )}
                {feedback.type === "error" && <XCircle className="w-6 h-6" />}
                {feedback.type === "warning" && (
                  <AlertCircle className="w-6 h-6" />
                )}
                <span className="text-lg font-semibold">
                  {feedback.message}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Present ({getPresentCount()})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {attendanceRecords.map((record, idx) => (
                    <div
                      key={idx}
                      className="bg-green-50 border border-green-200 rounded-lg p-3"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {record.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {record.studentId}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-green-700">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{record.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Absent ({absentStudents.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {absentStudents.map((student) => (
                    <div
                      key={student.id}
                      className="bg-red-50 border border-red-200 rounded-lg p-3"
                    >
                      <p className="font-semibold text-gray-800">
                        {student.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {student.student_id}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={finalizeAttendance}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-lg"
              >
                Finalize Attendance
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "teacher") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">
                Teacher Dashboard
              </h1>
              <button
                onClick={() => setView("login")}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                ← Back
              </button>
            </div>

            <div className="text-center py-12">
              <UserCheck className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Teacher View
              </h2>
              <p className="text-gray-600">
                View attendance records, student statistics, and generate
                reports
              </p>
              <p className="text-gray-500 mt-4">
                (Full dashboard features would include class selection, date
                filtering, and export options)
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default AttendanceSystem;
