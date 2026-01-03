import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserPlus, Phone, Mail, Calendar, Trash2, Edit2, Search, X, MessageSquare, MapPin, Heart, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const Evangelization = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  
  // Edit State
  const [editingId, setEditingId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    ville: '',
    confession: '',
    evangelization_date: new Date().toISOString().split('T')[0],
    follow_up_1: '',
    follow_up_2: '',
    comments: '',
    accepted_christ: false
  });

  useEffect(() => {
    if (user) {
      fetchEvangelizedPeople();
    }
  }, [user, isAdmin]);

  const fetchEvangelizedPeople = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('personnes_evangelisees')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
          query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger la liste des personnes évangélisées.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openEditDialog = (person) => {
    setEditingId(person.id);
    setFormData({
      prenom: person.prenom || '',
      nom: person.nom || '',
      telephone: person.telephone || '',
      email: person.email || '',
      ville: person.ville || '',
      evangelization_date: person.date_evangelisation || '',
      follow_up_1: person.date_suivi_1 || '',
      follow_up_2: person.date_suivi_2 || '',
      comments: person.comments || '',
      accepted_christ: person.accepted_christ || false
    });
    setIsDialogOpen(true);
  };

  const handleDialogChange = (open) => {
    setIsDialogOpen(open);
    if (!open) {
      // Reset form when closing
      setEditingId(null);
      setFormData({
        prenom: '',
        nom: '',
        telephone: '',
        email: '',
        ville: '',
        confession: '',
        evangelization_date: new Date().toISOString().split('T')[0],
        follow_up_1: '',
        follow_up_2: '',
        comments: '',
        accepted_christ: false
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.prenom) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le prénom est obligatoire.",
      });
      return;
    }

    try {
      const payload = {
        user_id: user.id, // Keep the user ID of whoever is creating/editing
        prenom: formData.prenom,
        nom: formData.nom,
        telephone: formData.telephone,
        ville: formData.ville,
        email: formData.email,
        date_evangelisation: formData.evangelization_date || null,
        date_suivi_1: formData.follow_up_1 || null,
        date_suivi_2: formData.follow_up_2 || null,
        comments: formData.comments,
        accepted_christ: formData.accepted_christ,
        ...(editingId ? {} : { created_at: new Date().toISOString() }) // Only add created_at for new records
      };

      let error;
      
      if (editingId) {
        // Update existing
        const { error: updateError } = await supabase
          .from('personnes_evangelisees')
          .update(payload)
          .eq('id', editingId);
        error = updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('personnes_evangelisees')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Succès",
        description: editingId ? "Informations mises à jour." : "Personne ajoutée avec succès.",
      });
      handleDialogChange(false);
      fetchEvangelizedPeople();
    } catch (error) {
      console.error('Error saving person:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('personnes_evangelisees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPeople(people.filter(p => p.id !== id));
      setDeleteConfirmId(null);
      toast({
        title: "Supprimé",
        description: "Personne supprimée de la liste.",
      });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer.",
      });
    }
  };

  const filteredPeople = people.filter(p => 
    p.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.ville?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft size={24} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {isAdmin && <Shield className="text-yellow-500" size={24} />}
              Personnes Évangélisées
          </h1>
          <p className="text-gray-400">
             {isAdmin ? "Vue globale de toutes les âmes gagnées pour Christ par l'équipe." : "Suivi des âmes gagnées pour Christ."}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card/10 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <Input 
            placeholder="Rechercher..." 
            className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-offset-0 focus-visible:ring-teal-500/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white gap-2">
              <UserPlus size={18} />
              Ajouter une personne
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1b26] border-gray-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier le profil" : "Nouvelle personne évangélisée"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input id="prenom" name="prenom" value={formData.prenom} onChange={handleInputChange} className="bg-black/20 border-gray-700" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" name="nom" value={formData.nom} onChange={handleInputChange} className="bg-black/20 border-gray-700" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" name="telephone" type="tel" value={formData.telephone} onChange={handleInputChange} className="bg-black/20 border-gray-700" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="bg-black/20 border-gray-700" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ville">Ville</Label>
                <Input id="ville" name="ville" value={formData.ville} onChange={handleInputChange} className="bg-black/20 border-gray-700" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evangelization_date">Date d'évangélisation</Label>
                <Input id="evangelization_date" name="evangelization_date" type="date" value={formData.evangelization_date} onChange={handleInputChange} className="bg-black/20 border-gray-700" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="follow_up_1">Suivi 1 (Date)</Label>
                  <Input id="follow_up_1" name="follow_up_1" type="date" value={formData.follow_up_1} onChange={handleInputChange} className="bg-black/20 border-gray-700" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="follow_up_2">Suivi 2 (Date)</Label>
                  <Input id="follow_up_2" name="follow_up_2" type="date" value={formData.follow_up_2} onChange={handleInputChange} className="bg-black/20 border-gray-700" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Commentaire / Notes</Label>
                <Textarea 
                  id="comments" 
                  name="comments" 
                  value={formData.comments} 
                  onChange={handleInputChange} 
                  className="bg-black/20 border-gray-700 min-h-[80px]" 
                  placeholder="Notes personnelles sur la rencontre, sujets de prière, etc."
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mt-2">
                <input 
                    type="checkbox" 
                    id="accepted_christ"
                    name="accepted_christ"
                    checked={formData.accepted_christ}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-emerald-500/50 bg-transparent text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="accepted_christ" className="text-sm font-medium text-emerald-200 flex items-center gap-2 cursor-pointer select-none flex-1">
                    <Heart size={16} className={`text-emerald-500 ${formData.accepted_christ ? 'fill-emerald-500' : ''}`} /> 
                    A accepté Christ ?
                </label>
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogChange(false)} className="border-gray-700 hover:bg-gray-800 text-gray-300">Annuler</Button>
              <Button onClick={handleSubmit} className="bg-teal-600 hover:bg-teal-700">Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Comment Detail Dialog */}
        <Dialog open={!!selectedComment} onOpenChange={(open) => !open && setSelectedComment(null)}>
            <DialogContent className="bg-[#1a1b26] border-gray-800 text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle>Détails du commentaire</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Pour {selectedComment?.personName}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 whitespace-pre-wrap text-gray-200 leading-relaxed bg-black/20 p-4 rounded-lg border border-white/5">
                    {selectedComment?.text}
                </div>
                <DialogFooter>
                    <Button onClick={() => setSelectedComment(null)} className="bg-teal-600 hover:bg-teal-700">Fermer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        <AnimatePresence>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : filteredPeople.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-card/5 rounded-xl border border-white/5 border-dashed"
            >
              <div className="w-16 h-16 bg-card/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="text-gray-500" size={32} />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Aucune personne trouvée</h3>
              <p className="text-gray-400 max-w-sm mx-auto">Commencez à ajouter les personnes avec qui vous avez partagé l'Évangile.</p>
            </motion.div>
          ) : (
            filteredPeople.map((person) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1e293b]/40 border border-white/5 rounded-lg p-4 hover:bg-[#1e293b]/60 transition-colors group"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div 
                    className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openEditDialog(person)}
                    title="Cliquez pour modifier le profil"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center text-teal-400 font-bold text-sm shrink-0 border border-teal-500/20">
                      {person.prenom?.[0]}{person.nom?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-base font-bold text-white truncate hover:text-teal-400 transition-colors flex items-center gap-2">
                            {person.prenom} {person.nom}
                            <Edit2 size={10} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                        {person.ville && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 flex items-center gap-1 shrink-0"><MapPin size={10} /> {person.ville}</span>}
                        {person.date_evangelisation && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1 shrink-0">
                                <Calendar size={10} /> {new Date(person.date_evangelisation).toLocaleDateString('fr-FR')}
                            </span>
                        )}
                        {/* Admin Indicator */}
                        {isAdmin && person.user_id !== user.id && (
                             <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/10 shrink-0">
                                 Autre utilisateur
                             </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-y-1 gap-x-3 mt-1 text-xs text-gray-400">
                        {person.telephone && (
                          <div className="flex items-center gap-1">
                            <Phone size={12} className="text-gray-500" />
                            {person.telephone}
                          </div>
                        )}
                        {person.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={12} className="text-gray-500" />
                            {person.email}
                          </div>
                        )}
                      </div>
                      
                      {person.comments && (
                        <div 
                            className="mt-2 flex gap-2 text-xs text-gray-400 bg-black/20 p-1.5 rounded-md border border-white/5 max-w-md cursor-pointer hover:bg-black/30 hover:border-teal-500/30 transition-all group/comment"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent opening edit dialog
                                setSelectedComment({ text: person.comments, personName: `${person.prenom} ${person.nom || ''}` });
                            }}
                        >
                          <MessageSquare size={12} className="mt-0.5 shrink-0 text-teal-500/70 group-hover/comment:text-teal-400" />
                          <p className="italic text-gray-300 line-clamp-1">{person.comments}</p>
                        </div>
                      )}

                      <div className="mt-2">
                        {person.accepted_christ ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
                                <Heart size={10} className="fill-emerald-400" />
                                <span className="font-medium">A accepté Christ</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 px-2 py-0.5 w-fit opacity-60">
                                <span className="font-medium">N'a pas encore accepté</span>
                            </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-13 md:pl-0 border-t md:border-t-0 border-white/5 pt-3 md:pt-0 mt-2 md:mt-0">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 bg-black/20 px-4 py-2 rounded-lg border border-white/5 text-xs">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Suivi 1</span>
                            <div className={`flex items-center gap-1 ${person.date_suivi_1 ? 'text-purple-300' : 'text-gray-500'}`}>
                                <span className="font-medium whitespace-nowrap">{person.date_suivi_1 ? new Date(person.date_suivi_1).toLocaleDateString('fr-FR') : 'Non planifié'}</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Suivi 2</span>
                            <div className={`flex items-center gap-1 ${person.date_suivi_2 ? 'text-blue-300' : 'text-gray-500'}`}>
                                <span className="font-medium whitespace-nowrap">{person.date_suivi_2 ? new Date(person.date_suivi_2).toLocaleDateString('fr-FR') : 'Non planifié'}</span>
                            </div>
                        </div>
                    </div>
                    
                    {deleteConfirmId === person.id ? (
                      <div className="flex items-center gap-1 shrink-0 h-full">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 h-8 px-2 text-xs"
                          onClick={() => handleDelete(person.id)}
                        >
                          Confirmer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 rounded-full shrink-0"
                        onClick={() => setDeleteConfirmId(person.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Evangelization;