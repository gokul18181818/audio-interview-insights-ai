import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { 
  Play, 
  Mic, 
  MicOff,
  Clock,
  MessageCircle,
  Code,
  Volume2,
  RotateCcw,
  CheckCircle,
  XCircle,
  Radio
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { codingAPI } from "@/lib/api";
import Editor from "@monaco-editor/react";

const LiveCoding = () => {
  const navigate = useNavigate();
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Interview State
  const [sessionId] = useState<string>('coding-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Simple connection state (copied from SimpleLiveCoding)
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Code Editor State
  const [code, setCode] = useState(`// Welcome to your coding interview!
// Start coding here...

function solution() {
    // Your code here
    
}`);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{passed: number, total: number, details: string[]}>({passed: 0, total: 0, details: []});
  
  // Simple AI state (copied from SimpleLiveCoding)
  const [aiMessage, setAiMessage] = useState("Click Connect to start your interview");
  const [userSpeech, setUserSpeech] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{user: string, ai: string, timestamp: number}>>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [conversationLocked, setConversationLocked] = useState(false);
  const [justSentCode, setJustSentCode] = useState(false);
  
  // Simple refs (copied from SimpleLiveCoding)
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const lastCodeSentRef = useRef<string>("");

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.warn('Auth check failed, but continuing:', error);
          // Continue anyway for development - don't block the interview
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
        if (!user) {
          console.warn('No user found, but continuing for development');
          // For development, continue anyway
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
        console.log('✅ User authenticated:', user.email);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed, but continuing:', error);
        // Continue anyway for development
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

  // Auto-send code updates to AI (debounced) - more relaxed timing
  useEffect(() => {
    if (!wsRef.current || !isConnected || !code || justSentCode) return;
    
    const timeoutId = setTimeout(() => {
      // Relaxed checks - only avoid if just sent code
      if (code !== lastCodeSentRef.current && 
          code.trim().length > 0 && 
          !justSentCode &&
          wsRef.current?.readyState === WebSocket.OPEN) {
        
        console.log('🤖 Auto-sending code update (natural timing)');
        sendCodeUpdateAuto();
        lastCodeSentRef.current = code;
      }
    }, 12000); // Longer delay to be less intrusive
    
    return () => clearTimeout(timeoutId);
  }, [code, isConnected, justSentCode]);

  // Simple connect function (copied from SimpleLiveCoding)
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
        setAiMessage("Hi! I'm ready to help with your coding interview. What problem would you like to work on today?");
        
        // Configure session
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a coding interview assistant with FULL ACCESS to the user\'s code editor. IMPORTANT: You can ALWAYS see their code - never say "I can\'t see your code". Have NATURAL, UNSTRUCTURED conversations like real interviews - people interrupt each other, talk over each other, have awkward pauses, and it\'s messy. Respond naturally to interruptions. If the user cuts you off mid-sentence, acknowledge it naturally like "Oh, you\'re asking about..." Don\'t be overly polite or structured. Be conversational, spontaneous, and human-like. Real interviews are chaotic - embrace that chaos.',
            voice: 'ash',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.3, // Very sensitive - picks up interruptions
              silence_duration_ms: 400, // Short silence - allows for natural pauses
              prefix_padding_ms: 100,
              create_response: true
            },
            max_response_output_tokens: 1500
          }
        }));
        
        startAudioStream(ws);
      };
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        console.log('Message:', msg.type);
        
        // Track user speaking state - but don't lock conversation
        if (msg.type === 'input_audio_buffer.speech_started') {
          console.log('🎤 User started speaking');
          setIsUserSpeaking(true);
          // Don't lock - allow natural overlaps and interruptions
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
        
        if (msg.type === 'conversation.item.input_audio_transcription.completed') {
          console.log('👤 User said:', msg.transcript);
          setUserSpeech(msg.transcript);
          
          // If user asks about code, immediately send current code
          const transcript = msg.transcript.toLowerCase();
          const codeKeywords = ['code', 'editor', 'screen', 'function', 'solution', 'it'];
          const actionKeywords = ['see', 'look', 'review', 'check', 'wrong', 'issue', 'problem', 'fix', 'help', 'debug', 'what', 'how', 'why'];
          
          const hasCodeKeyword = codeKeywords.some(keyword => transcript.includes(keyword));
          const hasActionKeyword = actionKeywords.some(keyword => transcript.includes(keyword));
          
          // Also trigger on common question patterns
          const questionPatterns = [
            'what\'s wrong',
            'what is wrong', 
            'what should',
            'how do',
            'can you see',
            'look at',
            'check this',
            'help with',
            'fix this'
          ];
          
          const hasQuestionPattern = questionPatterns.some(pattern => transcript.includes(pattern));
          
          if ((hasCodeKeyword && hasActionKeyword) || hasQuestionPattern) {
            console.log('🔍 User asked about code - sending immediately');
            // Send immediately, don't wait
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              // Send code with context of what user just said
              sendCodeUpdateWithContext(msg.transcript);
            }
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
          queueAudio(msg.delta);
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

  // Simple audio functions (copied from SimpleLiveCoding)
  const startAudioStream = (ws: WebSocket) => {
    if (!streamRef.current || !audioContextRef.current) return;
    
    const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      
      // Always send audio - allow interruptions and overlaps like real conversations
      // Only skip if there's severe audio feedback (very loud playback)
      if (isPlayingRef.current && audioContextRef.current) {
        const currentTime = audioContextRef.current.currentTime;
        // Allow interruptions after 200ms of AI speaking
        if (currentTime % 1 < 0.2) {
          return; // Brief feedback prevention
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

  const sendCodeUpdate = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    console.log('📤 Manually sending code update');
    setJustSentCode(true); // Prevent auto-send
    
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ 
          type: 'input_text', 
          text: `Here's my current code:\n\`\`\`javascript\n${code}\n\`\`\`` 
        }]
      }
    }));
    
    wsRef.current.send(JSON.stringify({
      type: 'response.create',
      response: { modalities: ['audio', 'text'] }
    }));
    
    lastCodeSentRef.current = code;
  };

  const sendCodeUpdateWithContext = (userSpeech: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    console.log('📤 Sending code update with user context:', userSpeech);
    setJustSentCode(true); // Prevent auto-send from firing
    
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ 
          type: 'input_text', 
          text: `User said: "${userSpeech}"\n\nHere's my current code:\n\`\`\`javascript\n${code}\n\`\`\`\n\nPlease respond to what I said and help with my code.` 
        }]
      }
    }));
    
    wsRef.current.send(JSON.stringify({
      type: 'response.create',
      response: { modalities: ['audio', 'text'] }
    }));
    
    lastCodeSentRef.current = code; // Update the last sent code
  };

  const sendCodeUpdateAuto = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    console.log('📤 Auto-sending code update');
    setJustSentCode(true);
    
    const codeContext = `Here's my current code progress:

\`\`\`javascript
${code}
\`\`\`

Test results: ${testResults.passed}/${testResults.total} tests passing

Please provide brief feedback on my progress. Continue our conversation naturally.`;
    
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: codeContext }]
      }
    }));
    
    wsRef.current.send(JSON.stringify({
      type: 'response.create',
      response: { modalities: ['audio', 'text'] }
    }));
  };

  const runCode = async () => {
    setIsRunning(true);
    
    try {
      // Simple code execution without hardcoded test cases
      const result = await codingAPI.executeCode({
        code,
        language: 'javascript',
        testCases: [], // No hardcoded test cases
        functionName: 'solution'
      });
      
      setOutput(result.output);
      setTestResults(result.tests);
      
      // Send test results to AI
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const testFeedback = `Code execution completed: ${result.tests.passed}/${result.tests.total} tests passed. Output: ${result.output}`;
        
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: testFeedback }]
          }
        }));
        
        wsRef.current.send(JSON.stringify({
          type: 'response.create',
          response: { modalities: ['audio', 'text'] }
        }));
      }
      
    } catch (error) {
      setOutput(`Error: ${error}`);
      console.error('Code execution failed:', error);
    }
    
    setIsRunning(false);
  };

  const resetCode = () => {
    setCode(`// Welcome to your coding interview!
// Start coding here...

function solution() {
    // Your code here
    
}`);
    setOutput("");
    setTestResults({passed: 0, total: 0, details: []});
  };

  const handleEndInterview = () => {
    cleanup();
    
    const sessionData = {
      sessionId,
      type: 'coding_realtime',
      duration: elapsedTime,
      finalCode: code,
      testResults,
      conversationHistory,
      timestamp: Date.now()
    };
    
    localStorage.setItem('codingSessionSummary', JSON.stringify(sessionData));
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
              <h1 className="text-xl font-semibold">Live Coding Interview</h1>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300">{formatTime(elapsedTime)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
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
              
              {/* Speaking Status */}
              {isConnected && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${
                  isUserSpeaking ? 'border-blue-500 bg-blue-500/10' :
                  isAIResponding ? 'border-purple-500 bg-purple-500/10' :
                  conversationLocked ? 'border-orange-500 bg-orange-500/10' :
                  'border-gray-500 bg-gray-500/10'
                }`}>
                  <Mic className={`h-4 w-4 ${
                    isUserSpeaking ? 'text-blue-400' :
                    isAIResponding ? 'text-purple-400' :
                    conversationLocked ? 'text-orange-400' :
                    'text-gray-400'
                  }`} />
                  <span className={`text-sm ${
                    isUserSpeaking ? 'text-blue-400' :
                    isAIResponding ? 'text-purple-400' :
                    conversationLocked ? 'text-orange-400' :
                    'text-gray-400'
                  }`}>
                    {isUserSpeaking ? 'You\'re Speaking' :
                     isAIResponding ? 'AI Responding' :
                     conversationLocked ? 'Please Wait' :
                     'Ready to Listen'}
                  </span>
                </div>
              )}
              
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
                variant="destructive"
                size="sm"
                onClick={handleEndInterview}
              >
                End Interview
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4">
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-120px)]">
          {/* Left Panel - AI Conversation */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="h-full flex flex-col gap-4 pr-4">
              {/* Current AI Message */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MessageCircle className="w-5 h-5" />
                    AI Interviewer
                    {isConnected && (
                      <Badge variant="secondary" className="ml-2">
                        <Radio className="w-3 h-3 mr-1 animate-pulse" />
                        Live
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 leading-relaxed min-h-[60px]">
                    {aiMessage || "Click Connect to start your interview"}
                  </p>
                  {userSpeech && (
                    <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <p className="text-sm text-blue-400">You: "{userSpeech}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conversation History */}
              <Card className="bg-gray-800 border-gray-700 flex-1">
                <CardHeader>
                  <CardTitle className="text-white">Conversation History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 overflow-y-auto max-h-64">
                  {conversationHistory.map((entry, index) => (
                    <div key={index} className="space-y-2">
                      <div className="bg-gray-700/50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-400">You:</p>
                        <p className="text-sm text-gray-300">{entry.user}</p>
                      </div>
                      <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/30">
                        <p className="text-sm font-medium text-blue-400">AI:</p>
                        <p className="text-sm text-gray-300">{entry.ai}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-400 space-y-2">
                    <p className="font-medium text-gray-300">💡 How it works:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Click Connect to start</li>
                      <li>• Just speak naturally - AI is listening</li>
                      <li>• AI will respond with voice</li>
                      <li>• Share your code anytime</li>
                      <li>• Run your code to test it</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Code Editor & Output */}
          <ResizablePanel defaultSize={65} minSize={50}>
            <div className="h-full flex flex-col gap-4 pl-4">
              {/* Code Editor */}
              <Card className="bg-gray-800 border-gray-700 flex-1 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Code className="w-5 h-5" />
                      Code Editor
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={sendCodeUpdate}
                        disabled={!isConnected}
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        Share Code with AI
                      </Button>
                      <Button
                        onClick={runCode}
                        disabled={isRunning || !isConnected}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isRunning ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Run Code
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={resetCode}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-full">
                  <div className="h-full w-full" style={{ height: 'calc(100% - 80px)', minHeight: '400px' }}>
                    <Editor
                      height="100%"
                      width="100%"
                      defaultLanguage="javascript"
                      value={code}
                      onChange={(value) => setCode(value || "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        roundedSelection: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on',
                        padding: { top: 10, bottom: 10 }
                      }}
                      loading={<div className="flex items-center justify-center h-full text-gray-400">Loading editor...</div>}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Output & Test Results */}
              <Card className="bg-gray-800 border-gray-700 h-48">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <span>Output & Test Results</span>
                    {testResults.total > 0 && (
                      <Badge variant={testResults.passed === testResults.total ? "default" : "destructive"}>
                        {testResults.passed === testResults.total ? (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-1" />
                        )}
                        {testResults.passed}/{testResults.total} Tests Passed
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {output && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-gray-300">Console Output:</h4>
                        <pre className="bg-gray-900 p-3 rounded text-sm overflow-auto max-h-20 text-green-400 border border-gray-700">
                          {output}
                        </pre>
                      </div>
                    )}
                    
                    {testResults.details.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-gray-300">Test Details:</h4>
                        <div className="space-y-1">
                          {testResults.details.map((detail, index) => (
                            <div key={index} className="text-sm text-gray-300 bg-gray-900 p-2 rounded border border-gray-700">
                              {detail}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {!output && testResults.details.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <p>Run your code to see output and results here</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default LiveCoding; 