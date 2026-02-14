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
  disciple: 'Disciple',
  mentor: 'Mentor',
  superviseur: 'Superviseur',
};

export const InvitationModal = ({
  open,
  onOpenChange,
  typeRole,
  familles = [],
  titre,
  description,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [familleId, setFamilleId] = useState('');
  const [emailInvite, setEmailInvite] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const showFamilleSelect = typeRole === 'superviseur' ? true : familles.length > 0;
  const familleRequired = typeRole !== 'superviseur';

  const reset = () => {
    setFamilleId(familles.length === 1 ? familles[0].id : '');
    setEmailInvite('');
    setResult(null);
    setCopied(false);
  };

  useEffect(() => {
    if (open && familles.length === 1 && !familleId) {
      setFamilleId(familles[0].id);
    }
  }, [open, familles, familleId]);

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

    setLoading(true);
    setResult(null);
    try {
      const famId = familleId && familleId !== '__nouvelle__' ? familleId : null;
      const { data, error } = await supabase.rpc('creer_invitation_famille', {
        p_type_role: typeRole,
        p_famille_id: famId,
        p_email_invite: emailInvite?.trim() || null,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titre || `Inviter un ${ROLE_LABELS[typeRole] || typeRole}`}</DialogTitle>
          <DialogDescription>{description || `Créez un lien d'invitation pour un ${ROLE_LABELS[typeRole] || typeRole}. Partagez-le par email ou autre moyen.`}</DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {showFamilleSelect && (
              <div className="space-y-2">
                <Label>Famille {familleRequired && '*'}</Label>
                <Select value={familleId} onValueChange={setFamilleId} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder={typeRole === 'superviseur' ? 'Choisir (optionnel)' : 'Choisir une famille'} />
                  </SelectTrigger>
                  <SelectContent>
                    {typeRole === 'superviseur' && (
                      <SelectItem value="__nouvelle__">Nouvelle famille (à créer)</SelectItem>
                    )}
                    {familles.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Email de l'invité (optionnel)</Label>
              <Input
                type="email"
                placeholder="exemple@email.com"
                value={emailInvite}
                onChange={(e) => setEmailInvite(e.target.value)}
                disabled={loading}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création...</> : 'Créer l\'invitation'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lien d'invitation</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.lien} className="font-mono text-sm" />
                <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {result.code && (
              <p className="text-sm text-gray-600">Code : <strong>{result.code}</strong></p>
            )}
            <p className="text-sm text-gray-600">
              Envoyez ce lien à la personne invitée. Elle pourra s'inscrire en cliquant dessus.
            </p>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Fermer</Button>
              <Button variant="outline" onClick={() => { reset(); setResult(null); }}>
                Créer une autre invitation
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
