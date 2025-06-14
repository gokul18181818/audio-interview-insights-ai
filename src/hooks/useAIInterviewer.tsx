import { useState, useCallback } from 'react';
import { systemDesignAPI } from '@/lib/api';
import { generateSpeech, playBase64Audio } from '@/utils/elevenlabs';
import { type DesignPhase } from '@/lib/systemDesignTypes';

interface ConversationContext {
  phase: DesignPhase;
  conversationHistory: ConversationTurn[];
  requirements: Record<string, any>;
  recentTranscripts: string[];
  missingTopics: string[];
  lastAIResponse: string;
}

interface ConversationTurn {
  speaker: 'user' | 'ai';
  content: string;
  timestamp: number;
  type: 'question' | 'response' | 'interruption' | 'followup';
}

interface AIInterviewerState {
  isAnalyzing: boolean;
  isSpeaking: boolean;
  conversationHistory: ConversationTurn[];
  currentContext: ConversationContext | null;
  pendingInterruption: string | null;
}

export const useAIInterviewer = () => {
  const [state, setState] = useState<AIInterviewerState>({
    isAnalyzing: false,
    isSpeaking: false,
    conversationHistory: [],
    currentContext: null,
    pendingInterruption: null
  });

  // Generate dynamic follow-up questions based on what user just said
  const generateFollowUp = useCallback(async (
    userSpeech: string,
    context: ConversationContext
  ): Promise<string> => {
    setState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      // Analyze user's response in real-time
      const analysisPrompt = `
CONTEXT: System design interview, ${context.phase.name} phase
RECENT USER STATEMENT: "${userSpeech}"
CONVERSATION HISTORY: ${context.conversationHistory.slice(-3).map(turn => 
  `${turn.speaker}: ${turn.content}`).join('\n')}

Generate a BRIEF follow-up question or comment (1-2 sentences max) that:
1. Acknowledges what they said
2. Probes deeper into their reasoning OR
3. Asks about something they missed OR  
4. Challenges their approach constructively

Be conversational like a real interviewer. Examples:
- "Interesting choice on Redis. How would you handle cache invalidation?"
- "That's a good start. What about data consistency across regions?"
- "I notice you mentioned microservices. How would you handle communication between them?"

RESPOND ONLY with the follow-up question/comment, nothing else.
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an experienced system design interviewer. Generate brief, natural follow-up questions.' },
            { role: 'user', content: analysisPrompt }
          ],
          max_tokens: 100,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate follow-up');
      }

      const result = await response.json();
      return result.choices[0]?.message?.content || generateFallbackFollowUp(userSpeech, context.phase.id);

    } catch (error) {
      console.error('Failed to generate AI follow-up:', error);
      return generateFallbackFollowUp(userSpeech, context.phase.id);
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, []);

  // Generate interruption when user is stuck or silent too long
  const generateInterruption = useCallback(async (
    context: ConversationContext,
    silenceDuration: number
  ): Promise<string> => {
    const interruptionPrompts = {
      requirements: [
        "Let me help you think through this. What scale are we talking about here?",
        "Take your time. What questions would you ask about user behavior?",
        "Think about the key metrics - how many requests per second might we see?"
      ],
      architecture: [
        "What's your first instinct for the main components here?",
        "Let's start simple - what would a basic version look like?",
        "Think about the data flow - where does a request start and end?"
      ],
      scaling: [
        "Where do you think the bottlenecks would be in your current design?",
        "What happens when we need to handle 10x more traffic?",
        "Let's think about caching - where would that help most?"
      ]
    };

    const prompts = interruptionPrompts[context.phase.id as keyof typeof interruptionPrompts] || interruptionPrompts.requirements;
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    return silenceDuration > 6000 
      ? `${randomPrompt} Take your time to think it through.`
      : randomPrompt;
  }, []);

  // Speak AI response with natural pauses
  const speakResponse = useCallback(async (text: string, type: 'question' | 'followup' | 'interruption' = 'followup') => {
    setState(prev => ({ ...prev, isSpeaking: true }));

    try {
      // Add natural speech patterns based on type
      const enhancedText = type === 'interruption' 
        ? `${text}` // Keep interruptions direct
        : type === 'question'
        ? `${text}` // Keep questions clean
        : `${text}`; // Keep follow-ups natural

      const audioBase64 = await generateSpeech(enhancedText);
      if (audioBase64) {
        await playBase64Audio(audioBase64);
      } else {
        // Fallback to browser TTS with more natural voice
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(enhancedText);
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
          utterance.volume = 0.8;
          speechSynthesis.speak(utterance);
          
          // Wait for speech to complete
          await new Promise(resolve => {
            utterance.onend = () => resolve(void 0);
          });
        }
      }

      // Add to conversation history
      setState(prev => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, {
          speaker: 'ai',
          content: text,
          timestamp: Date.now(),
          type
        }]
      }));

    } catch (error) {
      console.error('Failed to speak AI response:', error);
    } finally {
      setState(prev => ({ ...prev, isSpeaking: false }));
    }
  }, []);

  // Process user speech and determine AI response
  const processUserSpeech = useCallback(async (
    transcript: string,
    context: ConversationContext
  ): Promise<void> => {
    // Add user speech to history
    setState(prev => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, {
        speaker: 'user',
        content: transcript,
        timestamp: Date.now(),
        type: 'response'
      }],
      currentContext: context
    }));

    // Analyze if we need a follow-up
    const shouldFollowUp = await shouldGenerateFollowUp(transcript, context);
    
    if (shouldFollowUp) {
      const followUp = await generateFollowUp(transcript, context);
      
      // Delay slightly to feel natural
      setTimeout(() => {
        speakResponse(followUp, 'followup');
      }, 1000 + Math.random() * 1000); // 1-2 second delay
    }
  }, [generateFollowUp, speakResponse]);

  // Handle silence-based interruptions
  const handleSilenceInterruption = useCallback(async (
    context: ConversationContext,
    silenceDuration: number
  ): Promise<void> => {
    if (state.isSpeaking || silenceDuration < 3000) return;

    const interruption = await generateInterruption(context, silenceDuration);
    await speakResponse(interruption, 'interruption');
  }, [state.isSpeaking, generateInterruption, speakResponse]);

  return {
    ...state,
    processUserSpeech,
    handleSilenceInterruption,
    speakResponse,
    isAvailable: !state.isSpeaking && !state.isAnalyzing
  };
};

// Helper functions
function generateFallbackFollowUp(userSpeech: string, phaseId: string): string {
  const fallbacks = {
    requirements: [
      "That's a good point. What else should we consider?",
      "Interesting. How would you prioritize these requirements?",
      "Can you elaborate on that a bit more?"
    ],
    architecture: [
      "Nice approach. What about the data layer?",
      "That makes sense. How would these components communicate?",
      "Good thinking. Any concerns with this design?"
    ],
    scaling: [
      "Right. Where might we see bottlenecks?",
      "That could work. What about reliability?",
      "Good idea. How would you monitor this?"
    ]
  };

  const options = fallbacks[phaseId as keyof typeof fallbacks] || fallbacks.requirements;
  return options[Math.floor(Math.random() * options.length)];
}

async function shouldGenerateFollowUp(transcript: string, context: ConversationContext): Promise<boolean> {
  // Simple heuristics for when to follow up
  const recentAIResponses = context.conversationHistory
    .filter(turn => turn.speaker === 'ai')
    .slice(-2);

  // Don't follow up too frequently
  if (recentAIResponses.length > 0) {
    const lastAI = recentAIResponses[recentAIResponses.length - 1];
    const timeSinceLastAI = Date.now() - lastAI.timestamp;
    if (timeSinceLastAI < 10000) return false; // Wait at least 10 seconds
  }

  // Follow up if user speech is substantial (more than 20 words)
  const wordCount = transcript.split(' ').length;
  if (wordCount > 20) return true;

  // Follow up if user mentions key concepts
  const keyTerms = ['database', 'cache', 'api', 'service', 'scale', 'user', 'system'];
  const hasKeyTerms = keyTerms.some(term => transcript.toLowerCase().includes(term));
  
  return hasKeyTerms && wordCount > 10;
} 