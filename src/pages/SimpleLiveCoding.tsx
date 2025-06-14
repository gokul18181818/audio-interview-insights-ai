import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Editor from "@monaco-editor/react";

const SimpleLiveCoding = () => {
  const navigate = useNavigate();
  
  // Basic state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [aiMessage, setAiMessage] = useState("Click Connect to start your interview");
  const [userSpeech, setUserSpeech] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Code editor
  const [code, setCode] = useState(`function twoSum(nums, target) {
    // Your solution here
    
}`);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/');
    };
    checkAuth();
  }, [navigate]);

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
        setAiMessage("Hi! I'm ready to help with your coding interview. What would you like to work on?");
        
        // Configure session
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a coding interview assistant. Keep responses short and helpful.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.6,
              silence_duration_ms: 1000
            },
            max_response_output_tokens: 150
          }
        }));
        
        startAudioStream(ws);
      };
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        console.log('Message:', msg.type);
        
        if (msg.type === 'conversation.item.input_audio_transcription.completed') {
          setUserSpeech(msg.transcript);
        }
        
        if (msg.type === 'response.audio_transcript.done') {
          setAiMessage(msg.transcript);
          setUserSpeech("");
        }
        
        if (msg.type === 'response.audio.delta' && audioEnabled) {
          queueAudio(msg.delta);
        }
        
        if (msg.type === 'response.audio.done') {
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

  const startAudioStream = (ws: WebSocket) => {
    if (!streamRef.current || !audioContextRef.current) return;
    
    const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Simple Live Coding Interview</h1>
          
          <div className="flex items-center gap-4">
            {/* Status */}
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
            </Badge>
            
            {/* Audio Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAudioEnabled(!audioEnabled)}
              disabled={!isConnected}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            
            {/* Connect/Disconnect */}
            <Button
              onClick={isConnected ? disconnect : connect}
              disabled={isConnecting}
              variant={isConnected ? "destructive" : "default"}
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: AI Chat */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* AI Message */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">AI:</p>
                <p>{aiMessage}</p>
              </div>
              
              {/* User Speech */}
              {userSpeech && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">You:</p>
                  <p>{userSpeech}</p>
                </div>
              )}
              
              {/* Instructions */}
              <div className="text-sm text-gray-500 space-y-2">
                <p><strong>How to use:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Click Connect to start</li>
                  <li>Just speak naturally</li>
                  <li>AI will respond with voice</li>
                  <li>Share your code anytime</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Right: Code Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Code Editor
                <Button
                  onClick={sendCodeUpdate}
                  disabled={!isConnected}
                  size="sm"
                >
                  Share Code with AI
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SimpleLiveCoding; 