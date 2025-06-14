import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSystemDesign } from '@/hooks/useSystemDesign';
import { useVoiceInteraction } from '@/hooks/useVoiceInteraction';
import { useAIInterviewer } from '@/hooks/useAIInterviewer';
import WhiteboardContainer from '../../SystemDesign/WhiteboardContainer';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { generateSpeech, playBase64Audio } from '@/utils/elevenlabs';
import { 
  Mic, 
  MicOff, 
  MessageSquare, 
  Brain, 
  Timer, 
  Volume2, 
  VolumeX,
  Pause,
  Play,
  SkipForward
} from 'lucide-react';

interface LiveSystemDesignProps {
  sessionId?: string;
}

export function LiveSystemDesign({ sessionId }: LiveSystemDesignProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const {
    sessionData,
    currentPhase,
    startSession,
    nextPhase,
    saveWhiteboardSnapshot,
    getPhaseProgress,
    isInitialized: hookInitialized
  } = useSystemDesign();

  const aiInterviewer = useAIInterviewer();

  // Calculate progress
  const phaseProgress = getPhaseProgress();

  // Create conversation context for AI
  const conversationContext = useMemo(() => {
    if (!currentPhase || !sessionData) return null;
    
    return {
      phase: currentPhase,
      conversationHistory: aiInterviewer.conversationHistory,
      requirements: sessionData.requirements_gathered || {},
      recentTranscripts: [],
      missingTopics: [],
      lastAIResponse: aiInterviewer.conversationHistory
        .filter(turn => turn.speaker === 'ai')
        .slice(-1)[0]?.content || ''
    };
  }, [currentPhase, sessionData, aiInterviewer.conversationHistory]);

  // Voice interaction callbacks
  const voiceCallbacks = useMemo(() => ({
    onSpeechEnd: (transcript: string) => {
      if (!conversationContext || isPaused) return;
      console.log('🗣️ User said:', transcript);
      
      // Process with AI interviewer
      aiInterviewer.processUserSpeech(transcript, conversationContext);
    },
    onSilenceDetected: (duration: number) => {
      if (!conversationContext || isPaused) return;
      console.log('🤫 Silence detected:', duration, 'ms');
      
      // AI can interrupt after longer silences
      if (duration > 4000 && aiInterviewer.isAvailable) {
        aiInterviewer.handleSilenceInterruption(conversationContext, duration);
      }
    },
    onInterruptionNeeded: () => {
      if (!conversationContext || isPaused) return;
      console.log('🚨 Interruption needed - user seems stuck');
      
      if (aiInterviewer.isAvailable) {
        aiInterviewer.handleSilenceInterruption(conversationContext, 8000);
      }
    }
  }), [conversationContext, aiInterviewer, isPaused]);

  const voiceInteraction = useVoiceInteraction(voiceCallbacks);

  // Initialize interview with voice introduction
  const initializeInterview = useCallback(async () => {
    if (isInitialized) return;

    setIsInitialized(true);
    await startSession();

    // AI introduces the interview
    const introduction = `Hi! I'm your AI interviewer for today's system design session. We'll be designing a URL shortener together. This will be completely conversational - just talk through your thoughts as you draw. I'll ask follow-up questions and guide you through three phases: requirements gathering, architecture design, and scaling considerations. Ready to start?`;
    
    await aiInterviewer.speakResponse(introduction, 'question');
    
    // Start listening after introduction
    setTimeout(() => {
      if (!isPaused) {
        voiceInteraction.startListening();
      }
    }, 1000);
  }, [isInitialized, startSession, aiInterviewer, voiceInteraction, isPaused]);

  // Handle phase transitions
  const handlePhaseComplete = useCallback(async () => {
    if (!currentPhase) return;

    // AI announces phase transition
    const nextPhaseName = getNextPhaseName(currentPhase.id);
    if (nextPhaseName) {
      const transitionMessage = `Great work on ${currentPhase.name.toLowerCase()}! Let's move to ${nextPhaseName.toLowerCase()}. ${getPhaseIntro(nextPhaseName)}`;
      await aiInterviewer.speakResponse(transitionMessage, 'question');
    }

    await nextPhase();
  }, [currentPhase, nextPhase, aiInterviewer]);

  // Toggle voice listening
  const toggleListening = useCallback(() => {
    if (voiceInteraction.isListening) {
      voiceInteraction.stopListening();
    } else {
      voiceInteraction.startListening();
    }
  }, [voiceInteraction]);

  // Toggle interview pause
  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const newPaused = !prev;
      
      if (newPaused) {
        voiceInteraction.stopListening();
      } else {
        voiceInteraction.startListening();
      }
      
      return newPaused;
    });
  }, [voiceInteraction]);

  // Get phase introduction
  function getPhaseIntro(phaseName: string): string {
    const intros = {
      'Requirements Gathering': 'Tell me what questions you\'d ask to understand this system.',
      'Architecture Design': 'Now let\'s design the core components. What would your high-level architecture look like?',
      'Scaling & Optimization': 'Finally, how would you scale this system to handle millions of users?'
    };
    return intros[phaseName as keyof typeof intros] || '';
  }

  function getNextPhaseName(currentId: string): string | null {
    const phases = ['requirements', 'architecture', 'scaling'];
    const currentIndex = phases.indexOf(currentId);
    return currentIndex < phases.length - 1 ? 
      ['Requirements Gathering', 'Architecture Design', 'Scaling & Optimization'][currentIndex + 1] : 
      null;
  }

  // Auto-initialize on mount
  useEffect(() => {
    if (!hookInitialized && !isInitialized) {
      initializeInterview();
    }
  }, [hookInitialized, isInitialized, initializeInterview]);

  // Auto-save whiteboard periodically
  useEffect(() => {
    if (!sessionData?.id) return;

    const interval = setInterval(() => {
      // For auto-save, we'll need to integrate with the whiteboard
      // This is a placeholder that the actual whiteboard component will use
      console.log('Auto-saving whiteboard state...');
    }, 10000); // Save every 10 seconds

    return () => clearInterval(interval);
  }, [sessionData?.id, saveWhiteboardSnapshot]);

  if (!hookInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Setting up your interview...</p>
        </div>
      </div>
    );
  }

  if (!sessionData || !currentPhase) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="p-8 text-center bg-gray-800 border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-white">Ready to start?</h2>
          <Button onClick={initializeInterview} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
            Begin System Design Interview
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header with controls */}
      <div className="bg-gray-800 border-b border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-white">
                System Design Interview: URL Shortener
              </h1>
              <div className="flex items-center space-x-2">
                <Timer className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300">
                  {currentPhase.name} • {Math.ceil(currentPhase.duration / 60)}min
                </span>
              </div>
            </div>

            {/* Voice & Control Panel */}
            <div className="flex items-center space-x-3">
              {/* AI Status */}
              <div className="flex items-center space-x-2">
                <Brain className={`h-4 w-4 ${aiInterviewer.isAnalyzing ? 'text-blue-400 animate-pulse' : 'text-gray-500'}`} />
                <span className="text-xs text-gray-400">
                  {aiInterviewer.isSpeaking ? 'Speaking...' : 
                   aiInterviewer.isAnalyzing ? 'Analyzing...' : 'Ready'}
                </span>
              </div>

              {/* Pause/Resume */}
              <Button
                variant="outline"
                size="sm"
                onClick={togglePause}
                className={`border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white ${isPaused ? 'bg-yellow-900 border-yellow-600 text-yellow-300' : ''}`}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>

              {/* Voice Toggle */}
              <Button
                variant={voiceInteraction.isListening ? "destructive" : "default"}
                size="sm"
                onClick={toggleListening}
                disabled={isPaused}
                className={`min-w-[120px] ${voiceInteraction.isListening 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {voiceInteraction.isListening ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Talking
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Talking
                  </>
                )}
              </Button>

              {/* Audio Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>

              {/* Next Phase */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePhaseComplete}
                disabled={aiInterviewer.isSpeaking}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Next Phase
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Phase Progress</span>
              <span>{Math.round(phaseProgress.percentage)}%</span>
            </div>
            <Progress value={phaseProgress.percentage} className="h-2 bg-gray-700" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Whiteboard - Main Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] overflow-hidden bg-gray-800 border-gray-700">
              <WhiteboardContainer />
            </Card>
          </div>

          {/* Conversation Panel */}
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col bg-gray-800 border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  <h3 className="font-medium text-white">Live Conversation</h3>
                </div>
                {voiceInteraction.isActivelyListening && (
                  <div className="flex items-center space-x-2 text-sm text-blue-400">
                    <div className="animate-pulse h-2 w-2 bg-blue-400 rounded-full"></div>
                    <span>Listening...</span>
                  </div>
                )}
              </div>

              {/* Live Transcript */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Current user speech */}
                {voiceInteraction.currentTranscript && (
                  <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
                    <div className="text-xs text-blue-400 mb-1">You (speaking...)</div>
                    <div className="text-sm text-gray-200">
                      {voiceInteraction.currentTranscript}
                      <span className="animate-pulse text-blue-400">|</span>
                    </div>
                  </div>
                )}

                {/* Conversation history */}
                {aiInterviewer.conversationHistory.slice(-5).map((turn, index) => (
                  <div 
                    key={index}
                    className={`rounded-lg p-3 border ${
                      turn.speaker === 'user' 
                        ? 'bg-blue-900/20 border-blue-700/30 ml-2' 
                        : 'bg-gray-700/50 border-gray-600/50 mr-2'
                    }`}
                  >
                    <div className={`text-xs mb-1 ${
                      turn.speaker === 'user' ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                      {turn.speaker === 'user' ? 'You' : 'AI Interviewer'}
                      {turn.type === 'interruption' && ' (helping)'}
                      {turn.type === 'followup' && ' (follow-up)'}
                    </div>
                    <div className="text-sm text-gray-200">{turn.content}</div>
                  </div>
                ))}

                {/* AI thinking indicator */}
                {aiInterviewer.isAnalyzing && (
                  <div className="bg-gray-700/50 border border-gray-600/50 rounded-lg p-3 mr-2">
                    <div className="text-xs text-gray-400 mb-1">AI Interviewer</div>
                    <div className="text-sm text-gray-400 italic">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}

                {/* AI speaking indicator */}
                {aiInterviewer.isSpeaking && (
                  <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 mr-2">
                    <div className="text-xs text-green-400 mb-1">AI Interviewer (speaking)</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-300">Speaking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Phase Info */}
              <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                <div className="text-xs text-gray-500 mb-1">Current Phase</div>
                <div className="text-sm font-medium text-white">{currentPhase.name}</div>
                <div className="text-xs text-gray-400 mt-1">{currentPhase.description}</div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <Card className="p-8 text-center bg-gray-800 border-gray-700">
            <Pause className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-white">Interview Paused</h3>
            <p className="text-gray-400 mb-4">Take your time. Resume when ready.</p>
            <Button onClick={togglePause} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Play className="h-4 w-4 mr-2" />
              Resume Interview
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
} 