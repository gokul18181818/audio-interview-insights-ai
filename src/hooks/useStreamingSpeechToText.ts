import { useState, useRef, useCallback } from 'react';

interface StreamingSTTState {
  isConnected: boolean;
  isTranscribing: boolean;
  currentTranscript: string;
  finalTranscript: string;
  confidence: number;
  error: string | null;
}

interface StreamingSTTCallbacks {
  onTranscriptUpdate: (transcript: string, isFinal: boolean) => void;
  onUtteranceEnd: (finalTranscript: string) => void;
  onError: (error: string) => void;
}

interface StreamingSTTConfig {
  provider: 'deepgram' | 'assemblyai' | 'browser';
  apiKey?: string;
  language: string;
  sampleRate: number;
  enableEndOfUtterance: boolean;
  utteranceEndThreshold: number; // ms of silence to detect end of utterance
}

const DEFAULT_CONFIG: StreamingSTTConfig = {
  provider: 'browser', // Default to browser for free tier
  language: 'en-US',
  sampleRate: 16000,
  enableEndOfUtterance: true,
  utteranceEndThreshold: 1000 // 1 second
};

export const useStreamingSpeechToText = (
  callbacks: StreamingSTTCallbacks,
  config: Partial<StreamingSTTConfig> = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<StreamingSTTState>({
    isConnected: false,
    isTranscribing: false,
    currentTranscript: '',
    finalTranscript: '',
    confidence: 0,
    error: null
  });

  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const utteranceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Browser-based speech recognition (free)
  const startBrowserSTT = useCallback(async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      throw new Error('Browser speech recognition not supported');
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = finalConfig.language;
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      setState(prev => ({ ...prev, isConnected: true, isTranscribing: true, error: null }));
      console.log('🎤 Browser STT started');
    };

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        confidence = Math.max(confidence, event.results[i][0].confidence || 0.8);
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript + interimTranscript;
      
      setState(prev => ({
        ...prev,
        currentTranscript,
        confidence,
        finalTranscript: prev.finalTranscript + finalTranscript
      }));

      callbacks.onTranscriptUpdate(currentTranscript, finalTranscript.length > 0);

      // Handle end of utterance detection
      if (finalConfig.enableEndOfUtterance) {
        if (utteranceTimerRef.current) {
          clearTimeout(utteranceTimerRef.current);
        }

        if (currentTranscript.trim().length > 0) {
          utteranceTimerRef.current = setTimeout(() => {
            if (currentTranscript.trim().length > 0) {
              callbacks.onUtteranceEnd(currentTranscript.trim());
              setState(prev => ({ ...prev, currentTranscript: '', finalTranscript: '' }));
            }
          }, finalConfig.utteranceEndThreshold);
        }
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      const error = `Speech recognition error: ${event.error}`;
      setState(prev => ({ ...prev, error }));
      callbacks.onError(error);
      
      // Auto-restart on certain errors
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (recognitionRef.current && state.isTranscribing) {
            recognitionRef.current.start();
          }
        }, 1000);
      }
    };

    recognitionRef.current.onend = () => {
      setState(prev => ({ ...prev, isConnected: false, isTranscribing: false }));
      
      // Auto-restart if still supposed to be transcribing
      if (state.isTranscribing) {
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 100);
      }
    };

    recognitionRef.current.start();
  }, [finalConfig, callbacks, state.isTranscribing]);

  // Deepgram WebSocket streaming (requires API key)
  const startDeepgramSTT = useCallback(async () => {
    if (!finalConfig.apiKey) {
      throw new Error('Deepgram API key required');
    }

    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: finalConfig.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      streamRef.current = stream;

      // Connect to Deepgram WebSocket
      const wsUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=${finalConfig.sampleRate}&channels=1&language=${finalConfig.language}&punctuate=true&interim_results=true&endpointing=true`;
      
      websocketRef.current = new WebSocket(wsUrl, ['token', finalConfig.apiKey]);

      websocketRef.current.onopen = () => {
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        console.log('🌊 Deepgram WebSocket connected');
        startAudioStreaming();
      };

      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.channel?.alternatives?.[0]) {
          const transcript = data.channel.alternatives[0].transcript;
          const confidence = data.channel.alternatives[0].confidence;
          const isFinal = data.is_final;

          setState(prev => ({
            ...prev,
            currentTranscript: transcript,
            confidence,
            finalTranscript: isFinal ? prev.finalTranscript + transcript : prev.finalTranscript
          }));

          callbacks.onTranscriptUpdate(transcript, isFinal);

          if (isFinal && transcript.trim().length > 0) {
            callbacks.onUtteranceEnd(transcript.trim());
          }
        }

        // Handle end of utterance from Deepgram
        if (data.speech_final) {
          callbacks.onUtteranceEnd(state.currentTranscript.trim());
          setState(prev => ({ ...prev, currentTranscript: '' }));
        }
      };

      websocketRef.current.onerror = (error) => {
        const errorMsg = 'Deepgram WebSocket error';
        setState(prev => ({ ...prev, error: errorMsg }));
        callbacks.onError(errorMsg);
      };

      websocketRef.current.onclose = () => {
        setState(prev => ({ ...prev, isConnected: false, isTranscribing: false }));
      };

    } catch (error) {
      throw new Error(`Failed to start Deepgram STT: ${error}`);
    }
  }, [finalConfig, callbacks, state.currentTranscript]);

  // Stream audio to WebSocket
  const startAudioStreaming = useCallback(() => {
    if (!streamRef.current || !websocketRef.current) return;

    mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
        // Convert to the format expected by Deepgram
        event.data.arrayBuffer().then(buffer => {
          websocketRef.current?.send(buffer);
        });
      }
    };

    mediaRecorderRef.current.start(100); // Send data every 100ms
    setState(prev => ({ ...prev, isTranscribing: true }));
  }, []);

  // Start transcription
  const startTranscription = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      switch (finalConfig.provider) {
        case 'deepgram':
          await startDeepgramSTT();
          break;
        case 'assemblyai':
          // AssemblyAI implementation would go here
          throw new Error('AssemblyAI not implemented yet');
        case 'browser':
        default:
          await startBrowserSTT();
          break;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMsg }));
      callbacks.onError(errorMsg);
    }
  }, [finalConfig.provider, startDeepgramSTT, startBrowserSTT, callbacks]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    setState(prev => ({ ...prev, isTranscribing: false }));

    if (utteranceTimerRef.current) {
      clearTimeout(utteranceTimerRef.current);
      utteranceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState(prev => ({ ...prev, isConnected: false, currentTranscript: '', finalTranscript: '' }));
  }, []);

  return {
    ...state,
    startTranscription,
    stopTranscription,
    config: finalConfig
  };
}; 