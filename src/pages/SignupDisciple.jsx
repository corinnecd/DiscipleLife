import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, UserPlus, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignupDisciple = () => {
  const [loading, setLoading] = useState(false);
  const [loadingFamilles, setLoadingFamilles] = useState(true);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    familleId: '',
    pasteurId: '',
    role: 'disciple',
    fonction: '',
    mentorId: '',
    spiritualStage: '',
    formationsPcncRealisees: [],
    nombreDisciples: '',
    phone: '',
    villeResidence: '',
    codePostal: '',
    sexe: '',
    baptiseImmersion: '',
    dateBapteme: ''
  });

  const [familles, setFamilles] = useState([]);
  const [pasteurs, setPasteurs] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const isAddMemberMode = searchParams.get('mode') === 'add';

  // Pré-remplissage : token inscription > sessionStorage > paramètres URL
  useEffect(() => {
    const token = searchParams.get('token');
    const loadFromToken = async () => {
      const { data, error } = await supabase.rpc('get_inscription_step1_by_token', { p_token: token });
      if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
      const row = Array.isArray(data) ? data[0] : data;
      const d = row?.data_json || {};
      return {
        ...(d.role && ['disciple', 'mentor', 'superviseur', 'pasteur'].includes(d.role) && { role: d.role }),
        ...(d.prenom && { firstName: d.prenom }),
        ...(d.nom && { lastName: d.nom }),
        ...(row.email && { email: row.email }),
        ...(d.password && { password: d.password }),
        ...(d.familleId && { familleId: d.familleId }),
        ...(d.pasteurId && { pasteurId: d.pasteurId }),
      };
    };

    let updates = {};
    const apply = async () => {
      if (token) {
        const fromToken = await loadFromToken();
        if (fromToken && Object.keys(fromToken).length > 0) {
          sessionStorage.setItem('signup_step1', JSON.stringify({ ...fromToken, password: fromToken.password }));
          setFormData(prev => ({ ...prev, ...fromToken }));
          return;
        }
      }
      const step1 = sessionStorage.getItem('signup_step1');
      if (step1) {
        try {
          const data = JSON.parse(step1);
          updates = {
            ...(data.role && ['disciple', 'mentor', 'superviseur', 'pasteur'].includes(data.role) && { role: data.role }),
            ...(data.prenom && { firstName: data.prenom }),
            ...(data.nom && { lastName: data.nom }),
            ...(data.email && { email: data.email }),
            ...(data.password && { password: data.password }),
            ...(data.familleId && { familleId: data.familleId }),
            ...(data.pasteurId && { pasteurId: data.pasteurId }),
          };
        } catch (_) {}
      }
      if (Object.keys(updates).length === 0) {
        const roleFromUrl = searchParams.get('role');
        const prenom = searchParams.get('prenom');
        const nom = searchParams.get('nom');
        const email = searchParams.get('email');
        const familleId = searchParams.get('familleId');
        const pasteurId = searchParams.get('pasteurId');
        if (roleFromUrl) updates.role = roleFromUrl;
        if (prenom) updates.firstName = prenom;
        if (nom) updates.lastName = nom;
        if (email) updates.email = email;
        if (familleId) updates.familleId = familleId;
        if (pasteurId) updates.pasteurId = pasteurId;
      }
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    };
    apply();
  }, [searchParams]);

  // Mode "ajout de membre" : redirection si non connecté, puis pré-remplissage depuis le profil
  useEffect(() => {
    if (!isAddMemberMode) return;
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent('/signup?mode=add'), { replace: true });
      return;
    }
    const loadProfilForAdd = async () => {
      const { data: profil } = await supabase.from('profils').select('id, famille_id, role').eq('id', user.id).single();
      if (profil) {
        setFormData(prev => ({
          ...prev,
          ...(profil.famille_id && { familleId: profil.famille_id }),
          ...((profil.role === 'mentor' || profil.role === 'superviseur') && { mentorId: profil.id })
        }));
      }
    };
    loadProfilForAdd();
  }, [isAddMemberMode, user, navigate]);

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

  const FONCTIONS = [
    { value: '', label: 'Non renseigné' },
    { value: 'Pasteur', label: 'Pasteur' },
    { value: 'AP', label: 'AP (Assistant Pasteur)' },
    { value: 'Berger', label: 'Berger' }
  ];

  const FORMATIONS_PCNC = ['001', '101', '201', 'RTT', 'IEBI'];

  const handleFormationToggle = (value) => {
    setFormData(prev => {
      const arr = Array.isArray(prev.formationsPcncRealisees) ? prev.formationsPcncRealisees : [];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, formationsPcncRealisees: next };
    });
  };

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

  // Charger la liste des pasteurs (pour superviseur)
  useEffect(() => {
    const fetchPasteurs = async () => {
      const { data } = await supabase
        .from('profils')
        .select('id, first_name, last_name')
        .eq('role', 'pasteur')
        .order('last_name');
      setPasteurs(data || []);
    };
    fetchPasteurs();
  }, []);

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
    if (isAddMemberMode) {
      if (!formData.email?.trim()) e.email = 'L\'email est requis.';
      else if (!EMAIL_REGEX.test(formData.email)) e.email = 'Format d\'email invalide.';
      if (!formData.password) e.password = 'Le mot de passe est requis.';
      else if (formData.password.length < 6) e.password = 'Le mot de passe doit contenir au moins 6 caractères.';
      if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Les mots de passe ne correspondent pas.';
    } else {
      const step1 = sessionStorage.getItem('signup_step1');
      if (!step1) {
        e._step1 = 'Données manquantes. Veuillez commencer par la page d\'accueil.';
      } else {
        try {
          const data = JSON.parse(step1);
          if (!data.email?.trim()) e._step1 = 'L\'email est requis. Veuillez recommencer depuis la page d\'accueil.';
          else if (!EMAIL_REGEX.test(data.email)) e._step1 = 'Format d\'email invalide. Veuillez recommencer depuis la page d\'accueil.';
          else if (!data.password) e._step1 = 'Le mot de passe est requis. Veuillez recommencer depuis la page d\'accueil.';
          else if (data.password.length < 6) e._step1 = 'Le mot de passe doit contenir au moins 6 caractères. Veuillez recommencer depuis la page d\'accueil.';
        } catch (_) {
          e._step1 = 'Données invalides. Veuillez recommencer depuis la page d\'accueil.';
        }
      }
    }
    if ((formData.role === 'disciple' || formData.role === 'mentor') && !formData.familleId) e.familleId = 'Veuillez sélectionner votre famille.';
    if (formData.role === 'superviseur' && !formData.pasteurId) e.pasteurId = 'Veuillez sélectionner votre pasteur de tutelle.';
    if (!formData.phone?.trim()) e.phone = 'Le numéro de téléphone est requis.';
    if (!formData.villeResidence?.trim()) e.villeResidence = 'La ville de résidence est requise.';
    if (!formData.codePostal?.trim()) e.codePostal = 'Le code postal est requis.';
    if (!formData.sexe?.trim() || formData.sexe === '__vide__') e.sexe = 'Le sexe est requis.';
    if (!formData.baptiseImmersion || formData.baptiseImmersion === '__vide__' || formData.baptiseImmersion === '') e.baptiseImmersion = 'Veuillez indiquer si vous êtes baptisé(e) par immersion.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFamilleChange = (value) => {
    setFormData(prev => ({ ...prev, familleId: value }));
    if (errors.familleId) setErrors(prev => ({ ...prev, familleId: '' }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({
      ...prev,
      role: value,
      ...(value === 'superviseur' ? { familleId: '' } : { pasteurId: '' }),
    }));
    setErrors(prev => ({ ...prev, familleId: '', pasteurId: '' }));
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
            fonction: formData.fonction || null,
            famille_id: formData.familleId || null,
            pasteur_id: formData.pasteurId || null,
            mentor_id: formData.mentorId || null,
            spiritual_stage: formData.spiritualStage || null,
            formations_pcnc_realisees: Array.isArray(formData.formationsPcncRealisees) && formData.formationsPcncRealisees.length > 0 ? formData.formationsPcncRealisees.join(', ') : null,
            nombre_disciples: formData.nombreDisciples !== '' ? parseInt(formData.nombreDisciples, 10) : null,
            phone: formData.phone || null,
            ville_residence: formData.villeResidence || null,
            code_postal: formData.codePostal || null,
            sexe: formData.sexe || null,
            baptise_immersion: formData.baptiseImmersion === 'oui' ? true : formData.baptiseImmersion === 'non' ? false : null,
            date_bapteme: formData.dateBapteme ? new Date(formData.dateBapteme).toISOString().split('T')[0] : null
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
          pasteur_id: formData.pasteurId || null,
          role: formData.role || 'disciple',
          fonction: formData.fonction || null,
          mentor_id: formData.mentorId || null,
          spiritual_stage: formData.spiritualStage || null,
          formations_pcnc_realisees: Array.isArray(formData.formationsPcncRealisees) && formData.formationsPcncRealisees.length > 0 ? formData.formationsPcncRealisees.join(', ') : null,
          nombre_disciples: formData.nombreDisciples !== '' ? parseInt(formData.nombreDisciples, 10) : null,
          phone: formData.phone || null,
          ville_residence: formData.villeResidence || null,
          code_postal: formData.codePostal || null,
          sexe: formData.sexe || null,
          baptise_immersion: formData.baptiseImmersion === 'oui' ? true : formData.baptiseImmersion === 'non' ? false : null,
          date_bapteme: formData.dateBapteme ? new Date(formData.dateBapteme).toISOString().split('T')[0] : null
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
      
      sessionStorage.removeItem('signup_step1');
      toast({
          title: isAddMemberMode ? "Membre ajouté" : "Inscription réussie !",
          description: isAddMemberMode ? "Le compte a été créé. Le membre peut se connecter avec l'email et le mot de passe définis." : "Bienvenue ! Vérifiez votre email pour commencer.",
      });
      if (isAddMemberMode) {
        navigate(-1); // Retour au dashboard ou à la page précédente
        if (window.history.length <= 1) navigate('/home');
      } else {
        navigate('/auth');
      }
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
           <Button variant="ghost" className="w-fit p-0 hover:bg-transparent text-gray-400 hover:text-white mb-2" onClick={() => isAddMemberMode ? navigate(-1) : navigate('/')}>
               <ArrowLeft size={16} className="mr-2" /> {isAddMemberMode ? 'Retour au tableau de bord' : 'Retour'}
           </Button>
           <div className="w-12 h-12 bg-teal-500/10 rounded-lg flex items-center justify-center text-teal-400 mb-4">
               <UserPlus size={24} />
           </div>
           <CardTitle className="text-2xl">{isAddMemberMode ? 'Ajouter un membre' : 'Inscription'}</CardTitle>
           <CardDescription className="text-gray-400">
             {isAddMemberMode
               ? "Enregistrez un nouveau membre (compte + fiche). Il pourra se connecter avec l'email et le mot de passe que vous définissez."
               : "Choisissez votre rôle, famille, puis remplissez les champs ci-dessous : suivi par, statut spirituel, formations PCNC, téléphone, ville de résidence, code postal, sexe, baptême."}
           </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errors._step1 && (
              <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
                {errors._step1} <Link to="/" className="underline">Retour à la page d'accueil</Link>
              </p>
            )}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Prénom <span className="text-red-400">*</span></Label>
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
                    <Label>Nom <span className="text-red-400">*</span></Label>
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
             {formData.role === 'superviseur' ? (
               <div className="space-y-2">
                 <Label htmlFor="pasteurId">Pasteur de tutelle <span className="text-red-400">*</span></Label>
                 <Select
                   value={formData.pasteurId}
                   onValueChange={(v) => setFormData(prev => ({ ...prev, pasteurId: v }))}
                   required
                 >
                   <SelectTrigger className={cn("bg-black/20 text-white", errors.pasteurId ? "border-red-500" : "border-white/10")}>
                     <SelectValue placeholder="Sélectionnez votre pasteur de tutelle" />
                   </SelectTrigger>
                   <SelectContent className="bg-[#1a0b2e] border-white/10">
                     {pasteurs.map((p) => (
                       <SelectItem key={p.id} value={p.id} className="text-white focus:bg-teal-500/20">
                         {[p.first_name, p.last_name].filter(Boolean).join(' ')}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 {errors.pasteurId && <p className="text-xs text-red-400 mt-1">{errors.pasteurId}</p>}
               </div>
             ) : (
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
             )}
             <div className="space-y-2">
                <Label>Rôle <span className="text-red-400">*</span></Label>
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
                <Label>Fonction (charge pastorale) <span className="text-red-400">*</span></Label>
                <Select value={formData.fonction || '__none__'} onValueChange={(v) => { setFormData(prev => ({ ...prev, fonction: v === '__none__' ? '' : v })); if (errors.fonction) setErrors(prev => ({ ...prev, fonction: '' })); }}>
                  <SelectTrigger className={cn("bg-black/20 text-white", errors.fonction ? "border-red-500" : "border-white/10")}>
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0b2e] border-white/10">
                    {FONCTIONS.map((f) => (
                      <SelectItem key={f.value || '__none__'} value={f.value || '__none__'} className="text-white focus:bg-teal-500/20">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.fonction && <p className="text-xs text-red-400 mt-1">{errors.fonction}</p>}
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
                <div className="flex flex-wrap gap-4 pt-2">
                  {FORMATIONS_PCNC.map((code) => {
                    const arr = Array.isArray(formData.formationsPcncRealisees) ? formData.formationsPcncRealisees : [];
                    const checked = arr.includes(code);
                    return (
                      <label
                        key={code}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 transition-colors",
                          checked ? "bg-teal-500/20 text-teal-300" : "hover:bg-white/5 text-gray-400"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => handleFormationToggle(code)}
                          className="border-white/30 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                        />
                        <span>{code}</span>
                      </label>
                    );
                  })}
                </div>
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
                <Label>Numéro de téléphone <span className="text-red-400">*</span></Label>
                <Input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleInputChange}
                  onBlur={() => validateSignup()}
                  placeholder="+33 6 12 34 56 78"
                  className={cn("bg-black/20 text-white", errors.phone ? "border-red-500" : "border-white/10")}
                />
                {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
             </div>
             <div className="space-y-2">
                <Label>Ville de résidence <span className="text-red-400">*</span></Label>
                <Input 
                  name="villeResidence" 
                  value={formData.villeResidence} 
                  onChange={handleInputChange}
                  onBlur={() => validateSignup()}
                  placeholder="Ex. Libreville, Port-Gentil..."
                  className={cn("bg-black/20 text-white", errors.villeResidence ? "border-red-500" : "border-white/10")}
                />
                {errors.villeResidence && <p className="text-xs text-red-400">{errors.villeResidence}</p>}
             </div>
             <div className="space-y-2">
                <Label>Code postal <span className="text-red-400">*</span></Label>
                <Input 
                  name="codePostal" 
                  value={formData.codePostal} 
                  onChange={handleInputChange}
                  onBlur={() => validateSignup()}
                  placeholder="Ex. 75001"
                  className={cn("bg-black/20 text-white", errors.codePostal ? "border-red-500" : "border-white/10")}
                />
                {errors.codePostal && <p className="text-xs text-red-400">{errors.codePostal}</p>}
             </div>
             <div className="space-y-2">
                <Label>Sexe <span className="text-red-400">*</span></Label>
                <Select value={formData.sexe || '__vide__'} onValueChange={(v) => { setFormData(prev => ({ ...prev, sexe: v === '__vide__' ? '' : v })); if (errors.sexe) setErrors(prev => ({ ...prev, sexe: '' })); }}>
                  <SelectTrigger className={cn("bg-black/20 text-white", errors.sexe ? "border-red-500" : "border-white/10")}>
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0b2e] border-white/10">
                    <SelectItem value="__vide__" className="text-white focus:bg-teal-500/20">Non renseigné</SelectItem>
                    <SelectItem value="Homme" className="text-white focus:bg-teal-500/20">Homme</SelectItem>
                    <SelectItem value="Femme" className="text-white focus:bg-teal-500/20">Femme</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sexe && <p className="text-xs text-red-400 mt-1">{errors.sexe}</p>}
             </div>
             <div className="space-y-2">
                <Label>Baptisé(e) par immersion ? <span className="text-red-400">*</span></Label>
                <Select 
                  value={formData.baptiseImmersion || '__vide__'} 
                  onValueChange={(v) => { setFormData(prev => ({ ...prev, baptiseImmersion: v === '__vide__' ? '' : v, ...(v !== 'oui' ? { dateBapteme: '' } : {}) })); if (errors.baptiseImmersion) setErrors(prev => ({ ...prev, baptiseImmersion: '' })); }}
                >
                  <SelectTrigger className={cn("bg-black/20 text-white", errors.baptiseImmersion ? "border-red-500" : "border-white/10")}>
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0b2e] border-white/10">
                    <SelectItem value="__vide__" className="text-white focus:bg-teal-500/20">Non renseigné</SelectItem>
                    <SelectItem value="oui" className="text-white focus:bg-teal-500/20">Oui</SelectItem>
                    <SelectItem value="non" className="text-white focus:bg-teal-500/20">Non</SelectItem>
                  </SelectContent>
                </Select>
                {errors.baptiseImmersion && <p className="text-xs text-red-400 mt-1">{errors.baptiseImmersion}</p>}
                {formData.baptiseImmersion === 'oui' && (
                  <div className="mt-2">
                    <Label className="text-sm text-gray-400">Si oui, date du baptême</Label>
                    <Input 
                      type="date" 
                      name="dateBapteme" 
                      value={formData.dateBapteme} 
                      onChange={handleInputChange} 
                      className="bg-black/20 border-white/10 text-white mt-1" 
                    />
                  </div>
                )}
             </div>
             {isAddMemberMode && (
               <>
                 <div className="space-y-2">
                   <Label>Email <span className="text-red-400">*</span></Label>
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
                   <Label>Mot de passe <span className="text-red-400">*</span></Label>
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
                   <Label>Confirmer le mot de passe <span className="text-red-400">*</span></Label>
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
               </>
             )}
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
                     {isAddMemberMode ? 'Ajout en cours...' : 'Création en cours...'}
                   </>
                 ) : (
                   isAddMemberMode ? "Ajouter le membre" : "Créer mon compte Gratuit"
                 )}
             </Button>
             {!isAddMemberMode && (
               <p className="text-sm text-gray-400 text-center">
                 Déjà inscrit ? <Link to="/auth" className="text-teal-400 hover:underline">Se connecter</Link>
               </p>
             )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignupDisciple;
