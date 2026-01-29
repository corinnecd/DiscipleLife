
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Church, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const SignupPasteur = () => {
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    identifiantUnique: ''
  });

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generateIdentifiantUnique = () => {
    // Générer un identifiant unique au format PASTEUR-XXX
    // On pourrait aussi le générer automatiquement côté serveur
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PASTEUR-${randomNum}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
        toast({ 
          title: "Erreur", 
          description: "Les mots de passe ne correspondent pas.", 
          variant: "destructive" 
        });
        return;
    }

    setLoading(true);
    try {
      // Générer l'identifiant unique si non fourni
      const identifiantUnique = formData.identifiantUnique || generateIdentifiantUnique();

      // Créer le compte utilisateur avec les métadonnées (alignées sur la table profils)
      const { error: signUpError } = await signUp(formData.email, formData.password, {
        data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'pasteur',
            identifiant_unique: identifiantUnique
        }
      });

      if (signUpError) throw signUpError;

      // Attendre un peu pour que le trigger handle_new_user crée le profil
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mettre à jour le profil pour ajouter identifiant_unique
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase
          .from('profils')
          .update({ identifiant_unique: identifiantUnique })
          .eq('id', user.id);

        if (updateError) {
          console.error('Erreur lors de la mise à jour de l\'identifiant_unique:', updateError);
        }
      }
      
      toast({
          title: "Inscription réussie !",
          description: "Votre compte pasteur a été créé. Vérifiez votre email pour confirmer. Votre compte devra être approuvé par un administrateur.",
      });
      navigate('/auth'); // Redirect to login
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message || "Une erreur est survenue lors de l'inscription."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0518] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1a0b2e] border-white/10 text-white">
        <CardHeader>
           <Button variant="ghost" className="w-fit p-0 hover:bg-transparent text-gray-400 hover:text-white mb-2" onClick={() => navigate('/')}>
               <ArrowLeft size={16} className="mr-2" /> Retour
           </Button>
           <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400 mb-4">
               <Church size={24} />
           </div>
           <CardTitle className="text-2xl">Inscription Pasteur</CardTitle>
           <CardDescription className="text-gray-400">
             Créez votre compte pasteur pour superviser les familles de disciples.
           </CardDescription>
           <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
             <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
             <p className="text-xs text-amber-200">
               Note : Votre compte devra être approuvé par un administrateur avant d'être activé.
             </p>
           </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input 
                      name="firstName" 
                      value={formData.firstName} 
                      onChange={handleInputChange} 
                      required 
                      className="bg-black/20 border-white/10 text-white" 
                    />
                </div>
                <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input 
                      name="lastName" 
                      value={formData.lastName} 
                      onChange={handleInputChange} 
                      required 
                      className="bg-black/20 border-white/10 text-white" 
                    />
                </div>
             </div>
             <div className="space-y-2">
                <Label>Identifiant unique (optionnel)</Label>
                <Input 
                  name="identifiantUnique" 
                  value={formData.identifiantUnique} 
                  onChange={handleInputChange} 
                  placeholder="Ex: PASTEUR-001 (généré automatiquement si vide)"
                  className="bg-black/20 border-white/10 text-white" 
                />
                <p className="text-xs text-gray-500">
                  Si laissé vide, un identifiant unique sera généré automatiquement.
                </p>
             </div>
             <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  required 
                  className="bg-black/20 border-white/10 text-white" 
                />
             </div>
             <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  required 
                  minLength={6}
                  className="bg-black/20 border-white/10 text-white" 
                />
             </div>
             <div className="space-y-2">
                <Label>Confirmer le mot de passe</Label>
                <Input 
                  type="password" 
                  name="confirmPassword" 
                  value={formData.confirmPassword} 
                  onChange={handleInputChange} 
                  required 
                  className="bg-black/20 border-white/10 text-white" 
                />
             </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
             <Button 
               type="submit" 
               className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
               disabled={loading}
             >
                 {loading ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                     Création en cours...
                   </>
                 ) : (
                   "Créer mon compte Pasteur"
                 )}
             </Button>
             <p className="text-sm text-gray-400 text-center">
                 Déjà un compte ? <Link to="/auth" className="text-purple-400 hover:underline">Se connecter</Link>
             </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignupPasteur;
