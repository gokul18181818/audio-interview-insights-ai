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
  Eye,
  Loader2
} from "lucide-react";
import Navigation from "@/components/Navigation";

const SessionSummary = () => {
  const navigate = useNavigate();
  const [scoreAnimated, setScoreAnimated] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);
  const [maxWaitTime] = useState(30000); // 30 seconds max wait

  // Load real analysis data from localStorage with polling for fresh data
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;
    
    const loadAnalysisData = () => {
      try {
        const storedAnalysis = localStorage.getItem('interviewAnalysis');
        const storedSession = localStorage.getItem('interviewSession');
        
        console.log('🔍 Checking for fresh interview data...');
        
        if (storedAnalysis && storedSession) {
          const analysis = JSON.parse(storedAnalysis);
          const session = JSON.parse(storedSession);
          
          // Check if this is fresh data (within last 2 minutes)
          const isRecentData = session.timestamp && (Date.now() - session.timestamp) < 120000;
          
          console.log('📊 Found analysis data:', analysis);
          console.log('📝 Session timestamp:', session.timestamp, 'Recent:', isRecentData);
          
          if (isRecentData || !analysisData) {
            setAnalysisData(analysis);
            setSessionInfo(session);
            setIsLoadingAnalysis(false);
            console.log('✅ Loaded fresh interview analysis for session:', analysis.session_id);
            
            // Clear the polling since we found data
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load analysis data:', error);
      }
    };

    // Initial load
    loadAnalysisData();
    
    // Poll for new data every 2 seconds if we don't have recent data
    if (isLoadingAnalysis) {
      pollInterval = setInterval(loadAnalysisData, 2000);
      
      // Stop waiting after max time and show fallback
      timeoutId = setTimeout(() => {
        console.log('⏰ Max wait time reached, showing fallback data');
        setIsLoadingAnalysis(false);
        if (pollInterval) clearInterval(pollInterval);
      }, maxWaitTime);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoadingAnalysis, analysisData, maxWaitTime]);

  // Trigger confetti and score animation on mount - only when data is loaded
  useEffect(() => {
    if (!isLoadingAnalysis && analysisData) {
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
        const targetScore = analysisData?.analysis?.overall_score || 85;
        const increment = targetScore / 50;
        const scoreInterval = setInterval(() => {
          current += increment;
          if (current >= targetScore) {
            setScoreAnimated(targetScore);
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
    }
  }, [isLoadingAnalysis, analysisData]);

  // Derived data from real analysis or fallback to mock data for demo
  const sessionData = {
    date: sessionInfo ? new Date(sessionInfo.timestamp).toLocaleString() : "Today, 3:45 PM",
    duration: sessionInfo ? `${Math.round(sessionInfo.duration / 60)} minutes` : "14 minutes", 
    company: "Google",
    role: "Backend Engineer",
    type: "Technical",
    overallScore: analysisData?.analysis?.overall_score || 85
  };

  const strengths = analysisData?.analysis?.strengths || [
    "Clear technical explanations",
    "Good use of specific examples", 
    "Confident delivery",
    "Structured responses"
  ];

  const improvements = analysisData?.analysis?.improvements || [
    "Use STAR method more consistently",
    "Reduce filler words (um, like)",
    "Provide more quantified results", 
    "Practice concise answers"
  ];

  const metrics = [
    { 
      label: "Communication", 
      value: analysisData?.analysis?.detailed_metrics?.communication?.score || 78, 
      status: getMetricStatus(analysisData?.analysis?.detailed_metrics?.communication?.score || 78), 
      description: analysisData?.analysis?.detailed_metrics?.communication?.feedback || "Clear articulation", 
      icon: MessageSquare 
    },
    { 
      label: "Technical Depth", 
      value: analysisData?.analysis?.detailed_metrics?.technical_depth?.score || 85, 
      status: getMetricStatus(analysisData?.analysis?.detailed_metrics?.technical_depth?.score || 85), 
      description: analysisData?.analysis?.detailed_metrics?.technical_depth?.feedback || "Strong technical understanding", 
      icon: Target 
    },
    { 
      label: "Structure", 
      value: analysisData?.analysis?.detailed_metrics?.structure?.score || 73, 
      status: getMetricStatus(analysisData?.analysis?.detailed_metrics?.structure?.score || 73), 
      description: analysisData?.analysis?.detailed_metrics?.structure?.feedback || "Organized responses", 
      icon: TrendingUp 
    },
    { 
      label: "Confidence", 
      value: analysisData?.analysis?.detailed_metrics?.confidence?.score || 81, 
      status: getMetricStatus(analysisData?.analysis?.detailed_metrics?.confidence?.score || 81), 
      description: analysisData?.analysis?.detailed_metrics?.confidence?.feedback || "Confident delivery", 
      icon: Clock 
    }
  ];

  const suggestions = analysisData?.analysis?.personalized_suggestions || [
    {
      question: "Tell me about yourself",
      user_response: "I'm a software engineer with 3 years of experience...",
      suggestion: "Consider starting with a brief overview, then highlight 2-3 key achievements that relate to the role.",
      improvement_framework: "Structure: Brief intro → Key achievements → Relevant skills → Connection to role"
    }
  ];

  function getMetricStatus(score: number): string {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 60) return "Fair";
    return "Needs Work";
  }

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

  // Show loading state while waiting for fresh analysis
  if (isLoadingAnalysis) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
              <h2 className="text-2xl font-semibold text-gray-800">Analyzing Your Interview...</h2>
              <p className="text-gray-600 max-w-md">
                Our AI is carefully reviewing your responses and preparing detailed feedback. 
                This usually takes 10-20 seconds.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Transcribing responses</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Evaluating technical depth</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Generating personalized feedback</span>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className="mt-8"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
                      <p className="text-sm bg-muted/30 p-4 rounded-lg italic">"{item.user_response}"</p>
                    </div>
                    
                    <div>
                      <h5 className="font-semibold mb-2 text-blue-400">💡 Suggestion:</h5>
                      <p className="text-sm leading-relaxed">{item.suggestion}</p>
                    </div>
                    
                    <div>
                      <h5 className="font-semibold mb-2 text-green-400">✨ Structure to Follow:</h5>
                      <p className="text-sm leading-relaxed font-mono bg-green-500/10 p-4 rounded-lg">
                        {item.improvement_framework}
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
