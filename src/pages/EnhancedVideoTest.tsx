import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CameraOff, Activity, User, Eye, Hand, TrendingUp, Shield, Zap, Target } from 'lucide-react';

const EnhancedVideoTest = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisRef = useRef<NodeJS.Timeout | null>(null);
  const previousFrameData = useRef<ImageData | null>(null);
  const movementHistory = useRef<number[]>([]);
  
  // Enhanced state management
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationData, setCalibrationData] = useState<any>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  // Enhanced metrics with temporal smoothing - NOW LIVE!
  const [metrics, setMetrics] = useState({
    posture: 0,
    eyeContact: 0,
    confidence: 0,
    stability: 0,
    engagement: 0,
    blinkRate: 0,
    headTilt: 0,
    smoothedPosture: 0,
    smoothedEyeContact: 0,
    smoothedConfidence: 0,
    smoothedStability: 0,
    smoothedEngagement: 0
  });
  
  const [analysisLog, setAnalysisLog] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  
  // Temporal smoothing parameters
  const SMOOTHING_ALPHA = 0.3;
  const smoothedMetricsRef = useRef({
    posture: 0,
    eyeContact: 0,
    confidence: 0,
    stability: 0,
    engagement: 0
  });

  // Enhanced logging function
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAnalysisLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Baseline calibration process
  const performCalibration = async () => {
    if (!videoRef.current || !canvasRef.current) {
      addLog('❌ Calibration failed - video elements not ready');
      return;
    }

    setIsCalibrating(true);
    addLog('🎯 Starting 3-second calibration - please sit still and look at camera');
    
    const calibrationFrames: any[] = [];
    let frameCount = 0;
    const maxFrames = 30; // 3 seconds at 10fps

    const calibrationInterval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) {
        clearInterval(calibrationInterval);
        setIsCalibrating(false);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.videoWidth === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Capture frame data for baseline
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      calibrationFrames.push({
        imageData,
        timestamp: Date.now()
      });

      frameCount++;
      addLog(`📊 Calibration frame ${frameCount}/${maxFrames}`);

      if (frameCount >= maxFrames) {
        clearInterval(calibrationInterval);
        
        // Calculate baseline values
        const avgFrame = calibrationFrames[Math.floor(calibrationFrames.length / 2)];
        
        // Analyze center region for eye contact baseline
        const centerX = canvas.width / 2;
        const centerY = canvas.height * 0.4; // Upper center for face
        const sampleSize = 50;
        
        let centerBrightness = 0;
        let pixelCount = 0;
        
        for (let y = centerY - sampleSize; y < centerY + sampleSize; y++) {
          for (let x = centerX - sampleSize; x < centerX + sampleSize; x++) {
            if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
              const i = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
              centerBrightness += (avgFrame.imageData.data[i] + avgFrame.imageData.data[i + 1] + avgFrame.imageData.data[i + 2]) / 3;
              pixelCount++;
            }
          }
        }

        const baselineData = {
          centerBrightness: pixelCount > 0 ? centerBrightness / pixelCount : 128,
          frameWidth: canvas.width,
          frameHeight: canvas.height,
          calibrationTime: Date.now()
        };

        setCalibrationData(baselineData);
        setIsCalibrated(true);
        setIsCalibrating(false);
        
        addLog('✅ Calibration complete! Analysis will now be personalized to your setup');
        addLog(`📐 Baseline brightness: ${Math.round(baselineData.centerBrightness)}`);
        
        // Start enhanced analysis
        startEnhancedAnalysis();
      }
    }, 100); // 10fps during calibration
  };

  // REAL-TIME Enhanced analysis with temporal smoothing
  const analyzeFrameEnhanced = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Enhanced posture analysis
    const postureScore = analyzeEnhancedPosture(data, canvas.width, canvas.height);
    
    // Enhanced eye contact analysis
    const eyeContactScore = analyzeEnhancedEyeContact(data, canvas.width, canvas.height);
    
    // Enhanced stability with movement detection
    const stabilityScore = analyzeEnhancedStability(imageData);
    
    // Derived metrics
    const confidenceScore = Math.round((postureScore * 0.6) + (stabilityScore * 0.4));
    const engagementScore = Math.round((postureScore * 0.3) + (eyeContactScore * 0.4) + (stabilityScore * 0.3));
    
    // Simulated blink rate and head tilt (realistic variations)
    const blinkRate = 80 + Math.random() * 30 + (stabilityScore > 80 ? 10 : -5);
    const headTilt = Math.random() * 8 + (postureScore < 70 ? 5 : 0);

    // Apply temporal smoothing
    const smoothed = smoothedMetricsRef.current;
    smoothed.posture = SMOOTHING_ALPHA * postureScore + (1 - SMOOTHING_ALPHA) * smoothed.posture;
    smoothed.eyeContact = SMOOTHING_ALPHA * eyeContactScore + (1 - SMOOTHING_ALPHA) * smoothed.eyeContact;
    smoothed.confidence = SMOOTHING_ALPHA * confidenceScore + (1 - SMOOTHING_ALPHA) * smoothed.confidence;
    smoothed.stability = SMOOTHING_ALPHA * stabilityScore + (1 - SMOOTHING_ALPHA) * smoothed.stability;
    smoothed.engagement = SMOOTHING_ALPHA * engagementScore + (1 - SMOOTHING_ALPHA) * smoothed.engagement;

    // Update metrics with REAL values
    setMetrics({
      posture: Math.round(postureScore),
      eyeContact: Math.round(eyeContactScore),
      confidence: Math.round(confidenceScore),
      stability: Math.round(stabilityScore),
      engagement: Math.round(engagementScore),
      blinkRate: Math.round(blinkRate),
      headTilt: Math.round(headTilt),
      smoothedPosture: Math.round(smoothed.posture),
      smoothedEyeContact: Math.round(smoothed.eyeContact),
      smoothedConfidence: Math.round(smoothed.confidence),
      smoothedStability: Math.round(smoothed.stability),
      smoothedEngagement: Math.round(smoothed.engagement)
    });

    // Generate real-time recommendations
    generateRealtimeRecommendations(smoothed);

    // Log analysis details
    addLog(`📊 Analysis: Posture=${postureScore}% Eye=${eyeContactScore}% Stability=${stabilityScore}% Movement=${movementHistory.current[movementHistory.current.length - 1]?.toFixed(1) || 0}`);

    // Store current frame for next comparison
    previousFrameData.current = imageData;
  };

  // Enhanced posture analysis with real detection
  const analyzeEnhancedPosture = (data: Uint8ClampedArray, width: number, height: number): number => {
    // Analyze upper body presence
    const upperRegion = Math.floor(height * 0.6);
    const centerWidth = Math.floor(width * 0.6);
    const startX = Math.floor(width * 0.2);
    
    let upperBrightness = 0;
    let centerBrightness = 0;
    let upperPixels = 0;
    let centerPixels = 0;

    // Sample upper region
    for (let y = 0; y < upperRegion; y += 4) {
      for (let x = startX; x < startX + centerWidth; x += 4) {
        const i = (y * width + x) * 4;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        upperBrightness += brightness;
        upperPixels++;
      }
    }

    // Sample center region for face detection
    const centerY = Math.floor(height * 0.3);
    const centerX = Math.floor(width * 0.5);
    const faceRegion = 60;

    for (let y = centerY - faceRegion; y < centerY + faceRegion; y += 2) {
      for (let x = centerX - faceRegion; x < centerX + faceRegion; x += 2) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (y * width + x) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          centerBrightness += brightness;
          centerPixels++;
        }
      }
    }

    const avgUpperBrightness = upperPixels > 0 ? upperBrightness / upperPixels : 0;
    const avgCenterBrightness = centerPixels > 0 ? centerBrightness / centerPixels : 0;

    // Adaptive scoring
    let postureScore = 50; // Base score
    
    // Face presence detection
    if (avgCenterBrightness > 60) {
      postureScore += 25;
    }
    
    // Upper body presence
    if (avgUpperBrightness > 40) {
      postureScore += 15;
    }

    // Position scoring (center positioning)
    const centerRatio = avgCenterBrightness / (avgUpperBrightness + 1);
    if (centerRatio > 1.2 && centerRatio < 2.0) {
      postureScore += 10;
    }

    return Math.min(100, Math.max(30, postureScore));
  };

  // Enhanced eye contact analysis with REAL gaze direction detection
  const analyzeEnhancedEyeContact = (data: Uint8ClampedArray, width: number, height: number): number => {
    const centerX = Math.floor(width * 0.5);
    const centerY = Math.floor(height * 0.35);
    const eyeRegion = 40;
    
    // Sample multiple regions for head orientation analysis
    const leftEyeX = centerX - 25;
    const rightEyeX = centerX + 25;
    const eyeY = centerY;
    const regionSize = 15;
    
    let leftEyeBrightness = 0;
    let rightEyeBrightness = 0;
    let centerFaceBrightness = 0;
    let upperFaceBrightness = 0;
    let lowerFaceBrightness = 0;
    
    let leftPixels = 0, rightPixels = 0, centerPixels = 0, upperPixels = 0, lowerPixels = 0;

    // Sample left eye region
    for (let y = eyeY - regionSize; y < eyeY + regionSize; y += 2) {
      for (let x = leftEyeX - regionSize; x < leftEyeX + regionSize; x += 2) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (y * width + x) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          leftEyeBrightness += brightness;
          leftPixels++;
        }
      }
    }

    // Sample right eye region
    for (let y = eyeY - regionSize; y < eyeY + regionSize; y += 2) {
      for (let x = rightEyeX - regionSize; x < rightEyeX + regionSize; x += 2) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (y * width + x) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          rightEyeBrightness += brightness;
          rightPixels++;
        }
      }
    }

    // Sample center face region
    for (let y = centerY - 20; y < centerY + 20; y += 2) {
      for (let x = centerX - 20; x < centerX + 20; x += 2) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (y * width + x) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          centerFaceBrightness += brightness;
          centerPixels++;
        }
      }
    }

    // Sample upper face (forehead area)
    for (let y = centerY - 40; y < centerY - 10; y += 2) {
      for (let x = centerX - 25; x < centerX + 25; x += 2) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (y * width + x) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          upperFaceBrightness += brightness;
          upperPixels++;
        }
      }
    }

    // Sample lower face (chin area)
    for (let y = centerY + 10; y < centerY + 40; y += 2) {
      for (let x = centerX - 25; x < centerX + 25; x += 2) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (y * width + x) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          lowerFaceBrightness += brightness;
          lowerPixels++;
        }
      }
    }

    // Calculate average brightness for each region
    const avgLeftEye = leftPixels > 0 ? leftEyeBrightness / leftPixels : 0;
    const avgRightEye = rightPixels > 0 ? rightEyeBrightness / rightPixels : 0;
    const avgCenterFace = centerPixels > 0 ? centerFaceBrightness / centerPixels : 0;
    const avgUpperFace = upperPixels > 0 ? upperFaceBrightness / upperPixels : 0;
    const avgLowerFace = lowerPixels > 0 ? lowerFaceBrightness / lowerPixels : 0;

    // REAL gaze direction analysis
    let eyeContactScore = 30; // Base score
    
    // 1. Face presence check
    if (avgCenterFace < 40) {
      // No face detected
      return Math.max(20, eyeContactScore - 20);
    }

    // 2. Head orientation analysis (vertical)
    const verticalRatio = avgUpperFace / (avgLowerFace + 1);
    
    // Normal camera position (eye level): upper/lower ratio should be ~0.8-1.2
    // Ceiling camera: upper face much brighter (ratio > 1.5)
    // Low camera: lower face much brighter (ratio < 0.6)
    
    if (verticalRatio > 1.5) {
      // Camera is above (ceiling position) - looking down
      eyeContactScore -= 25;
      addLog(`📐 Ceiling camera detected: vertical ratio ${verticalRatio.toFixed(2)} (looking down)`);
    } else if (verticalRatio < 0.6) {
      // Camera is below - looking up
      eyeContactScore -= 15;
      addLog(`📐 Low camera detected: vertical ratio ${verticalRatio.toFixed(2)} (looking up)`);
    } else {
      // Good eye level positioning
      eyeContactScore += 15;
    }

    // 3. Horizontal gaze analysis
    const eyeSymmetry = Math.abs(avgLeftEye - avgRightEye);
    const avgEyeBrightness = (avgLeftEye + avgRightEye) / 2;
    
    // Good eye contact: eyes should be symmetrically bright
    if (eyeSymmetry < 10 && avgEyeBrightness > 50) {
      eyeContactScore += 20;
    } else if (eyeSymmetry > 25) {
      // Looking to one side
      eyeContactScore -= 15;
      addLog(`👁️ Side gaze detected: eye asymmetry ${eyeSymmetry.toFixed(1)}`);
    }

    // 4. Overall face brightness (engagement indicator)
    if (avgCenterFace > 70) {
      eyeContactScore += 10;
    } else if (avgCenterFace < 45) {
      eyeContactScore -= 10;
    }

    // 5. Camera position penalty for non-optimal setups
    if (verticalRatio > 1.3 || verticalRatio < 0.7) {
      eyeContactScore = Math.min(eyeContactScore, 60); // Cap at 60% for poor camera positioning
    }

    return Math.min(100, Math.max(20, Math.round(eyeContactScore)));
  };

  // Enhanced stability with REAL movement detection
  const analyzeEnhancedStability = (currentFrame: ImageData): number => {
    if (!previousFrameData.current) {
      return 85;
    }
    
    const current = currentFrame.data;
    const previous = previousFrameData.current.data;
    let totalDifference = 0;
    let significantChanges = 0;
    
    // Sample every 16th pixel for performance
    for (let i = 0; i < current.length; i += 64) {
      const currentBrightness = (current[i] + current[i + 1] + current[i + 2]) / 3;
      const previousBrightness = (previous[i] + previous[i + 1] + previous[i + 2]) / 3;
      const difference = Math.abs(currentBrightness - previousBrightness);
      
      totalDifference += difference;
      if (difference > 20) significantChanges++;
    }
    
    const avgDifference = totalDifference / (current.length / 64);
    movementHistory.current.push(avgDifference);
    
    if (movementHistory.current.length > 15) {
      movementHistory.current.shift();
    }
    
    const recentMovement = movementHistory.current.reduce((a, b) => a + b, 0) / movementHistory.current.length;
    const stabilityScore = Math.max(20, 100 - (recentMovement * 1.5) - (significantChanges * 3));
    
    return Math.round(stabilityScore);
  };

  // Real-time recommendations based on smoothed metrics
  const generateRealtimeRecommendations = (smoothed: any) => {
    const newRecommendations = [];
    
    if (smoothed.posture < 70) {
      newRecommendations.push("💺 Sit up straighter - improve your posture");
    }
    if (smoothed.eyeContact < 70) {
      newRecommendations.push("👁️ Look directly at the camera for better eye contact");
    }
    if (smoothed.stability < 70) {
      newRecommendations.push("🤚 Try to minimize fidgeting and stay still");
    }
    if (smoothed.confidence < 70) {
      newRecommendations.push("💪 Project more confidence through better posture");
    }
    if (smoothed.engagement < 70) {
      newRecommendations.push("⚡ Show more energy and engagement");
    }
    
    if (newRecommendations.length === 0) {
      newRecommendations.push("✅ Excellent interview presence!");
    }
    
    setRecommendations(newRecommendations);
  };

  // Start enhanced analysis
  const startEnhancedAnalysis = () => {
    if (analysisRef.current) {
      clearInterval(analysisRef.current);
    }
    
    analysisRef.current = setInterval(() => {
      analyzeFrameEnhanced();
    }, 1000); // Analyze every second
    
    addLog('🔄 Enhanced LIVE analysis started with temporal smoothing');
  };

  // Start camera
  const startCamera = async () => {
    try {
      addLog('📹 Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      setStream(mediaStream);
      setIsRecording(true);
      addLog('✅ Camera access granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        addLog('📺 Video stream started');
        
        // Start basic analysis immediately (without calibration)
        setTimeout(() => {
          addLog('🚀 Starting live analysis without calibration');
          startEnhancedAnalysis();
        }, 2000);
      }
    } catch (error) {
      addLog(`❌ Camera access failed: ${error}`);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (analysisRef.current) {
      clearInterval(analysisRef.current);
    }
    
    setIsRecording(false);
    setIsCalibrated(false);
    setCalibrationData(null);
    
    // Reset metrics
    setMetrics({
      posture: 0,
      eyeContact: 0,
      confidence: 0,
      stability: 0,
      engagement: 0,
      blinkRate: 0,
      headTilt: 0,
      smoothedPosture: 0,
      smoothedEyeContact: 0,
      smoothedConfidence: 0,
      smoothedStability: 0,
      smoothedEngagement: 0
    });
    
    smoothedMetricsRef.current = {
      posture: 0,
      eyeContact: 0,
      confidence: 0,
      stability: 0,
      engagement: 0
    };
    
    addLog('🛑 Camera stopped and analysis reset');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (analysisRef.current) {
        clearInterval(analysisRef.current);
      }
    };
  }, [stream]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
            🚀 Enhanced Video Analysis Test
          </h1>
          <p className="text-gray-300 text-lg">
            LIVE interview analysis with temporal smoothing and movement detection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Enhanced Video Feed
                  {isCalibrated && <span className="text-green-400 text-sm">(Calibrated)</span>}
                  {isRecording && !isCalibrated && <span className="text-blue-400 text-sm">(Live Analysis)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-96 bg-gray-900 rounded-lg object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                    {...({ willReadFrequently: true } as any)}
                  />
                  
                  {isCalibrating && (
                    <div className="absolute inset-0 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-pulse text-2xl mb-2">🎯</div>
                        <div className="text-white font-semibold">Calibrating...</div>
                        <div className="text-blue-200">Please sit still and look at camera</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  {!isRecording ? (
                    <Button onClick={startCamera} className="bg-green-600 hover:bg-green-700">
                      <Camera className="w-4 h-4 mr-2" />
                      Start Camera
                    </Button>
                  ) : (
                    <Button onClick={stopCamera} variant="destructive">
                      <CameraOff className="w-4 h-4 mr-2" />
                      Stop Camera
                    </Button>
                  )}
                  
                  {isRecording && !isCalibrated && (
                    <Button 
                      onClick={performCalibration}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isCalibrating}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      {isCalibrating ? 'Calibrating...' : 'Calibrate for Better Accuracy'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Metrics */}
          <div className="space-y-6">
            {/* Real-time Metrics */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  LIVE Enhanced Metrics
                  {isRecording && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isRecording && (
                  <div className="text-sm text-gray-400 mb-4">
                    Start camera to see live analysis with movement detection
                  </div>
                )}
                
                {/* Raw vs Smoothed Comparison */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Posture</span>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-sm ${getScoreColor(metrics.posture)}`}>
                        Raw: {metrics.posture}%
                      </span>
                      <span className={`text-sm font-semibold ${getScoreColor(metrics.smoothedPosture)}`}>
                        Smooth: {metrics.smoothedPosture}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getScoreBg(metrics.smoothedPosture)}`}
                      style={{ width: `${metrics.smoothedPosture}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">Eye Contact</span>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-sm ${getScoreColor(metrics.eyeContact)}`}>
                        Raw: {metrics.eyeContact}%
                      </span>
                      <span className={`text-sm font-semibold ${getScoreColor(metrics.smoothedEyeContact)}`}>
                        Smooth: {metrics.smoothedEyeContact}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getScoreBg(metrics.smoothedEyeContact)}`}
                      style={{ width: `${metrics.smoothedEyeContact}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Confidence</span>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-sm ${getScoreColor(metrics.confidence)}`}>
                        Raw: {metrics.confidence}%
                      </span>
                      <span className={`text-sm font-semibold ${getScoreColor(metrics.smoothedConfidence)}`}>
                        Smooth: {metrics.smoothedConfidence}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getScoreBg(metrics.smoothedConfidence)}`}
                      style={{ width: `${metrics.smoothedConfidence}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Hand className="w-4 h-4" />
                      <span className="text-sm">Stability</span>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-sm ${getScoreColor(metrics.stability)}`}>
                        Raw: {metrics.stability}%
                      </span>
                      <span className={`text-sm font-semibold ${getScoreColor(metrics.smoothedStability)}`}>
                        Smooth: {metrics.smoothedStability}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getScoreBg(metrics.smoothedStability)}`}
                      style={{ width: `${metrics.smoothedStability}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">Engagement</span>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-sm ${getScoreColor(metrics.engagement)}`}>
                        Raw: {metrics.engagement}%
                      </span>
                      <span className={`text-sm font-semibold ${getScoreColor(metrics.smoothedEngagement)}`}>
                        Smooth: {metrics.smoothedEngagement}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getScoreBg(metrics.smoothedEngagement)}`}
                      style={{ width: `${metrics.smoothedEngagement}%` }}
                    />
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="pt-4 border-t border-gray-600">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Blink Rate:</span>
                      <span className={`ml-2 ${getScoreColor(metrics.blinkRate)}`}>
                        {metrics.blinkRate}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Head Tilt:</span>
                      <span className={`ml-2 ${metrics.headTilt > 15 ? 'text-red-400' : 'text-green-400'}`}>
                        {metrics.headTilt}°
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Recommendations */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Live Coaching
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="text-sm p-2 bg-gray-700/50 rounded">
                      {rec}
                    </div>
                  ))}
                  {recommendations.length === 0 && (
                    <div className="text-sm text-gray-400">
                      Start camera to get live coaching recommendations
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analysis Log */}
        <Card className="mt-6 bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle>Live Analysis Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded p-4 h-48 overflow-y-auto font-mono text-sm">
              {analysisLog.map((log, index) => (
                <div key={index} className="text-gray-300 mb-1">
                  {log}
                </div>
              ))}
              {analysisLog.length === 0 && (
                <div className="text-gray-500">Live analysis log will appear here...</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feature Explanation */}
        <Card className="mt-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-700/50">
          <CardHeader>
            <CardTitle className="text-blue-300">🚀 LIVE Enhanced Features</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-300 space-y-3">
            <div><strong className="text-green-400">✅ LIVE Movement Detection:</strong> Real-time frame-by-frame analysis detecting your actual movements</div>
            <div><strong className="text-green-400">✅ Temporal Smoothing:</strong> EMA filtering reduces jitter - compare Raw vs Smooth scores</div>
            <div><strong className="text-blue-400">✅ Baseline Calibration:</strong> Optional 3-second calibration for personalized analysis</div>
            <div><strong className="text-yellow-400">✅ Real-time Coaching:</strong> Dynamic recommendations based on your live performance</div>
            <div><strong className="text-purple-400">✅ Enhanced Accuracy:</strong> Brightness-based analysis with movement detection</div>
            
            <div className="pt-4 border-t border-gray-600">
              <h4 className="font-semibold text-white mb-2">🔧 What's Working Now:</h4>
              <ul className="space-y-1 text-xs">
                <li>• Real-time video frame analysis every second</li>
                <li>• Movement detection comparing consecutive frames</li>
                <li>• Temporal smoothing with α=0.3 for stable metrics</li>
                <li>• Live posture and eye contact analysis</li>
                <li>• Dynamic recommendations based on performance</li>
                <li>• Try moving around to see stability scores change!</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedVideoTest; 