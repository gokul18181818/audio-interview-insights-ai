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

  // Configuration for voice interaction
  const SILENCE_THRESHOLD = 2000; // 2 seconds of silence before AI can interject
  const INTERRUPTION_THRESHOLD = 8000; // 8 seconds of silence triggers interruption
  const MIN_SPEECH_LENGTH = 10; // Minimum characters for meaningful speech

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, isSpeaking: false }));
      console.log('🎤 Voice recognition started');
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
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Restart recognition after no speech
        setTimeout(() => {
          if (state.isListening) {
            recognition.start();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
      // Auto-restart if we're still supposed to be listening
      if (state.isListening) {
        setTimeout(() => recognition.start(), 100);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [callbacks, state.isListening, state.lastSpeechEnd]);

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