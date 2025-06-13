
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Building2, 
  Code, 
  MessageSquare, 
  Network,
  Clock,
  Sparkles,
  Play
} from "lucide-react";
import Navigation from "@/components/Navigation";

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [practiceTypes, setPracticeTypes] = useState<string[]>([]);

  const popularRoles = [
    "Frontend Engineer", "Backend Engineer", "Full-Stack Developer",
    "Mobile Developer", "DevOps Engineer", "Data Engineer"
  ];

  const popularCompanies = [
    "Google", "Meta", "Amazon", "Apple", "Microsoft", "Netflix",
    "Spotify", "Airbnb", "Uber", "Tesla"
  ];

  const practiceOptions = [
    { id: "behavioral", label: "Behavioral", icon: MessageSquare, description: "STAR method questions" },
    { id: "technical", label: "Technical", icon: Code, description: "Coding challenges" },
    { id: "system", label: "System Design", icon: Network, description: "Architecture discussions" }
  ];

  const handlePracticeTypeToggle = (type: string) => {
    setPracticeTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getEstimatedDuration = () => {
    const base = 5;
    const perType = practiceTypes.length * 8;
    return base + perType;
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Setup Your Interview</h1>
            <p className="text-muted-foreground">Customize your practice session</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Setup Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Role Selection */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Target Role
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="role">Search or select a role</Label>
                  <Input
                    id="role"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="glass-card border-0 mt-1"
                  />
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Popular roles:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularRoles.map((role) => (
                      <Badge
                        key={role}
                        variant={selectedRole === role ? "default" : "outline"}
                        className={`cursor-pointer hover:bg-primary/20 ${
                          selectedRole === role ? "bg-primary" : "border-muted"
                        }`}
                        onClick={() => setSelectedRole(role)}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Selection */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Target Company
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="company">Search or select a company</Label>
                  <Input
                    id="company"
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    placeholder="e.g. Google, Meta, Amazon..."
                    className="glass-card border-0 mt-1"
                  />
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Popular companies:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularCompanies.map((company) => (
                      <Badge
                        key={company}
                        variant={selectedCompany === company ? "default" : "outline"}
                        className={`cursor-pointer hover:bg-primary/20 ${
                          selectedCompany === company ? "bg-primary" : "border-muted"
                        }`}
                        onClick={() => setSelectedCompany(company)}
                      >
                        {company}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Practice Types */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle>Practice Focus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {practiceOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = practiceTypes.includes(option.id);
                    
                    return (
                      <div
                        key={option.id}
                        onClick={() => handlePracticeTypeToggle(option.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          isSelected 
                            ? "border-primary bg-primary/10" 
                            : "border-muted hover:border-primary/50 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? "bg-primary" : "bg-muted"
                          }`}>
                            <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <h4 className="font-medium">{option.label}</h4>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Session Preview */}
          <div className="space-y-6">
            <Card className="glass-card border-0 sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Session Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Estimated Duration</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">~{getEstimatedDuration()} minutes</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ROLE</p>
                    <p className="font-medium">{selectedRole || "Not selected"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">COMPANY</p>
                    <p className="font-medium">{selectedCompany || "Not selected"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">PRACTICE TYPES</p>
                    {practiceTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {practiceTypes.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {practiceOptions.find(opt => opt.id === type)?.label}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="font-medium">None selected</p>
                    )}
                  </div>
                </div>

                <Separator />

                <Button 
                  onClick={() => navigate("/live-interview")}
                  disabled={!selectedRole || !selectedCompany || practiceTypes.length === 0}
                  className="w-full bg-gradient-primary hover:opacity-90 border-0"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Interview
                </Button>

                {(!selectedRole || !selectedCompany || practiceTypes.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please complete all fields to start
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;
