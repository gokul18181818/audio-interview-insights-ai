
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  Calendar, 
  TrendingUp, 
  Star, 
  Clock, 
  Target,
  Zap,
  BarChart3
} from "lucide-react";
import Navigation from "@/components/Navigation";
import FloatingElement from "@/components/FloatingElement";

const Dashboard = () => {
  const navigate = useNavigate();

  const recentSessions = [
    {
      id: 1,
      date: "Today, 2:30 PM",
      company: "Google",
      role: "Backend Engineer",
      type: "Behavioral",
      score: 85,
      duration: "12 min"
    },
    {
      id: 2,
      date: "Yesterday, 4:15 PM",
      company: "Meta",
      role: "Frontend Engineer", 
      type: "Technical",
      score: 78,
      duration: "18 min"
    },
    {
      id: 3,
      date: "2 days ago",
      company: "Amazon",
      role: "Full-Stack",
      type: "System Design",
      score: 82,
      duration: "25 min"
    }
  ];

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
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-muted-foreground">Ready to ace your next interview?</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Primary CTA */}
            <Card className="glass-card border-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-primary opacity-10" />
              <CardContent className="p-8 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Start New Mock Interview</h2>
                    <p className="text-muted-foreground mb-4">
                      Practice with AI-powered interviews tailored to your target role
                    </p>
                    <Button 
                      onClick={() => navigate("/interview-setup")}
                      className="bg-gradient-primary hover:opacity-90 border-0"
                      size="lg"
                    >
                      <Mic className="w-5 h-5 mr-2" />
                      Start Interview
                    </Button>
                  </div>
                  <div className="hidden md:block">
                    <div className="w-24 h-24 rounded-full bg-gradient-primary opacity-20 flex items-center justify-center">
                      <Mic className="w-12 h-12 text-primary" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Recent Sessions</h3>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/history")}
                  className="text-primary hover:text-primary/80"
                >
                  View All
                </Button>
              </div>

              <div className="space-y-4">
                {recentSessions.map((session) => (
                  <Card key={session.id} className="glass-card border-0 hover:bg-white/10 transition-all cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                              {session.company}
                            </Badge>
                            <Badge variant="secondary" className="bg-muted/20">
                              {session.type}
                            </Badge>
                          </div>
                          <h4 className="font-medium mb-1">{session.role}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {session.date}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.duration}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="font-semibold">{session.score}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="text-primary">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Subscription Status */}
            <Card className="glass-card border-0 bg-gradient-secondary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Free Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Interviews used</span>
                      <span>3/5</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    2 free interviews remaining
                  </p>
                  <Button className="w-full bg-gradient-secondary hover:opacity-90 border-0">
                    Upgrade to Pro
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average Score</span>
                  <span className="font-semibold">82%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Sessions</span>
                  <span className="font-semibold">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Practice Time</span>
                  <span className="font-semibold">4.2h</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-muted">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">+12% this week</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Today's Tip
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Practice the STAR method for behavioral questions: 
                  <strong> Situation, Task, Action, Result.</strong> 
                  This structure helps you give complete, compelling answers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
