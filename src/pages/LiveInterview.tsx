import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff,
  Clock,
  MessageCircle,
  Volume2,
  Radio,
  Square
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SimpleAvatar } from "@/components/SimpleAvatar";

const LiveInterview = () => {
  const navigate = useNavigate();
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Interview State
  const [sessionId] = useState<string>('behavioral-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Simple connection state (same as LiveCoding)
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Simple AI state (same as LiveCoding) 
  const [aiMessage, setAiMessage] = useState("Click Connect to start your behavioral interview");
  const [displayedQuestion, setDisplayedQuestion] = useState("");
  const [userSpeech, setUserSpeech] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{user: string, ai: string, timestamp: number}>>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [conversationLocked, setConversationLocked] = useState(false);
  const [justSentCode, setJustSentCode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Simple refs (same as LiveCoding)
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.warn('Auth check failed, but continuing:', error);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
        if (!user) {
          console.warn('No user found, but continuing for development');
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
        console.log('✅ User authenticated:', user.email);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed, but continuing:', error);
        setIsAuthenticated(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Typing effect for AI responses (restored from original)
  useEffect(() => {
    if (isAIResponding && aiMessage && aiMessage !== displayedQuestion) {
      setIsTyping(true);
      setDisplayedQuestion("");
      
      let index = 0;
      const typingInterval = setInterval(() => {
        if (index < aiMessage.length) {
          setDisplayedQuestion(prev => prev + aiMessage[index]);
          index++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 30);

      return () => clearInterval(typingInterval);
    } else if (!isAIResponding) {
      setDisplayedQuestion(aiMessage);
    }
  }, [aiMessage, isAIResponding]);

  // Simple connect function (adapted from LiveCoding)
  const connect = async () => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    setAiMessage("Connecting...");
    
    try {
      // Get mic permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      await audioContextRef.current.resume();
      
      // Get API key
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || prompt('OpenAI API Key:');
      if (!apiKey) throw new Error('Need API key');
      
      // Connect WebSocket
      const ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview', [
        'realtime',
        'openai-beta.realtime-v1',
        `openai-insecure-api-key.${apiKey}`
      ]);
      
      ws.onopen = () => {
        console.log('Connected!');
        setIsConnected(true);
        setIsConnecting(false);
        setAiMessage("Hey! So... how's it going? Just wanted to chat and get to know you a bit, you know?");
        
        // Configure session for behavioral interview
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You\'re a regular person having a casual conversation. CRITICAL: When you see [INTERRUPTION], you were just interrupted mid-sentence like a real human. React INSTANTLY with natural interruption responses like "Oh!" "Wait, what?" "Huh?" "Sorry, what?" "Oh, you mean..." and then IMMEDIATELY respond to what they said. NEVER continue your previous thought - completely abandon it and focus on their interruption. Be super natural with filler words like "um", "uh", "you know", "like". React genuinely to everything they say. Don\'t be formal or structured. Just be a normal person having a conversation who gets interrupted and responds naturally to interruptions.',
            voice: 'ash',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'semantic_vad',
              eagerness: 'medium', // Balanced - not too eager, not too slow
              create_response: true,
              interrupt_response: true // Allow natural interruptions
            },
            max_response_output_tokens: 1500
          }
        }));
        
        startAudioStream(ws);
      };
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        console.log('Message:', msg.type);
        
        // Track user speaking state - INSTANT interruption detection
        if (msg.type === 'input_audio_buffer.speech_started') {
          console.log('🎤 User started speaking');
          setIsUserSpeaking(true);
          
          // INSTANT interruption handling - like real humans
          if (isAIResponding) {
            console.log('🚨 INSTANT interruption detected - AI was speaking, user started talking');
            
            // NUCLEAR OPTION - Stop everything immediately
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              // Rapid-fire cancel commands
              for (let i = 0; i < 10; i++) {
                wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
              }
              // Clear everything
              wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
            }
            
            // IMMEDIATELY clear all audio and reset state
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            setIsAIResponding(false);
            setConversationLocked(false);
            
            // Force stop any browser audio playback
            try {
              if (audioContextRef.current) {
                // Suspend and resume to interrupt any ongoing audio
                audioContextRef.current.suspend().then(() => {
                  if (audioContextRef.current) {
                    audioContextRef.current.resume();
                  }
                });
              }
            } catch (e) {
              console.log('Audio context interrupt failed:', e);
            }
            
            console.log('🛑 NUCLEAR INTERRUPTION - AI speech terminated instantly');
          }
        }
        
        if (msg.type === 'input_audio_buffer.speech_stopped') {
          console.log('🎤 User stopped speaking');
          setIsUserSpeaking(false);
          // No locking - keep it natural
        }
        
        // Debug: Log when audio buffer is committed
        if (msg.type === 'input_audio_buffer.committed') {
          console.log('📝 Audio buffer committed - processing speech');
        }
        
        // Track AI responding state - but allow interruptions
        if (msg.type === 'response.created') {
          console.log('🤖 AI started responding');
          setIsAIResponding(true);
          // Don't lock - allow user to interrupt AI like in real conversations
        }
        
        if (msg.type === 'response.done') {
          console.log('🤖 AI finished responding');
          setIsAIResponding(false);
          // Immediate unlock - allow natural interruptions and overlaps
          setConversationLocked(false);
          setJustSentCode(false);
          console.log('🔓 Conversation unlocked - natural flow enabled');
        }
        
        if (msg.type === 'response.cancelled') {
          console.log('🚨 AI response was cancelled (likely due to interruption)');
          setIsAIResponding(false);
          setConversationLocked(false);
          setJustSentCode(false);
          // Clear audio queue when response is cancelled
          audioQueueRef.current = [];
          isPlayingRef.current = false;
        }
        
        if (msg.type === 'conversation.item.input_audio_transcription.completed') {
          console.log('👤 User said:', msg.transcript);
          setUserSpeech(msg.transcript);
          
          // IMMEDIATELY respond to user interruption - no delays, no analysis
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('🎯 User spoke - IMMEDIATELY responding to what they said');
            
            // Simple, direct response to whatever user said
            const directResponse = `[INTERRUPTION] User just said: "${msg.transcript}". Stop whatever you were saying and respond directly to this. Be natural like "Oh!" or "Wait, what?" and then address what they said.`;
            
            wsRef.current.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [{ 
                  type: 'input_text', 
                  text: directResponse
                }]
              }
            }));
            
            wsRef.current.send(JSON.stringify({
              type: 'response.create',
              response: { modalities: ['audio', 'text'] }
            }));
          }
        }
        
        if (msg.type === 'response.audio_transcript.done') {
          const fullResponse = msg.transcript;
          console.log('🤖 AI responded:', fullResponse);
          setAiMessage(fullResponse);
          
          // Add to conversation history
          setConversationHistory(prev => [...prev, {
            user: userSpeech,
            ai: fullResponse,
            timestamp: Date.now()
          }]);
          
          setUserSpeech("");
        }
        
        if (msg.type === 'response.audio.delta' && audioEnabled) {
          // Only queue audio if user isn't speaking (to allow instant interruptions)
          if (!isUserSpeaking) {
            queueAudio(msg.delta);
          } else {
            console.log('🚫 Skipping audio delta - user is speaking (interruption)');
          }
        }
        
        if (msg.type === 'response.audio.done') {
          console.log('🔊 Audio stream finished');
          // Audio stream finished, process any remaining queue
          processAudioQueue();
        }
      };
      
      ws.onclose = () => {
        console.log('Disconnected');
        setIsConnected(false);
        setAiMessage("Disconnected. Click Connect to restart.");
        cleanup();
      };
      
      wsRef.current = ws;
      
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnecting(false);
      setAiMessage("Connection failed. Try again.");
      cleanup();
    }
  };

  // Simple audio functions (same as LiveCoding)
  const startAudioStream = (ws: WebSocket) => {
    if (!streamRef.current || !audioContextRef.current) return;
    
    const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      
      // If user is speaking, always send their audio (for interruptions)
      // Only prevent feedback during AI playback
      if (isPlayingRef.current && audioContextRef.current) {
        const currentTime = audioContextRef.current.currentTime;
        // Very brief feedback prevention only
        if (currentTime % 1 < 0.1) {
          return; // Minimal feedback prevention
        }
      }
      
      const input = event.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(input.length);
      
      for (let i = 0; i < input.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
      }
      
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)))
      }));
    };
    
    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
  };

  const queueAudio = (base64Audio: string) => {
    audioQueueRef.current.push(base64Audio);
    if (!isPlayingRef.current) {
      processAudioQueue();
    }
  };

  const processAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    
    while (audioQueueRef.current.length > 0) {
      // Check for interruption before each chunk
      if (isUserSpeaking) {
        console.log('🚫 Audio playback interrupted by user speech');
        audioQueueRef.current = []; // Clear remaining queue
        break;
      }
      
      const audioChunk = audioQueueRef.current.shift();
      if (audioChunk) {
        await playAudioChunk(audioChunk);
      }
    }
    
    isPlayingRef.current = false;
  };

  const playAudioChunk = (base64Audio: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!audioContextRef.current || !audioEnabled) {
        resolve();
        return;
      }
      
      try {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768;
        }
        
        const buffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => resolve();
        source.start();
        
      } catch (error) {
        console.error('Audio playback error:', error);
        resolve();
      }
    });
  };

  const handleEndInterview = () => {
    cleanup();
    
    const sessionData = {
      sessionId,
      type: 'behavioral_realtime',
      duration: elapsedTime,
      conversationHistory,
      timestamp: Date.now()
    };
    
    localStorage.setItem('behavioralSessionSummary', JSON.stringify(sessionData));
    navigate("/session-summary");
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    cleanup();
  };

  const cleanup = () => {
    // Clear audio queue and stop playback
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    // Reset conversation state
    setIsUserSpeaking(false);
    setIsAIResponding(false);
    setConversationLocked(false);
    setJustSentCode(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    wsRef.current = null;
  };

  useEffect(() => {
    return cleanup;
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateDisplay = () => {
    if (isUserSpeaking) {
      return {
        text: "I'm listening...",
        color: "text-green-400",
        animation: "pulse-glow"
      };
    } else if (isAIResponding) {
      return {
        text: "AI is speaking...",
        color: "text-blue-400",
        animation: "pulse-glow"
      };
    } else if (isConnecting) {
      return {
        text: "Connecting...",
        color: "text-yellow-400", 
        animation: "pulse"
      };
    } else if (!isConnected) {
      return {
        text: "Click Connect to start...",
        color: "text-muted-foreground", 
        animation: ""
      };
    } else {
      return {
        text: "Ready to listen...",
        color: "text-muted-foreground", 
        animation: ""
      };
    }
  };

  const stateDisplay = getStateDisplay();

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

            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${
              isConnected ? 'border-green-500 bg-green-500/10' : 
              isConnecting ? 'border-yellow-500 bg-yellow-500/10' :
              'border-red-500 bg-red-500/10'
            }`}>
              <Radio className={`h-4 w-4 ${
                isConnected ? 'text-green-400' :
                isConnecting ? 'text-yellow-400 animate-pulse' :
                'text-red-400'
              }`} />
              <span className={`text-sm ${
                isConnected ? 'text-green-400' :
                isConnecting ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={!isConnected}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            
            <Button
              onClick={isConnected ? disconnect : connect}
              disabled={isConnecting}
              variant={isConnected ? "destructive" : "default"}
              size="sm"
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
            
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
              isSpeaking={isAIResponding}
              isListening={isUserSpeaking}
              className="mb-4"
            />
            
            {/* Status Display - Right under avatar */}
            <div className="text-center mt-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                isAIResponding 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : isUserSpeaking
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : isConnecting
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
          {userSpeech && (
            <div className="bg-blue-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 shadow-xl max-w-2xl w-full">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-blue-300">You said:</span>
                  </div>
                  <p className="text-lg leading-relaxed text-blue-100 min-h-[2rem]">
                    {userSpeech}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          <div className="bg-gray-700/30 backdrop-blur-xl rounded-2xl p-4 border border-gray-600/50 max-w-2xl w-full">
            <div className="text-center">
              <p className="text-gray-300">
                {isUserSpeaking ? 'I can hear you speaking... Continue!' : 
                 isAIResponding ? 'AI is responding...' :
                 isConnecting ? 'Connecting to AI interviewer...' :
                 !isConnected ? 'Click Connect to start your interview' :
                 'Ready to listen - start speaking naturally!'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Empty for balance */}
        <div className="w-20"></div>
      </div>
    </div>
  );
};

export default LiveInterview;
