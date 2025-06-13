// ElevenLabs API integration via Supabase backend
// API key is now securely stored in the backend

export interface Voice {
  voice_id: string;
  name: string;
  description: string;
}

// Premium smooth & natural voices from ElevenLabs
export const VOICES: Voice[] = [
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Ultra-smooth female voice (Premium)' },
  { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Silky smooth male voice (Premium)' },
  { voice_id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Warm, conversational female (Premium)' },
  { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Natural, engaging male (Premium)' },
  { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Confident, smooth female (Premium)' },
  { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Rachel', description: 'Professional female voice' },
  { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Natural male voice' }
];

export const generateSpeech = async (
  text: string, 
  voiceId: string = 'EXAVITQu4vr4xnSDxMaL' // Default to Bella (ultra-smooth)
): Promise<string> => {
  try {
    console.log(`🔊 Generating speech with ElevenLabs via backend (${voiceId}):`, text);
    
    // Use your Supabase backend to proxy the ElevenLabs API
    const response = await fetch('https://llfckjszmvhirwjfzdqj.supabase.co/functions/v1/elevenlabs-tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZmNranN6bXZoaXJ3amZ6ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTIxNDIsImV4cCI6MjA2NTM2ODE0Mn0.G9FHck8cRIdz5K31ZmnMHufIWceW6fF2pmc9m4BUBbE'
      },
      body: JSON.stringify({
        text: text,
        voice_id: voiceId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend TTS error:', response.status, errorData);
      
      // If it's an ElevenLabs quota/API issue, fall back to browser TTS
      if (response.status === 401 || response.status === 429 || 
          (errorData.message && errorData.message.includes('quota'))) {
        console.log('🔄 ElevenLabs quota reached, falling back to enhanced browser TTS...');
        return await generateBrowserTTS(text);
      }
      
      throw new Error(`Backend TTS error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.audio) {
      console.log('🔄 Invalid TTS response, falling back to browser TTS...');
      return await generateBrowserTTS(text);
    }
    
    console.log('✅ Speech generated successfully via ElevenLabs, size:', data.audio.length);
    return data.audio;
    
  } catch (error) {
    console.error('❌ ElevenLabs speech generation failed, trying browser TTS fallback:', error);
    
    // Final fallback to browser TTS
    try {
      return await generateBrowserTTS(text);
    } catch (fallbackError) {
      console.error('❌ All TTS methods failed:', fallbackError);
      throw new Error('All text-to-speech methods failed');
    }
  }
};

// Enhanced browser TTS with better voice selection and quality
const generateBrowserTTS = async (text: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Browser TTS not supported'));
      return;
    }

    // Wait for voices to load
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      
      // Try to find high-quality voices (prefer neural/enhanced voices)
      const preferredVoices = voices.filter(voice => 
        voice.lang.startsWith('en') && (
          voice.name.includes('Neural') ||
          voice.name.includes('Enhanced') ||
          voice.name.includes('Premium') ||
          voice.name.includes('Samantha') ||
          voice.name.includes('Alex') ||
          voice.name.includes('Victoria')
        )
      );
      
      const selectedVoice = preferredVoices[0] || voices.find(v => v.lang.startsWith('en')) || voices[0];
      
      if (!selectedVoice) {
        reject(new Error('No suitable browser voice found'));
        return;
      }

      console.log(`🎙️ Using browser voice: ${selectedVoice.name} (${selectedVoice.lang})`);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Create a dummy base64 to maintain API compatibility
      // In a real implementation, you might record the audio output
      utterance.onend = () => {
        console.log('✅ Browser TTS playback completed');
        // Return a placeholder base64 since browser TTS plays directly
        resolve('browser_tts_placeholder');
      };

      utterance.onerror = (error) => {
        console.error('Browser TTS error:', error);
        reject(new Error('Browser TTS failed'));
      };

      speechSynthesis.speak(utterance);
    };

    // Load voices if not already loaded
    if (speechSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  });
};

export const playBase64Audio = async (base64Audio: string, mimeType = 'audio/mpeg'): Promise<void> => {
  try {
    // Handle browser TTS placeholder (audio already played)
    if (base64Audio === 'browser_tts_placeholder') {
      console.log('🎙️ Browser TTS audio already played');
      return;
    }
    
    // Convert base64 to blob
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const audioBlob = new Blob([bytes], { type: mimeType });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };
      
      audio.play().catch(reject);
    });
    
  } catch (error) {
    console.error('Audio playback failed:', error);
    throw error;
  }
};

// Test function with ultra-smooth voice
export const testElevenLabsVoice = async (text = "Hello! I'm your AI interviewer, and I have an incredibly smooth, natural voice. Notice how fluid and conversational I sound compared to robotic alternatives."): Promise<boolean> => {
  try {
    const audioBase64 = await generateSpeech(text, 'EXAVITQu4vr4xnSDxMaL'); // Bella - ultra-smooth
    await playBase64Audio(audioBase64);
    return true;
  } catch (error) {
    console.error('Voice test failed:', error);
    return false;
  }
}; 