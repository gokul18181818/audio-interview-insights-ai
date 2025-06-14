import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from './useAudio';
import { AudioWebSocket } from '@/lib/api';

interface InterviewState {
  sessionId: string | null;
  isActive: boolean;
  currentQuestion: string;
  transcript: Array<{ speaker: 'user' | 'ai'; content: string; timestamp: number }>;
  status: 'idle' | 'listening' | 'processing' | 'speaking' | 'completed';
}

export const useInterview = () => {
  const audio = useAudio();
  const [state, setState] = useState<InterviewState>({
    sessionId: null,
    isActive: false,
    currentQuestion: '',
    transcript: [],
    status: 'idle'
  });
  
  const audioWSRef = useRef<AudioWebSocket | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(async () => {
    try {
      audioWSRef.current = new AudioWebSocket({
        onTranscription: async (data) => {
          console.log('Transcription received:', data.text);
          
          // Add user transcript
          setState(prev => ({
            ...prev,
            transcript: [...prev.transcript, {
              speaker: 'user',
              content: data.text,
              timestamp: Date.now()
            }],
            status: 'processing'
          }));

          // Stop recording and process response
          audio.stopRecording();
          await generateAIResponse(data.text);
        },
        
        onAudioResponse: async (data) => {
          console.log('AI audio response received');
          setState(prev => ({ ...prev, status: 'speaking' }));
          
          try {
            await audio.playAudio(data.audioData, data.mimeType);
            setState(prev => ({ ...prev, status: 'listening' }));
          } catch (error) {
            console.error('Audio playback failed:', error);
            setState(prev => ({ ...prev, status: 'listening' }));
          }
        },
        
        onError: (error) => {
          console.error('WebSocket error:', error);
          setState(prev => ({ ...prev, status: 'idle' }));
        }
      });

      await audioWSRef.current.connect();
      console.log('Interview WebSocket connected');
    } catch (error) {
      console.error('WebSocket initialization failed:', error);
    }
  }, [audio]);

  // Generate AI response based on user input
  const generateAIResponse = async (userInput: string) => {
    try {
      // Save user transcript to backend
      if (state.sessionId) {
        // await transcriptAPI.add({
        //   sessionId: state.sessionId,
        //   speaker: 'user',
        //   content: userInput,
        //   timestampSeconds: Math.floor(Date.now() / 1000)
        // });
      }

      // Generate follow-up question or response
      const response = await generateFollowUpResponse(userInput, state.currentQuestion);
      
      // Add AI response to transcript
      setState(prev => ({
        ...prev,
        transcript: [...prev.transcript, {
          speaker: 'ai',
          content: response,
          timestamp: Date.now()
        }],
        currentQuestion: response
      }));

      // Send for text-to-speech
      if (audioWSRef.current && state.sessionId) {
        audioWSRef.current.generateSpeech(response, state.sessionId);
      }

    } catch (error) {
      console.error('Failed to generate AI response:', error);
      setState(prev => ({ ...prev, status: 'listening' }));
    }
  };

  // Generate contextual follow-up responses
  const generateFollowUpResponse = async (userInput: string, currentQuestion: string): Promise<string> => {
    // This would typically call your question generator API with context
    // For now, returning some sample responses
    const responses = [
      "That's interesting. Can you tell me more about the technical challenges you faced?",
      "Great example! How did you measure the success of that solution?",
      "I see. What would you do differently if you encountered a similar situation again?",
      "Excellent! Now, let me ask you about a different scenario...",
      "Thank you for that detailed response. Here's my next question for you..."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Start interview session
  const startInterview = async (interviewData: { role: string; company?: string; type: string }) => {
    try {
      // Check audio permission
      if (!audio.hasPermission) {
        const hasPermission = await audio.requestPermission();
        if (!hasPermission) {
          throw new Error('Microphone permission required');
        }
      }

      // Create session
      // const { session } = await sessionAPI.create(interviewData);
      const sessionId = `temp-${Date.now()}`; // Temporary for demo

      // Initialize WebSocket
      await initializeWebSocket();

      // Generate initial question
      const initialQuestion = `Hello! I'm your AI interviewer today. Let's start with a simple question: Tell me about yourself and your experience as a ${interviewData.role}.`;

      setState({
        sessionId,
        isActive: true,
        currentQuestion: initialQuestion,
        transcript: [{
          speaker: 'ai',
          content: initialQuestion,
          timestamp: Date.now()
        }],
        status: 'speaking'
      });

      // Play initial question
      if (audioWSRef.current) {
        audioWSRef.current.generateSpeech(initialQuestion, sessionId);
      }

      console.log('Interview started');
    } catch (error) {
      console.error('Failed to start interview:', error);
      throw error;
    }
  };

  // Start recording with silence detection
  const startRecording = async () => {
    try {
      await audio.startRecording();
      setState(prev => ({ ...prev, status: 'listening' }));

      // Set silence timeout (stop recording after shorter silence)
      silenceTimeoutRef.current = setTimeout(() => {
        if (audio.isRecording) {
          audio.stopRecording();
        }
      }, 2000); // Reduced from 5000ms to 2000ms for faster response

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    audio.stopRecording();
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  // End interview
  const endInterview = async () => {
    try {
      if (state.sessionId) {
        // await sessionAPI.complete(state.sessionId);
      }
      
      if (audioWSRef.current) {
        audioWSRef.current.disconnect();
      }

      setState({
        sessionId: null,
        isActive: false,
        currentQuestion: '',
        transcript: [],
        status: 'completed'
      });

      console.log('Interview ended');
    } catch (error) {
      console.error('Failed to end interview:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioWSRef.current) {
        audioWSRef.current.disconnect();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    audio,
    startInterview,
    startRecording,
    stopRecording,
    endInterview,
  };
}; 