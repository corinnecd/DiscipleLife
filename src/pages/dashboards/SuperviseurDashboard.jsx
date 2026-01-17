import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Target, TrendingUp, UserCheck, Activity, 
  Church, ChevronRight, Loader2, UserCircle, Eye, ArrowLeft, Camera, Sparkles, Zap, Trophy, Star, AlertCircle, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { compressImage } from '@/lib/ImageCompression';
import { useToast } from '@/components/ui/use-toast';

const SuperviseurDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [famille, setFamille] = useState(null);
  const [pasteur, setPasteur] = useState(null);
  const [superviseurNom, setSuperviseurNom] = useState({ first_name: '', last_name: '', titre: '' });
  const [stats, setStats] = useState({
    nombreMembres: 0,
    objectif: 70,
    progression: 0,
    reste: 70
  });
  const [familleAvatarFile, setFamilleAvatarFile] = useState(null);
  const [familleAvatarPreview, setFamilleAvatarPreview] = useState(null);
  const [uploadingFamilleAvatar, setUploadingFamilleAvatar] = useState(false);
  const [pasteurAvatarFile, setPasteurAvatarFile] = useState(null);
  const [pasteurAvatarPreview, setPasteurAvatarPreview] = useState(null);
  const [uploadingPasteurAvatar, setUploadingPasteurAvatar] = useState(false);
  const [reportReminder, setReportReminder] = useState(null); // { daysLeft: number, showReminder: boolean }

  useEffect(() => {
    if (user) {
      fetchSuperviseurData();
      checkReportReminder();
    }
  }, [user]);

  // Fonction pour vérifier le rappel de rapport (5 jours avant la fin du mois)
  const checkReportReminder = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    // Calculer le dernier jour du mois en cours
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();
    
    // Calculer le nombre de jours restants jusqu'à la fin du mois
    const daysLeft = lastDayOfMonth - currentDay;
    
    // Afficher l'alerte si nous sommes à 5 jours ou moins de la fin du mois
    if (daysLeft <= 5 && daysLeft >= 0) {
      setReportReminder({
        daysLeft,
        showReminder: true
      });
    } else {
      setReportReminder(null);
    }
  };

  const fetchSuperviseurData = async () => {
    try {
      setLoading(true);

      // 1. Récupérer la famille du superviseur
      const { data: familleData, error: familleError } = await supabase
        .from('familles_disciples')
        .select('*')
        .eq('superviseur_id', user.id)
        .maybeSingle();

      if (familleError) throw familleError;

      if (!familleData) {
        console.warn('Aucune famille trouvée pour ce superviseur');
        setLoading(false);
        return;
      }

      setFamille(familleData);
      if (familleData?.avatar_url) {
        setFamilleAvatarPreview(familleData.avatar_url);
      }

      // 2. Récupérer les informations du superviseur (nom, titre et pasteur)
      // Note: Si la colonne 'titre' n'existe pas encore, on la récupère avec une requête conditionnelle
      const { data: superviseurData, error: superviseurError } = await supabase
        .from('profils')
        .select('first_name, last_name, pasteur_id')
        .eq('id', user.id)
        .single();
      
      // Essayer de récupérer le titre séparément si la colonne existe
      let titre = '';
      try {
        const { data: titreData } = await supabase
          .from('profils')
          .select('titre')
          .eq('id', user.id)
          .single();
        titre = titreData?.titre || '';
      } catch (e) {
        // La colonne titre n'existe pas encore, on continue sans
        console.log('Colonne titre non disponible, migration 058 nécessaire');
      }

      if (superviseurError) throw superviseurError;

      // Stocker le nom et le titre du superviseur
      if (superviseurData) {
        const nomSuperviseur = {
          first_name: superviseurData.first_name || '',
          last_name: superviseurData.last_name || '',
          titre: titre || ''
        };
        console.log('Superviseur nom chargé:', nomSuperviseur);
        setSuperviseurNom(nomSuperviseur);
      } else {
        console.warn('Aucune donnée superviseur trouvée');
      }

      if (superviseurData?.pasteur_id) {
        const { data: pasteurData, error: pasteurError } = await supabase
          .from('profils')
          .select('id, first_name, last_name, identifiant_unique, avatar_url')
          .eq('id', superviseurData.pasteur_id)
          .single();

        if (!pasteurError && pasteurData) {
          setPasteur(pasteurData);
          if (pasteurData?.avatar_url) {
            setPasteurAvatarPreview(pasteurData.avatar_url);
          }
        }
      }

      // 3. Calculer les statistiques
      const nombreMembres = familleData.nombre_disciples_actuels || 0;
      const objectif = familleData.objectif_disciples || 70;
      const progression = Math.min((nombreMembres / objectif) * 100, 100);
      const reste = Math.max(objectif - nombreMembres, 0);

      setStats({
        nombreMembres,
        objectif,
        progression,
        reste
      });

    } catch (error) {
      console.error('Erreur lors du chargement des données superviseur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFamilleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFamilleAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setFamilleAvatarPreview(objectUrl);
    }
  };

  const handlePasteurAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPasteurAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPasteurAvatarPreview(objectUrl);
    }
  };

  const uploadFamilleAvatar = async () => {
    if (!familleAvatarFile || !famille) return;
    
    setUploadingFamilleAvatar(true);
    try {
      const compressedFile = await compressImage(familleAvatarFile, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.85
      });

      const fileName = `famille-avatars/${famille.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

      // Mettre à jour la famille avec l'avatar
      const { error: updateError } = await supabase
        .from('familles_disciples')
        .update({ avatar_url: publicData.publicUrl })
        .eq('id', famille.id);

      if (updateError) throw updateError;

      setFamilleAvatarPreview(publicData.publicUrl);
      setFamilleAvatarFile(null);
      toast({
        title: "Succès",
        description: "Photo de la famille mise à jour avec succès."
      });
    } catch (error) {
      console.error('Erreur upload avatar famille:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger la photo."
      });
    } finally {
      setUploadingFamilleAvatar(false);
    }
  };

  const uploadPasteurAvatar = async () => {
    if (!pasteurAvatarFile || !pasteur) return;
    
    setUploadingPasteurAvatar(true);
    try {
      const compressedFile = await compressImage(pasteurAvatarFile, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.85
      });

      const fileName = `pasteur-avatars/${pasteur.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

      // Mettre à jour le pasteur avec l'avatar
      const { error: updateError } = await supabase
        .from('profils')
        .update({ avatar_url: publicData.publicUrl })
        .eq('id', pasteur.id);

      if (updateError) throw updateError;

      setPasteurAvatarPreview(publicData.publicUrl);
      setPasteurAvatarFile(null);
      toast({
        title: "Succès",
        description: "Photo du pasteur mise à jour avec succès."
      });
    } catch (error) {
      console.error('Erreur upload avatar pasteur:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger la photo."
      });
    } finally {
      setUploadingPasteurAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!famille) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              Aucune famille assignée à votre compte superviseur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Tableau de bord Superviseur - DiscipleLife</title>
      </Helmet>
      
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Bouton retour */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        {/* Alerte de rappel pour le rapport mensuel (5 jours avant la fin du mois) */}
        {reportReminder && reportReminder.showReminder && (
          <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Rappel : Rapport mensuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-900 font-medium">
                    {reportReminder.daysLeft === 0 
                      ? "⏰ Le mois se termine aujourd'hui ! N'oubliez pas d'envoyer votre rapport mensuel."
                      : reportReminder.daysLeft === 1
                      ? "⏰ Le mois se termine demain ! N'oubliez pas d'envoyer votre rapport mensuel."
                      : `⏰ Le mois se termine dans ${reportReminder.daysLeft} jours ! N'oubliez pas d'envoyer votre rapport mensuel.`
                    }
                  </p>
                  <p className="text-sm text-blue-700 mt-2">
                    Vous pouvez envoyer votre rapport depuis la page "Envoyer un rapport".
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/send-report')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Envoyer le rapport
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bandeau de bienvenue */}
        {famille && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 via-purple-950 to-purple-900 border border-gray-200 shadow-lg p-8 md:p-12">
            <div className="relative z-10 flex items-start justify-between gap-6">
              <div className="flex-1 max-w-3xl">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-white mb-4 whitespace-nowrap"
                >
                  BIENVENUE dans la Famille de {superviseurNom.titre === 'Pasteur' ? 'Pasteur ' : ''}{superviseurNom.first_name} {superviseurNom.last_name} « <span className="text-amber-400">{famille.nom}</span> »
                </motion.h1>
                <p className="text-xl text-white/90 mb-4 leading-relaxed">
                  Ici, vous êtes chez vous.
                </p>
                <p className="text-lg text-white/90 leading-relaxed">
                  Un espace de partage, de soutien et de croissance spirituelle, où chacun est accompagné dans sa marche avec Dieu afin de devenir de véritables disciples de Christ.
                </p>
              </div>
              {/* Icône/Personnage représentant la famille - Positionnée à droite et en bas */}
              <div className="flex-shrink-0 self-end mt-8 md:mt-12 mr-4 md:mr-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30"
                >
                  {famille.nom.toLowerCase().includes('déterminé') || famille.nom.toLowerCase().includes('determine') ? (
                    <Target className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  ) : famille.nom.toLowerCase().includes('victoire') || famille.nom.toLowerCase().includes('victory') ? (
                    <Trophy className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  ) : famille.nom.toLowerCase().includes('étoile') || famille.nom.toLowerCase().includes('star') ? (
                    <Star className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  ) : famille.nom.toLowerCase().includes('feu') || famille.nom.toLowerCase().includes('fire') ? (
                    <Zap className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  ) : (
                    <Sparkles className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  )}
                </motion.div>
              </div>
            </div>
            
            {/* Background Decorative Circles */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </div>
        )}
        
        {/* En-tête avec nom de la famille et pasteur */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Users className="h-5 w-5 text-purple-600" />
                  {(() => {
                    const nomComplet = `${superviseurNom.titre === 'Pasteur' ? 'Pasteur ' : ''}${superviseurNom.first_name || ''} ${superviseurNom.last_name || ''}`.trim();
                    return nomComplet ? `Famille de ${nomComplet}` : 'Ma Famille';
                  })()}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  <div>{famille.nom} ({famille.identifiant_famille})</div>
                  {user?.email && (
                    <div className="mt-1 text-sm text-gray-500">{user.email}</div>
                  )}
                </CardDescription>
              </div>
              <div className="relative">
                <label htmlFor="famille-avatar" className="cursor-pointer">
                  <Avatar className="w-20 h-20 border-2 border-purple-200 hover:border-purple-400 transition-colors">
                    <AvatarImage src={familleAvatarPreview} alt={famille.nom} />
                    <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                      {famille.nom.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 border-2 border-white shadow-sm hover:bg-purple-700 transition-colors">
                    <Camera className="h-3 w-3 text-white" />
                  </div>
                </label>
                <input
                  id="famille-avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFamilleAvatarChange}
                />
                {familleAvatarFile && (
                  <Button
                    size="sm"
                    onClick={uploadFamilleAvatar}
                    disabled={uploadingFamilleAvatar}
                    className="mt-2 w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {uploadingFamilleAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Enregistrer'
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Objectif</span>
                  <span className="text-lg font-semibold text-gray-900">{stats.objectif} disciples</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Membres actuels</span>
                  <span className="text-lg font-semibold text-purple-600">{stats.nombreMembres}</span>
                </div>
                {stats.reste > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Il manque</span>
                    <span className="text-lg font-semibold text-orange-600">{stats.reste} Disciples</span>
                  </div>
                )}
              </div>
              
              {/* Barre de progression */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progression</span>
                  <span className="font-medium">{stats.progression.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.progression}%` }}
                    transition={{ duration: 0.5 }}
                    className={cn(
                      "h-3 rounded-full",
                      stats.progression >= 100 ? "bg-green-500" : "bg-purple-600"
                    )}
                  />
                </div>
              </div>

              {stats.nombreMembres >= stats.objectif && (
                <Badge className="mt-4 bg-green-500 text-white">
                  <Target className="h-3 w-3 mr-1" />
                  Objectif atteint ! 🎉
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Carte du Pasteur de tutelle */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Church className="h-5 w-5 text-purple-600" />
                  {pasteur ? `${pasteur.first_name} ${pasteur.last_name}` : 'Pasteur de tutelle'}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {pasteur ? `Pasteur de tutelle de la famille ${famille.nom}` : 'Responsable de votre famille'}
                </CardDescription>
              </div>
              <div className="relative">
                <label htmlFor="pasteur-avatar" className="cursor-pointer">
                  <Avatar className="w-20 h-20 border-2 border-purple-200 hover:border-purple-400 transition-colors">
                    {pasteur ? (
                      <>
                        <AvatarImage src={pasteurAvatarPreview || pasteur.avatar_url} alt={`${pasteur.first_name} ${pasteur.last_name}`} />
                        <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                          {pasteur.first_name?.charAt(0) || ''}{pasteur.last_name?.charAt(0) || ''}
                        </AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback className="bg-gray-100 text-gray-400 text-lg">
                        <UserCircle className="h-8 w-8" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 border-2 border-white shadow-sm hover:bg-purple-700 transition-colors">
                    <Camera className="h-3 w-3 text-white" />
                  </div>
                </label>
                <input
                  id="pasteur-avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePasteurAvatarChange}
                  disabled={!pasteur}
                />
                {pasteurAvatarFile && (
                  <Button
                    size="sm"
                    onClick={uploadPasteurAvatar}
                    disabled={uploadingPasteurAvatar || !pasteur}
                    className="mt-2 w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {uploadingPasteurAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Enregistrer'
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pasteur ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {pasteur.identifiant_unique}
                      </p>
                      <p className="text-sm text-gray-600">
                        {pasteur.first_name} {pasteur.last_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 pt-2 border-t border-gray-200 italic">
                    <p className="font-medium text-purple-600 mb-1">Matthieu 4:19 (LSG)</p>
                    <p className="text-gray-700">Jésus leur dit : Suivez-moi, et je vous ferai pêcheurs d'hommes.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <p className="text-sm text-gray-500">
                    Pasteur de tutelle non assigné
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistiques rapides */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">
                Membres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.nombreMembres}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                sur {stats.objectif} objectif
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">
                Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.progression.toFixed(0)}%
              </div>
              <p className="text-xs text-gray-600 mt-1">
                vers l'objectif
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">
                Disciples à évangéliser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.reste}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                avant l'objectif
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Button
                variant="outline"
                className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
                onClick={() => navigate('/familles')}
              >
                <Eye className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
                Voir ma famille
              </Button>
              <Button
                variant="outline"
                className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
                onClick={() => navigate('/attendance')}
              >
                <Activity className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
                Suivi de présence
              </Button>
              <Button
                variant="outline"
                className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
                onClick={() => navigate('/statistics')}
              >
                <TrendingUp className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
                Statistiques
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SuperviseurDashboard;
