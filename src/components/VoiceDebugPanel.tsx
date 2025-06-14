import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export const VoiceDebugPanel: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [browserSupport, setBrowserSupport] = useState(false);

  useEffect(() => {
    // Check browser support
    const hasSupport = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setBrowserSupport(hasSupport);
    
    if (hasSupport) {
      console.log('✅ Browser supports speech recognition');
    } else {
      console.error('❌ Browser does not support speech recognition');
    }
  }, []);

  const startListening = async () => {
    if (!browserSupport) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    try {
      // Check microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream, we just needed permission
      
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const newRecognition = new SpeechRecognition();
      
      newRecognition.continuous = true;
      newRecognition.interimResults = true;
      newRecognition.lang = 'en-US';

      newRecognition.onstart = () => {
        setIsListening(true);
        setError('');
        console.log('🎤 Debug: Speech recognition started');
      };

      newRecognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
        console.log('🎯 Debug: Speech result:', { finalTranscript, interimTranscript });
      };

      newRecognition.onerror = (event: any) => {
        setError(`Speech recognition error: ${event.error}`);
        console.error('❌ Debug: Speech recognition error:', event.error);
      };

      newRecognition.onend = () => {
        setIsListening(false);
        console.log('🔚 Debug: Speech recognition ended');
      };

      newRecognition.start();
      setRecognition(newRecognition);
      
    } catch (error) {
      setError(`Microphone access denied: ${error}`);
      console.error('❌ Debug: Microphone access error:', error);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    setIsListening(false);
  };

  const testSpeech = () => {
    const utterance = new SpeechSynthesisUtterance('Testing speech synthesis. Can you hear this?');
    speechSynthesis.speak(utterance);
  };

  return (
    <Card className="p-4 bg-gray-800 border-gray-700 max-w-md">
      <h3 className="text-lg font-semibold mb-4 text-white">Voice Debug Panel</h3>
      
      <div className="space-y-3">
        <div className="text-sm">
          <span className="text-gray-400">Browser Support: </span>
          <span className={browserSupport ? 'text-green-400' : 'text-red-400'}>
            {browserSupport ? '✅ Supported' : '❌ Not Supported'}
          </span>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "default"}
            size="sm"
            disabled={!browserSupport}
          >
            {isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            {isListening ? 'Stop' : 'Start'} Listening
          </Button>

          <Button onClick={testSpeech} variant="outline" size="sm">
            <Volume2 className="h-4 w-4 mr-2" />
            Test Speech
          </Button>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
            {error}
          </div>
        )}

        {transcript && (
          <div className="text-green-400 text-sm bg-green-900/20 p-2 rounded">
            <strong>Transcript:</strong> {transcript}
          </div>
        )}

        {isListening && (
          <div className="text-blue-400 text-sm flex items-center">
            <div className="animate-pulse h-2 w-2 bg-blue-400 rounded-full mr-2"></div>
            Listening for speech...
          </div>
        )}
      </div>
    </Card>
  );
}; 