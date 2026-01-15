
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Building2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const SignupSuperviseur = () => {
  const [loading, setLoading] = useState(false);
  const [loadingPasteurs, setLoadingPasteurs] = useState(true);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    pasteurId: '',
    titre: '' // Nouveau champ pour le titre (Pasteur, Berger, Mentor)
  });

  const [pasteurs, setPasteurs] = useState([]);

  // Charger la liste des pasteurs
  useEffect(() => {
    const fetchPasteurs = async () => {
      try {
        setLoadingPasteurs(true);
        const { data, error } = await supabase
          .from('profils')
          .select('id, first_name, last_name, identifiant_unique')
          .eq('role', 'pasteur')
          .order('identifiant_unique');

        if (error) throw error;

        setPasteurs(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des pasteurs:', error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger la liste des pasteurs. Veuillez réessayer."
        });
      } finally {
        setLoadingPasteurs(false);
      }
    };

    fetchPasteurs();
  }, [toast]);

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasteurChange = (value) => {
    setFormData(prev => ({ ...prev, pasteurId: value }));
  };

  const handleTitreChange = (value) => {
    setFormData(prev => ({ ...prev, titre: value }));
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

    if (!formData.pasteurId) {
        toast({ 
          title: "Erreur", 
          description: "Veuillez sélectionner votre pasteur de tutelle.", 
          variant: "destructive" 
        });
        return;
    }

    if (!formData.titre) {
        toast({ 
          title: "Erreur", 
          description: "Veuillez sélectionner votre titre.", 
          variant: "destructive" 
        });
        return;
    }

    setLoading(true);
    try {
      // Créer le compte utilisateur avec les métadonnées
      const { error: signUpError } = await signUp(formData.email, formData.password, {
        data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'superviseur',
            pasteur_id: formData.pasteurId // Stocké dans les métadonnées, sera utilisé par le trigger
        }
      });

      if (signUpError) throw signUpError;

      // Attendre un peu pour que le trigger handle_new_user crée le profil
      // Puis mettre à jour le profil avec pasteur_id
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mettre à jour le profil pour ajouter pasteur_id et titre
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase
          .from('profils')
          .update({ 
            pasteur_id: formData.pasteurId,
            titre: formData.titre
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Erreur lors de la mise à jour du profil:', updateError);
          // Ne pas bloquer l'inscription si cette mise à jour échoue
          // Le trigger devrait normalement gérer cela
        }
      }
      
      toast({
          title: "Inscription réussie !",
          description: "Bienvenue, Superviseur. Vérifiez votre email pour confirmer votre compte.",
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
           <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400 mb-4">
               <Building2 size={24} />
           </div>
           <CardTitle className="text-2xl">Inscription Superviseur</CardTitle>
           <CardDescription className="text-gray-400">
             Rejoignez-nous pour superviser une famille de disciples et rendre compte à votre pasteur.
           </CardDescription>
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
                <Label htmlFor="titre">Titre <span className="text-red-400">*</span></Label>
                <Select 
                  value={formData.titre} 
                  onValueChange={handleTitreChange}
                  required
                >
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Sélectionnez votre titre" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0b2e] border-white/10">
                    <SelectItem value="Pasteur" className="text-white focus:bg-amber-500/20">
                      Pasteur
                    </SelectItem>
                    <SelectItem value="Berger" className="text-white focus:bg-amber-500/20">
                      Berger
                    </SelectItem>
                    <SelectItem value="Mentor" className="text-white focus:bg-amber-500/20">
                      Mentor
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Indiquez votre titre dans le ministère.
                </p>
             </div>
             <div className="space-y-2">
                <Label htmlFor="pasteurId">Pasteur de tutelle <span className="text-red-400">*</span></Label>
                {loadingPasteurs ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span className="ml-2 text-sm text-gray-400">Chargement des pasteurs...</span>
                  </div>
                ) : (
                  <Select 
                    value={formData.pasteurId} 
                    onValueChange={handlePasteurChange}
                    required
                  >
                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                      <SelectValue placeholder="Sélectionnez votre pasteur de tutelle" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0b2e] border-white/10">
                      {pasteurs.length === 0 ? (
                        <SelectItem value="" disabled>
                          Aucun pasteur disponible
                        </SelectItem>
                      ) : (
                        pasteurs.map((pasteur) => (
                          <SelectItem 
                            key={pasteur.id} 
                            value={pasteur.id}
                            className="text-white focus:bg-amber-500/20"
                          >
                            {pasteur.identifiant_unique} - {pasteur.first_name} {pasteur.last_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Vous devez sélectionner le pasteur auquel vous rendrez compte.
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
               className="w-full bg-amber-600 hover:bg-amber-700 text-white" 
               disabled={loading || loadingPasteurs}
             >
                 {loading ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                     Création en cours...
                   </>
                 ) : (
                   "Créer mon compte Superviseur"
                 )}
             </Button>
             <p className="text-sm text-gray-400 text-center">
                 Déjà un compte ? <Link to="/auth" className="text-amber-400 hover:underline">Se connecter</Link>
             </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignupSuperviseur;
