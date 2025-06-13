
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

const LiveInterview = () => {
  const navigate = useNavigate();
  const audio = useAudio();
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [displayedQuestion, setDisplayedQuestion] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [interviewState, setInterviewState] = useState<'idle' | 'recording' | 'processing' | 'speaking'>('idle');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState<string>('interview-' + Date.now());
  const [conversationHistory, setConversationHistory] = useState<Array<{user: string, ai: string, timestamp: number}>>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isAutoRecording, setIsAutoRecording] = useState(false);
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);

  // Start with a welcoming first question
  useEffect(() => {
    if (!currentQuestion && conversationHistory.length === 0) {
      const welcomeQuestion = "Welcome to your technical interview! I'm excited to learn about your background. Could you start by telling me about yourself and your experience in software development?";
      setCurrentQuestion(welcomeQuestion);
      setDisplayedQuestion(welcomeQuestion);
      
      // Speak the welcome question
      speakQuestion(welcomeQuestion);
    }
  }, []);

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
            
            // Clear existing silence timer
            if (silenceTimer) {
              clearTimeout(silenceTimer);
              setSilenceTimer(null);
            }
            
            // Start new silence timer for 5 seconds
            const newTimer = setTimeout(() => {
              console.log('🔇 5 seconds of silence detected - stopping recording automatically');
              audio.stopRecording();
              setSilenceTimer(null);
            }, 5000);
            
            setSilenceTimer(newTimer);
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
  }, [audio.isRecording]);

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
    
    // 1. Use the nuclear option - force stop ALL audio from useAudio hook
    console.log('💥 Using nuclear audio shutdown...');
    audio.forceStopAll();
    
    // 2. BRUTALLY stop all speech synthesis
    if ('speechSynthesis' in window) {
      console.log('🗣️ Force canceling all speech synthesis...');
      speechSynthesis.cancel();
      
      // Extra nuclear option - pause and cancel multiple times
      speechSynthesis.pause();
      speechSynthesis.cancel();
      
      // Clear any queued speech
      setTimeout(() => {
        speechSynthesis.cancel();
      }, 100);
      
      // Stop after delay too
      setTimeout(() => {
        speechSynthesis.cancel();
      }, 500);
    }
    
    // 3. Stop any ongoing speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.log('👂 Stopping speech recognition...');
      // The recognition will be stopped by the useEffect cleanup
    }
    
    // 4. Stop any HTML5 audio elements that might be playing
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audioEl => {
      console.log('🔊 Force stopping HTML5 audio element...');
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.src = '';
      audioEl.load(); // Reset the audio element
    });
    
    // 5. Stop any background Web Audio API contexts
    try {
      if ((window as any).audioContext) {
        console.log('🎵 Stopping Web Audio context...');
        (window as any).audioContext.suspend();
      }
    } catch (error) {
      console.log('Web Audio context already stopped');
    }
    
    // 6. Reset ALL states immediately
    setInterviewState('idle');
    setRecordingDuration(0);
    setCurrentTranscript("");
    setLiveTranscript("");
    setCurrentQuestion("");
    setDisplayedQuestion("");
    
    console.log('✅ ALL AUDIO FORCEFULLY STOPPED - Interview session terminated');
    
    // 7. Extended delay to ensure everything stops before analysis
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 8. Trigger analysis and save results (in background)
    if (conversationHistory.length > 0) {
      console.log('📊 Starting background analysis...');
      // Don't await this - let it run in background while navigating
      triggerInterviewAnalysis().catch(error => {
        console.error('Background analysis failed:', error);
      });
    }
    
    // 9. Navigate immediately
    console.log('🏁 Navigating to session summary...');
    navigate("/session-summary");
  };

  const triggerInterviewAnalysis = async () => {
    try {
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
        localStorage.setItem('interviewSession', JSON.stringify({
          sessionId,
          duration: elapsedTime,
          conversationHistory,
          timestamp: Date.now()
        }));
      } else {
        console.warn('⚠️ Analysis failed, will use fallback data');
      }
      
    } catch (error) {
      console.error('❌ Failed to trigger analysis:', error);
    }
  };

  const startAutoRecording = async () => {
    try {
      console.log('🎤 Auto-starting recording after AI response...');
      setIsAutoRecording(true);
      
      if (!audio.hasPermission) {
        const hasPermission = await audio.requestPermission();
        if (!hasPermission) {
          alert('Microphone permission is required for the interview');
          setIsAutoRecording(false);
          return;
        }
      }
      
      await audio.startRecording();
      setCurrentTranscript("");
      setLastSpeechTime(Date.now());
      setInterviewState('recording');
    } catch (error) {
      console.error('Failed to start auto recording:', error);
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
      setConversationHistory(prev => [...prev, {
        user: userInput,
        ai: response,
        timestamp: Date.now()
      }]);

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
      
      // Auto-start recording after a brief pause
      setTimeout(() => {
        startAutoRecording();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Speech failed, continuing silently:', error);
      setInterviewState('speaking'); // Still show typing effect
      
      // Still start recording even if speech failed
      setTimeout(() => {
        startAutoRecording();
      }, 1000);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="glass-card border-0 border-b border-muted/20 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">Live Interview</span>
            </div>
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
              Google • Backend Engineer
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {formatTime(elapsedTime)}
            </div>
            <Button
              onClick={handleEndInterview}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              End Interview
            </Button>
          </div>
        </div>
      </div>

      {/* Main Interview Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Voice Visualization */}
          <div className="relative">
            <div className={`w-48 h-48 mx-auto rounded-full bg-gradient-primary opacity-20 ${stateDisplay.animation} flex items-center justify-center`}>
              <div className={`w-36 h-36 rounded-full bg-gradient-primary opacity-40 ${stateDisplay.animation} flex items-center justify-center`}>
                <div className={`w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center ${stateDisplay.animation}`}>
                  {interviewState === 'recording' && <Mic className="w-12 h-12 text-white" />}
                  {interviewState === 'processing' && <MessageCircle className="w-12 h-12 text-white animate-spin" />}
                  {interviewState === 'speaking' && <Volume2 className="w-12 h-12 text-white" />}
                  {interviewState === 'idle' && <Mic className="w-12 h-12 text-white opacity-50" />}
                </div>
              </div>
            </div>
            
            {/* State indicator */}
            <div className="mt-4">
              <p className={`text-lg font-medium ${stateDisplay.color}`}>
                {stateDisplay.text}
              </p>
              
              {/* Recording feedback */}
              {audio.isRecording && (
                <div className="mt-3 max-w-sm mx-auto space-y-2">
                  <div className="text-sm text-center">
                    Recording: {recordingDuration}s
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Level:</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-100"
                        style={{ width: `${audio.audioLevel * 100}%` }}
                      />
                    </div>
                    <span className="text-xs">{Math.round(audio.audioLevel * 100)}%</span>
                  </div>
                  {audio.audioLevel > 0.1 && (
                    <div className="text-xs text-green-400 text-center">
                      ✓ Detecting your voice!
                    </div>
                  )}
                </div>
              )}
              

            </div>
          </div>

          {/* Current Question with Typing Effect */}
          <Card className="glass-card border-0 max-w-2xl mx-auto">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground mb-2">AI Interviewer:</p>
                  <p className="text-lg leading-relaxed min-h-[2rem]">
                    {displayedQuestion}
                    {isTyping && <span className="animate-pulse">|</span>}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Live Transcript Display */}
          {(liveTranscript || (currentTranscript && interviewState === 'processing')) && (
            <Card className="glass-card border-0 max-w-2xl mx-auto border-blue-500/30">
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Mic className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-blue-400 mb-2">
                      {liveTranscript ? 'You are saying:' : 'You said:'}
                    </p>
                    <p className="text-lg leading-relaxed min-h-[2rem] text-blue-100">
                      {liveTranscript || currentTranscript}
                      {liveTranscript && <span className="animate-pulse text-blue-400">|</span>}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              🎤 Recording will start automatically after the AI finishes speaking
            </p>
            <p className="text-sm text-muted-foreground">
              Stop talking for 5 seconds to automatically finish your response
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="glass-card border-0 border-t border-muted/20 p-4">
        <div className="container mx-auto flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {audio.isRecording ? '🎤 Recording... Speak naturally (5s silence to stop)' : 
               interviewState === 'processing' ? '🔄 AI is processing your response...' :
               interviewState === 'speaking' ? '🗣️ AI is responding...' : 
               '⏳ Waiting for AI to finish speaking...'}
            </p>
            {!audio.hasPermission && (
              <p className="text-xs text-red-400 mt-1">
                🚨 Microphone permission needed for auto-recording
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveInterview;
