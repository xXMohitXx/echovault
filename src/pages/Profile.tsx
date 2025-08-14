import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Upload, User, Mail, Calendar } from "lucide-react";

export default function Profile() {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          avatar_url: avatarUrl,
        });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('recordings') // Using existing bucket
        .upload(`avatars/${fileName}`, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(`avatars/${fileName}`);

      setAvatarUrl(publicUrl);
      
      toast({
        title: "Avatar Uploaded",
        description: "Your avatar has been uploaded successfully.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to EchoVault
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Profile Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account information</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Account Information
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl} alt="Profile" />
                  <AvatarFallback className="text-lg">
                    {fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 
                     user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute -bottom-2 -right-2 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </div>
              <div>
                <h3 className="font-semibold">Profile Photo</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a photo to personalize your profile
                </p>
                {uploadingAvatar && (
                  <p className="text-sm text-primary">Uploading...</p>
                )}
              </div>
            </div>

            {/* Profile Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-muted/30 border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={user.email || ""}
                    disabled
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed from this interface
                </p>
              </div>

              <div className="space-y-2">
                <Label>Account Created</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={new Date(user.created_at || "").toLocaleDateString()}
                    disabled
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-border/50">
              <Button 
                onClick={updateProfile}
                disabled={isLoading}
                className="bg-gradient-primary"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}