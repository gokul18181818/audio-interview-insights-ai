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

type AuthMode = 'signin' | 'signup' | 'profile' | 'permissions';

const Auth = () => {
  // Auth state
  const [mode, setMode] = useState<AuthMode>('signin'); // Default to sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const audio = useAudio();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await authAPI.signIn(email, password);
      console.log("✅ User signed in successfully");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("❌ Sign in error:", error);
      setError(error.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setMode('profile'); // Move to profile step
    } catch (error: any) {
      console.error("❌ Sign up error:", error);
      setError(error.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileComplete = async () => {
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
      
      setMode('permissions');
    } catch (error: any) {
      console.error("❌ Profile update error:", error);
      setError(error.message || "Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissions = async () => {
    const hasPermission = await audio.requestPermission();
    if (hasPermission) {
      navigate("/dashboard");
    } else {
      setError("Microphone access is required for voice interviews. Please enable it in your browser settings.");
    }
  };

  const handleGithubAuth = async () => {
    try {
      // Implement GitHub OAuth later
      setError("GitHub sign-in coming soon!");
    } catch (error: any) {
      setError(error.message || "GitHub authentication failed");
    }
  };

  const getFormTitle = () => {
    switch (mode) {
      case 'signin':
        return { title: "Welcome Back", subtitle: "Sign in to your account" };
      case 'signup':
        return { title: "Get Started", subtitle: "Create your account to begin" };
      case 'profile':
        return { title: "Complete Profile", subtitle: "Tell us about yourself" };
      case 'permissions':
        return { title: "Enable Microphone", subtitle: "Required for voice interviews" };
    }
  };

  const formInfo = getFormTitle();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-900">
      {/* Background Elements */}
      <FloatingElement className="top-20 left-20" delay={0}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-60" />
      </FloatingElement>
      <FloatingElement className="top-40 right-32" delay={1}>
        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 opacity-50" />
      </FloatingElement>
      <FloatingElement className="bottom-32 left-16" delay={2}>
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-400 to-blue-500 opacity-40" />
      </FloatingElement>

      <div className="container mx-auto px-4 py-8 flex min-h-screen">
        {/* Left Side - Hero Content */}
        <div className="flex-1 flex flex-col justify-center pr-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">AI Interview Coach</span>
            </div>
            
            <h1 className="text-5xl font-bold mb-6 leading-tight text-white">
              {mode === 'signin' ? 'Welcome Back!' : 'Ace Software'}
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {mode === 'signin' ? 'Continue' : 'Interviews'}
              </span>
              <br />
              {mode === 'signin' ? 'Your Journey' : 'with Voice AI'}
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              {mode === 'signin' 
                ? "Sign in to access your practice sessions, track progress, and continue improving your interview skills with our AI coach."
                : "Practice real-world interviews entirely by voice. Get instant feedback, track progress, and land your dream job with our AI-powered coach."
              }
            </p>

            <div className="flex items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span>{mode === 'signin' ? 'Your progress saved' : 'Real-time feedback'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span>{mode === 'signin' ? 'Pick up where you left off' : 'Voice-first experience'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 relative">
              {/* Progress indicator for signup flow */}
              {(mode === 'signup' || mode === 'profile' || mode === 'permissions') && (
                <div className="flex justify-center mb-6">
                  <div className="flex gap-2">
                    {['signup', 'profile', 'permissions'].map((step, i) => (
                      <div
                        key={step}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          ['signup', 'profile', 'permissions'].indexOf(mode) >= i ? "bg-blue-500" : "bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2 text-white">{formInfo.title}</h2>
                <p className="text-gray-400">{formInfo.subtitle}</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-300">{error}</AlertDescription>
                </Alert>
              )}

              {/* Sign In Form */}
              {mode === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 mt-1"
                        placeholder="your@email.com"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-gray-300">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 mt-1 pr-10"
                          placeholder="••••••••"
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-1 h-9 w-9 px-0 text-gray-400 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              )}

              {/* Sign Up Form */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 mt-1"
                        placeholder="your@email.com"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-gray-300">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 mt-1 pr-10"
                          placeholder="••••••••"
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-1 h-9 w-9 px-0 text-gray-400 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              )}

              {/* Profile Setup */}
              {mode === 'profile' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">What's your role?</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white mt-1">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="new-grad">New Graduate</SelectItem>
                          <SelectItem value="junior">Junior Developer</SelectItem>
                          <SelectItem value="mid">Mid-level Developer</SelectItem>
                          <SelectItem value="senior">Senior Developer</SelectItem>
                          <SelectItem value="lead">Tech Lead</SelectItem>
                          <SelectItem value="manager">Engineering Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Experience Level</Label>
                      <RadioGroup value={experience} onValueChange={setExperience} className="mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="beginner" id="beginner" className="border-gray-600" />
                          <Label htmlFor="beginner" className="text-gray-300">Beginner (0-2 years)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="intermediate" id="intermediate" className="border-gray-600" />
                          <Label htmlFor="intermediate" className="text-gray-300">Intermediate (2-5 years)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="advanced" id="advanced" className="border-gray-600" />
                          <Label htmlFor="advanced" className="text-gray-300">Advanced (5+ years)</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <Button 
                    onClick={handleProfileComplete}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Continue"}
                  </Button>
                </div>
              )}

              {/* Permissions Step */}
              {mode === 'permissions' && (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  
                  <div>
                    <p className="text-gray-300 mb-4">
                      We need access to your microphone to provide voice-based interviews and real-time feedback.
                    </p>
                    <p className="text-sm text-gray-400">
                      Your voice data is processed securely and never stored permanently.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      onClick={handlePermissions}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                    >
                      Enable Microphone
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate("/dashboard")}
                      className="w-full text-gray-400 hover:text-white"
                    >
                      Skip for now
                    </Button>
                  </div>
                </div>
              )}

              {/* OAuth and Toggle */}
              {(mode === 'signin' || mode === 'signup') && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-gray-800 px-2 text-gray-400">Or</span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white"
                    onClick={handleGithubAuth}
                    disabled={isLoading}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    Continue with GitHub
                  </Button>

                  {/* Toggle between sign in and sign up */}
                  <div className="text-center mt-6">
                    <p className="text-sm text-gray-400">
                      {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}{" "}
                      <button 
                        type="button"
                        onClick={() => {
                          setMode(mode === 'signin' ? 'signup' : 'signin');
                          setError('');
                        }}
                        className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                      >
                        {mode === 'signin' ? 'Sign up' : 'Sign in'}
                      </button>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth; 