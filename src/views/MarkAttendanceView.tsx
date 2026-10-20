import React, { useState, useRef } from 'react';
import { 
  Camera, 
  CameraOff, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2, 
  UserPlus,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { Student, RecognitionResult } from '../types';
import { faceApiService } from '../services/faceApiService';
import { markAttendance, getCurrentTimeString } from '../services/storageService';
import { useWebcam } from '../hooks/useWebcam';
import { CameraErrorMessage } from '../components/CameraErrorMessage';

interface MarkAttendanceViewProps {
  students: Student[];
  onAttendanceMarked: () => void;
  onNavigateToRegister: () => void;
}

export const MarkAttendanceView: React.FC<MarkAttendanceViewProps> = ({
  students,
  onAttendanceMarked,
  onNavigateToRegister,
}) => {
  // Scanning state
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Uploaded photo fallback state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Recognition outcome state
  const [result, setResult] = useState<RecognitionResult | null>(null);

  // Canvas ref for overlay bounding box
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);

  // File input refs for fallbacks
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
    handleVideoMetadataLoaded,
    handleVideoPlaying,
    isMobile,
    inIframe,
  } = useWebcam();

  // Run face recognition on video or image element
  const processFaceRecognition = async (element: HTMLVideoElement | HTMLImageElement) => {
    // 1. Check if database has any registered students
    if (students.length === 0) {
      setResult({
        status: 'empty-database',
        message: 'No students registered yet. Please register students first.',
        timestamp: Date.now(),
      });
      return;
    }

    setIsScanning(true);

    try {
      // 2. Detect face in element
      const detection = await faceApiService.detectFaceForRecognition(element);

      if (!detection) {
        if (canvasRef.current) {
          faceApiService.clearCanvas(canvasRef.current);
        }
        setResult({
          status: 'no-face',
          message: 'No face detected. Please ensure the face is visible and well-lit.',
          timestamp: Date.now(),
        });
        return;
      }

      // 3. Match against registered descriptors with threshold 0.5
      const faceMatcher = faceApiService.createFaceMatcher(students, 0.5);
      if (!faceMatcher) {
        setResult({
          status: 'empty-database',
          message: 'No valid facial descriptors found in student roster.',
          timestamp: Date.now(),
        });
        return;
      }

      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

      if (bestMatch.label === 'unknown') {
        if (canvasRef.current) {
          faceApiService.drawRecognitionBox(
            canvasRef.current,
            element,
            detection,
            undefined,
            undefined,
            'unrecognized'
          );
        }

        setResult({
          status: 'not-recognized',
          distance: bestMatch.distance,
          message: 'Face not recognized.',
          timestamp: Date.now(),
        });
        return;
      }

      // 4. Matched!
      const matchedStudent = students.find((s) => s.id === bestMatch.label);
      if (!matchedStudent) {
        setResult({
          status: 'not-recognized',
          message: 'Student profile not found.',
          timestamp: Date.now(),
        });
        return;
      }

      // Draw bounding box on canvas overlay
      if (canvasRef.current) {
        faceApiService.drawRecognitionBox(
          canvasRef.current,
          element,
          detection,
          matchedStudent.name,
          matchedStudent.rollNo,
          'recognized'
        );
      }

      // 5. Save attendance record
      const { record, alreadyMarked } = markAttendance(matchedStudent);

      if (alreadyMarked) {
        setResult({
          status: 'already-marked',
          student: matchedStudent,
          distance: bestMatch.distance,
          message: `Already marked today at ${record.time}`,
          timestamp: Date.now(),
        });
      } else {
        setResult({
          status: 'success',
          student: matchedStudent,
          distance: bestMatch.distance,
          message: `Attendance marked Present for ${matchedStudent.name}.`,
          timestamp: Date.now(),
        });
        onAttendanceMarked();
      }
    } catch (err: any) {
      console.error('Face recognition error:', err);
      setResult({
        status: 'error',
        message: err.message || 'Face analysis failed.',
        timestamp: Date.now(),
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Mark Attendance button clicked for live camera
  const handleMarkAttendanceFromCamera = () => {
    if (!videoRef.current || !isCameraReady) {
      setResult({
        status: 'error',
        message: 'Camera stream is not ready yet.',
        timestamp: Date.now(),
      });
      return;
    }
    processFaceRecognition(videoRef.current);
  };

  // Handle uploaded or captured image file for attendance
  const handlePhotoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setResult({
        status: 'error',
        message: 'Please upload a valid image file (JPEG or PNG).',
        timestamp: Date.now(),
      });
      return;
    }

    stopCamera();
    if (canvasRef.current) faceApiService.clearCanvas(canvasRef.current);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoUrl(dataUrl);

      // Load image and run recognition
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;
      img.onload = () => {
        processFaceRecognition(img);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Clear photo preview
  const handleClearPhoto = () => {
    setPhotoUrl(null);
    setResult(null);
    if (canvasRef.current) faceApiService.clearCanvas(canvasRef.current);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Mark Attendance
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Scan face with camera or upload a photo to identify student and record attendance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Camera Preview Box & Controls */}
        <div className="md:col-span-7 space-y-4">
          <div className="bg-white border border-gray-200 rounded-md p-5 shadow-xs space-y-4">
            
            {/* Viewport Box Header with Camera Switcher */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Camera Feed
              </span>

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

            {/* Viewport Box - Video is ALWAYS rendered */}
            <div className="relative aspect-4/3 rounded-md bg-gray-900 border border-gray-300 overflow-hidden flex items-center justify-center">
              {/* The video element is ALWAYS mounted, with autoPlay, playsInline, muted, and object-cover */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={handleVideoMetadataLoaded}
                onPlaying={handleVideoPlaying}
                style={{ transform: 'scaleX(-1)' }}
                className={`w-full h-full object-cover ${
                  isCameraActive && !photoUrl ? 'block' : 'hidden'
                }`}
              />

              {/* Starting camera spinner */}
              {isCameraActive && !isCameraReady && !photoUrl && (
                <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center text-white text-xs gap-2 z-10">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  <span>Starting camera...</span>
                </div>
              )}

              {/* Live indicator */}
              {isCameraActive && isCameraReady && !photoUrl && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded z-20">
                  Live Camera
                </div>
              )}

              {/* Uploaded / Captured photo preview */}
              {photoUrl && (
                <div className="relative w-full h-full bg-black z-10">
                  <img
                    ref={photoImgRef}
                    src={photoUrl}
                    alt="Photo for attendance"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded z-20">
                    Uploaded Photo
                  </div>
                </div>
              )}

              {/* Recognition Bounding Box Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
              />

              {/* Camera Stopped Placeholder */}
              {!isCameraActive && !photoUrl && (
                <div className="p-6 text-center space-y-2 text-white">
                  <Camera className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-sm font-semibold text-gray-300">Camera is off</p>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    Click Start Camera or Upload Photo to mark student attendance.
                  </p>
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

            {/* Iframe notice */}
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

            {/* Action Buttons Toolbar */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {isCameraActive ? (
                  <>
                    <button
                      onClick={stopCamera}
                      className="py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      Stop Camera
                    </button>

                    <button
                      onClick={handleMarkAttendanceFromCamera}
                      disabled={!isCameraReady || isScanning}
                      className={`flex-1 py-2 px-4 rounded-md text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        !isCameraReady || isScanning
                          ? 'bg-blue-400 opacity-70 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Checking Face...
                        </>
                      ) : !isCameraReady ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Starting camera...
                        </>
                      ) : (
                        'Mark Attendance'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setPhotoUrl(null);
                        startCamera();
                      }}
                      className="flex-1 py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Start Camera
                    </button>

                    {photoUrl && (
                      <button
                        onClick={handleClearPhoto}
                        className="py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Clear
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* 3 Fallback Buttons on Mark Attendance */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => fileUploadRef.current?.click()}
                  className="flex-1 py-1.5 px-2.5 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-gray-500" />
                  Upload Photo
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

              {/* Hidden input 1: Upload File */}
              <input
                type="file"
                ref={fileUploadRef}
                accept="image/*"
                onChange={handlePhotoFileSelected}
                className="hidden"
              />

              {/* Hidden input 2: Native capture */}
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

        {/* Right Column: Attendance Result Card */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white border border-gray-200 rounded-md p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
              Attendance Result
            </h3>

            {/* Nobody registered */}
            {students.length === 0 ? (
              <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  No Students Registered
                </div>
                <p className="text-xs text-amber-800">
                  You need to register at least one student before marking attendance.
                </p>
                <button
                  onClick={onNavigateToRegister}
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Register Student
                </button>
              </div>
            ) : !result ? (
              <div className="py-8 text-center text-gray-400 space-y-1">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">Awaiting attendance check</p>
                <p className="text-[11px] text-gray-400">
                  Start the camera and click Mark Attendance, or upload a student photo.
                </p>
              </div>
            ) : result.status === 'success' ? (
              /* MATCHED: GREEN SUCCESS STATE */
              <div className="p-4 rounded-md border border-green-300 bg-green-50 text-gray-900 space-y-3">
                <div className="flex items-start gap-3">
                  {result.student?.photo && (
                    <img
                      src={result.student.photo}
                      alt={result.student.name}
                      className="w-14 h-14 rounded-md object-cover border border-green-300 shrink-0"
                    />
                  )}
                  <div className="space-y-0.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-200 text-green-900">
                      Present
                    </span>
                    <h4 className="text-base font-bold text-gray-900 mt-1">
                      {result.student?.name}
                    </h4>
                    <p className="text-xs text-gray-700 font-medium">
                      Roll Number: {result.student?.rollNo}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-gray-600 border-t border-green-200 pt-2 space-y-1">
                  <div>Class: <span className="font-medium text-gray-800">{result.student?.className}</span></div>
                  <div>Course: <span className="font-medium text-gray-800">{result.student?.course}</span></div>
                  <div>Recorded at: <span className="font-medium text-gray-800">{getCurrentTimeString()}</span></div>
                </div>
              </div>
            ) : result.status === 'already-marked' ? (
              /* ALREADY MARKED TODAY WARNING */
              <div className="p-4 rounded-md border border-amber-300 bg-amber-50 text-gray-900 space-y-3">
                <div className="flex items-start gap-3">
                  {result.student?.photo && (
                    <img
                      src={result.student.photo}
                      alt={result.student.name}
                      className="w-14 h-14 rounded-md object-cover border border-amber-300 shrink-0"
                    />
                  )}
                  <div className="space-y-0.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">
                      Already Marked Today
                    </span>
                    <h4 className="text-base font-bold text-gray-900 mt-1">
                      {result.student?.name}
                    </h4>
                    <p className="text-xs text-gray-700 font-medium">
                      Roll Number: {result.student?.rollNo}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-amber-800 border-t border-amber-200 pt-2">
                  <p>{result.message}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Students can only be marked present once per day.
                  </p>
                </div>
              </div>
            ) : result.status === 'not-recognized' ? (
              /* RED NOT RECOGNIZED STATE */
              <div className="p-4 rounded-md border border-red-300 bg-red-50 text-gray-900 space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Face not recognized</span>
                </div>
                <p className="text-xs text-red-800">
                  No matching student was found for this face with distance threshold 0.5.
                </p>
                <p className="text-[11px] text-gray-600 bg-white/70 p-2 rounded border border-red-100">
                  Make sure the student is enrolled in Register Student and faces the camera in good lighting.
                </p>
              </div>
            ) : (
              /* NO FACE OR OTHER NOTICE */
              <div className="p-4 rounded-md border border-gray-200 bg-gray-50 text-gray-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  <span>Notice</span>
                </div>
                <p className="text-gray-600">{result.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
