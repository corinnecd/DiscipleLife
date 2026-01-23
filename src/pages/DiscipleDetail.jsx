import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, Phone, Calendar, MessageSquare, MapPin, Activity, X, Flame, Trash2, Loader2, TrendingUp, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

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
  'Faiseur de Disciples': { level: 4, next: 'Berger', dbValue: 'makers' },
  'Mentor': { level: 4, next: 'Berger', dbValue: 'makers' },
  'Berger': { level: 5, next: 'Pilier', dbValue: 'bergers' },
  'Pilier': { level: 6, next: 'Pasteur', dbValue: 'pillars' },
  'Pasteur': { level: 7, next: null, dbValue: 'pasteurs' },
  // Format anglais (valeurs DB)
  'unbelievers': { level: 1, next: 'Nouveau converti', dbValue: 'newbelievers' },
  'newbelievers': { level: 2, next: 'Disciple Affermi', dbValue: 'established' },
  'established': { level: 3, next: 'Faiseur de Disciples', dbValue: 'makers' },
  'makers': { level: 4, next: 'Berger', dbValue: 'makers' },
  'bergers': { level: 5, next: 'Pilier', dbValue: 'bergers' },
  'pillars': { level: 6, next: 'Pasteur', dbValue: 'pillars' },
  'pasteurs': { level: 7, next: null, dbValue: 'pasteurs' }
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
  const { toast } = useToast();
  const [disciple, setDisciple] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [disciplesSuivis, setDisciplesSuivis] = useState([]);
  const [loadingDisciplesSuivis, setLoadingDisciplesSuivis] = useState(false);

  // Modal Form State
  const [prayerRequest, setPrayerRequest] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    fetchDiscipleDetails();
  }, [id]);

  useEffect(() => {
    if (disciple && disciple.id) {
      fetchDisciplesSuivis();
    }
  }, [disciple]);

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
            .from('cercle_personnes')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return data;
        },
        3 * 60 * 1000 // 3 minutes
      );

      setDisciple(data);
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

  const fetchDisciplesSuivis = async () => {
    if (!disciple || !disciple.id || disciple.is_demo) return;

    setLoadingDisciplesSuivis(true);
    try {
      // OPTIMISATION: Utiliser le cache pour la liste des disciples suivis (TTL: 2 minutes)
      const { getOrSetCache } = await import('@/lib/CacheUtils');
      const cacheKey = `disciple_suivis_${disciple.id}`;
      
      const result = await getOrSetCache(
        cacheKey,
        async () => {
          // Récupérer tous les disciples qui ont ce disciple comme parent
          const { data: disciplesData, error: disciplesError } = await supabase
            .from('cercle_personnes')
            .select('id, first_name, last_name, name, parent_disciple_id')
            .eq('parent_disciple_id', disciple.id);

          if (disciplesError) throw disciplesError;

          if (!disciplesData || disciplesData.length === 0) {
            return [];
          }

          // Pour chaque disciple, compter combien de disciples ils suivent eux-mêmes
          const disciplesIds = disciplesData.map(d => d.id);
          const { data: sousDisciplesData, error: sousDisciplesError } = await supabase
            .from('cercle_personnes')
            .select('parent_disciple_id')
            .in('parent_disciple_id', disciplesIds);

          if (sousDisciplesError) throw sousDisciplesError;

          // Créer un map pour compter les disciples suivis par chaque disciple
          const disciplesSuivisMap = {};
          if (sousDisciplesData) {
            sousDisciplesData.forEach(sousDisciple => {
              const parentId = sousDisciple.parent_disciple_id;
              disciplesSuivisMap[parentId] = (disciplesSuivisMap[parentId] || 0) + 1;
            });
          }

          // Enrichir les données avec le nombre de disciples suivis
          const disciplesAvecCompte = disciplesData.map(discipleItem => ({
            id: discipleItem.id,
            first_name: discipleItem.first_name || '',
            last_name: discipleItem.last_name || '',
            name: discipleItem.name || `${discipleItem.first_name || ''} ${discipleItem.last_name || ''}`.trim(),
            disciplesSuivis: disciplesSuivisMap[discipleItem.id] || 0
          }));

          return disciplesAvecCompte;
        },
        2 * 60 * 1000 // 2 minutes
      );

      setDisciplesSuivis(result);
    } catch (error) {
      console.error('Erreur lors de la récupération des disciples suivis:', error);
      setDisciplesSuivis([]);
    } finally {
      setLoadingDisciplesSuivis(false);
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
        .from('cercle_personnes')
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

    // Ouvrir le modal de confirmation
    setIsUpgradeModalOpen(true);
    setUpgradeReason('');
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
        .from('cercle_personnes')
        .update({ circle_type: nextLevel.dbValue })
        .eq('id', disciple.id);

      if (error) throw error;

      // Mettre à jour l'état local
      setDisciple({ ...disciple, circle_type: nextLevel.dbValue });

      const nextLevelLabel = getStatusLabel(nextLevel.dbValue);
      toast({
        title: "Niveau mis à jour",
        description: `${disciple.name} est maintenant ${nextLevelLabel}.`,
        className: "bg-green-600 text-white border-none"
      });

      // Fermer le modal et réinitialiser le motif
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

  if (loading) return <div className="text-center text-white p-10">Chargement...</div>;
  if (!disciple) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative">
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
            {disciple.name.charAt(0).toUpperCase()}
          </motion.div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">{disciple.name}</h1>
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
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-purple-600" />
            Liste des Disciples de {disciple.name || `${disciple.first_name || ''} ${disciple.last_name || ''}`.trim() || 'ce disciple'}
            {disciplesSuivis.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({disciplesSuivis.length} disciple{disciplesSuivis.length > 1 ? 's' : ''})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDisciplesSuivis ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Chargement...</span>
            </div>
          ) : disciplesSuivis.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Aucun disciple suivi par ce disciple pour le moment.</p>
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
                  {disciplesSuivis.map((discipleSuivi) => (
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
                                    {disciple.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-gray-900 font-medium">{disciple.name}</span>
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
                            Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-white">{disciple.name}</span> ? 
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

      {/* Upgrade Level Confirmation Modal */}
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
                  <h3 className="text-xl font-bold text-white">Passer au niveau supérieur</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-400 hover:text-white"
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    setUpgradeReason('');
                  }}
                >
                  <X size={20} />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-sm text-gray-400 mb-1">Disciple</p>
                  <p className="text-white font-medium">{disciple.name}</p>
                </div>

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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Motif de la promotion <span className="text-red-400">*</span>
                  </label>
                  <Textarea 
                    value={upgradeReason}
                    onChange={(e) => setUpgradeReason(e.target.value)}
                    placeholder="Indiquez le motif de la promotion (ex: Progression spirituelle, engagement régulier, etc.)" 
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