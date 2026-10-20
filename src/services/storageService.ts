import { Student, AttendanceRecord } from '../types';

const STORAGE_KEYS = {
  STUDENTS: 'face_attendance_students',
  ATTENDANCE: 'face_attendance_records',
  DEMO_ATTENDANCE: 'face_attendance_demo_records',
};

// Format Date as YYYY-MM-DD in local time
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format Time as 12-hour or 24-hour readable string
export function getCurrentTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

// ----------------- STUDENTS -----------------

export function getStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) return [];
    return JSON.parse(raw) as Student[];
  } catch (err) {
    console.error('Error loading students from localStorage:', err);
    return [];
  }
}

export function saveStudent(student: Student): { success: boolean; error?: string } {
  try {
    const students = getStudents();
    // Unique roll number validation (case-insensitive trim)
    const normalizedRoll = student.rollNo.trim().toUpperCase();
    const existing = students.find(
      (s) => s.rollNo.trim().toUpperCase() === normalizedRoll && s.id !== student.id
    );
    if (existing) {
      return { success: false, error: `Roll Number "${student.rollNo}" is already registered to ${existing.name}.` };
    }

    students.unshift(student);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    return { success: true };
  } catch (err) {
    console.error('Failed to save student:', err);
    return { success: false, error: 'Could not save student to local storage. Storage quota may be full.' };
  }
}

export function deleteStudent(studentId: string): boolean {
  try {
    const students = getStudents();
    const updated = students.filter((s) => s.id !== studentId);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to delete student:', err);
    return false;
  }
}

// ----------------- ATTENDANCE -----------------

export function getAttendanceRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!raw) return [];
    return JSON.parse(raw) as AttendanceRecord[];
  } catch (err) {
    console.error('Error loading attendance records:', err);
    return [];
  }
}

export function isStudentMarkedToday(studentId: string, date: string = getTodayDateString()): AttendanceRecord | undefined {
  const records = getAttendanceRecords();
  return records.find((rec) => rec.studentId === studentId && rec.date === date);
}

export function markAttendance(student: Student): { record: AttendanceRecord; alreadyMarked: boolean } {
  const today = getTodayDateString();
  const existing = isStudentMarkedToday(student.id, today);
  if (existing) {
    return { record: existing, alreadyMarked: true };
  }

  const newRecord: AttendanceRecord = {
    id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    studentId: student.id,
    rollNo: student.rollNo,
    name: student.name,
    className: student.className,
    course: student.course,
    date: today,
    time: getCurrentTimeString(),
    status: 'Present',
    photo: student.photo,
    isDemo: false,
  };

  const records = getAttendanceRecords();
  records.unshift(newRecord);
  try {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to persist attendance record:', err);
  }

  return { record: newRecord, alreadyMarked: false };
}

// ----------------- DEMO DATA -----------------
// Kept in a strictly separate localStorage key so it never pollutes real records or dashboard statistics.

export function getDemoRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEMO_ATTENDANCE);
    if (!raw) return [];
    return JSON.parse(raw) as AttendanceRecord[];
  } catch (err) {
    return [];
  }
}

export function generateSampleDemoData(): AttendanceRecord[] {
  const today = getTodayDateString();
  const demoData: AttendanceRecord[] = [
    {
      id: 'demo_1',
      studentId: 'demo_s1',
      rollNo: 'CS-2024-001',
      name: 'Aarav Sharma',
      className: 'Year 4 - Sec A',
      course: 'Computer Science & Engineering',
      date: today,
      time: '08:45:12 AM',
      status: 'Present',
      isDemo: true,
    },
    {
      id: 'demo_2',
      studentId: 'demo_s2',
      rollNo: 'CS-2024-042',
      name: 'Priya Patel',
      className: 'Year 4 - Sec A',
      course: 'Computer Science & Engineering',
      date: today,
      time: '08:52:30 AM',
      status: 'Present',
      isDemo: true,
    },
    {
      id: 'demo_3',
      studentId: 'demo_s3',
      rollNo: 'IT-2024-015',
      name: 'Marcus Chen',
      className: 'Year 3 - Sec B',
      course: 'Information Technology',
      date: today,
      time: '09:05:44 AM',
      status: 'Present',
      isDemo: true,
    },
    {
      id: 'demo_4',
      studentId: 'demo_s4',
      rollNo: 'AI-2024-088',
      name: 'Sophia Rodriguez',
      className: 'Year 2 - Sec C',
      course: 'Artificial Intelligence & ML',
      date: today,
      time: '09:14:19 AM',
      status: 'Present',
      isDemo: true,
    },
    {
      id: 'demo_5',
      studentId: 'demo_s5',
      rollNo: 'DS-2024-033',
      name: 'Liam O\'Connor',
      className: 'Year 3 - Sec A',
      course: 'Data Science & Analytics',
      date: today,
      time: '09:22:05 AM',
      status: 'Present',
      isDemo: true,
    },
  ];

  localStorage.setItem(STORAGE_KEYS.DEMO_ATTENDANCE, JSON.stringify(demoData));
  return demoData;
}

export function clearDemoRecords(): void {
  localStorage.removeItem(STORAGE_KEYS.DEMO_ATTENDANCE);
}

// ----------------- CSV EXPORT -----------------

export function exportAttendanceToCSV(records: AttendanceRecord[], filename?: string): void {
  // CSV Header
  const headers = ['Roll Number', 'Student Name', 'Class', 'Course', 'Date', 'Time', 'Attendance Status'];

  // RFC 4180 Escaping helper
  const escapeCell = (val: string | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const rows = records.map((r) => [
    escapeCell(r.rollNo),
    escapeCell(r.name),
    escapeCell(r.className || '-'),
    escapeCell(r.course || '-'),
    escapeCell(r.date),
    escapeCell(r.time),
    escapeCell(r.status),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const todayStr = getTodayDateString();
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `attendance_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
