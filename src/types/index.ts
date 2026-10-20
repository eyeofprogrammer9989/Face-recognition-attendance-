export interface Student {
  id: string;
  name: string;
  rollNo: string;
  className: string;
  course: string;
  photo: string; // base64 data URL
  descriptor: number[]; // 128-d float array serialized as number[]
  registeredAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  rollNo: string;
  name: string;
  className?: string;
  course?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss or 12h format
  status: 'Present';
  photo?: string;
  isDemo?: boolean;
}

export type ActiveTab = 'dashboard' | 'register' | 'attendance' | 'report';

export interface RecognitionResult {
  status: 'success' | 'already-marked' | 'not-recognized' | 'no-face' | 'empty-database' | 'error';
  student?: Student;
  distance?: number;
  message: string;
  timestamp: number;
}

export interface ModelLoadingState {
  isLoaded: boolean;
  isLoading: boolean;
  progressMessage: string;
  error: string | null;
}
