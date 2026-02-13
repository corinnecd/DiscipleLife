import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Users, Heart, Star, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HomePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    role: 'disciple',
    familleId: '',
    pasteurId: '',
    prenom: '',
    nom: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const [errors, setErrors] = useState({});
  const [familles, setFamilles] = useState([]);
  const [pasteurs, setPasteurs] = useState([]);
  const [loadingFamilles, setLoadingFamilles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: f } = await supabase
        .from('familles_disciples')
        .select('id, nom')
        .order('nom');
      setFamilles(f || []);

      const { data: p } = await supabase
        .from('profils')
        .select('id, first_name, last_name')
        .eq('role', 'pasteur')
        .order('last_name');
      setPasteurs(p || []);

      setLoadingFamilles(false);
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (formData.role !== 'superviseur') {
      if (!formData.familleId) newErrors.familleId = 'La famille est requise.';
    } else {
      if (!formData.pasteurId) newErrors.pasteurId = 'Le pasteur de tutelle est requis.';
    }
    if (!formData.prenom?.trim()) newErrors.prenom = 'Le prénom est requis.';
    if (!formData.nom?.trim()) newErrors.nom = 'Le nom est requis.';
    if (!formData.email?.trim()) newErrors.email = "L'email est requis.";
    else if (!EMAIL_REGEX.test(formData.email)) newErrors.email = 'Email invalide.';
    if (!formData.password) newErrors.password = 'Le mot de passe est requis.';
    else if (formData.password.length < 6) newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères.';
    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = 'Les mots de passe ne correspondent pas.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        role: formData.role,
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        password: formData.password,
        familleId: formData.familleId || null,
        pasteurId: formData.pasteurId || null,
      };
      sessionStorage.setItem('signup_step1', JSON.stringify(payload));

      const { data: rpcData, error: rpcError } = await supabase.rpc('creer_lien_inscription_step1', {
        p_email: formData.email.trim(),
        p_data: payload,
      });

      if (rpcError) throw rpcError;

      const row = Array.isArray(rpcData) && rpcData[0] ? rpcData[0] : rpcData;
      const token = row?.token;
      const lienFinal = token
        ? `${window.location.origin}/signup?token=${token}`
        : `${window.location.origin}/signup`;

      try {
        await supabase.functions.invoke('send-inscription-email', {
          body: { email: formData.email, lien: lienFinal, prenom: formData.prenom, nom: formData.nom },
        });
      } catch (emailErr) {
        console.warn('Envoi email:', emailErr);
      }

      toast({
        title: 'Email envoyé !',
        description: 'Un email vous a été envoyé avec le lien vers le formulaire complet. Vérifiez votre boîte de réception.',
      });

      navigate(`/signup?token=${token || ''}`, { replace: true });
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.message || 'Une erreur est survenue. Vous pouvez continuer vers le formulaire.',
      });
      const params = new URLSearchParams({
        role: formData.role,
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        ...(formData.familleId && { familleId: formData.familleId }),
        ...(formData.pasteurId && { pasteurId: formData.pasteurId }),
      });
      navigate(`/signup?${params.toString()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: BookOpen, title: 'Enseignement Biblique', description: 'Accédez à des ressources profondes pour bâtir votre foi sur le roc.' },
    { icon: Users, title: 'Communauté de Disciples', description: 'Connectez-vous avec d\'autres croyants pour grandir ensemble.' },
    { icon: Heart, title: 'Croissance Spirituelle', description: 'Suivez votre progression et voyez votre impact spirituel grandir.' },
    { icon: Star, title: 'Formation Impact X', description: 'Devenez un leader influent dans votre sphère d\'action.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950/60 via-[#0f0518] to-purple-950/60 text-white relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/25 rounded-full blur-[100px]" />
      <div className="absolute top-[40%] left-[-15%] w-[400px] h-[400px] bg-fuchsia-600/15 rounded-full blur-[80px]" />
      <div className="absolute bottom-[20%] right-[-15%] w-[350px] h-[350px] bg-purple-500/20 rounded-full blur-[90px]" />

      {/* Étape 1 : Formulaire simplifié */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg mx-auto"
        >
          {/* En-tête : icône + titre DiscipleLife (identique à l'image) */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-purple-900/40 mb-4">
              <span className="text-white font-bold text-2xl">DL</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">DiscipleLife</h1>
            <p className="text-white mt-2">Votre compagnon de croissance spirituelle</p>
            <p className="text-fuchsia-400 mt-4 text-sm font-medium">Étape 1 – Inscription simplifiée</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-[#1a0b2e]/80 backdrop-blur border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl"
          >
            {/* 1. Choix de la famille (en premier) */}
            {formData.role !== 'superviseur' ? (
              <div className="space-y-2 mb-4">
                <Label className="text-gray-300">Famille *</Label>
                <Select
                  value={formData.familleId}
                  onValueChange={(v) => {
                    setFormData((prev) => ({ ...prev, familleId: v }));
                    if (errors.familleId) setErrors((prev) => ({ ...prev, familleId: '' }));
                  }}
                  disabled={loadingFamilles}
                >
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Choisir une famille" />
                  </SelectTrigger>
                  <SelectContent>
                    {familles.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.familleId && <p className="text-sm text-red-400">{errors.familleId}</p>}
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                <Label className="text-gray-300">Pasteur de tutelle *</Label>
                <Select
                  value={formData.pasteurId}
                  onValueChange={(v) => {
                    setFormData((prev) => ({ ...prev, pasteurId: v }));
                    if (errors.pasteurId) setErrors((prev) => ({ ...prev, pasteurId: '' }));
                  }}
                >
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Choisir un pasteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {pasteurs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {[p.first_name, p.last_name].filter(Boolean).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.pasteurId && <p className="text-sm text-red-400">{errors.pasteurId}</p>}
              </div>
            )}

            {/* 2. Rôle (pour superviseur = Pasteur affiché ci-dessus) */}
            <div className="space-y-2 mb-4">
              <Label className="text-gray-300">Je suis</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => {
                  setFormData((prev) => ({ ...prev, role: v, familleId: '', pasteurId: '' }));
                  setErrors({});
                }}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disciple">Disciple</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="superviseur">Superviseur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Prénom, Nom */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Prénom *</Label>
                <Input
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder="Prénom"
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                  disabled={submitting}
                />
                {errors.prenom && <p className="text-sm text-red-400">{errors.prenom}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Nom *</Label>
                <Input
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Nom"
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                  disabled={submitting}
                />
                {errors.nom && <p className="text-sm text-red-400">{errors.nom}</p>}
              </div>
            </div>

            {/* Email (1 seule fois) */}
            <div className="space-y-2 mb-4">
              <Label className="text-gray-300">Email *</Label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                disabled={submitting}
              />
              {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
            </div>

            {/* Mot de passe */}
            <div className="space-y-2 mb-4">
              <Label className="text-gray-300">Mot de passe *</Label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 pr-10"
                  disabled={submitting}
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
              {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
            </div>

            {/* Confirmation mot de passe */}
            <div className="space-y-2 mb-6">
              <Label className="text-gray-300">Confirmation mot de passe *</Label>
              <div className="relative">
                <Input
                  name="passwordConfirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  placeholder="Confirmez votre mot de passe"
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 pr-10"
                  disabled={submitting}
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
              {errors.passwordConfirm && <p className="text-sm text-red-400">{errors.passwordConfirm}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6"
              disabled={submitting || loadingFamilles}
            >
              Continuer
            </Button>

            <div className="mt-6 text-center space-y-2 pt-2">
              <p className="text-sm text-slate-400">
                <Link to="/forgot-password" className="text-fuchsia-400 hover:text-fuchsia-300 hover:underline font-medium">Mot de passe oublié ?</Link>
              </p>
              <p className="text-sm text-slate-400">
                Pas encore inscrit ? <Link to="/signup" className="text-fuchsia-400 hover:text-fuchsia-300 hover:underline font-medium">S'inscrire</Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Features (compact) */}
      <div className="py-12 bg-[#1a0b2e]/30 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="bg-[#1a0b2e]/50 border border-white/10 p-4 rounded-xl text-center"
                >
                  <Icon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="bg-[#0f0518]/80 py-6 border-t border-white/10 relative z-10 text-center">
        <p className="text-gray-500 text-sm">© 2024 DiscipleLife. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default HomePage;
