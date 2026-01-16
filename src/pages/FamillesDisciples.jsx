import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Target, TrendingUp, UserCheck, Loader2, Plus, Edit, Eye, Camera, Trash2, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { getInitials } from '@/lib/utils';
import { compressImage } from '@/lib/ImageCompression';

const FamillesDisciples = () => {
  const { user } = useAuth();
  const { role, hasAdminView, hasSuperviseurView, isSuperAdmin } = useRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [familles, setFamilles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFamille, setSelectedFamille] = useState(null);
  const [avatarUploadingId, setAvatarUploadingId] = useState(null);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [superviseursOptions, setSuperviseursOptions] = useState([]);
  const [createForm, setCreateForm] = useState({
    nom: '',
    identifiant_famille: '',
    statut: 'actif',
    objectif_disciples: 70,
    superviseur_id: '',
  });
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchFamilles();
    }
  }, [user, role]);

  const loadSuperviseursOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email')
        .eq('role', 'superviseur')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setSuperviseursOptions(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des superviseurs:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la liste des superviseurs',
        variant: 'destructive',
      });
    }
  };

  const fetchFamilles = async () => {
    try {
      setLoading(true);
      
      // Requête simple d'abord pour voir les familles
      let query = supabase
        .from('familles_disciples')
        .select('*')
        .order('identifiant_famille', { ascending: true });

      // Si l'utilisateur est superviseur, ne voir que sa famille
      if (role === 'superviseur') {
        query = query.eq('superviseur_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur Supabase:', error);
        throw error;
      }

      console.log('Familles récupérées:', data);

      // Si des familles sont retournées, récupérer les superviseurs
      if (data && data.length > 0) {
        const superviseurIds = data
          .map(f => f.superviseur_id)
          .filter(id => id !== null);
        
        if (superviseurIds.length > 0) {
          const { data: superviseursData, error: superviseursError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, email, avatar_url')
            .in('id', superviseurIds);

          if (!superviseursError && superviseursData) {
            const superviseursMap = {};
            superviseursData.forEach(s => {
              superviseursMap[s.id] = s;
            });

            // Fusionner les données
            const famillesAvecSuperviseurs = data.map(famille => ({
              ...famille,
              superviseur: famille.superviseur_id ? superviseursMap[famille.superviseur_id] || null : null
            }));

            setFamilles(famillesAvecSuperviseurs);
          } else {
            console.error('Erreur lors de la récupération des superviseurs:', superviseursError);
            setFamilles(data);
          }
        } else {
          setFamilles(data);
        }
      } else {
        setFamilles([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des familles:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger les familles',
        variant: 'destructive'
      });
      setFamilles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuperviseurAvatarChange = async (famille, file) => {
    if (!file || !famille?.superviseur?.id) return;

    try {
      setAvatarUploadingId(famille.superviseur.id);
      setAvatarUploadProgress(10);

      const compressedAvatar = await compressImage(file, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.85,
        onProgress: (p) => setAvatarUploadProgress(p),
      });

      const fileName = `avatars/${famille.superviseur.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, compressedAvatar);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

      const avatarUrl = publicData?.publicUrl;

      const { error: updateError } = await supabase
        .from('profils')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', famille.superviseur.id);

      if (updateError) throw updateError;

      setFamilles((prev) =>
        prev.map((f) =>
          f.id === famille.id
            ? {
                ...f,
                superviseur: f.superviseur
                  ? { ...f.superviseur, avatar_url: avatarUrl }
                  : f.superviseur,
              }
            : f
        )
      );

      toast({
        title: 'Avatar mis à jour',
        description: `L'image du superviseur ${famille.nom} a été mise à jour.`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l’avatar superviseur:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de mettre à jour l'avatar du superviseur.",
        variant: 'destructive',
      });
    } finally {
      setAvatarUploadingId(null);
      setAvatarUploadProgress(0);
    }
  };

  const calculateProgression = (nombreActuels, objectif) => {
    if (objectif === 0) return 0;
    return Math.min(Math.round((nombreActuels / objectif) * 100), 100);
  };

  const getProgressionColor = (progression) => {
    if (progression >= 80) return 'text-green-600';
    if (progression >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const openCreateDialog = async () => {
    // Proposer un identifiant automatique FAMxxx
    const nextIndex = familles.length + 1;
    const defaultIdentifiant = `FAM${String(nextIndex).padStart(3, '0')}`;

    setCreateForm({
      nom: '',
      identifiant_famille: defaultIdentifiant,
      statut: 'actif',
      objectif_disciples: 70,
      superviseur_id: '',
    });

    if (superviseursOptions.length === 0) {
      await loadSuperviseursOptions();
    }
    setIsCreateDialogOpen(true);
  };

  const handleCreateFamille = async (e) => {
    e?.preventDefault();
    if (!createForm.nom || !createForm.identifiant_famille || !createForm.superviseur_id) {
      toast({
        title: 'Champs manquants',
        description: 'Merci de renseigner le nom, l\'identifiant et le superviseur de la famille.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreateLoading(true);
      const { data, error } = await supabase
        .from('familles_disciples')
        .insert({
          nom: createForm.nom.trim(),
          identifiant_famille: createForm.identifiant_famille.trim(),
          statut: createForm.statut,
          objectif_disciples: Number(createForm.objectif_disciples) || 70,
          nombre_disciples_actuels: 0,
          superviseur_id: createForm.superviseur_id,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Recharger pour inclure les infos superviseur fusionnées
      await fetchFamilles();

      setIsCreateDialogOpen(false);
      toast({
        title: 'Famille créée',
        description: `La famille "${createForm.nom}" a été ajoutée avec succès.`,
      });
    } catch (error) {
      console.error('Erreur lors de la création de la famille:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de créer la famille. Vérifiez que l'identifiant est unique.",
        variant: 'destructive',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteFamille = async (famille) => {
    if (!famille?.id) return;

    if (!isSuperAdmin) {
      toast({
        title: 'Action non autorisée',
        description: 'Seul le Super Admin peut supprimer une famille.',
        variant: 'destructive',
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Voulez-vous vraiment supprimer la famille "${famille.nom}" ? Cette action est irréversible.`
    );
    if (!confirmDelete) return;

    try {
      setDeleteLoadingId(famille.id);
      const { error } = await supabase
        .from('familles_disciples')
        .delete()
        .eq('id', famille.id);

      if (error) throw error;

      setFamilles((prev) => prev.filter((f) => f.id !== famille.id));
      if (selectedFamille?.id === famille.id) {
        setSelectedFamille(null);
      }

      toast({
        title: 'Famille supprimée',
        description: `La famille "${famille.nom}" a été supprimée.`,
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la famille:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer cette famille.',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Familles de Disciples - DiscipleLife</title>
      </Helmet>

      <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 sm:px-6">
        {/* Bouton retour */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-purple-600" />
              Familles de Disciples
            </h1>
            <p className="text-gray-600 mt-2">
              Gestion des 26 familles de disciples avec leurs superviseurs
            </p>
          </div>
          {hasAdminView && (
            <Button
              className="bg-purple-600 text-white hover:bg-purple-700"
              onClick={openCreateDialog}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une famille
            </Button>
          )}
        </div>

        {/* Statistiques globales */}
        {hasAdminView && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Familles</p>
                    <p className="text-2xl font-bold text-purple-600">{familles.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Familles Actives</p>
                    <p className="text-2xl font-bold text-green-600">
                      {familles.filter(f => f.statut === 'actif').length}
                    </p>
                  </div>
                  <UserCheck className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Disciples</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {familles.reduce((sum, f) => sum + (f.nombre_disciples_actuels || 0), 0)}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Progression Moyenne</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {familles.length > 0 
                        ? Math.round(
                            familles.reduce((sum, f) => 
                              sum + calculateProgression(f.nombre_disciples_actuels || 0, f.objectif_disciples || 70), 
                              0
                            ) / familles.length
                          )
                        : 0}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Liste des familles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {familles.map((famille) => {
            const progression = calculateProgression(
              famille.nombre_disciples_actuels || 0,
              famille.objectif_disciples || 70
            );
            const superviseurNom = famille.superviseur 
              ? `${famille.superviseur.first_name || ''} ${famille.superviseur.last_name || ''}`.trim()
              : 'Non assigné';

            const canEditAvatar =
              famille.superviseur &&
              (hasAdminView ||
                (hasSuperviseurView && user && user.id === famille.superviseur.id));

            return (
              <Card 
                key={famille.id} 
                className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedFamille(famille)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-gray-900 text-lg">{famille.nom}</CardTitle>
                      <CardDescription className="text-gray-600 mt-1">
                        ID: {famille.identifiant_famille}
                      </CardDescription>
                    </div>
                    <Badge className={
                      famille.statut === 'actif' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-500 text-white'
                    }>
                      {famille.statut}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Superviseur */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border border-gray-200">
                        <AvatarImage
                          src={famille.superviseur?.avatar_url || undefined}
                          alt={superviseurNom}
                        />
                        <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-semibold">
                          {getInitials(superviseurNom || famille.nom || 'S')}
                        </AvatarFallback>
                      </Avatar>
                      {canEditAvatar && (
                        <label className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow cursor-pointer hover:bg-purple-50">
                          <Camera className="w-3 h-3 text-purple-600" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                e.stopPropagation();
                                handleSuperviseurAvatarChange(famille, file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm text-gray-600">Superviseur</p>
                      <p className="text-sm font-semibold text-gray-900">{superviseurNom}</p>
                      {avatarUploadingId === famille.superviseur?.id && (
                        <span className="text-xs text-gray-500 mt-0.5">
                          Téléversement... {Math.round(avatarUploadProgress)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progression */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Progression</p>
                      <p className={`text-sm font-bold ${getProgressionColor(progression)}`}>
                        {progression}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          progression >= 80 ? 'bg-green-600' :
                          progression >= 50 ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}
                        style={{ width: `${progression}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                      <span>{famille.nombre_disciples_actuels || 0} / {famille.objectif_disciples || 70}</span>
                      <Target className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-purple-600 text-white hover:bg-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFamille(famille);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Voir détails
                    </Button>
                    {hasAdminView && (
                      <Button
                        size="sm"
                        className="bg-purple-600 text-white hover:bg-blue-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Ouvrir modal d'édition
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {isSuperAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFamille(famille);
                        }}
                        disabled={deleteLoadingId === famille.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {familles.length === 0 && !loading && (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucune famille trouvée</p>
              {hasAdminView && (
                <Button className="mt-4 bg-purple-600 text-white hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer la première famille
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      {/* Dialog création famille */}
      {hasAdminView && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Créer une nouvelle famille de 70</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateFamille} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="famille-nom">Nom de la famille</Label>
                <Input
                  id="famille-nom"
                  value={createForm.nom}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, nom: e.target.value }))
                  }
                  placeholder="Ex: LES DÉTERMINÉS"
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="famille-id">Identifiant</Label>
                <Input
                  id="famille-id"
                  value={createForm.identifiant_famille}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      identifiant_famille: e.target.value,
                    }))
                  }
                  placeholder="Ex: FAM027"
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="objectif">Objectif de disciples</Label>
                  <Input
                    id="objectif"
                    type="number"
                    min={1}
                    value={createForm.objectif_disciples}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        objectif_disciples: e.target.value,
                      }))
                    }
                    className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={createForm.statut}
                    onValueChange={(value) =>
                      setCreateForm((prev) => ({ ...prev, statut: value }))
                    }
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Superviseur *</Label>
                <Select
                  value={createForm.superviseur_id}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      superviseur_id: value,
                    }))
                  }
                  required
                >
                  <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                    <SelectValue placeholder="Choisir un superviseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {superviseursOptions.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>
                        {`${sup.first_name || ''} ${sup.last_name || ''}`.trim() ||
                          sup.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="bg-white text-gray-900 border border-gray-300 hover:bg-white hover:text-red-600"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-600 text-white hover:bg-white hover:text-purple-600 hover:border hover:border-purple-600"
                  disabled={createLoading}
                >
                  {createLoading ? 'Création...' : 'Créer la famille'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default FamillesDisciples;

