import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, UserPlus, Phone, Mail, Calendar, Trash2, Edit2, Search, X, 
  MessageSquare, MapPin, Heart, Shield, Users, Target, BarChart3, 
  TrendingUp, QrCode, Share2, Copy, Check, AlertCircle, RefreshCw,
  Filter, Download, Eye, Plus, Minus, Activity, Award, Loader2
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

const Evangelization = () => {
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

  // États pour le système de parrainage
  const [codeInvitation, setCodeInvitation] = useState(null);
  const [codeInvitationLoading, setCodeInvitationLoading] = useState(true);
  const [tableCodesInvitationExists, setTableCodesInvitationExists] = useState(true); // Par défaut, on suppose que la table existe
  const [codeInvitationError, setCodeInvitationError] = useState(null); // Pour stocker l'erreur détaillée
  const [invitationsEnvoyees, setInvitationsEnvoyees] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
  const [invitationFormData, setInvitationFormData] = useState({
    email: '',
    telephone: '',
    nom: '',
    prenom: '',
    canal: 'whatsapp',
    message: ''
  });

  useEffect(() => {
    if (user) {
      fetchVisiteurs();
      fetchCampagnes();
      fetchDashboardStats();
      fetchEloignes();
      fetchCodeInvitation();
      fetchInvitationsEnvoyees();
    }
  }, [user, isAdmin]);

  // ========== FONCTIONS POUR LES VISITEURS ==========
  const fetchVisiteurs = async () => {
    try {
      setVisiteursLoading(true);
      let query = supabase
        .from('visiteurs')
        .select(`
          *,
          profils:invitant_id(first_name, last_name)
        `)
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
        .select(`
          *,
          profils:responsable_id(first_name, last_name)
        `)
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

  // ========== FONCTIONS POUR LE SYSTÈME DE PARRAINAGE ==========
  const generateInvitationCode = () => {
    // Génère un code unique basé sur l'ID utilisateur et un timestamp
    const timestamp = Date.now().toString(36);
    const userId = user.id.substring(0, 8);
    return `INV-${userId.toUpperCase()}-${timestamp.toUpperCase()}`;
  };

  const fetchCodeInvitation = async () => {
    try {
      setCodeInvitationLoading(true);
      const { data, error } = await supabase
        .from('codes_invitation')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Si la table n'existe pas (erreur 42P01 ou PGRST116), on marque la table comme inexistante
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation') && error.message?.includes('does not exist')) {
          console.warn('Table codes_invitation n\'existe pas encore. Exécutez la migration SQL 002_objectif1_codes_invitation.sql');
          setTableCodesInvitationExists(false);
          setCodeInvitation(null);
          setCodeInvitationError(null);
          return;
        }
        // Autre erreur (RLS, permissions, etc.) - la table existe mais il y a un problème
        console.error('Erreur lors du chargement du code d\'invitation:', error);
        setTableCodesInvitationExists(true); // La table existe, c'est une autre erreur
        setCodeInvitation(null);
        setCodeInvitationError(error.message || error.code || 'Erreur inconnue');
        return;
      }

      // Si pas d'erreur, la table existe
      setTableCodesInvitationExists(true);

      if (!data) {
        // Créer un nouveau code d'invitation
        const code = generateInvitationCode();
        const baseUrl = window.location.origin;
        const lienInvitation = `${baseUrl}/invitation/${code}`;

        const { data: newCode, error: insertError } = await supabase
          .from('codes_invitation')
          .insert([{
            user_id: user.id,
            code,
            lien_invitation: lienInvitation
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Erreur lors de la création du code:', insertError);
          // Si l'erreur est due à une contrainte unique (code déjà existant), réessayons de récupérer
          if (insertError.code === '23505' || insertError.message?.includes('unique')) {
            // Un code existe déjà, récupérons-le
            const { data: existingCode, error: fetchError } = await supabase
              .from('codes_invitation')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (!fetchError && existingCode) {
              setCodeInvitation(existingCode);
              setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(existingCode.lien_invitation)}`);
              setCodeInvitationError(null);
              return;
            }
          }
          setCodeInvitation(null);
          setCodeInvitationError(insertError.message || insertError.code || 'Erreur inconnue');
          return;
        }
        setCodeInvitation(newCode);
        setCodeInvitationError(null);
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lienInvitation)}`);
      } else {
        setCodeInvitation(data);
        setCodeInvitationError(null);
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.lien_invitation)}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du code d\'invitation:', error);
      // Ne pas afficher de toast d'erreur pour éviter de perturber l'utilisateur
      setCodeInvitation(null);
      setCodeInvitationError(error.message || 'Erreur inconnue');
    } finally {
      setCodeInvitationLoading(false);
    }
  };

  const fetchInvitationsEnvoyees = async () => {
    try {
      setInvitationsLoading(true);
      let query = supabase
        .from('invitations_envoyees')
        .select('*, codes_invitation(code), visiteurs(prenom, nom)')
        .order('date_envoi', { ascending: false });

      if (!isAdmin) {
        query = query.eq('invitant_id', user.id);
      }

      const { data, error } = await query;
      if (error) {
        // Si la table n'existe pas, on ignore silencieusement
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Table invitations_envoyees n\'existe pas encore.');
          setInvitationsEnvoyees([]);
          return;
        }
        throw error;
      }
      setInvitationsEnvoyees(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
      setInvitationsEnvoyees([]);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (codeInvitation?.lien_invitation) {
      navigator.clipboard.writeText(codeInvitation.lien_invitation);
      setCopied(true);
      toast({ title: "Copié !", description: "Lien d'invitation copié dans le presse-papiers." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async (platform) => {
    if (!codeInvitation?.lien_invitation) return;

    const message = `Rejoignez-nous ! Utilisez ce lien: ${codeInvitation.lien_invitation}`;
    const encodedMessage = encodeURIComponent(message);
    const encodedUrl = encodeURIComponent(codeInvitation.lien_invitation);

    let shareUrl = '';
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedMessage}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=Invitation&body=${encodedMessage}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, '_blank');
  };

  const handleSendInvitation = async () => {
    if (!invitationFormData.email && !invitationFormData.telephone) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez renseigner au moins un email ou un téléphone.",
      });
      return;
    }

    try {
      // Créer ou récupérer le visiteur si email/téléphone fourni
      let visiteurId = null;
      if (invitationFormData.email || invitationFormData.telephone) {
        const { data: existingVisiteur } = await supabase
          .from('visiteurs')
          .select('id')
          .or(`email.eq.${invitationFormData.email},telephone.eq.${invitationFormData.telephone}`)
          .maybeSingle();

        if (existingVisiteur) {
          visiteurId = existingVisiteur.id;
        } else if (invitationFormData.prenom) {
          const { data: newVisiteur, error: visiteurError } = await supabase
            .from('visiteurs')
            .insert([{
              prenom: invitationFormData.prenom,
              nom: invitationFormData.nom,
              email: invitationFormData.email || null,
              telephone: invitationFormData.telephone || null,
              statut: 'nouveau_contact',
              source_contact: `Invitation ${invitationFormData.canal}`,
              invitant_id: user.id
            }])
            .select()
            .single();

          if (visiteurError) throw visiteurError;
          visiteurId = newVisiteur.id;
        }
      }

      // Enregistrer l'invitation
      const { error } = await supabase
        .from('invitations_envoyees')
        .insert([{
          code_invitation_id: codeInvitation.id,
          invitant_id: user.id,
          visiteur_id: visiteurId,
          email: invitationFormData.email || null,
          telephone: invitationFormData.telephone || null,
          nom: invitationFormData.nom || null,
          prenom: invitationFormData.prenom || null,
          canal: invitationFormData.canal,
          message: invitationFormData.message || null,
          statut: 'envoyee'
        }]);

      if (error) throw error;

      // Mettre à jour le compteur
      await supabase
        .from('codes_invitation')
        .update({ nombre_invites: (codeInvitation.nombre_invites || 0) + 1 })
        .eq('id', codeInvitation.id);

      toast({ title: "Succès", description: "Invitation envoyée avec succès." });
      setIsInvitationDialogOpen(false);
      setInvitationFormData({
        email: '',
        telephone: '',
        nom: '',
        prenom: '',
        canal: 'whatsapp',
        message: ''
      });
      fetchInvitationsEnvoyees();
      fetchCodeInvitation();
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer l'invitation.",
      });
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
        <TabsList className="grid w-full grid-cols-5 bg-card/10 border border-white/5">
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
          <TabsTrigger value="parrainage" className="data-[state=active]:bg-teal-600">
            <QrCode className="w-4 h-4 mr-2" />
            Parrainage
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
              <DialogContent className="bg-[#1a1b26] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingVisiteurId ? "Modifier le visiteur" : "Nouveau visiteur"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prénom *</Label>
                      <Input 
                        value={visiteurFormData.prenom}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, prenom: e.target.value})}
                        className="bg-black/20 border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input 
                        value={visiteurFormData.nom}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, nom: e.target.value})}
                        className="bg-black/20 border-gray-700"
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
                        className="bg-black/20 border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input 
                        value={visiteurFormData.telephone}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, telephone: e.target.value})}
                        className="bg-black/20 border-gray-700"
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
                        <SelectTrigger className="bg-black/20 border-gray-700">
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
                        className="bg-black/20 border-gray-700"
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
              <DialogContent className="bg-[#1a1b26] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCampagneId ? "Modifier la campagne" : "Nouvelle campagne"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom de la campagne *</Label>
                    <Input 
                      value={campagneFormData.nom}
                      onChange={(e) => setCampagneFormData({...campagneFormData, nom: e.target.value})}
                      className="bg-black/20 border-gray-700"
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
                        <SelectTrigger className="bg-black/20 border-gray-700">
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
                        <SelectTrigger className="bg-black/20 border-gray-700">
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
                        className="bg-black/20 border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de fin</Label>
                      <Input 
                        type="date"
                        value={campagneFormData.date_fin}
                        onChange={(e) => setCampagneFormData({...campagneFormData, date_fin: e.target.value})}
                        className="bg-black/20 border-gray-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Objectif de participants</Label>
                    <Input 
                      type="number"
                      value={campagneFormData.objectif_participants}
                      onChange={(e) => setCampagneFormData({...campagneFormData, objectif_participants: e.target.value})}
                      className="bg-black/20 border-gray-700"
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

        {/* Onglet Parrainage/Invitation */}
        <TabsContent value="parrainage" className="space-y-6">
          {codeInvitationLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : !tableCodesInvitationExists ? (
            <Card className="bg-orange-500/10 border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-orange-400 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Table manquante
                </CardTitle>
                <CardDescription className="text-orange-300/80">
                  La table 'codes_invitation' n'existe pas encore dans Supabase.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4">
                  Pour activer le système de parrainage, veuillez exécuter la migration SQL suivante dans Supabase :
                </p>
                <code className="block bg-black/20 p-3 rounded text-xs text-gray-400 mb-4">
                  sql/migrations/002_objectif1_codes_invitation.sql
                </code>
                <div className="text-xs text-gray-400 space-y-2">
                  <p>1. Ouvrez Supabase Dashboard → SQL Editor</p>
                  <p>2. Copiez le contenu du fichier de migration</p>
                  <p>3. Exécutez la requête SQL</p>
                </div>
              </CardContent>
            </Card>
          ) : !codeInvitation && codeInvitationLoading ? (
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création du code d'invitation...
                </CardTitle>
                <CardDescription className="text-blue-300/80">
                  Veuillez patienter pendant la création de votre code d'invitation.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : !codeInvitation ? (
            <Card className="bg-red-500/10 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Erreur de création
                </CardTitle>
                <CardDescription className="text-red-300/80">
                  Impossible de créer votre code d'invitation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {codeInvitationError && (
                  <div className="bg-black/20 p-3 rounded text-xs text-red-300 font-mono break-all">
                    {codeInvitationError}
                  </div>
                )}
                <div className="text-sm text-gray-400 space-y-2">
                  <p>Vérifiez que :</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Les politiques RLS sont bien configurées dans Supabase</li>
                    <li>Vous êtes bien authentifié</li>
                    <li>La table codes_invitation existe et est accessible</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => {
                    setCodeInvitationError(null);
                    fetchCodeInvitation();
                  }} 
                  variant="outline"
                  className="mt-4"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Carte principale avec QR Code et lien */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-teal-400" />
                      Mon Code d'Invitation
                    </CardTitle>
                    <CardDescription>
                      Partagez ce code pour inviter de nouvelles personnes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-lg border border-white/10">
                      {qrCodeUrl && (
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code d'invitation" 
                          className="w-64 h-64 rounded-lg bg-white p-2"
                        />
                      )}
                      <p className="text-xs text-gray-400 mt-4 text-center">
                        Scannez ce code QR pour accéder au lien d'invitation
                      </p>
                    </div>

                    {/* Code et lien */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-gray-400 text-sm">Code d'invitation</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input 
                            value={codeInvitation?.code || ''}
                            readOnly
                            className="bg-black/20 border-gray-700 font-mono"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyCode}
                            className="shrink-0"
                          >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-400 text-sm">Lien d'invitation</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input 
                            value={codeInvitation?.lien_invitation || ''}
                            readOnly
                            className="bg-black/20 border-gray-700 text-xs"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyCode}
                            className="shrink-0"
                          >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Boutons de partage */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleShare('whatsapp')}
                        className="bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                      >
                        <Share2 size={16} className="mr-2" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleShare('facebook')}
                        className="bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                      >
                        <Share2 size={16} className="mr-2" />
                        Facebook
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleShare('twitter')}
                        className="bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20"
                      >
                        <Share2 size={16} className="mr-2" />
                        Twitter
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleShare('email')}
                        className="bg-gray-500/10 border-gray-500/20 text-gray-400 hover:bg-gray-500/20"
                      >
                        <Mail size={16} className="mr-2" />
                        Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistiques de parrainage */}
                <Card className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-400" />
                      Mes Statistiques
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                        <div className="text-3xl font-bold text-teal-400">
                          {codeInvitation?.nombre_invites || 0}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Invitations envoyées</div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <div className="text-3xl font-bold text-emerald-400">
                          {codeInvitation?.nombre_conversions || 0}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Conversions</div>
                      </div>
                    </div>
                    {codeInvitation && (
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-xs text-gray-500">
                          Code créé le {new Date(codeInvitation.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Formulaire d'envoi d'invitation */}
              <Card className="bg-[#1e293b]/40 border-white/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Envoyer une invitation</CardTitle>
                      <CardDescription>
                        Envoyez une invitation personnalisée à quelqu'un
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => setIsInvitationDialogOpen(true)}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      <UserPlus size={18} className="mr-2" />
                      Nouvelle invitation
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Dialog pour envoyer invitation */}
              <Dialog open={isInvitationDialogOpen} onOpenChange={setIsInvitationDialogOpen}>
                <DialogContent className="bg-[#1a1b26] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Envoyer une invitation</DialogTitle>
                    <DialogDescription>
                      Remplissez les informations pour envoyer une invitation personnalisée
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prénom</Label>
                        <Input 
                          value={invitationFormData.prenom}
                          onChange={(e) => setInvitationFormData({...invitationFormData, prenom: e.target.value})}
                          className="bg-black/20 border-gray-700"
                          placeholder="Prénom du destinataire"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input 
                          value={invitationFormData.nom}
                          onChange={(e) => setInvitationFormData({...invitationFormData, nom: e.target.value})}
                          className="bg-black/20 border-gray-700"
                          placeholder="Nom du destinataire"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input 
                          type="email"
                          value={invitationFormData.email}
                          onChange={(e) => setInvitationFormData({...invitationFormData, email: e.target.value})}
                          className="bg-black/20 border-gray-700"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone *</Label>
                        <Input 
                          value={invitationFormData.telephone}
                          onChange={(e) => setInvitationFormData({...invitationFormData, telephone: e.target.value})}
                          className="bg-black/20 border-gray-700"
                          placeholder="+33 6 12 34 56 78"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Canal de communication</Label>
                      <Select 
                        value={invitationFormData.canal} 
                        onValueChange={(value) => setInvitationFormData({...invitationFormData, canal: value})}
                      >
                        <SelectTrigger className="bg-black/20 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="qr_code">QR Code</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Message personnalisé (optionnel)</Label>
                      <Textarea 
                        value={invitationFormData.message}
                        onChange={(e) => setInvitationFormData({...invitationFormData, message: e.target.value})}
                        className="bg-black/20 border-gray-700 min-h-[100px]"
                        placeholder="Ajoutez un message personnalisé pour votre invitation..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInvitationDialogOpen(false)}>Annuler</Button>
                    <Button onClick={handleSendInvitation} className="bg-teal-600">Envoyer l'invitation</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Liste des invitations envoyées */}
              <Card className="bg-[#1e293b]/40 border-white/5">
                <CardHeader>
                  <CardTitle className="text-white">Historique des invitations</CardTitle>
                  <CardDescription>
                    Suivez toutes vos invitations envoyées
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invitationsLoading ? (
                    <div className="text-center py-12 text-gray-500">Chargement...</div>
                  ) : invitationsEnvoyees.length === 0 ? (
                    <div className="text-center py-12 bg-card/5 rounded-xl border border-white/5 border-dashed">
                      <Share2 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-1">Aucune invitation</h3>
                      <p className="text-gray-400">Commencez à inviter des personnes !</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invitationsEnvoyees.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="bg-black/20 border border-white/5 rounded-lg p-4 hover:bg-black/30 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm">
                                  {invitation.prenom?.[0] || invitation.email?.[0] || '?'}
                                </div>
                                <div>
                                  <h3 className="font-bold text-white">
                                    {invitation.prenom && invitation.nom 
                                      ? `${invitation.prenom} ${invitation.nom}`
                                      : invitation.email || invitation.telephone || 'Invité anonyme'}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={
                                      invitation.statut === 'conversion' ? 'bg-emerald-500/10 text-emerald-400' :
                                      invitation.statut === 'ouverte' ? 'bg-blue-500/10 text-blue-400' :
                                      invitation.statut === 'ignoree' ? 'bg-red-500/10 text-red-400' :
                                      'bg-gray-500/10 text-gray-400'
                                    }>
                                      {invitation.statut}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {invitation.canal}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {invitation.email && (
                                <div className="flex items-center gap-1 text-sm text-gray-400 mb-1">
                                  <Mail size={14} />
                                  {invitation.email}
                                </div>
                              )}
                              {invitation.telephone && (
                                <div className="flex items-center gap-1 text-sm text-gray-400 mb-1">
                                  <Phone size={14} />
                                  {invitation.telephone}
                                </div>
                              )}
                              {invitation.message && (
                                <p className="text-sm text-gray-300 mt-2 italic line-clamp-2">
                                  {invitation.message}
                                </p>
                              )}
                              <div className="text-xs text-gray-500 mt-2">
                                Envoyé le {new Date(invitation.date_envoi).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Onglet Retour des Éloignés */}
        <TabsContent value="eloignes" className="space-y-6">
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-orange-400 flex items-center gap-2">
                <AlertCircle size={20} />
                Membres Éloignés (&gt; 3 mois)
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

export default Evangelization;

