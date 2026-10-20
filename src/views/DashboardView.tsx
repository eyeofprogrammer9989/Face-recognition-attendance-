import React from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  CalendarCheck, 
  UserPlus, 
  Camera, 
  ArrowRight,
  Clock
} from 'lucide-react';
import { ActiveTab, Student, AttendanceRecord } from '../types';
import { getTodayDateString } from '../services/storageService';

interface DashboardViewProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  setActiveTab: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  attendanceRecords,
  setActiveTab,
}) => {
  const todayStr = getTodayDateString();

  // Filter records marked today (real records only - demo records are separate)
  const todayRecords = attendanceRecords.filter((r) => r.date === todayStr && !r.isDemo);

  const uniquePresentIds = new Set(todayRecords.map((r) => r.studentId));
  const totalStudents = students.length;
  const presentCount = uniquePresentIds.size;
  const absentCount = Math.max(0, totalStudents - presentCount);
  const totalAttendanceToday = todayRecords.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title & Date Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Face Attendance System
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Student attendance overview and management
          </p>
        </div>
        <div className="text-sm text-gray-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-md shadow-xs">
          Date: <span className="font-semibold text-gray-800">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* 4 Live Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white border border-gray-200 rounded-md p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Students
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-gray-900">
            {totalStudents}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Registered students in system
          </p>
        </div>

        {/* Today's Attendance */}
        <div className="bg-white border border-gray-200 rounded-md p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Today's Attendance
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-gray-900">
            {totalAttendanceToday}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Total scan records logged today
          </p>
        </div>

        {/* Present Students */}
        <div className="bg-white border border-gray-200 rounded-md p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Present Students
            </span>
            <div className="w-8 h-8 rounded-md bg-green-50 text-green-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-green-700">
            {presentCount}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Unique students marked present
          </p>
        </div>

        {/* Absent Students */}
        <div className="bg-white border border-gray-200 rounded-md p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Absent Students
            </span>
            <div className="w-8 h-8 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-red-600">
            {absentCount}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Total ({totalStudents}) - Present ({presentCount})
          </p>
        </div>
      </div>

      {/* Two Big Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Big Button 1: Register Student */}
        <button
          onClick={() => setActiveTab('register')}
          className="text-left p-5 rounded-md bg-white border border-gray-200 hover:border-blue-500 hover:bg-blue-50/30 transition shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-md bg-blue-600 text-white flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-gray-900">
              Register Student
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Add a new student with photo from camera or file to register their face in the system.
            </p>
          </div>
        </button>

        {/* Big Button 2: Mark Attendance */}
        <button
          onClick={() => setActiveTab('attendance')}
          className="text-left p-5 rounded-md bg-white border border-gray-200 hover:border-blue-500 hover:bg-blue-50/30 transition shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-md bg-blue-600 text-white flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-gray-900">
              Mark Attendance
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Open camera or upload a photo to identify registered students and mark them present for today.
            </p>
          </div>
        </button>
      </div>

      {/* Today's Attendance Activity Table */}
      <div className="bg-white border border-gray-200 rounded-md shadow-xs">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Today's Attendance</h3>
            <p className="text-xs text-gray-500 mt-0.5">Students who checked in today ({todayRecords.length} records)</p>
          </div>
          <button
            onClick={() => setActiveTab('report')}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            View Full Report &rarr;
          </button>
        </div>

        {todayRecords.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-gray-700">No attendance marked today</p>
            <p className="text-xs text-gray-500 mt-1">
              {totalStudents === 0 
                ? 'Register students to begin taking attendance.'
                : 'Click "Mark Attendance" above to mark attendance.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Roll Number</th>
                  <th className="py-2.5 px-4">Class</th>
                  <th className="py-2.5 px-4">Course</th>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {todayRecords.slice(0, 5).map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {rec.photo ? (
                          <img
                            src={rec.photo}
                            alt={rec.name}
                            className="w-7 h-7 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {rec.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{rec.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-gray-700">{rec.rollNo}</td>
                    <td className="py-2.5 px-4 text-gray-600">{rec.className || '-'}</td>
                    <td className="py-2.5 px-4 text-gray-600">{rec.course || '-'}</td>
                    <td className="py-2.5 px-4 text-gray-600">{rec.time}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
