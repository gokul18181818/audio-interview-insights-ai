
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import confetti from 'canvas-confetti';
import { 
  ArrowLeft,
  Play,
  Star,
  TrendingUp,
  Clock,
  MessageSquare,
  Target,
  Lightbulb,
  RefreshCw,
  Home,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  Eye
} from "lucide-react";
import Navigation from "@/components/Navigation";

const SessionSummary = () => {
  const navigate = useNavigate();
  const [scoreAnimated, setScoreAnimated] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const sessionData = {
    date: "Today, 3:45 PM",
    duration: "14 minutes",
    company: "Google",
    role: "Backend Engineer",
    type: "Behavioral",
    overallScore: 85
  };

  const strengths = [
    "Clear technical explanations",
    "Good use of specific examples",
    "Confident delivery",
    "Structured responses"
  ];

  const improvements = [
    "Use STAR method more consistently",
    "Reduce filler words (um, like)",
    "Provide more quantified results",
    "Practice concise answers"
  ];

  const metrics = [
    { label: "Pace", value: 78, status: "Good", description: "Optimal speaking speed", icon: Clock },
    { label: "Clarity", value: 92, status: "Excellent", description: "Clear articulation", icon: MessageSquare },
    { label: "STAR Method", value: 73, status: "Good", description: "Structured responses", icon: Target },
    { label: "Confidence", value: 81, status: "Good", description: "Confident delivery", icon: TrendingUp }
  ];

  const suggestions = [
    {
      question: "Tell me about yourself",
      current: "I'm a software engineer with 3 years of experience...",
      suggestion: "Consider starting with a brief overview, then highlight 2-3 key achievements that relate to the role.",
      improvement: "Structure: Brief intro → Key achievements → Relevant skills → Connection to role"
    },
    {
      question: "Challenging technical problem",
      current: "Recently, we had a performance issue...",
      suggestion: "Use the STAR method more explicitly to showcase your problem-solving process.",
      improvement: "Situation → Task → Action (be specific) → Result (quantify impact)"
    }
  ];

  // Trigger confetti and score animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 500);

    // Animate score counter
    const scoreTimer = setTimeout(() => {
      let current = 0;
      const increment = sessionData.overallScore / 50;
      const scoreInterval = setInterval(() => {
        current += increment;
        if (current >= sessionData.overallScore) {
          setScoreAnimated(sessionData.overallScore);
          clearInterval(scoreInterval);
        } else {
          setScoreAnimated(Math.floor(current));
        }
      }, 30);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(scoreTimer);
    };
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-blue-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 90) return "from-green-500 to-emerald-500";
    if (score >= 70) return "from-blue-500 to-cyan-500";
    if (score >= 50) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
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

        {/* Celebration & Score Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4 animate-fade-in">
              Interview Complete! 🎉
            </h1>
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <span>{sessionData.date}</span>
              <span>•</span>
              <span>{sessionData.duration}</span>
              <span>•</span>
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                {sessionData.company} • {sessionData.role}
              </Badge>
            </div>
          </div>

          {/* Animated Score Card */}
          <Card className="glass-card border-0 max-w-md mx-auto mb-12 animate-scale-in">
            <CardContent className="p-8">
              <div className="relative">
                <div className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${getScoreGradient(sessionData.overallScore)} flex items-center justify-center mb-4 animate-pulse-glow`}>
                  <span className={`text-4xl font-bold text-white`}>
                    {scoreAnimated}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2">Overall Score</h3>
                <p className="text-muted-foreground">
                  {sessionData.overallScore >= 90 ? "Outstanding performance!" :
                   sessionData.overallScore >= 70 ? "Great job! Strong performance overall." :
                   sessionData.overallScore >= 50 ? "Good effort! Room for improvement." :
                   "Keep practicing! You're on the right track."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What You Did Well */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <ThumbsUp className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold">What You Did Well</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {strengths.map((strength, index) => (
              <Card key={index} className="glass-card border-0 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <p className="font-medium">{strength}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Areas for Improvement */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-yellow-400" />
            </div>
            <h2 className="text-3xl font-bold">Areas for Improvement</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {improvements.map((improvement, index) => (
              <Card key={index} className="glass-card border-0 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <p className="font-medium">{improvement}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Individual Metrics */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold">Detailed Metrics</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label} className="glass-card border-0 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{metric.label}</h4>
                          <Badge 
                            variant={metric.status === "Excellent" ? "default" : "secondary"}
                            className={metric.status === "Excellent" ? "bg-green-500" : ""}
                          >
                            {metric.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Score</span>
                        <span className="font-bold text-lg">{metric.value}%</span>
                      </div>
                      <Progress value={metric.value} className="h-3" />
                      <p className="text-sm text-muted-foreground">{metric.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Suggestions Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold">Personalized Suggestions</h2>
          </div>
          
          <div className="space-y-6">
            {suggestions.map((item, index) => (
              <Card key={index} className="glass-card border-0 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                <CardContent className="p-8">
                  <h4 className="font-bold text-xl mb-4 text-primary">{item.question}</h4>
                  
                  <div className="space-y-6">
                    <div>
                      <h5 className="font-semibold mb-2 text-muted-foreground">Your Response:</h5>
                      <p className="text-sm bg-muted/30 p-4 rounded-lg italic">"{item.current}"</p>
                    </div>
                    
                    <div>
                      <h5 className="font-semibold mb-2 text-blue-400">💡 Suggestion:</h5>
                      <p className="text-sm leading-relaxed">{item.suggestion}</p>
                    </div>
                    
                    <div>
                      <h5 className="font-semibold mb-2 text-green-400">✨ Structure to Follow:</h5>
                      <p className="text-sm leading-relaxed font-mono bg-green-500/10 p-4 rounded-lg">
                        {item.improvement}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <div className="text-center">
          <Card className="glass-card border-0 max-w-md mx-auto">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold mb-4">Ready for Another Round?</h3>
              <p className="text-muted-foreground mb-6">Keep practicing to improve your scores!</p>
              <Button 
                onClick={() => navigate("/interview-setup")} 
                className="w-full bg-gradient-primary hover:opacity-90 h-12"
              >
                <Play className="w-5 h-5 mr-2" />
                Start New Interview
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SessionSummary;
