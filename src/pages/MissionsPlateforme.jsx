import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Flame, MapPin, Users, Calendar, Target } from 'lucide-react';

const MissionsPlateforme = () => {
  const { user } = useAuth();
  const { isAdmin, isMentor } = useRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);
  const [appels, setAppels] = useState([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Récupérer les missions
      const { data: missionsData, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .order('date_debut', { ascending: false });

      if (missionsError) throw missionsError;
      setMissions(missionsData || []);

      // Récupérer les appels ministériels
      const { data: appelsData, error: appelsError } = await supabase
        .from('appels_ministres')
        .select('*, profils!appels_ministres_user_id_fkey(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (appelsError) throw appelsError;
      setAppels(appelsData || []);

    } catch (error) {
      console.error('Erreur:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les données."
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-black">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black mb-2">Plateforme Missionnaire</h1>
          <p className="text-gray-600">Déployer les âmes embrasées</p>
        </div>

        <Tabs defaultValue="missions" className="w-full">
          <TabsList className="bg-white">
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="appeles">Appelés</TabsTrigger>
            {(isAdmin || isMentor) && <TabsTrigger value="gestion">Gestion</TabsTrigger>}
          </TabsList>

          <TabsContent value="missions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {missions.length > 0 ? missions.map((mission) => (
                <Card key={mission.id}>
                  <CardHeader>
                    <CardTitle className="text-black">{mission.nom}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      {mission.zone_geographique && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{mission.zone_geographique}</span>
                        </div>
                      )}
                      {mission.date_debut && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(mission.date_debut).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span className="capitalize">{mission.statut}</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      Voir détails
                    </Button>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full text-center py-8 text-gray-600">
                  <p>Aucune mission disponible pour le moment.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="appeles" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {appels.length > 0 ? appels.map((appel) => (
                <Card key={appel.id}>
                  <CardHeader>
                    <CardTitle className="text-black">
                      {appel.profils?.first_name} {appel.profils?.last_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-semibold">Type d'appel: </span>
                        {appel.type_appel?.join(', ') || 'Non spécifié'}
                      </div>
                      <div>
                        <span className="font-semibold">Statut: </span>
                        <span className="capitalize">{appel.statut}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full text-center py-8 text-gray-600">
                  <p>Aucun appel ministériel enregistré.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {(isAdmin || isMentor) && (
            <TabsContent value="gestion">
              <Card>
                <CardHeader>
                  <CardTitle className="text-black">Gestion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Fonctionnalités de gestion à venir...</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default MissionsPlateforme;




