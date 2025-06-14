import { useState, useRef, useEffect, useCallback } from 'react';

interface VideoMetrics {
  posture: number[];
  eyeContact: number[];
  gestures: string[];
  timestamps: number[];
  confidence: number[];
  stability: number[];
  engagement: number[];
}

interface VideoAnalysisState {
  isRecording: boolean;
  hasPermission: boolean;
  videoStream: MediaStream | null;
  metrics: VideoMetrics;
  error: string | null;
}

interface FrameAnalysis {
  posture: number;
  eyeContact: number;
  gesture: string;
  confidence: number;
  stability: number;
  engagement: number;
}

export const useVideoAnalysis = () => {
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
      engagement: []
    },
    error: null
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousFrameData = useRef<ImageData | null>(null);
  const movementHistory = useRef<number[]>([]);

  // Request camera permission and start video stream
  const startVideoRecording = useCallback(async () => {
    try {
      console.log('📹 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log('✅ Camera access granted, stream:', stream);

      setState(prev => ({
        ...prev,
        videoStream: stream,
        hasPermission: true,
        isRecording: true,
        error: null
      }));

      if (videoRef.current) {
        console.log('📹 Setting video source and playing...');
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.error('❌ Video play failed:', err);
        });
      }

      // Start analysis interval (every 2 seconds for interview analysis)
      analysisIntervalRef.current = setInterval(() => {
        analyzeFrame();
      }, 2000);

    } catch (error) {
      console.error('❌ Camera access failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Camera permission denied or not available',
        hasPermission: false
      }));
    }
  }, []);

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

  // Advanced interview-focused frame analysis
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const analysis = analyzeImageDataForInterview(imageData);
    
    setState(prev => ({
      ...prev,
      metrics: {
        posture: [...prev.metrics.posture, analysis.posture],
        eyeContact: [...prev.metrics.eyeContact, analysis.eyeContact],
        gestures: [...prev.metrics.gestures, analysis.gesture],
        timestamps: [...prev.metrics.timestamps, Date.now()],
        confidence: [...prev.metrics.confidence, analysis.confidence],
        stability: [...prev.metrics.stability, analysis.stability],
        engagement: [...prev.metrics.engagement, analysis.engagement]
      }
    }));

    // Store current frame for next comparison
    previousFrameData.current = imageData;
  }, []);

  // Interview-specific image analysis
  const analyzeImageDataForInterview = (imageData: ImageData): FrameAnalysis => {
    const { width, height, data } = imageData;
    
    // 1. POSTURE ANALYSIS - Interview-specific
    const postureScore = analyzePostureForInterview(data, width, height);
    
    // 2. EYE CONTACT ANALYSIS - Center region focus
    const eyeContactScore = analyzeEyeContactForInterview(data, width, height);
    
    // 3. MOVEMENT/STABILITY ANALYSIS
    const stabilityScore = analyzeStabilityForInterview(imageData);
    
    // 4. CONFIDENCE ANALYSIS - Based on posture + stability
    const confidenceScore = analyzeConfidenceForInterview(postureScore, stabilityScore);
    
    // 5. ENGAGEMENT ANALYSIS - Overall presence
    const engagementScore = analyzeEngagementForInterview(postureScore, eyeContactScore, stabilityScore);
    
    // 6. GESTURE ANALYSIS - Hand movement patterns
    const gestureType = analyzeGesturesForInterview(stabilityScore);

    return {
      posture: postureScore,
      eyeContact: eyeContactScore,
      gesture: gestureType,
      confidence: confidenceScore,
      stability: stabilityScore,
      engagement: engagementScore
    };
  };

  // Interview-specific posture analysis
  const analyzePostureForInterview = (data: Uint8ClampedArray, width: number, height: number): number => {
    // Analyze upper body positioning for professional appearance
    const upperThird = height / 3;
    const middleThird = height * 2 / 3;
    
    let upperBrightness = 0;
    let middleBrightness = 0;
    let lowerBrightness = 0;
    let centerWeightedBrightness = 0;
    
    const centerStart = width * 0.3;
    const centerEnd = width * 0.7;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Weight center region more heavily (where face/shoulders should be)
        const isCenter = x >= centerStart && x <= centerEnd;
        const weight = isCenter ? 2 : 1;
        
        if (y < upperThird) {
          upperBrightness += brightness * weight;
        } else if (y < middleThird) {
          middleBrightness += brightness * weight;
          if (isCenter) centerWeightedBrightness += brightness;
        } else {
          lowerBrightness += brightness * weight;
        }
      }
    }
    
    // Good interview posture: strong upper/middle presence, centered
    const upperMiddleRatio = (upperBrightness + middleBrightness) / (lowerBrightness + 1);
    const centeringScore = centerWeightedBrightness / (middleBrightness + 1);
    
    // Score based on professional positioning
    let score = 50; // Base score
    score += Math.min(30, upperMiddleRatio * 5); // Upper body presence
    score += Math.min(20, centeringScore * 10); // Centered positioning
    
    return Math.min(100, Math.max(0, score));
  };

  // Interview-specific eye contact analysis
  const analyzeEyeContactForInterview = (data: Uint8ClampedArray, width: number, height: number): number => {
    // Focus on the center-upper region where eyes would be during video calls
    const centerX = width / 2;
    const centerY = height * 0.35; // Slightly above center for typical webcam angle
    const eyeRegionSize = Math.min(width, height) / 6;
    
    let eyeRegionBrightness = 0;
    let eyeRegionPixels = 0;
    let faceRegionBrightness = 0;
    let faceRegionPixels = 0;
    
    // Analyze eye region (smaller, focused area)
    for (let y = centerY - eyeRegionSize; y < centerY + eyeRegionSize; y++) {
      for (let x = centerX - eyeRegionSize; x < centerX + eyeRegionSize; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (Math.floor(y) * width + Math.floor(x)) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          eyeRegionBrightness += brightness;
          eyeRegionPixels++;
        }
      }
    }
    
    // Analyze broader face region for comparison
    const faceRegionSize = eyeRegionSize * 2;
    for (let y = centerY - faceRegionSize; y < centerY + faceRegionSize; y++) {
      for (let x = centerX - faceRegionSize; x < centerX + faceRegionSize; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (Math.floor(y) * width + Math.floor(x)) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          faceRegionBrightness += brightness;
          faceRegionPixels++;
        }
      }
    }
    
    if (eyeRegionPixels === 0 || faceRegionPixels === 0) return 50;
    
    const eyeAvg = eyeRegionBrightness / eyeRegionPixels;
    const faceAvg = faceRegionBrightness / faceRegionPixels;
    
    // Good eye contact: face present in center, consistent brightness indicating forward gaze
    const facePresence = Math.min(100, faceAvg / 2);
    const eyeFocus = Math.min(100, eyeAvg / 1.5);
    
    return Math.round((facePresence * 0.6 + eyeFocus * 0.4));
  };

  // Interview stability analysis (minimal fidgeting)
  const analyzeStabilityForInterview = (currentFrame: ImageData): number => {
    if (!previousFrameData.current) {
      return 85; // Default good stability for first frame
    }
    
    const current = currentFrame.data;
    const previous = previousFrameData.current.data;
    let totalDifference = 0;
    let significantChanges = 0;
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < current.length; i += 16) {
      const currentBrightness = (current[i] + current[i + 1] + current[i + 2]) / 3;
      const previousBrightness = (previous[i] + previous[i + 1] + previous[i + 2]) / 3;
      const difference = Math.abs(currentBrightness - previousBrightness);
      
      totalDifference += difference;
      if (difference > 15) significantChanges++; // Threshold for significant movement
    }
    
    const avgDifference = totalDifference / (current.length / 16);
    movementHistory.current.push(avgDifference);
    
    // Keep only last 10 measurements
    if (movementHistory.current.length > 10) {
      movementHistory.current.shift();
    }
    
    // Calculate stability score (lower movement = higher stability)
    const recentMovement = movementHistory.current.reduce((a, b) => a + b, 0) / movementHistory.current.length;
    const stabilityScore = Math.max(0, 100 - (recentMovement * 2) - (significantChanges * 5));
    
    return Math.round(stabilityScore);
  };

  // Interview confidence analysis
  const analyzeConfidenceForInterview = (posture: number, stability: number): number => {
    // Confidence = good posture + stability + consistency
    const postureWeight = 0.6;
    const stabilityWeight = 0.4;
    
    const baseConfidence = (posture * postureWeight) + (stability * stabilityWeight);
    
    // Bonus for consistent good performance
    const recentPosture = state.metrics.posture.slice(-5);
    const recentStability = state.metrics.stability.slice(-5);
    
    if (recentPosture.length >= 3) {
      const postureConsistency = recentPosture.every(score => score > 70);
      const stabilityConsistency = recentStability.every(score => score > 70);
      
      if (postureConsistency && stabilityConsistency) {
        return Math.min(100, baseConfidence + 10); // Consistency bonus
      }
    }
    
    return Math.round(baseConfidence);
  };

  // Interview engagement analysis
  const analyzeEngagementForInterview = (posture: number, eyeContact: number, stability: number): number => {
    // Engagement = presence + attention + energy
    const weights = { posture: 0.4, eyeContact: 0.4, stability: 0.2 };
    
    const engagementScore = 
      (posture * weights.posture) + 
      (eyeContact * weights.eyeContact) + 
      (stability * weights.stability);
    
    return Math.round(engagementScore);
  };

  // Interview gesture analysis
  const analyzeGesturesForInterview = (stability: number): string => {
    if (stability > 80) return 'composed'; // Very stable = composed
    if (stability > 60) return 'natural'; // Moderate movement = natural gestures
    if (stability > 40) return 'animated'; // More movement = animated
    return 'restless'; // High movement = restless/fidgeting
  };

  // Calculate interview-focused summary metrics
  const getSummaryMetrics = useCallback(() => {
    const { posture, eyeContact, gestures, confidence, stability, engagement } = state.metrics;
    
    if (posture.length === 0) {
      return {
        averagePosture: 0,
        averageEyeContact: 0,
        averageConfidence: 0,
        averageStability: 0,
        averageEngagement: 0,
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
    
    const gestureBreakdown = gestures.reduce((acc, gesture) => {
      acc[gesture as keyof typeof acc] = (acc[gesture as keyof typeof acc] || 0) + 1;
      return acc;
    }, { composed: 0, natural: 0, animated: 0, restless: 0 });
    
    // Calculate overall interview performance score
    const overallScore = (averagePosture * 0.25) + (averageEyeContact * 0.25) + 
                        (averageConfidence * 0.25) + (averageEngagement * 0.25);
    
    // Generate recommendations
    const recommendations = generateInterviewRecommendations({
      posture: averagePosture,
      eyeContact: averageEyeContact,
      confidence: averageConfidence,
      stability: averageStability,
      engagement: averageEngagement
    });
    
    return {
      averagePosture: Math.round(averagePosture),
      averageEyeContact: Math.round(averageEyeContact),
      averageConfidence: Math.round(averageConfidence),
      averageStability: Math.round(averageStability),
      averageEngagement: Math.round(averageEngagement),
      gestureBreakdown,
      overallInterviewScore: Math.round(overallScore),
      recommendations,
      totalSamples: posture.length
    };
  }, [state.metrics]);

  // Generate interview-specific recommendations
  const generateInterviewRecommendations = (averages: any) => {
    const recommendations = [];
    
    if (averages.posture < 70) {
      recommendations.push("Sit up straighter and center yourself in the camera frame");
    }
    if (averages.eyeContact < 70) {
      recommendations.push("Look directly at the camera more often to simulate eye contact");
    }
    if (averages.stability < 70) {
      recommendations.push("Try to minimize fidgeting and excessive movement");
    }
    if (averages.confidence < 70) {
      recommendations.push("Work on maintaining consistent, confident body language");
    }
    if (averages.engagement < 70) {
      recommendations.push("Show more energy and presence during the conversation");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Excellent interview presence! Keep up the great work.");
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
        engagement: []
      }
    }));
    movementHistory.current = [];
    previousFrameData.current = null;
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
    getSummaryMetrics,
    resetMetrics
  };
};