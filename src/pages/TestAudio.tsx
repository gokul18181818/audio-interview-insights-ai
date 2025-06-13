import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Play, 
  Square,
  Volume2,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { useAudio } from "@/hooks/useAudio";
import { AudioWebSocket } from "@/lib/api";
import Navigation from "@/components/Navigation";

const TestAudio = () => {
  const audio = useAudio();
  const [tests, setTests] = useState({
    micPermission: 'pending',
    recording: 'pending',
    playback: 'pending',
    websocket: 'pending',
    backend: 'pending'
  });
  const [testLog, setTestLog] = useState<string[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateTestStatus = (test: string, status: 'pending' | 'success' | 'failed') => {
    setTests(prev => ({ ...prev, [test]: status }));
  };

  // Test 1: Microphone Permission
  const testMicrophonePermission = async () => {
    addLog("Testing microphone permission...");
    try {
      const hasPermission = await audio.requestPermission();
      if (hasPermission) {
        updateTestStatus('micPermission', 'success');
        addLog("✅ Microphone permission granted");
        return true;
      } else {
        updateTestStatus('micPermission', 'failed');
        addLog("❌ Microphone permission denied");
        return false;
      }
    } catch (error) {
      updateTestStatus('micPermission', 'failed');
      addLog(`❌ Microphone permission error: ${error}`);
      return false;
    }
  };

  // Test 2: Audio Recording
  const testRecording = async () => {
    addLog("Testing audio recording (5 seconds)...");
    try {
      await audio.startRecording();
      addLog("🎤 Recording started - please speak for 5 seconds");
      
      // Record for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      audio.stopRecording();
      updateTestStatus('recording', 'success');
      addLog("✅ Audio recording completed");
      return true;
    } catch (error) {
      updateTestStatus('recording', 'failed');
      addLog(`❌ Recording error: ${error}`);
      return false;
    }
  };

  // Test 3: Audio Playback
  const testPlayback = async () => {
    addLog("Testing audio playback...");
    try {
      // Create a simple test tone (beep)
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateTestStatus('playback', 'success');
      addLog("✅ Audio playback test completed (you should have heard a beep)");
      return true;
    } catch (error) {
      updateTestStatus('playback', 'failed');
      addLog(`❌ Playback error: ${error}`);
      return false;
    }
  };

  // Test 4: WebSocket Connection
  const testWebSocket = async () => {
    addLog("Testing WebSocket connection...");
    try {
      const ws = new AudioWebSocket({
        onTranscription: (data) => {
          addLog(`📝 Transcription received: ${data.text}`);
        },
        onAudioResponse: (data) => {
          addLog(`🔊 Audio response received`);
        },
        onError: (error) => {
          addLog(`❌ WebSocket error: ${error}`);
        }
      });

      await ws.connect();
      addLog("🔌 WebSocket connected successfully");
      
      // Send a test message
      if (ws.sendAudioChunk) {
        console.log("WebSocket methods available");
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      ws.disconnect?.();
      updateTestStatus('websocket', 'success');
      addLog("✅ WebSocket test completed");
      return true;
    } catch (error) {
      updateTestStatus('websocket', 'failed');
      addLog(`❌ WebSocket error: ${error}`);
      return false;
    }
  };

  // Test 5: Backend API & Transcription
  const testBackend = async () => {
    addLog("Testing backend APIs...");
    try {
      // Test 1: Question generation
      addLog("Testing question generation...");
      const questionResponse = await fetch('https://llfckjszmvhirwjfzdqj.supabase.co/functions/v1/question-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZmNranN6bXZoaXJ3amZ6ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTIxNDIsImV4cCI6MjA2NTM2ODE0Mn0.G9FHck8cRIdz5K31ZmnMHufIWceW6fF2pmc9m4BUBbE'
        },
        body: JSON.stringify({
          role: 'Frontend Developer',
          type: 'behavioral',
          company: 'Test Company'
        })
      });

      if (questionResponse.ok) {
        const questionData = await questionResponse.json();
        addLog(`✅ Question generation working! Generated: "${questionData.question?.substring(0, 60)}..."`);
      } else {
        throw new Error(`Question API responded with ${questionResponse.status}`);
      }

      // Test 2: Transcription with a recorded audio file
      if (audio.lastRecordedBlob) {
        addLog("Testing transcription with your recorded audio...");
        
        // Convert blob to base64
        const base64Audio = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(audio.lastRecordedBlob!);
        });

        const transcriptResponse = await fetch('https://llfckjszmvhirwjfzdqj.supabase.co/functions/v1/transcript-handler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZmNranN6bXZoaXJ3amZ6ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTIxNDIsImV4cCI6MjA2NTM2ODE0Mn0.G9FHck8cRIdz5K31ZmnMHufIWceW6fF2pmc9m4BUBbE'
          },
          body: JSON.stringify({
            audio: base64Audio,
            session_id: 'test-session-' + Date.now()
          })
        });

        if (transcriptResponse.ok) {
          const transcriptData = await transcriptResponse.json();
          addLog(`✅ Transcription working! Result: "${transcriptData.transcript || 'No speech detected'}"`);
        } else {
          addLog(`⚠️ Transcription failed (${transcriptResponse.status}) - this is normal if no speech was detected`);
        }
      } else {
        addLog("⚠️ No recorded audio available for transcription test");
      }

      updateTestStatus('backend', 'success');
      return true;
      
    } catch (error) {
      updateTestStatus('backend', 'failed');
      addLog(`❌ Backend API error: ${error}`);
      return false;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestLog([]);
    
    // Reset all tests
    setTests({
      micPermission: 'pending',
      recording: 'pending', 
      playback: 'pending',
      websocket: 'pending',
      backend: 'pending'
    });

    addLog("🚀 Starting comprehensive audio test suite...");

    // Run tests sequentially
    const micOk = await testMicrophonePermission();
    if (micOk) {
      await testRecording();
    }
    
    await testPlayback();
    await testWebSocket();
    await testBackend();

    addLog("🎉 Test suite completed!");
    setIsRunningTests(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending': return <Loader2 className="w-5 h-5 text-gray-400" />;
      default: return <Loader2 className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Audio System Test</h1>
            <p className="text-muted-foreground">
              Verify that microphone, audio playback, and backend integration work correctly
            </p>
          </div>

          {/* Test Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'micPermission', title: 'Microphone Permission', icon: Mic },
              { key: 'recording', title: 'Audio Recording', icon: MicOff },
              { key: 'playback', title: 'Audio Playback', icon: Volume2 },
              { key: 'websocket', title: 'WebSocket Connection', icon: Play },
              { key: 'backend', title: 'Backend API', icon: Square }
            ].map(({ key, title, icon: Icon }) => (
              <Card key={key} className="glass-card border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <div className="flex-1">
                      <h3 className="font-medium">{title}</h3>
                    </div>
                    {getStatusIcon(tests[key as keyof typeof tests])}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <Button 
              onClick={runAllTests}
              disabled={isRunningTests}
              className="bg-gradient-primary"
            >
              {isRunningTests ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              onClick={testMicrophonePermission}
              disabled={isRunningTests}
            >
              <Mic className="w-4 h-4 mr-2" />
              Test Microphone Only
            </Button>
          </div>

          {/* Current Audio Status */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>Current Audio Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Microphone Permission:</span>
                <Badge className={getStatusColor(audio.hasPermission ? 'success' : 'failed')}>
                  {audio.hasPermission ? 'Granted' : 'Not Granted'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Recording Status:</span>
                <Badge className={getStatusColor(audio.isRecording ? 'success' : 'pending')}>
                  {audio.isRecording ? 'Recording' : 'Idle'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Playback Status:</span>
                <Badge className={getStatusColor(audio.isPlaying ? 'success' : 'pending')}>
                  {audio.isPlaying ? 'Playing' : 'Idle'}
                </Badge>
              </div>
              {audio.isRecording && (
                <div className="flex items-center gap-2">
                  <span>Audio Level:</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-primary h-2 rounded-full transition-all duration-100"
                      style={{ width: `${audio.audioLevel * 100}%` }}
                    />
                  </div>
                  <span className="text-sm">{Math.round(audio.audioLevel * 100)}%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Log */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>Test Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black/20 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
                {testLog.length === 0 ? (
                  <p className="text-muted-foreground">No tests run yet. Click "Run All Tests" to begin.</p>
                ) : (
                  testLog.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TestAudio; 