import { useState, useCallback, useRef } from 'react';
import { useAdvancedVoiceDetection } from './useAdvancedVoiceDetection';
import { useStreamingSpeechToText } from './useStreamingSpeechToText';

interface EnhancedVoiceState {
  isListening: boolean;
  currentTranscript: string;
  finalTranscript: string;
  isSpeaking: boolean;
  audioLevel: number;
  speechConfidence: number;
  silenceDuration: number;
  provider: 'browser' | 'deepgram' | 'advanced';
}

interface EnhancedVoiceCallbacks {
  onSpeechEnd: (transcript: string) => void;
  onSilenceDetected: (duration: number) => void;
  onInterruptionNeeded: () => void;
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
}

interface EnhancedVoiceConfig {
  provider?: 'browser' | 'deepgram' | 'advanced';
  deepgramApiKey?: string;
  silenceThreshold?: number;
  speechThreshold?: number;
  utteranceEndThreshold?: number;
  enableRealTimeTranscription?: boolean;
}

const DEFAULT_CONFIG: Required<EnhancedVoiceConfig> = {
  provider: 'advanced', // Use advanced voice detection by default
  deepgramApiKey: '',
  silenceThreshold: 800, // 0.8 seconds
  speechThreshold: 0.01, // Very sensitive
  utteranceEndThreshold: 1000, // 1 second
  enableRealTimeTranscription: true
};

export const useEnhancedVoiceInteraction = (
  callbacks: EnhancedVoiceCallbacks,
  config: EnhancedVoiceConfig = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<EnhancedVoiceState>({
    isListening: false,
    currentTranscript: '',
    finalTranscript: '',
    isSpeaking: false,
    audioLevel: 0,
    speechConfidence: 0,
    silenceDuration: 0,
    provider: finalConfig.provider
  });

  const currentTranscriptRef = useRef<string>('');
  const speechStartTimeRef = useRef<number>(0);

  // Advanced voice activity detection
  const voiceDetection = useAdvancedVoiceDetection({
    onSpeechStart: () => {
      speechStartTimeRef.current = Date.now();
      setState(prev => ({ ...prev, isSpeaking: true, silenceDuration: 0 }));
      console.log('🗣️ Enhanced: Speech started');
    },
    onSpeechEnd: (duration: number) => {
      setState(prev => ({ ...prev, isSpeaking: false }));
      
      // Only trigger speech end if we have meaningful content
      if (currentTranscriptRef.current.trim().length > 3) {
        console.log('🔇 Enhanced: Speech ended, duration:', duration, 'ms');
        callbacks.onSpeechEnd(currentTranscriptRef.current.trim());
        currentTranscriptRef.current = '';
        setState(prev => ({ ...prev, currentTranscript: '', finalTranscript: '' }));
      }
    },
    onSilenceDetected: (duration: number) => {
      setState(prev => ({ ...prev, silenceDuration: duration }));
      callbacks.onSilenceDetected(duration);
      
      // Trigger interruption for longer silences
      if (duration > 3000) {
        callbacks.onInterruptionNeeded();
      }
    }
  }, {
    silenceThreshold: finalConfig.silenceThreshold,
    speechThreshold: finalConfig.speechThreshold,
    minSpeechDuration: 200 // 200ms minimum
  });

  // Streaming speech-to-text
  const speechToText = useStreamingSpeechToText({
    onTranscriptUpdate: (transcript: string, isFinal: boolean) => {
      currentTranscriptRef.current = transcript;
      setState(prev => ({
        ...prev,
        currentTranscript: transcript,
        finalTranscript: isFinal ? prev.finalTranscript + transcript : prev.finalTranscript
      }));
      
      if (callbacks.onTranscriptUpdate) {
        callbacks.onTranscriptUpdate(transcript, isFinal);
      }
    },
    onUtteranceEnd: (finalTranscript: string) => {
      console.log('📝 Enhanced: Utterance ended:', finalTranscript);
      callbacks.onSpeechEnd(finalTranscript);
      currentTranscriptRef.current = '';
      setState(prev => ({ ...prev, currentTranscript: '', finalTranscript: '' }));
    },
    onError: (error: string) => {
      console.error('Enhanced STT error:', error);
    }
  }, {
    provider: finalConfig.provider === 'deepgram' ? 'deepgram' : 'browser',
    apiKey: finalConfig.deepgramApiKey,
    utteranceEndThreshold: finalConfig.utteranceEndThreshold,
    enableEndOfUtterance: true
  });

  // Update state from voice detection
  useState(() => {
    setState(prev => ({
      ...prev,
      audioLevel: voiceDetection.audioLevel,
      speechConfidence: voiceDetection.speechConfidence,
      silenceDuration: voiceDetection.silenceDuration
    }));
  });

  // Start listening with the configured provider
  const startListening = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isListening: true }));
      
      switch (finalConfig.provider) {
        case 'advanced':
          // Use advanced voice detection + browser STT
          const voiceSuccess = await voiceDetection.startListening();
          if (voiceSuccess && finalConfig.enableRealTimeTranscription) {
            await speechToText.startTranscription();
          }
          break;
          
        case 'deepgram':
          // Use Deepgram streaming STT
          await speechToText.startTranscription();
          break;
          
        case 'browser':
        default:
          // Use browser STT only
          await speechToText.startTranscription();
          break;
      }
      
      console.log(`🎤 Enhanced voice interaction started with ${finalConfig.provider} provider`);
    } catch (error) {
      console.error('Failed to start enhanced voice interaction:', error);
      setState(prev => ({ ...prev, isListening: false }));
    }
  }, [finalConfig.provider, finalConfig.enableRealTimeTranscription, voiceDetection, speechToText]);

  // Stop listening
  const stopListening = useCallback(() => {
    setState(prev => ({ ...prev, isListening: false, isSpeaking: false }));
    
    voiceDetection.stopListening();
    speechToText.stopTranscription();
    
    currentTranscriptRef.current = '';
    console.log('🛑 Enhanced voice interaction stopped');
  }, [voiceDetection, speechToText]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    currentTranscriptRef.current = '';
    setState(prev => ({ 
      ...prev, 
      currentTranscript: '', 
      finalTranscript: '',
      silenceDuration: 0
    }));
  }, []);

  // Switch provider dynamically
  const switchProvider = useCallback(async (newProvider: 'browser' | 'deepgram' | 'advanced') => {
    const wasListening = state.isListening;
    
    if (wasListening) {
      stopListening();
    }
    
    setState(prev => ({ ...prev, provider: newProvider }));
    finalConfig.provider = newProvider;
    
    if (wasListening) {
      // Restart with new provider after a brief delay
      setTimeout(() => {
        startListening();
      }, 500);
    }
  }, [state.isListening, stopListening, startListening]);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
    switchProvider,
    isActivelyListening: state.isListening && !state.isSpeaking,
    // Expose underlying states for debugging
    voiceDetectionState: voiceDetection,
    speechToTextState: speechToText
  };
}; 