 import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Loader2 } from "lucide-react";
import { generateSpeech, playBase64Audio, VOICES } from "@/utils/elevenlabs";

const VoiceTest = () => {
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].voice_id); // Bella - ultra-smooth
  const [isPlaying, setIsPlaying] = useState(false);
  const [testText, setTestText] = useState("Listen to how incredibly smooth and natural my voice sounds! I'm using premium AI technology that creates human-like speech with perfect intonation and flow. This is what cutting-edge voice synthesis sounds like.");

  const testVoice = async () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    try {
      console.log('🔊 Testing voice:', VOICES.find(v => v.voice_id === selectedVoice)?.name);
      const audioBase64 = await generateSpeech(testText, selectedVoice);
      await playBase64Audio(audioBase64);
      console.log('✅ Voice test completed');
    } catch (error) {
      console.error('❌ Voice test failed:', error);
      alert('Voice test failed. Check console for details.');
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <Card className="glass-card border-0">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          <span className="font-medium">Natural Voice Test</span>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Voice:</label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map((voice) => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name} - {voice.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Test Text:</label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full p-2 mt-1 text-sm bg-black/20 border rounded-md resize-none"
              rows={3}
            />
          </div>
          
          <Button 
            onClick={testVoice} 
            disabled={isPlaying || !testText.trim()}
            className="w-full"
          >
            {isPlaying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Playing Natural Voice...
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 mr-2" />
                Test Natural Voice
              </>
            )}
          </Button>
        </div>
        
        <div className="text-xs text-gray-400">
          This uses ElevenLabs API for natural, human-like speech instead of robotic browser TTS.
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceTest; 