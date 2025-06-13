
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  Building2,
  Filter,
  Eye
} from "lucide-react";
import Navigation from "@/components/Navigation";

const SessionHistory = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  const sessions = [
    {
      id: 1,
      date: "Today, 2:30 PM",
      company: "Google",
      role: "Backend Engineer",
      type: "Behavioral",
      score: 85,
      duration: "12 min",
      questions: 4,
      improvement: "+8"
    },
    {
      id: 2,
      date: "Yesterday, 4:15 PM", 
      company: "Meta",
      role: "Frontend Engineer",
      type: "Technical",
      score: 78,
      duration: "18 min",
      questions: 3,
      improvement: "+5"
    },
    {
      id: 3,
      date: "2 days ago",
      company: "Amazon",
      role: "Full-Stack Developer",
      type: "System Design",
      score: 82,
      duration: "25 min",
      questions: 2,
      improvement: "+12"
    },
    {
      id: 4,
      date: "1 week ago",
      company: "Apple",
      role: "Backend Engineer", 
      type: "Behavioral",
      score: 73,
      duration: "15 min",
      questions: 5,
      improvement: "-3"
    },
    {
      id: 5,
      date: "1 week ago",
      company: "Microsoft",
      role: "DevOps Engineer",
      type: "Technical",
      score: 89,
      duration: "20 min", 
      questions: 4,
      improvement: "+15"
    },
    {
      id: 6,
      date: "2 weeks ago",
      company: "Netflix",
      role: "Frontend Engineer",
      type: "Behavioral",
      score: 76,
      duration: "14 min",
      questions: 4,
      improvement: "+2"
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    return "text-red-400";
  };

  const getImprovementColor = (improvement: string) => {
    const value = parseInt(improvement);
    if (value > 0) return "text-green-400";
    if (value < 0) return "text-red-400";
    return "text-muted-foreground";
  };

  const averageScore = Math.round(sessions.reduce((acc, session) => acc + session.score, 0) / sessions.length);
  const totalSessions = sessions.length;
  const totalPracticeTime = sessions.reduce((acc, session) => {
    return acc + parseInt(session.duration);
  }, 0);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Session History</h1>
            <p className="text-muted-foreground">Track your interview progress over time</p>
          </div>
          <Button onClick={() => navigate("/interview-setup")} className="bg-gradient-primary">
            Start New Interview
          </Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Stats & Filters */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="glass-card border-0">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Your Progress
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Score</span>
                    <span className={`font-semibold ${getScoreColor(averageScore)}`}>
                      {averageScore}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Sessions</span>
                    <span className="font-semibold">{totalSessions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Practice Time</span>
                    <span className="font-semibold">{Math.round(totalPracticeTime/60)}h {totalPracticeTime%60}m</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="glass-card border-0">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Role</label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="glass-card border-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="backend">Backend Engineer</SelectItem>
                        <SelectItem value="frontend">Frontend Engineer</SelectItem>
                        <SelectItem value="fullstack">Full-Stack Developer</SelectItem>
                        <SelectItem value="devops">DevOps Engineer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Company</label>
                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                      <SelectTrigger className="glass-card border-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="meta">Meta</SelectItem>
                        <SelectItem value="amazon">Amazon</SelectItem>
                        <SelectItem value="apple">Apple</SelectItem>
                        <SelectItem value="microsoft">Microsoft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Session List */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-card border-0 pl-10"
              />
            </div>

            {/* Sessions List */}
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id} className="glass-card border-0 hover:bg-white/5 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                            {session.company}
                          </Badge>
                          <Badge variant="secondary" className="bg-muted/20">
                            {session.type}
                          </Badge>
                          <div className={`flex items-center gap-1 ${getImprovementColor(session.improvement)}`}>
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-xs font-medium">{session.improvement}</span>
                          </div>
                        </div>
                        
                        <h4 className="font-medium text-lg mb-2">{session.role}</h4>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {session.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {session.questions} questions
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className={`text-2xl font-bold ${getScoreColor(session.score)}`}>
                              {session.score}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary/80"
                            onClick={() => navigate("/session-summary")}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;
