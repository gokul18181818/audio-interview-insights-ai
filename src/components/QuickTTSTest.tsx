import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Volume2, CheckCircle, XCircle } from "lucide-react";
import { generateSpeech, playBase64Audio } from "@/utils/elevenlabs";

const QuickTTSTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);

  const testTTS = async () => {
    setIsLoading(true);
    setLastResult(null);
    
    try {
      console.log('🧪 Testing ultra-smooth voice integration...');
      const audioBase64 = await generateSpeech(
        "Wow! Listen to how incredibly smooth and natural my voice sounds. This is Bella, your premium AI interviewer with ultra-realistic speech.",
        'EXAVITQu4vr4xnSDxMaL' // Bella - ultra-smooth
      );
      
      await playBase64Audio(audioBase64);
      setLastResult('success');
      console.log('✅ Backend TTS test passed!');
      
    } catch (error) {
      console.error('❌ Backend TTS test failed:', error);
      setLastResult('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
      <Button 
        onClick={testTTS} 
        disabled={isLoading}
        size="sm"
        variant="outline"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4 mr-2" />
            Quick TTS Test
          </>
        )}
      </Button>
      
      {lastResult === 'success' && (
        <div className="flex items-center gap-1 text-green-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          Backend Working!
        </div>
      )}
      
      {lastResult === 'error' && (
        <div className="flex items-center gap-1 text-red-400 text-sm">
          <XCircle className="w-4 h-4" />
          Backend Error
        </div>
      )}
    </div>
  );
};

export default QuickTTSTest; 