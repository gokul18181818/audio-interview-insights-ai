import { useState, useRef, useEffect, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

interface VideoMetrics {
  posture: number[];
  eyeContact: number[];
  gestures: string[];
  timestamps: number[];
  confidence: number[];
  stability: number[];
  engagement: number[];
  blinkRate: number[];
  headTilt: number[];
  gazeDirection: { x: number; y: number }[];
  attentionScore: number[];
  facialExpression: string[];
}

interface VideoAnalysisState {
  isRecording: boolean;
  hasPermission: boolean;
  videoStream: MediaStream | null;
  metrics: VideoMetrics;
  error: string | null;
  isCalibrated: boolean;
  calibrationData: CalibrationData | null;
  analysisQuality: number;
  lightingCondition: string;
}

interface CalibrationData {
  baselineEyePosition: { x: number; y: number };
  baselineHeadTilt: number;
  baselinePosture: number;
  faceRegionBounds: { x: number; y: number; width: number; height: number };
  skinToneReference: number;
  eyeAspectRatioBaseline: number;
  pupilBaseline: { left: { x: number; y: number }; right: { x: number; y: number } };
  faceOrientationBaseline: { pitch: number; yaw: number; roll: number };
  lightingReference: number;
  frameQualityThreshold: number;
}

interface FrameAnalysis {
  posture: number;
  eyeContact: number;
  gesture: string;
  confidence: number;
  stability: number;
  engagement: number;
  blinkRate: number;
  headTilt: number;
  gazeDirection: { x: number; y: number };
  attentionScore: number;
  facialExpression: string;
  frameQuality: number;
}

interface SmoothedMetrics {
  posture: number;
  eyeContact: number;
  confidence: number;
  stability: number;
  engagement: number;
  attentionScore: number;
}

interface GazeVector {
  x: number;
  y: number;
  confidence: number;
}

export const useEnhancedVideoAnalysis = () => {
  const [state, setState] = useState<VideoAnalysisState>({
    isRecording: false,
    hasPermission: false,
    videoStream: null,
    metrics: {
      posture: [],
      eyeContact: [],
      gestures: [],
      timestamps: [],
      confidence: [],
      stability: [],
      engagement: [],
      blinkRate: [],
      headTilt: [],
      gazeDirection: [],
      attentionScore: [],
      facialExpression: []
    },
    error: null,
    isCalibrated: false,
    calibrationData: null,
    analysisQuality: 0,
    lightingCondition: 'unknown'
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousFrameData = useRef<ImageData | null>(null);
  const movementHistory = useRef<number[]>([]);
  
  // MediaPipe instances
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const selfieSegmentationRef = useRef<SelfieSegmentation | null>(null);
  
  // Enhanced temporal smoothing with adaptive weights
  const smoothedMetricsRef = useRef<SmoothedMetrics>({
    posture: 0,
    eyeContact: 0,
    confidence: 0,
    stability: 0,
    engagement: 0,
    attentionScore: 0
  });
  
  // Advanced blink and gaze tracking
  const lastBlinkTime = useRef<number>(0);
  const blinkHistory = useRef<number[]>([]);
  const gazeHistory = useRef<GazeVector[]>([]);
  const expressionHistory = useRef<string[]>([]);
  
  // Adaptive smoothing factors based on stability
  const getAdaptiveSmoothingAlpha = (stability: number): number => {
    // Higher stability = more smoothing, lower stability = less smoothing for responsiveness
    return Math.max(0.1, Math.min(0.5, 0.3 + (stability - 70) * 0.005));
  };

  // Initialize MediaPipe models with optimized settings
  const initializeMediaPipe = useCallback(async () => {
    try {
      // Initialize FaceMesh with enhanced precision
      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,  // Increased for better accuracy
        minTrackingConfidence: 0.7   // Increased for better tracking
      });
      
      faceMeshRef.current = faceMesh;

      // Initialize Selfie Segmentation for background analysis
      const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      });
      
      selfieSegmentation.setOptions({
        modelSelection: 1, // Higher quality model
        selfieMode: true   // Optimized for selfie/webcam use
      });
      
      selfieSegmentationRef.current = selfieSegmentation;
      
      console.log('✅ Enhanced MediaPipe models initialized');
    } catch (error) {
      console.error('❌ MediaPipe initialization failed:', error);
    }
  }, []);

  // Advanced multi-point calibration
  const performCalibration = useCallback(async (): Promise<CalibrationData | null> => {
    if (!videoRef.current || !canvasRef.current || !faceMeshRef.current) {
      return null;
    }

    console.log('🎯 Starting advanced calibration...');
    
    return new Promise((resolve) => {
      let calibrationFrames: any[] = [];
      let frameCount = 0;
      const maxFrames = 50; // Extended calibration for better accuracy

      const calibrationInterval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) {
          clearInterval(calibrationInterval);
          resolve(null);
          return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx || video.videoWidth === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Process with FaceMesh
        faceMeshRef.current!.onResults((results) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
            const landmarks = results.multiFaceLandmarks[0];
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Quality check - only use good frames for calibration
            const frameQuality = assessFrameQuality(landmarks, imageData);
            if (frameQuality > 0.7) {
              calibrationFrames.push({
                landmarks,
                imageData,
                quality: frameQuality,
                timestamp: Date.now()
              });
            }
          }
        });

        await faceMeshRef.current!.send({ image: video });
        frameCount++;

        if (frameCount >= maxFrames) {
          clearInterval(calibrationInterval);
          
          if (calibrationFrames.length > 10) {
            // Sort by quality and take the best frames
            calibrationFrames.sort((a, b) => b.quality - a.quality);
            const bestFrames = calibrationFrames.slice(0, Math.min(20, calibrationFrames.length));
            
            // Calculate robust baseline values
            const calibrationData = calculateAdvancedBaseline(bestFrames);
            console.log('✅ Advanced calibration complete');
            resolve(calibrationData);
          } else {
            console.log('❌ Insufficient quality frames for calibration');
            resolve(null);
          }
        }
      }, 100); // 10fps during calibration
    });
  }, []);

  // Assess frame quality for better analysis
  const assessFrameQuality = (landmarks: any[], imageData: ImageData): number => {
    const { data, width, height } = imageData;
    
    // 1. Face detection confidence (based on landmark consistency)
    const faceConfidence = calculateLandmarkConfidence(landmarks);
    
    // 2. Lighting quality assessment
    let totalBrightness = 0;
    let pixelCount = 0;
    const sampleStep = 4; // Sample every 4th pixel for performance
    
    for (let i = 0; i < data.length; i += sampleStep * 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }
    
    const avgBrightness = totalBrightness / pixelCount;
    const lightingQuality = 1 - Math.abs(avgBrightness - 128) / 128; // Optimal at 128
    
    // 3. Image sharpness (using edge detection)
    const sharpness = calculateImageSharpness(data, width, height);
    
    // Combined quality score
    return (faceConfidence * 0.5) + (lightingQuality * 0.3) + (sharpness * 0.2);
  };

  // Calculate landmark consistency for confidence
  const calculateLandmarkConfidence = (landmarks: any[]): number => {
    // Check if landmarks form a reasonable face shape
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];
    const mouth = landmarks[13];
    
    // Calculate ratios that should be consistent for a face
    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
    );
    
    const faceHeight = Math.sqrt(
      Math.pow(mouth.y - ((leftEye.y + rightEye.y) / 2), 2)
    );
    
    // Normal face ratio is approximately 1:1.5 (width:height)
    const faceRatio = eyeDistance / faceHeight;
    const ratioConfidence = 1 - Math.abs(faceRatio - 0.67) / 0.67;
    
    return Math.max(0, Math.min(1, ratioConfidence));
  };

  // Calculate image sharpness using Sobel edge detection
  const calculateImageSharpness = (data: Uint8ClampedArray, width: number, height: number): number => {
    let edgeSum = 0;
    let pixelCount = 0;
    
    // Sobel operators
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    // Sample a smaller region for performance
    const sampleSize = Math.min(width, height) / 4;
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let y = centerY - sampleSize; y < centerY + sampleSize; y += 4) {
      for (let x = centerX - sampleSize; x < centerX + sampleSize; x += 4) {
        if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
          let gx = 0, gy = 0;
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const i = ((y + ky) * width + (x + kx)) * 4;
              const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
              const kernelIndex = (ky + 1) * 3 + (kx + 1);
              
              gx += gray * sobelX[kernelIndex];
              gy += gray * sobelY[kernelIndex];
            }
          }
          
          edgeSum += Math.sqrt(gx * gx + gy * gy);
          pixelCount++;
        }
      }
    }
    
    return pixelCount > 0 ? Math.min(1, edgeSum / (pixelCount * 255)) : 0;
  };

  // Calculate advanced baseline from calibration frames
  const calculateAdvancedBaseline = (frames: any[]): CalibrationData => {
    const canvas = canvasRef.current!;
    let totalEyePosition = { x: 0, y: 0 };
    let totalHeadTilt = 0;
    let totalEAR = 0;
    let totalLighting = 0;
    let faceOrientations = { pitch: 0, yaw: 0, roll: 0 };
    
    frames.forEach(frame => {
      const landmarks = frame.landmarks;
      
      // Eye position
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      totalEyePosition.x += (leftEye.x + rightEye.x) / 2;
      totalEyePosition.y += (leftEye.y + rightEye.y) / 2;
      
      // Head tilt
      const noseTip = landmarks[1];
      const forehead = landmarks[10];
      totalHeadTilt += Math.atan2(forehead.y - noseTip.y, forehead.x - noseTip.x);
      
      // Eye aspect ratio baseline
      totalEAR += calculateEyeAspectRatio(landmarks);
      
      // Face orientation (using multiple points for 3D estimation)
      const orientation = estimate3DFaceOrientation(landmarks);
      faceOrientations.pitch += orientation.pitch;
      faceOrientations.yaw += orientation.yaw;
      faceOrientations.roll += orientation.roll;
      
      // Lighting assessment
      totalLighting += assessFrameLighting(frame.imageData);
    });
    
    const frameCount = frames.length;
    
    // Calculate face bounds from best frame
    const bestFrame = frames[0];
    const landmarks = bestFrame.landmarks;
    const faceXs = landmarks.map((l: any) => l.x * canvas.width);
    const faceYs = landmarks.map((l: any) => l.y * canvas.height);
    
    return {
      baselineEyePosition: {
        x: totalEyePosition.x / frameCount,
        y: totalEyePosition.y / frameCount
      },
      baselineHeadTilt: totalHeadTilt / frameCount,
      baselinePosture: 85, // Will be calculated during first few frames
      faceRegionBounds: {
        x: Math.min(...faceXs),
        y: Math.min(...faceYs),
        width: Math.max(...faceXs) - Math.min(...faceXs),
        height: Math.max(...faceYs) - Math.min(...faceYs)
      },
      skinToneReference: calculateSkinToneReference(bestFrame.landmarks, bestFrame.imageData),
      eyeAspectRatioBaseline: totalEAR / frameCount,
      pupilBaseline: calculatePupilBaseline(landmarks),
      faceOrientationBaseline: {
        pitch: faceOrientations.pitch / frameCount,
        yaw: faceOrientations.yaw / frameCount,
        roll: faceOrientations.roll / frameCount
      },
      lightingReference: totalLighting / frameCount,
      frameQualityThreshold: 0.6
    };
  };

  // Enhanced gaze estimation using pupil and iris landmarks
  const estimateGazeDirection = (landmarks: any[], calibration: CalibrationData): GazeVector => {
    // Use specific eye landmarks for more accurate gaze estimation
    const leftEyeCenter = landmarks[468];  // Left eye center
    const rightEyeCenter = landmarks[473]; // Right eye center
    const leftIris = landmarks[474];       // Left iris center
    const rightIris = landmarks[475];      // Right iris center
    
    if (!leftIris || !rightIris) {
      // Fallback to basic eye landmarks if iris not detected
      return estimateBasicGaze(landmarks, calibration);
    }
    
    // Calculate gaze vectors for each eye
    const leftGaze = {
      x: leftIris.x - leftEyeCenter.x,
      y: leftIris.y - leftEyeCenter.y
    };
    
    const rightGaze = {
      x: rightIris.x - rightEyeCenter.x,
      y: rightIris.y - rightEyeCenter.y
    };
    
    // Average the gaze vectors
    const avgGaze = {
      x: (leftGaze.x + rightGaze.x) / 2,
      y: (leftGaze.y + rightGaze.y) / 2
    };
    
    // Normalize and calculate confidence
    const magnitude = Math.sqrt(avgGaze.x * avgGaze.x + avgGaze.y * avgGaze.y);
    const confidence = Math.min(1, magnitude * 10); // Higher magnitude = more confident
    
    return {
      x: avgGaze.x,
      y: avgGaze.y,
      confidence
    };
  };

  // Fallback gaze estimation using basic eye landmarks
  const estimateBasicGaze = (landmarks: any[], calibration: CalibrationData): GazeVector => {
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const currentEyePosition = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    };
    
    // Calculate deviation from baseline
    const gazeX = currentEyePosition.x - calibration.baselineEyePosition.x;
    const gazeY = currentEyePosition.y - calibration.baselineEyePosition.y;
    
    return {
      x: gazeX,
      y: gazeY,
      confidence: 0.5 // Lower confidence for basic estimation
    };
  };

  // Enhanced eye contact analysis with gaze estimation
  const analyzeEyeContactWithGaze = (landmarks: any[], calibration: CalibrationData): number => {
    const gazeVector = estimateGazeDirection(landmarks, calibration);
    
    // Camera is typically at (0.5, 0.3) relative to screen
    const cameraPosition = { x: 0, y: -0.1 }; // Slightly above center
    
    // Calculate angle between gaze and camera direction
    const gazeAngle = Math.atan2(gazeVector.y - cameraPosition.y, gazeVector.x - cameraPosition.x);
    const directAngle = Math.atan2(cameraPosition.y, cameraPosition.x);
    
    let angleDifference = Math.abs(gazeAngle - directAngle);
    if (angleDifference > Math.PI) {
      angleDifference = 2 * Math.PI - angleDifference;
    }
    
    // Convert to score (0 degrees = 100%, 30 degrees = 0%)
    const maxAngle = Math.PI / 6; // 30 degrees
    const eyeContactScore = Math.max(0, 100 - (angleDifference / maxAngle) * 100);
    
    // Weight by gaze confidence
    return Math.round(eyeContactScore * gazeVector.confidence + (1 - gazeVector.confidence) * 50);
  };

  // Calculate eye aspect ratio for blink detection
  const calculateEyeAspectRatio = (landmarks: any[]): number => {
    // Left eye landmarks
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];
    const leftEyeLeft = landmarks[33];
    const leftEyeRight = landmarks[133];

    // Right eye landmarks
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];
    const rightEyeLeft = landmarks[362];
    const rightEyeRight = landmarks[263];

    // Calculate vertical distances
    const leftVertical = Math.sqrt(
      Math.pow(leftEyeTop.x - leftEyeBottom.x, 2) + 
      Math.pow(leftEyeTop.y - leftEyeBottom.y, 2)
    );
    
    const rightVertical = Math.sqrt(
      Math.pow(rightEyeTop.x - rightEyeBottom.x, 2) + 
      Math.pow(rightEyeTop.y - rightEyeBottom.y, 2)
    );

    // Calculate horizontal distances
    const leftHorizontal = Math.sqrt(
      Math.pow(leftEyeLeft.x - leftEyeRight.x, 2) + 
      Math.pow(leftEyeLeft.y - leftEyeRight.y, 2)
    );
    
    const rightHorizontal = Math.sqrt(
      Math.pow(rightEyeLeft.x - rightEyeRight.x, 2) + 
      Math.pow(rightEyeLeft.y - rightEyeRight.y, 2)
    );

    // Calculate EAR for each eye
    const leftEAR = leftVertical / leftHorizontal;
    const rightEAR = rightVertical / rightHorizontal;

    return (leftEAR + rightEAR) / 2;
  };

  // Enhanced blink detection with adaptive thresholding
  const detectAdvancedBlinks = (landmarks: any[], calibration: CalibrationData): number => {
    const currentEAR = calculateEyeAspectRatio(landmarks);
    
    // Adaptive threshold based on baseline
    const blinkThreshold = calibration.eyeAspectRatioBaseline * 0.7;
    
    // Detect blink
    if (currentEAR < blinkThreshold) {
      const now = Date.now();
      if (now - lastBlinkTime.current > 150) { // Minimum 150ms between blinks
        blinkHistory.current.push(now);
        lastBlinkTime.current = now;
        
        // Keep only last 60 seconds of blinks
        blinkHistory.current = blinkHistory.current.filter(time => now - time < 60000);
      }
    }

    // Calculate blinks per minute
    const blinksPerMinute = blinkHistory.current.length;
    
    // Optimal blink rate is 12-20 per minute for concentration
    let blinkScore = 100;
    if (blinksPerMinute < 8) {
      // Too few blinks may indicate strain or intense focus
      blinkScore = Math.max(60, 100 - (8 - blinksPerMinute) * 8);
    } else if (blinksPerMinute > 25) {
      // Too many blinks may indicate nervousness or dry eyes
      blinkScore = Math.max(40, 100 - (blinksPerMinute - 25) * 4);
    }

    return blinkScore;
  };

  // 3D face orientation estimation
  const estimate3DFaceOrientation = (landmarks: any[]): { pitch: number; yaw: number; roll: number } => {
    // Key landmarks for 3D orientation
    const noseTip = landmarks[1];
    const chinBottom = landmarks[175];
    const leftEyeOuter = landmarks[33];
    const rightEyeOuter = landmarks[263];
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];
    
    // Calculate pitch (up/down rotation)
    const faceVertical = chinBottom.y - noseTip.y;
    const pitch = Math.atan2(faceVertical, 0.1) - Math.PI/2; // Normalize
    
    // Calculate yaw (left/right rotation)
    const eyeAsymmetry = (rightEyeOuter.x - noseTip.x) - (noseTip.x - leftEyeOuter.x);
    const yaw = Math.atan2(eyeAsymmetry, 0.1);
    
    // Calculate roll (tilt rotation)
    const eyeLine = rightEyeOuter.y - leftEyeOuter.y;
    const eyeDistance = rightEyeOuter.x - leftEyeOuter.x;
    const roll = Math.atan2(eyeLine, eyeDistance);
    
    return { pitch, yaw, roll };
  };

  // Enhanced posture analysis using 3D orientation
  const analyzeAdvancedPosture = (landmarks: any[], calibration: CalibrationData): number => {
    const currentOrientation = estimate3DFaceOrientation(landmarks);
    const baseline = calibration.faceOrientationBaseline;
    
    // Calculate deviations from baseline
    const pitchDeviation = Math.abs(currentOrientation.pitch - baseline.pitch);
    const yawDeviation = Math.abs(currentOrientation.yaw - baseline.yaw);
    const rollDeviation = Math.abs(currentOrientation.roll - baseline.roll);
    
    // Score each component (lower deviation = higher score)
    const maxDeviation = Math.PI / 8; // 22.5 degrees
    const pitchScore = Math.max(0, 100 - (pitchDeviation / maxDeviation) * 100);
    const yawScore = Math.max(0, 100 - (yawDeviation / maxDeviation) * 100);
    const rollScore = Math.max(0, 100 - (rollDeviation / maxDeviation) * 100);
    
    // Face position scoring
    const faceCenter = {
      x: (landmarks[234].x + landmarks[454].x) / 2,
      y: (landmarks[10].y + landmarks[152].y) / 2
    };
    
    const idealPosition = { x: 0.5, y: 0.35 };
    const positionDeviation = Math.sqrt(
      Math.pow(faceCenter.x - idealPosition.x, 2) + 
      Math.pow(faceCenter.y - idealPosition.y, 2)
    );
    
    const positionScore = Math.max(0, 100 - (positionDeviation / 0.2) * 50);
    
    // Combine scores with weights
    const postureScore = (
      pitchScore * 0.3 +
      yawScore * 0.25 +
      rollScore * 0.25 +
      positionScore * 0.2
    );
    
    return Math.round(postureScore);
  };

  // Advanced facial expression analysis
  const analyzeFacialExpression = (landmarks: any[]): string => {
    // Mouth landmarks for smile detection
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];
    const topLip = landmarks[13];
    const bottomLip = landmarks[14];
    
    // Calculate mouth curvature
    const mouthWidth = rightMouth.x - leftMouth.x;
    const mouthHeight = bottomLip.y - topLip.y;
    const mouthRatio = mouthHeight / mouthWidth;
    
    // Eyebrow landmarks for surprise/concern detection
    const leftBrow = landmarks[70];
    const rightBrow = landmarks[107];
    const noseBridge = landmarks[6];
    
    const browDistance = ((leftBrow.y + rightBrow.y) / 2) - noseBridge.y;
    
    // Classify expression
    if (mouthRatio < 0.02 && (leftMouth.y + rightMouth.y) / 2 < topLip.y) {
      return 'positive'; // Smile detected
    } else if (browDistance < -0.02) {
      return 'concerned'; // Raised eyebrows
    } else if (mouthRatio > 0.05) {
      return 'surprised'; // Open mouth
    } else {
      return 'neutral';
    }
  };

  // Calculate attention score based on multiple factors
  const calculateAttentionScore = (
    eyeContactScore: number,
    blinkRate: number,
    postureScore: number,
    gazeStability: number
  ): number => {
    // Weight factors for attention
    const weights = {
      eyeContact: 0.4,
      blinkRate: 0.2,
      posture: 0.2,
      gazeStability: 0.2
    };
    
    const attentionScore = (
      eyeContactScore * weights.eyeContact +
      blinkRate * weights.blinkRate +
      postureScore * weights.posture +
      gazeStability * weights.gazeStability
    );
    
    return Math.round(attentionScore);
  };

  // Calculate gaze stability over time
  const calculateGazeStability = (gazeHistory: GazeVector[]): number => {
    if (gazeHistory.length < 5) return 80; // Default for insufficient data
    
    const recent = gazeHistory.slice(-10); // Last 10 measurements
    
    // Calculate variance in gaze direction
    const avgX = recent.reduce((sum, g) => sum + g.x, 0) / recent.length;
    const avgY = recent.reduce((sum, g) => sum + g.y, 0) / recent.length;
    
    const variance = recent.reduce((sum, g) => {
      return sum + Math.pow(g.x - avgX, 2) + Math.pow(g.y - avgY, 2);
    }, 0) / recent.length;
    
    // Convert variance to stability score (lower variance = higher stability)
    const maxVariance = 0.01; // Threshold for good stability
    const stabilityScore = Math.max(0, 100 - (variance / maxVariance) * 100);
    
    return Math.round(stabilityScore);
  };

  // Helper functions for calibration
  const calculateSkinToneReference = (landmarks: any[], imageData: ImageData): number => {
    const { data, width } = imageData;
    const noseTip = landmarks[1];
    const x = Math.floor(noseTip.x * width);
    const y = Math.floor(noseTip.y * imageData.height);
    
    // Sample skin area around nose
    let totalBrightness = 0;
    let pixelCount = 0;
    const sampleRadius = 10;
    
    for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
      for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < width && py >= 0 && py < imageData.height) {
          const i = (py * width + px) * 4;
          totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
          pixelCount++;
        }
      }
    }
    
    return pixelCount > 0 ? totalBrightness / pixelCount : 128;
  };

  const calculatePupilBaseline = (landmarks: any[]): { left: { x: number; y: number }; right: { x: number; y: number } } => {
    return {
      left: { x: landmarks[33].x, y: landmarks[33].y },
      right: { x: landmarks[263].x, y: landmarks[263].y }
    };
  };

  const assessFrameLighting = (imageData: ImageData): number => {
    const { data } = imageData;
    let totalBrightness = 0;
    let pixelCount = 0;
    
    // Sample every 16th pixel for performance
    for (let i = 0; i < data.length; i += 64) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
      pixelCount++;
    }
    
    const avgBrightness = totalBrightness / pixelCount;
    
    // Optimal lighting is around 120-140
    return 1 - Math.abs(avgBrightness - 130) / 130;
  };

  // Adaptive temporal smoothing based on confidence and stability
  const applyAdaptiveSmoothing = (newMetrics: Omit<FrameAnalysis, 'gesture' | 'facialExpression'>, stability: number) => {
    const alpha = getAdaptiveSmoothingAlpha(stability);
    const smoothed = smoothedMetricsRef.current;
    
    smoothed.posture = alpha * newMetrics.posture + (1 - alpha) * smoothed.posture;
    smoothed.eyeContact = alpha * newMetrics.eyeContact + (1 - alpha) * smoothed.eyeContact;
    smoothed.confidence = alpha * newMetrics.confidence + (1 - alpha) * smoothed.confidence;
    smoothed.stability = alpha * newMetrics.stability + (1 - alpha) * smoothed.stability;
    smoothed.engagement = alpha * newMetrics.engagement + (1 - alpha) * smoothed.engagement;
    smoothed.attentionScore = alpha * newMetrics.attentionScore + (1 - alpha) * smoothed.attentionScore;
    
    return smoothed;
  };

  // Request camera permission and start video stream
  const startVideoRecording = useCallback(async () => {
    try {
      console.log('📹 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      console.log('✅ Camera access granted');
      await initializeMediaPipe();

      setState(prev => ({
        ...prev,
        videoStream: stream,
        hasPermission: true,
        isRecording: true,
        error: null
      }));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.error('❌ Video play failed:', err);
        });
      }

    } catch (error) {
      console.error('❌ Camera access failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Camera permission denied or not available',
        hasPermission: false
      }));
    }
  }, [initializeMediaPipe]);

  // Perform calibration
  const calibrate = useCallback(async () => {
    const calibrationData = await performCalibration();
    if (calibrationData) {
      setState(prev => ({
        ...prev,
        isCalibrated: true,
        calibrationData
      }));
      
      // Start analysis after calibration
      analysisIntervalRef.current = setInterval(() => {
        analyzeFrame();
      }, 1000); // Analyze every second
    }
  }, []);

  // Enhanced frame analysis with MediaPipe
  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceMeshRef.current || !state.calibrationData) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Process with FaceMesh
    faceMeshRef.current.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Enhanced analysis with landmarks
        const postureScore = analyzeAdvancedPosture(landmarks, state.calibrationData!);
        const eyeContactScore = analyzeEyeContactWithGaze(landmarks, state.calibrationData!);
        const blinkScore = detectAdvancedBlinks(landmarks, state.calibrationData!);
        const gazeVector = estimateGazeDirection(landmarks, state.calibrationData!);
        
        // Calculate head tilt
        const noseTip = landmarks[1];
        const forehead = landmarks[10];
        const headTilt = Math.atan2(forehead.y - noseTip.y, forehead.x - noseTip.x) * (180 / Math.PI);
        
        // Stability analysis (frame comparison)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const stabilityScore = analyzeStabilityForInterview(imageData);
        
        // Gaze stability calculation
        gazeHistory.current.push(gazeVector);
        if (gazeHistory.current.length > 15) {
          gazeHistory.current.shift();
        }
        const gazeStability = calculateGazeStability(gazeHistory.current);
        
        // Derived metrics
        const confidenceScore = Math.round((postureScore * 0.6) + (stabilityScore * 0.4));
        const engagementScore = Math.round((postureScore * 0.3) + (eyeContactScore * 0.4) + (stabilityScore * 0.2) + (blinkScore * 0.1));
        const gestureType = analyzeGesturesForInterview(stabilityScore);
        const attentionScore = calculateAttentionScore(eyeContactScore, blinkScore, postureScore, gazeStability);
        const frameQuality = assessFrameQuality(landmarks, imageData);

        // Apply temporal smoothing
        const rawMetrics = {
          posture: postureScore,
          eyeContact: eyeContactScore,
          confidence: confidenceScore,
          stability: stabilityScore,
          engagement: engagementScore,
          blinkRate: blinkScore,
          headTilt: Math.abs(headTilt),
          gazeDirection: gazeVector,
          attentionScore: attentionScore,
          frameQuality: frameQuality
        };

        const smoothedMetrics = applyAdaptiveSmoothing(rawMetrics, stabilityScore);

        // Update state with smoothed metrics
        setState(prev => ({
          ...prev,
          metrics: {
            posture: [...prev.metrics.posture, Math.round(smoothedMetrics.posture)],
            eyeContact: [...prev.metrics.eyeContact, Math.round(smoothedMetrics.eyeContact)],
            gestures: [...prev.metrics.gestures, gestureType],
            timestamps: [...prev.metrics.timestamps, Date.now()],
            confidence: [...prev.metrics.confidence, Math.round(smoothedMetrics.confidence)],
            stability: [...prev.metrics.stability, Math.round(smoothedMetrics.stability)],
            engagement: [...prev.metrics.engagement, Math.round(smoothedMetrics.engagement)],
            blinkRate: [...prev.metrics.blinkRate, blinkScore],
            headTilt: [...prev.metrics.headTilt, Math.abs(headTilt)],
            gazeDirection: [...prev.metrics.gazeDirection, gazeVector],
            attentionScore: [...prev.metrics.attentionScore, Math.round(smoothedMetrics.attentionScore)],
            facialExpression: [...prev.metrics.facialExpression, analyzeFacialExpression(landmarks)]
          }
        }));

        // Store current frame for next comparison
        previousFrameData.current = imageData;
      }
    });

    await faceMeshRef.current.send({ image: video });
  }, [state.calibrationData]);

  // Enhanced stability analysis (same as before but with optimizations)
  const analyzeStabilityForInterview = (currentFrame: ImageData): number => {
    if (!previousFrameData.current) {
      return 85;
    }
    
    const current = currentFrame.data;
    const previous = previousFrameData.current.data;
    let totalDifference = 0;
    let significantChanges = 0;
    
    // Sample every 8th pixel for better performance with higher resolution
    for (let i = 0; i < current.length; i += 32) {
      const currentBrightness = (current[i] + current[i + 1] + current[i + 2]) / 3;
      const previousBrightness = (previous[i] + previous[i + 1] + previous[i + 2]) / 3;
      const difference = Math.abs(currentBrightness - previousBrightness);
      
      totalDifference += difference;
      if (difference > 15) significantChanges++;
    }
    
    const avgDifference = totalDifference / (current.length / 32);
    movementHistory.current.push(avgDifference);
    
    if (movementHistory.current.length > 10) {
      movementHistory.current.shift();
    }
    
    const recentMovement = movementHistory.current.reduce((a, b) => a + b, 0) / movementHistory.current.length;
    const stabilityScore = Math.max(0, 100 - (recentMovement * 2) - (significantChanges * 5));
    
    return Math.round(stabilityScore);
  };

  // Gesture analysis (same as before)
  const analyzeGesturesForInterview = (stability: number): string => {
    if (stability > 80) return 'composed';
    if (stability > 60) return 'natural';
    if (stability > 40) return 'animated';
    return 'restless';
  };

  // Stop video recording and analysis
  const stopVideoRecording = useCallback(() => {
    if (state.videoStream) {
      state.videoStream.getTracks().forEach(track => track.stop());
    }

    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      videoStream: null
    }));
  }, [state.videoStream]);

  // Calculate enhanced summary metrics
  const getSummaryMetrics = useCallback(() => {
    const { posture, eyeContact, gestures, confidence, stability, engagement, blinkRate, headTilt, gazeDirection, attentionScore, facialExpression } = state.metrics;
    
    if (posture.length === 0) {
      return {
        averagePosture: 0,
        averageEyeContact: 0,
        averageConfidence: 0,
        averageStability: 0,
        averageEngagement: 0,
        averageBlinkRate: 0,
        averageHeadTilt: 0,
        averageAttentionScore: 0,
        gestureBreakdown: { composed: 0, natural: 0, animated: 0, restless: 0 },
        expressionBreakdown: { positive: 0, neutral: 0, concerned: 0, surprised: 0 },
        overallInterviewScore: 0,
        recommendations: [],
        totalSamples: 0,
        gazeStability: 0,
        lightingQuality: state.lightingCondition,
        analysisQuality: state.analysisQuality
      };
    }
    
    const averagePosture = posture.reduce((a, b) => a + b, 0) / posture.length;
    const averageEyeContact = eyeContact.reduce((a, b) => a + b, 0) / eyeContact.length;
    const averageConfidence = confidence.reduce((a, b) => a + b, 0) / confidence.length;
    const averageStability = stability.reduce((a, b) => a + b, 0) / stability.length;
    const averageEngagement = engagement.reduce((a, b) => a + b, 0) / engagement.length;
    const averageBlinkRate = blinkRate.reduce((a, b) => a + b, 0) / blinkRate.length;
    const averageHeadTilt = headTilt.reduce((a, b) => a + b, 0) / headTilt.length;
    const averageAttentionScore = attentionScore.reduce((a, b) => a + b, 0) / attentionScore.length;
    
    const gestureBreakdown = gestures.reduce((acc, gesture) => {
      acc[gesture as keyof typeof acc] = (acc[gesture as keyof typeof acc] || 0) + 1;
      return acc;
    }, { composed: 0, natural: 0, animated: 0, restless: 0 });

    const expressionBreakdown = facialExpression.reduce((acc, expression) => {
      acc[expression as keyof typeof acc] = (acc[expression as keyof typeof acc] || 0) + 1;
      return acc;
    }, { positive: 0, neutral: 0, concerned: 0, surprised: 0 });
    
    // Calculate enhanced overall interview performance score
    const overallScore = (
      averagePosture * 0.2 + 
      averageEyeContact * 0.25 + 
      averageConfidence * 0.2 + 
      averageEngagement * 0.2 +
      averageAttentionScore * 0.15
    );
    
    // Calculate gaze stability
    const gazeStability = calculateGazeStability(gazeHistory.current);
    
    // Generate enhanced recommendations
    const recommendations = generateEnhancedRecommendations({
      posture: averagePosture,
      eyeContact: averageEyeContact,
      confidence: averageConfidence,
      stability: averageStability,
      engagement: averageEngagement,
      blinkRate: averageBlinkRate,
      headTilt: averageHeadTilt,
      attentionScore: averageAttentionScore,
      gazeStability
    });

    return {
      averagePosture: Math.round(averagePosture),
      averageEyeContact: Math.round(averageEyeContact),
      averageConfidence: Math.round(averageConfidence),
      averageStability: Math.round(averageStability),
      averageEngagement: Math.round(averageEngagement),
      averageBlinkRate: Math.round(averageBlinkRate),
      averageHeadTilt: Math.round(averageHeadTilt),
      averageAttentionScore: Math.round(averageAttentionScore),
      gestureBreakdown,
      expressionBreakdown,
      overallInterviewScore: Math.round(overallScore),
      recommendations,
      totalSamples: posture.length,
      gazeStability: Math.round(gazeStability),
      lightingQuality: state.lightingCondition,
      analysisQuality: Math.round(state.analysisQuality)
    };
  }, [state.metrics, state.lightingCondition, state.analysisQuality]);

  // Generate enhanced recommendations based on comprehensive analysis
  const generateEnhancedRecommendations = (averages: any) => {
    const recommendations: string[] = [];
    
    // Posture recommendations
    if (averages.posture < 70) {
      recommendations.push('📐 Improve your posture: Sit up straight and keep your shoulders back. Consider adjusting your chair height.');
    }
    
    // Eye contact recommendations
    if (averages.eyeContact < 65) {
      recommendations.push('👁️ Enhance eye contact: Look directly at the camera more often. Try placing a small arrow near your webcam as a reminder.');
    }
    
    // Attention and focus recommendations
    if (averages.attentionScore < 70) {
      recommendations.push('🎯 Increase attention: Minimize distractions and focus on maintaining steady gaze direction.');
    }
    
    // Blink rate recommendations
    if (averages.blinkRate < 60) {
      recommendations.push('👀 Blink more naturally: You may be straining your eyes. Try the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.');
    } else if (averages.blinkRate > 85) {
      recommendations.push('😌 Relax: Frequent blinking might indicate nervousness. Take deep breaths and try to relax.');
    }
    
    // Head stability recommendations
    if (averages.headTilt > 15) {
      recommendations.push('📏 Stabilize head position: Try to keep your head level and avoid excessive tilting.');
    }
    
    // Gaze stability recommendations
    if (averages.gazeStability < 60) {
      recommendations.push('🎯 Improve focus stability: Try to maintain steady gaze direction and avoid looking around frequently.');
    }
    
    // Overall confidence recommendations
    if (averages.confidence < 75) {
      recommendations.push('💪 Boost confidence: Practice good posture, maintain eye contact, and speak clearly to project confidence.');
    }
    
    // Engagement recommendations
    if (averages.engagement < 70) {
      recommendations.push('🔥 Increase engagement: Show interest through facial expressions and maintain active participation.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('🌟 Excellent performance! Keep up the great work with your professional presence.');
    }
    
    return recommendations;
  };

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setState(prev => ({
      ...prev,
      metrics: {
        posture: [],
        eyeContact: [],
        gestures: [],
        timestamps: [],
        confidence: [],
        stability: [],
        engagement: [],
        blinkRate: [],
        headTilt: [],
        gazeDirection: [],
        attentionScore: [],
        facialExpression: []
      },
      isCalibrated: false,
      calibrationData: null,
      analysisQuality: 0,
      lightingCondition: 'unknown'
    }));
    movementHistory.current = [];
    previousFrameData.current = null;
    blinkHistory.current = [];
    gazeHistory.current = [];
    expressionHistory.current = [];
    smoothedMetricsRef.current = {
      posture: 0,
      eyeContact: 0,
      confidence: 0,
      stability: 0,
      engagement: 0,
      attentionScore: 0
    };
  }, []);

  // Ensure video stream is connected when it changes
  useEffect(() => {
    if (state.videoStream && videoRef.current) {
      videoRef.current.srcObject = state.videoStream;
      videoRef.current.play().catch(console.error);
    }
  }, [state.videoStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.videoStream) {
        state.videoStream.getTracks().forEach(track => track.stop());
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [state.videoStream]);

  return {
    ...state,
    videoRef,
    canvasRef,
    startVideoRecording,
    stopVideoRecording,
    calibrate,
    getSummaryMetrics,
    resetMetrics
  };
}; 