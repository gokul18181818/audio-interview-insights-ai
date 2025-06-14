import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Github, Mail, Sparkles, Zap, Target, AlertCircle, Eye, EyeOff, Bot, Brain, MessageSquare, Palette } from "lucide-react";
import { InteractiveRobotSpline } from "@/components/blocks/interactive-3d-robot";
import { useAudio } from "@/hooks/useAudio";
import { authAPI } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type AuthMode = 'signin' | 'signup' | 'profile' | 'permissions';
type Theme = 'dark' | 'purple';

const Auth = () => {
  // Auth state
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>('dark');
  
  const navigate = useNavigate();
  const audio = useAudio();

  // 3D Robot Scene URL
  const ROBOT_SCENE_URL = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";

  // Theme configurations
  const themes = {
    dark: {
      background: "bg-gradient-to-br from-gray-900 via-black to-gray-900",
      overlay: "bg-gradient-to-br from-gray-900/40 via-black/60 to-gray-900/40",
      card: "bg-black/40 backdrop-blur-xl border-gray-800/50",
      text: {
        primary: "text-white",
        secondary: "text-gray-300",
        muted: "text-gray-400"
      },
      accent: "from-blue-500 to-cyan-500",
      features: [
        { icon: Brain, color: "text-blue-400", bg: "bg-blue-500/10" },
        { icon: MessageSquare, color: "text-cyan-400", bg: "bg-cyan-500/10" },
        { icon: Target, color: "text-green-400", bg: "bg-green-500/10" }
      ]
    },
    purple: {
      background: "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
      overlay: "bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20",
      card: "bg-white/5 backdrop-blur-xl border-white/10",
      text: {
        primary: "text-white",
        secondary: "text-gray-300",
        muted: "text-gray-400"
      },
      accent: "from-blue-500 to-purple-600",
      features: [
        { icon: Brain, color: "text-blue-400", bg: "bg-blue-500/10" },
        { icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-500/10" },
        { icon: Target, color: "text-green-400", bg: "bg-green-500/10" }
      ]
    }
  };

  const currentTheme = themes[theme];

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
      const data = await authAPI.signUp(email, password, {
        full_name: email.split('@')[0],
      });

      console.log("✅ User signed up successfully:", data.user?.email);
      setMode('profile');
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

  const getFormTitle = () => {
    switch (mode) {
      case 'signin':
        return { title: "Welcome Back", subtitle: "Sign in to continue" };
      case 'signup':
        return { title: "Get Started", subtitle: "Create your account" };
      case 'profile':
        return { title: "Almost Done", subtitle: "Complete your profile" };
      case 'permissions':
        return { title: "Final Step", subtitle: "Enable voice features" };
    }
  };

  const formInfo = getFormTitle();

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${currentTheme.background}`}>
      {/* Animated Background Overlay */}
      <div className={`absolute inset-0 ${currentTheme.overlay} animate-pulse`} />
      
      {/* Theme Toggle */}
      <div className="absolute top-8 right-8 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'purple' : 'dark')}
          className={`${currentTheme.card} ${currentTheme.text.secondary} border-gray-700/50 hover:${currentTheme.text.primary} transition-all duration-300`}
        >
          <Palette className="w-4 h-4 mr-2" />
          {theme === 'dark' ? 'Purple' : 'Dark'}
        </Button>
      </div>
      
      {/* 3D Robot Background */}
      <div className="absolute inset-0 z-0">
        <InteractiveRobotSpline
          scene={ROBOT_SCENE_URL}
          className="w-full h-full opacity-70" 
        />
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 z-10">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-16 p-8 lg:p-16">
          
        {/* Left Side - Hero Content */}
          <div className="flex flex-col justify-center items-start space-y-16 max-w-2xl">
            {/* Brand Header - Simplified */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className={`w-20 h-20 rounded-3xl bg-gradient-to-r ${currentTheme.accent} flex items-center justify-center shadow-2xl`}>
                  <Bot className="w-11 h-11 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className={`text-3xl font-bold ${currentTheme.text.primary}`}>AI Interview Coach</h3>
                <p className="text-blue-300 text-lg font-medium">Advanced AI Technology</p>
              </div>
            </div>
            
            {/* Main Headline - Cleaner */}
            <div className="space-y-12">
              <h1 className="text-7xl lg:text-8xl xl:text-9xl font-bold leading-tight">
                <span className={currentTheme.text.primary}>Master Your</span>
              <br />
                <span className={`bg-gradient-to-r ${currentTheme.accent} bg-clip-text text-transparent`}>
                  Interview
              </span>
            </h1>
            
              <p className={`text-2xl ${currentTheme.text.secondary} leading-relaxed max-w-xl font-light`}>
                Practice with AI. Get instant feedback. 
                <br />
                Land your dream job.
              </p>
            </div>

            {/* Feature Pills - Simplified */}
            <div className="flex flex-wrap gap-6">
              {[
                { icon: Brain, color: "text-blue-400", label: "AI Feedback" },
                { icon: MessageSquare, color: "text-cyan-400", label: "Voice Practice" },
                { icon: Target, color: "text-green-400", label: "Real-time Analysis" }
              ].map((feature, index) => (
                <div key={index} className={`flex items-center gap-4 bg-white/5 backdrop-blur-sm rounded-2xl px-8 py-5 border border-white/10 shadow-lg`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  <span className={`${currentTheme.text.primary} font-semibold text-lg`}>
                    {feature.label}
                  </span>
                </div>
              ))}
              </div>

            {/* Stats - Cleaner Layout */}
            <div className="flex gap-16 pt-8">
              {[
                { number: "10K+", label: "Interviews" },
                { number: "95%", label: "Success Rate" },
                { number: "24/7", label: "Available" }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className={`text-5xl font-bold ${currentTheme.text.primary} mb-3`}>{stat.number}</div>
                  <div className={`text-base ${currentTheme.text.muted} font-medium uppercase tracking-wider`}>{stat.label}</div>
              </div>
              ))}
          </div>
        </div>

        {/* Right Side - Auth Form */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-lg">
              <div className={`${currentTheme.card} rounded-3xl p-12 shadow-2xl`}>
                {/* Form Header - Simplified */}
                <div className="text-center mb-12">
                  <h2 className={`text-4xl font-bold ${currentTheme.text.primary} mb-4`}>{formInfo.title}</h2>
                  <p className={`${currentTheme.text.secondary} text-xl`}>{formInfo.subtitle}</p>
              </div>

              {error && (
                  <Alert className="mb-10 bg-red-500/20 border-red-500/50 text-red-200 rounded-2xl p-6">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription className="text-base ml-2">{error}</AlertDescription>
                </Alert>
              )}

              {/* Sign In Form */}
              {mode === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-10">
                    <div className="space-y-8">
                    <div>
                        <Label htmlFor="email" className={`${currentTheme.text.primary} font-semibold text-xl mb-4 block`}>Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                          className="bg-white/5 border-gray-700/50 text-white placeholder:text-gray-500 h-16 rounded-2xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter your email"
                          required
                      />
                    </div>
                    <div>
                        <Label htmlFor="password" className={`${currentTheme.text.primary} font-semibold text-xl mb-4 block`}>Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/5 border-gray-700/50 text-white placeholder:text-gray-500 h-16 rounded-2xl text-lg pr-16 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Enter your password"
                            required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 p-0 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                      className={`w-full h-16 bg-gradient-to-r ${currentTheme.accent} hover:shadow-2xl text-white font-bold rounded-2xl text-xl transition-all duration-300 transform hover:scale-[1.02]`}
                    disabled={isLoading}
                  >
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </div>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                    
                    <div className="text-center pt-6">
                      <Button
                        type="button"
                        variant="link"
                        className={`${currentTheme.text.secondary} hover:${currentTheme.text.primary} transition-colors text-lg`}
                        onClick={() => setMode('signup')}
                      >
                        New here? <span className="text-blue-400 ml-2 font-semibold">Create account</span>
                  </Button>
                    </div>
                </form>
              )}

              {/* Sign Up Form */}
              {mode === 'signup' && (
                  <form onSubmit={handleSignUp} className="space-y-10">
                    <div className="space-y-8">
                    <div>
                        <Label htmlFor="email" className={`${currentTheme.text.primary} font-semibold text-xl mb-4 block`}>Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                          className="bg-white/5 border-gray-700/50 text-white placeholder:text-gray-500 h-16 rounded-2xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter your email"
                          required
                      />
                    </div>
                    <div>
                        <Label htmlFor="password" className={`${currentTheme.text.primary} font-semibold text-xl mb-4 block`}>Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/5 border-gray-700/50 text-white placeholder:text-gray-500 h-16 rounded-2xl text-lg pr-16 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Create a password"
                            required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 p-0 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                      className={`w-full h-16 bg-gradient-to-r ${currentTheme.accent} hover:shadow-2xl text-white font-bold rounded-2xl text-xl transition-all duration-300 transform hover:scale-[1.02]`}
                    disabled={isLoading}
                  >
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating account...
                        </div>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                    
                    <div className="text-center pt-6">
                      <Button
                        type="button"
                        variant="link"
                        className={`${currentTheme.text.secondary} hover:${currentTheme.text.primary} transition-colors text-lg`}
                        onClick={() => setMode('signin')}
                      >
                        Have an account? <span className="text-blue-400 ml-2 font-semibold">Sign in</span>
                  </Button>
                    </div>
                </form>
              )}

              {/* Profile Setup */}
              {mode === 'profile' && (
                  <div className="space-y-10">
                    <div className="space-y-8">
                    <div>
                        <Label className={`${currentTheme.text.primary} font-semibold text-xl mb-4 block`}>Your Role</Label>
                      <Select value={role} onValueChange={setRole}>
                          <SelectTrigger className="bg-white/5 border-gray-700/50 text-white h-16 rounded-2xl text-lg">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700 rounded-2xl">
                            <SelectItem value="software-engineer">Software Engineer</SelectItem>
                            <SelectItem value="frontend-developer">Frontend Developer</SelectItem>
                            <SelectItem value="backend-developer">Backend Developer</SelectItem>
                            <SelectItem value="fullstack-developer">Fullstack Developer</SelectItem>
                            <SelectItem value="data-scientist">Data Scientist</SelectItem>
                            <SelectItem value="product-manager">Product Manager</SelectItem>
                            <SelectItem value="designer">Designer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                        <Label className={`${currentTheme.text.primary} font-semibold text-xl mb-6 block`}>Experience</Label>
                        <RadioGroup value={experience} onValueChange={setExperience} className="space-y-5">
                          {[
                            { value: "entry", label: "Entry Level (0-2 years)" },
                            { value: "mid", label: "Mid Level (3-5 years)" },
                            { value: "senior", label: "Senior Level (6+ years)" }
                          ].map((option) => (
                            <div key={option.value} className="flex items-center space-x-5 p-5 rounded-2xl bg-white/5 border border-gray-700/50 hover:bg-white/10 transition-all duration-200">
                              <RadioGroupItem value={option.value} id={option.value} className="border-gray-600" />
                              <Label htmlFor={option.value} className={`${currentTheme.text.primary} cursor-pointer flex-1 text-lg`}>{option.label}</Label>
                        </div>
                          ))}
                      </RadioGroup>
                    </div>
                  </div>

                  <Button 
                    onClick={handleProfileComplete}
                      className={`w-full h-16 bg-gradient-to-r ${currentTheme.accent} hover:shadow-2xl text-white font-bold rounded-2xl text-xl transition-all duration-300 transform hover:scale-[1.02]`}
                    disabled={isLoading}
                  >
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        "Continue"
                      )}
                  </Button>
                </div>
              )}

                {/* Permissions */}
              {mode === 'permissions' && (
                  <div className="space-y-10 text-center">
                    <div className={`w-28 h-28 mx-auto bg-gradient-to-r ${currentTheme.accent} rounded-3xl flex items-center justify-center shadow-2xl`}>
                      <Mic className="w-14 h-14 text-white" />
                  </div>
                  <div>
                      <h3 className={`text-2xl font-bold ${currentTheme.text.primary} mb-6`}>Enable Voice</h3>
                      <p className={`${currentTheme.text.secondary} leading-relaxed text-xl max-w-md mx-auto`}>
                        We need microphone access for voice interviews and feedback.
                    </p>
                  </div>
                    <Button 
                      onClick={handlePermissions}
                      className={`w-full h-16 bg-gradient-to-r ${currentTheme.accent} hover:shadow-2xl text-white font-bold rounded-2xl text-xl transition-all duration-300 transform hover:scale-[1.02]`}
                    >
                      <Mic className="w-6 h-6 mr-3" />
                      Enable Microphone
                    </Button>
                </div>
              )}
                  </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-10 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-500" />
    </div>
  );
};

export default Auth; 