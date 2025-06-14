import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CameraOff, Activity, User, Eye, Hand, TrendingUp, Shield, Zap } from 'lucide-react';

const VideoTest = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisRef = useRef<NodeJS.Timeout | null>(null);
  const previousFrameData = useRef<ImageData | null>(null);
  const movementHistory = useRef<number[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    posture: 0,
    eyeContact: 0,
    confidence: 0,
    stability: 0,
    engagement: 0,
    brightness: 0
  });
  const [frameCount, setFrameCount] = useState(0);
  const [analysisLog, setAnalysisLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setAnalysisLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startVideo = async () => {
    try {
      addLog('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      setStream(mediaStream);
      setError(null);
      addLog('✅ Camera access granted');
      setIsRecording(true);

      if (videoRef.current) {
        addLog('📹 Setting video source...');
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(err => {
          addLog(`❌ Video play failed: ${err}`);
        });
        addLog('✅ Video stream started');
      }
    } catch (err) {
      const errorMsg = `Camera error: ${err}`;
      setError(errorMsg);
      addLog(`❌ ${errorMsg}`);
    }
  };

  const stopVideo = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (analysisRef.current) {
      clearTimeout(analysisRef.current);
      analysisRef.current = null;
    }
    setIsRecording(false);
    addLog('🛑 Video stopped');
  };

  // Interview-specific posture analysis
  const analyzePostureForInterview = (data: Uint8ClampedArray, width: number, height: number): number => {
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
    
    const upperMiddleRatio = (upperBrightness + middleBrightness) / (lowerBrightness + 1);
    const centeringScore = centerWeightedBrightness / (middleBrightness + 1);
    
    let score = 50;
    score += Math.min(30, upperMiddleRatio * 5);
    score += Math.min(20, centeringScore * 10);
    
    return Math.min(100, Math.max(0, score));
  };

  // Interview-specific eye contact analysis
  const analyzeEyeContactForInterview = (data: Uint8ClampedArray, width: number, height: number): number => {
    const centerX = width / 2;
    const centerY = height * 0.35;
    const eyeRegionSize = Math.min(width, height) / 6;
    
    let eyeRegionBrightness = 0;
    let eyeRegionPixels = 0;
    let faceRegionBrightness = 0;
    let faceRegionPixels = 0;
    
    // Analyze eye region
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
    
    // Analyze broader face region
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
    
    const facePresence = Math.min(100, faceAvg / 2);
    const eyeFocus = Math.min(100, eyeAvg / 1.5);
    
    return Math.round((facePresence * 0.6 + eyeFocus * 0.4));
  };

  // Interview stability analysis
  const analyzeStabilityForInterview = (currentFrame: ImageData): number => {
    if (!previousFrameData.current) {
      return 85;
    }
    
    const current = currentFrame.data;
    const previous = previousFrameData.current.data;
    let totalDifference = 0;
    let significantChanges = 0;
    
    for (let i = 0; i < current.length; i += 16) {
      const currentBrightness = (current[i] + current[i + 1] + current[i + 2]) / 3;
      const previousBrightness = (previous[i] + previous[i + 1] + previous[i + 2]) / 3;
      const difference = Math.abs(currentBrightness - previousBrightness);
      
      totalDifference += difference;
      if (difference > 15) significantChanges++;
    }
    
    const avgDifference = totalDifference / (current.length / 16);
    movementHistory.current.push(avgDifference);
    
    if (movementHistory.current.length > 10) {
      movementHistory.current.shift();
    }
    
    const recentMovement = movementHistory.current.reduce((a, b) => a + b, 0) / movementHistory.current.length;
    const stabilityScore = Math.max(0, 100 - (recentMovement * 2) - (significantChanges * 5));
    
    return Math.round(stabilityScore);
  };

  // Ensure video stream is connected when it changes
  useEffect(() => {
    if (stream && videoRef.current) {
      addLog('📹 Connecting stream to video element...');
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        addLog(`❌ Video play failed in useEffect: ${err}`);
      });

      setTimeout(() => {
        addLog('🔄 Starting interview analysis loop...');
        
        const analyze = () => {
          if (!stream || !videoRef.current || !canvasRef.current) {
            addLog(`⚠️ Analysis skipped - stream:${!!stream}, video:${!!videoRef.current}, canvas:${!!canvasRef.current}`);
            return;
          }

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');

          if (!ctx || video.videoWidth === 0) {
            addLog(`⚠️ Analysis skipped - ctx:${!!ctx}, videoWidth:${video.videoWidth}`);
            return;
          }

          addLog(`📊 Analyzing frame - ${video.videoWidth}x${video.videoHeight}`);

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Interview-specific analysis
          const width = canvas.width;
          const height = canvas.height;

          // 1. Posture Analysis
          const postureScore = analyzePostureForInterview(data, width, height);
          
          // 2. Eye Contact Analysis
          const eyeContactScore = analyzeEyeContactForInterview(data, width, height);
          
          // 3. Stability Analysis
          const stabilityScore = analyzeStabilityForInterview(imageData);
          
          // 4. Confidence Analysis (based on posture + stability)
          const confidenceScore = Math.round((postureScore * 0.6) + (stabilityScore * 0.4));
          
          // 5. Engagement Analysis (overall presence)
          const engagementScore = Math.round((postureScore * 0.4) + (eyeContactScore * 0.4) + (stabilityScore * 0.2));

          // Calculate average brightness for reference
          let totalBrightness = 0;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4;
              const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
              totalBrightness += brightness;
            }
          }
          const avgBrightness = totalBrightness / (width * height);

          setMetrics({
            posture: postureScore,
            eyeContact: eyeContactScore,
            confidence: confidenceScore,
            stability: stabilityScore,
            engagement: engagementScore,
            brightness: Math.round(avgBrightness)
          });

          setFrameCount(prev => prev + 1);
          
          if (frameCount % 5 === 0) {
            addLog(`📊 Frame ${frameCount}: P:${postureScore} E:${eyeContactScore} C:${confidenceScore} S:${stabilityScore} Eng:${engagementScore}`);
          }

          // Store current frame for next comparison
          previousFrameData.current = imageData;

          // Continue analysis
          if (stream) {
            analysisRef.current = setTimeout(analyze, 1000); // Analyze every 1 second
            addLog(`🔄 Scheduling next analysis in 1s`);
          } else {
            addLog(`🛑 Analysis stopped - no stream`);
          }
        };

        analyze();
      }, 1000);
    }
  }, [stream, frameCount]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Interview Video Analysis Test</h1>
          <p className="text-gray-300">Test interview-focused video analysis and metrics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video Preview */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Video Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
                {isRecording ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-64 object-cover"
                    onLoadedData={() => addLog('📹 Video data loaded')}
                    onCanPlay={() => addLog('📹 Video can play')}
                    onPlaying={() => addLog('📹 Video is playing')}
                    onError={(e) => addLog(`❌ Video error: ${e}`)}
                    onLoadStart={() => addLog('📹 Video load started')}
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center">
                    <div className="text-center">
                      <CameraOff className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400">Camera not active</p>
                    </div>
                  </div>
                )}
                
                {isRecording && (
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-white font-medium">ANALYZING</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={isRecording ? stopVideo : startVideo}
                  className={isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}
                >
                  {isRecording ? (
                    <>
                      <CameraOff className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Interview Metrics */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Interview Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">Posture</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.posture}%</div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                      <div 
                        className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.posture}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-300">Eye Contact</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.eyeContact}%</div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.eyeContact}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-gray-300">Confidence</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.confidence}%</div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                      <div 
                        className="bg-orange-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.confidence}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-gray-300">Stability</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.stability}%</div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                      <div 
                        className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.stability}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-gray-300">Engagement</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.engagement}%</div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.engagement}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">Brightness</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.brightness}</div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                      <div 
                        className="bg-gray-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, metrics.brightness / 2)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Analysis Log</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {analysisLog.map((log, index) => (
                      <div key={index} className="text-xs text-gray-300 font-mono">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center text-sm text-gray-400">
                  Frames analyzed: {frameCount}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hidden canvas for analysis */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default VideoTest; 