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
}

interface VideoAnalysisState {
  isRecording: boolean;
  hasPermission: boolean;
  videoStream: MediaStream | null;
  metrics: VideoMetrics;
  error: string | null;
  isCalibrated: boolean;
  calibrationData: any | null;
}

interface CalibrationData {
  baselineEyePosition: { x: number; y: number };
  baselineHeadTilt: number;
  baselinePosture: number;
  faceRegionBounds: { x: number; y: number; width: number; height: number };
  skinToneReference: number;
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
}

interface SmoothedMetrics {
  posture: number;
  eyeContact: number;
  confidence: number;
  stability: number;
  engagement: number;
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
      headTilt: []
    },
    error: null,
    isCalibrated: false,
    calibrationData: null
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousFrameData = useRef<ImageData | null>(null);
  const movementHistory = useRef<number[]>([]);
  
  // MediaPipe instances
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const selfieSegmentationRef = useRef<SelfieSegmentation | null>(null);
  
  // Temporal smoothing
  const smoothedMetricsRef = useRef<SmoothedMetrics>({
    posture: 0,
    eyeContact: 0,
    confidence: 0,
    stability: 0,
    engagement: 0
  });
  
  // Blink detection
  const lastBlinkTime = useRef<number>(0);
  const blinkHistory = useRef<number[]>([]);
  
  // EMA smoothing factor (0.1 = heavy smoothing, 0.9 = light smoothing)
  const SMOOTHING_ALPHA = 0.3;

  // Initialize MediaPipe models
  const initializeMediaPipe = useCallback(async () => {
    try {
      // Initialize FaceMesh
      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      faceMeshRef.current = faceMesh;

      // Initialize Selfie Segmentation
      const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      });
      
      selfieSegmentation.setOptions({
        modelSelection: 1, // 0 for general, 1 for landscape
      });
      
      selfieSegmentationRef.current = selfieSegmentation;
      
      console.log('✅ MediaPipe models initialized');
    } catch (error) {
      console.error('❌ MediaPipe initialization failed:', error);
    }
  }, []);

  // Exponential Moving Average for temporal smoothing
  const applyTemporalSmoothing = (newMetrics: Omit<FrameAnalysis, 'gesture'>) => {
    const smoothed = smoothedMetricsRef.current;
    
    smoothed.posture = SMOOTHING_ALPHA * newMetrics.posture + (1 - SMOOTHING_ALPHA) * smoothed.posture;
    smoothed.eyeContact = SMOOTHING_ALPHA * newMetrics.eyeContact + (1 - SMOOTHING_ALPHA) * smoothed.eyeContact;
    smoothed.confidence = SMOOTHING_ALPHA * newMetrics.confidence + (1 - SMOOTHING_ALPHA) * smoothed.confidence;
    smoothed.stability = SMOOTHING_ALPHA * newMetrics.stability + (1 - SMOOTHING_ALPHA) * smoothed.stability;
    smoothed.engagement = SMOOTHING_ALPHA * newMetrics.engagement + (1 - SMOOTHING_ALPHA) * smoothed.engagement;
    
    return smoothed;
  };

  // Baseline calibration
  const performCalibration = useCallback(async (): Promise<CalibrationData | null> => {
    if (!videoRef.current || !canvasRef.current || !faceMeshRef.current) {
      return null;
    }

    console.log('🎯 Starting calibration...');
    
    return new Promise((resolve) => {
      let calibrationFrames: any[] = [];
      let frameCount = 0;
      const maxFrames = 30; // 3 seconds at 10fps

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
            calibrationFrames.push({
              landmarks: results.multiFaceLandmarks[0],
              imageData: ctx.getImageData(0, 0, canvas.width, canvas.height)
            });
          }
        });

        await faceMeshRef.current!.send({ image: video });
        frameCount++;

        if (frameCount >= maxFrames) {
          clearInterval(calibrationInterval);
          
          if (calibrationFrames.length > 0) {
            // Calculate baseline values
            const avgFrame = calibrationFrames[Math.floor(calibrationFrames.length / 2)];
            const landmarks = avgFrame.landmarks;
            
            // Eye landmarks (left eye: 33, right eye: 263)
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const baselineEyePosition = {
              x: (leftEye.x + rightEye.x) / 2,
              y: (leftEye.y + rightEye.y) / 2
            };

            // Head tilt (nose tip: 1, forehead: 10)
            const noseTip = landmarks[1];
            const forehead = landmarks[10];
            const baselineHeadTilt = Math.atan2(forehead.y - noseTip.y, forehead.x - noseTip.x);

            // Face bounds
            const faceXs = landmarks.map((l: any) => l.x * canvas.width);
            const faceYs = landmarks.map((l: any) => l.y * canvas.height);
            const faceRegionBounds = {
              x: Math.min(...faceXs),
              y: Math.min(...faceYs),
              width: Math.max(...faceXs) - Math.min(...faceXs),
              height: Math.max(...faceYs) - Math.min(...faceYs)
            };

            // Skin tone reference
            const imageData = avgFrame.imageData;
            const centerX = Math.floor(canvas.width * baselineEyePosition.x);
            const centerY = Math.floor(canvas.height * baselineEyePosition.y);
            const skinSampleSize = 20;
            let skinToneSum = 0;
            let skinPixelCount = 0;

            for (let y = centerY - skinSampleSize; y < centerY + skinSampleSize; y++) {
              for (let x = centerX - skinSampleSize; x < centerX + skinSampleSize; x++) {
                if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                  const i = (y * canvas.width + x) * 4;
                  skinToneSum += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
                  skinPixelCount++;
                }
              }
            }

            const calibrationData: CalibrationData = {
              baselineEyePosition,
              baselineHeadTilt,
              baselinePosture: 75, // Default good posture baseline
              faceRegionBounds,
              skinToneReference: skinPixelCount > 0 ? skinToneSum / skinPixelCount : 128
            };

            console.log('✅ Calibration complete:', calibrationData);
            resolve(calibrationData);
          } else {
            console.log('❌ Calibration failed - no face detected');
            resolve(null);
          }
        }
      }, 100); // 10fps during calibration
    });
  }, []);

  // Enhanced eye contact analysis using facial landmarks
  const analyzeEyeContactWithLandmarks = (landmarks: any[], calibration: CalibrationData): number => {
    // Eye landmarks
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const currentEyePosition = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    };

    // Calculate deviation from baseline eye position
    const xDeviation = Math.abs(currentEyePosition.x - calibration.baselineEyePosition.x);
    const yDeviation = Math.abs(currentEyePosition.y - calibration.baselineEyePosition.y);
    
    // Eye contact score (lower deviation = better eye contact)
    const maxDeviation = 0.05; // 5% of frame
    const totalDeviation = Math.sqrt(xDeviation * xDeviation + yDeviation * yDeviation);
    const eyeContactScore = Math.max(0, 100 - (totalDeviation / maxDeviation) * 100);

    return Math.round(eyeContactScore);
  };

  // Enhanced posture analysis using facial landmarks
  const analyzePostureWithLandmarks = (landmarks: any[], calibration: CalibrationData): number => {
    // Head tilt analysis
    const noseTip = landmarks[1];
    const forehead = landmarks[10];
    const currentHeadTilt = Math.atan2(forehead.y - noseTip.y, forehead.x - noseTip.x);
    
    // Calculate tilt deviation from baseline
    const tiltDeviation = Math.abs(currentHeadTilt - calibration.baselineHeadTilt);
    const maxTiltDeviation = Math.PI / 6; // 30 degrees
    const tiltScore = Math.max(0, 100 - (tiltDeviation / maxTiltDeviation) * 50);

    // Face position in frame
    const faceCenter = {
      x: (landmarks[234].x + landmarks[454].x) / 2, // Left and right face edges
      y: (landmarks[10].y + landmarks[152].y) / 2   // Top and bottom of face
    };

    // Ideal position is center-upper (0.5, 0.35)
    const idealX = 0.5;
    const idealY = 0.35;
    const positionDeviation = Math.sqrt(
      Math.pow(faceCenter.x - idealX, 2) + Math.pow(faceCenter.y - idealY, 2)
    );
    
    const maxPositionDeviation = 0.3;
    const positionScore = Math.max(0, 100 - (positionDeviation / maxPositionDeviation) * 50);

    // Combine tilt and position scores
    const postureScore = (tiltScore * 0.6) + (positionScore * 0.4);
    
    return Math.round(postureScore);
  };

  // Blink detection and rate analysis
  const detectBlinks = (landmarks: any[]): number => {
    // Eye aspect ratio for blink detection
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];
    const leftEyeLeft = landmarks[33];
    const leftEyeRight = landmarks[133];

    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];
    const rightEyeLeft = landmarks[362];
    const rightEyeRight = landmarks[263];

    // Calculate eye aspect ratios
    const leftEAR = (
      Math.sqrt(Math.pow(leftEyeTop.x - leftEyeBottom.x, 2) + Math.pow(leftEyeTop.y - leftEyeBottom.y, 2)) /
      Math.sqrt(Math.pow(leftEyeLeft.x - leftEyeRight.x, 2) + Math.pow(leftEyeLeft.y - leftEyeRight.y, 2))
    );

    const rightEAR = (
      Math.sqrt(Math.pow(rightEyeTop.x - rightEyeBottom.x, 2) + Math.pow(rightEyeTop.y - rightEyeBottom.y, 2)) /
      Math.sqrt(Math.pow(rightEyeLeft.x - rightEyeRight.x, 2) + Math.pow(rightEyeLeft.y - rightEyeRight.y, 2))
    );

    const avgEAR = (leftEAR + rightEAR) / 2;
    const blinkThreshold = 0.2;

    // Detect blink
    if (avgEAR < blinkThreshold) {
      const now = Date.now();
      if (now - lastBlinkTime.current > 200) { // Minimum 200ms between blinks
        blinkHistory.current.push(now);
        lastBlinkTime.current = now;
        
        // Keep only last 60 seconds of blinks
        blinkHistory.current = blinkHistory.current.filter(time => now - time < 60000);
      }
    }

    // Calculate blinks per minute
    const blinksPerMinute = blinkHistory.current.length;
    
    // Normal blink rate is 12-20 per minute
    // Score: 100% for 12-20 blinks, lower for too few or too many
    let blinkScore = 100;
    if (blinksPerMinute < 8) {
      blinkScore = Math.max(50, 100 - (8 - blinksPerMinute) * 10);
    } else if (blinksPerMinute > 25) {
      blinkScore = Math.max(50, 100 - (blinksPerMinute - 25) * 5);
    }

    return blinkScore;
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
        const postureScore = analyzePostureWithLandmarks(landmarks, state.calibrationData!);
        const eyeContactScore = analyzeEyeContactWithLandmarks(landmarks, state.calibrationData!);
        const blinkScore = detectBlinks(landmarks);
        
        // Calculate head tilt
        const noseTip = landmarks[1];
        const forehead = landmarks[10];
        const headTilt = Math.atan2(forehead.y - noseTip.y, forehead.x - noseTip.x) * (180 / Math.PI);
        
        // Stability analysis (frame comparison)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const stabilityScore = analyzeStabilityForInterview(imageData);
        
        // Derived metrics
        const confidenceScore = Math.round((postureScore * 0.6) + (stabilityScore * 0.4));
        const engagementScore = Math.round((postureScore * 0.3) + (eyeContactScore * 0.4) + (stabilityScore * 0.2) + (blinkScore * 0.1));
        const gestureType = analyzeGesturesForInterview(stabilityScore);

        // Apply temporal smoothing
        const rawMetrics = {
          posture: postureScore,
          eyeContact: eyeContactScore,
          confidence: confidenceScore,
          stability: stabilityScore,
          engagement: engagementScore,
          blinkRate: blinkScore,
          headTilt: Math.abs(headTilt)
        };

        const smoothedMetrics = applyTemporalSmoothing(rawMetrics);

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
            headTilt: [...prev.metrics.headTilt, Math.abs(headTilt)]
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
    const { posture, eyeContact, gestures, confidence, stability, engagement, blinkRate, headTilt } = state.metrics;
    
    if (posture.length === 0) {
      return {
        averagePosture: 0,
        averageEyeContact: 0,
        averageConfidence: 0,
        averageStability: 0,
        averageEngagement: 0,
        averageBlinkRate: 0,
        averageHeadTilt: 0,
        gestureBreakdown: { composed: 0, natural: 0, animated: 0, restless: 0 },
        overallInterviewScore: 0,
        recommendations: [],
        totalSamples: 0
      };
    }
    
    const averagePosture = posture.reduce((a, b) => a + b, 0) / posture.length;
    const averageEyeContact = eyeContact.reduce((a, b) => a + b, 0) / eyeContact.length;
    const averageConfidence = confidence.reduce((a, b) => a + b, 0) / confidence.length;
    const averageStability = stability.reduce((a, b) => a + b, 0) / stability.length;
    const averageEngagement = engagement.reduce((a, b) => a + b, 0) / engagement.length;
    const averageBlinkRate = blinkRate.reduce((a, b) => a + b, 0) / blinkRate.length;
    const averageHeadTilt = headTilt.reduce((a, b) => a + b, 0) / headTilt.length;
    
    const gestureBreakdown = gestures.reduce((acc, gesture) => {
      acc[gesture as keyof typeof acc] = (acc[gesture as keyof typeof acc] || 0) + 1;
      return acc;
    }, { composed: 0, natural: 0, animated: 0, restless: 0 });
    
    // Enhanced overall score including new metrics
    const overallScore = (averagePosture * 0.25) + (averageEyeContact * 0.25) + 
                        (averageConfidence * 0.2) + (averageEngagement * 0.2) + (averageBlinkRate * 0.1);
    
    // Enhanced recommendations
    const recommendations = generateEnhancedRecommendations({
      posture: averagePosture,
      eyeContact: averageEyeContact,
      confidence: averageConfidence,
      stability: averageStability,
      engagement: averageEngagement,
      blinkRate: averageBlinkRate,
      headTilt: averageHeadTilt
    });
    
    return {
      averagePosture: Math.round(averagePosture),
      averageEyeContact: Math.round(averageEyeContact),
      averageConfidence: Math.round(averageConfidence),
      averageStability: Math.round(averageStability),
      averageEngagement: Math.round(averageEngagement),
      averageBlinkRate: Math.round(averageBlinkRate),
      averageHeadTilt: Math.round(averageHeadTilt),
      gestureBreakdown,
      overallInterviewScore: Math.round(overallScore),
      recommendations,
      totalSamples: posture.length
    };
  }, [state.metrics]);

  // Enhanced recommendations
  const generateEnhancedRecommendations = (averages: any) => {
    const recommendations = [];
    
    if (averages.posture < 70) {
      recommendations.push("Improve your posture by sitting up straighter and keeping your head level");
    }
    if (averages.eyeContact < 70) {
      recommendations.push("Look directly at the camera more often to maintain eye contact");
    }
    if (averages.stability < 70) {
      recommendations.push("Try to minimize fidgeting and maintain steady positioning");
    }
    if (averages.confidence < 70) {
      recommendations.push("Work on projecting confidence through better posture and stability");
    }
    if (averages.engagement < 70) {
      recommendations.push("Show more energy and presence during the conversation");
    }
    if (averages.blinkRate < 60) {
      recommendations.push("Try to blink more naturally - you may be staring too intensely");
    }
    if (averages.blinkRate > 80) {
      recommendations.push("Reduce excessive blinking - try to relax and stay calm");
    }
    if (averages.headTilt > 15) {
      recommendations.push("Keep your head more level and avoid tilting to one side");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Excellent interview presence! Your body language is professional and engaging.");
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
        headTilt: []
      },
      isCalibrated: false,
      calibrationData: null
    }));
    movementHistory.current = [];
    previousFrameData.current = null;
    blinkHistory.current = [];
    smoothedMetricsRef.current = {
      posture: 0,
      eyeContact: 0,
      confidence: 0,
      stability: 0,
      engagement: 0
    };
  }, []);

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