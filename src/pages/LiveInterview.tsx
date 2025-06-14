import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  Square, 
  Volume2,
  Clock,
  MessageCircle
} from "lucide-react";
import { useAudio } from "@/hooks/useAudio";
import { generateSpeech, playBase64Audio } from "@/utils/elevenlabs";
import MicrophoneSetup from "@/components/MicrophoneSetup";
import { SimpleAvatar } from "@/components/SimpleAvatar";
import { useVideoAnalysis } from "@/hooks/useVideoAnalysis";
import { VideoPreview } from "@/components/VideoPreview";

const LiveInterview = () => {
  const navigate = useNavigate();
  const audio = useAudio();
  const videoAnalysis = useVideoAnalysis();
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [displayedQuestion, setDisplayedQuestion] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [interviewState, setInterviewState] = useState<'idle' | 'recording' | 'processing' | 'speaking'>('idle');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState<string>('interview-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
  const [conversationHistory, setConversationHistory] = useState<Array<{user: string, ai: string, timestamp: number}>>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isAutoRecording, setIsAutoRecording] = useState(false);
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);
  const [showMicSetup, setShowMicSetup] = useState(true);
  const [micSetupComplete, setMicSetupComplete] = useState(false);

  // Start with a welcoming first question (only after mic setup is complete)
  useEffect(() => {
    if (micSetupComplete && !currentQuestion && conversationHistory.length === 0) {
      const welcomeQuestion = "Welcome to your technical interview! I'm excited to learn about your background. Could you start by telling me about yourself and your experience in software development?";
      setCurrentQuestion(welcomeQuestion);
      setDisplayedQuestion(welcomeQuestion);
      
      // Speak the welcome question (auto-recording already enabled in handleMicSetupComplete)
      console.log('🎯 Starting interview - isAutoRecording:', isAutoRecording);
      speakQuestion(welcomeQuestion);
    }
  }, [micSetupComplete]);

  // Real audio processing when recording stops
  useEffect(() => {
    audio.setOnAudioRecorded(async (audioBlob) => {
      console.log('🎤 Processing interview audio:', audioBlob.size, 'bytes');
      setInterviewState('processing');
      setRecordingDuration(0);
      
      try {
        // Process real transcription and AI response
        await processInterviewAudio(audioBlob);
      } catch (error) {
        console.error('❌ Interview processing failed:', error);
        setInterviewState('idle');
      }
    });
  }, [audio, conversationHistory]);

  // Recording timer and live transcription
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let recognition: any = null;
    
    if (audio.isRecording) {
      setInterviewState('recording');
      setLiveTranscript("");
      
      // Start recording timer
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // Start live transcription with Web Speech API
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Update live transcript with both final and interim results
          const fullTranscript = finalTranscript + interimTranscript;
          setLiveTranscript(fullTranscript);
          
          // Auto-pause detection: if there's speech, reset silence timer
          if (fullTranscript.trim().length > 0) {
            setLastSpeechTime(Date.now());
            
            // Clear existing silence timer first
            setSilenceTimer(prev => {
              if (prev) {
                clearTimeout(prev);
              }
              
              // Only start new timer if auto-recording is active
              if (isAutoRecording && audio.isRecording) {
                const newTimer = setTimeout(() => {
                  console.log('🔇 5 seconds of silence detected - stopping recording automatically');
                  if (audio.isRecording) {
                    audio.stopRecording();
                  }
                  setSilenceTimer(null);
                }, 5000);
                
                return newTimer;
              }
              return null;
            });
          }
        };
        
        recognition.onerror = (event: any) => {
          console.log('Speech recognition error:', event.error);
        };
        
        recognition.start();
      }
      
    } else if (recordingDuration > 0) {
      setRecordingDuration(0);
      setLiveTranscript("");
    }
    
    return () => {
      clearInterval(interval);
      if (recognition) {
        recognition.stop();
      }
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }
    };
  }, [audio.isRecording, silenceTimer, isAutoRecording]);

  // Overall interview timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Typing effect for AI responses
  useEffect(() => {
    if (interviewState === 'speaking' && currentQuestion && currentQuestion !== displayedQuestion) {
      setIsTyping(true);
      setDisplayedQuestion("");
      
      let index = 0;
      const typingInterval = setInterval(() => {
        if (index < currentQuestion.length) {
          setDisplayedQuestion(prev => prev + currentQuestion[index]);
          index++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          setInterviewState('idle');
        }
      }, 30);

      return () => clearInterval(typingInterval);
    } else if (interviewState !== 'speaking') {
      setDisplayedQuestion(currentQuestion);
    }
  }, [currentQuestion, interviewState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndInterview = async () => {
    console.log('🛑 FORCE STOPPING ALL INTERVIEW AUDIO AND PROCESSES...');
    
    // 1. Clear any pending silence timers to prevent interference
    if (silenceTimer) {
      console.log('⏰ Clearing silence timer...');
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }
    
    // 2. Nuclear shutdown of all audio
    console.log('💥 Using nuclear audio shutdown...');
    await audio.forceStopAll();
    
    // 3. Cancel any ongoing speech synthesis
    console.log('🗣️ Force canceling all speech synthesis...');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // 4. Stop any speech recognition
    console.log('👂 Stopping speech recognition...');
    if ('speechSynthesis' in window) {
      // Speech recognition will be stopped by the useEffect cleanup
    }
    
    // 5. Stop video recording and save metrics
    console.log('📹 Stopping video recording and saving metrics...');
    videoAnalysis.stopVideoRecording();
    const videoMetrics = videoAnalysis.getSummaryMetrics();
    console.log('📊 Video metrics collected:', videoMetrics);
    
    // 6. Reset all states
    setInterviewState('idle');
    setIsAutoRecording(false);
    setCurrentTranscript("");
    setLiveTranscript("");
    setCurrentQuestion("");
    setDisplayedQuestion("");
    
    console.log('✅ ALL AUDIO FORCEFULLY STOPPED - Interview session terminated');
    
    // 7. Save current session info immediately before navigation
    const finalSessionInfo = {
      sessionId,
      duration: elapsedTime,
      conversationHistory,
      videoMetrics,
      timestamp: Date.now()
    };
    localStorage.setItem('interviewSession', JSON.stringify(finalSessionInfo));
    console.log('💾 Saved final session info before navigation:', finalSessionInfo);
    
    // 7. Trigger analysis and save results (in background)
    if (conversationHistory.length > 0) {
      console.log('📊 Starting background analysis...');
      // Don't await this - let it run in background while navigating
      triggerInterviewAnalysis().catch(error => {
        console.error('Background analysis failed:', error);
      });
    }
    
    // 8. Navigate immediately
    console.log('🏁 Navigating to session summary...');
    navigate("/session-summary");
  };

  const triggerInterviewAnalysis = async () => {
    try {
      console.log('📊 Starting analysis for session:', sessionId);
      console.log('💬 Current conversation history:', conversationHistory);
      console.log('❓ Current question:', currentQuestion);
      
      // Convert conversation history to the format expected by analysis API
      const conversationForAnalysis = [];
      
      // Add the initial AI question
      if (currentQuestion) {
        conversationForAnalysis.push({
          speaker: 'ai' as const,
          message: currentQuestion,
          timestamp: Date.now() - (elapsedTime * 1000)
        });
      }
      
      // Add all conversation turns
      conversationHistory.forEach(turn => {
        conversationForAnalysis.push(
          {
            speaker: 'user' as const,
            message: turn.user,
            timestamp: turn.timestamp
          },
          {
            speaker: 'ai' as const, 
            message: turn.ai,
            timestamp: turn.timestamp + 1000
          }
        );
      });

      console.log('📝 Conversation for analysis:', conversationForAnalysis);

      // Call analysis API
      const analysisResponse = await fetch('https://llfckjszmvhirwjfzdqj.supabase.co/functions/v1/interview-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZmNranN6bXZoaXJ3amZ6ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTIxNDIsImV4cCI6MjA2NTM2ODE0Mn0.G9FHck8cRIdz5K31ZmnMHufIWceW6fF2pmc9m4BUBbE'
        },
        body: JSON.stringify({
          conversation_history: conversationForAnalysis,
          session_id: sessionId,
          interview_type: 'technical',
          duration_minutes: Math.round(elapsedTime / 60),
          position: 'Backend Engineer',
          company: 'Google'
        })
      });

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        console.log('✅ Interview analysis completed:', analysisData);
        
        // Store analysis results in localStorage for SessionSummary page
        localStorage.setItem('interviewAnalysis', JSON.stringify(analysisData));
      } else {
        console.warn('⚠️ Analysis failed, will use fallback data');
      }
      
    } catch (error) {
      console.error('❌ Failed to trigger analysis:', error);
    }
  };

  const startAutoRecording = async () => {
    console.log('🔍 startAutoRecording called - isAutoRecording:', isAutoRecording, 'interviewState:', interviewState);
    
    // Don't start recording if auto-recording is disabled
    if (!isAutoRecording) {
      console.log('🚫 Auto-recording disabled - skipping', { isAutoRecording, interviewState });
      return;
    }
    
    try {
      console.log('🎤 Auto-starting recording after AI response...');
      console.log('🎤 Audio permissions check - hasPermission:', audio.hasPermission);
      
      if (!audio.hasPermission) {
        console.log('🎤 Requesting microphone permission...');
        const hasPermission = await audio.requestPermission();
        if (!hasPermission) {
          alert('Microphone permission is required for the interview');
          setIsAutoRecording(false);
          return;
        }
        console.log('✅ Microphone permission granted');
      }
      
      console.log('🎤 Starting audio recording...');
      await audio.startRecording();
      setCurrentTranscript("");
      setLastSpeechTime(Date.now());
      setInterviewState('recording');
      console.log('✅ Auto-recording started successfully');
    } catch (error) {
      console.error('❌ Failed to start auto recording:', error);
      setIsAutoRecording(false);
    }
  };

  // Real audio processing functions
  const processInterviewAudio = async (audioBlob: Blob) => {
    try {
      console.log('🎯 Processing your interview response...', audioBlob.size, 'bytes');
      
      // Convert audio to base64
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      // Transcribe the audio
      const transcriptResponse = await fetch('https://llfckjszmvhirwjfzdqj.supabase.co/functions/v1/speech-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZmNranN6bXZoaXJ3amZ6ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTIxNDIsImV4cCI6MjA2NTM2ODE0Mn0.G9FHck8cRIdz5K31ZmnMHufIWceW6fF2pmc9m4BUBbE'
        },
        body: JSON.stringify({
          audio: base64Audio,
          session_id: sessionId,
          format: 'webm'
        })
      });

      let userTranscript = '';
      if (transcriptResponse.ok) {
        const transcriptData = await transcriptResponse.json();
        userTranscript = transcriptData.transcript || 'No speech detected';
        console.log('✅ Interview transcription:', userTranscript);
      } else {
        userTranscript = '[Audio not clear - please try speaking closer to microphone]';
      }
      
      setCurrentTranscript(userTranscript);

      // Generate contextual AI response
      await generateInterviewResponse(userTranscript);
      
    } catch (error) {
      console.error('❌ Interview processing failed:', error);
      setInterviewState('idle');
    }
  };

  const generateInterviewResponse = async (userInput: string) => {
    try {
      console.log('🤖 Generating interview response for:', userInput);
      
      // Call AI interview response API
      const aiResponse = await fetch('https://llfckjszmvhirwjfzdqj.supabase.co/functions/v1/ai-interview-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZmNranN6bXZoaXJ3amZ6ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTIxNDIsImV4cCI6MjA2NTM2ODE0Mn0.G9FHck8cRIdz5K31ZmnMHufIWceW6fF2pmc9m4BUBbE'
        },
        body: JSON.stringify({
          user_input: userInput,
          session_id: sessionId,
          context: 'technical_interview'
        })
      });

      let response = '';
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        if (aiData.error) {
          response = aiData.fallback_response || generateFallbackResponse(userInput);
        } else {
          response = aiData.response || 'Thank you for that answer. Could you tell me more?';
        }
      } else {
        response = generateFallbackResponse(userInput);
      }

      // Add to conversation history
      const newTurn = {
        user: userInput,
        ai: response,
        timestamp: Date.now()
      };
      
      console.log('📝 Adding new conversation turn:', newTurn);
      setConversationHistory(prev => {
        const updated = [...prev, newTurn];
        console.log('📚 Updated conversation history:', updated);
        return updated;
      });

      // Set new question and speak it
      setCurrentQuestion(response);
      await speakQuestion(response);
      
    } catch (error) {
      console.error('❌ AI response generation failed:', error);
      const fallback = generateFallbackResponse(userInput);
      setCurrentQuestion(fallback);
      await speakQuestion(fallback);
    }
  };

  const speakQuestion = async (text: string) => {
    try {
      setInterviewState('speaking');
      console.log('🔊 Speaking interview question with ultra-smooth premium voice...');
      
      // Use Bella - our ultra-smooth premium voice for the best interview experience
      const audioBase64 = await generateSpeech(text, 'EXAVITQu4vr4xnSDxMaL');
      await playBase64Audio(audioBase64);
      
      console.log('✅ Interview question spoken with premium voice');
      console.log('🔍 Debug - isAutoRecording:', isAutoRecording, 'interviewState:', interviewState);
      
      // Reset interview state to idle after speaking
      setInterviewState('idle');
      
      // Auto-start recording after a brief pause, only if auto-recording is enabled
      if (isAutoRecording) {
        console.log('⏰ Setting timeout to start auto-recording in 1 second...');
        setTimeout(() => {
          console.log('⏰ Timeout triggered - calling startAutoRecording...');
          startAutoRecording();
        }, 1000);
      } else {
        console.log('❌ Auto-recording is disabled - not starting recording');
      }
      
    } catch (error) {
      console.error('❌ Speech failed, continuing silently:', error);
      setInterviewState('idle'); // Reset state after failed speech
      
      // Still start recording even if speech failed, only if auto-recording is enabled
      if (isAutoRecording) {
        console.log('⏰ Speech failed - setting timeout to start auto-recording anyway...');
        setTimeout(() => {
          console.log('⏰ Error timeout triggered - calling startAutoRecording...');
          startAutoRecording();
        }, 1000);
      }
    }
  };

  const generateFallbackResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('experience') || input.includes('years')) {
      return "That's valuable experience! Can you walk me through a specific project that challenged you technically?";
    } else if (input.includes('react') || input.includes('frontend')) {
      return "Great! What's the most complex React application you've built? What made it challenging?";
    } else if (input.includes('backend') || input.includes('api')) {
      return "Interesting! How do you approach designing scalable APIs? Can you give me an example?";
    } else if (input.includes('team') || input.includes('collaborate')) {
      return "Teamwork is crucial! Tell me about a time you had to resolve a technical disagreement with a colleague.";
    } else {
      return "That's insightful! Can you dive deeper into the technical aspects and challenges you faced?";
    }
  };

  const getStateDisplay = () => {
    switch (interviewState) {
      case 'recording':
        return {
          text: "I'm listening...",
          color: "text-green-400",
          animation: "pulse-glow"
        };
      case 'processing':
        return {
          text: "Processing your answer...",
          color: "text-yellow-400", 
          animation: "pulse"
        };
      case 'speaking':
        return {
          text: "AI is speaking...",
          color: "text-blue-400",
          animation: "pulse-glow"
        };
      default:
        return {
          text: "Waiting to start recording...",
          color: "text-muted-foreground", 
          animation: ""
        };
    }
  };

  const stateDisplay = getStateDisplay();

  const handleMicSetupComplete = () => {
    console.log('✅ Microphone setup completed - starting interview');
    console.log('🗑️ Clearing old localStorage data for fresh interview');
    
    // Clear any old interview data
    localStorage.removeItem('interviewAnalysis');
    localStorage.removeItem('interviewSession');
    
    setShowMicSetup(false);
    setMicSetupComplete(true);
    // Enable auto-recording now that setup is complete
    setIsAutoRecording(true);
    console.log('🎤 Auto-recording enabled after setup completion');
    
    // Start video recording for body language analysis
    videoAnalysis.startVideoRecording();
    console.log('📹 Video recording started for body language analysis');
  };

  const handleMicSetupCancel = () => {
    console.log('❌ Microphone setup cancelled');
    navigate("/dashboard");
  };

  // Show microphone setup first
  if (showMicSetup) {
    return (
      <MicrophoneSetup 
        onSetupComplete={handleMicSetupComplete}
        onCancel={handleMicSetupCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-blue-500/10 rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-green-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Enhanced Header */}
      <div className="relative z-10 bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                <div className="absolute inset-0 w-4 h-4 rounded-full bg-red-500 animate-ping opacity-75" />
              </div>
              <span className="text-lg font-semibold text-white">Live Interview</span>
            </div>
            <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 px-4 py-2 text-sm font-medium">
              🏢 Google • Backend Engineer
            </Badge>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-gray-700/50 rounded-full px-4 py-2 backdrop-blur-sm">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-lg font-mono text-white">{formatTime(elapsedTime)}</span>
            </div>
            <Button
              onClick={handleEndInterview}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 px-6 py-2 rounded-full font-medium shadow-lg transition-all duration-200 hover:scale-105"
            >
              <Square className="w-4 h-4 mr-2" />
              End Interview
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Centered for Eye Contact */}
      <div className="flex-1 flex relative z-10">
        {/* Left Side - Just Pulsating Emoji */}
        <div className="w-20 flex items-center justify-center">
          <div className="text-4xl animate-pulse">
            🎤
          </div>
        </div>

        {/* Center - Avatar and Conversation (Eye Contact) */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 max-w-4xl mx-auto">
          {/* AI Avatar - Centered for Eye Contact */}
          <div className="relative">
            <SimpleAvatar 
              isSpeaking={interviewState === 'speaking'}
              isListening={interviewState === 'recording'}
              className="mb-4"
            />
            
            {/* Status Display - Right under avatar */}
            <div className="text-center mt-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                interviewState === 'speaking' 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : interviewState === 'recording'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : interviewState === 'processing'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {stateDisplay.text}
              </div>
            </div>
          </div>

          {/* Current Question */}
          <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-xl max-w-2xl w-full">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-purple-300">AI Interviewer</span>
                  {isTyping && <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />}
                </div>
                <p className="text-lg leading-relaxed text-white min-h-[2rem]">
                  {displayedQuestion}
                  {isTyping && <span className="animate-pulse text-purple-400">|</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Live Transcript */}
          {(liveTranscript || (currentTranscript && interviewState === 'processing')) && (
            <div className="bg-blue-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 shadow-xl max-w-2xl w-full">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-blue-300">
                      {liveTranscript ? 'You are saying...' : 'You said:'}
                    </span>
                    {liveTranscript && <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />}
                  </div>
                  <p className="text-lg leading-relaxed text-blue-100 min-h-[2rem]">
                    {liveTranscript || currentTranscript}
                    {liveTranscript && <span className="animate-pulse text-blue-400">|</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          <div className="bg-gray-700/30 backdrop-blur-xl rounded-2xl p-4 border border-gray-600/50 max-w-2xl w-full">
            <div className="text-center">
              <p className="text-gray-300">
                {audio.isRecording ? 'Recording in progress... Speak naturally!' : 
                 interviewState === 'processing' ? 'AI is analyzing your response...' :
                 interviewState === 'speaking' ? 'AI is responding...' : 
                 'Waiting for AI to finish speaking...'}
              </p>
              {!audio.hasPermission && (
                <p className="text-red-400 mt-2 text-sm">
                  🚨 Microphone permission required for recording
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Empty for balance */}
        <div className="w-20"></div>
      </div>

      {/* Video Preview - Bottom Right */}
      <VideoPreview
        videoRef={videoAnalysis.videoRef}
        canvasRef={videoAnalysis.canvasRef}
        isRecording={videoAnalysis.isRecording}
        hasPermission={videoAnalysis.hasPermission}
        error={videoAnalysis.error}
        onToggleRecording={() => {
          if (videoAnalysis.isRecording) {
            videoAnalysis.stopVideoRecording();
          } else {
            videoAnalysis.startVideoRecording();
          }
        }}
      />
    </div>
  );
};

export default LiveInterview;
