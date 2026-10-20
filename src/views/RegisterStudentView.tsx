import React, { useState, useRef } from 'react';
import { 
  Camera, 
  CameraOff, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Search, 
  Upload, 
  Loader2,
  Users,
  ExternalLink
} from 'lucide-react';
import { Student } from '../types';
import { faceApiService } from '../services/faceApiService';
import { saveStudent, deleteStudent } from '../services/storageService';
import { useWebcam } from '../hooks/useWebcam';
import { CameraErrorMessage } from '../components/CameraErrorMessage';

interface RegisterStudentViewProps {
  students: Student[];
  onStudentsChange: () => void;
}

export const RegisterStudentView: React.FC<RegisterStudentViewProps> = ({
  students,
  onStudentsChange,
}) => {
  // Form fields
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [className, setClassName] = useState('');
  const [course, setCourse] = useState('');

  // Photo preview
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Form processing feedback
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Student search & delete
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fallback file input refs
  const fileUploadRef = useRef<HTMLInputElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);

  // Shared Webcam hook
  const {
    isCameraActive,
    isCameraReady,
    cameraError,
    devices,
    selectedDeviceId,
    videoRef,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
    handleVideoMetadataLoaded,
    handleVideoPlaying,
    isMobile,
    inIframe,
  } = useWebcam();

  // Capture frame from live video
  const handleTakePhoto = () => {
    const dataUrl = captureFrame();
    if (!dataUrl) {
      setFormError('Camera video feed is not ready. Please wait a moment.');
      return;
    }

    setCapturedPhoto(dataUrl);
    setFormError(null);
    stopCamera();
  };

  // Retake photo
  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setFormError(null);
    startCamera();
  };

  // Handle uploaded file or capture fallback
  const handlePhotoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPEG or PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedPhoto(dataUrl);
      setFormError(null);
      stopCamera();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Register student form submission
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Validate fields
    if (!name.trim()) {
      setFormError('Student Name is required.');
      return;
    }
    if (!rollNo.trim()) {
      setFormError('Roll Number is required.');
      return;
    }
    if (!className.trim()) {
      setFormError('Class is required (e.g. Year 3 - Sec A).');
      return;
    }
    if (!course.trim()) {
      setFormError('Course is required (e.g. Computer Science).');
      return;
    }
    if (!capturedPhoto) {
      setFormError('Please take a photo with the camera or upload an image file.');
      return;
    }

    // Roll number uniqueness
    const normalizedRoll = rollNo.trim().toUpperCase();
    const existing = students.find((s) => s.rollNo.trim().toUpperCase() === normalizedRoll);
    if (existing) {
      setFormError(`Roll Number "${rollNo.trim()}" is already registered to ${existing.name}.`);
      return;
    }

    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = capturedPhoto;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for face detection.'));
      });

      // Face detection & 128-d descriptor extraction
      const { descriptor, error: detectionError } = await faceApiService.extractRegistrationDescriptor(img);

      if (detectionError || !descriptor) {
        setFormError(detectionError || 'Face detection failed. Please provide a clear frontal photo.');
        setIsProcessing(false);
        return;
      }

      // Save student
      const newStudent: Student = {
        id: 'std_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: name.trim(),
        rollNo: rollNo.trim(),
        className: className.trim(),
        course: course.trim(),
        photo: capturedPhoto,
        descriptor: descriptor,
        registeredAt: new Date().toISOString(),
      };

      const result = saveStudent(newStudent);
      if (!result.success) {
        setFormError(result.error || 'Failed to save student.');
        setIsProcessing(false);
        return;
      }

      setFormSuccess(`Student "${newStudent.name}" (Roll Number: ${newStudent.rollNo}) registered successfully.`);
      
      // Clear form
      setName('');
      setRollNo('');
      setClassName('');
      setCourse('');
      setCapturedPhoto(null);
      stopCamera();
      onStudentsChange();
    } catch (err: any) {
      console.error('Registration error:', err);
      setFormError(err.message || 'An error occurred while registering the student.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete student
  const handleDeleteStudent = (studentId: string) => {
    deleteStudent(studentId);
    setDeleteConfirmId(null);
    onStudentsChange();
  };

  // Filter student list
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      s.course.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Register Student
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Enroll student details and facial photo into the system
        </p>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white border border-gray-200 rounded-md p-6 shadow-xs">
        {/* Error message */}
        {formError && (
          <div className="mb-5 p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Registration Error</p>
              <p className="mt-0.5 text-xs text-red-800">{formError}</p>
            </div>
          </div>
        )}

        {/* Success message */}
        {formSuccess && (
          <div className="mb-5 p-4 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Success</p>
              <p className="mt-0.5 text-xs text-green-800">{formSuccess}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleRegisterStudent} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Left: Student Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">
                Student Information
              </h3>

              {/* Student Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Roll Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-2024-001"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
                <p className="text-[11px] text-gray-500 mt-1">Must be unique across all students</p>
              </div>

              {/* Class */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Class / Section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Year 3 - Sec A"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              {/* Course */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Course / Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Right: Student Photo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Student Photo
                </h3>

                {/* Multiple Camera Device Switcher */}
                {devices.length > 1 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-gray-500">Camera:</span>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => switchCamera(e.target.value)}
                      className="px-2 py-0.5 rounded border border-gray-300 bg-white text-gray-700 text-xs outline-none"
                    >
                      {devices.map((device, index) => (
                        <option key={device.deviceId || index} value={device.deviceId}>
                          {device.label || `Camera ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Photo Viewport - ALWAYS renders video element */}
              <div className="relative aspect-4/3 rounded-md bg-gray-900 border border-gray-300 overflow-hidden flex items-center justify-center">
                {/* Video is ALWAYS rendered in DOM, never conditionally unmounted! */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={handleVideoMetadataLoaded}
                  onPlaying={handleVideoPlaying}
                  style={{ transform: 'scaleX(-1)' }}
                  className={`w-full h-full object-cover ${
                    isCameraActive && !capturedPhoto ? 'block' : 'hidden'
                  }`}
                />

                {/* Starting camera spinner */}
                {isCameraActive && !isCameraReady && !capturedPhoto && (
                  <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center text-white text-xs gap-2 z-10">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <span>Starting camera...</span>
                  </div>
                )}

                {/* Live Camera Tag */}
                {isCameraActive && isCameraReady && !capturedPhoto && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded z-10">
                    Live Camera
                  </div>
                )}

                {/* Captured Photo Preview Overlay */}
                {capturedPhoto && (
                  <div className="relative w-full h-full bg-black z-20">
                    <img
                      src={capturedPhoto}
                      alt="Student Photo Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Photo Captured
                    </div>
                  </div>
                )}

                {/* Inactive State Overlay */}
                {!isCameraActive && !capturedPhoto && (
                  <div className="p-4 text-center space-y-2 text-white">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-xs text-gray-300 font-medium">Camera is off</p>
                    <p className="text-xs text-gray-400">Click Start Camera to take a photo, or choose an image file.</p>
                  </div>
                )}
              </div>

              {/* Exact Camera Error Box */}
              {cameraError && (
                <CameraErrorMessage
                  error={cameraError}
                  onRetry={() => startCamera()}
                />
              )}

              {/* Iframe preview helper notice if in iframe */}
              {inIframe && !cameraError && (
                <div className="p-2 rounded bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
                  <span>The camera may be blocked in this preview.</span>
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    Open in new tab <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Photo Controls */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {capturedPhoto ? (
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      className="flex-1 py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retake Photo
                    </button>
                  ) : isCameraActive ? (
                    <>
                      <button
                        type="button"
                        onClick={handleTakePhoto}
                        disabled={!isCameraReady}
                        className={`flex-1 py-2 px-3 rounded-md text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          !isCameraReady
                            ? 'bg-blue-400 opacity-70 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {!isCameraReady ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Starting camera...
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5" />
                            Take Photo
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="py-2 px-3 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <CameraOff className="w-3.5 h-3.5" />
                        Stop Camera
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="flex-1 py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Start Camera
                    </button>
                  )}
                </div>

                {/* 3 Fallback Buttons (Upload File & Capture photo) */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => fileUploadRef.current?.click()}
                    className="flex-1 py-1.5 px-2.5 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-gray-500" />
                    Upload File
                  </button>

                  <button
                    type="button"
                    onClick={() => captureInputRef.current?.click()}
                    className="flex-1 py-1.5 px-2.5 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-gray-500" />
                    {isMobile ? 'Take Photo with Camera' : 'Choose Photo'}
                  </button>
                </div>

                {/* Hidden input 1: Standard File Upload */}
                <input
                  type="file"
                  ref={fileUploadRef}
                  accept="image/*"
                  onChange={handlePhotoFileSelected}
                  className="hidden"
                />

                {/* Hidden input 2: Native Camera Capture on mobile / file picker on desktop */}
                <input
                  type="file"
                  ref={captureInputRef}
                  accept="image/*"
                  capture="user"
                  onChange={handlePhotoFileSelected}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end">
            <button
              type="submit"
              disabled={isProcessing}
              className={`px-5 py-2.5 rounded-md font-semibold text-sm text-white transition cursor-pointer ${
                isProcessing
                  ? 'bg-blue-400 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-xs'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Detecting Face &amp; Saving...
                </span>
              ) : (
                'Register Student'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Registered Students Table */}
      <div className="bg-white border border-gray-200 rounded-md shadow-xs">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Registered Students</h3>
            <p className="text-xs text-gray-500 mt-0.5">Total: {students.length} students</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-white border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {students.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-gray-700">No students registered yet</p>
            <p className="text-xs text-gray-500 mt-0.5">Use the form above to add students.</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            No students found matching "{searchQuery}".
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
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={student.photo}
                          alt={student.name}
                          className="w-7 h-7 rounded-full object-cover border border-gray-200"
                        />
                        <span className="font-medium text-gray-900">{student.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-gray-700">{student.rollNo}</td>
                    <td className="py-2.5 px-4 text-gray-600">{student.className}</td>
                    <td className="py-2.5 px-4 text-gray-600">{student.course}</td>
                    <td className="py-2.5 px-4 text-right">
                      {deleteConfirmId === student.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-xs text-red-600 font-medium">Delete?</span>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(student.id)}
                          title="Delete student"
                          className="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
