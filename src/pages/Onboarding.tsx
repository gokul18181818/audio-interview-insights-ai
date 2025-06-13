
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Github, Mail, Sparkles, Zap, Target, AlertCircle, Eye, EyeOff } from "lucide-react";
import FloatingElement from "@/components/FloatingElement";
import { useAudio } from "@/hooks/useAudio";
import { authAPI } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const audio = useAudio();

  const handleNext = async () => {
    if (step === 1) {
      // Step 1: Handle signup
      if (!email || !password) {
        setError("Please fill in all fields");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Create account with Supabase
        const data = await authAPI.signUp(email, password, {
          full_name: email.split('@')[0], // Default name from email
        });

        console.log("✅ User signed up successfully:", data.user?.email);
        setStep(step + 1);
      } catch (error: any) {
        console.error("❌ Sign up error:", error);
        setError(error.message || "Failed to create account. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else if (step === 2) {
      // Step 2: Save profile information
      if (!role || !experience) {
        setError("Please complete your profile");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Update user metadata or profile table
          const { error: updateError } = await supabase.auth.updateUser({
            data: { 
              role, 
              experience_level: experience,
              onboarding_completed: true
            }
          });

          if (updateError) throw updateError;
        }
        
        setStep(step + 1);
      } catch (error: any) {
        console.error("❌ Profile update error:", error);
        setError(error.message || "Failed to save profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else if (step === 3) {
      // Step 3: Request microphone permission before proceeding
      const hasPermission = await audio.requestPermission();
      if (hasPermission) {
        navigate("/dashboard");
      } else {
        setError("Microphone access is required for voice interviews. Please enable it in your browser settings.");
      }
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

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

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
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="glass-card border-0 mt-1 pr-10"
                          placeholder="••••••••"
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-1 h-9 w-9 px-0"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleNext} 
                    className="w-full bg-gradient-primary border-0 hover:opacity-90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Continue"}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-muted" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full glass-card border-muted hover:bg-muted/20"
                    disabled={isLoading}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    Continue with GitHub
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Link 
                        to="/sign-in" 
                        className="text-primary hover:underline font-medium"
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
                    <p className="text-muted-foreground">Help us personalize your experience</p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

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
                    <Button 
                      variant="outline" 
                      onClick={handleSkip} 
                      className="flex-1"
                      disabled={isLoading}
                    >
                      Skip for now
                    </Button>
                    <Button 
                      onClick={handleNext} 
                      className="flex-1 bg-gradient-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? "Saving..." : "Continue"}
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

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

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

                  <Button 
                    onClick={handleNext} 
                    className="w-full bg-gradient-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? "Setting up..." : "Allow Microphone Access"}
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
