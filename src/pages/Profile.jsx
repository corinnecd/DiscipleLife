
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { getInitials } from '@/lib/utils';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Loader2, Camera, Save, User } from 'lucide-react';
import { compressImage } from '@/lib/ImageCompression';
import { Progress } from '@/components/ui/progress';

const Profile = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nomFamille, setNomFamille] = useState(null);
  
  // Avatar Upload
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profils')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);

      // Si le profil est un superviseur, récupérer le nom de la famille
      if (data.role === 'superviseur') {
        const { data: familleData, error: familleError } = await supabase
          .from('familles_disciples')
          .select('nom')
          .eq('superviseur_id', user.id)
          .maybeSingle();
        
        if (!familleError && familleData) {
          setNomFamille(familleData.nom);
        }
      }
    } catch (error) {
      handleError(error, { context: 'fetchProfile' }, "Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Handle Avatar Upload with Compression
      let avatarUrl = profile.avatar_url;
      
      if (avatarFile) {
         setUploadProgress(10);
         const compressedAvatar = await compressImage(avatarFile, {
            maxWidth: 300,
            maxHeight: 300,
            quality: 0.85,
            onProgress: (p) => setUploadProgress(p)
         });

         const fileName = `avatars/${user.id}_${Date.now()}.jpg`;
         const { error: uploadError } = await supabase.storage.from('resources').upload(fileName, compressedAvatar);
         if (uploadError) throw uploadError;

         const { data: publicData } = supabase.storage.from('resources').getPublicUrl(fileName);
         avatarUrl = publicData.publicUrl;
      }

      // 2. Update Profile
      const { error } = await supabase
        .from('profils')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      await refreshProfile(); // Refresh context
      toast({ title: "Profil mis à jour", description: "Vos modifications ont été enregistrées." });
      setAvatarFile(null);
      setUploadProgress(0);

    } catch (error) {
      handleError(error, { context: 'handleUpdate' }, "Échec de la mise à jour du profil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8 bg-gray-50 min-h-screen"><Loader2 className="animate-spin text-gray-600" /></div>;

  return (
    <div className="w-full max-w-[1800px] mx-auto space-y-6 bg-gray-50 min-h-screen">
       <h1 className="text-3xl font-bold text-gray-900 mb-6">Mon Profil</h1>
       
       <Card className="bg-gray-100 border-gray-200">
          <CardHeader>
             <CardTitle className="text-gray-900 text-lg">Informations Personnelles</CardTitle>
          </CardHeader>
          <CardContent>
             <form onSubmit={handleUpdate} className="space-y-6">
                
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4 py-4">
                   <div className="relative group">
                      <Avatar className="h-24 w-24 border-2 border-gray-300">
                         <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : profile.avatar_url} objectFit="cover" />
                         <AvatarFallback className="bg-purple-600 text-2xl text-white">
                            {getInitials(profile.first_name || user.email)}
                         </AvatarFallback>
                      </Avatar>
                      <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                         <Camera className="text-white h-8 w-8" />
                         <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => setAvatarFile(e.target.files[0])}
                         />
                      </label>
                   </div>
                   <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">{user.email}</p>
                      <p className="text-xs text-gray-600 capitalize">
                        {profile.role === 'superviseur' && nomFamille 
                          ? <>Superviseur de la Famille <span className="font-bold">« {nomFamille} »</span></>
                          : (profile.role || 'Disciple')}
                      </p>
                   </div>
                   
                   {uploadProgress > 0 && uploadProgress < 100 && (
                       <div className="w-full max-w-[200px] space-y-1">
                           <div className="flex justify-between text-xs text-gray-600">
                               <span>Optimisation...</span>
                               <span>{Math.round(uploadProgress)}%</span>
                           </div>
                           <Progress value={uploadProgress} className="h-1" />
                       </div>
                   )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Prénom</label>
                      <Input 
                         value={profile.first_name || ''} 
                         onChange={e => setProfile({...profile, first_name: e.target.value})}
                         className="bg-white border-gray-300 text-gray-900"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Nom</label>
                      <Input 
                         value={profile.last_name || ''} 
                         onChange={e => setProfile({...profile, last_name: e.target.value})}
                         className="bg-white border-gray-300 text-gray-900"
                      />
                   </div>
                </div>

                <div className="pt-4 flex justify-end">
                   <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700 min-w-[120px]">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Enregistrer
                   </Button>
                </div>
             </form>
          </CardContent>
       </Card>
    </div>
  );
};

export default Profile;
