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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Target, TrendingUp, UserCheck, Loader2, Plus, Edit, Eye, Camera, Trash2, ArrowLeft, Mail, Calendar, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  const [nombreMembresParFamille, setNombreMembresParFamille] = useState({});
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
  const [superviseursFamille, setSuperviseursFamille] = useState([]);
  const [membresFamille, setMembresFamille] = useState([]);
  const [nombreMembresReel, setNombreMembresReel] = useState(0);

  // Calculer le nombre réel de membres quand une famille est sélectionnée
  useEffect(() => {
    const calculerNombreMembresReel = async () => {
      if (!selectedFamille || !selectedFamille.id) {
        setNombreMembresReel(0);
        return;
      }

      try {
        // 1. Membres depuis profils avec famille_id
        const { data: membresData, error: membresError } = await supabase
          .from('profils')
          .select('id')
          .eq('famille_id', selectedFamille.id);

        // 2. Membres depuis cercle_personnes liés au superviseur
        let disciplesData = [];
        if (selectedFamille.superviseur_id) {
          const { data: disciples, error: disciplesError } = await supabase
            .from('cercle_personnes')
            .select('id')
            .eq('user_id', selectedFamille.superviseur_id);

          if (!disciplesError && disciples) {
            disciplesData = disciples;
          }
        }

        // 3. Calculer le total
        const nombreMembresProfils = (membresData || []).length;
        const nombreMembresCercle = disciplesData.length;
        const total = nombreMembresProfils + nombreMembresCercle;

        console.log('📊 Calcul membres famille (modal):', {
          familleId: selectedFamille.id,
          superviseurId: selectedFamille.superviseur_id,
          membresProfils: nombreMembresProfils,
          membresCercle: nombreMembresCercle,
          total: total
        });

        setNombreMembresReel(total);
      } catch (error) {
        console.error('Erreur calcul nombre membres:', error);
        setNombreMembresReel(selectedFamille.nombre_disciples_actuels || 0);
      }
    };

    calculerNombreMembresReel();
  }, [selectedFamille]);

  useEffect(() => {
    if (user) {
      fetchFamilles();
      fetchSuperviseursFamille();
      fetchMembresFamille();
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

      // Si des familles sont retournées, récupérer les superviseurs et calculer les nombres réels
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

            // Calculer le nombre réel de membres pour chaque famille
            const nombreMembresMap = {};
            for (const famille of famillesAvecSuperviseurs) {
              let total = 0;
              
              // 1. Membres depuis profils avec famille_id
              const { data: membresData } = await supabase
                .from('profils')
                .select('id')
                .eq('famille_id', famille.id);
              
              total += (membresData || []).length;

              // 2. Membres depuis cercle_personnes liés au superviseur
              if (famille.superviseur_id) {
                const { data: disciplesData } = await supabase
                  .from('cercle_personnes')
                  .select('id')
                  .eq('user_id', famille.superviseur_id);
                
                total += (disciplesData || []).length;
              }

              nombreMembresMap[famille.id] = total;
            }

            setNombreMembresParFamille(nombreMembresMap);
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

  const fetchSuperviseursFamille = async () => {
    // Récupérer les autres superviseurs de la famille (même pasteur_id) si l'utilisateur est superviseur
    if (!hasSuperviseurView || !user) return;

    try {
      // Récupérer le pasteur_id du superviseur connecté
      const { data: superviseurData, error: superviseurError } = await supabase
        .from('profils')
        .select('pasteur_id')
        .eq('id', user.id)
        .single();

      if (superviseurError || !superviseurData?.pasteur_id) {
        return;
      }

      // Récupérer les autres superviseurs avec le même pasteur_id
      const { data: superviseursData, error: superviseursError } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email, avatar_url, titre')
        .eq('pasteur_id', superviseurData.pasteur_id)
        .eq('role', 'superviseur')
        .neq('id', user.id) // Exclure le superviseur actuel
        .order('first_name', { ascending: true });

      if (!superviseursError && superviseursData) {
        setSuperviseursFamille(superviseursData || []);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des superviseurs de la famille:', error);
    }
  };

  const fetchMembresFamille = async () => {
    // Récupérer tous les membres de la famille si l'utilisateur est superviseur
    if (!hasSuperviseurView || !user) return;

    try {
      // 1. Récupérer la famille du superviseur
      const { data: familleData, error: familleError } = await supabase
        .from('familles_disciples')
        .select('id, superviseur_id')
        .eq('superviseur_id', user.id)
        .maybeSingle();

      if (familleError || !familleData) {
        return;
      }

      const familleId = familleData.id;
      const superviseurId = familleData.superviseur_id;

      // 2. Récupérer le superviseur (utiliser maybeSingle au lieu de single pour éviter les erreurs)
      let superviseurData = null;
      
      // D'abord essayer depuis profils
      const { data: superviseurFromProfils, error: superviseurError } = await supabase
        .from('profils')
        .select('id, first_name, last_name, role, titre')
        .eq('id', superviseurId)
        .maybeSingle();

      if (!superviseurError && superviseurFromProfils) {
        superviseurData = superviseurFromProfils;
      }

      // Si pas trouvé dans profils, essayer depuis familles déjà chargées
      if (!superviseurData && familles && familles.length > 0) {
        const famille = familles.find(f => f.id === familleId);
        if (famille && famille.superviseur) {
          superviseurData = {
            id: famille.superviseur.id,
            first_name: famille.superviseur.first_name,
            last_name: famille.superviseur.last_name,
            role: 'superviseur',
            titre: 'Superviseur'
          };
        }
      }

      // Si toujours pas trouvé, utiliser user directement (comme fallback ultime)
      if (!superviseurData && superviseurId === user.id) {
        // Essayer depuis user_metadata ou utiliser email
        superviseurData = {
          id: user.id,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          role: 'superviseur',
          titre: 'Superviseur'
        };
      }

      if (superviseurError) {
        console.error('Erreur récupération superviseur:', superviseurError);
      }

      console.log('🔍 Superviseur récupéré pour affiliation:', superviseurData);
      console.log('🔍 superviseurId utilisé:', superviseurId);
      console.log('🔍 user.id:', user.id);

      const membres = [];

      // 3. Ajouter le superviseur (sera mis à jour avec le nombre de disciples directs plus tard)
      // IMPORTANT: Toujours ajouter le superviseur, même si les données sont partielles
      if (superviseurData && superviseurData.id) {
        membres.push({
          id: superviseurData.id,
          first_name: superviseurData.first_name || '',
          last_name: superviseurData.last_name || '',
          titre: 'Superviseur',
          affiliation: null,
          type: 'superviseur',
          disciplesSuivis: 0 // Sera mis à jour après récupération des disciples
        });
      } else if (superviseurId) {
        // Fallback: créer un membre superviseur minimal si on a au moins l'ID
        membres.push({
          id: superviseurId,
          first_name: '',
          last_name: '',
          titre: 'Superviseur',
          affiliation: null,
          type: 'superviseur',
          disciplesSuivis: 0
        });
      }

      // 4. Récupérer les membres de la famille depuis profils
      const { data: profilsData, error: profilsError } = await supabase
        .from('profils')
        .select('id, first_name, last_name, role, titre, famille_id, date_entree_famille')
        .eq('famille_id', familleId);

      if (!profilsError && profilsData) {
        profilsData.forEach(profil => {
          // Ne pas ajouter le superviseur deux fois
          if (profil.id === superviseurId) return;

          let titre = 'Disciple';
          if (profil.role === 'mentor') titre = 'Mentor';
          else if (profil.role === 'disciple_pillier') titre = 'Disciple Pillier';
          else if (profil.role === 'tutore') titre = 'Tutoré';
          else if (profil.titre) titre = profil.titre;

          membres.push({
            id: profil.id,
            first_name: profil.first_name,
            last_name: profil.last_name,
            titre: titre,
            affiliation: superviseurData ? `${superviseurData.first_name} ${superviseurData.last_name}` : null,
            dateEntreeFamille: profil.date_entree_famille || null,
            type: 'profil',
            disciplesSuivis: 0 // Pour les membres de profils, on ne compte pas pour l'instant
          });
        });
      }

      // 5. Récupérer les disciples depuis cercle_personnes (liés au superviseur)
      const { data: disciplesData, error: disciplesError } = await supabase
        .from('cercle_personnes')
        .select('id, first_name, last_name, parent_disciple_id, user_id, start_date, created_at')
        .eq('user_id', superviseurId);

      if (!disciplesError && disciplesData) {
        // Récupérer les infos des parents pour l'affiliation
        const parentIds = disciplesData
          .map(d => d.parent_disciple_id)
          .filter(id => id !== null);

        let parentsMap = {};
        if (parentIds.length > 0) {
          const { data: parentsData } = await supabase
            .from('cercle_personnes')
            .select('id, first_name, last_name')
            .in('id', parentIds);

          if (parentsData) {
            parentsData.forEach(parent => {
              parentsMap[parent.id] = `${parent.first_name || ''} ${parent.last_name || ''}`.trim();
            });
          }
        }

        // Compter combien de disciples suit chaque membre (pour la colonne "Suit lui-même")
        const disciplesSuivisMap = {};
        disciplesData.forEach(disciple => {
          if (disciple.parent_disciple_id) {
            disciplesSuivisMap[disciple.parent_disciple_id] = (disciplesSuivisMap[disciple.parent_disciple_id] || 0) + 1;
          }
        });

        // Pour le superviseur, compter tous les disciples directs
        const disciplesDirects = disciplesData.filter(d => !d.parent_disciple_id).length;
        if (superviseurData) {
          const membreSuperviseur = membres.find(m => m.id === superviseurData.id);
          if (membreSuperviseur) {
            membreSuperviseur.disciplesSuivis = disciplesDirects;
          }
        }

        // Préparer le nom du superviseur une seule fois pour tous les disciples directs
        // IMPORTANT: Le superviseur a déjà été ajouté à membres (ligne 346-354), on peut le récupérer depuis là
        let nomSuperviseurPourAffiliation = null;
        
        // D'abord essayer depuis superviseurData
        if (superviseurData) {
          const firstName = superviseurData.first_name || '';
          const lastName = superviseurData.last_name || '';
          const nomComplet = `${firstName} ${lastName}`.trim();
          if (nomComplet && nomComplet !== '') {
            nomSuperviseurPourAffiliation = nomComplet;
          }
        }

        // Si pas trouvé, récupérer depuis les membres (le superviseur a été ajouté avant)
        if (!nomSuperviseurPourAffiliation || nomSuperviseurPourAffiliation === '') {
          const membreSuperviseur = membres.find(m => m.type === 'superviseur');
          if (membreSuperviseur) {
            const firstName = membreSuperviseur.first_name || '';
            const lastName = membreSuperviseur.last_name || '';
            const nomComplet = `${firstName} ${lastName}`.trim();
            if (nomComplet && nomComplet !== '') {
              nomSuperviseurPourAffiliation = nomComplet;
            }
          }
        }

        // Dernier recours: utiliser familles si disponible (état du composant)
        if ((!nomSuperviseurPourAffiliation || nomSuperviseurPourAffiliation === '') && familles && familles.length > 0) {
          const famille = familles.find(f => f.id === familleId);
          if (famille && famille.superviseur) {
            const firstName = famille.superviseur.first_name || '';
            const lastName = famille.superviseur.last_name || '';
            const nomComplet = `${firstName} ${lastName}`.trim();
            if (nomComplet && nomComplet !== '') {
              nomSuperviseurPourAffiliation = nomComplet;
              // Mettre à jour aussi superviseurData et le membre superviseur pour cohérence
              if (!superviseurData) {
                superviseurData = {
                  id: famille.superviseur.id,
                  first_name: famille.superviseur.first_name,
                  last_name: famille.superviseur.last_name,
                  role: 'superviseur',
                  titre: 'Superviseur'
                };
              }
              const membreSuperviseur = membres.find(m => m.type === 'superviseur');
              if (membreSuperviseur) {
                membreSuperviseur.first_name = famille.superviseur.first_name || '';
                membreSuperviseur.last_name = famille.superviseur.last_name || '';
              }
            }
          }
        }

        console.log('📋 Nom superviseur pour affiliation des disciples directs:', nomSuperviseurPourAffiliation);
        console.log('📋 Données superviseur complètes:', superviseurData);
        console.log('📋 Membre superviseur dans membres:', membres.find(m => m.type === 'superviseur'));

        disciplesData.forEach(disciple => {
          const isDirect = !disciple.parent_disciple_id;
          let affiliation = null;
          
          if (disciple.parent_disciple_id) {
            // Disciple indirect - affiliation avec le parent disciple
            affiliation = parentsMap[disciple.parent_disciple_id] || 'Discipline indirect';
          } else {
            // Disciple direct - affiliation avec le superviseur de la famille
            // TOUJOURS afficher le nom du superviseur (prénom nom) pour les disciples directs
            if (nomSuperviseurPourAffiliation && nomSuperviseurPourAffiliation !== '') {
              affiliation = nomSuperviseurPourAffiliation;
            } else {
              // Dernier recours: récupérer depuis les membres déjà ajoutés (pendant la boucle)
              const membreSuperviseur = membres.find(m => m.type === 'superviseur');
              if (membreSuperviseur) {
                const firstName = membreSuperviseur.first_name || '';
                const lastName = membreSuperviseur.last_name || '';
                const nomComplet = `${firstName} ${lastName}`.trim();
                affiliation = nomComplet || 'Superviseur';
              } else {
                affiliation = 'Superviseur';
              }
            }
          }

          console.log(`👤 Disciple ${disciple.first_name} ${disciple.last_name} (direct: ${isDirect}) -> affiliation: "${affiliation}"`);

          membres.push({
            id: disciple.id,
            first_name: disciple.first_name,
            last_name: disciple.last_name,
            titre: 'Disciple',
            affiliation: affiliation,
            dateEntreeFamille: disciple.start_date || disciple.created_at || null,
            type: isDirect ? 'disciple_direct' : 'disciple_indirect',
            isDirect: isDirect,
            disciplesSuivis: disciplesSuivisMap[disciple.id] || 0
          });
        });
      }

      setMembresFamille(membres);
    } catch (error) {
      console.error('Erreur lors de la récupération des membres de la famille:', error);
    }
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
                      {familles.reduce((sum, f) => {
                        const nombreReel = nombreMembresParFamille[f.id] !== undefined 
                          ? nombreMembresParFamille[f.id] 
                          : (f.nombre_disciples_actuels || 0);
                        return sum + nombreReel;
                      }, 0)}
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
                            familles.reduce((sum, f) => {
                              const nombreReel = nombreMembresParFamille[f.id] !== undefined 
                                ? nombreMembresParFamille[f.id] 
                                : (f.nombre_disciples_actuels || 0);
                              return sum + calculateProgression(nombreReel, f.objectif_disciples || 70);
                            }, 0) / familles.length
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
            // Utiliser le nombre réel de membres si disponible, sinon utiliser celui de la base
            const nombreMembresReel = nombreMembresParFamille[famille.id] !== undefined 
              ? nombreMembresParFamille[famille.id] 
              : (famille.nombre_disciples_actuels || 0);
            
            const progression = calculateProgression(
              nombreMembresReel,
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
                className="bg-white border-gray-200 hover:shadow-lg transition-shadow"
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
                      <p className="text-sm font-bold text-blue-600">
                        {progression}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${progression}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                      <span className="font-bold">{nombreMembresReel} / {famille.objectif_disciples || 70}</span>
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

      {/* Dialog détails de la famille */}
      <Dialog open={selectedFamille !== null} onOpenChange={(open) => !open && setSelectedFamille(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-100">
          {selectedFamille && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-black flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-purple-600" />
                  {selectedFamille.nom || 'Famille sans nom'}
                </DialogTitle>
                <DialogDescription className="text-blue-600 font-bold">
                  {selectedFamille.identifiant_famille || 'N/A'}
                  {(selectedFamille.statut || selectedFamille.created_at) && (
                    <span className="flex items-center gap-3 mt-2 flex-wrap">
                      {selectedFamille.statut && (
                        <Badge variant={selectedFamille.statut === 'actif' ? 'default' : 'secondary'} className={selectedFamille.statut === 'actif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                          {selectedFamille.statut === 'actif' ? 'Actif' : 'Inactif'}
                        </Badge>
                      )}
                      {selectedFamille.created_at && (
                        <span className="text-xs text-black flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Créée le {format(new Date(selectedFamille.created_at), 'd MMMM yyyy', { locale: fr })}
                        </span>
                      )}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Informations du superviseur */}
                {selectedFamille.superviseur && (
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Superviseur
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center overflow-hidden shrink-0">
                          {selectedFamille.superviseur.avatar_url ? (
                            <img src={selectedFamille.superviseur.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-semibold text-purple-600">
                              {(selectedFamille.superviseur.first_name || '')[0]}{(selectedFamille.superviseur.last_name || '')[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-lg">
                            {selectedFamille.superviseur.first_name} {selectedFamille.superviseur.last_name}
                          </p>
                          {selectedFamille.superviseur.email && (
                            <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                              <Mail className="h-4 w-4 shrink-0" />
                              {selectedFamille.superviseur.email}
                            </p>
                          )}
                          {selectedFamille.superviseur.email && (
                            <a
                              href={`mailto:${selectedFamille.superviseur.email}`}
                              className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
                            >
                              <Mail className="h-4 w-4" />
                              Contacter
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Statistiques de progression */}
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Progression</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">
                          {nombreMembresReel || selectedFamille.nombre_disciples_actuels || 0}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Membres actuels</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-3xl font-bold text-purple-600">
                          {selectedFamille.objectif_disciples || 70}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Objectif</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl font-bold text-green-600">
                          {calculateProgression(nombreMembresReel || selectedFamille.nombre_disciples_actuels || 0, selectedFamille.objectif_disciples || 70)}%
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Progression</div>
                      </div>
                    </div>

                    {/* Barre de progression */}
                    <div className="mt-6">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progression</span>
                        <span className="font-medium">{calculateProgression(nombreMembresReel || selectedFamille.nombre_disciples_actuels || 0, selectedFamille.objectif_disciples || 70)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            calculateProgression(nombreMembresReel || selectedFamille.nombre_disciples_actuels || 0, selectedFamille.objectif_disciples || 70) >= 100
                              ? 'bg-green-500'
                              : calculateProgression(nombreMembresReel || selectedFamille.nombre_disciples_actuels || 0, selectedFamille.objectif_disciples || 70) >= 50
                              ? 'bg-purple-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(calculateProgression(nombreMembresReel || selectedFamille.nombre_disciples_actuels || 0, selectedFamille.objectif_disciples || 70), 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                        <span>{nombreMembresReel || selectedFamille.nombre_disciples_actuels || 0} / {selectedFamille.objectif_disciples || 70}</span>
                        <Target className="w-4 h-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedFamille(null)}
                  className="bg-white border-gray-200 text-gray-900 hover:bg-blue-600 hover:text-white"
                >
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Liste des superviseurs de la famille */}
      {superviseursFamille.length > 0 && (
        <Card className="bg-white border-gray-200 shadow-sm mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5 text-purple-600" />
              Superviseurs de la famille
            </CardTitle>
            <CardDescription className="text-gray-600">
              Autres superviseurs sous la même tutelle pastorale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {superviseursFamille.map((superviseur) => (
                <div
                  key={superviseur.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                >
                  <Avatar className="h-10 w-10 border border-gray-200">
                    <AvatarImage src={superviseur.avatar_url} alt={`${superviseur.first_name} ${superviseur.last_name}`} />
                    <AvatarFallback className="bg-purple-100 text-purple-600 text-sm">
                      {superviseur.first_name?.charAt(0) || ''}{superviseur.last_name?.charAt(0) || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {superviseur.first_name} {superviseur.last_name}
                    </p>
                    {superviseur.titre && (
                      <p className="text-xs text-gray-500">{superviseur.titre}</p>
                    )}
                    {superviseur.email && (
                      <p className="text-xs text-gray-600 truncate">{superviseur.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des membres de la famille */}
      {membresFamille.length > 0 && (
        <Card className="bg-white border-gray-200 shadow-sm mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5 text-purple-600" />
              Membres de la famille
            </CardTitle>
            <CardDescription className="text-gray-600">
              Liste complète des membres avec leurs suivis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Section Disciples Directs */}
            {membresFamille.filter(m => m.isDirect || m.type === 'disciple_direct').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                  Disciples Directs ({membresFamille.filter(m => m.isDirect || m.type === 'disciple_direct').length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Prénom</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Nom</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Titre</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Disciple depuis le</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Suit</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Est suivi par</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membresFamille
                        .filter(m => m.isDirect || m.type === 'disciple_direct')
                        .map((membre) => (
                          <tr key={membre.id} className="border-b border-gray-100 hover:bg-gray-200 transition-colors">
                            <td 
                              className="py-3 px-4 text-sm text-gray-900 font-bold cursor-pointer hover:text-blue-600"
                              onClick={() => navigate(`/disciples/${membre.id}`)}
                            >
                              {membre.first_name}
                            </td>
                            <td 
                              className="py-3 px-4 text-sm text-gray-900 font-bold cursor-pointer hover:text-blue-600"
                              onClick={() => navigate(`/disciples/${membre.id}`)}
                            >
                              {membre.last_name}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {membre.titre}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {membre.dateEntreeFamille 
                                ? format(new Date(membre.dateEntreeFamille), 'd MMM yyyy', { locale: fr })
                                : '-'
                              }
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {membre.disciplesSuivis > 0 ? (
                                <span><span className="font-bold text-blue-600">{membre.disciplesSuivis}</span> Disciple{membre.disciplesSuivis > 1 ? 's' : ''}</span>
                              ) : (
                                <span><span className="font-bold text-blue-600">0</span> Disciple</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {membre.affiliation || '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section Autres Membres */}
            {membresFamille.filter(m => !m.isDirect && m.type !== 'disciple_direct').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Autres Membres de la Famille ({membresFamille.filter(m => !m.isDirect && m.type !== 'disciple_direct').length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Prénom</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Nom</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Titre</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Disciple depuis le</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Suit</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Est suivi par</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membresFamille
                        .filter(m => !m.isDirect && m.type !== 'disciple_direct')
                        .map((membre) => (
                          <tr key={membre.id} className="border-b border-gray-100 hover:bg-gray-200 transition-colors">
                            <td 
                              className="py-3 px-4 text-sm text-gray-900 font-bold cursor-pointer hover:text-blue-600"
                              onClick={() => navigate(`/disciples/${membre.id}`)}
                            >
                              {membre.first_name}
                            </td>
                            <td 
                              className="py-3 px-4 text-sm text-gray-900 font-bold cursor-pointer hover:text-blue-600"
                              onClick={() => navigate(`/disciples/${membre.id}`)}
                            >
                              {membre.last_name}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {membre.titre}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {membre.dateEntreeFamille 
                                ? format(new Date(membre.dateEntreeFamille), 'd MMM yyyy', { locale: fr })
                                : '-'
                              }
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {membre.disciplesSuivis > 0 ? (
                                <span><span className="font-bold text-blue-600">{membre.disciplesSuivis}</span> Disciple{membre.disciplesSuivis > 1 ? 's' : ''}</span>
                              ) : (
                                <span><span className="font-bold text-blue-600">0</span> Disciple</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {membre.affiliation || '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default FamillesDisciples;

