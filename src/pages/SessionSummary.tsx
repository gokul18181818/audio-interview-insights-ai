
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Play,
  Star,
  TrendingUp,
  Clock,
  MessageSquare,
  Volume2,
  Target,
  Lightbulb,
  RefreshCw,
  Home
} from "lucide-react";
import Navigation from "@/components/Navigation";

const SessionSummary = () => {
  const navigate = useNavigate();
  const [activeTranscriptItem, setActiveTranscriptItem] = useState<number | null>(null);

  const sessionData = {
    date: "Today, 3:45 PM",
    duration: "14 minutes",
    company: "Google",
    role: "Backend Engineer",
    type: "Behavioral",
    overallScore: 85
  };

  const metrics = [
    { label: "Pace", value: 78, status: "Good", description: "Optimal speaking speed" },
    { label: "Clarity", value: 92, status: "Excellent", description: "Clear articulation" },
    { label: "STAR Method", value: 73, status: "Good", description: "Structured responses" },
    { label: "Confidence", value: 81, status: "Good", description: "Confident delivery" }
  ];

  const transcript = [
    {
      id: 1,
      speaker: "AI",
      text: "Tell me about yourself and your background in software engineering.",
      timestamp: "00:15",
      duration: 3
    },
    {
      id: 2,
      speaker: "You",
      text: "I'm a software engineer with 3 years of experience, primarily focused on backend development. I've worked with Python, Java, and distributed systems. In my current role at TechCorp, I've been responsible for building scalable APIs and optimizing database performance.",
      timestamp: "00:18",
      duration: 25,
      highlights: ["distributed systems", "scalable APIs", "database performance"],
      fillerWords: ["um", "like"]
    },
    {
      id: 3,
      speaker: "AI", 
      text: "That's great. Can you describe a challenging technical problem you've solved recently?",
      timestamp: "00:43",
      duration: 4
    },
    {
      id: 4,
      speaker: "You",
      text: "Recently, we had a performance issue where our API response times increased from 200ms to over 2 seconds. I investigated and found it was due to N+1 queries in our ORM. I implemented eager loading and database query optimization, which reduced response times back to under 300ms.",
      timestamp: "00:47", 
      duration: 30,
      highlights: ["performance issue", "N+1 queries", "optimization"],
      fillerWords: ["uh"]
    }
  ];

  const suggestedAnswers = [
    {
      question: "Tell me about yourself",
      suggestion: "Consider starting with a brief overview of your experience, then highlight 2-3 key achievements that relate to the role you're applying for."
    },
    {
      question: "Challenging technical problem",
      suggestion: "Use the STAR method more explicitly: Situation (performance issue), Task (investigate), Action (implemented solutions), Result (quantified improvement)."
    }
  ];

  const playAudio = (timestamp: string) => {
    console.log(`Playing audio from ${timestamp}`);
    // Audio playback logic would go here
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Interview Complete! 🎉</h1>
              <div className="flex items-center gap-4 text-muted-foreground mt-1">
                <span>{sessionData.date}</span>
                <span>•</span>
                <span>{sessionData.duration}</span>
                <span>•</span>
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                  {sessionData.company} • {sessionData.role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/interview-setup")} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Practice Again
            </Button>
            <Button onClick={() => navigate("/dashboard")} className="bg-gradient-primary">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Overall Score */}
        <Card className="glass-card border-0 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-white">{sessionData.overallScore}</span>
                </div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Great performance!</h3>
                <p className="text-muted-foreground mb-4">
                  You demonstrated strong technical knowledge and good communication skills. 
                  Focus on using the STAR method more consistently for behavioral questions.
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">+8 points from last session</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Feedback Tabs */}
        <Tabs defaultValue="transcript" className="space-y-6">
          <TabsList className="glass-card border-0 p-1">
            <TabsTrigger value="transcript" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="space-y-4">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Interactive Transcript
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transcript.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      activeTranscriptItem === item.id 
                        ? "border-primary bg-primary/10" 
                        : "border-muted hover:border-primary/50 hover:bg-white/5"
                    }`}
                    onClick={() => setActiveTranscriptItem(item.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge 
                          variant={item.speaker === "AI" ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {item.speaker}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(item.timestamp);
                          }}
                          className="p-1 h-6 w-6"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="leading-relaxed">
                        {item.text.split(' ').map((word, index) => {
                          const isHighlight = item.highlights?.includes(word.toLowerCase().replace(/[.,]/g, ''));
                          const isFiller = item.fillerWords?.includes(word.toLowerCase().replace(/[.,]/g, ''));
                          
                          return (
                            <span
                              key={index}
                              className={`${
                                isHighlight ? 'bg-green-500/20 text-green-400' :
                                isFiller ? 'bg-yellow-500/20 text-yellow-400' : ''
                              }`}
                            >
                              {word}{' '}
                            </span>
                          );
                        })}
                      </p>
                      
                      {(item.highlights || item.fillerWords) && (
                        <div className="flex gap-4 mt-3 text-xs">
                          {item.highlights && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-400" />
                              <span className="text-green-400">Key terms</span>
                            </div>
                          )}
                          {item.fillerWords && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-yellow-400" />
                              <span className="text-yellow-400">Filler words</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {metrics.map((metric) => (
                <Card key={metric.label} className="glass-card border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{metric.label}</h4>
                      <Badge 
                        variant={metric.status === "Excellent" ? "default" : "secondary"}
                        className={metric.status === "Excellent" ? "bg-green-500" : ""}
                      >
                        {metric.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Score</span>
                        <span className="font-semibold">{metric.value}%</span>
                      </div>
                      <Progress value={metric.value} className="h-2" />
                      <p className="text-sm text-muted-foreground">{metric.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            {suggestedAnswers.map((item, index) => (
              <Card key={index} className="glass-card border-0">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">{item.question}</h4>
                      <p className="text-muted-foreground leading-relaxed">{item.suggestion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SessionSummary;
