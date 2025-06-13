
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Square, 
  Volume2,
  Clock,
  MessageCircle
} from "lucide-react";

const LiveInterview = () => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [interviewState, setInterviewState] = useState<'listening' | 'processing' | 'speaking'>('listening');

  const questions = [
    "Tell me about yourself and your background in software engineering.",
    "Describe a challenging technical problem you've solved recently.",
    "How do you handle working with tight deadlines and multiple priorities?",
    "Walk me through your approach to debugging a complex issue.",
    "Tell me about a time you had to learn a new technology quickly."
  ];

  useEffect(() => {
    // Simulate interview flow
    const questionIndex = Math.floor(elapsedTime / 30) % questions.length;
    setCurrentQuestion(questions[questionIndex]);

    // Timer
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [elapsedTime]);

  useEffect(() => {
    // Simulate interview states
    const stateTimer = setInterval(() => {
      if (interviewState === 'listening') {
        setInterviewState('processing');
        setTimeout(() => setInterviewState('speaking'), 2000);
        setTimeout(() => setInterviewState('listening'), 5000);
      }
    }, 8000);

    return () => clearInterval(stateTimer);
  }, [interviewState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndInterview = () => {
    navigate("/session-summary");
  };

  const getStateDisplay = () => {
    switch (interviewState) {
      case 'listening':
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
          text: "Ready",
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
                  {interviewState === 'listening' && <Mic className="w-12 h-12 text-white" />}
                  {interviewState === 'processing' && <MessageCircle className="w-12 h-12 text-white animate-spin" />}
                  {interviewState === 'speaking' && <Volume2 className="w-12 h-12 text-white" />}
                </div>
              </div>
            </div>
            
            {/* State indicator */}
            <div className="mt-4">
              <p className={`text-lg font-medium ${stateDisplay.color}`}>
                {stateDisplay.text}
              </p>
            </div>
          </div>

          {/* Current Question */}
          <Card className="glass-card border-0 max-w-2xl mx-auto">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground mb-2">Current Question:</p>
                  <p className="text-lg leading-relaxed">{currentQuestion}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Speak naturally as you would in a real interview
            </p>
            <p className="text-sm text-muted-foreground">
              Take your time to think before answering
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="glass-card border-0 border-t border-muted/20 p-4">
        <div className="container mx-auto flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full glass-card border-muted hover:border-primary"
            disabled={!isListening}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {interviewState === 'listening' ? 'Your turn to speak' : 
               interviewState === 'processing' ? 'AI is thinking...' : 
               'AI is asking the next question'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveInterview;
