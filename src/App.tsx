import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu, 
  X, 
  Camera 
} from 'lucide-react';
import { ActiveTab, Student, AttendanceRecord, ModelLoadingState } from './types';
import { Navigation } from './components/Navigation';
import { ModelLoadingOverlay } from './components/ModelLoadingOverlay';
import { DashboardView } from './views/DashboardView';
import { RegisterStudentView } from './views/RegisterStudentView';
import { MarkAttendanceView } from './views/MarkAttendanceView';
import { AttendanceReportView } from './views/AttendanceReportView';
import { faceApiService } from './services/faceApiService';
import { getStudents, getAttendanceRecords } from './services/storageService';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Model loading state
  const [modelState, setModelState] = useState<ModelLoadingState>({
    isLoaded: false,
    isLoading: true,
    progressMessage: 'Connecting to face recognition models...',
    error: null,
  });

  // Students and Attendance records from localStorage
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => getAttendanceRecords());

  // Refresh data from storage
  const reloadData = useCallback(() => {
    setStudents(getStudents());
    setAttendanceRecords(getAttendanceRecords());
  }, []);

  // Initialize face-api models on app mount
  const initModels = useCallback(async () => {
    setModelState({
      isLoaded: false,
      isLoading: true,
      progressMessage: 'Connecting to models on public CDN...',
      error: null,
    });

    try {
      await faceApiService.loadModels((msg) => {
        setModelState((prev) => ({ ...prev, progressMessage: msg }));
      });
      setModelState({
        isLoaded: true,
        isLoading: false,
        progressMessage: 'Face models ready',
        error: null,
      });
    } catch (err: any) {
      console.error('Model loading error:', err);
      setModelState({
        isLoaded: false,
        isLoading: false,
        progressMessage: 'Failed to load face models',
        error: err.message || 'Could not load face recognition models from CDN.',
      });
    }
  }, []);

  useEffect(() => {
    initModels();
  }, [initModels]);

  // Sync state with storage on tab change
  useEffect(() => {
    reloadData();
  }, [activeTab, reloadData]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col md:flex-row antialiased">
      {/* Model Loading Modal */}
      <ModelLoadingOverlay
        isLoading={modelState.isLoading}
        message={modelState.progressMessage}
        error={modelState.error}
        onRetry={initModels}
      />

      {/* Mobile Top Header Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <span className="font-bold text-gray-900 text-base">Face Attendance</span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 p-2 z-30 space-y-1 shadow-sm">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2 rounded-md text-sm font-medium ${
              activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2 rounded-md text-sm font-medium ${
              activeTab === 'register' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Register Student ({students.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('attendance');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2 rounded-md text-sm font-medium ${
              activeTab === 'attendance' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => {
              setActiveTab('report');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2 rounded-md text-sm font-medium ${
              activeTab === 'report' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Attendance Report
          </button>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <div className="hidden md:flex">
        <Navigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          modelsLoaded={modelState.isLoaded}
          totalStudents={students.length}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              students={students}
              attendanceRecords={attendanceRecords}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'register' && (
            <RegisterStudentView
              students={students}
              onStudentsChange={reloadData}
            />
          )}

          {activeTab === 'attendance' && (
            <MarkAttendanceView
              students={students}
              onAttendanceMarked={reloadData}
              onNavigateToRegister={() => setActiveTab('register')}
            />
          )}

          {activeTab === 'report' && (
            <AttendanceReportView
              realRecords={attendanceRecords}
              onRecordsChange={reloadData}
            />
          )}
        </main>

        {/* Global Footer (With required local storage note) */}
        <footer className="p-4 border-t border-gray-200 bg-white text-center text-xs text-gray-500">
          Data is stored locally in this browser.
        </footer>
      </div>
    </div>
  );
}
