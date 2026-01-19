
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const SignupDisciple = () => {
  const [loading, setLoading] = useState(false);
  const [loadingFamilles, setLoadingFamilles] = useState(true);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    familleId: '',
    dateEntreeFamille: new Date().toISOString().split('T')[0] // Date du jour par défaut
  });

  const [familles, setFamilles] = useState([]);

  // Charger la liste des familles
  useEffect(() => {
    const fetchFamilles = async () => {
      try {
        setLoadingFamilles(true);
        const { data, error } = await supabase
          .from('familles_disciples')
          .select('id, nom, identifiant_famille')
          .order('nom');

        if (error) throw error;

        setFamilles(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des familles:', error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger la liste des familles. Veuillez réessayer."
        });
      } finally {
        setLoadingFamilles(false);
      }
    };

    fetchFamilles();
  }, [toast]);

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFamilleChange = (value) => {
    setFormData(prev => ({ ...prev, familleId: value }));
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

    if (!formData.familleId) {
        toast({ 
          title: "Erreur", 
          description: "Veuillez sélectionner votre famille.", 
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
            role: 'disciple',
            famille_id: formData.familleId // Stocké dans les métadonnées
        }
      });

      if (signUpError) throw signUpError;

      // Attendre un peu pour que le trigger handle_new_user crée le profil
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mettre à jour le profil pour ajouter famille_id si nécessaire
      // Note: La liaison disciple-famille peut être gérée différemment selon votre schéma
      // Ici, on suppose qu'il y a un champ famille_id dans profils ou une table de liaison
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Vérifier si le profil existe et mettre à jour si nécessaire
        const { error: updateError } = await supabase
          .from('profils')
          .update({ 
            famille_id: formData.familleId,
            date_entree_famille: formData.dateEntreeFamille ? new Date(formData.dateEntreeFamille).toISOString() : null
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Erreur lors de la mise à jour de la famille:', updateError);
          // Ne pas bloquer l'inscription si cette mise à jour échoue
        }
      }
      
      toast({
          title: "Inscription réussie !",
          description: "Bienvenue ! Vérifiez votre email pour commencer.",
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
           <div className="w-12 h-12 bg-teal-500/10 rounded-lg flex items-center justify-center text-teal-400 mb-4">
               <UserPlus size={24} />
           </div>
           <CardTitle className="text-2xl">Inscription Disciple</CardTitle>
           <CardDescription className="text-gray-400">Commencez votre voyage de croissance spirituelle dès aujourd'hui.</CardDescription>
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
                <Label htmlFor="familleId">Famille <span className="text-red-400">*</span></Label>
                {loadingFamilles ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                    <span className="ml-2 text-sm text-gray-400">Chargement des familles...</span>
                  </div>
                ) : (
                  <Select 
                    value={formData.familleId} 
                    onValueChange={handleFamilleChange}
                    required
                  >
                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                      <SelectValue placeholder="Sélectionnez votre famille" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0b2e] border-white/10">
                      {familles.length === 0 ? (
                        <SelectItem value="" disabled>
                          Aucune famille disponible
                        </SelectItem>
                      ) : (
                        familles.map((famille) => (
                          <SelectItem 
                            key={famille.id} 
                            value={famille.id}
                            className="text-white focus:bg-teal-500/20"
                          >
                            {famille.nom} ({famille.identifiant_famille})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Sélectionnez la famille à laquelle vous appartenez.
                </p>
             </div>
             <div className="space-y-2">
                <Label>Disciple depuis le <span className="text-red-400">*</span></Label>
                <Input 
                  type="date" 
                  name="dateEntreeFamille" 
                  value={formData.dateEntreeFamille} 
                  onChange={handleInputChange} 
                  required 
                  className="bg-black/20 border-white/10 text-white" 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Date d'entrée dans la famille.
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
               className="w-full bg-teal-600 hover:bg-teal-700 text-white" 
               disabled={loading || loadingFamilles}
             >
                 {loading ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                     Création en cours...
                   </>
                 ) : (
                   "Créer mon compte Gratuit"
                 )}
             </Button>
             <p className="text-sm text-gray-400 text-center">
                 Déjà inscrit ? <Link to="/auth" className="text-teal-400 hover:underline">Se connecter</Link>
             </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignupDisciple;
