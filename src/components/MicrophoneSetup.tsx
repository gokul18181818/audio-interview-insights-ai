import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Mic, 
  MicOff, 
  CheckCircle, 
  AlertCircle, 
  Volume2,
  Play,
  RefreshCw
} from "lucide-react";
import { useAudio } from "@/hooks/useAudio";

interface MicrophoneSetupProps {
  onSetupComplete: () => void;
  onCancel: () => void;
}

const MicrophoneSetup = ({ onSetupComplete, onCancel }: MicrophoneSetupProps) => {
  const audio = useAudio();
  const [setupStep, setSetupStep] = useState<'permission' | 'testing' | 'complete'>('permission');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [testRecording, setTestRecording] = useState(false);
  const [testDuration, setTestDuration] = useState(0);
  const [testBlob, setTestBlob] = useState<Blob | null>(null);
  const [playingTest, setPlayingTest] = useState(false);

  // Check existing permission on mount
  useEffect(() => {
    if (audio.hasPermission) {
      setPermissionGranted(true);
      setSetupStep('testing');
    }
  }, [audio.hasPermission]);

  // Test recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (testRecording) {
      interval = setInterval(() => {
        setTestDuration(prev => prev + 1);
      }, 1000);
    } else {
      setTestDuration(0);
    }
    
    return () => clearInterval(interval);
  }, [testRecording]);

  // Handle recorded test audio
  useEffect(() => {
    audio.setOnAudioRecorded((blob) => {
      setTestBlob(blob);
      setTestRecording(false);
      console.log('✅ Test recording completed:', blob.size, 'bytes');
    });
  }, [audio]);

  const requestPermission = async () => {
    try {
      const granted = await audio.requestPermission();
      setPermissionGranted(granted);
      if (granted) {
        setSetupStep('testing');
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const startTestRecording = async () => {
    try {
      setTestBlob(null);
      await audio.startRecording();
      setTestRecording(true);
    } catch (error) {
      console.error('Test recording failed:', error);
    }
  };

  const stopTestRecording = () => {
    if (audio.isRecording) {
      audio.stopRecording();
      setTestRecording(false);
    }
  };

  const playTestAudio = async () => {
    if (!testBlob) return;
    
    try {
      setPlayingTest(true);
      const audioUrl = URL.createObjectURL(testBlob);
      const audioElement = new Audio(audioUrl);
      
      audioElement.onended = () => {
        setPlayingTest(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audioElement.play();
    } catch (error) {
      console.error('Test playback failed:', error);
      setPlayingTest(false);
    }
  };

  const completeSetup = () => {
    setSetupStep('complete');
    setTimeout(() => {
      onSetupComplete();
    }, 1000);
  };

  const renderPermissionStep = () => (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
        <Mic className="w-12 h-12 text-blue-400" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-2">Microphone Permission Required</h3>
        <p className="text-muted-foreground">
          We need access to your microphone to conduct the interview.
          Your audio will be processed securely and used only for interview analysis.
        </p>
      </div>

      <div className="space-y-3">
        {!permissionGranted ? (
          <Button onClick={requestPermission} className="w-full bg-gradient-primary">
            <Mic className="w-4 h-4 mr-2" />
            Grant Microphone Permission
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span>Permission Granted!</span>
          </div>
        )}
        
        <Button variant="outline" onClick={onCancel} className="w-full">
          Cancel Interview
        </Button>
      </div>
    </div>
  );

  const renderTestingStep = () => (
    <div className="text-center space-y-6">
      <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all ${
        testRecording ? 'bg-red-500/20 animate-pulse' : 'bg-green-500/20'
      }`}>
        {testRecording ? (
          <Mic className="w-12 h-12 text-red-400" />
        ) : (
          <CheckCircle className="w-12 h-12 text-green-400" />
        )}
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-2">Test Your Microphone</h3>
        <p className="text-muted-foreground">
          Let's make sure your microphone is working properly.
          Record a short test message and play it back.
        </p>
      </div>

      {/* Audio Level Indicator */}
      {(testRecording || audio.isRecording) && (
        <div className="max-w-sm mx-auto space-y-2">
          <div className="text-sm">
            Recording: {testDuration}s
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Level:</span>
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-100"
                style={{ width: `${audio.audioLevel * 100}%` }}
              />
            </div>
            <span className="text-xs">{Math.round(audio.audioLevel * 100)}%</span>
          </div>
          {audio.audioLevel > 0.1 && (
            <div className="text-xs text-green-400">
              ✓ Detecting your voice!
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {!testRecording ? (
          <Button 
            onClick={startTestRecording} 
            className="w-full bg-gradient-primary"
            disabled={!permissionGranted}
          >
            <Mic className="w-4 h-4 mr-2" />
            Start Test Recording
          </Button>
        ) : (
          <Button 
            onClick={stopTestRecording} 
            variant="destructive" 
            className="w-full"
          >
            <MicOff className="w-4 h-4 mr-2" />
            Stop Recording ({testDuration}s)
          </Button>
        )}

        {testBlob && (
          <div className="space-y-2">
            <Button 
              onClick={playTestAudio} 
              variant="outline" 
              className="w-full"
              disabled={playingTest}
            >
              {playingTest ? (
                <>
                  <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                  Playing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play Test Recording
                </>
              )}
            </Button>
            
            <Button 
              onClick={completeSetup} 
              className="w-full bg-gradient-primary"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Microphone Works Great - Start Interview
            </Button>
          </div>
        )}

        <Button 
          onClick={() => setSetupStep('permission')} 
          variant="ghost" 
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset Setup
        </Button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle className="w-12 h-12 text-green-400" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-2 text-green-400">Setup Complete!</h3>
        <p className="text-muted-foreground">
          Your microphone is working perfectly. Starting your interview now...
        </p>
      </div>

      <Progress value={100} className="w-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-0">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Mic className="w-5 h-5" />
            Microphone Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          {setupStep === 'permission' && renderPermissionStep()}
          {setupStep === 'testing' && renderTestingStep()}
          {setupStep === 'complete' && renderCompleteStep()}
        </CardContent>
      </Card>
    </div>
  );
};

export default MicrophoneSetup; 