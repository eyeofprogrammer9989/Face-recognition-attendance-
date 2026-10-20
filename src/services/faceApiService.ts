import { Student } from '../types';

// Declare global faceapi from CDN script
declare global {
  interface Window {
    faceapi: any;
  }
}

const MODEL_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// Fallback mirror if needed
const MODEL_FALLBACK_BASE = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';

class FaceApiService {
  private modelsLoaded = false;
  private loadingPromise: Promise<boolean> | null = null;
  private currentProgressMessage = 'Initializing AI engine...';

  public isLoaded(): boolean {
    return this.modelsLoaded;
  }

  public getProgressMessage(): string {
    return this.currentProgressMessage;
  }

  // Ensure faceapi script is loaded in window
  private async ensureFaceApiScript(): Promise<any> {
    if (typeof window === 'undefined') return null;

    if (window.faceapi) {
      return window.faceapi;
    }

    // Wait up to 10 seconds if script tag is still executing
    const startTime = Date.now();
    while (!window.faceapi && Date.now() - startTime < 8000) {
      await new Promise((res) => setTimeout(res, 100));
    }

    if (window.faceapi) {
      return window.faceapi;
    }

    // If still not present, dynamically inject script tag
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
      script.async = true;
      script.onload = () => {
        if (window.faceapi) {
          resolve(window.faceapi);
        } else {
          reject(new Error('face-api.js loaded but window.faceapi is undefined.'));
        }
      };
      script.onerror = () => {
        // Fallback to unpkg or cdnjs
        const scriptFallback = document.createElement('script');
        scriptFallback.src = 'https://unpkg.com/@vladmandic/face-api/dist/face-api.js';
        scriptFallback.onload = () => resolve(window.faceapi);
        scriptFallback.onerror = () => reject(new Error('Failed to load face-api.js from CDNs'));
        document.head.appendChild(scriptFallback);
      };
      document.head.appendChild(script);
    });
  }

  // Load the 3 required models: tinyFaceDetector, faceLandmark68Net, faceRecognitionNet
  public async loadModels(onProgress?: (message: string) => void): Promise<boolean> {
    if (this.modelsLoaded) return true;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        const update = (msg: string) => {
          this.currentProgressMessage = msg;
          onProgress?.(msg);
        };

        update('Connecting to face recognition engine...');
        const faceapi = await this.ensureFaceApiScript();

        // Configure TensorFlow backend if available
        if (faceapi.tf) {
          try {
            await faceapi.tf.ready();
          } catch (e) {
            console.warn('tf.ready warning:', e);
          }
        }

        // 1. Tiny Face Detector
        update('Loading Tiny Face Detector neural network...');
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_CDN_BASE);
        } catch (cdnErr) {
          console.warn('jsDelivr failed, trying GitHub fallback for tinyFaceDetector...', cdnErr);
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_FALLBACK_BASE);
        }

        // 2. Face Landmark 68 Net
        update('Loading Face Landmark 68 Net...');
        try {
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_CDN_BASE);
        } catch (cdnErr) {
          console.warn('jsDelivr failed, trying GitHub fallback for landmark...', cdnErr);
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_FALLBACK_BASE);
        }

        // 3. Face Recognition Net
        update('Loading Face Recognition Net (128-d vector embedding)...');
        try {
          await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_CDN_BASE);
        } catch (cdnErr) {
          console.warn('jsDelivr failed, trying GitHub fallback for recognition...', cdnErr);
          await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_FALLBACK_BASE);
        }

        update('Neural networks ready!');
        this.modelsLoaded = true;
        return true;
      } catch (err: any) {
        console.error('Error loading face-api models:', err);
        this.modelsLoaded = false;
        this.loadingPromise = null;
        throw new Error(err.message || 'Could not load face-api neural network models.');
      }
    })();

    return this.loadingPromise;
  }

  // Get TinyFaceDetector options
  public getDetectorOptions(inputSize = 320, scoreThreshold = 0.5) {
    const faceapi = window.faceapi;
    if (!faceapi) throw new Error('Face-api not initialized');
    return new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
  }

  // Validate face in image for registration: ensures exactly 1 face exists and calculates 128-d descriptor
  public async extractRegistrationDescriptor(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<{
    descriptor?: number[];
    error?: string;
  }> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }
    const faceapi = window.faceapi;

    try {
      // 1. Detect all faces in photo to check for zero or multiple persons
      const options = this.getDetectorOptions(416, 0.45);
      const allDetections = await faceapi
        .detectAllFaces(imageElement, options)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!allDetections || allDetections.length === 0) {
        return {
          error: 'No face detected in photo. Please ensure good lighting and face the camera directly.',
        };
      }

      if (allDetections.length > 1) {
        return {
          error: `Multiple faces detected (${allDetections.length}). Please ensure only one student is present in the frame.`,
        };
      }

      const singleDetection = allDetections[0];
      const descriptorArray = Array.from(singleDetection.descriptor) as number[];

      return {
        descriptor: descriptorArray,
      };
    } catch (err: any) {
      console.error('Face descriptor extraction error:', err);
      return {
        error: 'Face processing failed: ' + (err.message || 'Unknown detection error'),
      };
    }
  }

  // Detect single face from video/image/canvas for attendance matching
  public async detectFaceForRecognition(element: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): Promise<any> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }
    const faceapi = window.faceapi;
    const options = this.getDetectorOptions(320, 0.4);

    return await faceapi
      .detectSingleFace(element, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  // Build FaceMatcher with registered students using standard threshold 0.5
  public createFaceMatcher(students: Student[], distanceThreshold = 0.5): any {
    const faceapi = window.faceapi;
    if (!faceapi || students.length === 0) return null;

    const labeledDescriptors: any[] = [];
    for (const student of students) {
      if (student.descriptor && student.descriptor.length === 128) {
        const floatArr = new Float32Array(student.descriptor);
        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(student.id, [floatArr]));
      }
    }

    if (labeledDescriptors.length === 0) return null;
    return new faceapi.FaceMatcher(labeledDescriptors, distanceThreshold);
  }

  // Helper to draw clean bounding box and label on canvas
  public drawRecognitionBox(
    canvas: HTMLCanvasElement,
    element: HTMLVideoElement | HTMLImageElement,
    detection: any,
    studentName?: string,
    rollNo?: string,
    status?: 'recognized' | 'unrecognized' | 'detecting'
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const naturalWidth = (element as HTMLVideoElement).videoWidth || (element as HTMLImageElement).naturalWidth || element.width;
    const naturalHeight = (element as HTMLVideoElement).videoHeight || (element as HTMLImageElement).naturalHeight || element.height;

    if (canvas.width !== naturalWidth || canvas.height !== naturalHeight) {
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detection) return;

    const box = detection.detection ? detection.detection.box : detection.box;
    if (!box) return;

    const { x, y, width, height } = box;

    const strokeColor = status === 'recognized' ? '#16a34a' : status === 'unrecognized' ? '#dc2626' : '#2563eb';
    const bgColor = status === 'recognized' ? '#16a34a' : status === 'unrecognized' ? '#dc2626' : '#2563eb';

    // Draw clean solid rectangle
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Draw simple solid label
    if (studentName || status === 'unrecognized') {
      const labelText = studentName ? `${studentName} (${rollNo || 'Present'})` : 'Face Not Recognized';
      ctx.font = '600 13px Inter, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const textWidth = textMetrics.width;
      const paddingX = 8;
      const paddingY = 4;
      const badgeWidth = textWidth + paddingX * 2;
      const badgeHeight = 22;
      const badgeX = Math.max(0, Math.min(x, canvas.width - badgeWidth));
      const badgeY = Math.max(0, y - badgeHeight);

      ctx.fillStyle = bgColor;
      ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, badgeX + paddingX, badgeY + 15);
    }
  }

  // Clear canvas overlay
  public clearCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

export const faceApiService = new FaceApiService();
