import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, UserPlus, Phone, Mail, Calendar, Trash2, Edit2, Search, X, 
  MessageSquare, MapPin, Heart, Shield, Users, Target, BarChart3, 
  TrendingUp, QrCode, Share2, Copy, Check, AlertCircle, RefreshCw,
  Filter, Download, Eye, Plus, Minus, Activity, Award, Loader2, 
  CalendarDays, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const Evangelization = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [activeTab, setActiveTab] = useState('visiteurs');
  
  // États pour les visiteurs
  const [visiteurs, setVisiteurs] = useState([]);
  const [visiteursLoading, setVisiteursLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statutFilter, setStatutFilter] = useState('tous');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [isVisiteurDialogOpen, setIsVisiteurDialogOpen] = useState(false);
  const [editingVisiteurId, setEditingVisiteurId] = useState(null);
  const [visiteurFormData, setVisiteurFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    statut: 'visiteur',
    type: 'nouvelle_ame',
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
    funnelData: [],
    // KPIs Objectif 1A
    nouvellesAmesContactees: 0,
    nouvellesAmesPresentes: 0,
    tauxConversion: 0,
    progressionKR1A1: 0, // Progression vers 800 nouvelles âmes
    progressionKR1A2: 0, // Progression vers 25% de réponse
    graphiqueHebdomadaireContactees: [],
    graphiqueHebdomadairePresentes: []
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // États pour les éloignés
  const [eloignes, setEloignes] = useState([]);
  const [eloignesLoading, setEloignesLoading] = useState(true);
  const [contactsRelance, setContactsRelance] = useState({}); // {visiteurId: [contacts]}
  const [statsObjectif1B, setStatsObjectif1B] = useState({
    totalEloignesRecenses: 0,
    totalContactsEtablis: 0,
    totalRetoursEffectifs: 0,
    progressionKR1B1: 0, // Progression vers 500 personnes recensées
    progressionKR1B2: 0  // Progression vers 50% de retour (250 personnes)
  });
  const [isRelanceDialogOpen, setIsRelanceDialogOpen] = useState(false);
  const [selectedEloigne, setSelectedEloigne] = useState(null);
  const [relanceFormData, setRelanceFormData] = useState({
    type_contact: 'telephone',
    statut: 'tente',
    notes: '',
    prochaine_relance: ''
  });

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

  // États pour les événements
  const [evenements, setEvenements] = useState([]);
  const [evenementsLoading, setEvenementsLoading] = useState(true);
  const [isEvenementDialogOpen, setIsEvenementDialogOpen] = useState(false);
  const [editingEvenementId, setEditingEvenementId] = useState(null);
  const [evenementFormData, setEvenementFormData] = useState({
    nom: '',
    description: '',
    type_evenement: 'thematique',
    date_evenement: '',
    heure_debut: '',
    heure_fin: '',
    lieu: '',
    responsable_id: '',
    objectif_participants: '',
    nombre_participants: '',
    nombre_nouvelles_ames: '',
    statut: 'planifie',
    notes: ''
  });
  const [responsables, setResponsables] = useState([]);

  // États pour les activités de solidarité
  const [activitesSolidarite, setActivitesSolidarite] = useState([]);
  const [activitesSolidariteLoading, setActivitesSolidariteLoading] = useState(true);
  const [isActiviteDialogOpen, setIsActiviteDialogOpen] = useState(false);
  const [editingActiviteId, setEditingActiviteId] = useState(null);
  const [activiteFormData, setActiviteFormData] = useState({
    type_activite: 'banque_alimentaire',
    date_activite: '',
    nombre_personnes_services: '',
    nombre_nouvelles_ames: '',
    responsable_id: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      fetchVisiteurs();
      fetchCampagnes();
      fetchDashboardStats();
      fetchEloignes();
      fetchCodeInvitation();
      fetchInvitationsEnvoyees();
      fetchEvenements();
      fetchActivitesSolidarite();
      fetchContactsRelance();
      fetchStatsObjectif1B();
    }
  }, [user, isAdmin]);

  const CACHE_TTL_MS = 2 * 60 * 1000; // 2 min (§9.1 Étape 4 – extension cache)

  // ========== FONCTIONS POUR LES VISITEURS ==========
  const fetchVisiteurs = async () => {
    try {
      setVisiteursLoading(true);
      const cacheKey = `evangelization_visiteurs_${isAdmin ? 'all' : user?.id}`;
      const data = await getOrSetCache(
        cacheKey,
        async () => {
          let query = supabase
            .from('visiteurs')
            .select(`*, profils:invitant_id(first_name, last_name)`)
            .order('created_at', { ascending: false });
          if (!isAdmin && user?.id) query = query.eq('invitant_id', user.id);
          const { data: raw, error } = await query;
          if (error) throw error;
          return raw || [];
        },
        CACHE_TTL_MS
      );
      setVisiteurs(data || []);
    } catch (error) {
      handleError(error, { context: 'fetchVisiteurs' }, "Impossible de charger les visiteurs.");
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
      clearCache(`evangelization_visiteurs_${isAdmin ? 'all' : user?.id}`);
      fetchVisiteurs();
    } catch (error) {
      handleError(error, { context: 'handleSaveVisiteur', visiteurId: editingVisiteurId }, "Une erreur est survenue lors de l'enregistrement.");
    }
  };

  const resetVisiteurForm = () => {
    setVisiteurFormData({
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      statut: 'visiteur',
      type: 'nouvelle_ame',
      source_contact: '',
      notes: '',
      interesse_par: []
    });
    setEditingVisiteurId(null);
  };

  const handleDeleteVisiteur = async (id) => {
    if (!window.confirm("Supprimer ce visiteur ? Cette action est irréversible.")) return;
    try {
      const { error } = await supabase
        .from('visiteurs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Supprimé", description: "Visiteur supprimé." });
      clearCache(`evangelization_visiteurs_${isAdmin ? 'all' : user?.id}`);
      fetchVisiteurs();
    } catch (error) {
      handleError(error, { context: 'handleDeleteVisiteur', visiteurId: id }, "Impossible de supprimer le visiteur.");
    }
  };

  // ========== FONCTIONS POUR LES CAMPAGNES ==========
  const fetchCampagnes = async () => {
    try {
      setCampagnesLoading(true);
      const cacheKey = `evangelization_campagnes_${isAdmin ? 'all' : user?.id}`;
      const data = await getOrSetCache(
        cacheKey,
        async () => {
          let query = supabase
            .from('campagnes_evangelisation')
            .select(`*, profils:responsable_id(first_name, last_name)`)
            .order('created_at', { ascending: false });
          if (!isAdmin && user?.id) query = query.eq('responsable_id', user.id);
          const { data: raw, error } = await query;
          if (error) throw error;
          return raw || [];
        },
        CACHE_TTL_MS
      );
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
      clearCache(`evangelization_campagnes_${isAdmin ? 'all' : user?.id}`);
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

      // Date de début de l'objectif (3 mois en arrière)
      const dateDebutObjectif = subMonths(new Date(), 3);
      const dateDebutObjectifISO = dateDebutObjectif.toISOString().split('T')[0];
      
      // KPIs Objectif 1A - Nouvelles âmes contactées (depuis le début de l'objectif)
      const { count: nouvellesAmesContactees } = await supabase
        .from('visiteurs')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'nouvelle_ame')
        .gte('date_premier_contact', dateDebutObjectifISO);

      // KPIs Objectif 1A - Nouvelles âmes présentes
      const { count: nouvellesAmesPresentes } = await supabase
        .from('visiteurs')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'nouvelle_ame')
        .gte('date_premier_contact', dateDebutObjectifISO)
        .in('statut', ['visiteur', 'nouveau_contact', 'retourne']);

      // Calcul du taux de conversion
      const tauxConversion = nouvellesAmesContactees > 0 
        ? (nouvellesAmesPresentes / nouvellesAmesContactees) * 100 
        : 0;

      // Progression KR1A.1 (800 nouvelles âmes)
      const progressionKR1A1 = nouvellesAmesContactees > 0 
        ? Math.min((nouvellesAmesContactees / 800) * 100, 100)
        : 0;

      // Progression KR1A.2 (25% de réponse)
      const progressionKR1A2 = tauxConversion > 0
        ? Math.min((tauxConversion / 25) * 100, 100)
        : 0;

      // Graphique hebdomadaire - Nouvelles âmes contactées par semaine (12 dernières semaines)
      const maintenant = new Date();
      const douzeSemainesAgo = subWeeks(maintenant, 12);
      const semaines = eachWeekOfInterval(
        { start: douzeSemainesAgo, end: maintenant },
        { weekStartsOn: 1 }
      );

      const graphiqueHebdomadaireContactees = await Promise.all(
        semaines.map(async (semaine) => {
          const debutSemaine = startOfWeek(semaine, { weekStartsOn: 1 });
          const finSemaine = endOfWeek(semaine, { weekStartsOn: 1 });
          
          const { count } = await supabase
            .from('visiteurs')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'nouvelle_ame')
            .gte('date_premier_contact', debutSemaine.toISOString().split('T')[0])
            .lte('date_premier_contact', finSemaine.toISOString().split('T')[0]);

          return {
            semaine: format(semaine, 'dd/MM', { locale: fr }),
            contactees: count || 0
          };
        })
      );

      const graphiqueHebdomadairePresentes = await Promise.all(
        semaines.map(async (semaine) => {
          const debutSemaine = startOfWeek(semaine, { weekStartsOn: 1 });
          const finSemaine = endOfWeek(semaine, { weekStartsOn: 1 });
          
          const { count } = await supabase
            .from('visiteurs')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'nouvelle_ame')
            .gte('date_premier_contact', debutSemaine.toISOString().split('T')[0])
            .lte('date_premier_contact', finSemaine.toISOString().split('T')[0])
            .in('statut', ['visiteur', 'nouveau_contact', 'retourne']);

          return {
            semaine: format(semaine, 'dd/MM', { locale: fr }),
            presentes: count || 0
          };
        })
      );

      // Fusionner les données hebdomadaires pour le graphique combiné
      const graphiqueHebdomadaireCombiné = graphiqueHebdomadaireContactees.map((item, index) => ({
        semaine: item.semaine,
        contactees: item.contactees,
        presentes: graphiqueHebdomadairePresentes[index]?.presentes || 0
      }));

      setStatsData({
        totalVisiteurs: totalVisiteurs || 0,
        totalCampagnes: totalCampagnes || 0,
        visiteursParStatut,
        conversions,
        funnelData: [
          { name: 'Visiteurs', value: visiteursParStatut['visiteur'] || 0 },
          { name: 'Nouveaux convertis', value: visiteursParStatut['nouveau_contact'] || 0 },
          { name: 'Éloignés', value: visiteursParStatut['eloigne'] || 0 },
          { name: 'Revenus', value: visiteursParStatut['retourne'] || 0 }
        ],
        nouvellesAmesContactees: nouvellesAmesContactees || 0,
        nouvellesAmesPresentes: nouvellesAmesPresentes || 0,
        tauxConversion: Math.round(tauxConversion * 10) / 10,
        progressionKR1A1: Math.round(progressionKR1A1 * 10) / 10,
        progressionKR1A2: Math.round(progressionKR1A2 * 10) / 10,
        graphiqueHebdomadaireContactees: graphiqueHebdomadaireCombiné,
        graphiqueHebdomadairePresentes: graphiqueHebdomadaireCombiné
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

  // Fonction pour ouvrir le dialog de relance
  const handleOpenRelanceDialog = (visiteur) => {
    setSelectedEloigne(visiteur);
    setRelanceFormData({
      type_contact: 'telephone',
      statut: 'tente',
      notes: '',
      prochaine_relance: ''
    });
    setIsRelanceDialogOpen(true);
  };

  // Fonction pour enregistrer une relance
  const handleRelancerEloigne = async () => {
    if (!selectedEloigne) return;

    try {
      // Enregistrer le contact de relance
      const { error: contactError } = await supabase
        .from('contacts_relance')
        .insert([{
          visiteur_id: selectedEloigne.id,
          contacteur_id: user.id,
          type_contact: relanceFormData.type_contact,
          statut: relanceFormData.statut,
          notes: relanceFormData.notes,
          prochaine_relance: relanceFormData.prochaine_relance || null
        }]);

      if (contactError) throw contactError;

      // Si le contact a été joint ou est intéressé, mettre à jour la date de dernier contact
      if (relanceFormData.statut === 'joint' || relanceFormData.statut === 'interesse') {
        const { error: updateError } = await supabase
          .from('visiteurs')
          .update({ date_dernier_contact: new Date().toISOString() })
          .eq('id', selectedEloigne.id);
        
        if (updateError) throw updateError;
      }

      toast({ title: "Succès", description: "Relance enregistrée avec succès." });
      setIsRelanceDialogOpen(false);
      setSelectedEloigne(null);
      fetchEloignes();
      fetchContactsRelance();
      fetchStatsObjectif1B();
    } catch (error) {
      console.error('Erreur:', error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer la relance." });
    }
  };

  // Fonction pour récupérer les contacts de relance
  const fetchContactsRelance = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts_relance')
        .select('*, profils:contacteur_id(first_name, last_name)')
        .order('date_contact', { ascending: false });

      if (error) throw error;

      // Grouper par visiteur_id
      const grouped = {};
      data?.forEach(contact => {
        if (!grouped[contact.visiteur_id]) {
          grouped[contact.visiteur_id] = [];
        }
        grouped[contact.visiteur_id].push(contact);
      });

      setContactsRelance(grouped);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts de relance:', error);
    }
  };

  // Fonction pour récupérer les statistiques Objectif 1B
  const fetchStatsObjectif1B = async () => {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Total éloignés recensés (visiteurs avec statut 'eloigne' et date_dernier_contact > 3 mois)
      const { count: totalEloignes } = await supabase
        .from('visiteurs')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'eloigne')
        .lte('date_dernier_contact', threeMonthsAgo.toISOString());

      // Total contacts établis
      const { count: totalContacts } = await supabase
        .from('contacts_relance')
        .select('*', { count: 'exact', head: true });

      // Total retours effectifs (visiteurs qui ont été contactés et dont le statut a changé vers 'retourne' ou date_dernier_contact a été mise à jour récemment)
      const { count: totalRetours } = await supabase
        .from('visiteurs')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'retourne')
        .gte('date_dernier_contact', threeMonthsAgo.toISOString());

      const progressionKR1B1 = totalEloignes ? Math.min((totalEloignes / 500) * 100, 100) : 0;
      const progressionKR1B2 = totalEloignes ? Math.min((totalRetours / 250) * 100, 100) : 0;

      setStatsObjectif1B({
        totalEloignesRecenses: totalEloignes || 0,
        totalContactsEtablis: totalContacts || 0,
        totalRetoursEffectifs: totalRetours || 0,
        progressionKR1B1: Math.round(progressionKR1B1 * 10) / 10,
        progressionKR1B2: Math.round(progressionKR1B2 * 10) / 10
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques Objectif 1B:', error);
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
          if (import.meta.env.DEV) console.warn('Table codes_invitation n\'existe pas encore. Exécutez la migration SQL 002_objectif1_codes_invitation.sql');
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
          if (import.meta.env.DEV) console.warn('Table invitations_envoyees n\'existe pas encore.');
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

  // ========== FONCTIONS POUR LES ÉVÉNEMENTS ==========
  const fetchResponsables = async () => {
    try {
      const { data, error } = await supabase
        .from('profils')
        .select('id, first_name, last_name')
        .in('role', ['admin', 'mentor'])
        .order('first_name');
      
      if (error) throw error;
      setResponsables(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des responsables:', error);
    }
  };

  const fetchEvenements = async () => {
    try {
      setEvenementsLoading(true);
      let query = supabase
        .from('evenements_evangelisation')
        .select(`
          *,
          profils:responsable_id(first_name, last_name)
        `)
        .order('date_evenement', { ascending: false });

      if (!isAdmin) {
        query = query.eq('responsable_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvenements(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les événements.",
      });
    } finally {
      setEvenementsLoading(false);
    }
  };

  const handleEvenementSubmit = async () => {
    if (!evenementFormData.nom || !evenementFormData.date_evenement) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom et la date sont obligatoires.",
      });
      return;
    }

    try {
      const payload = {
        nom: evenementFormData.nom,
        description: evenementFormData.description || null,
        type_evenement: evenementFormData.type_evenement,
        date_evenement: evenementFormData.date_evenement,
        heure_debut: evenementFormData.heure_debut || null,
        heure_fin: evenementFormData.heure_fin || null,
        lieu: evenementFormData.lieu || null,
        responsable_id: evenementFormData.responsable_id || user.id,
        objectif_participants: evenementFormData.objectif_participants ? parseInt(evenementFormData.objectif_participants) : null,
        nombre_participants: evenementFormData.nombre_participants ? parseInt(evenementFormData.nombre_participants) : 0,
        nombre_nouvelles_ames: evenementFormData.nombre_nouvelles_ames ? parseInt(evenementFormData.nombre_nouvelles_ames) : 0,
        statut: evenementFormData.statut,
        notes: evenementFormData.notes || null
      };

      if (editingEvenementId) {
        const { error } = await supabase
          .from('evenements_evangelisation')
          .update(payload)
          .eq('id', editingEvenementId);
        if (error) throw error;
        toast({ title: "Succès", description: "Événement mis à jour." });
      } else {
        const { error } = await supabase
          .from('evenements_evangelisation')
          .insert([payload]);
        if (error) throw error;
        toast({ title: "Succès", description: "Événement créé." });
      }

      setIsEvenementDialogOpen(false);
      resetEvenementForm();
      fetchEvenements();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue.",
      });
    }
  };

  const resetEvenementForm = () => {
    setEvenementFormData({
      nom: '',
      description: '',
      type_evenement: 'thematique',
      date_evenement: '',
      heure_debut: '',
      heure_fin: '',
      lieu: '',
      responsable_id: user.id,
      objectif_participants: '',
      nombre_participants: '',
      nombre_nouvelles_ames: '',
      statut: 'planifie',
      notes: ''
    });
    setEditingEvenementId(null);
  };

  const handleDeleteEvenement = async (id) => {
    if (!window.confirm("Supprimer cet événement ? Cette action est irréversible.")) return;
    try {
      const { error } = await supabase
        .from('evenements_evangelisation')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Supprimé", description: "Événement supprimé." });
      fetchEvenements();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer.",
      });
    }
  };

  // ========== FONCTIONS POUR LES ACTIVITÉS DE SOLIDARITÉ ==========
  const fetchActivitesSolidarite = async () => {
    try {
      setActivitesSolidariteLoading(true);
      let query = supabase
        .from('activites_solidarite')
        .select(`
          *,
          profils:responsable_id(first_name, last_name)
        `)
        .order('date_activite', { ascending: false });

      if (!isAdmin) {
        query = query.eq('responsable_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setActivitesSolidarite(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les activités.",
      });
    } finally {
      setActivitesSolidariteLoading(false);
    }
  };

  const handleActiviteSubmit = async () => {
    if (!activiteFormData.date_activite) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "La date est obligatoire.",
      });
      return;
    }

    try {
      const payload = {
        type_activite: activiteFormData.type_activite,
        date_activite: activiteFormData.date_activite,
        nombre_personnes_services: activiteFormData.nombre_personnes_services ? parseInt(activiteFormData.nombre_personnes_services) : 0,
        nombre_nouvelles_ames: activiteFormData.nombre_nouvelles_ames ? parseInt(activiteFormData.nombre_nouvelles_ames) : 0,
        responsable_id: activiteFormData.responsable_id || user.id,
        description: activiteFormData.description || null
      };

      if (editingActiviteId) {
        const { error } = await supabase
          .from('activites_solidarite')
          .update(payload)
          .eq('id', editingActiviteId);
        if (error) throw error;
        toast({ title: "Succès", description: "Activité mise à jour." });
      } else {
        const { error } = await supabase
          .from('activites_solidarite')
          .insert([payload]);
        if (error) throw error;
        toast({ title: "Succès", description: "Activité créée." });
      }

      setIsActiviteDialogOpen(false);
      resetActiviteForm();
      fetchActivitesSolidarite();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue.",
      });
    }
  };

  const resetActiviteForm = () => {
    setActiviteFormData({
      type_activite: 'banque_alimentaire',
      date_activite: '',
      nombre_personnes_services: '',
      nombre_nouvelles_ames: '',
      responsable_id: user.id,
      description: ''
    });
    setEditingActiviteId(null);
  };

  const handleDeleteActivite = async (id) => {
    if (!window.confirm("Supprimer cette activité ? Cette action est irréversible.")) return;
    try {
      const { error } = await supabase
        .from('activites_solidarite')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Supprimé", description: "Activité supprimée." });
      fetchActivitesSolidarite();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer.",
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
    const matchesType = typeFilter === 'tous' || v.type === typeFilter;
    return matchesSearch && matchesStatut && matchesType;
  });

  // Couleurs pour les statuts
  const statutColors = {
    visiteur: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    eloigne: 'bg-red-500 text-white border-red-600',
    nouveau_contact: 'bg-green-500/10 text-green-400 border-green-500/20',
    retourne: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  };

  const statutLabels = {
    visiteur: 'Visiteur',
    eloigne: 'Éloigné',
    nouveau_contact: 'Nouveau converti',
    retourne: 'Revenu'
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="w-full pb-20 space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {isAdmin && <Shield className="text-yellow-500" size={24} />}
            Évangélisation & Attraction des Âmes
          </h1>
          <p className="text-gray-600">
            Gérer les visiteurs, campagnes et suivre les conversions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 bg-white/50">
          <TabsTrigger value="visiteurs" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-none">
            <Users className="w-4 h-4 mr-2 text-purple-500" />
            Visiteurs
          </TabsTrigger>
          <TabsTrigger value="campagnes" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-none">
            <Target className="w-4 h-4 mr-2 text-purple-500" />
            Campagnes
          </TabsTrigger>
          <TabsTrigger value="evenements" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-none">
            <CalendarDays className="w-4 h-4 mr-2 text-purple-500" />
            Événements
          </TabsTrigger>
          <TabsTrigger value="solidarite" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-none">
            <Heart className="w-4 h-4 mr-2 text-purple-500" />
            Solidarité
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-none">
            <BarChart3 className="w-4 h-4 mr-2 text-purple-500" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="parrainage" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-none">
            <QrCode className="w-4 h-4 mr-2 text-purple-500" />
            Parrainage
          </TabsTrigger>
          <TabsTrigger value="eloignes" className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:border-none">
            <RefreshCw className="w-4 h-4 mr-2 text-red-500" />
            Retour Éloignés
          </TabsTrigger>
        </TabsList>

        {/* Onglet Visiteurs */}
        <TabsContent value="visiteurs" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/80 p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-1 gap-4 items-center">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statutFilter} onValueChange={setStatutFilter}>
                <SelectTrigger className="w-48 bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-200 border-none text-gray-600">
                  <SelectItem value="tous" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Tous les statuts</SelectItem>
                  <SelectItem value="visiteur" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Visiteur</SelectItem>
                  <SelectItem value="nouveau_contact" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Nouveau converti</SelectItem>
                  <SelectItem value="eloigne" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Éloigné</SelectItem>
                  <SelectItem value="retourne" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Revenu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-200 border-none text-gray-600">
                  <SelectItem value="tous" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Tous les types</SelectItem>
                  <SelectItem value="nouvelle_ame" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Nouvelle âme</SelectItem>
                  <SelectItem value="ancien_eloigne" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Ancien éloigné</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={isVisiteurDialogOpen} onOpenChange={(open) => {
              setIsVisiteurDialogOpen(open);
              if (!open) resetVisiteurForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
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
                      <Label className="text-gray-900">Prénom *</Label>
                      <Input 
                        value={visiteurFormData.prenom}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, prenom: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Nom</Label>
                      <Input 
                        value={visiteurFormData.nom}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, nom: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Email</Label>
                      <Input 
                        type="email"
                        value={visiteurFormData.email}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, email: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Téléphone</Label>
                      <Input 
                        value={visiteurFormData.telephone}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, telephone: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Type</Label>
                      <Select 
                        value={visiteurFormData.type || 'nouvelle_ame'} 
                        onValueChange={(value) => setVisiteurFormData({...visiteurFormData, type: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-200 border-none text-gray-600">
                          <SelectItem value="nouvelle_ame" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Nouvelle âme</SelectItem>
                          <SelectItem value="ancien_eloigne" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Ancien éloigné</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Statut</Label>
                      <Select 
                        value={visiteurFormData.statut} 
                        onValueChange={(value) => setVisiteurFormData({...visiteurFormData, statut: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-200 border-none text-gray-600">
                          <SelectItem value="visiteur" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Visiteur</SelectItem>
                          <SelectItem value="nouveau_contact" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Nouveau converti</SelectItem>
                          <SelectItem value="eloigne" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Éloigné</SelectItem>
                          <SelectItem value="retourne" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Revenu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Source de contact</Label>
                      <Input 
                        value={visiteurFormData.source_contact}
                        onChange={(e) => setVisiteurFormData({...visiteurFormData, source_contact: e.target.value})}
                        placeholder="Réseaux sociaux, invitation, etc."
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Notes</Label>
                    <Textarea 
                      value={visiteurFormData.notes}
                      onChange={(e) => setVisiteurFormData({...visiteurFormData, notes: e.target.value})}
                      className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsVisiteurDialogOpen(false)} className="bg-white border border-gray-300 text-purple-600 hover:bg-gray-50">Annuler</Button>
                  <Button onClick={handleVisiteurSubmit} className="bg-purple-600 hover:bg-purple-700">Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Liste des visiteurs */}
          {visiteursLoading ? (
            <div className="text-center py-12 text-gray-600">Chargement...</div>
          ) : filteredVisiteurs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun visiteur trouvé</h3>
              <p className="text-gray-600 mb-6">Commencez à ajouter des visiteurs pour suivre vos contacts évangéliques.</p>
              <Button onClick={() => setIsVisiteurDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <UserPlus size={18} className="mr-2" />
                Ajouter un visiteur
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              <AnimatePresence>
                {filteredVisiteurs.map((visiteur) => (
                  <motion.div
                    key={visiteur.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${visiteur.statut === 'eloigne' ? 'bg-gray-100 border border-gray-300' : 'bg-[#1e293b]/40 border border-white/5'} rounded-lg p-4 ${visiteur.statut === 'eloigne' ? 'hover:bg-gray-200' : 'hover:bg-[#1e293b]/60'} transition-colors`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-full ${visiteur.statut === 'eloigne' ? 'bg-purple-500 flex items-center justify-center text-white' : 'bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center text-purple-400'} font-bold text-sm`}>
                            {visiteur.prenom?.[0]}{visiteur.nom?.[0]}
                          </div>
                          <div>
                            <h3 className={`font-bold ${visiteur.statut === 'eloigne' ? 'text-gray-900' : 'text-white'}`}>
                              {visiteur.prenom} {visiteur.nom}
                            </h3>
                            <Badge className={statutColors[visiteur.statut]}>
                              {statutLabels[visiteur.statut]}
                            </Badge>
                          </div>
                        </div>
                        <div className={`flex flex-wrap gap-4 text-sm ${visiteur.statut === 'eloigne' ? 'text-gray-700' : 'text-gray-400'}`}>
                          {visiteur.email && (
                            <div className="flex items-center gap-1">
                              <Mail size={14} className={visiteur.statut === 'eloigne' ? 'text-gray-600' : ''} />
                              {visiteur.email}
                            </div>
                          )}
                          {visiteur.telephone && (
                            <div className="flex items-center gap-1">
                              <Phone size={14} className={visiteur.statut === 'eloigne' ? 'text-gray-600' : ''} />
                              {visiteur.telephone}
                            </div>
                          )}
                          {visiteur.source_contact && (
                            <div className="flex items-center gap-1">
                              <Share2 size={14} className={visiteur.statut === 'eloigne' ? 'text-gray-600' : ''} />
                              {visiteur.source_contact}
                            </div>
                          )}
                        </div>
                        {visiteur.notes && (
                          <p className={`mt-2 text-sm line-clamp-2 ${visiteur.statut === 'eloigne' ? 'text-gray-700' : 'text-gray-300'}`}>{visiteur.notes}</p>
                        )}
                        {visiteur.date_premier_contact && (
                          <div className={`mt-2 text-xs ${visiteur.statut === 'eloigne' ? 'text-gray-900' : 'text-gray-500'}`}>
                            Premier contact: <span className={visiteur.statut === 'eloigne' ? 'text-red-600' : ''}>{new Date(visiteur.date_premier_contact).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {visiteur.statut === 'eloigne' && visiteur.date_dernier_contact && (
                          <div className="mt-2 text-xs text-gray-900">
                            Membre éloigné depuis <span className="text-red-600">{Math.floor((new Date() - new Date(visiteur.date_dernier_contact)) / (1000 * 60 * 60 * 24 * 30))} mois</span> - Test
                          </div>
                        )}
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
                              type: visiteur.type || 'nouvelle_ame',
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
          <div className="flex justify-end">
            <Dialog open={isCampagneDialogOpen} onOpenChange={(open) => {
              setIsCampagneDialogOpen(open);
              if (!open) resetCampagneForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
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
                    <Label className="text-gray-900">Nom de la campagne *</Label>
                    <Input 
                      value={campagneFormData.nom}
                      onChange={(e) => setCampagneFormData({...campagneFormData, nom: e.target.value})}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Description</Label>
                    <Textarea 
                      value={campagneFormData.description}
                      onChange={(e) => setCampagneFormData({...campagneFormData, description: e.target.value})}
                      className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Type</Label>
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
                      <Label className="text-gray-900">Statut</Label>
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
                      <Label className="text-gray-900">Date de début</Label>
                      <Input 
                        type="date"
                        value={campagneFormData.date_debut}
                        onChange={(e) => setCampagneFormData({...campagneFormData, date_debut: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Date de fin</Label>
                      <Input 
                        type="date"
                        value={campagneFormData.date_fin}
                        onChange={(e) => setCampagneFormData({...campagneFormData, date_fin: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Objectif de participants</Label>
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
                  <Button onClick={handleCampagneSubmit} className="bg-purple-600">Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Liste des campagnes */}
          {campagnesLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : campagnes.length === 0 ? (
            <div className="text-center py-12 bg-card/5 rounded-xl border border-white/5 border-dashed">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Target className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune campagne</h3>
              <p className="text-gray-400 mb-6">Créez votre première campagne d'évangélisation pour organiser vos actions.</p>
              <Button onClick={() => setIsCampagneDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Target size={18} className="mr-2" />
                Créer une campagne
              </Button>
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

        {/* Onglet Événements */}
        <TabsContent value="evenements" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isEvenementDialogOpen} onOpenChange={(open) => {
              setIsEvenementDialogOpen(open);
              if (!open) resetEvenementForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus size={18} className="mr-2" />
                  Créer un événement
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">{editingEvenementId ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-gray-900">Nom de l'événement *</Label>
                    <Input 
                      value={evenementFormData.nom}
                      onChange={(e) => setEvenementFormData({...evenementFormData, nom: e.target.value})}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Description</Label>
                    <Textarea 
                      value={evenementFormData.description}
                      onChange={(e) => setEvenementFormData({...evenementFormData, description: e.target.value})}
                      className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Type d'événement</Label>
                      <Select 
                        value={evenementFormData.type_evenement} 
                        onValueChange={(value) => setEvenementFormData({...evenementFormData, type_evenement: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="thematique">Thématique</SelectItem>
                          <SelectItem value="banque_alimentaire">Banque alimentaire</SelectItem>
                          <SelectItem value="solidarite">Solidarité</SelectItem>
                          <SelectItem value="agape">Agape</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Statut</Label>
                      <Select 
                        value={evenementFormData.statut} 
                        onValueChange={(value) => setEvenementFormData({...evenementFormData, statut: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planifie">Planifié</SelectItem>
                          <SelectItem value="en_cours">En cours</SelectItem>
                          <SelectItem value="termine">Terminé</SelectItem>
                          <SelectItem value="annule">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de l'événement *</Label>
                      <Input 
                        type="date"
                        value={evenementFormData.date_evenement}
                        onChange={(e) => setEvenementFormData({...evenementFormData, date_evenement: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Lieu</Label>
                      <Input 
                        value={evenementFormData.lieu}
                        onChange={(e) => setEvenementFormData({...evenementFormData, lieu: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Heure de début</Label>
                      <Input 
                        type="time"
                        value={evenementFormData.heure_debut}
                        onChange={(e) => setEvenementFormData({...evenementFormData, heure_debut: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Heure de fin</Label>
                      <Input 
                        type="time"
                        value={evenementFormData.heure_fin}
                        onChange={(e) => setEvenementFormData({...evenementFormData, heure_fin: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Responsable</Label>
                      <Select 
                        value={evenementFormData.responsable_id || user.id} 
                        onValueChange={(value) => setEvenementFormData({...evenementFormData, responsable_id: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={user.id}>Moi</SelectItem>
                          {responsables.map((resp) => (
                            <SelectItem key={resp.id} value={resp.id}>
                              {resp.first_name} {resp.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Objectif participants</Label>
                      <Input 
                        type="number"
                        value={evenementFormData.objectif_participants}
                        onChange={(e) => setEvenementFormData({...evenementFormData, objectif_participants: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Nombre de participants</Label>
                      <Input 
                        type="number"
                        value={evenementFormData.nombre_participants}
                        onChange={(e) => setEvenementFormData({...evenementFormData, nombre_participants: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Nombre de nouvelles âmes</Label>
                      <Input 
                        type="number"
                        value={evenementFormData.nombre_nouvelles_ames}
                        onChange={(e) => setEvenementFormData({...evenementFormData, nombre_nouvelles_ames: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Notes</Label>
                    <Textarea 
                      value={evenementFormData.notes}
                      onChange={(e) => setEvenementFormData({...evenementFormData, notes: e.target.value})}
                      className="bg-white border-gray-300 text-gray-900 min-h-[80px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEvenementDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleEvenementSubmit} className="bg-purple-600">Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Liste des événements */}
          {evenementsLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : evenements.length === 0 ? (
            <div className="text-center py-12 bg-card/5 rounded-xl border border-white/5 border-dashed">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <CalendarDays className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun événement</h3>
              <p className="text-gray-400 mb-6">Créez votre premier événement d'évangélisation pour rassembler votre communauté.</p>
              <Button onClick={() => setIsEvenementDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <CalendarDays size={18} className="mr-2" />
                Créer un événement
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {evenements.map((evenement) => (
                <Card key={evenement.id} className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-gray-900">{evenement.nom}</CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                          {evenement.description}
                        </CardDescription>
                      </div>
                      <Badge className={
                        evenement.statut === 'en_cours' ? 'bg-green-500/10 text-green-400' :
                        evenement.statut === 'termine' ? 'bg-blue-500/10 text-blue-400' :
                        evenement.statut === 'annule' ? 'bg-red-500/10 text-red-400' :
                        'bg-orange-500/10 text-orange-400'
                      }>
                        {evenement.statut}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>{new Date(evenement.date_evenement).toLocaleDateString('fr-FR')}</span>
                        {evenement.heure_debut && evenement.heure_fin && (
                          <span className="text-gray-500">• {evenement.heure_debut} - {evenement.heure_fin}</span>
                        )}
                      </div>
                      {evenement.lieu && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} />
                          <span>{evenement.lieu}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {evenement.type_evenement}
                        </Badge>
                      </div>
                      {evenement.profils && (
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          <span>Responsable: {evenement.profils.first_name} {evenement.profils.last_name}</span>
                        </div>
                      )}
                      {evenement.nombre_participants > 0 && (
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          <span>{evenement.nombre_participants} participants</span>
                        </div>
                      )}
                      {evenement.nombre_nouvelles_ames > 0 && (
                        <div className="flex items-center gap-2 text-purple-400">
                          <UserPlus size={14} />
                          <span>{evenement.nombre_nouvelles_ames} nouvelles âmes</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingEvenementId(evenement.id);
                          setEvenementFormData({
                            nom: evenement.nom || '',
                            description: evenement.description || '',
                            type_evenement: evenement.type_evenement || 'thematique',
                            date_evenement: evenement.date_evenement || '',
                            heure_debut: evenement.heure_debut || '',
                            heure_fin: evenement.heure_fin || '',
                            lieu: evenement.lieu || '',
                            responsable_id: evenement.responsable_id || user.id,
                            objectif_participants: evenement.objectif_participants?.toString() || '',
                            nombre_participants: evenement.nombre_participants?.toString() || '',
                            nombre_nouvelles_ames: evenement.nombre_nouvelles_ames?.toString() || '',
                            statut: evenement.statut || 'planifie',
                            notes: evenement.notes || ''
                          });
                          setIsEvenementDialogOpen(true);
                        }}
                      >
                        <Edit2 size={14} className="mr-2" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteEvenement(evenement.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Onglet Solidarité */}
        <TabsContent value="solidarite" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isActiviteDialogOpen} onOpenChange={(open) => {
              setIsActiviteDialogOpen(open);
              if (!open) resetActiviteForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus size={18} className="mr-2" />
                  Créer une activité
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">{editingActiviteId ? "Modifier l'activité" : "Nouvelle activité"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Type d'activité</Label>
                      <Select 
                        value={activiteFormData.type_activite} 
                        onValueChange={(value) => setActiviteFormData({...activiteFormData, type_activite: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="banque_alimentaire">Banque alimentaire</SelectItem>
                          <SelectItem value="solidarite">Solidarité</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Date de l'activité *</Label>
                      <Input 
                        type="date"
                        value={activiteFormData.date_activite}
                        onChange={(e) => setActiviteFormData({...activiteFormData, date_activite: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Nombre de personnes servies</Label>
                      <Input 
                        type="number"
                        value={activiteFormData.nombre_personnes_services}
                        onChange={(e) => setActiviteFormData({...activiteFormData, nombre_personnes_services: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Nombre de nouvelles âmes</Label>
                      <Input 
                        type="number"
                        value={activiteFormData.nombre_nouvelles_ames}
                        onChange={(e) => setActiviteFormData({...activiteFormData, nombre_nouvelles_ames: e.target.value})}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Responsable</Label>
                    <Select 
                      value={activiteFormData.responsable_id || user.id} 
                      onValueChange={(value) => setActiviteFormData({...activiteFormData, responsable_id: value})}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={user.id}>Moi</SelectItem>
                        {responsables.map((resp) => (
                          <SelectItem key={resp.id} value={resp.id}>
                            {resp.first_name} {resp.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Description</Label>
                    <Textarea 
                      value={activiteFormData.description}
                      onChange={(e) => setActiviteFormData({...activiteFormData, description: e.target.value})}
                      className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsActiviteDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleActiviteSubmit} className="bg-purple-600">Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Liste des activités */}
          {activitesSolidariteLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : activitesSolidarite.length === 0 ? (
            <div className="text-center py-12 bg-card/5 rounded-xl border border-white/5 border-dashed">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune activité</h3>
              <p className="text-gray-400 mb-6">Créez votre première activité de solidarité pour servir votre communauté.</p>
              <Button onClick={() => setIsActiviteDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Heart size={18} className="mr-2" />
                Créer une activité
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activitesSolidarite.map((activite) => (
                <Card key={activite.id} className="bg-[#1e293b]/40 border-white/5">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-gray-900 flex items-center gap-2">
                          <Heart size={18} className="text-purple-500" />
                          {activite.type_activite === 'banque_alimentaire' ? 'Banque Alimentaire' :
                           activite.type_activite === 'solidarite' ? 'Solidarité' : 'Autre'}
                        </CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                          {new Date(activite.date_activite).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-400">
                      {activite.description && (
                        <p className="text-gray-300">{activite.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Users size={14} />
                        <span>{activite.nombre_personnes_services} personnes servies</span>
                      </div>
                      {activite.nombre_nouvelles_ames > 0 && (
                        <div className="flex items-center gap-2 text-purple-400">
                          <UserPlus size={14} />
                          <span>{activite.nombre_nouvelles_ames} nouvelles âmes</span>
                        </div>
                      )}
                      {activite.profils && (
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          <span>Responsable: {activite.profils.first_name} {activite.profils.last_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingActiviteId(activite.id);
                          setActiviteFormData({
                            type_activite: activite.type_activite || 'banque_alimentaire',
                            date_activite: activite.date_activite || '',
                            nombre_personnes_services: activite.nombre_personnes_services?.toString() || '',
                            nombre_nouvelles_ames: activite.nombre_nouvelles_ames?.toString() || '',
                            responsable_id: activite.responsable_id || user.id,
                            description: activite.description || ''
                          });
                          setIsActiviteDialogOpen(true);
                        }}
                      >
                        <Edit2 size={14} className="mr-2" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteActivite(activite.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Supprimer
                      </Button>
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
                <Card className="bg-gray-100 border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-900">Total Visiteurs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">{statsData.totalVisiteurs}</div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-100 border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-900">Total Campagnes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{statsData.totalCampagnes}</div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-100 border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-900">Conversions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600">{statsData.conversions}</div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-100 border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-900">Taux de conversion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-pink-600">
                      {statsData.totalVisiteurs > 0 
                        ? ((statsData.conversions / statsData.totalVisiteurs) * 100).toFixed(1) 
                        : 0}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gray-100 border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Funnel de Conversion</CardTitle>
                    <CardDescription className="text-gray-600">Répartition des visiteurs par statut</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {statsData.funnelData.map((entry, index) => {
                        const total = statsData.funnelData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-gray-900 font-medium">{entry.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-gray-600">{entry.value}</span>
                              <span className="text-gray-500 text-sm">({percentage}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-100 border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Répartition par Statut</CardTitle>
                    <CardDescription className="text-gray-600">Nombre de visiteurs par catégorie</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {statsData.funnelData.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-gray-900 font-medium">{entry.name}</span>
                          </div>
                          <span className="text-gray-900 font-bold text-lg">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Section Objectif 1A - Key Results */}
              <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Objectif 1A : Attirer les nouvelles âmes
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Key Results sur 3 mois
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* KPIs Objectif 1A */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gray-100 border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-900">Nouvelles âmes contactées</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-indigo-600">{statsData.nouvellesAmesContactees}</div>
                        <div className="text-xs text-gray-600 mt-1">sur 800 (Objectif KR1A.1)</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-100 border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-900">Nouvelles âmes présentes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-violet-600">{statsData.nouvellesAmesPresentes}</div>
                        <div className="text-xs text-gray-600 mt-1">Taux: {statsData.tauxConversion}% (Objectif: 25%)</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-100 border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-900">Taux de conversion</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-cyan-600">{statsData.tauxConversion}%</div>
                        <div className="text-xs text-gray-600 mt-1">Objectif: 25% (KR1A.2)</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Barres de progression Key Results */}
                  <div className="space-y-4">
                    {/* KR1A.1 : 800 nouvelles âmes */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-white font-medium">KR1A.1 : Attirer 800 nouvelles âmes</Label>
                        <span className="text-sm text-gray-400">
                          {statsData.nouvellesAmesContactees} / 800 ({statsData.progressionKR1A1.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress 
                        value={statsData.progressionKR1A1} 
                        className="h-3 bg-gray-700" 
                        indicatorClassName="bg-purple-500"
                      />
                      {statsData.progressionKR1A1 < 100 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Il reste {800 - statsData.nouvellesAmesContactees} nouvelles âmes à contacter pour atteindre l'objectif
                        </p>
                      )}
                    </div>

                    {/* KR1A.2 : 25% de réponse */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-white font-medium">KR1A.2 : 25% des nouvelles âmes répondent</Label>
                        <span className="text-sm text-gray-400">
                          {statsData.tauxConversion.toFixed(1)}% / 25% ({statsData.progressionKR1A2.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress 
                        value={statsData.progressionKR1A2} 
                        className="h-3 bg-gray-700" 
                        indicatorClassName="bg-blue-500"
                      />
                      {statsData.progressionKR1A2 < 100 && statsData.tauxConversion < 25 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Il manque {(25 - statsData.tauxConversion).toFixed(1)}% pour atteindre l'objectif de 25%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Statistiques hebdomadaires */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-gray-100 border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-900 text-lg">Nouvelles âmes contactées (12 semaines)</CardTitle>
                        <CardDescription className="text-gray-600">Évolution hebdomadaire</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {statsData.graphiqueHebdomadaireContactees && statsData.graphiqueHebdomadaireContactees.length > 0 ? (
                            statsData.graphiqueHebdomadaireContactees.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                <span className="text-gray-900 font-medium">{item.semaine}</span>
                                <span className="text-teal-600 font-bold text-lg">{item.contactees || 0}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">Aucune donnée disponible</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-100 border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-900 text-lg">Nouvelles âmes présentes (12 semaines)</CardTitle>
                        <CardDescription className="text-gray-600">Évolution hebdomadaire</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {statsData.graphiqueHebdomadairePresentes && statsData.graphiqueHebdomadairePresentes.length > 0 ? (
                            statsData.graphiqueHebdomadairePresentes.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                <span className="text-gray-900 font-medium">{item.semaine}</span>
                                <span className="text-blue-600 font-bold text-lg">{item.presentes || 0}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">Aucune donnée disponible</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recommandations et alertes */}
                  {(statsData.progressionKR1A1 < 80 || statsData.progressionKR1A2 < 80) && (
                    <Card className={`bg-${statsData.progressionKR1A1 < 50 || statsData.progressionKR1A2 < 50 ? 'red' : 'orange'}-500/10 border-${statsData.progressionKR1A1 < 50 || statsData.progressionKR1A2 < 50 ? 'red' : 'orange'}-500/20`}>
                      <CardHeader>
                        <CardTitle className={`text-${statsData.progressionKR1A1 < 50 || statsData.progressionKR1A2 < 50 ? 'red' : 'orange'}-400 flex items-center gap-2`}>
                          <AlertCircle size={20} />
                          Attention
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-gray-300">
                        {statsData.progressionKR1A1 < 80 && (
                          <p>
                            Pour atteindre 800 nouvelles âmes, il faut encore contacter <strong>{800 - statsData.nouvellesAmesContactees}</strong> nouvelles âmes.
                            {statsData.progressionKR1A1 < 50 && ' Action urgente requise !'}
                          </p>
                        )}
                        {statsData.progressionKR1A2 < 80 && (
                          <p>
                            Le taux de réponse actuel est de <strong>{statsData.tauxConversion.toFixed(1)}%</strong>, l'objectif est de 25%.
                            {statsData.progressionKR1A2 < 50 && ' Renforcer la fidélisation !'}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
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
            <Card className="bg-gray-100 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <AlertCircle size={20} className="text-red-500" />
                  Erreur de création
                </CardTitle>
                <CardDescription className="text-gray-700">
                  Impossible de créer votre code d'invitation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {codeInvitationError && (
                  <div className="bg-gray-200 p-3 rounded text-xs text-gray-900 font-mono break-all border border-gray-300">
                    {codeInvitationError}
                  </div>
                )}
                <div className="text-sm text-gray-700 space-y-2">
                  <p className="font-medium text-gray-900">Vérifiez que :</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-700">
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
                  className="mt-4 bg-white text-purple-600 border border-gray-300 hover:bg-gray-50"
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
                <Card className="bg-gray-50 border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-black flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-purple-600" />
                      Mon Code d'Invitation
                    </CardTitle>
                    <CardDescription className="text-gray-700">
                      Partagez ce code pour inviter de nouvelles personnes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-gray-300">
                      {qrCodeUrl && (
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code d'invitation" 
                          className="w-64 h-64 rounded-lg bg-white p-2"
                        />
                      )}
                      <p className="text-xs text-black mt-4 text-center">
                        Scannez ce code QR pour accéder au lien d'invitation
                      </p>
                    </div>

                    {/* Code et lien */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-black text-sm">Code d'invitation</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input 
                            value={codeInvitation?.code || ''}
                            readOnly
                            className="bg-white border-gray-300 text-black font-mono"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyCode}
                            className="shrink-0 border-gray-300"
                          >
                            {copied ? <Check size={16} className="text-purple-600" /> : <Copy size={16} className="text-purple-600" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-black text-sm">Lien d'invitation</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input 
                            value={codeInvitation?.lien_invitation || ''}
                            readOnly
                            className="bg-white border-gray-300 text-black text-xs"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyCode}
                            className="shrink-0 border-gray-300"
                          >
                            {copied ? <Check size={16} className="text-purple-600" /> : <Copy size={16} className="text-purple-600" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Boutons de partage */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleShare('whatsapp')}
                        className="bg-green-500 border-green-600 text-white hover:bg-green-600"
                      >
                        <Share2 size={16} className="mr-2" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleShare('facebook')}
                        className="bg-blue-500 border-blue-600 text-white hover:bg-blue-600"
                      >
                        <Share2 size={16} className="mr-2" />
                        Facebook
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleShare('twitter')}
                        className="bg-cyan-500 border-cyan-600 text-white hover:bg-cyan-600"
                      >
                        <Share2 size={16} className="mr-2" />
                        Twitter
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleShare('email')}
                        className="bg-gray-600 border-gray-700 text-white hover:bg-gray-700"
                      >
                        <Mail size={16} className="mr-2" />
                        Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistiques de parrainage */}
                <Card className="bg-gray-50 border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-black flex items-center gap-2">
                      <Award className="w-5 h-5 text-purple-600" />
                      Mes Statistiques
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-300 rounded-lg p-4">
                        <div className="text-3xl font-bold text-purple-600">
                          {codeInvitation?.nombre_invites || 0}
                        </div>
                        <div className="text-sm text-black mt-1">Invitations envoyées</div>
                      </div>
                      <div className="bg-white border border-gray-300 rounded-lg p-4">
                        <div className="text-3xl font-bold text-purple-600">
                          {codeInvitation?.nombre_conversions || 0}
                        </div>
                        <div className="text-sm text-black mt-1">Conversions</div>
                      </div>
                    </div>
                    {codeInvitation && (
                      <div className="pt-4 border-t border-gray-300">
                        <p className="text-xs text-black">
                          Code créé le {new Date(codeInvitation.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Formulaire d'envoi d'invitation */}
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-black">Envoyer une invitation</CardTitle>
                      <CardDescription className="text-gray-700">
                        Envoyez une invitation personnalisée à quelqu'un
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => setIsInvitationDialogOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <UserPlus size={18} className="mr-2" />
                      Nouvelle invitation
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Dialog pour envoyer invitation */}
              <Dialog open={isInvitationDialogOpen} onOpenChange={setIsInvitationDialogOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900">Envoyer une invitation</DialogTitle>
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
                          className="bg-white border-gray-300 text-gray-900"
                          placeholder="Prénom du destinataire"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input 
                          value={invitationFormData.nom}
                          onChange={(e) => setInvitationFormData({...invitationFormData, nom: e.target.value})}
                          className="bg-white border-gray-300 text-gray-900"
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
                          className="bg-white border-gray-300 text-gray-900"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone *</Label>
                        <Input 
                          value={invitationFormData.telephone}
                          onChange={(e) => setInvitationFormData({...invitationFormData, telephone: e.target.value})}
                          className="bg-white border-gray-300 text-gray-900"
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
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
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
                    <Button onClick={handleSendInvitation} className="bg-purple-600">Envoyer l'invitation</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Liste des invitations envoyées */}
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-black">Historique des invitations</CardTitle>
                  <CardDescription className="text-gray-700">
                    Suivez toutes vos invitations envoyées
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invitationsLoading ? (
                    <div className="text-center py-12 text-black">Chargement...</div>
                  ) : invitationsEnvoyees.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-300 border-dashed">
                      <Share2 className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-black mb-1">Aucune invitation</h3>
                      <p className="text-gray-700">Commencez à inviter des personnes !</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invitationsEnvoyees.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="bg-white border border-gray-300 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                                  {invitation.prenom?.[0] || invitation.email?.[0] || '?'}
                                </div>
                                <div>
                                  <h3 className="font-bold text-black">
                                    {invitation.prenom && invitation.nom 
                                      ? `${invitation.prenom} ${invitation.nom}`
                                      : invitation.email || invitation.telephone || 'Invité anonyme'}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={
                                      invitation.statut === 'conversion' ? 'bg-emerald-100 text-emerald-700' :
                                      invitation.statut === 'ouverte' ? 'bg-blue-100 text-blue-700' :
                                      invitation.statut === 'ignoree' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-700'
                                    }>
                                      {invitation.statut}
                                    </Badge>
                                    <span className="text-xs text-black">
                                      {invitation.canal}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {invitation.email && (
                                <div className="flex items-center gap-1 text-sm text-black mb-1">
                                  <Mail size={14} className="text-purple-600" />
                                  {invitation.email}
                                </div>
                              )}
                              {invitation.telephone && (
                                <div className="flex items-center gap-1 text-sm text-black mb-1">
                                  <Phone size={14} className="text-purple-600" />
                                  {invitation.telephone}
                                </div>
                              )}
                              {invitation.message && (
                                <p className="text-sm text-gray-700 mt-2 italic line-clamp-2">
                                  {invitation.message}
                                </p>
                              )}
                              <div className="text-xs text-black mt-2">
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
          <Card className="bg-gray-100 border-gray-200">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle size={20} className="text-red-600" />
                Membres Éloignés (&gt; 3 mois)
              </CardTitle>
              <CardDescription className="text-gray-600">
                Liste des personnes qui n'ont pas été contactées depuis plus de 3 mois
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Dashboard Objectif 1B */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-100 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Objectif 1B - Key Results</CardTitle>
                <CardDescription className="text-gray-600">Faire revenir les anciens qui ne revenaient plus</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* KR1B.1 : Recenser 500 personnes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">KR1B.1 : Recenser 500 personnes</span>
                    <span className="text-sm font-bold text-red-600">
                      {statsObjectif1B.totalEloignesRecenses} / 500
                    </span>
                  </div>
                  <Progress 
                    value={statsObjectif1B.progressionKR1B1} 
                    className="h-2"
                    indicatorClassName="bg-red-600"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {statsObjectif1B.progressionKR1B1.toFixed(1)}% complété
                  </p>
                </div>

                {/* KR1B.2 : Faire revenir 50% (250 personnes) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">KR1B.2 : Faire revenir 50% (250 personnes)</span>
                    <span className="text-sm font-bold text-red-600">
                      {statsObjectif1B.totalRetoursEffectifs} / 250
                    </span>
                  </div>
                  <Progress 
                    value={statsObjectif1B.progressionKR1B2} 
                    className="h-2"
                    indicatorClassName="bg-red-600"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {statsObjectif1B.progressionKR1B2.toFixed(1)}% complété
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* KPIs Objectif 1B */}
            <Card className="bg-gray-100 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Indicateurs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700">Éloignés recensés</span>
                  <span className="text-lg font-bold text-red-600">{statsObjectif1B.totalEloignesRecenses}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700">Contacts établis</span>
                  <span className="text-lg font-bold text-blue-600">{statsObjectif1B.totalContactsEtablis}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700">Retours effectifs</span>
                  <span className="text-lg font-bold text-emerald-600">{statsObjectif1B.totalRetoursEffectifs}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {eloignesLoading ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : eloignes.length === 0 ? (
            <div className="text-center py-12 bg-gray-100 rounded-xl border border-gray-200 border-dashed">
              <RefreshCw className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun membre éloigné</h3>
              <p className="text-gray-600">Tous les contacts sont à jour !</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {eloignes.map((visiteur) => (
                <motion.div
                  key={visiteur.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500 border border-blue-600 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                          {visiteur.prenom?.[0]}{visiteur.nom?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-white">
                            {visiteur.prenom} {visiteur.nom}
                          </h3>
                          <p className="text-sm text-white/80">
                            Dernier contact: <span className="text-red-500">{new Date(visiteur.date_dernier_contact).toLocaleDateString('fr-FR')}</span>
                          </p>
                          {visiteur.date_premier_contact && (
                            <p className="text-sm text-black mt-1">
                              Premier contact: <span className="text-red-600">{new Date(visiteur.date_premier_contact).toLocaleDateString('fr-FR')}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-white/80">
                        {visiteur.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={14} className="text-white" />
                            {visiteur.email}
                          </div>
                        )}
                        {visiteur.telephone && (
                          <div className="flex items-center gap-1">
                            <Phone size={14} className="text-white" />
                            {visiteur.telephone}
                          </div>
                        )}
                      </div>
                      
                      {/* Historique des contacts */}
                      {contactsRelance[visiteur.id] && contactsRelance[visiteur.id].length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <p className="text-xs font-medium text-white/90 mb-2">Historique des contacts :</p>
                          <div className="space-y-2">
                            {contactsRelance[visiteur.id].slice(0, 3).map((contact) => {
                              const typeLabels = {
                                telephone: 'Téléphone',
                                email: 'Email',
                                sms: 'SMS',
                                whatsapp: 'WhatsApp',
                                visite: 'Visite',
                                autre: 'Autre'
                              };
                              const statutLabels = {
                                tente: 'Tenté',
                                joint: 'Joint',
                                pas_de_reponse: 'Pas de réponse',
                                refuse: 'Refusé',
                                interesse: 'Intéressé'
                              };
                              const statutColors = {
                                tente: 'text-yellow-300',
                                joint: 'text-green-300',
                                pas_de_reponse: 'text-gray-300',
                                refuse: 'text-red-300',
                                interesse: 'text-blue-300'
                              };
                              return (
                                <div key={contact.id} className="text-xs text-white/70 bg-white/10 rounded p-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">
                                      {new Date(contact.date_contact).toLocaleString('fr-FR', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    <span className={`${statutColors[contact.statut] || 'text-white/70'} font-medium`}>
                                      {statutLabels[contact.statut] || contact.statut}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span>{typeLabels[contact.type_contact] || contact.type_contact}</span>
                                    {contact.profils && (
                                      <span className="text-white/50">
                                        par {contact.profils.first_name} {contact.profils.last_name}
                                      </span>
                                    )}
                                  </div>
                                  {contact.notes && (
                                    <p className="text-white/60 mt-1 line-clamp-1 italic">"{contact.notes}"</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {contactsRelance[visiteur.id].length > 3 && (
                            <p className="text-xs text-white/50 mt-2">
                              + {contactsRelance[visiteur.id].length - 3} autre(s) contact(s)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleOpenRelanceDialog(visiteur)}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      <RefreshCw size={16} className="mr-2" />
                      Relancer
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Dialog de relance */}
          <Dialog open={isRelanceDialogOpen} onOpenChange={setIsRelanceDialogOpen}>
            <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-gray-900">
                  Enregistrer une relance
                  {selectedEloigne && (
                    <span className="text-sm font-normal text-gray-600 block mt-1">
                      {selectedEloigne.prenom} {selectedEloigne.nom}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Enregistrez les détails de votre contact avec ce membre éloigné
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-gray-900">Type de contact</Label>
                  <Select 
                    value={relanceFormData.type_contact} 
                    onValueChange={(value) => setRelanceFormData({...relanceFormData, type_contact: value})}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telephone">Téléphone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="visite">Visite</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-900">Statut du contact</Label>
                  <Select 
                    value={relanceFormData.statut} 
                    onValueChange={(value) => setRelanceFormData({...relanceFormData, statut: value})}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tente">Tenté</SelectItem>
                      <SelectItem value="joint">Joint</SelectItem>
                      <SelectItem value="pas_de_reponse">Pas de réponse</SelectItem>
                      <SelectItem value="refuse">Refusé</SelectItem>
                      <SelectItem value="interesse">Intéressé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-900">Notes (optionnel)</Label>
                  <Textarea 
                    value={relanceFormData.notes}
                    onChange={(e) => setRelanceFormData({...relanceFormData, notes: e.target.value})}
                    className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
                    placeholder="Ajoutez des notes sur le contact..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-900">Prochaine relance (optionnel)</Label>
                  <Input 
                    type="datetime-local"
                    value={relanceFormData.prochaine_relance}
                    onChange={(e) => setRelanceFormData({...relanceFormData, prochaine_relance: e.target.value})}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsRelanceDialogOpen(false)}
                  className="bg-white text-purple-600 border border-gray-300 hover:bg-gray-50"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleRelancerEloigne} 
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Enregistrer la relance
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Evangelization;

