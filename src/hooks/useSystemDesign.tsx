import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from './useAudio';
import { systemDesignAPI } from '@/lib/api';
import { generateSpeech, playBase64Audio } from '@/utils/elevenlabs';
import { MVP_DESIGN_PHASES, URL_SHORTENER_PROBLEM, REQUIREMENTS_TEMPLATE, type SystemDesignSession, type DesignPhase } from '@/lib/systemDesignTypes';
import { supabase } from '@/lib/supabase';

export interface SystemDesignState {
  sessionData: SystemDesignSession | null;
  currentPhaseIndex: number;
  currentPhase: DesignPhase;
  requirements: Record<string, any>;
  phaseStartTime: number;
  elapsedTime: number;
  isInitialized: boolean;
  isRecording: boolean;
  liveTranscript: string;
  lastAIFeedback: string;
  isProcessing: boolean;
  interviewState: 'idle' | 'recording' | 'processing' | 'speaking';
}

export const useSystemDesign = () => {
  const navigate = useNavigate();
  const audio = useAudio();
  
  // Core state
  const [state, setState] = useState<SystemDesignState>({
    sessionData: null,
    currentPhaseIndex: 0,
    currentPhase: MVP_DESIGN_PHASES[0],
    requirements: {},
    phaseStartTime: Date.now(),
    elapsedTime: 0,
    isInitialized: false,
    isRecording: false,
    liveTranscript: '',
    lastAIFeedback: '',
    isProcessing: false,
    interviewState: 'idle'
  });

  // Speech recognition for live transcription
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize session
  const startSession = useCallback(async () => {
    try {
      console.log('🚀 Starting system design interview...');
      
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ User not authenticated');
        navigate('/');
        return;
      }

      // Create system design session directly
      console.log('🎯 Creating system design session...');
      const session = await systemDesignAPI.createSession({
        problem_statement: URL_SHORTENER_PROBLEM.title
      });

      setState(prev => ({
        ...prev,
        sessionData: session,
        isInitialized: true,
        phaseStartTime: Date.now()
      }));

      // Welcome message
      const welcomeMessage = `Welcome to your system design interview! Today we'll be designing a URL shortener like bit.ly. We'll go through this in three phases: requirements clarification, high-level design, and scaling considerations. Let's start with understanding the requirements. What questions do you have about the scale and scope of this system?`;
      
      await speakMessage(welcomeMessage);
      console.log('✅ System design session started');
      
    } catch (error) {
      console.error('❌ Failed to start session:', error);
    }
  }, [navigate]);

  // Move to next phase
  const nextPhase = useCallback(async () => {
    if (!state.sessionData) return;

    try {
      // Calculate time spent in current phase
      const timeSpent = Math.floor((Date.now() - state.phaseStartTime) / 1000);
      
      // Update phase timing in database
      await systemDesignAPI.updatePhase(
        state.sessionData.id, 
        state.currentPhase.id, 
        timeSpent
      );

      if (state.currentPhaseIndex < MVP_DESIGN_PHASES.length - 1) {
        const nextPhaseIndex = state.currentPhaseIndex + 1;
        const nextPhase = MVP_DESIGN_PHASES[nextPhaseIndex];
        
        setState(prev => ({
          ...prev,
          currentPhaseIndex: nextPhaseIndex,
          currentPhase: nextPhase,
          phaseStartTime: Date.now()
        }));

        const transitionMessage = `Great work on ${state.currentPhase.name}! Let's move to the next phase: ${nextPhase.name}. ${nextPhase.description}`;
        await speakMessage(transitionMessage);
        
      } else {
        // Interview complete
        await completeInterview();
      }
    } catch (error) {
      console.error('❌ Failed to transition to next phase:', error);
    }
  }, [state.sessionData, state.currentPhase, state.currentPhaseIndex, state.phaseStartTime]);

  // Complete interview
  const completeInterview = useCallback(async () => {
    if (!state.sessionData) return;

    try {
      await systemDesignAPI.completeSession(state.sessionData.id);
      
      const completionMessage = "Excellent work! You've completed all phases of the system design interview. Let me prepare a summary of your design and performance.";
      await speakMessage(completionMessage);
      
      // Navigate to summary after a delay
      setTimeout(() => {
        navigate('/session-summary', { 
          state: { 
            sessionId: state.sessionData?.id,
            sessionType: 'system_design'
          } 
        });
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to complete interview:', error);
    }
  }, [state.sessionData, navigate]);

  // Update requirements
  const updateRequirements = useCallback(async (key: string, value: any) => {
    if (!state.sessionData) return;

    const updatedRequirements = {
      ...state.requirements,
      [key]: value
    };

    setState(prev => ({
      ...prev,
      requirements: updatedRequirements
    }));

    try {
      await systemDesignAPI.updateRequirements(state.sessionData.id, updatedRequirements);
    } catch (error) {
      console.error('❌ Failed to update requirements:', error);
    }
  }, [state.sessionData, state.requirements]);

  // Handle whiteboard changes (for auto-save)
  const saveWhiteboardSnapshot = useCallback(async (imageData: string, elementsData: any) => {
    if (!state.sessionData) return;

    try {
      await systemDesignAPI.saveSnapshot(state.sessionData.id, {
        image_data: imageData,
        elements_data: elementsData,
        phase: state.currentPhase.id
      });
    } catch (error) {
      console.error('❌ Failed to save whiteboard snapshot:', error);
    }
  }, [state.sessionData, state.currentPhase]);

  // Process audio and get AI feedback
  const processAudioResponse = useCallback(async (audioBlob: Blob) => {
    if (!state.sessionData) return;

    setState(prev => ({ ...prev, interviewState: 'processing' }));

    try {
      // Get transcript from the audio blob (simplified for MVP)
      const transcript = state.liveTranscript || "I'm working on the system design step by step...";
      
      // For MVP, we'll use a placeholder for whiteboard image
      // In a real implementation, this would capture the current whiteboard state
      const whiteboardImage = "data:image/png;base64,placeholder";

      // Get AI feedback
      const feedback = await systemDesignAPI.getAIFeedback({
        whiteboardImage,
        transcript,
        currentPhase: state.currentPhase.id,
        requirements: state.requirements,
        sessionId: state.sessionData.id
      });

      // Save feedback
      await systemDesignAPI.saveFeedback(state.sessionData.id, {
        phase: state.currentPhase.id,
        feedback_text: feedback,
        diagram_analysis: "Diagram analysis placeholder",
        transcript,
        suggestions: []
      });

      setState(prev => ({ 
        ...prev, 
        lastAIFeedback: feedback,
        interviewState: 'speaking'
      }));

      // Speak the feedback
      await speakMessage(feedback);
      
      setState(prev => ({ ...prev, interviewState: 'idle' }));

    } catch (error) {
      console.error('❌ Failed to process audio:', error);
      setState(prev => ({ ...prev, interviewState: 'idle' }));
      
      // Fallback response
      const fallbackResponse = "Thank you for sharing your thoughts. Please continue with your design approach.";
      await speakMessage(fallbackResponse);
    }
  }, [state.sessionData, state.currentPhase, state.requirements, state.liveTranscript]);

  // Text-to-speech helper
  const speakMessage = useCallback(async (text: string) => {
    setState(prev => ({ ...prev, interviewState: 'speaking' }));
    
    try {
      const audioBase64 = await generateSpeech(text);
      if (audioBase64) {
        await playBase64Audio(audioBase64);
      }
    } catch (error) {
      console.error('❌ TTS failed:', error);
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
      }
    }
    
    setState(prev => ({ ...prev, interviewState: 'idle' }));
  }, []);

  // Start live transcription
  const startLiveTranscription = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const newRecognition = new SpeechRecognition();
      
      newRecognition.continuous = true;
      newRecognition.interimResults = true;
      newRecognition.lang = 'en-US';
      
      newRecognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setState(prev => ({ ...prev, liveTranscript: transcript }));
      };
      
      newRecognition.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
      };
      
      newRecognition.start();
      setRecognition(newRecognition);
    }
  }, []);

  // Stop live transcription
  const stopLiveTranscription = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
  }, [recognition]);

  // Setup audio recording handling
  useEffect(() => {
    audio.setOnAudioRecorded(processAudioResponse);
  }, [audio, processAudioResponse]);

  // Handle recording state changes
  useEffect(() => {
    if (audio.isRecording) {
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        interviewState: 'recording',
        liveTranscript: '' 
      }));
      startLiveTranscription();
    } else {
      setState(prev => ({ ...prev, isRecording: false }));
      stopLiveTranscription();
    }
  }, [audio.isRecording, startLiveTranscription, stopLiveTranscription]);

  // Overall timer
  useEffect(() => {
    const timer = setInterval(() => {
      setState(prev => ({ ...prev, elapsedTime: prev.elapsedTime + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time helper
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get phase progress
  const getPhaseProgress = useCallback(() => {
    const currentPhaseElapsed = Math.floor((Date.now() - state.phaseStartTime) / 1000);
    const currentPhaseTotal = state.currentPhase.duration * 60;
    return {
      current: currentPhaseElapsed,
      total: currentPhaseTotal,
      percentage: Math.min((currentPhaseElapsed / currentPhaseTotal) * 100, 100)
    };
  }, [state.phaseStartTime, state.currentPhase.duration]);

  return {
    // State
    ...state,
    
    // Actions
    startSession,
    nextPhase,
    completeInterview,
    updateRequirements,
    saveWhiteboardSnapshot,
    
    // Audio controls
    audio,
    speakMessage,
    
    // Helpers
    formatTime,
    getPhaseProgress,
    
    // Constants
    allPhases: MVP_DESIGN_PHASES,
    problemDescription: URL_SHORTENER_PROBLEM,
    requirementsTemplate: REQUIREMENTS_TEMPLATE
  };
}; 