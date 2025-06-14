import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceActivityState {
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  speechConfidence: number;
  silenceDuration: number;
  lastSpeechTime: number;
}

interface VoiceActivityCallbacks {
  onSpeechStart: () => void;
  onSpeechEnd: (duration: number) => void;
  onSilenceDetected: (duration: number) => void;
}

interface VoiceActivityConfig {
  silenceThreshold: number; // ms of silence before triggering onSilenceDetected
  speechThreshold: number; // Audio level threshold to detect speech
  smoothingFactor: number; // Audio level smoothing (0-1)
  minSpeechDuration: number; // Minimum speech duration to be considered valid
}

const DEFAULT_CONFIG: VoiceActivityConfig = {
  silenceThreshold: 1000, // 1 second
  speechThreshold: 0.01, // Very sensitive
  smoothingFactor: 0.3,
  minSpeechDuration: 300 // 300ms minimum speech
};

export const useAdvancedVoiceDetection = (
  callbacks: VoiceActivityCallbacks,
  config: Partial<VoiceActivityConfig> = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<VoiceActivityState>({
    isListening: false,
    isSpeaking: false,
    audioLevel: 0,
    speechConfidence: 0,
    silenceDuration: 0,
    lastSpeechTime: 0
  });

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechStartTimeRef = useRef<number>(0);
  const smoothedLevelRef = useRef<number>(0);

  // Initialize audio analysis
  const initializeAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);

      setState(prev => ({ ...prev, isListening: true }));
      startVoiceActivityDetection();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize voice detection:', error);
      return false;
    }
  }, []);

  // Real-time voice activity detection
  const startVoiceActivityDetection = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const detectVoiceActivity = () => {
      if (!analyserRef.current || !state.isListening) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) for better voice detection
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length) / 255;
      
      // Smooth the audio level
      smoothedLevelRef.current = 
        smoothedLevelRef.current * (1 - finalConfig.smoothingFactor) + 
        rms * finalConfig.smoothingFactor;

      const currentTime = Date.now();
      const isSpeechDetected = smoothedLevelRef.current > finalConfig.speechThreshold;
      
      setState(prev => {
        const newState = { ...prev, audioLevel: smoothedLevelRef.current };
        
        // Speech start detection
        if (isSpeechDetected && !prev.isSpeaking) {
          speechStartTimeRef.current = currentTime;
          newState.isSpeaking = true;
          newState.lastSpeechTime = currentTime;
          newState.silenceDuration = 0;
          
          // Clear silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          
          callbacks.onSpeechStart();
          console.log('🗣️ Speech detected - starting');
        }
        
        // Speech continuation
        else if (isSpeechDetected && prev.isSpeaking) {
          newState.lastSpeechTime = currentTime;
          newState.silenceDuration = 0;
        }
        
        // Speech end detection
        else if (!isSpeechDetected && prev.isSpeaking) {
          const speechDuration = currentTime - speechStartTimeRef.current;
          
          // Only trigger speech end if minimum duration met
          if (speechDuration >= finalConfig.minSpeechDuration) {
            newState.isSpeaking = false;
            
            // Start silence timer
            silenceTimerRef.current = setTimeout(() => {
              const silenceDuration = Date.now() - newState.lastSpeechTime;
              callbacks.onSilenceDetected(silenceDuration);
              callbacks.onSpeechEnd(speechDuration);
              console.log('🔇 Speech ended after', speechDuration, 'ms, silence:', silenceDuration, 'ms');
            }, finalConfig.silenceThreshold);
          }
        }
        
        // Update silence duration
        if (!isSpeechDetected) {
          newState.silenceDuration = currentTime - newState.lastSpeechTime;
        }
        
        // Calculate speech confidence (0-1)
        newState.speechConfidence = Math.min(smoothedLevelRef.current / (finalConfig.speechThreshold * 3), 1);
        
        return newState;
      });

      animationFrameRef.current = requestAnimationFrame(detectVoiceActivity);
    };

    detectVoiceActivity();
  }, [state.isListening, finalConfig, callbacks]);

  // Start listening
  const startListening = useCallback(async () => {
    if (state.isListening) return true;
    return await initializeAudioAnalysis();
  }, [state.isListening, initializeAudioAnalysis]);

  // Stop listening
  const stopListening = useCallback(() => {
    setState(prev => ({ ...prev, isListening: false, isSpeaking: false }));
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
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
    config: finalConfig
  };
};