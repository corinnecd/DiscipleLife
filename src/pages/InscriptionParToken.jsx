import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const ROLE_LABELS = {
  disciple: 'Disciple',
  mentor: 'Mentor',
  superviseur: 'Superviseur',
};

/**
 * Page d'inscription par token (Étape 1 du flux invitation)
 * Accessible via /inscription/:token
 * Formulaire simplifié : Famille, Prénom, Nom, Email, Confirmation Email
 */
const InscriptionParToken = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    emailConfirm: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Valider le token au chargement
  useEffect(() => {
    if (!token) {
      setError('Lien d\'invitation invalide.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('valider_invitation_token', {
          p_token: token,
        });

        if (cancelled) return;

        if (rpcError) {
          setError('Erreur lors de la vérification du lien.');
          return;
        }

        if (!data || data.length === 0) {
          setError('Ce lien a expiré ou a déjà été utilisé.');
          return;
        }

        setInvitation(data[0]);
        if (data[0].email_invite) {
          setFormData((prev) => ({ ...prev, email: data[0].email_invite, emailConfirm: data[0].email_invite }));
        }
      } catch (err) {
        if (!cancelled) setError('Une erreur est survenue.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.prenom?.trim()) newErrors.prenom = 'Le prénom est requis.';
    if (!formData.nom?.trim()) newErrors.nom = 'Le nom est requis.';
    if (!formData.email?.trim()) newErrors.email = "L'email est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email invalide.';
    if (formData.email !== formData.emailConfirm) {
      newErrors.emailConfirm = "Les emails ne correspondent pas.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const p_data = {
        role: invitation?.type_role,
        prenom: formData.prenom?.trim(),
        nom: formData.nom?.trim(),
        familleId: invitation?.famille_id || null,
        invitationId: invitation?.id,
      };

      const { data: rpcData, error: rpcError } = await supabase.rpc('creer_lien_inscription_step1', {
        p_email: formData.email.trim().toLowerCase(),
        p_data,
      });

      if (rpcError) throw rpcError;

      const row = Array.isArray(rpcData) && rpcData[0] ? rpcData[0] : rpcData;
      const signupToken = row?.token;
      const lienFinal = signupToken ? `${window.location.origin}/signup?token=${signupToken}` : `${window.location.origin}/signup`;

      try {
        await supabase.functions.invoke('send-inscription-email', {
          body: {
            email: formData.email.trim(),
            lien: lienFinal,
            prenom: formData.prenom,
            nom: formData.nom,
          },
        });
      } catch (emailErr) {
        console.warn('Envoi email:', emailErr);
      }

      sessionStorage.setItem('signup_step1', JSON.stringify({ ...p_data, email: formData.email.trim() }));

      toast({
        title: 'Étape 1 terminée',
        description: 'Un email vous a été envoyé. Redirection vers le formulaire complet...',
      });

      navigate(`/signup?token=${signupToken || ''}`, { replace: true });
    } catch (err) {
      const msg = err.message || 'Une erreur est survenue. Vous pouvez réessayer ou continuer vers le formulaire.';
      setErrors({ form: msg });
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-slate-600">Vérification du lien d'invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Lien invalide</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Se connecter
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <p className="text-sm font-medium text-fuchsia-600 mb-2">Étape 2/3</p>
            <h1 className="text-2xl font-bold text-slate-900">Inscription</h1>
            <p className="text-slate-600 mt-1">
              Vous avez été invité à rejoindre en tant que <strong>{ROLE_LABELS[invitation?.type_role] || invitation?.type_role}</strong>
              {invitation?.famille_nom && (
                <> – Famille <strong>{invitation.famille_nom}</strong></>
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.form && (
              <Alert variant="destructive" className="space-y-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.form}</AlertDescription>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const payload = { role: invitation?.type_role, prenom: formData.prenom, nom: formData.nom, email: formData.email, familleId: invitation?.famille_id };
                    sessionStorage.setItem('signup_step1', JSON.stringify(payload));
                    const params = new URLSearchParams({ role: invitation?.type_role || '', prenom: formData.prenom || '', nom: formData.nom || '', email: formData.email || '', ...(invitation?.famille_id && { familleId: invitation.famille_id }) });
                    navigate(`/signup?${params.toString()}`);
                  }}
                >
                  Continuer vers le formulaire
                </Button>
              </Alert>
            )}

            {invitation?.famille_nom && (
              <div className="space-y-2">
                <Label>Famille</Label>
                <Input value={invitation.famille_nom} disabled className="bg-slate-50" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder="Prénom"
                  className={errors.prenom ? 'border-red-500' : ''}
                  disabled={submitting}
                />
                {errors.prenom && <p className="text-sm text-red-600">{errors.prenom}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Nom"
                  className={errors.nom ? 'border-red-500' : ''}
                  disabled={submitting}
                />
                {errors.nom && <p className="text-sm text-red-600">{errors.nom}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                className={errors.email ? 'border-red-500' : ''}
                disabled={submitting}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailConfirm">Confirmation email *</Label>
              <Input
                id="emailConfirm"
                name="emailConfirm"
                type="email"
                value={formData.emailConfirm}
                onChange={handleChange}
                placeholder="Confirmez votre email"
                className={errors.emailConfirm ? 'border-red-500' : ''}
                disabled={submitting}
              />
              {errors.emailConfirm && <p className="text-sm text-red-600">{errors.emailConfirm}</p>}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Continuer'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 space-y-2 text-center text-sm">
            <p>
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="text-primary hover:underline font-medium"
              >
                Se connecter
              </button>
            </p>
            <p>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-slate-500 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default InscriptionParToken;
