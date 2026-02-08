import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, UserPlus, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    dateEntreeFamille: new Date().toISOString().split('T')[0],
    role: 'disciple',
    mentorId: '',
    spiritualStage: '',
    formationsPcncRealisees: '',
    nombreDisciples: '',
    phone: '',
    villeResidence: ''
  });

  const [familles, setFamilles] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Rôle pré-rempli depuis l'URL (/signup?role=disciple, /signup?role=mentor, etc.)
  useEffect(() => {
    const roleFromUrl = searchParams.get('role');
    if (roleFromUrl && ['disciple', 'mentor', 'superviseur', 'pasteur'].includes(roleFromUrl)) {
      setFormData(prev => ({ ...prev, role: roleFromUrl }));
    }
  }, [searchParams]);

  const SPIRITUAL_STAGES = [
    { value: '__non_renseigne__', label: 'Non renseigné' },
    { value: 'Non-croyant', label: 'Non-croyant' },
    { value: 'Nouveau converti', label: 'Nouveau converti' },
    { value: 'Disciple affermi', label: 'Disciple affermi' },
    { value: 'Faiseur de disciples', label: 'Faiseur de disciples' }
  ];

  const ROLES = [
    { value: 'disciple', label: 'Disciple' },
    { value: 'mentor', label: 'Mentor' },
    { value: 'superviseur', label: 'Superviseur' },
    { value: 'pasteur', label: 'Pasteur' }
  ];

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

  // Charger la liste des mentors / superviseurs (pour "Suivi par")
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const { data, error } = await supabase
          .from('profils')
          .select('id, first_name, last_name, role')
          .in('role', ['mentor', 'superviseur'])
          .order('last_name');

        if (error) throw error;
        setMentors(data || []);
      } catch (error) {
        console.error('Erreur chargement mentors:', error);
      }
    };
    fetchMentors();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'password' && errors.confirmPassword && formData.confirmPassword !== value) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Les mots de passe ne correspondent pas.' }));
    } else if (name === 'confirmPassword' && value !== formData.password) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Les mots de passe ne correspondent pas.' }));
    } else if (name === 'confirmPassword' && value === formData.password) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  const validateSignup = () => {
    const e = {};
    if (!formData.firstName?.trim()) e.firstName = 'Le prénom est requis.';
    if (!formData.lastName?.trim()) e.lastName = 'Le nom est requis.';
    if (!formData.email?.trim()) e.email = 'L\'email est requis.';
    else if (!EMAIL_REGEX.test(formData.email)) e.email = 'Format d\'email invalide.';
    if (!formData.password) e.password = 'Le mot de passe est requis.';
    else if (formData.password.length < 6) e.password = 'Le mot de passe doit contenir au moins 6 caractères.';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Les mots de passe ne correspondent pas.';
    if (formData.role === 'disciple' && !formData.familleId) e.familleId = 'Veuillez sélectionner votre famille.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFamilleChange = (value) => {
    setFormData(prev => ({ ...prev, familleId: value }));
    if (errors.familleId) setErrors(prev => ({ ...prev, familleId: '' }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleMentorChange = (value) => {
    setFormData(prev => ({ ...prev, mentorId: value }));
  };

  const handleSpiritualStageChange = (value) => {
    setFormData(prev => ({ ...prev, spiritualStage: value === '__non_renseigne__' ? '' : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;
    setLoading(true);
    try {
      // Créer le compte utilisateur avec les métadonnées (alignées sur la table profils)
      const { error: signUpError } = await signUp(formData.email, formData.password, {
        data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: formData.role || 'disciple',
            famille_id: formData.familleId || null,
            date_entree_famille: formData.dateEntreeFamille ? new Date(formData.dateEntreeFamille).toISOString().split('T')[0] : null,
            mentor_id: formData.mentorId || null,
            spiritual_stage: formData.spiritualStage || null,
            formations_pcnc_realisees: formData.formationsPcncRealisees || null,
            nombre_disciples: formData.nombreDisciples !== '' ? parseInt(formData.nombreDisciples, 10) : null,
            phone: formData.phone || null,
            ville_residence: formData.villeResidence || null
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
        const updatePayload = {
          famille_id: formData.familleId || null,
          date_entree_famille: formData.dateEntreeFamille ? new Date(formData.dateEntreeFamille).toISOString().split('T')[0] : null,
          role: formData.role || 'disciple',
          mentor_id: formData.mentorId || null,
          spiritual_stage: formData.spiritualStage || null,
          formations_pcnc_realisees: formData.formationsPcncRealisees || null,
          nombre_disciples: formData.nombreDisciples !== '' ? parseInt(formData.nombreDisciples, 10) : null,
          phone: formData.phone || null,
          ville_residence: formData.villeResidence || null
        };
        const { error: updateError } = await supabase
          .from('profils')
          .update(updatePayload)
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
           <CardTitle className="text-2xl">Inscription</CardTitle>
           <CardDescription className="text-gray-400">Formulaire unique : choisissez votre rôle (Pasteur, Superviseur, Mentor, Disciple), puis remplissez les champs ci-dessous. Famille, date d'entrée, suivi par, statut spirituel, formations PCNC, téléphone, ville de résidence.</CardDescription>
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
                      onBlur={() => validateSignup()}
                      required 
                      className={cn("bg-black/20 text-white", errors.firstName ? "border-red-500" : "border-white/10")}
                    />
                    {errors.firstName && <p className="text-xs text-red-400">{errors.firstName}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input 
                      name="lastName" 
                      value={formData.lastName} 
                      onChange={handleInputChange}
                      onBlur={() => validateSignup()}
                      required 
                      className={cn("bg-black/20 text-white", errors.lastName ? "border-red-500" : "border-white/10")}
                    />
                    {errors.lastName && <p className="text-xs text-red-400">{errors.lastName}</p>}
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
                    <SelectTrigger className={cn("bg-black/20 text-white", errors.familleId ? "border-red-500" : "border-white/10")}>
                      <SelectValue placeholder="Sélectionnez votre famille" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0b2e] border-white/10">
                      {familles.length === 0 ? (
                        <SelectItem value="__none__" disabled>
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
                {errors.familleId && <p className="text-xs text-red-400 mt-1">{errors.familleId}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Sélectionnez la famille à laquelle vous appartenez.
                </p>
             </div>
             <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Sélectionnez votre rôle" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0b2e] border-white/10">
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-white focus:bg-teal-500/20">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Date d'entrée dans la famille</Label>
                <Input 
                  type="date" 
                  name="dateEntreeFamille" 
                  value={formData.dateEntreeFamille} 
                  onChange={handleInputChange} 
                  className="bg-black/20 border-white/10 text-white" 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Date d'entrée dans la famille.
                </p>
             </div>
             <div className="space-y-2">
                <Label>Suivi par (mentor / superviseur)</Label>
                <Select value={formData.mentorId || '__aucun__'} onValueChange={(v) => setFormData(prev => ({ ...prev, mentorId: v === '__aucun__' ? '' : v }))}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Optionnel : sélectionnez qui vous suit" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0b2e] border-white/10">
                    <SelectItem value="__aucun__" className="text-white focus:bg-teal-500/20">Aucun</SelectItem>
                    {mentors.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-white focus:bg-teal-500/20">
                        {[m.first_name, m.last_name].filter(Boolean).join(' ')} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Statut spirituel</Label>
                <Select value={formData.spiritualStage || '__non_renseigne__'} onValueChange={handleSpiritualStageChange}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Sélectionnez un statut" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0b2e] border-white/10">
                    {SPIRITUAL_STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-white focus:bg-teal-500/20">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Formation(s) PCNC réalisées</Label>
                <Input 
                  name="formationsPcncRealisees" 
                  value={formData.formationsPcncRealisees} 
                  onChange={handleInputChange} 
                  placeholder="Ex. Guérison des cœurs brisés, Fondations..."
                  className="bg-black/20 border-white/10 text-white" 
                />
             </div>
             <div className="space-y-2">
                <Label>Nombre de disciples</Label>
                <Input 
                  type="number" 
                  name="nombreDisciples" 
                  value={formData.nombreDisciples} 
                  onChange={handleInputChange} 
                  min={0}
                  placeholder="0"
                  className="bg-black/20 border-white/10 text-white" 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pour les mentors : nombre de disciples suivis.
                </p>
             </div>
             <div className="space-y-2">
                <Label>Numéro de téléphone</Label>
                <Input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleInputChange} 
                  placeholder="+33 6 12 34 56 78"
                  className="bg-black/20 border-white/10 text-white" 
                />
             </div>
             <div className="space-y-2">
                <Label>Ville de résidence</Label>
                <Input 
                  name="villeResidence" 
                  value={formData.villeResidence} 
                  onChange={handleInputChange} 
                  placeholder="Ex. Libreville, Port-Gentil..."
                  className="bg-black/20 border-white/10 text-white" 
                />
             </div>
             <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange}
                  onBlur={() => formData.email && validateSignup()}
                  required 
                  className={cn("bg-black/20 text-white", errors.email ? "border-red-500" : "border-white/10")}
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
             </div>
             <div className="space-y-2">
                <Label>Mot de passe</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? 'text' : 'password'} 
                    name="password" 
                    value={formData.password} 
                    onChange={handleInputChange}
                    onBlur={() => formData.password && validateSignup()}
                    required 
                    minLength={6}
                    className={cn("bg-black/20 text-white pr-10", errors.password ? "border-red-500" : "border-white/10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
             </div>
             <div className="space-y-2">
                <Label>Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    name="confirmPassword" 
                    value={formData.confirmPassword} 
                    onChange={handleInputChange}
                    onBlur={() => formData.confirmPassword && validateSignup()}
                    required 
                    className={cn("bg-black/20 text-white pr-10", errors.confirmPassword ? "border-red-500" : "border-white/10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
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
