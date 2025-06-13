
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mic, Github, Mail, Sparkles, Zap, Target } from "lucide-react";
import FloatingElement from "@/components/FloatingElement";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      navigate("/dashboard");
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Elements */}
      <FloatingElement className="top-20 left-20" delay={0}>
        <div className="w-16 h-16 rounded-full bg-gradient-primary opacity-60" />
      </FloatingElement>
      <FloatingElement className="top-40 right-32" delay={1}>
        <div className="w-12 h-12 rounded-lg bg-gradient-secondary opacity-50" />
      </FloatingElement>
      <FloatingElement className="bottom-32 left-16" delay={2}>
        <div className="w-20 h-20 rounded-full bg-gradient-accent opacity-40" />
      </FloatingElement>

      <div className="container mx-auto px-4 py-8 flex min-h-screen">
        {/* Left Side - Hero Content */}
        <div className="flex-1 flex flex-col justify-center pr-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold">AI Interview Coach</span>
            </div>
            
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Ace Software
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Interviews
              </span>
              <br />
              with Voice AI
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Practice real-world interviews entirely by voice. Get instant feedback,
              track progress, and land your dream job with our AI-powered coach.
            </p>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span>Real-time feedback</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Voice-first experience</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="glass-card rounded-2xl p-8 relative">
              {/* Progress indicator */}
              <div className="flex justify-center mb-6">
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i <= step ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Get Started</h2>
                    <p className="text-muted-foreground">Create your account to begin</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="glass-card border-0 mt-1"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="glass-card border-0 mt-1"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <Button onClick={handleNext} className="w-full bg-gradient-primary border-0 hover:opacity-90">
                    Continue
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-muted" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full glass-card border-muted hover:bg-muted/20">
                    <Github className="w-4 h-4 mr-2" />
                    Continue with GitHub
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
                    <p className="text-muted-foreground">Help us personalize your experience</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>What's your role focus?</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="glass-card border-0 mt-1">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frontend">Frontend Engineer</SelectItem>
                          <SelectItem value="backend">Backend Engineer</SelectItem>
                          <SelectItem value="fullstack">Full-Stack Engineer</SelectItem>
                          <SelectItem value="mobile">Mobile Developer</SelectItem>
                          <SelectItem value="devops">DevOps Engineer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Experience Level</Label>
                      <RadioGroup value={experience} onValueChange={setExperience} className="mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="student" id="student" />
                          <Label htmlFor="student">Student / New Grad</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="junior" id="junior" />
                          <Label htmlFor="junior">0-2 years</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mid" id="mid" />
                          <Label htmlFor="mid">2-5 years</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="senior" id="senior" />
                          <Label htmlFor="senior">5+ years</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleSkip} className="flex-1">
                      Skip for now
                    </Button>
                    <Button onClick={handleNext} className="flex-1 bg-gradient-primary">
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Enable Microphone</h2>
                    <p className="text-muted-foreground">
                      We need microphone access for voice interviews
                    </p>
                  </div>

                  <div className="glass-card rounded-lg p-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Mic className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Your privacy matters</h4>
                        <p className="text-sm text-muted-foreground">
                          Audio is processed securely and never stored permanently
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleNext} className="w-full bg-gradient-primary">
                    Allow Microphone Access
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
