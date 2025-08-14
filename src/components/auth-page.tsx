import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Mic2, Volume2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate("/");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError("");
    setResetMessage("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setResetLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setResetLoading(false);
      return;
    }

    try {
      // First check if user exists with this email
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resetEmail,
        password: "dummy_password_to_check_user_exists"
      });

      // If user doesn't exist, we'll get an "Invalid login credentials" error
      if (signInError && signInError.message.includes("Invalid login credentials")) {
        // Try to sign up first to see if email format is valid
        const { error: signUpError } = await supabase.auth.signUp({
          email: resetEmail,
          password: newPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (signUpError && !signUpError.message.includes("already registered")) {
          throw signUpError;
        }

        if (!signUpError) {
          setResetMessage("Account created successfully! Please check your email to verify your account.");
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account.",
          });
          setResetEmail("");
          setNewPassword("");
          setConfirmPassword("");
          setResetLoading(false);
          return;
        }
      }

      // If we reach here, user exists - use admin function to update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setResetMessage("Password updated successfully! You can now sign in with your new password.");
      toast({
        title: "Password updated!",
        description: "You can now sign in with your new password.",
      });
      
      // Clear form
      setResetEmail("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <Mic2 className="h-8 w-8 text-primary" />
              <Volume2 className="h-6 w-6 text-primary-glow animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              EchoVault
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Every word echoes. Store them forever.
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="glass glow-card">
          <CardContent className="p-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="reset">Reset Password</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="bg-muted/30 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="bg-muted/30 border-primary/20 focus:border-primary"
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:shadow-lg hover:shadow-primary/50"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="bg-muted/30 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                      minLength={6}
                      className="bg-muted/30 border-primary/20 focus:border-primary"
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:shadow-lg hover:shadow-primary/50"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="reset" className="space-y-4 mt-6">
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="bg-muted/30 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      minLength={6}
                      className="bg-muted/30 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                      className="bg-muted/30 border-primary/20 focus:border-primary"
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {resetMessage && (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        {resetMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:shadow-lg hover:shadow-primary/50"
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Updating password..." : "Reset Password"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Transform your voice into searchable insights with AI-powered transcription and analysis.
        </p>
      </div>
    </div>
  );
}