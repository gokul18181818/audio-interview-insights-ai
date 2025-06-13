
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  Play,
  ChevronRight,
  BarChart3,
  Target,
  Trophy
} from "lucide-react";
import Navigation from "@/components/Navigation";

const SessionHistory = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const sessions = [
    {
      id: 1,
      date: "Today",
      time: "2:30 PM",
      company: "Google",
      role: "Backend Engineer",
      type: "Behavioral",
      score: 85,
      duration: "12 min",
      questions: 4,
      improvement: "+8",
      status: "completed"
    },
    {
      id: 2,
      date: "Yesterday", 
      time: "4:15 PM",
      company: "Meta",
      role: "Frontend Engineer",
      type: "Technical",
      score: 78,
      duration: "18 min",
      questions: 3,
      improvement: "+5",
      status: "completed"
    },
    {
      id: 3,
      date: "2 days ago",
      time: "10:30 AM",
      company: "Amazon",
      role: "Full-Stack Developer",
      type: "System Design",
      score: 82,
      duration: "25 min",
      questions: 2,
      improvement: "+12",
      status: "completed"
    },
    {
      id: 4,
      date: "1 week ago",
      time: "3:45 PM",
      company: "Apple",
      role: "Backend Engineer", 
      type: "Behavioral",
      score: 73,
      duration: "15 min",
      questions: 5,
      improvement: "-3",
      status: "completed"
    },
    {
      id: 5,
      date: "1 week ago",
      time: "11:20 AM",
      company: "Microsoft",
      role: "DevOps Engineer",
      type: "Technical",
      score: 89,
      duration: "20 min", 
      questions: 4,
      improvement: "+15",
      status: "completed"
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return "bg-green-400/10 border-green-400/20";
    if (score >= 70) return "bg-yellow-400/10 border-yellow-400/20";
    return "bg-red-400/10 border-red-400/20";
  };

  const getImprovementColor = (improvement: string) => {
    const value = parseInt(improvement);
    if (value > 0) return "text-green-400 bg-green-400/10";
    if (value < 0) return "text-red-400 bg-red-400/10";
    return "text-muted-foreground bg-muted/20";
  };

  const averageScore = Math.round(sessions.reduce((acc, session) => acc + session.score, 0) / sessions.length);
  const totalSessions = sessions.length;
  const bestScore = Math.max(...sessions.map(s => s.score));

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Your Interview Journey</h1>
          <p className="text-xl text-muted-foreground">Track your progress and celebrate your growth</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="glass-card border-0 text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1">{averageScore}</div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-full bg-gradient-secondary flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1">{totalSessions}</div>
              <div className="text-sm text-muted-foreground">Total Sessions</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-full bg-gradient-accent flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1">{bestScore}</div>
              <div className="text-sm text-muted-foreground">Best Score</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and New Interview */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search your interviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-card border-0 pl-12 h-12 text-lg"
            />
          </div>
          <Button 
            onClick={() => navigate("/interview-setup")} 
            className="bg-gradient-primary h-12 px-8 text-lg"
          >
            Start New Interview
          </Button>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} className="glass-card border-0 hover:bg-white/5 transition-all group cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center ${getScoreBgColor(session.score)}`}>
                        <span className={`text-2xl font-bold ${getScoreColor(session.score)}`}>
                          {session.score}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{session.role}</h3>
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            {session.company}
                          </Badge>
                          <Badge variant="secondary" className="bg-muted/20">
                            {session.type}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {session.date} at {session.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {session.questions} questions
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getImprovementColor(session.improvement)}`}>
                      <TrendingUp className="w-3 h-3" />
                      <span>{session.improvement}</span>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigate("/session-summary")}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Review
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State for No Results */}
        {sessions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full bg-gradient-primary/20 flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">No interviews yet</h3>
            <p className="text-muted-foreground mb-6">Start your first mock interview to begin tracking your progress</p>
            <Button onClick={() => navigate("/interview-setup")} className="bg-gradient-primary">
              Start Your First Interview
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionHistory;
