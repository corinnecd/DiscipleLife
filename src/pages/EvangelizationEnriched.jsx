import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, UserPlus, Phone, Mail, Calendar, Trash2, Edit2, Search, X, 
  MessageSquare, MapPin, Heart, Shield, Users, Target, BarChart3, 
  TrendingUp, QrCode, Share2, Copy, Check, AlertCircle, RefreshCw,
  Filter, Download, Eye, Plus, Minus, Activity, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

const EvangelizationEnriched = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('visiteurs');
  
  // États pour les visiteurs
  const [visiteurs, setVisiteurs] = useState([]);
  const [visiteursLoading, setVisiteursLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statutFilter, setStatutFilter] = useState('tous');
  const [isVisiteurDialogOpen, setIsVisiteurDialogOpen] = useState(false);
  const [editingVisiteurId, setEditingVisiteurId] = useState(null);
  const [visiteurFormData, setVisiteurFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    statut: 'visiteur',
    source_contact: '',
    notes: '',
    interesse_par: []
  });

  // États pour les campagnes
  const [campagnes, setCampagnes] = useState([]);
  const [campagnesLoading, setCampagnesLoading] = useState(true);
  const [isCampagneDialogOpen, setIsCampagneDialogOpen] = useState(false);
  const [editingCampagneId, setEditingCampagneId] = useState(null);
  const [campagneFormData, setCampagneFormData] = useState({
    nom: '',
    description: '',
    type_campagne: 'evenement',
    date_debut: '',
    date_fin: '',
    objectif_participants: '',
    statut: 'planifiee'
  });

  // États pour le dashboard
  const [statsData, setStatsData] = useState({
    totalVisiteurs: 0,
    totalCampagnes: 0,
    visiteursParStatut: {},
    conversions: 0,
    funnelData: []
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // États pour les éloignés
  const [eloignes, setEloignes] = useState([]);
  const [eloignesLoading, setEloignesLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchVisiteurs();
      fetchCampagnes();
      fetchDashboardStats();
      fetchEloignes();
    }
  }, [user, isAdmin]);

  // ========== FONCTIONS POUR LES VISITEURS ==========
  const fetchVisiteurs = async () => {
    try {
      setVisiteursLoading(true);
      let query = supabase
        .from('visiteurs')
        .select('*, profils!visiteurs_invitant_id_fkey(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('invitant_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVisiteurs(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des visiteurs:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les visiteurs.",
      });
    } finally {
      setVisiteursLoading(false);
    }
  };

  const handleVisiteurSubmit = async () => {
    if (!visiteurFormData.prenom) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le prénom est obligatoire.",
      });
      return;
    }

    try {
      const payload = {
        ...visiteurFormData,
        invitant_id: user.id,
        date_premier_contact: new Date().toISOString(),
        date_dernier_contact: new Date().toISOString()
      };

      if (editingVisiteurId) {
        const { error } = await supabase
          .from('visiteurs')
          .update(payload)
          .eq('id', editingVisiteurId);
        if (error) throw error;
        toast({ title: "Succès", description: "Visiteur mis à jour avec succès." });
      } else {
        const { error } = await supabase
          .from('visiteurs')
          .insert([payload]);
        if (error) throw error;
        toast({ title: "Succès", description: "Visiteur ajouté avec succès." });
      }

      setIsVisiteurDialogOpen(false);
      resetVisiteurForm();
      fetchVisiteurs();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
      });
    }
  };

  const resetVisiteurForm = () => {
    setVisiteurFormData({
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      statut: 'visiteur',
      source_contact: '',
      notes: '',
      interesse_par: []
    });
    setEditingVisiteurId(null);
  };

  const handleDeleteVisiteur = async (id) => {
    try {
      const { error } = await supabase
        .from('visiteurs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Supprimé", description: "Visiteur supprimé." });
      fetchVisiteurs();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer.",
      });
    }
  };

  // ========== FONCTIONS POUR LES CAMPAGNES ==========
  const fetchCampagnes = async () => {
    try {
      setCampagnesLoading(true);
      let query = supabase
        .from('campagnes_evangelisation')
        .select('*, profils!campagnes_evangelisation_responsable_id_fkey(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('responsable_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCampagnes(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des campagnes:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les campagnes.",
      });
    } finally {
      setCampagnesLoading(false);
    }
  };

  const handleCampagneSubmit = async () => {
    if (!campagneFormData.nom) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom de la campagne est obligatoire.",
      });
      return;
    }

    try {
      const payload = {
        ...campagneFormData,
        responsable_id: user.id,
        objectif_participants: campagneFormData.objectif_participants ? parseInt(campagneFormData.objectif_participants) : null
      };

      if (editingCampagneId) {
        const { error } = await supabase
          .from('campagnes_evangelisation')
          .update(payload)
          .eq('id', editingCampagneId);
        if (error) throw error;
        toast({ title: "Succès", description: "Campagne mise à jour." });
      } else {
        const { error } = await supabase
          .from('campagnes_evangelisation')
          .insert([payload]);
        if (error) throw error;
        toast({ title: "Succès", description: "Campagne créée." });
      }

      setIsCampagneDialogOpen(false);
      resetCampagneForm();
      fetchCampagnes();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue.",
      });
    }
  };

  const resetCampagneForm = () => {
    setCampagneFormData({
      nom: '',
      description: '',
      type_campagne: 'evenement',
      date_debut: '',
      date_fin: '',
      objectif_participants: '',
      statut: 'planifiee'
    });
    setEditingCampagneId(null);
  };

  // ========== FONCTIONS POUR LE DASHBOARD ==========
  const fetchDashboardStats = async () => {
    try {
      setDashboardLoading(true);
      
      // Total visiteurs
      const { count: totalVisiteurs } = await supabase
        .from('visiteurs')
        .select('*', { count: 'exact', head: true });

      // Visiteurs par statut
      const { data: visiteursData } = await supabase
        .from('visiteurs')
        .select('statut');
      
      const visiteursParStatut = {};
      visiteursData?.forEach(v => {
        visiteursParStatut[v.statut] = (visiteursParStatut[v.statut] || 0) + 1;
      });

      // Total campagnes
      const { count: totalCampagnes } = await supabase
        .from('campagnes_evangelisation')
        .select('*', { count: 'exact', head: true });

      // Conversions (retournes)
      const conversions = visiteursParStatut['retourne'] || 0;

      setStatsData({
        totalVisiteurs: totalVisiteurs || 0,
        totalCampagnes: totalCampagnes || 0,
        visiteursParStatut,
        conversions,
        funnelData: [
          { name: 'Visiteurs', value: visiteursParStatut['visiteur'] || 0 },
          { name: 'Nouveaux Contacts', value: visiteursParStatut['nouveau_contact'] || 0 },
          { name: 'Éloignés', value: visiteursParStatut['eloigne'] || 0 },
          { name: 'Retournés', value: visiteursParStatut['retourne'] || 0 }
        ]
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  // ========== FONCTIONS POUR LES ÉLOIGNÉS ==========
  const fetchEloignes = async () => {
    try {
      setEloignesLoading(true);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      let query = supabase
        .from('visiteurs')
        .select('*')
        .eq('statut', 'eloigne')
        .lte('date_dernier_contact', threeMonthsAgo.toISOString())
        .order('date_dernier_contact', { ascending: true });

      if (!isAdmin) {
        query = query.eq('invitant_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEloignes(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des éloignés:', error);
    } finally {
      setEloignesLoading(false);
    }
  };

  const handleRelancerEloigne = async (visiteurId) => {
    try {
      const { error } = await supabase
        .from('visiteurs')
        .update({ date_dernier_contact: new Date().toISOString() })
        .eq('id', visiteurId);
      if (error) throw error;
      toast({ title: "Succès", description: "Relance enregistrée." });
      fetchEloignes();
    } catch (error) {
      console.error('Erreur:', error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer la relance." });
    }
  };

  // Filtrage des visiteurs
  const filteredVisiteurs = visiteurs.filter(v => {
    const matchesSearch = 
      v.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatut = statutFilter === 'tous' || v.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  // Couleurs pour les statuts
  const statutColors = {
    visiteur: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    eloigne: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    nouveau_contact: 'bg-green-500/10 text-green-400 border-green-500/20',
    retourne: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  };

  const statutLabels = {
    visiteur: 'Visiteur',
    eloigne: 'Éloigné',
    nouveau_contact: 'Nouveau Contact',
    retourne: 'Retourné'
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
      {/* Header */}
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
            Évangélisation & Attraction des Âmes
          </h1>
          <p className="text-gray-400">
            Gérer les visiteurs, campagnes et suivre les conversions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card/10 border border-white/5">
          <TabsTrigger value="visiteurs" className="data-[state=active]:bg-teal-600">
            <Users className="w-4 h-4 mr-2" />
            Visiteurs
          </TabsTrigger>
          <TabsTrigger value="campagnes" className="data-[state=active]:bg-teal-600">
            <Target className="w-4 h-4 mr-2" />
            Campagnes
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-teal-600">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="eloignes" className="data-[state=active]:bg-teal-600">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retour Éloignés
          </TabsTrigger>
        </TabsList>

        {/* Onglet Visiteurs */}
        <TabsContent value="visiteurs" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card/10 p-4 rounded-xl border border-white/5">
            <div className="flex flex-1 gap-4 items-center">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-10 bg-black/20 border-white/10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statutFilter} onValueChange={setStatutFilter}>
                <SelectTrigger className="w-48 bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="visiteur">Visiteur</SelectItem>
                  <SelectItem value="nouveau_contact">Nouveau Contact</SelectItem>
                  <SelectItem value="eloigne">Éloigné</SelectItem>
                  <SelectItem value="retourne">Retourné</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={isVisiteurDialogOpen} onOpenChange={(open) => {
              setIsVisiteurDialogOpen(open);
              if (!open) resetVisiteurForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <UserPlus size={18} className="mr-2" />
                  Ajouter un visiteur
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">{editingVisiteurId ? "Modifier le visiteur" : "Nouveau visiteur"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prénom *</Label>
                      <Input 
                        value={visiteurFormData.prenom}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, prenom: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input 
                        value={visiteurFormData.nom}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, nom: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={visiteurFormData.email}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, email: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input 
                        value={visiteurFormData.telephone}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, telephone: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Statut</Label>
                      <Select 
                        value={visiteurFormData.statut} 
                        onValueChange={(value) => setVisiteurFormData({...visiteurFormData, statut: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visiteur">Visiteur</SelectItem>
                          <SelectItem value="nouveau_contact">Nouveau Contact</SelectItem>
                          <SelectItem value="eloigne">Éloigné</SelectItem>
                          <SelectItem value="retourne">Retourné</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Source de contact</Label>
                      <Input 
                        value={visiteurFormData.source_contact}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, source_contact: e.target.value})}
                        placeholder="Réseaux sociaux, invitation, etc."
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea 
                      value={visiteurFormData.notes}
                      onChange={(e) => setVisiteurFormData({...visiteurFormData, notes: e.target.value})}
                      className="bg-black/20 border-gray-700 min-h-[100px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsVisiteurDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleVisiteurSubmit} className="bg-teal-600">Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Liste des visiteurs */}
          {visiteursLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : filteredVisiteurs.length === 0 ? (
            <div className="text-center py-12 bg-card/5 rounded-xl border border-white/5 border-dashed">
              <UserPlus className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-1">Aucun visiteur trouvé</h3>
              <p className="text-gray-400">Commencez à ajouter des visiteurs.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              <AnimatePresence>
                {filteredVisiteurs.map((visiteur) => (
                  <motion.div
                    key={visiteur.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1e293b]/40 border border-white/5 rounded-lg p-4 hover:bg-[#1e293b]/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center text-teal-400 font-bold text-sm">
                            {visiteur.prenom?.[0]}{visiteur.nom?.[0]}
                          </div>
                          <div>
                            <h3 className="font-bold text-white">
                              {visiteur.prenom} {visiteur.nom}
                            </h3>
                            <Badge className={statutColors[visiteur.statut]}>
                              {statutLabels[visiteur.statut]}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                          {visiteur.email && (
                            <div className="flex items-center gap-1">
                              <Mail size={14} />
                              {visiteur.email}
                            </div>
                          )}
                          {visiteur.telephone && (
                            <div className="flex items-center gap-1">
                              <Phone size={14} />
                              {visiteur.telephone}
                            </div>
                          )}
                          {visiteur.source_contact && (
                            <div className="flex items-center gap-1">
                              <Share2 size={14} />
                              {visiteur.source_contact}
                            </div>
                          )}
                        </div>
                        {visiteur.notes && (
                          <p className="mt-2 text-sm text-gray-300 line-clamp-2">{visiteur.notes}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          Premier contact: {new Date(visiteur.date_premier_contact).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingVisiteurId(visiteur.id);
                            setVisiteurFormData({
                              prenom: visiteur.prenom || '',
                              nom: visiteur.nom || '',
                              email: visiteur.email || '',
                              telephone: visiteur.telephone || '',
                              statut: visiteur.statut || 'visiteur',
                              source_contact: visiteur.source_contact || '',
                              notes: visiteur.notes || '',
                              interesse_par: visiteur.interesse_par || []
                            });
                            setIsVisiteurDialogOpen(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVisiteur(visiteur.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Onglet Campagnes */}
        <TabsContent value="campagnes" className="space-y-6">
          <div className="flex justify-end bg-card/10 p-4 rounded-xl border border-white/5">
            <Dialog open={isCampagneDialogOpen} onOpenChange={(open) => {
              setIsCampagneDialogOpen(open);
              if (!open) resetCampagneForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus size={18} className="mr-2" />
                  Créer une campagne
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">{editingCampagneId ? "Modifier la campagne" : "Nouvelle campagne"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom de la campagne *</Label>
                    <Input 
                      value={campagneFormData.nom}
                      onChange={(e) => setCampagneFormData({...campagneFormData, nom: e.target.value})}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      value={campagneFormData.description}
                      onChange={(e) => setCampagneFormData({...campagneFormData, description: e.target.value})}
                      className="bg-black/20 border-gray-700 min-h-[100px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select 
                        value={campagneFormData.type_campagne} 
                        onValueChange={(value) => setCampagneFormData({...campagneFormData, type_campagne: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">En ligne</SelectItem>
                          <SelectItem value="evenement">Événement</SelectItem>
                          <SelectItem value="mission">Mission</SelectItem>
                          <SelectItem value="reseau_social">Réseau social</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Statut</Label>
                      <Select 
                        value={campagneFormData.statut} 
                        onValueChange={(value) => setCampagneFormData({...campagneFormData, statut: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planifiee">Planifiée</SelectItem>
                          <SelectItem value="en_cours">En cours</SelectItem>
                          <SelectItem value="terminee">Terminée</SelectItem>
                          <SelectItem value="annulee">Annulée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de début</Label>
                      <Input 
                        type="date"
                        value={campagneFormData.date_debut}
                        onChange={(e) => setCampagneFormData({...campagneFormData, date_debut: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de fin</Label>
                      <Input 
                        type="date"
                        value={campagneFormData.date_fin}
                        onChange={(e) => setCampagneFormData({...campagneFormData, date_fin: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Objectif de participants</Label>
                    <Input 
                      type="number"
                      value={campagneFormData.objectif_participants}
                      onChange={(e) => setCampagneFormData({...campagneFormData, objectif_participants: e.target.value})}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCampagneDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleCampagneSubmit} className="bg-teal-600">Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Liste des campagnes */}
          {campagnesLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : campagnes.length === 0 ? (
            <div className="text-center py-12 bg-card/5 rounded-xl border border-white/5 border-dashed">
              <Target className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-1">Aucune campagne</h3>
              <p className="text-gray-400">Créez votre première campagne d'évangélisation.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {campagnes.map((campagne) => (
                <Card key={campagne.id} className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white">{campagne.nom}</CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                          {campagne.description}
                        </CardDescription>
                      </div>
                      <Badge className={
                        campagne.statut === 'en_cours' ? 'bg-green-500/10 text-green-400' :
                        campagne.statut === 'terminee' ? 'bg-blue-500/10 text-blue-400' :
                        campagne.statut === 'annulee' ? 'bg-red-500/10 text-red-400' :
                        'bg-orange-500/10 text-orange-400'
                      }>
                        {campagne.statut}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {campagne.date_debut && campagne.date_fin && (
                          <span>
                            {new Date(campagne.date_debut).toLocaleDateString('fr-FR')} - {new Date(campagne.date_fin).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Target size={14} />
                        <span>Type: {campagne.type_campagne}</span>
                      </div>
                      {campagne.objectif_participants && (
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          <span>Objectif: {campagne.objectif_participants} participants</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Onglet Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          {dashboardLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement des statistiques...</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-400">Total Visiteurs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white">{statsData.totalVisiteurs}</div>
                  </CardContent>
                </Card>
                <Card className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-400">Total Campagnes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white">{statsData.totalCampagnes}</div>
                  </CardContent>
                </Card>
                <Card className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-400">Conversions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-400">{statsData.conversions}</div>
                  </CardContent>
                </Card>
                <Card className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-400">Taux de conversion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-400">
                      {statsData.totalVisiteurs > 0 
                        ? ((statsData.conversions / statsData.totalVisiteurs) * 100).toFixed(1) 
                        : 0}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Graphiques */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white">Funnel de Conversion</CardTitle>
                    <CardDescription>Répartition des visiteurs par statut</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statsData.funnelData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statsData.funnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white">Répartition par Statut</CardTitle>
                    <CardDescription>Nombre de visiteurs par catégorie</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={statsData.funnelData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }} />
                        <Bar dataKey="value" fill="#14b8a6">
                          {statsData.funnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Onglet Retour des Éloignés */}
        <TabsContent value="eloignes" className="space-y-6">
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-orange-400 flex items-center gap-2">
                <AlertCircle size={20} />
                Membres Éloignés (> 3 mois)
              </CardTitle>
              <CardDescription className="text-orange-300/80">
                Liste des personnes qui n'ont pas été contactées depuis plus de 3 mois
              </CardDescription>
            </CardHeader>
          </Card>

          {eloignesLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : eloignes.length === 0 ? (
            <div className="text-center py-12 bg-card/5 rounded-xl border border-white/5 border-dashed">
              <RefreshCw className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-1">Aucun membre éloigné</h3>
              <p className="text-gray-400">Tous les contacts sont à jour !</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {eloignes.map((visiteur) => (
                <motion.div
                  key={visiteur.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1e293b]/40 border border-orange-500/20 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
                          {visiteur.prenom?.[0]}{visiteur.nom?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-white">
                            {visiteur.prenom} {visiteur.nom}
                          </h3>
                          <p className="text-sm text-orange-400">
                            Dernier contact: {new Date(visiteur.date_dernier_contact).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        {visiteur.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={14} />
                            {visiteur.email}
                          </div>
                        )}
                        {visiteur.telephone && (
                          <div className="flex items-center gap-1">
                            <Phone size={14} />
                            {visiteur.telephone}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRelancerEloigne(visiteur.id)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <RefreshCw size={16} className="mr-2" />
                      Relancer
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EvangelizationEnriched;






