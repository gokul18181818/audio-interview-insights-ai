
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mic, 
  History,
  ArrowRight,
  Play,
  BarChart3
} from "lucide-react";
import Navigation from "@/components/Navigation";
import FloatingElement from "@/components/FloatingElement";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      {/* Background floating elements */}
      <FloatingElement className="top-32 right-20" delay={0}>
        <div className="w-12 h-12 rounded-full bg-gradient-secondary opacity-30" />
      </FloatingElement>
      <FloatingElement className="bottom-40 left-32" delay={1.5}>
        <div className="w-8 h-8 rounded-lg bg-gradient-accent opacity-40" />
      </FloatingElement>

      <Navigation />
      
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Main Question */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6">What do you want to do today?</h1>
            <p className="text-xl text-muted-foreground">Choose your path to interview success</p>
          </div>

          {/* Big Action Cards Side by Side */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Start New Interview */}
            <Card 
              className="glass-card border-0 hover:bg-white/10 transition-all cursor-pointer group h-80"
              onClick={() => navigate("/interview-setup")}
            >
              <CardContent className="p-12 h-full flex flex-col justify-between">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Start New Interview</h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Practice with AI-powered mock interviews tailored to your target role and company
                  </p>
                </div>
                <div className="flex items-center justify-center mt-8">
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* View Past Interviews */}
            <Card 
              className="glass-card border-0 hover:bg-white/10 transition-all cursor-pointer group h-80"
              onClick={() => navigate("/history")}
            >
              <CardContent className="p-12 h-full flex flex-col justify-between">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-secondary flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">View Past Interviews</h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Review your progress, track improvements, and revisit detailed feedback from previous sessions
                  </p>
                </div>
                <div className="flex items-center justify-center mt-8">
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access Testing Features */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-center mb-8">🧪 Testing & Development</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <Button 
                variant="outline" 
                className="h-16 text-left justify-start"
                onClick={() => navigate("/video-test")}
              >
                <div>
                  <div className="font-semibold">Basic Video Test</div>
                  <div className="text-sm text-muted-foreground">Current video analysis</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 text-left justify-start bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30"
                onClick={() => navigate("/enhanced-video-test")}
              >
                <div>
                  <div className="font-semibold">🚀 Enhanced Video Test</div>
                  <div className="text-sm text-muted-foreground">Advanced accuracy features</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 text-left justify-start"
                onClick={() => navigate("/test-audio")}
              >
                <div>
                  <div className="font-semibold">Audio Test</div>
                  <div className="text-sm text-muted-foreground">Microphone testing</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Quick Stats Preview */}
          <div className="mt-16 text-center">
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-primary mb-1">12</div>
                <div className="text-sm text-muted-foreground">Interviews</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400 mb-1">78</div>
                <div className="text-sm text-muted-foreground">Avg Score</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-1">+15</div>
                <div className="text-sm text-muted-foreground">Improvement</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
