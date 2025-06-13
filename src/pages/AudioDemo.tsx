import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mic, 
  MicOff, 
  Play, 
  Square,
  Volume2,
  MessageCircle
} from "lucide-react";
import { useAudio } from "@/hooks/useAudio";
import { generateSpeech, playBase64Audio, VOICES } from "@/utils/elevenlabs";
import Navigation from "@/components/Navigation";
import VoiceTest from "@/components/VoiceTest";
import QuickTTSTest from "@/components/QuickTTSTest";

const AudioDemo = () => {
  const audio = useAudio();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'speaking'>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].voice_id);

  // Set up audio recording callback
  useEffect(() => {
    audio.setOnAudioRecorded(async (audioBlob) => {
      console.log('🎤 Audio recorded successfully!', {
        size: audioBlob.size,
        type: audioBlob.type,
        duration: recordingDuration
      });
      setStatus('processing');
      setRecordingDuration(0);
      
      // Show that we captured audio
      setTranscript(`[Processing ${(audioBlob.size / 1024).toFixed(1)}KB of audio...]`);
      
      // Process real transcription and generate contextual AI response
      await processRealTranscription(audioBlob);
    });
  }, [audio, recordingDuration]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (audio.isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [audio.isRecording]);

  const processRealTranscription = async (audioBlob: Blob) => {
    try {
      console.log('🎯 Processing your actual speech...', audioBlob.size, 'bytes');
      
      // Convert audio blob to base64 for API
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      // Call real transcription API using our dedicated speech transcription function
      const transcriptResponse = await fetch('https://llfckjszmvhirwjfzdqj.supabase.co/functions/v1/speech-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZmNranN6bXZoaXJ3amZ6ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTIxNDIsImV4cCI6MjA2NTM2ODE0Mn0.G9FHck8cRIdz5K31ZmnMHufIWceW6fF2pmc9m4BUBbE'
        },
        body: JSON.stringify({
          audio: base64Audio,
          session_id: 'demo-session-' + Date.now(),
          format: 'webm'
        })
      });

      let userTranscript = '';
      
      if (transcriptResponse.ok) {
        const transcriptData = await transcriptResponse.json();
        userTranscript = transcriptData.transcript || 'No speech detected';
        console.log('✅ Real transcription:', userTranscript);
      } else {
        console.warn('⚠️ Transcription failed, using fallback');
        userTranscript = '[Audio recorded but transcription unavailable - please try speaking clearly]';
      }
      
      setTranscript(userTranscript);
      
      // Generate contextual AI response based on what you actually said
      await generateContextualAIResponse(userTranscript);
      
    } catch (error) {
      console.error('❌ Real transcription failed:', error);
      setTranscript('[Error processing audio - please try again]');
      await generateContextualAIResponse('[Error processing audio]');
    }
  };

  const generateContextualAIResponse = async (userInput: string) => {
    try {
      console.log('🤖 Generating contextual AI response for:', userInput);
      
      // Call real AI response generation API
      const aiResponse = await fetch('https://llfckjszmvhirwjfzdqj.supabase.co/functions/v1/ai-interview-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZmNranN6bXZoaXJ3amZ6ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTIxNDIsImV4cCI6MjA2NTM2ODE0Mn0.G9FHck8cRIdz5K31ZmnMHufIWceW6fF2pmc9m4BUBbE'
        },
        body: JSON.stringify({
          user_input: userInput,
          session_id: 'demo-session-' + Date.now(),
          context: 'audio_demo'
        })
      });

      let response = '';
      
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        // Check if there's an error with fallback
        if (aiData.error) {
          response = aiData.fallback_response || generateFallbackResponse(userInput);
          console.log('⚠️ AI API error, using fallback:', aiData.error);
        } else {
          response = aiData.response || 'I understand. Could you tell me more?';
          console.log('✅ AI generated contextual response:', response);
        }
      } else {
        console.warn('⚠️ AI response failed, using fallback');
        response = generateFallbackResponse(userInput);
      }
      
      setAiResponse(response);
      
      // Play the AI response with natural voice
      setStatus('speaking');
      await simulateTextToSpeech(response);
      setStatus('idle');
      
    } catch (error) {
      console.error('❌ AI response generation failed:', error);
      const fallbackResponse = generateFallbackResponse(userInput);
      setAiResponse(fallbackResponse);
      
      setStatus('speaking');
      await simulateTextToSpeech(fallbackResponse);
      setStatus('idle');
    }
  };

  const generateFallbackResponse = (userInput: string): string => {
    // Smart fallback based on keywords in user input
    const input = userInput.toLowerCase();
    
    if (input.includes('experience') || input.includes('years')) {
      return "That's valuable experience! Can you tell me more about the most challenging project you've worked on?";
    } else if (input.includes('react') || input.includes('javascript') || input.includes('frontend')) {
      return "Great! React is such a powerful framework. What's your favorite feature about React development?";
    } else if (input.includes('backend') || input.includes('node') || input.includes('api')) {
      return "Backend development is crucial! How do you approach API design and database optimization?";
    } else if (input.includes('problem') || input.includes('challenge') || input.includes('difficult')) {
      return "Problem-solving is key in our field! Can you walk me through your approach to tackling complex issues?";
    } else if (input.includes('team') || input.includes('collaborate')) {
      return "Teamwork is essential! How do you handle disagreements or conflicts within a development team?";
    } else if (input.includes('hello') || input.includes('hi') || input.includes('introduction')) {
      return "Nice to meet you! I'm excited to learn about your background. Could you start by telling me about your development experience?";
    } else {
      return "That's interesting! Could you elaborate on that and perhaps share a specific example?";
    }
  };

  const simulateTextToSpeech = async (text: string) => {
    try {
      console.log('🔊 Generating natural speech with ElevenLabs via backend...');
      
      // Use the ElevenLabs API via our backend for natural voices
      const audioBase64 = await generateSpeech(text, selectedVoice);
      await playBase64Audio(audioBase64);
      
      console.log('✅ Natural speech playback completed');
      return;
      
    } catch (error) {
      console.error('❌ ElevenLabs TTS failed, falling back to browser TTS:', error);
      
      // Fallback to browser speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        
        return new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
          speechSynthesis.speak(utterance);
        });
      } else {
        // Final fallback: just wait
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  };

  const handleRecordToggle = async () => {
    if (audio.isRecording) {
      audio.stopRecording();
      setIsListening(false);
      setStatus('processing');
    } else {
      if (!audio.hasPermission) {
        const hasPermission = await audio.requestPermission();
        if (!hasPermission) {
          alert('Microphone permission is required');
          return;
        }
      }
      
      await audio.startRecording();
      setIsListening(true);
      setStatus('recording');
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'recording':
        return { text: "🎤 Recording... Speak now!", color: "text-red-400" };
      case 'processing':
        return { text: "🤔 Processing your response...", color: "text-yellow-400" };
      case 'speaking':
        return { text: "🗣️ AI is speaking...", color: "text-blue-400" };
      default:
        return { text: "Ready to start", color: "text-gray-400" };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Voice Interview Demo</h1>
            <p className="text-muted-foreground mb-4">
              Test the complete voice interaction flow: Record → Transcribe → AI Response → Speech
            </p>
            
            {/* Quick Backend Test */}
            <QuickTTSTest />
          </div>

          {/* Voice Visualization */}
          <div className="text-center">
            <div className={`w-48 h-48 mx-auto rounded-full bg-gradient-primary opacity-20 ${audio.isRecording ? 'animate-pulse' : ''} flex items-center justify-center`}>
              <div className={`w-36 h-36 rounded-full bg-gradient-primary opacity-40 ${audio.isRecording ? 'animate-pulse' : ''} flex items-center justify-center`}>
                <div className={`w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center ${audio.isRecording ? 'animate-pulse' : ''}`}>
                  {status === 'recording' && <Mic className="w-12 h-12 text-white" />}
                  {status === 'processing' && <MessageCircle className="w-12 h-12 text-white animate-spin" />}
                  {status === 'speaking' && <Volume2 className="w-12 h-12 text-white" />}
                  {status === 'idle' && <Play className="w-12 h-12 text-white" />}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
                             <p className={`text-lg font-medium ${statusDisplay.color}`}>
                 {statusDisplay.text}
               </p>
               
               {audio.isRecording && (
                 <div className="mt-2 max-w-md mx-auto space-y-2">
                   <div className="text-sm text-center">
                     Recording: {recordingDuration}s
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="text-sm">Level:</span>
                     <div className="flex-1 bg-gray-700 rounded-full h-3">
                       <div 
                         className="bg-gradient-primary h-3 rounded-full transition-all duration-100"
                         style={{ width: `${audio.audioLevel * 100}%` }}
                       />
                     </div>
                     <span className="text-sm">{Math.round(audio.audioLevel * 100)}%</span>
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

          {/* Voice Test - Standalone */}
          <div className="max-w-md mx-auto">
            <VoiceTest />
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={handleRecordToggle}
              disabled={status === 'processing' || status === 'speaking'}
              className={audio.isRecording ? "bg-red-500 hover:bg-red-600" : "bg-gradient-primary"}
              size="lg"
            >
              {audio.isRecording ? (
                <>
                  <Square className="w-5 h-5 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
          </div>

          {/* Audio Status */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>Audio Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Microphone:</span>
                <Badge variant={audio.hasPermission ? "default" : "destructive"}>
                  {audio.hasPermission ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Recording:</span>
                <Badge variant={audio.isRecording ? "destructive" : "secondary"}>
                  {audio.isRecording ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Playback:</span>
                <Badge variant={audio.isPlaying ? "default" : "secondary"}>
                  {audio.isPlaying ? 'Playing' : 'Idle'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Conversation */}
          {(transcript || aiResponse) && (
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle>Conversation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transcript && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Mic className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-400">You said:</p>
                      <p className="text-muted-foreground">{transcript}</p>
                    </div>
                  </div>
                )}
                
                {aiResponse && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Volume2 className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-green-400">AI Interviewer:</p>
                      <p className="text-muted-foreground">{aiResponse}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>How to Test</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Click "Start Recording" to begin capturing audio</li>
                <li>Speak clearly into your microphone for a few seconds</li>
                <li>Click "Stop Recording" or wait for auto-stop</li>
                <li>Watch as your speech is "transcribed" (simulated)</li>
                <li>Listen to the AI response (uses browser speech synthesis)</li>
                <li>Repeat to test the full conversation flow</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AudioDemo; 