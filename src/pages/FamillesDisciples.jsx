import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Users, Target, TrendingUp, UserCheck, Loader2, Plus, Edit, Eye } from 'lucide-react';
import { Helmet } from 'react-helmet';

const FamillesDisciples = () => {
  const { user } = useAuth();
  const { role, hasAdminView, hasSuperviseurView } = useRole();
  const { toast } = useToast();
  
  const [familles, setFamilles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFamille, setSelectedFamille] = useState(null);

  useEffect(() => {
    if (user) {
      fetchFamilles();
    }
  }, [user, role]);

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
            .select('id, first_name, last_name, email')
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

  const calculateProgression = (nombreActuels, objectif) => {
    if (objectif === 0) return 0;
    return Math.min(Math.round((nombreActuels / objectif) * 100), 100);
  };

  const getProgressionColor = (progression) => {
    if (progression >= 80) return 'text-green-600';
    if (progression >= 50) return 'text-yellow-600';
    return 'text-red-600';
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
            <Button className="bg-purple-600 text-white hover:bg-purple-700">
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
                  <div>
                    <p className="text-sm text-gray-600">Superviseur</p>
                    <p className="text-sm font-semibold text-gray-900">{superviseurNom}</p>
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
                      className="flex-1 bg-purple-600 text-white hover:bg-purple-700"
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
                        className="bg-purple-600 text-white hover:bg-purple-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Ouvrir modal d'édition
                        }}
                      >
                        <Edit className="w-4 h-4" />
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
    </>
  );
};

export default FamillesDisciples;

