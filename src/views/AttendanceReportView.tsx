import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Calendar, 
  AlertTriangle, 
  Trash2, 
  PlusCircle, 
  Clock 
} from 'lucide-react';
import { AttendanceRecord } from '../types';
import { 
  getTodayDateString, 
  exportAttendanceToCSV, 
  generateSampleDemoData, 
  clearDemoRecords, 
  getDemoRecords 
} from '../services/storageService';

interface AttendanceReportViewProps {
  realRecords: AttendanceRecord[];
  onRecordsChange: () => void;
}

export const AttendanceReportView: React.FC<AttendanceReportViewProps> = ({
  realRecords,
  onRecordsChange,
}) => {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('all'); // 'all' | 'today' | 'custom'
  const [customDate, setCustomDate] = useState<string>('');

  // Demo records state (isolated strictly)
  const [demoRecords, setDemoRecords] = useState<AttendanceRecord[]>(() => getDemoRecords());

  const hasRealRecords = realRecords.length > 0;
  const isDemoActive = !hasRealRecords && demoRecords.length > 0;

  // Records to display
  const activeRecordsPool: AttendanceRecord[] = hasRealRecords ? realRecords : isDemoActive ? demoRecords : [];

  const todayStr = getTodayDateString();

  // Apply filters
  const filteredRecords = activeRecordsPool.filter((rec) => {
    // 1. Search filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchName = rec.name.toLowerCase().includes(q);
      const matchRoll = rec.rollNo.toLowerCase().includes(q);
      if (!matchName && !matchRoll) return false;
    }

    // 2. Date filter
    if (selectedDate === 'today') {
      return rec.date === todayStr;
    } else if (selectedDate === 'custom' && customDate) {
      return rec.date === customDate;
    }

    return true;
  });

  // Handle Demo Data
  const handleAddDemoData = () => {
    const demos = generateSampleDemoData();
    setDemoRecords(demos);
  };

  const handleRemoveDemoData = () => {
    clearDemoRecords();
    setDemoRecords([]);
  };

  // CSV Export handler
  const handleDownloadCSV = () => {
    const filename = `attendance_${selectedDate === 'today' ? todayStr : selectedDate === 'custom' && customDate ? customDate : todayStr}.csv`;
    exportAttendanceToCSV(filteredRecords, filename);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Attendance Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View attendance logs, filter by date or student, and download CSV
          </p>
        </div>

        {/* Download CSV button */}
        <button
          onClick={handleDownloadCSV}
          disabled={filteredRecords.length === 0}
          className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
            filteredRecords.length === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
          }`}
        >
          <Download className="w-4 h-4" />
          Download CSV
        </button>
      </div>

      {/* DEMO DATA CLEAR YELLOW BANNER */}
      {isDemoActive && (
        <div className="p-4 rounded-md border border-amber-300 bg-amber-50 text-gray-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-yellow-400 text-gray-900 font-bold text-xs uppercase tracking-wide">
                  DEMO DATA
                </span>
                <span className="font-semibold text-gray-900 text-sm">Showing Sample Demonstration Records</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                These demo rows are never mixed into real attendance logs or dashboard counts.
              </p>
            </div>
          </div>

          <button
            onClick={handleRemoveDemoData}
            className="px-3 py-1.5 rounded-md bg-white border border-amber-300 hover:bg-amber-100 text-gray-800 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-600" /> Remove Demo Data
          </button>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="bg-white border border-gray-200 rounded-md p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search by Name or Roll Number */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Date Filters */}
          <div className="md:col-span-6 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSelectedDate('all');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                selectedDate === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              All Dates
            </button>

            <button
              onClick={() => {
                setSelectedDate('today');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                selectedDate === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              Today
            </button>

            {/* Custom Date Input */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-md px-2.5 py-1 text-xs text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setSelectedDate('custom');
                }}
                className="bg-transparent text-gray-800 text-xs outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <div>
            Showing <strong className="text-gray-900">{filteredRecords.length}</strong> records
            {selectedDate === 'today' && ` for today (${todayStr})`}
            {selectedDate === 'custom' && customDate && ` for ${customDate}`}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>

          {(searchQuery || selectedDate !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDate('all');
                setCustomDate('');
              }}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-gray-200 rounded-md shadow-xs overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <FileSpreadsheet className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-800">No Attendance Records Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {activeRecordsPool.length === 0
                ? 'No attendance records are saved in the system yet.'
                : 'No attendance records match your filter criteria.'}
            </p>

            {/* Empty state "Add demo data" toggle */}
            {!hasRealRecords && !isDemoActive && (
              <div className="pt-2">
                <button
                  onClick={handleAddDemoData}
                  className="px-4 py-2 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-amber-600" />
                  Add Demo Data
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Roll Number</th>
                  <th className="py-2.5 px-4">Student Name</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4 text-right">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className={`hover:bg-gray-50 ${record.isDemo ? 'bg-amber-50/40' : ''}`}
                  >
                    <td className="py-2.5 px-4 font-semibold text-gray-900">
                      {record.rollNo}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        {record.photo ? (
                          <img
                            src={record.photo}
                            alt={record.name}
                            className="w-7 h-7 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {record.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{record.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">
                      {record.date}
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">
                      {record.time}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {record.isDemo && (
                          <span className="px-1.5 py-0.5 rounded bg-yellow-300 text-gray-900 font-bold text-[10px] uppercase">
                            DEMO DATA
                          </span>
                        )}
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          {record.status}
                        </span>
                      </div>
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
