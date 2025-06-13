import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { 
  Play, 
  Square, 
  Mic, 
  MicOff,
  Clock,
  MessageCircle,
  Code,
  Volume2,
  RotateCcw,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useAudio } from "@/hooks/useAudio";
import { generateSpeech, playBase64Audio } from "@/utils/elevenlabs";
import { supabase } from "@/lib/supabase";
import { codingAPI } from "@/lib/api";
import Editor from "@monaco-editor/react";

const LiveCoding = () => {
  const navigate = useNavigate();
  const audio = useAudio();
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Interview State
  const [sessionId] = useState<string>('coding-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
  const [elapsedTime, setElapsedTime] = useState(0);
  const [interviewState, setInterviewState] = useState<'idle' | 'recording' | 'processing' | 'speaking' | 'running'>('idle');
  
  // Code Editor State
  const [code, setCode] = useState(`// Welcome to your coding interview!
// Solve the problem step by step and talk through your approach.

function twoSum(nums, target) {
    // Your solution here
    
}

// Test cases
console.log(twoSum([2,7,11,15], 9)); // Expected: [0,1]
console.log(twoSum([3,2,4], 6));     // Expected: [1,2]`);
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{passed: number, total: number, details: string[]}>({passed: 0, total: 0, details: []});
  
  // AI & Audio State
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [displayedQuestion, setDisplayedQuestion] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{user: string, ai: string, timestamp: number}>>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [lastCodeSubmission, setLastCodeSubmission] = useState("");
  
  // Refs
  const editorRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('⚠️ User not authenticated, redirecting to onboarding');
          navigate('/');
          return;
        }
        console.log('✅ User authenticated:', user.email);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Initialize interview (only after authentication)
  useEffect(() => {
    if (!isAuthenticated || currentQuestion) return;
    
    const welcomeQuestion = "Welcome to your coding interview! I can see you have a two-sum problem to solve. Please start by explaining your approach and then implement your solution. Feel free to think out loud as you code.";
    setCurrentQuestion(welcomeQuestion);
    setDisplayedQuestion(welcomeQuestion);
    
    // Add a small delay to prevent overlapping audio
    setTimeout(() => {
      speakQuestion(welcomeQuestion);
    }, 1000);
  }, [isAuthenticated, currentQuestion]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio processing setup
  useEffect(() => {
    if (!isAuthenticated) return;
    
    audio.setOnAudioRecorded(async (audioBlob) => {
      console.log('🎤 Processing coding interview audio:', audioBlob.size, 'bytes');
      setInterviewState('processing');
      
      try {
        await processInterviewAudio(audioBlob);
      } catch (error) {
        console.error('❌ Audio processing failed:', error);
        setInterviewState('idle');
      }
    });
  }, [audio, conversationHistory, code, isAuthenticated]);

  // Live transcription during recording
  useEffect(() => {
    if (audio.isRecording) {
      setInterviewState('recording');
      setLiveTranscript("");
      startLiveTranscription();
    } else {
      stopLiveTranscription();
      if (liveTranscript) {
        setLiveTranscript("");
      }
    }
  }, [audio.isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startLiveTranscription = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);
      };
      
      recognitionRef.current.start();
    }
  };

  const stopLiveTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const processInterviewAudio = async (audioBlob: Blob) => {
    try {
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let base64Audio = '';
      const chunkSize = 8192;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        const chunkString = String.fromCharCode.apply(null, Array.from(chunk));
        base64Audio += btoa(chunkString);
      }
      
      // Call transcription API (simulate for now)
      const transcript = liveTranscript || "I'm working on the solution step by step...";
      
      // Generate AI response based on code + transcript
      const aiResponse = await generateCodingFeedback(transcript, code);
      
      // Update conversation history
      const newEntry = {
        user: transcript,
        ai: aiResponse,
        timestamp: Date.now()
      };
      setConversationHistory(prev => [...prev, newEntry]);
      
      // Speak the AI response
      setCurrentQuestion(aiResponse);
      await speakQuestion(aiResponse);
      
      setInterviewState('idle');
    } catch (error) {
      console.error('❌ Failed to process interview audio:', error);
      setInterviewState('idle');
    }
  };

  const generateCodingFeedback = async (userTranscript: string, currentCode: string): Promise<string> => {
    try {
      // Call Supabase Edge Function for AI feedback
      const { feedback } = await codingAPI.getCodingFeedback({
        transcript: userTranscript,
        code: currentCode,
        language: language,
        problem: "Two Sum Problem",
        testResults: testResults
      });
      
      return feedback;
    } catch (error) {
      console.error('❌ Failed to generate AI feedback:', error);
      // Fallback responses based on code analysis
      return generateFallbackFeedback(userTranscript, currentCode);
    }
  };

  const generateFallbackFeedback = (transcript: string, currentCode: string): string => {
    if (currentCode.includes('for') && currentCode.includes('for')) {
      return "I see you're using nested loops. That's a valid approach! However, can you think of a more efficient solution using a hash map to achieve O(n) time complexity?";
    }
    
    if (currentCode.includes('Map') || currentCode.includes('{}')) {
      return "Great! I see you're considering a hash map approach. That's the optimal solution. Can you walk me through how you'll use it to find the target sum?";
    }
    
    if (currentCode.length < 50) {
      return "I see you're thinking through the problem. Remember, you need to find two numbers that add up to the target. What's your approach going to be?";
    }
    
    return "Good progress! Keep explaining your thought process as you code. I'm here to help if you get stuck.";
  };

  const speakQuestion = async (text: string) => {
    // Prevent overlapping audio
    if (interviewState === 'speaking') {
      console.log('🔇 Audio already playing, skipping...');
      return;
    }
    
    setInterviewState('speaking');
    try {
      // This would use your existing ElevenLabs integration
      const audioData = await generateSpeech(text);
      await playBase64Audio(audioData);
    } catch (error) {
      console.error('❌ Failed to speak question:', error);
    }
    setInterviewState('idle');
  };

  const runCode = async () => {
    setIsRunning(true);
    setInterviewState('running');
    
    try {
      // Use secure backend execution
      const testCases = [
        { input: [[2,7,11,15], 9], expected: [0,1], description: "Basic case: [2,7,11,15], target 9" },
        { input: [[3,2,4], 6], expected: [1,2], description: "Alternative case: [3,2,4], target 6" },
        { input: [[3,3], 6], expected: [0,1], description: "Duplicate numbers: [3,3], target 6" }
      ];
      
      const result = await codingAPI.executeCode({
        code,
        language: 'javascript',
        testCases,
        functionName: 'twoSum'
      });
      
      setOutput(result.output);
      setTestResults(result.tests);
      setLastCodeSubmission(code);
      
      // Generate AI feedback on the execution
      const feedback = `${result.tests.passed === result.tests.total ? 
        "Excellent! All tests passed. Your solution looks correct. Can you walk me through the time and space complexity?" : 
        `${result.tests.passed} out of ${result.tests.total} tests passed. Let's work on fixing the failing cases together.`}`;
      
      await speakQuestion(feedback);
    } catch (error) {
      setOutput(`Error: ${error}`);
      console.error('❌ Code execution failed:', error);
    }
    
    setIsRunning(false);
    setInterviewState('idle');
  };

  const executeJavaScript = (code: string) => {
    try {
      // Simple JavaScript execution simulation
      const func = new Function(`
        ${code}
        
        const results = [];
        const originalLog = console.log;
        console.log = (...args) => results.push(args.join(' '));
        
        try {
          const test1 = twoSum([2,7,11,15], 9);
          const test2 = twoSum([3,2,4], 6);
          
          return {
            output: results.join('\\n'),
            tests: {
              passed: (JSON.stringify(test1) === '[0,1]' ? 1 : 0) + (JSON.stringify(test2) === '[1,2]' ? 1 : 0),
              total: 2,
              details: [
                \`Test 1: \${JSON.stringify(test1)} (expected [0,1])\`,
                \`Test 2: \${JSON.stringify(test2)} (expected [1,2])\`
              ]
            }
          };
        } finally {
          console.log = originalLog;
        }
      `);
      
      return func();
    } catch (error) {
      return {
        output: `Error: ${error}`,
        tests: { passed: 0, total: 2, details: ['Error executing code'] }
      };
    }
  };

  const handleEndInterview = async () => {
    // Save session data similar to LiveInterview.tsx
    const sessionData = {
      sessionId,
      type: 'coding',
      duration: elapsedTime,
      finalCode: code,
      testResults,
      conversationHistory,
      timestamp: Date.now()
    };
    
    localStorage.setItem('codingSessionSummary', JSON.stringify(sessionData));
    navigate("/session-summary");
  };

  const resetCode = () => {
    setCode(`// Welcome to your coding interview!
// Solve the problem step by step and talk through your approach.

function twoSum(nums, target) {
    // Your solution here
    
}

// Test cases
console.log(twoSum([2,7,11,15], 9)); // Expected: [0,1]
console.log(twoSum([3,2,4], 6));     // Expected: [1,2]`);
    setOutput("");
    setTestResults({passed: 0, total: 0, details: []});
  };

  const getStateIndicator = () => {
    switch (interviewState) {
      case 'recording': return <Badge variant="outline" className="bg-red-500/20 text-red-400"><Mic className="w-3 h-3 mr-1" />Recording</Badge>;
      case 'processing': return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">Processing...</Badge>;
      case 'speaking': return <Badge variant="outline" className="bg-blue-500/20 text-blue-400"><Volume2 className="w-3 h-3 mr-1" />AI Speaking</Badge>;
      case 'running': return <Badge variant="outline" className="bg-green-500/20 text-green-400"><Play className="w-3 h-3 mr-1" />Running Code</Badge>;
      default: return <Badge variant="outline" className="bg-gray-500/20 text-gray-400">Ready</Badge>;
    }
  };

  // Show loading screen if authentication is still loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview session...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect should happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Code className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold">Live Coding Interview</h1>
            </div>
            {getStateIndicator()}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {formatTime(elapsedTime)}
            </div>
            <Button variant="destructive" onClick={handleEndInterview}>
              End Interview
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4">
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-120px)]">
          {/* Left Panel - Problem & AI */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="h-full flex flex-col gap-4 pr-4">
              {/* Current Question */}
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    AI Interviewer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {displayedQuestion || "Loading question..."}
                  </p>
                  {liveTranscript && (
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg border">
                      <p className="text-sm text-primary">You're saying: "{liveTranscript}"</p>
                    </div>
                  )}
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

              {/* Voice Controls */}
              <Card className="glass-card border-0">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={audio.isRecording ? audio.stopRecording : audio.startRecording}
                      variant={audio.isRecording ? "destructive" : "default"}
                      disabled={interviewState === 'processing' || interviewState === 'speaking'}
                    >
                      {audio.isRecording ? <Square className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                      {audio.isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Code Editor & Output */}
          <ResizablePanel defaultSize={65}>
            <ResizablePanelGroup direction="vertical">
              {/* Code Editor */}
              <ResizablePanel defaultSize={70} minSize={50}>
                <Card className="glass-card border-0 h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle>Code Editor</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetCode}
                        disabled={interviewState === 'running'}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                      <Button
                        onClick={runCode}
                        disabled={isRunning || interviewState === 'running'}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {isRunning ? 'Running...' : 'Run Code'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-80px)]">
                    <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      value={code}
                      onChange={(value) => setCode(value || "")}
                      onMount={(editor) => { editorRef.current = editor; }}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        automaticLayout: true,
                      }}
                    />
                  </CardContent>
                </Card>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Output Panel */}
              <ResizablePanel defaultSize={30} minSize={20}>
                <Card className="glass-card border-0 h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Output & Test Results
                      {testResults.total > 0 && (
                        <Badge variant={testResults.passed === testResults.total ? "default" : "destructive"}>
                          {testResults.passed === testResults.total ? 
                            <CheckCircle className="w-3 h-3 mr-1" /> : 
                            <XCircle className="w-3 h-3 mr-1" />
                          }
                          {testResults.passed}/{testResults.total} tests passed
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {output && (
                      <div>
                        <p className="text-sm font-medium mb-2">Console Output:</p>
                        <pre className="bg-secondary/50 p-3 rounded text-sm overflow-x-auto">
                          {output}
                        </pre>
                      </div>
                    )}
                    
                    {testResults.details.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Test Results:</p>
                        <div className="space-y-1">
                          {testResults.details.map((detail, index) => (
                            <div key={index} className="text-sm bg-secondary/30 p-2 rounded">
                              {detail}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default LiveCoding; 