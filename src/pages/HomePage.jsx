import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Users, Heart, Star, UserCircle, UserCheck, Church } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLES = [
  { value: 'pasteur', label: 'Pasteur Référent de Famille', icon: Church, color: 'bg-purple-600 hover:bg-purple-700' },
  { value: 'superviseur', label: 'Je suis Superviseur', icon: Star, color: 'bg-orange-500 hover:bg-orange-600' },
  { value: 'mentor', label: 'Je suis Mentor', icon: UserCheck, color: 'bg-blue-600 hover:bg-blue-700' },
  { value: 'disciple', label: 'Je suis Disciple', icon: UserCircle, color: 'bg-teal-600 hover:bg-teal-700' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState('disciple');
  const [formData, setFormData] = useState({
    role: 'disciple',
    familleId: '',
    pasteurId: '',
    prenom: '',
    nom: '',
    email: '',
    emailConfirm: '',
  });
  const [errors, setErrors] = useState({});
  const [familles, setFamilles] = useState([]);
  const [pasteurs, setPasteurs] = useState([]);
  const [loadingFamilles, setLoadingFamilles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [codeInvitation, setCodeInvitation] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [showInvitationRequired, setShowInvitationRequired] = useState(null); // 'disciple' | 'mentor' | 'superviseur' | null

  useEffect(() => {
    const load = async () => {
      const { data: f } = await supabase.from('familles_disciples').select('id, nom').order('nom');
      setFamilles(f || []);
      const { data: p } = await supabase.from('profils').select('id, first_name, last_name').eq('role', 'pasteur').order('last_name');
      setPasteurs(p || []);
      setLoadingFamilles(false);
    };
    load();
  }, []);

  const handleRoleClick = (role) => {
    if (role === 'pasteur') {
      navigate('/auth');
      return;
    }
    if (role === 'disciple' || role === 'mentor' || role === 'superviseur') {
      setSelectedRole(role);
      setShowForm(false);
      setShowInvitationRequired(role);
      setCodeError('');
      return;
    }
    setSelectedRole(role);
    setFormData((prev) => ({ ...prev, role, familleId: '', pasteurId: '' }));
    setShowForm(true);
    setShowInvitationRequired(null);
    setErrors({});
  };

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
    if (!formData.emailConfirm?.trim()) newErrors.emailConfirm = 'La confirmation email est requise.';
    else if (formData.email !== formData.emailConfirm) newErrors.emailConfirm = 'Les emails ne correspondent pas.';
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
        email: formData.email.trim(),
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
      const lienFinal = token ? `${window.location.origin}/signup?token=${token}` : `${window.location.origin}/signup`;

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

  const handleBack = () => {
    setShowForm(false);
    setShowInvitationRequired(null);
    setErrors({});
  };

  const handleValiderCode = async () => {
    const code = codeInvitation?.trim();
    if (!code) return;
    setValidatingCode(true);
    setCodeError('');
    try {
      const { data, error } = await supabase.rpc('valider_code_invitation', { p_code: code });
      if (error) throw error;
      const row = Array.isArray(data) && data[0] ? data[0] : data;
      if (row?.token) {
        navigate(`/inscription/${row.token}`, { replace: true });
      } else {
        setCodeError('Code invalide ou expiré.');
        toast({ variant: 'destructive', title: 'Code invalide', description: 'Ce code d\'invitation est invalide ou a expiré.' });
      }
    } catch (err) {
      setCodeError(err.message || 'Code invalide ou expiré.');
      toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Code invalide ou expiré.' });
    } finally {
      setValidatingCode(false);
    }
  };

  const features = [
    { icon: BookOpen, title: 'Enseignement Biblique', description: 'Accédez à des ressources profondes pour bâtir votre foi sur le roc.' },
    { icon: Users, title: 'Communauté de Disciples', description: 'Connectez-vous avec d\'autres croyants pour grandir ensemble.' },
    { icon: Heart, title: 'Croissance Spirituelle', description: 'Suivez votre progression et voyez votre impact spirituel grandir.' },
    { icon: Star, title: 'Formation Impact X', description: 'Devenez un leader influent dans votre sphère d\'action.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-950/60 via-[#0f0518] to-purple-950/60 text-white relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/25 rounded-full blur-[100px]" />
      <div className="absolute top-[40%] left-[-15%] w-[400px] h-[400px] bg-fuchsia-600/15 rounded-full blur-[80px]" />
      <div className="absolute bottom-[20%] right-[-15%] w-[350px] h-[350px] bg-purple-500/20 rounded-full blur-[90px]" />

      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          {/* En-tête : Bienvenue Dans les Familles de Disciples 70 */}
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
              Bienvenue Dans les Familles de{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Disciples 70</span>
            </h1>
            <p className="text-white/90 mt-6 max-w-2xl mx-auto text-base md:text-lg">
              Bienvenue sur DiscipleLife. Une plateforme dédiée à votre transformation spirituelle. Apprenez, grandissez et formez d'autres disciples à l'image de Christ.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {showInvitationRequired ? (
              /* Mentor ou Superviseur : invitation obligatoire */
              <motion.div
                key="invitation-required"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-lg mx-auto bg-[#1a0b2e]/80 backdrop-blur border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-fuchsia-400 text-sm font-medium">
                    <span className="text-white/60 mr-2">Étape 1/3</span>
                    {showInvitationRequired === 'disciple' ? 'Devenir Disciple' : showInvitationRequired === 'mentor' ? 'Devenir Mentor' : 'Devenir Superviseur'}
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={handleBack} className="text-gray-400 hover:text-white">
                    Retour
                  </Button>
                </div>
                <p className="text-white/90">
                  {showInvitationRequired === 'disciple'
                    ? 'Pour devenir Disciple, vous devez être invité par votre mentor. Utilisez le lien reçu par email, ou saisissez votre code d\'invitation ci-dessous.'
                    : showInvitationRequired === 'mentor'
                    ? 'Pour devenir Mentor, vous devez être invité par un superviseur. Utilisez le lien reçu par email, ou saisissez votre code d\'invitation ci-dessous.'
                    : 'Pour devenir Superviseur, vous devez être invité par un pasteur. Utilisez le lien reçu par email, ou saisissez votre code d\'invitation ci-dessous.'}
                </p>
                <div className="space-y-2">
                  <Label className="text-gray-300">Code d'invitation</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: ABC12DEF"
                      value={codeInvitation}
                      onChange={(e) => { setCodeInvitation(e.target.value); setCodeError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleValiderCode()}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 uppercase"
                      disabled={validatingCode}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleValiderCode}
                      disabled={validatingCode || !codeInvitation?.trim()}
                      className="shrink-0"
                    >
                      {validatingCode ? '...' : 'Valider'}
                    </Button>
                  </div>
                  {codeError && <p className="text-sm text-red-400">{codeError}</p>}
                </div>
                <p className="text-sm text-white/60">
                  Vous n'avez pas de code ? Contactez votre {showInvitationRequired === 'disciple' ? 'mentor' : showInvitationRequired === 'mentor' ? 'superviseur' : 'pasteur'} pour obtenir une invitation.
                </p>
              </motion.div>
            ) : !showForm ? (
              /* Vue d'accueil : boutons des rôles */
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8 mt-32"
              >
                {/* Code d'invitation (optionnel) */}
                <div className="max-w-md mx-auto space-y-2">
                  <Label className="text-white/80 text-sm">Vous avez un code d'invitation ?</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: ABC12DEF"
                      value={codeInvitation}
                      onChange={(e) => { setCodeInvitation(e.target.value); setCodeError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleValiderCode()}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 uppercase"
                      disabled={validatingCode}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleValiderCode}
                      disabled={validatingCode || !codeInvitation?.trim()}
                      className="shrink-0"
                    >
                      {validatingCode ? '...' : 'Valider'}
                    </Button>
                  </div>
                  {codeError && <p className="text-sm text-red-400">{codeError}</p>}
                </div>

                <div className="flex flex-nowrap justify-center gap-3 w-full">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => handleRoleClick(r.value)}
                        className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base md:text-lg font-semibold transition-all shadow-lg whitespace-nowrap shrink-0 ${r.color} text-white`}
                      >
                        <Icon className="w-7 h-7" />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-white/80 text-base md:text-lg">
                  Déjà un compte ? <Link to="/auth" className="text-fuchsia-400 hover:text-fuchsia-300 hover:underline font-medium">Se connecter</Link>
                </p>
              </motion.div>
            ) : (
              /* Formulaire simplifié (Étape 1) - apparaît au clic sur un rôle */
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="max-w-lg mx-auto bg-[#1a0b2e]/80 backdrop-blur border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <p className="text-fuchsia-400 text-sm font-medium">Étape 1 – Inscription simplifiée</p>
                  <Button type="button" variant="ghost" size="sm" onClick={handleBack} className="text-gray-400 hover:text-white">
                    Retour
                  </Button>
                </div>

                {/* Famille ou Pasteur */}
                {formData.role !== 'superviseur' ? (
                  <div className="space-y-2 mb-4">
                    <Label className="text-gray-300">Famille *</Label>
                    <Select value={formData.familleId} onValueChange={(v) => { setFormData((prev) => ({ ...prev, familleId: v })); if (errors.familleId) setErrors((prev) => ({ ...prev, familleId: '' })); }} disabled={loadingFamilles}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Choisir une famille" />
                      </SelectTrigger>
                      <SelectContent>
                        {familles.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.familleId && <p className="text-sm text-red-400">{errors.familleId}</p>}
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    <Label className="text-gray-300">Pasteur de tutelle *</Label>
                    <Select value={formData.pasteurId} onValueChange={(v) => { setFormData((prev) => ({ ...prev, pasteurId: v })); if (errors.pasteurId) setErrors((prev) => ({ ...prev, pasteurId: '' })); }}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Choisir un pasteur" />
                      </SelectTrigger>
                      <SelectContent>
                        {pasteurs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{[p.first_name, p.last_name].filter(Boolean).join(' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.pasteurId && <p className="text-sm text-red-400">{errors.pasteurId}</p>}
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <Label className="text-gray-300">Je suis</Label>
                  <Select value={formData.role} onValueChange={(v) => { setFormData((prev) => ({ ...prev, role: v, familleId: '', pasteurId: '' })); setErrors({}); }}>
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

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Prénom *</Label>
                    <Input name="prenom" value={formData.prenom} onChange={handleChange} placeholder="Prénom" className="bg-white/5 border-white/20 text-white placeholder:text-gray-500" disabled={submitting} />
                    {errors.prenom && <p className="text-sm text-red-400">{errors.prenom}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Nom *</Label>
                    <Input name="nom" value={formData.nom} onChange={handleChange} placeholder="Nom" className="bg-white/5 border-white/20 text-white placeholder:text-gray-500" disabled={submitting} />
                    {errors.nom && <p className="text-sm text-red-400">{errors.nom}</p>}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <Label className="text-gray-300">Email *</Label>
                  <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="votre@email.com" className="bg-white/5 border-white/20 text-white placeholder:text-gray-500" disabled={submitting} />
                  {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
                </div>

                <div className="space-y-2 mb-6">
                  <Label className="text-gray-300">Confirmation email *</Label>
                  <Input name="emailConfirm" type="email" value={formData.emailConfirm} onChange={handleChange} placeholder="Confirmez votre email" className="bg-white/5 border-white/20 text-white placeholder:text-gray-500" disabled={submitting} />
                  {errors.emailConfirm && <p className="text-sm text-red-400">{errors.emailConfirm}</p>}
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6" disabled={submitting || loadingFamilles}>
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
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <section className="py-12 bg-[#1a0b2e]/30 relative z-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">Vision 2030 des Familles de Disciples</h2>
          <p className="text-white/80 text-center text-base md:text-lg mb-8 max-w-2xl mx-auto">
            <strong className="text-white">Matthieu 28:19</strong>{' '}
            «&nbsp;Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit&nbsp;»
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="bg-[#1a0b2e]/60 border border-white/10 p-6 rounded-xl text-center"
                >
                  <Icon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm md:text-base text-white/70">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="mt-auto bg-[#0f0518]/80 py-6 border-t border-white/10 relative z-10 text-center">
        <p className="text-gray-500 text-sm">© 2024 DiscipleLife. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default HomePage;
