
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mic, 
  History,
  ArrowRight
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
        <div className="max-w-2xl mx-auto text-center">
          {/* Main Question */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">What do you want to do today?</h1>
            <p className="text-xl text-muted-foreground">Choose your path to interview success</p>
          </div>

          {/* Action Cards */}
          <div className="grid gap-6">
            {/* Start New Interview */}
            <Card 
              className="glass-card border-0 hover:bg-white/10 transition-all cursor-pointer group"
              onClick={() => navigate("/interview-setup")}
            >
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Mic className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-2xl font-bold mb-2">Start a New Interview</h2>
                      <p className="text-muted-foreground">Practice with AI-powered mock interviews</p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* View Past Interviews */}
            <Card 
              className="glass-card border-0 hover:bg-white/10 transition-all cursor-pointer group"
              onClick={() => navigate("/history")}
            >
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <History className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-2xl font-bold mb-2">View Past Interviews</h2>
                      <p className="text-muted-foreground">Review your progress and feedback</p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
