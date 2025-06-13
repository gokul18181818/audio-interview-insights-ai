import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioHookResult {
  isRecording: boolean;
  isPlaying: boolean;
  hasPermission: boolean;
  lastRecordedBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  playAudio: (audioData: string, mimeType?: string) => Promise<void>;
  requestPermission: () => Promise<boolean>;
  audioLevel: number;
  setOnAudioRecorded: (callback: (audioBlob: Blob) => void) => void;
  forceStopAll: () => void;
}

export const useAudio = (): AudioHookResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [lastRecordedBlob, setLastRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onAudioRecordedRef = useRef<((audioBlob: Blob) => void) | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      
      // Set up audio analysis for visual feedback
      setupAudioAnalysis(stream);
      
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setHasPermission(false);
      return false;
    }
  }, []);

  // Set up audio analysis for visual feedback
  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      startAudioLevelMonitoring();
    } catch (error) {
      console.error('Audio analysis setup failed:', error);
    }
  };

  // Monitor audio levels for visual feedback
  const startAudioLevelMonitoring = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateAudioLevel = () => {
      if (analyserRef.current && isRecording) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average / 255); // Normalize to 0-1
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      }
    };
    
    updateAudioLevel();
  };

  // Start recording audio
  const startRecording = useCallback(async (): Promise<void> => {
    if (!streamRef.current) {
      const hasAccess = await requestPermission();
      if (!hasAccess) throw new Error('Microphone access denied');
    }

    if (!streamRef.current) throw new Error('No audio stream available');

    try {
      chunksRef.current = [];
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        console.log('Recording stopped, blob size:', audioBlob.size);
        // Here you would typically send the audio to your backend
        handleAudioRecorded(audioBlob);
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      startAudioLevelMonitoring();
      
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [requestPermission]);

  // Stop recording audio
  const stopRecording = useCallback((): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      console.log('Recording stopped');
    }
  }, [isRecording]);

  // Handle recorded audio blob
  const handleAudioRecorded = async (audioBlob: Blob) => {
    try {
      // Store the recorded blob
      setLastRecordedBlob(audioBlob);
      
      // Convert blob to base64 for API transmission (chunk by chunk to avoid stack overflow)
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to avoid stack overflow
      let base64Audio = '';
      const chunkSize = 8192; // Process 8KB at a time
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        const chunkString = String.fromCharCode.apply(null, Array.from(chunk));
        base64Audio += btoa(chunkString);
      }
      
      console.log('Audio ready for transmission, size:', base64Audio.length);
      
      // Call the callback if set
      if (onAudioRecordedRef.current) {
        onAudioRecordedRef.current(audioBlob);
      }
    } catch (error) {
      console.error('Failed to process recorded audio:', error);
    }
  };

  // Play audio from base64 data
  const playAudio = useCallback(async (audioData: string, mimeType = 'audio/mpeg'): Promise<void> => {
    try {
      setIsPlaying(true);
      
      // Convert base64 to blob
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      await audio.play();
      console.log('Audio playback started');
      
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      throw error;
    }
  }, []);

  // Check for existing permission on mount
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream;
        setHasPermission(true);
        setupAudioAnalysis(stream);
      })
      .catch(() => {
        setHasPermission(false);
      });

    // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((error) => {
          console.log('Audio context cleanup error (expected):', error.message);
        });
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Set callback for when audio is recorded
  const setOnAudioRecorded = useCallback((callback: (audioBlob: Blob) => void) => {
    onAudioRecordedRef.current = callback;
  }, []);

  // Force stop all audio sources and cleanup everything
  const forceStopAll = useCallback(() => {
    console.log('🛑 useAudio: FORCE STOPPING ALL AUDIO SOURCES...');
    
    // Stop recording immediately
    if (mediaRecorderRef.current && isRecording) {
      console.log('🎤 Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      console.log('🔊 Stopping current audio playback...');
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
      setIsPlaying(false);
    }
    
    // Stop all media stream tracks
    if (streamRef.current) {
      console.log('🎵 Stopping all media stream tracks...');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`📻 Stopped track: ${track.kind}`);
      });
    }
    
    // Stop audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      console.log('🎛️ Suspending audio context...');
      audioContextRef.current.suspend().then(() => {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      }).catch((error) => {
        console.log('Audio context already closed or suspended:', error.message);
      });
    }
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      console.log('🎬 Canceling animation frame...');
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Reset audio level
    setAudioLevel(0);
    
    console.log('✅ useAudio: ALL AUDIO SOURCES FORCEFULLY STOPPED');
  }, [isRecording]);

  return {
    isRecording,
    isPlaying,
    hasPermission,
    lastRecordedBlob,
    startRecording,
    stopRecording,
    playAudio,
    requestPermission,
    audioLevel,
    setOnAudioRecorded,
    forceStopAll,
  };
}; 