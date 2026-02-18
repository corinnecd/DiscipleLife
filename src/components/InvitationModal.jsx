/**
 * Modal réutilisable pour créer une invitation (disciple, mentor, superviseur).
 * Appelle creer_invitation_famille et affiche le lien à copier/envoyer.
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const ROLE_LABELS = {
  pasteur: 'Pasteur Référent de Famille',
  superviseur: 'Superviseur',
  mentor: 'Mentor',
  disciple: 'Disciple',
  pilier: 'Pilier',
};

const SELECT_DROPDOWN_CLASS = 'z-[200] bg-gray-100 text-black border-gray-300 [&_[data-highlighted]]:bg-gray-200 [&_[data-highlighted]]:text-black';

const ROLES_FOR_ADMIN = ['pasteur', 'superviseur', 'mentor', 'disciple'];

export const InvitationModal = ({
  open,
  onOpenChange,
  typeRole,
  familles = [],
  famillesSansSuperviseur = [],
  toutesFamilles = [],
  titre,
  description,
  onSuccess,
  allowRoleSelect = false,
  isAdmin = false,
}) => {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState(typeRole || 'superviseur');
  const [familleId, setFamilleId] = useState('');
  const [nomNouvelleFamille, setNomNouvelleFamille] = useState('');
  const [emailInvite, setEmailInvite] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const effectiveTypeRole = allowRoleSelect ? selectedRole : typeRole;
  const useToutesFamilles = allowRoleSelect && isAdmin && (effectiveTypeRole === 'superviseur' || effectiveTypeRole === 'mentor' || effectiveTypeRole === 'disciple');
  const famillesForRole = useToutesFamilles ? toutesFamilles : (effectiveTypeRole === 'superviseur' ? famillesSansSuperviseur : familles);
  const showFamilleSelect = effectiveTypeRole === 'superviseur' ? true : (effectiveTypeRole !== 'pasteur' && (useToutesFamilles ? toutesFamilles.length > 0 : familles.length > 0));
  const familleRequired = effectiveTypeRole === 'superviseur' || (effectiveTypeRole !== 'pasteur' && (useToutesFamilles ? true : familles.length > 0));
  const isNouvelleFamille = familleId === '__nouvelle__';

  const reset = () => {
    setSelectedRole(typeRole || 'superviseur');
    setFamilleId('');
    setNomNouvelleFamille('');
    setEmailInvite('');
    setResult(null);
    setCopied(false);
  };

  useEffect(() => {
    if (!open) return;
    if (allowRoleSelect) setSelectedRole(typeRole || 'superviseur');
  }, [open, typeRole, allowRoleSelect]);

  useEffect(() => {
    if (!open) return;
    const list = useToutesFamilles ? toutesFamilles : (effectiveTypeRole === 'superviseur' ? famillesSansSuperviseur : familles);
    if (useToutesFamilles) {
      setFamilleId(list.length === 0 ? '__nouvelle__' : '');
    } else if (effectiveTypeRole === 'superviseur') {
      setFamilleId(list.length === 1 ? list[0].id : list.length === 0 ? '__nouvelle__' : '');
    } else {
      setFamilleId(list.length === 1 ? list[0].id : '');
    }
  }, [open, effectiveTypeRole, familles, famillesSansSuperviseur, toutesFamilles, useToutesFamilles]);

  const handleClose = (open) => {
    if (!open) reset();
    onOpenChange?.(open);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (familleRequired && !familleId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner une famille.' });
      return;
    }
    if (isNouvelleFamille && !nomNouvelleFamille?.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez renseigner le nom de la nouvelle famille.' });
      return;
    }
    if (!emailInvite?.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Veuillez renseigner l'email de l'invité." });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const famId = familleId && familleId !== '__nouvelle__' ? familleId : null;
      const nomFamille = isNouvelleFamille ? nomNouvelleFamille?.trim() || null : null;
      const { data, error } = await supabase.rpc('creer_invitation_famille', {
        p_type_role: effectiveTypeRole,
        p_famille_id: famId,
        p_email_invite: emailInvite?.trim() || null,
        p_nom_nouvelle_famille: nomFamille,
      });

      if (error) throw error;

      const row = Array.isArray(data) && data[0] ? data[0] : data;
      const lienComplet = row?.token ? `${window.location.origin}/inscription/${row.token}` : null;
      setResult({ token: row?.token, code: row?.code, lien: lienComplet });
      onSuccess?.();
      toast({
        title: 'Invitation créée',
        description: 'Partagez le lien ci-dessous avec la personne à inviter.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.message || 'Impossible de créer l\'invitation.',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!result?.lien) return;
    navigator.clipboard.writeText(result.lien);
    setCopied(true);
    toast({ title: 'Lien copié', description: 'Le lien a été copié dans le presse-papiers.' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl w-[95vw] p-8 gap-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl">{allowRoleSelect ? 'Créer une invitation' : (titre || `Inviter un ${ROLE_LABELS[effectiveTypeRole] || effectiveTypeRole}`)}</DialogTitle>
          <DialogDescription className="text-base">{allowRoleSelect ? 'Choisissez le rôle à inviter puis la famille si nécessaire.' : (description || `Créez un lien d'invitation pour un ${ROLE_LABELS[effectiveTypeRole] || effectiveTypeRole}. Partagez-le par email ou autre moyen.`)}</DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {allowRoleSelect && (
              <div className="space-y-2">
                <Label className="text-base">Rôle à inviter *</Label>
                <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); setFamilleId(''); }} disabled={loading}>
                  <SelectTrigger className="h-12 text-base bg-gray-100 text-black placeholder:text-gray-600">
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent className={SELECT_DROPDOWN_CLASS}>
                    {ROLES_FOR_ADMIN.map((r) => (
                      <SelectItem key={r} value={r} className="text-black focus:bg-gray-200 focus:text-black data-[highlighted]:bg-gray-200 data-[highlighted]:text-black">{ROLE_LABELS[r] || r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showFamilleSelect && (
              <div className="space-y-2">
                <Label className="text-base">Famille {familleRequired && '*'}</Label>
                <Select value={familleId || ''} onValueChange={(v) => { setFamilleId(v); setNomNouvelleFamille(''); }} disabled={loading}>
                  <SelectTrigger className="h-12 text-base bg-gray-100 text-black placeholder:text-gray-600">
                    <SelectValue placeholder={useToutesFamilles ? 'Nouvelle famille ou choisir une famille existante' : (effectiveTypeRole === 'superviseur' ? 'Choisir une famille ou Nouvelle famille' : 'Choisir une famille')} />
                  </SelectTrigger>
                  <SelectContent className={SELECT_DROPDOWN_CLASS}>
                    {(effectiveTypeRole === 'superviseur' || useToutesFamilles) && (
                      <SelectItem value="__nouvelle__" className="text-black focus:bg-gray-200 focus:text-black data-[highlighted]:bg-gray-200 data-[highlighted]:text-black">Nouvelle famille</SelectItem>
                    )}
                    {famillesForRole.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="text-black focus:bg-gray-200 focus:text-black data-[highlighted]:bg-gray-200 data-[highlighted]:text-black">{f.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isNouvelleFamille && (
                  <div className="pt-2">
                    <Label className="text-base">Nom de la nouvelle famille *</Label>
                    <Input
                      placeholder="Ex: Les Vaillants"
                      value={nomNouvelleFamille}
                      onChange={(e) => setNomNouvelleFamille(e.target.value)}
                      disabled={loading}
                      className="h-12 text-base bg-gray-100 text-black placeholder:text-gray-600 mt-1"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-base">Email de l'invité *</Label>
              <Input
                type="email"
                placeholder="exemple@email.com"
                value={emailInvite}
                onChange={(e) => setEmailInvite(e.target.value)}
                disabled={loading}
                className="h-12 text-base bg-gray-100 text-black placeholder:text-gray-600"
              />
            </div>

            <DialogFooter className="gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading} className="h-11 px-6 text-base bg-gray-100 text-black border-gray-300 hover:bg-gray-200 hover:text-black">
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="h-11 px-6 text-base">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création...</> : 'Créer l\'invitation'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-base">Lien d'invitation</Label>
              <div className="flex gap-3">
                <Input readOnly value={result.lien} className="font-mono text-base h-12 bg-gray-100 text-black py-3" />
                <Button type="button" variant="outline" size="icon" onClick={copyLink} className="h-12 w-12 bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200 hover:text-gray-900">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {result.code && (
              <p className="text-base text-gray-700">Code : <strong className="text-lg">{result.code}</strong></p>
            )}
            <p className="text-base text-gray-700">
              Envoyez ce lien à la personne invitée. Elle pourra s'inscrire en cliquant dessus.
            </p>
            <DialogFooter className="gap-3 pt-2">
              <Button onClick={() => handleClose(false)} className="h-11 px-6 text-base bg-purple-600 hover:bg-purple-700 text-white">Fermer</Button>
              <Button variant="outline" onClick={() => { reset(); setResult(null); }} className="h-11 px-6 text-base bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200 hover:text-gray-900">
                Créer une autre invitation
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
