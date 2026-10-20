import { useState, useRef, useEffect, useCallback } from 'react';

export interface CameraErrorState {
  name: string;
  message: string;
  userMessage: string;
  isSecureContextError?: boolean;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isTouch = navigator.maxTouchPoints > 1 && window.innerWidth < 1024;
  return mobileRegex.test(ua) || isTouch;
}

export function isInsideIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export function useWebcam() {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<CameraErrorState | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef(false);

  // Stop all active media tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setIsCameraReady(false);
    isStartingRef.current = false;
  }, []);

  // Update list of camera devices
  const updateCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      // If selected device not in list, pick the first
      if (videoInputs.length > 0 && !videoInputs.some((d) => d.deviceId === selectedDeviceId)) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('enumerateDevices error:', err);
    }
  }, [selectedDeviceId]);

  // Start Camera
  const startCamera = useCallback(
    async (targetDeviceId?: string) => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;
      setCameraError(null);
      setIsCameraReady(false);

      // 1. Check secure context
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setCameraError({
          name: 'SecurityError',
          message: 'Page is not loaded over HTTPS or localhost',
          userMessage: 'The camera needs HTTPS or localhost.',
          isSecureContextError: true,
        });
        isStartingRef.current = false;
        return;
      }

      // 2. Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError({
          name: 'NotSupportedError',
          message: 'navigator.mediaDevices.getUserMedia is not supported',
          userMessage: 'No camera support detected in this browser.',
        });
        isStartingRef.current = false;
        return;
      }

      // Stop any existing stream
      stopCamera();
      setIsCameraActive(true);

      const deviceToUse = targetDeviceId || selectedDeviceId;
      const mobile = isMobileDevice();

      // Build video constraints
      let constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(deviceToUse
            ? { deviceId: { exact: deviceToUse } }
            : mobile
            ? { facingMode: 'user' }
            : {}),
        },
        audio: false,
      };

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        console.warn('First getUserMedia attempt failed:', firstErr?.name, firstErr?.message);
        
        // If it fails with OverconstrainedError or NotFoundError, retry with { video: true, audio: false }
        if (
          firstErr?.name === 'OverconstrainedError' ||
          firstErr?.name === 'NotFoundError' ||
          firstErr?.name === 'ConstraintNotSatisfiedError'
        ) {
          try {
            console.info('Retrying with { video: true, audio: false } fallback...');
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch (retryErr: any) {
            handleCameraError(retryErr);
            isStartingRef.current = false;
            setIsCameraActive(false);
            return;
          }
        } else {
          handleCameraError(firstErr);
          isStartingRef.current = false;
          setIsCameraActive(false);
          return;
        }
      }

      if (!stream) {
        setIsCameraActive(false);
        isStartingRef.current = false;
        return;
      }

      streamRef.current = stream;

      // Update available devices now that permission is granted
      updateCameraDevices();

      // Attach stream to video element
      const video = videoRef.current;
      if (!video) {
        console.warn('video element ref is null');
        isStartingRef.current = false;
        return;
      }

      try {
        video.srcObject = stream;
        await video.play();

        // Check if dimensions are already available
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setIsCameraReady(true);
        }
      } catch (playErr) {
        console.warn('video.play() warning:', playErr);
      } finally {
        isStartingRef.current = false;
      }
    },
    [selectedDeviceId, stopCamera, updateCameraDevices]
  );

  // Helper for error messages
  const handleCameraError = (err: any) => {
    console.error('Camera access failed:', err);
    const name = err?.name || 'Error';
    const message = err?.message || 'Failed to access camera';
    let userMessage = 'Failed to access camera. Please check your browser settings.';

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || message.includes('denied') || message.includes('dismissed')) {
      userMessage = 'Camera is blocked. Click the camera icon in the address bar, set it to Allow, then press Try Again.';
    } else if (name === 'NotReadableError' || name === 'TrackStartError' || message.includes('in use')) {
      userMessage = 'Another app or tab is using the camera. Close it and press Try Again.';
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || message.includes('not found')) {
      userMessage = 'No camera detected.';
    }

    setCameraError({
      name,
      message,
      userMessage,
    });
  };

  // Listeners for loadedmetadata & playing to mark ready
  const handleVideoMetadataLoaded = () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      setIsCameraReady(true);
    }
  };

  const handleVideoPlaying = () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      setIsCameraReady(true);
    }
  };

  // Switch camera device
  const switchCamera = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isCameraActive) {
      startCamera(deviceId);
    }
  };

  // Capture unmirrored frame onto a canvas at video.videoWidth x video.videoHeight
  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video || !isCameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw unmirrored frame directly from video buffer
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  // Teardown tracks on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
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
    isMobile: isMobileDevice(),
    inIframe: isInsideIframe(),
  };
}
