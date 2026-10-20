import React from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  Camera, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { ActiveTab } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  modelsLoaded: boolean;
  totalStudents: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  modelsLoaded,
  totalStudents,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'register' as ActiveTab,
      label: 'Register Student',
      icon: UserPlus,
      count: totalStudents,
    },
    {
      id: 'attendance' as ActiveTab,
      label: 'Mark Attendance',
      icon: Camera,
    },
    {
      id: 'report' as ActiveTab,
      label: 'Attendance Report',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-full">
      {/* Brand Header */}
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">
          Face Attendance
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">College Administration</p>

        {/* Model status indicator - plain and clean */}
        <div className="mt-3 py-1.5 px-2.5 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${modelsLoaded ? 'bg-green-500' : 'bg-amber-500'}`} />
            {modelsLoaded ? 'Face models ready' : 'Loading models...'}
          </span>
          {modelsLoaded ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-100 text-blue-800 font-semibold' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        Campus Admin Portal
      </div>
    </aside>
  );
};
