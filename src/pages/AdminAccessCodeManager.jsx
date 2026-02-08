
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Copy,
  Key
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Helmet } from 'react-helmet';

const AdminAccessCodeManager = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'group',
    target_id: '',
    max_uses: '10',
    expires_at: ''
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      handleError(error, { context: 'fetchCodes' }, "Impossible de charger les codes.");
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.code) return;

    setCreating(true);
    try {
      const payload = {
        code: formData.code,
        description: formData.description,
        type: formData.type,
        target_id: formData.target_id || null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('access_codes')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setCodes([data, ...codes]);
      setIsModalOpen(false);
      setFormData({
        code: '',
        description: '',
        type: 'group',
        target_id: '',
        max_uses: '10',
        expires_at: ''
      });
      
      toast({ title: "Code créé", description: `Le code ${data.code} est actif.` });

    } catch (error) {
      handleError(error, { context: 'handleCreate' }, "Impossible de créer le code.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce code ? Cette action est irréversible.")) return;
    
    try {
      const { error } = await supabase.from('access_codes').delete().eq('id', id);
      if (error) throw error;
      setCodes(prev => prev.filter(c => c.id !== id));
      toast({ description: "Code supprimé." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer." });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copié dans le presse-papier" });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Helmet>
        <title>Gestion Codes d'accès | Admin</title>
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Codes d'accès</h1>
          <p className="text-slate-500">Gérez les codes promotionnels et d'invitation.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Créer un code
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Utilisations</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Key className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-700">Aucun code d'accès créé</h3>
                      <p className="text-sm mt-1">Créez un code pour inviter des utilisateurs.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-bold text-slate-800">
                    {code.code}
                  </TableCell>
                  <TableCell>{code.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{code.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                       <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full ${code.uses_count >= code.max_uses ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${Math.min(100, (code.uses_count / (code.max_uses || 1)) * 100)}%` }} 
                          />
                       </div>
                       <span>{code.uses_count} / {code.max_uses || '∞'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {code.expires_at ? format(new Date(code.expires_at), 'dd/MM/yyyy', { locale: fr }) : 'Jamais'}
                  </TableCell>
                  <TableCell>
                     {code.is_active ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Actif</Badge>
                     ) : (
                        <Badge variant="secondary">Inactif</Badge>
                     )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Button variant="ghost" size="icon" onClick={() => copyToClipboard(code.code)} aria-label="Copier le code">
                          <Copy className="h-4 w-4 text-slate-400" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDelete(code.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50" aria-label="Supprimer">
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Code Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Créer un nouveau code</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
             <div className="flex gap-2 items-end">
                <div className="space-y-2 flex-1">
                   <label className="text-sm font-medium">Code (Unique)</label>
                   <Input 
                      placeholder="EX: PROMO2025" 
                      value={formData.code} 
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      required
                   />
                </div>
                <Button type="button" variant="outline" onClick={generateRandomCode} title="Générer aléatoire">
                   <RefreshCw className="h-4 w-4" />
                </Button>
             </div>

             <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                   <SelectTrigger>
                      <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="group">Rejoindre un Groupe</SelectItem>
                      <SelectItem value="module">Débloquer Module</SelectItem>
                      <SelectItem value="role">Assigner Rôle (Mentor)</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                   </SelectContent>
                </Select>
             </div>
             
             {formData.type === 'group' && (
                <div className="space-y-2">
                   <label className="text-sm font-medium">ID du Groupe (UUID)</label>
                   <Input 
                      placeholder="e.g. 550e8400-e29b..." 
                      value={formData.target_id}
                      onChange={e => setFormData({...formData, target_id: e.target.value})}
                   />
                </div>
             )}

             <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input 
                   placeholder="Note interne..." 
                   value={formData.description}
                   onChange={e => setFormData({...formData, description: e.target.value})}
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-sm font-medium">Max utilisations</label>
                   <Input 
                      type="number" 
                      min="1"
                      value={formData.max_uses}
                      onChange={e => setFormData({...formData, max_uses: e.target.value})}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium">Expiration (Optionnel)</label>
                   <Input 
                      type="date" 
                      value={formData.expires_at}
                      onChange={e => setFormData({...formData, expires_at: e.target.value})}
                   />
                </div>
             </div>

             <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={creating}>
                   {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                   Créer le code
                </Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAccessCodeManager;
