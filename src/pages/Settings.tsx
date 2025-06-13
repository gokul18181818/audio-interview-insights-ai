
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User,
  CreditCard,
  Bell,
  Volume2,
  HelpCircle,
  Shield,
  Trash2,
  Check,
  Crown
} from "lucide-react";
import Navigation from "@/components/Navigation";

const Settings = () => {
  const [name, setName] = useState("Alex Johnson");
  const [email, setEmail] = useState("alex@example.com");
  const [role, setRole] = useState("Backend Engineer");
  const [experience, setExperience] = useState("2-5 years");
  const [voicePersona, setVoicePersona] = useState("professional");
  const [practiceReminders, setPracticeReminders] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Settings */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="glass-card border-0 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-card border-0 mt-1"
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Role Focus</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="glass-card border-0 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Frontend Engineer">Frontend Engineer</SelectItem>
                        <SelectItem value="Backend Engineer">Backend Engineer</SelectItem>
                        <SelectItem value="Full-Stack Developer">Full-Stack Developer</SelectItem>
                        <SelectItem value="Mobile Developer">Mobile Developer</SelectItem>
                        <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Experience Level</Label>
                    <Select value={experience} onValueChange={setExperience}>
                      <SelectTrigger className="glass-card border-0 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Student / New Grad">Student / New Grad</SelectItem>
                        <SelectItem value="0-2 years">0-2 years</SelectItem>
                        <SelectItem value="2-5 years">2-5 years</SelectItem>
                        <SelectItem value="5+ years">5+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button className="bg-gradient-primary">
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Interview Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>AI Voice Persona</Label>
                  <Select value={voicePersona} onValueChange={setVoicePersona}>
                    <SelectTrigger className="glass-card border-0 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional (Default)</SelectItem>
                      <SelectItem value="friendly">Friendly & Casual</SelectItem>
                      <SelectItem value="formal">Formal & Direct</SelectItem>
                      <SelectItem value="encouraging">Encouraging & Supportive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose the interviewer personality that matches your preference
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Practice Reminders</h4>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to practice regularly
                    </p>
                  </div>
                  <Switch 
                    checked={practiceReminders}
                    onCheckedChange={setPracticeReminders}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive updates and tips via email
                    </p>
                  </div>
                  <Switch 
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Support & Legal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Button variant="outline" className="justify-start glass-card border-muted hover:border-primary">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help Center
                  </Button>
                  <Button variant="outline" className="justify-start glass-card border-muted hover:border-primary">
                    <Shield className="w-4 h-4 mr-2" />
                    Privacy Policy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="glass-card border-0 border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-400">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Subscription */}
          <div className="space-y-6">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 glass-card rounded-lg bg-gradient-primary/10">
                  <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <h3 className="font-semibold">Pro Plan</h3>
                  <p className="text-2xl font-bold mt-1">$19<span className="text-sm font-normal">/month</span></p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Unlimited interviews</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Advanced analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Multiple AI voices</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Priority support</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next billing:</span>
                    <span>Jan 15, 2024</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment method:</span>
                    <span>•••• 4242</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button variant="outline" className="w-full glass-card border-muted">
                    Update Payment
                  </Button>
                  <Button variant="ghost" className="w-full text-red-400 hover:text-red-300">
                    Cancel Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
