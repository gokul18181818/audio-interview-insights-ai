import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceInteractionState {
  isListening: boolean;
  currentTranscript: string;
  finalTranscript: string;
  isSpeaking: boolean;
  silenceDuration: number;
  lastSpeechEnd: number;
}

interface VoiceInteractionCallbacks {
  onSpeechEnd: (transcript: string) => void;
  onSilenceDetected: (duration: number) => void;
  onInterruptionNeeded: () => void;
}

export const useVoiceInteraction = (callbacks: VoiceInteractionCallbacks) => {
  const [state, setState] = useState<VoiceInteractionState>({
    isListening: false,
    currentTranscript: '',
    finalTranscript: '',
    isSpeaking: false,
    silenceDuration: 0,
    lastSpeechEnd: 0
  });

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const interruptionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Configuration for voice interaction - OPTIMIZED FOR SPEED
  const SILENCE_THRESHOLD = 800; // 0.8 seconds of silence before AI can interject (much faster)
  const INTERRUPTION_THRESHOLD = 3000; // 3 seconds of silence triggers interruption (reduced from 8s)
  const MIN_SPEECH_LENGTH = 5; // Minimum characters for meaningful speech (reduced)

  const startListening = useCallback(() => {
    console.log('🎤 startListening called, current state:', { isListening: state.isListening });
    
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.error('❌ Speech recognition not supported in this browser');
      return;
    }

    // Stop existing recognition first
    if (recognitionRef.current) {
      console.log('🛑 Stopping existing recognition...');
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, isSpeaking: false }));
      console.log('✅ Voice recognition started successfully');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      console.log('🎯 Speech recognition result:', { 
        interimTranscript, 
        finalTranscript, 
        isFinal: finalTranscript.length > 0 
      });

      setState(prev => ({
        ...prev,
        currentTranscript: interimTranscript,
        finalTranscript: prev.finalTranscript + finalTranscript,
        isSpeaking: interimTranscript.length > 0 || finalTranscript.length > 0,
        lastSpeechEnd: Date.now()
      }));

      // Clear existing timers when speech is detected
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (interruptionTimerRef.current) {
        clearTimeout(interruptionTimerRef.current);
        interruptionTimerRef.current = null;
      }

      // If we have a final transcript segment, process it
      if (finalTranscript.trim().length > MIN_SPEECH_LENGTH) {
        console.log('📝 Triggering onSpeechEnd with:', finalTranscript.trim());
        callbacks.onSpeechEnd(finalTranscript.trim());
      }
    };

    recognition.onspeechend = () => {
      setState(prev => ({ ...prev, isSpeaking: false, lastSpeechEnd: Date.now() }));
      
      // Start silence detection
      silenceTimerRef.current = setTimeout(() => {
        const currentTime = Date.now();
        const silenceDuration = currentTime - state.lastSpeechEnd;
        
        setState(prev => ({ ...prev, silenceDuration }));
        callbacks.onSilenceDetected(silenceDuration);

        // Set up interruption timer for longer silences
        interruptionTimerRef.current = setTimeout(() => {
          callbacks.onInterruptionNeeded();
        }, INTERRUPTION_THRESHOLD - SILENCE_THRESHOLD);
        
      }, SILENCE_THRESHOLD);
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      
      // Handle different error types
      switch (event.error) {
        case 'no-speech':
          console.log('🔇 No speech detected, restarting...');
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognition.start();
              } catch (e) {
                console.error('Failed to restart recognition:', e);
              }
            }
          }, 200);
          break;
        case 'not-allowed':
          console.error('❌ Microphone permission denied');
          setState(prev => ({ ...prev, isListening: false }));
          break;
        case 'network':
          console.error('❌ Network error in speech recognition');
          break;
        default:
          console.error('❌ Unknown speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      console.log('🔚 Speech recognition ended');
      setState(prev => ({ ...prev, isListening: false }));
      
      // Auto-restart if recognition is still active
      if (recognitionRef.current === recognition) {
        console.log('🔄 Auto-restarting speech recognition...');
        setTimeout(() => {
          if (recognitionRef.current === recognition) {
            try {
              recognition.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
            }
          }
        }, 50);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
      console.log('🚀 Speech recognition start() called');
    } catch (error) {
      console.error('❌ Failed to start speech recognition:', error);
    }
  }, [callbacks]); // Removed state dependencies to avoid stale closures

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Clear all timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (interruptionTimerRef.current) {
      clearTimeout(interruptionTimerRef.current);
      interruptionTimerRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      isListening: false, 
      isSpeaking: false,
      currentTranscript: '',
      silenceDuration: 0
    }));
  }, []);

  const resetTranscript = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      currentTranscript: '', 
      finalTranscript: '',
      silenceDuration: 0
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
    isActivelyListening: state.isListening && !state.isSpeaking
  };
}; 