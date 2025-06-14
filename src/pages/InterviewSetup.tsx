
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight,
  Building2, 
  Code, 
  MessageSquare, 
  Briefcase,
  Play,
  ChevronRight,
  Network
} from "lucide-react";
import Navigation from "@/components/Navigation";

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const popularRoles = [
    "Frontend Engineer", "Backend Engineer", "Full-Stack Developer",
    "Mobile Developer", "DevOps Engineer", "Data Engineer"
  ];

  const popularCompanies = [
    "Google", "Meta", "Amazon", "Apple", "Microsoft", "Netflix"
  ];

  const interviewTypes = [
    { id: "behavioral", label: "Behavioral", icon: MessageSquare, description: "STAR method questions about your experience" },
    { id: "coding", label: "Coding", icon: Code, description: "Technical coding challenges and problems" },
    { id: "system_design", label: "System Design", icon: Network, description: "Architecture design with AI feedback and whiteboarding" }
  ];

  const canProceed = () => {
    if (currentStep === 1) return selectedRole.trim() !== "";
    if (currentStep === 2) return selectedCompany.trim() !== "";
    if (currentStep === 3) return selectedType !== "";
    return false;
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Route to appropriate interview type
      if (selectedType === "coding") {
        navigate("/live-coding");
      } else if (selectedType === "system_design") {
        navigate("/live-system-design");
      } else {
        navigate("/live-interview");
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate("/dashboard");
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="glass-card border-0 max-w-2xl mx-auto">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">What role are you practicing for?</CardTitle>
              <p className="text-muted-foreground">Tell us the position you want to interview for</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Input
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="glass-card border-0 text-lg h-12"
                  autoFocus
                />
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-3">Or choose from popular roles:</p>
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
        );

      case 2:
        return (
          <Card className="glass-card border-0 max-w-2xl mx-auto">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-secondary flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Which company interests you?</CardTitle>
              <p className="text-muted-foreground">We'll tailor questions to match their style</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Input
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  placeholder="e.g. Google, Meta, Amazon..."
                  className="glass-card border-0 text-lg h-12"
                  autoFocus
                />
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-3">Or choose from popular companies:</p>
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
        );

      case 3:
        return (
          <Card className="glass-card border-0 max-w-2xl mx-auto">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">What type of interview?</CardTitle>
              <p className="text-muted-foreground">Choose your focus area for this session</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {interviewTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  
                  return (
                    <div
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-6 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-muted hover:border-primary/50 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-primary" : "bg-muted"
                        }`}>
                          <Icon className={`w-6 h-6 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{type.label}</h4>
                          <p className="text-muted-foreground">{type.description}</p>
                        </div>
                        {isSelected && <ChevronRight className="w-5 h-5 text-primary" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header with progress */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-colors ${
                  step <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of 3
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="max-w-2xl mx-auto">
          <Button 
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full bg-gradient-primary hover:opacity-90 border-0 h-12 text-lg"
          >
            {currentStep === 3 ? (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Interview
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;
