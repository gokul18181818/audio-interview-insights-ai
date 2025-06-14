import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '@/hooks/useAudio';
import { systemDesignAPI } from '@/lib/api';
import WhiteboardContainer, { WhiteboardRef } from '../../SystemDesign/WhiteboardContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { generateSpeech, playBase64Audio, stopAllAudio } from '@/utils/elevenlabs';
import { 
  Mic, 
  Square,
  MessageSquare, 
  Brain, 
  Timer, 
  Volume2, 
  VolumeX,
  Pause,
  Play,
  SkipForward,
  Camera
} from 'lucide-react';
import { MVP_DESIGN_PHASES, URL_SHORTENER_PROBLEM } from '@/lib/systemDesignTypes';
import { supabase } from '@/lib/supabase';

interface LiveSystemDesignProps {
  sessionId?: string;
}

export function LiveSystemDesign({ sessionId }: LiveSystemDesignProps) {
  const navigate = useNavigate();
  const audio = useAudio();
  const whiteboardRef = useRef<WhiteboardRef>(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Interview State
  const [currentSessionId] = useState<string>('system-design-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
  const [elapsedTime, setElapsedTime] = useState(0);
  const [interviewState, setInterviewState] = useState<'idle' | 'recording' | 'processing' | 'speaking'>('idle');
  
  // System Design State
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(MVP_DESIGN_PHASES[0]);
  const [sessionData, setSessionData] = useState<any>(null);
  const [whiteboardElements, setWhiteboardElements] = useState<any[]>([]);
  const [lastWhiteboardSnapshot, setLastWhiteboardSnapshot] = useState<string>('');
  
  // AI & Audio State
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [displayedQuestion, setDisplayedQuestion] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{user: string, ai: string, timestamp: number, whiteboardSnapshot?: string}>>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setIsAuthenticated(true);
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  // Initialize interview
  useEffect(() => {
    if (isAuthenticated && !sessionData) {
      initializeInterview();
    }
  }, [isAuthenticated]);

  // Speech recognition ref
  const recognitionRef = useRef<any>(null);

  // Setup speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setLiveTranscript(prev => prev + transcript + ' ');
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      console.log('🧹 LiveSystemDesign cleanup: Stopping all audio');
      
      // Use global audio cleanup function
      stopAllAudio();
      
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Reset interview state
      setInterviewState('idle');
    };
  }, []);

  // Process audio when recording stops
  useEffect(() => {
    audio.setOnAudioRecorded(async (audioBlob) => {
      console.log('🎤 Processing system design audio:', audioBlob.size, 'bytes');
      setInterviewState('processing');
      
      try {
        await processSystemDesignAudio(audioBlob);
      } catch (error) {
        console.error('❌ System design processing failed:', error);
        setInterviewState('idle');
      }
    });
  }, [audio, conversationHistory, currentPhase, whiteboardElements]);

  const initializeInterview = async () => {
    try {
      console.log('🚀 Starting system design interview...');
      
      // Create system design session
      const session = await systemDesignAPI.createSession({
        problem_statement: URL_SHORTENER_PROBLEM.title
      });

      setSessionData(session);

      // Initial welcome message
      const welcomeMessage = `Hi! I'm your AI interviewer for today's system design session. We'll be designing a URL shortener together. I can see your whiteboard in real-time, so feel free to draw as you talk. We'll go through three phases: requirements gathering, architecture design, and scaling considerations. Let's start with the first phase: ${currentPhase.name}. ${currentPhase.description}`;
      
      setCurrentQuestion(welcomeMessage);
      setDisplayedQuestion(welcomeMessage);
      
      if (audioEnabled) {
        await speakQuestion(welcomeMessage);
      }
      
      console.log('✅ System design interview initialized');
    } catch (error) {
      console.error('❌ Failed to initialize interview:', error);
    }
  };

  const processSystemDesignAudio = async (audioBlob: Blob) => {
    try {
      // Get current transcript
      const transcript = liveTranscript.trim() || "I'm working on the system design step by step...";
      
      console.log('🎤 Processing audio with transcript:', transcript);
      console.log('📝 Live transcript length:', liveTranscript.length);
      
      // Capture current whiteboard state
      let whiteboardSnapshot = '';
      let elements: any[] = [];
      
      if (whiteboardRef.current) {
        whiteboardSnapshot = await whiteboardRef.current.captureSnapshot() || '';
        elements = whiteboardRef.current.getElements() || [];
        setLastWhiteboardSnapshot(whiteboardSnapshot);
        setWhiteboardElements(elements);
        console.log('🎨 Captured whiteboard with', elements.length, 'elements');
      }

      // Generate AI response based on transcript + whiteboard
      const aiResponse = await generateSystemDesignFeedback(transcript, whiteboardSnapshot, elements);
      
      console.log('🤖 AI Response generated:', aiResponse);
      
      // Update conversation history with whiteboard snapshot
      const newEntry = {
        user: transcript,
        ai: aiResponse,
        timestamp: Date.now(),
        whiteboardSnapshot: whiteboardSnapshot
      };
      setConversationHistory(prev => [...prev, newEntry]);
      
      // Speak the AI response
      setCurrentQuestion(aiResponse);
      await speakQuestion(aiResponse);
      
      setInterviewState('idle');
    } catch (error) {
      console.error('❌ Failed to process system design audio:', error);
      setInterviewState('idle');
    }
  };

  const generateSystemDesignFeedback = async (userTranscript: string, whiteboardImage: string, elements: any[]): Promise<string> => {
    try {
      console.log('🎯 Sending to System Design AI:', userTranscript);
      console.log('🎨 Whiteboard elements:', elements.length);
      console.log('🖼️ Has whiteboard image:', !!whiteboardImage);
      console.log('📏 Whiteboard image length:', whiteboardImage?.length || 0);
      console.log('🔍 Whiteboard image preview:', whiteboardImage?.substring(0, 100) + '...');
      
      // Additional validation logging
      const hasValidImage = whiteboardImage && 
        whiteboardImage !== "data:image/png;base64,placeholder" && 
        whiteboardImage.startsWith('data:image/');
      
      console.log('🔍 Image validation:', {
        hasImage: !!whiteboardImage,
        length: whiteboardImage?.length || 0,
        startsWithDataImage: whiteboardImage?.startsWith('data:image/'),
        isNotPlaceholder: whiteboardImage !== "data:image/png;base64,placeholder",
        hasValidImage
      });
      
      // Use the dedicated system design feedback API that can handle whiteboard images
      const requestData = {
        transcript: userTranscript,
        whiteboardImage: whiteboardImage,
        currentPhase: currentPhase.id,
        requirements: sessionData?.requirements_gathered || {},
        sessionId: currentSessionId
      };
      
      console.log('📤 Sending request data:', {
        ...requestData,
        whiteboardImage: whiteboardImage ? `[IMAGE: ${whiteboardImage.length} chars]` : 'NO IMAGE'
      });
      
      const feedback = await systemDesignAPI.getAIFeedback(requestData);
      
      console.log('✅ System Design AI responded:', feedback);
      
      // Check if we got a generic response (indicates the API might not be working properly)
      if (feedback && (feedback.includes('Great start on gathering requirements') || feedback.includes('Make sure to ask about'))) {
        console.warn('⚠️ Got generic response - API might not be processing whiteboard properly');
      }
      
      return feedback || 'Can you tell me more about your approach?';
    } catch (error) {
      console.error('❌ System Design AI call failed:', error);
      console.error('Error details:', error);
      
      // Enhanced fallback that acknowledges whiteboard activity
      if (elements.length > 0 && whiteboardImage) {
        return `I can see you've drawn ${elements.length} element${elements.length > 1 ? 's' : ''} on the whiteboard! You asked: "${userTranscript}". Yes, I should be able to see your whiteboard drawing. Can you describe what you've drawn and how it relates to the URL shortener requirements?`;
      } else {
        return `You said: "${userTranscript}". I'm having trouble accessing the whiteboard right now, but I'd love to hear you describe what you're thinking for this URL shortener design.`;
      }
    }
  };



  const speakQuestion = async (text: string) => {
    if (!audioEnabled) return;
    
    setInterviewState('speaking');
    
    try {
      const audioBase64 = await generateSpeech(text);
      if (audioBase64) {
        await playBase64Audio(audioBase64);
      } else {
        // Fallback to browser TTS
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          speechSynthesis.speak(utterance);
          
          await new Promise(resolve => {
            utterance.onend = () => resolve(void 0);
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to speak question:', error);
    } finally {
      setInterviewState('idle');
    }
  };

  const nextPhase = async () => {
    if (currentPhaseIndex < MVP_DESIGN_PHASES.length - 1) {
      const nextPhaseIndex = currentPhaseIndex + 1;
      const nextPhase = MVP_DESIGN_PHASES[nextPhaseIndex];
      
      setCurrentPhaseIndex(nextPhaseIndex);
      setCurrentPhase(nextPhase);
      
      const transitionMessage = `Great work on ${currentPhase.name}! Let's move to the next phase: ${nextPhase.name}. ${nextPhase.description}`;
      setCurrentQuestion(transitionMessage);
      await speakQuestion(transitionMessage);
    } else {
      // Interview complete
      await completeInterview();
    }
  };

  const completeInterview = async () => {
    try {
      if (sessionData) {
        await systemDesignAPI.completeSession(sessionData.id);
      }
      
      const completionMessage = "Excellent work! You've completed all phases of the system design interview. Let me prepare a summary of your design and performance.";
      await speakQuestion(completionMessage);
      
      setTimeout(() => {
        navigate('/session-summary', { 
          state: { 
            sessionId: currentSessionId,
            sessionType: 'system_design'
          } 
        });
      }, 3000);
    } catch (error) {
      console.error('❌ Failed to complete interview:', error);
    }
  };

  const handleWhiteboardChange = useCallback((elements: any[], appState: any) => {
    setWhiteboardElements(elements);
  }, []);

  const captureWhiteboardSnapshot = async () => {
    if (whiteboardRef.current) {
      const snapshot = await whiteboardRef.current.captureSnapshot();
      if (snapshot) {
        setLastWhiteboardSnapshot(snapshot);
      }
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
          text: "Analyzing your design...",
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
          text: "Ready to record...",
          color: "text-muted-foreground", 
          animation: ""
        };
    }
  };

  const stateDisplay = getStateDisplay();
  const progress = ((currentPhaseIndex + 1) / MVP_DESIGN_PHASES.length) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Setting up your interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">
                System Design Interview: URL Shortener
              </h1>
              <div className="flex items-center space-x-2">
                <Timer className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300">
                  {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={nextPhase}
                disabled={currentPhaseIndex >= MVP_DESIGN_PHASES.length - 1}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Next Phase
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>{currentPhase.name}</span>
              <span>Phase {currentPhaseIndex + 1} of {MVP_DESIGN_PHASES.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        
        {/* Left Panel - Interview Controls */}
        <div className="space-y-4">
          
          {/* Current Question */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Current Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{displayedQuestion}</p>
            </CardContent>
          </Card>

          {/* Recording Controls */}
          <Card className="glass-card border-0">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-sm ${stateDisplay.color} ${stateDisplay.animation}`}>
                    {stateDisplay.text}
                  </div>
                  {liveTranscript && (
                    <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-300">
                      {liveTranscript}
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={async () => {
                    if (audio.isRecording) {
                      audio.stopRecording();
                      if (recognitionRef.current) {
                        recognitionRef.current.stop();
                      }
                    } else {
                      setLiveTranscript('');
                      if (recognitionRef.current) {
                        recognitionRef.current.start();
                      }
                      await audio.startRecording();
                    }
                  }}
                  variant={audio.isRecording ? "destructive" : "default"}
                  disabled={interviewState === 'processing' || interviewState === 'speaking'}
                  className="w-full"
                >
                  {audio.isRecording ? <Square className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                  {audio.isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>

                <Button
                  onClick={captureWhiteboardSnapshot}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Whiteboard
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conversation History */}
          <Card className="glass-card border-0 flex-1">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto max-h-64">
              {conversationHistory.map((entry, index) => (
                <div key={index} className="space-y-2">
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-primary">You:</p>
                    <p className="text-sm">{entry.user}</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-sm font-medium text-primary">AI:</p>
                    <p className="text-sm">{entry.ai}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Whiteboard */}
        <div className="lg:col-span-2">
          <Card className="glass-card border-0 h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>System Design Whiteboard</span>
                <div className="text-sm text-gray-400">
                  Elements: {whiteboardElements.length}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-80px)]">
              <WhiteboardContainer
                ref={whiteboardRef}
                onElementsChange={handleWhiteboardChange}
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 