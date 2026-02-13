import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, Phone, Calendar, MessageSquare, MapPin, Activity, X, Flame, Trash2, Loader2, TrendingUp, Users, UserCheck, Award, UserPlus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';

const STATUS_LABELS = {
  "newbelievers": "Nouveau converti",
  "newBelievers": "Nouveau converti",
  "NEWBELIEVERS": "Nouveau converti",
  "newBelivers": "Nouveau converti",
  "unbelievers": "Non-croyant",
  "makers": "Faiseur de disciples",
  "established": "Disciple affermi",
  "Non-croyant": "Non-croyant",
  "Nouveau converti": "Nouveau converti",
  "NOUVEAU CONVERTI": "Nouveau converti",
  "Disciple Affermi": "Disciple Affermi",
  "Faiseur de Disciples": "Faiseur de Disciples"
};

const getStatusLabel = (status) => {
  if (!status) return '';
  // Normaliser le statut pour gérer les variations
  const normalizedStatus = status.toString().toLowerCase().trim();
  
  // Mapping direct
  if (STATUS_LABELS[status]) {
    return STATUS_LABELS[status];
  }
  
  // Vérifier les variations
  if (normalizedStatus.includes('newbeliever') || normalizedStatus.includes('nouveau') || normalizedStatus.includes('converti')) {
    return 'Nouveau converti';
  }
  if (normalizedStatus.includes('unbeliever') || normalizedStatus.includes('non-croyant')) {
    return 'Non-croyant';
  }
  if (normalizedStatus.includes('established') || normalizedStatus.includes('affermi')) {
    return 'Disciple affermi';
  }
  if (normalizedStatus.includes('maker') || normalizedStatus.includes('faiseur')) {
return 'Faiseur de disciples';
  }
  
  return status;
};

// Mapping des niveaux spirituels
// Niveau 1 : Non-croyant
// Niveau 2 : Nouveau converti
// Niveau 3 : Disciple Affermi
// Niveau 4 : Faiseur de Disciples
const SPIRITUAL_LEVELS = {
  // Format français
  'Non-croyant': { level: 1, next: 'Nouveau converti', dbValue: 'newbelievers' },
  'Nouveau converti': { level: 2, next: 'Disciple Affermi', dbValue: 'established' },
  'Disciple Affermi': { level: 3, next: 'Faiseur de Disciples', dbValue: 'makers' },
  'Faiseur de Disciples': { level: 4, next: null, dbValue: 'makers' },
  // Format anglais (valeurs DB)
  'unbelievers': { level: 1, next: 'Nouveau converti', dbValue: 'newbelievers' },
  'newbelievers': { level: 2, next: 'Disciple Affermi', dbValue: 'established' },
  'established': { level: 3, next: 'Faiseur de Disciples', dbValue: 'makers' },
  'makers': { level: 4, next: null, dbValue: 'makers' }
};

const getCurrentLevel = (circleType) => {
  const normalized = getStatusLabel(circleType);
  return SPIRITUAL_LEVELS[normalized] || SPIRITUAL_LEVELS[circleType] || null;
};

const getNextLevel = (circleType) => {
  const current = getCurrentLevel(circleType);
  if (!current || !current.next) return null;
  return SPIRITUAL_LEVELS[current.next] || null;
};

const DiscipleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const displayNombreDisciples = location.state?.displayNombreDisciples;
  const { toast } = useToast();
  const { user } = useAuth();
  const [disciple, setDisciple] = useState(null);
  const [loading, setLoading] = useState(true);
  const [familySupervisorId, setFamilySupervisorId] = useState(null);
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [upgradeRoleType, setUpgradeRoleType] = useState(null);
  const [disciplesSuivis, setDisciplesSuivis] = useState([]);
  const [loadingDisciplesSuivis, setLoadingDisciplesSuivis] = useState(false);
  const [suiviParNom, setSuiviParNom] = useState(null);
  const [savingFonction, setSavingFonction] = useState(false);
  const discipleIdRef = useRef(null);

  const FONCTIONS_OPTIONS = [
    { value: '', label: 'Non renseigné' },
    { value: 'Pasteur', label: 'Pasteur' },
    { value: 'AP', label: 'AP (Assistant Pasteur)' },
    { value: 'Berger', label: 'Berger' }
  ];

  const handleFonctionChange = async (value) => {
    if (!disciple?.id || disciple.is_demo) return;
    const fonction = value === '__none__' ? null : value;
    setSavingFonction(true);
    try {
      const { error } = await supabase.from('profils').update({ fonction: fonction || null }).eq('id', disciple.id);
      if (error) throw error;
      setDisciple({ ...disciple, fonction: fonction || '' });
      toast({ title: 'Fonction mise à jour', description: fonction ? `Fonction enregistrée : ${FONCTIONS_OPTIONS.find(f => f.value === fonction)?.label || fonction}` : 'Fonction effacée.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: e.message || 'Impossible de mettre à jour la fonction.' });
    } finally {
      setSavingFonction(false);
    }
  };

  // Modal Form State
  const [prayerRequest, setPrayerRequest] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    fetchDiscipleDetails();
  }, [id]);

  discipleIdRef.current = disciple?.id ?? null;

  useEffect(() => {
    if (disciple && disciple.id && !disciple.is_demo) {
      (async () => {
        try {
          const { clearCache } = await import('@/lib/CacheUtils');
          clearCache(`disciple_suivis_${disciple.id}`);
        } catch (_) {}
        await fetchDisciplesSuivis(true);
      })();
    } else if (disciple?.is_demo) {
      setDisciplesSuivis([]);
    }
  }, [disciple?.id]);

  const fetchDiscipleDetails = async () => {
    // Validate UUID format to prevent DB errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
        // Handle the specific mock ID from dashboard demo
        if (id === 'mock-disciple-id') {
            setDisciple({
                id: 'mock-disciple-id',
                name: 'Marc (Démo)',
                circle_type: 'Nouveau Croyant',
                created_at: new Date().toISOString(),
                is_demo: true
            });
            setLoading(false);
            return;
        }

        // Handle other invalid IDs
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "Identifiant de disciple invalide."
        });
        navigate('/disciples');
        return;
    }

    try {
      // OPTIMISATION: Utiliser le cache pour les détails du disciple (TTL: 3 minutes)
      const { getOrSetCache } = await import('@/lib/CacheUtils');
      const cacheKey = `disciple_detail_${id}`;
      
      const data = await getOrSetCache(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('profils')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return data;
        },
        3 * 60 * 1000 // 3 minutes
      );

      if (!data) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Profil introuvable."
        });
        navigate(-1);
        return;
      }

      // profils a first_name/last_name, le composant attend aussi .name (ex. clic depuis tableau mentors)
      const discipleWithName = {
        ...data,
        name: data.name || `${(data.first_name || '')} ${(data.last_name || '')}`.trim() || 'Sans nom'
      };
      setDisciple(discipleWithName);
      if (data?.famille_id) {
        const { data: fam } = await supabase.from('familles_disciples').select('superviseur_id').eq('id', data.famille_id).maybeSingle();
        setFamilySupervisorId(fam?.superviseur_id ?? null);
      } else {
        setFamilySupervisorId(null);
      }
      if (data?.mentor_id) {
        const { data: mentorProfil } = await supabase.from('profils').select('first_name, last_name').eq('id', data.mentor_id).maybeSingle();
        setSuiviParNom(mentorProfil ? [mentorProfil.first_name, mentorProfil.last_name].filter(Boolean).join(' ').trim() || null : null);
      } else {
        setSuiviParNom(null);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les détails du disciple."
      });
      navigate('/disciples');
    } finally {
      setLoading(false);
    }
  };

  const fetchDisciplesSuivis = async (forceRefresh = false) => {
    if (!disciple || !disciple.id || disciple.is_demo) return;

    const fetchedForId = disciple.id;
    setLoadingDisciplesSuivis(true);
    try {
      const doFetch = async () => {
        const { data: disciplesData, error: disciplesError } = await supabase
          .from('profils')
          .select('id, first_name, last_name, mentor_id')
          .eq('mentor_id', fetchedForId);

        if (disciplesError) throw disciplesError;

        if (!disciplesData || disciplesData.length === 0) {
          return [];
        }

        const disciplesIds = disciplesData.map(d => d.id);
        const { data: sousDisciplesData, error: sousDisciplesError } = await supabase
          .from('profils')
          .select('mentor_id')
          .in('mentor_id', disciplesIds);

        if (sousDisciplesError) throw sousDisciplesError;

        const disciplesSuivisMap = {};
        if (sousDisciplesData) {
          sousDisciplesData.forEach(sousDisciple => {
            const parentId = sousDisciple.mentor_id;
            if (parentId) disciplesSuivisMap[parentId] = (disciplesSuivisMap[parentId] || 0) + 1;
          });
        }

        return disciplesData.map(discipleItem => ({
          id: discipleItem.id,
          first_name: discipleItem.first_name || '',
          last_name: discipleItem.last_name || '',
          name: `${(discipleItem.first_name || '')} ${(discipleItem.last_name || '')}`.trim(),
          disciplesSuivis: disciplesSuivisMap[discipleItem.id] || 0
        }));
      };

      let result;
      const cacheKey = `disciple_suivis_${fetchedForId}`;
      if (forceRefresh) {
        try {
          const { clearCache, setCache } = await import('@/lib/CacheUtils');
          clearCache(cacheKey);
        } catch (_) {}
        result = await doFetch();
        try {
          const { setCache } = await import('@/lib/CacheUtils');
          setCache(cacheKey, result, 2 * 60 * 1000);
        } catch (_) {}
      } else {
        const { getOrSetCache } = await import('@/lib/CacheUtils');
        result = await getOrSetCache(cacheKey, doFetch, 2 * 60 * 1000);
      }

      if (discipleIdRef.current === fetchedForId) {
        setDisciplesSuivis(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des disciples suivis:', error);
      if (discipleIdRef.current === fetchedForId) {
        setDisciplesSuivis([]);
      }
    } finally {
      if (discipleIdRef.current === fetchedForId) {
        setLoadingDisciplesSuivis(false);
      }
    }
  };

  const handleAction = (action) => {
    toast({
      title: action,
      description: "Cette fonctionnalité sera bientôt disponible ! 🚀"
    });
  };

  const handlePrayerSubmit = (e) => {
      e.preventDefault();
      toast({
          title: "Requête ajoutée",
          description: `Vous priez pour ${disciple.name}: "${prayerRequest.substring(0, 20)}..."`,
      });
      setPrayerRequest('');
      setIsUrgent(false);
      setIsPrayerModalOpen(false);
  };

  const handleDeleteDisciple = async () => {
    if (!disciple || disciple.is_demo) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer ce disciple."
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('profils')
        .delete()
        .eq('id', disciple.id);

      if (error) throw error;

      toast({
        title: "Disciple supprimé",
        description: `${disciple.name} a été supprimé avec succès.`
      });

      navigate('/disciples');
    } catch (error) {
      console.error('Error deleting disciple:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le disciple. Veuillez réessayer."
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleUpgradeLevel = () => {
    if (!disciple || disciple.is_demo) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier ce disciple."
      });
      return;
    }

    const nextLevel = getNextLevel(disciple.circle_type);
    if (!nextLevel) {
      toast({
        variant: "destructive",
        title: "Niveau maximum atteint",
        description: "Ce disciple a déjà atteint le niveau maximum (Faiseur de Disciples)."
      });
      return;
    }

    setUpgradeRoleType(null);
    setIsUpgradeModalOpen(true);
    setUpgradeReason('');
  };

  const canUpgradeTutoreToDisciple = disciple?.role === 'tutore' && user?.id === disciple?.mentor_id;
  const canUpgradeMentorToPilierOrBerger = disciple?.role === 'mentor' && user?.id === familySupervisorId;
  const canEditFonction = user?.id === familySupervisorId || user?.id === disciple?.mentor_id || user?.id === disciple?.id;

  const openUpgradeRoleModal = (type) => {
    setUpgradeRoleType(type);
    setIsUpgradeModalOpen(true);
    setUpgradeReason('');
  };

  const handleConfirmUpgradeRole = async () => {
    if (!upgradeReason.trim() || !disciple || disciple.is_demo || !upgradeRoleType) return;
    setIsUpgrading(true);
    try {
      let updatePayload = {};
      if (upgradeRoleType === 'tutore_to_disciple') {
        updatePayload = { role: 'disciple' };
      } else if (upgradeRoleType === 'mentor_to_pilier') {
        updatePayload = { role: 'pilier', titre: 'Pilier', pilier_attribue_par_id: user?.id ?? null };
      } else if (upgradeRoleType === 'mentor_to_berger') {
        updatePayload = { role: 'pilier', titre: 'Berger', pilier_attribue_par_id: user?.id ?? null };
      }
      const { error } = await supabase.from('profils').update(updatePayload).eq('id', disciple.id);
      if (error) throw error;
      setDisciple({ ...disciple, ...updatePayload });
      const labels = { tutore_to_disciple: 'Disciple', mentor_to_pilier: 'Pilier', mentor_to_berger: 'Berger' };
      toast({ title: "Rôle mis à jour", description: `${disciple.name} est maintenant ${labels[upgradeRoleType]}.` });
      setIsUpgradeModalOpen(false);
      setUpgradeReason('');
      setUpgradeRoleType(null);
      fetchDiscipleDetails();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur", description: e.message || "Impossible de mettre à jour le rôle." });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleConfirmUpgrade = async () => {
    if (!upgradeReason.trim()) {
      toast({
        variant: "destructive",
        title: "Motif requis",
        description: "Veuillez indiquer le motif de la promotion."
      });
      return;
    }

    if (!disciple || disciple.is_demo) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier ce disciple."
      });
      return;
    }

    if (upgradeRoleType) {
      await handleConfirmUpgradeRole();
      return;
    }

    const nextLevel = getNextLevel(disciple.circle_type);
    if (!nextLevel) {
      toast({
        variant: "destructive",
        title: "Niveau maximum atteint",
        description: "Ce disciple a déjà atteint le niveau maximum (Faiseur de Disciples)."
      });
      return;
    }

    setIsUpgrading(true);
    try {
      const { error } = await supabase
        .from('profils')
        .update({ circle_type: nextLevel.dbValue })
        .eq('id', disciple.id);

      if (error) throw error;

      setDisciple({ ...disciple, circle_type: nextLevel.dbValue });

      const nextLevelLabel = getStatusLabel(nextLevel.dbValue);
      toast({
        title: "Niveau mis à jour",
        description: `${disciple.name} est maintenant ${nextLevelLabel}.`,
        className: "bg-green-600 text-white border-none"
      });

      setIsUpgradeModalOpen(false);
      setUpgradeReason('');
    } catch (error) {
      console.error('Error upgrading disciple level:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le niveau. Veuillez réessayer."
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }
  if (!disciple) return null;

  const displayName = disciple.name || `${(disciple.first_name || '')} ${(disciple.last_name || '')}`.trim() || 'Sans nom';
  const initialLetter = (displayName && displayName.charAt(0)) ? displayName.charAt(0).toUpperCase() : '?';

  // Toujours afficher uniquement les disciples réels (pas de lignes placeholder)
  const rowsListeDisciples = disciplesSuivis;
  const countDisciplesAffichage = disciplesSuivis.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6 relative">
      <Button 
        variant="ghost" 
        className="text-gray-400 hover:text-white pl-0 gap-2"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={18} /> Retour
      </Button>

      {/* Header Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
      <Card className="bg-white border-gray-200 shadow-sm rounded-2xl p-6 md:p-8 hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-purple-500/20"
          >
            {initialLetter}
          </motion.div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white text-sm ml-auto"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 size={14} className="mr-1" />
                Supprimer ce disciple
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium border border-purple-200">
                {getStatusLabel(disciple.circle_type).toUpperCase()}
              </span>
              {(disciple.role === 'tutore' || disciple.role === 'mentor' || disciple.role === 'pilier') && (
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium border border-gray-200">
                  {disciple.role === 'tutore' ? 'Tutoré' : disciple.titre || (disciple.role === 'pilier' ? 'Pilier' : 'Mentor')}
                </span>
              )}
              {disciple.fonction && ['Pasteur', 'AP', 'Berger'].includes(disciple.fonction) && (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium border border-amber-200" title="Fonction (charge pastorale)">
                  {disciple.fonction === 'AP' ? 'AP (Assistant Pasteur)' : disciple.fonction}
                </span>
              )}
              <span className="text-gray-600 text-sm flex items-center gap-1">
                <Calendar size={14} /> Ajouté le {new Date(disciple.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
               <Button size="sm" variant="secondary" className="bg-gray-800 hover:bg-gray-100 text-white hover:text-black" onClick={() => handleAction("Message envoyé")}>
                 <MessageSquare size={16} className="mr-2" /> Message
               </Button>
               <Button size="sm" variant="outline" className="border-gray-800 bg-gray-800 text-white hover:bg-gray-100 hover:text-black" onClick={() => handleAction("Appel lancé")}>
                 <Phone size={16} className="mr-2" /> Appeler
               </Button>
               {canUpgradeTutoreToDisciple && (
                 <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => openUpgradeRoleModal('tutore_to_disciple')} disabled={isUpgrading}>
                   <UserPlus size={16} className="mr-2" /> Upgrader en Disciple
                 </Button>
               )}
               {canUpgradeMentorToPilierOrBerger && (
                 <>
                   <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openUpgradeRoleModal('mentor_to_pilier')} disabled={isUpgrading}>
                     <Award size={16} className="mr-2" /> Upgrader en Pilier
                   </Button>
                   <Button size="sm" variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50" onClick={() => openUpgradeRoleModal('mentor_to_berger')} disabled={isUpgrading}>
                     <Award size={16} className="mr-2" /> Upgrader en Berger
                   </Button>
                 </>
               )}
               {getNextLevel(disciple.circle_type) && (
                 <Button 
                   size="sm" 
                   className="bg-purple-600 hover:bg-purple-700 text-white"
                   onClick={handleUpgradeLevel}
                   disabled={isUpgrading}
                 >
                   {isUpgrading ? (
                     <>
                       <Loader2 size={16} className="mr-2 animate-spin" /> Mise à jour...
                     </>
                   ) : (
                     <>
                       <TrendingUp size={16} className="mr-2" /> Passer au niveau supérieur
                     </>
                   )}
                 </Button>
               )}
            </div>
          </div>
        </div>
      </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Quick Info */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="p-2 bg-gray-100 rounded-lg"><Mail size={18} className="text-gray-600" /></div>
              <span>Non renseigné</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <div className="p-2 bg-gray-100 rounded-lg"><Phone size={18} className="text-gray-600" /></div>
              <span>Non renseigné</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <div className="p-2 bg-gray-100 rounded-lg"><MapPin size={18} className="text-gray-600" /></div>
              <span>Non renseigné</span>
            </div>
            {suiviParNom && (
              <div className="flex items-center gap-3 text-gray-600">
                <div className="p-2 bg-gray-100 rounded-lg"><UserCheck size={18} className="text-gray-600" /></div>
                <span><span className="font-medium text-gray-900">Suivi par :</span> {suiviParNom}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-gray-600">
              <div className="p-2 bg-gray-100 rounded-lg"><Award size={18} className="text-gray-600" /></div>
              {canEditFonction ? (
                <div className="flex-1 flex items-center gap-2">
                  <span className="font-medium text-gray-900 shrink-0">Fonction (charge pastorale) :</span>
                  <Select
                    value={disciple.fonction && ['Pasteur', 'AP', 'Berger'].includes(disciple.fonction) ? disciple.fonction : '__none__'}
                    onValueChange={handleFonctionChange}
                    disabled={savingFonction}
                  >
                    <SelectTrigger className="w-[180px] bg-white border-gray-200">
                      <SelectValue placeholder="Optionnel" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONCTIONS_OPTIONS.map((f) => (
                        <SelectItem key={f.value || '__none__'} value={f.value || '__none__'}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span>
                  <span className="font-medium text-gray-900">Fonction :</span>{' '}
                  {disciple.fonction && ['Pasteur', 'AP', 'Berger'].includes(disciple.fonction)
                    ? (disciple.fonction === 'AP' ? 'AP (Assistant Pasteur)' : disciple.fonction)
                    : 'Non renseigné'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Spiritual Activity */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg text-gray-900">Activité Spirituelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               <div 
                  onClick={() => navigate('/my-appointments')}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition-colors"
               >
                  <div className="flex items-center gap-3">
                    <Activity className="text-purple-500" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dernière rencontre</p>
                      <p className="text-xs text-gray-600">Voir la liste des échanges</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:text-purple-600">
                      <span className="text-lg leading-none">→</span>
                  </Button>
               </div>

               <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:bg-purple-50 hover:border-purple-300 transition-colors cursor-pointer" onClick={() => setIsPrayerModalOpen(true)}>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="text-purple-500" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Sujets de prière</p>
                      <p className="text-xs text-gray-600">Ajouter une requête</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-purple-600 hover:text-white">
                      <span className="text-lg leading-none">+</span>
                  </Button>
               </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Liste des Disciples Suivis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              Liste des Disciples de {disciple.name || `${disciple.first_name || ''} ${disciple.last_name || ''}`.trim() || 'ce disciple'}
              <span className="text-sm font-normal text-gray-500">
                ({countDisciplesAffichage} disciple{countDisciplesAffichage !== 1 ? 's' : ''})
              </span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={loadingDisciplesSuivis}
              onClick={async () => {
                try {
                  await fetchDisciplesSuivis(true);
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              {loadingDisciplesSuivis ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1">Rafraîchir</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingDisciplesSuivis ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Chargement...</span>
            </div>
          ) : rowsListeDisciples.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-gray-200 border-dashed bg-gray-50/50">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun disciple suivi</h3>
              <p className="text-gray-500 text-sm">Ce disciple ne suit personne pour le moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Prénom</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Nom</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Suit lui-même</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsListeDisciples.map((discipleSuivi) => (
                    <tr key={discipleSuivi.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td
                        className="py-3 px-4 text-sm text-gray-900 font-bold cursor-pointer hover:text-blue-600"
                        onClick={() => navigate(`/disciples/${discipleSuivi.id}`)}
                      >
                        {discipleSuivi.first_name}
                      </td>
                      <td
                        className="py-3 px-4 text-sm text-gray-900 font-bold cursor-pointer hover:text-blue-600"
                        onClick={() => navigate(`/disciples/${discipleSuivi.id}`)}
                      >
                        {discipleSuivi.last_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {discipleSuivi.disciplesSuivis > 0 ? (
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            {discipleSuivi.disciplesSuivis} Disciple{discipleSuivi.disciplesSuivis > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span>0 Disciple</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Add Prayer Request Modal */}
      <AnimatePresence>
        {isPrayerModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsPrayerModalOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                    className="relative w-full max-w-md bg-gray-100 border border-gray-200 rounded-2xl shadow-2xl z-10 p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Ajouter une requête</h3>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-600 hover:text-gray-900"
                            onClick={() => setIsPrayerModalOpen(false)}
                        >
                            <X size={20} />
                        </Button>
                    </div>

                    <form onSubmit={handlePrayerSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Je prie pour...</label>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-sm font-bold text-white">
                                    {initialLetter}
                                </div>
                                <span className="text-gray-900 font-medium">{displayName}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Décrivez votre requête...</label>
                            <Textarea 
                                value={prayerRequest}
                                onChange={(e) => setPrayerRequest(e.target.value)}
                                placeholder="Entrez votre sujet de prière ici..." 
                                className="bg-white border-gray-300 text-gray-900 min-h-[120px] resize-none focus:ring-teal-500"
                                required
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <input 
                                type="checkbox" 
                                id="modal-urgent-toggle"
                                checked={isUrgent}
                                onChange={(e) => setIsUrgent(e.target.checked)}
                                className="h-5 w-5 rounded border-red-500 bg-white text-red-500 focus:ring-red-500 focus:ring-offset-0"
                            />
                            <label htmlFor="modal-urgent-toggle" className="text-sm font-medium text-red-700 flex items-center gap-2 cursor-pointer select-none flex-1">
                                <Flame size={16} className="text-red-500 fill-red-500/20" /> Requête urgente !
                            </label>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-6 text-lg font-medium shadow-lg shadow-blue-500/25"
                        >
                            Ajouter la requête
                        </Button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                    className="relative w-full max-w-md bg-[#1a0b2e] border border-red-500/20 rounded-2xl shadow-2xl z-10 p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <Trash2 className="text-red-400" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Supprimer ce disciple</h3>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-400 hover:text-white"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            <X size={20} />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <p className="text-gray-300">
                            Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-white">{displayName}</span> ? 
                            Cette action est irréversible.
                        </p>

                        <div className="flex gap-3 pt-4">
                            <Button 
                                variant="outline" 
                                className="flex-1 border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isDeleting}
                            >
                                Annuler
                            </Button>
                            <Button 
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                onClick={handleDeleteDisciple}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                        Suppression...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} className="mr-2" />
                                        Supprimer
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Upgrade Level ou Rôle – Modal de confirmation */}
      <AnimatePresence>
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsUpgradeModalOpen(false);
                setUpgradeReason('');
                setUpgradeRoleType(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="relative w-full max-w-md bg-[#1a0b2e] border border-teal-500/20 rounded-2xl shadow-2xl z-10 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/20 rounded-lg">
                    <TrendingUp className="text-teal-400" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {upgradeRoleType === 'tutore_to_disciple' ? 'Upgrader en Disciple' : upgradeRoleType === 'mentor_to_pilier' ? 'Upgrader en Pilier' : upgradeRoleType === 'mentor_to_berger' ? 'Upgrader en Berger' : 'Passer au niveau supérieur'}
                  </h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-400 hover:text-white"
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    setUpgradeReason('');
                    setUpgradeRoleType(null);
                  }}
                >
                  <X size={20} />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-sm text-gray-400 mb-1">Personne</p>
                  <p className="text-white font-medium">{displayName}</p>
                </div>

                {upgradeRoleType ? (
                  <>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-sm text-gray-400 mb-1">Rôle actuel</p>
                      <p className="text-white font-medium">{disciple.role === 'tutore' ? 'Tutoré' : disciple.role === 'mentor' ? 'Mentor' : disciple.titre || disciple.role}</p>
                    </div>
                    <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                      <p className="text-sm text-teal-400 mb-1">Nouveau rôle</p>
                      <p className="text-teal-300 font-medium">
                        {upgradeRoleType === 'tutore_to_disciple' ? 'Disciple' : upgradeRoleType === 'mentor_to_pilier' ? 'Pilier' : 'Berger'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-sm text-gray-400 mb-1">Niveau actuel</p>
                      <p className="text-white font-medium">{getStatusLabel(disciple.circle_type)}</p>
                    </div>
                    {getNextLevel(disciple.circle_type) && (
                      <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                        <p className="text-sm text-teal-400 mb-1">Nouveau niveau</p>
                        <p className="text-teal-300 font-medium">{getStatusLabel(getNextLevel(disciple.circle_type).dbValue)}</p>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Motif de la promotion <span className="text-red-400">*</span>
                  </label>
                  <Textarea 
                    value={upgradeReason}
                    onChange={(e) => setUpgradeReason(e.target.value)}
                    placeholder={upgradeRoleType ? "Indiquez le motif (ex: Bilan positif, évolution spirituelle, etc.)" : "Indiquez le motif de la promotion (ex: Progression spirituelle, engagement régulier, etc.)"} 
                    className="bg-white/5 border-white/10 text-white min-h-[100px] resize-none focus:ring-teal-500"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                    onClick={() => {
                      setIsUpgradeModalOpen(false);
                      setUpgradeReason('');
                      setUpgradeRoleType(null);
                    }}
                    disabled={isUpgrading}
                  >
                    Annuler
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white"
                    onClick={handleConfirmUpgrade}
                    disabled={isUpgrading || !upgradeReason.trim()}
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <TrendingUp size={16} className="mr-2" />
                        Confirmer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiscipleDetail;