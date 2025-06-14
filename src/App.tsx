import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import InterviewSetup from "./pages/InterviewSetup";
import LiveInterview from "./pages/LiveInterview";
import LiveCoding from "./pages/LiveCoding";
import SimpleLiveCoding from "./pages/SimpleLiveCoding";
import { LiveSystemDesign } from "./components/interviews/system-design/LiveSystemDesign";
import SessionSummary from "./pages/SessionSummary";
import SessionHistory from "./pages/SessionHistory";
import Settings from "./pages/Settings";
import TestAudio from "./pages/TestAudio";
import AudioDemo from "./pages/AudioDemo";
import VideoTest from "./pages/VideoTest";
import EnhancedVideoTest from "./pages/EnhancedVideoTest";
import NotFound from "./pages/NotFound";
import { stopAllAudio } from '@/utils/elevenlabs';

const queryClient = new QueryClient();

const App = () => {
  // Global audio cleanup on navigation/page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🛑 Page unloading - stopping all audio');
      stopAllAudio();
    };

    // Listen for page unload events
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup on app unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopAllAudio();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/sign-in" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/interview-setup" element={<InterviewSetup />} />
            <Route path="/live-interview" element={<LiveInterview />} />
            <Route path="/live-coding" element={<LiveCoding />} />
            <Route path="/simple-live-coding" element={<SimpleLiveCoding />} />
            <Route path="/live-system-design" element={<LiveSystemDesign />} />
            <Route path="/session-summary" element={<SessionSummary />} />
            <Route path="/history" element={<SessionHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/test-audio" element={<TestAudio />} />
            <Route path="/audio-demo" element={<AudioDemo />} />
            <Route path="/video-test" element={<VideoTest />} />
            <Route path="/enhanced-video-test" element={<EnhancedVideoTest />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
