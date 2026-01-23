
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { getInitials } from '@/lib/utils';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Loader2, Camera, Save, User, X } from 'lucide-react';
import { compressImage } from '@/lib/ImageCompression';
import { Progress } from '@/components/ui/progress';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nomFamille, setNomFamille] = useState(null);
  
  // Avatar Upload
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Formations PCNC disponibles
  const formationsPCNC = ['001', '101', '201', 'RTT', 'IEBI', 'PILLIERS'];
  
  // État pour les formations sélectionnées (tableau)
  const [selectedFormations, setSelectedFormations] = useState([]);

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
      
      // Initialiser les formations sélectionnées depuis la base de données
      if (data.formations_pcnc_realisees) {
        const formations = data.formations_pcnc_realisees
          .split(',')
          .map(f => f.trim())
          .filter(f => f !== '');
        setSelectedFormations(formations);
      } else {
        setSelectedFormations([]);
      }

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
      const formationsValue = selectedFormations.length > 0 
        ? selectedFormations.join(', ') 
        : null;
      
      // Log pour déboguer
      console.log('Formations à sauvegarder:', formationsValue);
      console.log('selectedFormations:', selectedFormations);
      
      const { error, data } = await supabase
        .from('profils')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: avatarUrl,
          formations_pcnc_realisees: formationsValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (error) {
        console.error('Erreur Supabase:', error);
        console.error('Code erreur:', error.code);
        console.error('Message erreur:', error.message);
        console.error('Détails erreur:', error.details);
        throw error;
      }
      
      console.log('Profil mis à jour avec succès:', data);
      
      // Afficher le toast avec durée de 3 secondes
      const toastId = toast({ 
        title: "Profil mis à jour", 
        description: "Vos modifications ont été enregistrées.",
        className: "bg-green-600 text-white border-0 p-4 [&>div]:text-white [&>div>div]:text-white [&>div]:text-sm [&>div>div]:text-xs",
        duration: 3000
      });
      
      // Forcer la fermeture après 3 secondes
      setTimeout(() => {
        toastId.dismiss();
      }, 3000);
      
      setAvatarFile(null);
      setUploadProgress(0);
      
      // Rediriger vers la page d'accueil après 3 secondes
      setTimeout(() => {
        navigate('/home');
      }, 3000);

    } catch (error) {
      console.error('Erreur complète lors de la mise à jour:', error);
      const errorMessage = error?.message || error?.details || "Erreur inconnue";
      const errorCode = error?.code || "UNKNOWN";
      
      // Message d'erreur plus détaillé
      toast({
        title: "Erreur lors de la sauvegarde",
        description: `Code: ${errorCode}. ${errorMessage}`,
        variant: "destructive"
      });
      
      handleError(error, { context: 'handleUpdate' }, "Échec de la mise à jour du profil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8 bg-gray-50 min-h-screen"><Loader2 className="animate-spin text-gray-600" /></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
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

                {/* Formations PCNC réalisées */}
                <div className="space-y-3">
                   <label className="text-sm font-medium text-gray-900">Formations PCNC réalisées</label>
                   
                   {/* Cases à cocher pour les formations */}
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {formationsPCNC.map((formation) => (
                         <div key={formation} className="flex items-center space-x-2">
                            <Checkbox
                               id={`formation-${formation}`}
                               checked={selectedFormations.includes(formation)}
                               onCheckedChange={(checked) => {
                                  if (checked) {
                                     setSelectedFormations([...selectedFormations, formation]);
                                  } else {
                                     setSelectedFormations(selectedFormations.filter(f => f !== formation));
                                  }
                               }}
                               className="border-gray-300"
                            />
                            <label
                               htmlFor={`formation-${formation}`}
                               className="text-sm font-medium text-gray-900 cursor-pointer"
                            >
                               {formation}
                            </label>
                         </div>
                      ))}
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
