import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Heart, Briefcase } from 'lucide-react';

const ConnexionsReseau = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [annonces, setAnnonces] = useState([]);
  const [connexions, setConnexions] = useState([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Récupérer les annonces
      const { data: annoncesData, error: annoncesError } = await supabase
        .from('annonces_reseau')
        .select('*, profils!annonces_reseau_user_id_fkey(first_name, last_name)')
        .eq('statut', 'active')
        .order('date_publication', { ascending: false });

      if (annoncesError) throw annoncesError;
      setAnnonces(annoncesData || []);

      // Récupérer les connexions établies
      const { data: connexionsData, error: connexionsError } = await supabase
        .from('connexions_etablies')
        .select('*, profils!connexions_etablies_user1_id_fkey(first_name, last_name), profils!connexions_etablies_user2_id_fkey(first_name, last_name)')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('statut', 'active');

      if (connexionsError) throw connexionsError;
      setConnexions(connexionsData || []);

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
      <div className="w-full max-w-screen-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black mb-2">Réseau de Connexions</h1>
          <p className="text-gray-600">Connecter les brebis - Mariage, Affaires, Amitié, Ministère</p>
        </div>

        <Tabs defaultValue="annonces" className="w-full">
          <TabsList className="bg-white">
            <TabsTrigger value="annonces">Annonces</TabsTrigger>
            <TabsTrigger value="connexions">Mes Connexions</TabsTrigger>
            <TabsTrigger value="recherche">Recherche</TabsTrigger>
          </TabsList>

          <TabsContent value="annonces" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {annonces.length > 0 ? annonces.map((annonce) => (
                <Card key={annonce.id}>
                  <CardHeader>
                    <CardTitle className="text-black">{annonce.titre}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        {annonce.type_annonce === 'offre_emploi' && <Briefcase className="h-4 w-4" />}
                        {annonce.type_annonce === 'recherche_emploi' && <Briefcase className="h-4 w-4" />}
                        {annonce.type_annonce === 'service' && <Users className="h-4 w-4" />}
                        {annonce.type_annonce === 'mariage' && <Heart className="h-4 w-4" />}
                        <span className="capitalize">{annonce.type_annonce?.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm">{annonce.description?.substring(0, 100)}...</p>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      Voir détails
                    </Button>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full text-center py-12 rounded-xl border border-gray-200 border-dashed bg-gray-50/50">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                      <Briefcase className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune annonce disponible</h3>
                  <p className="text-gray-600 text-sm">Les annonces du réseau apparaîtront ici.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="connexions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {connexions.length > 0 ? connexions.map((connexion) => (
                <Card key={connexion.id}>
                  <CardHeader>
                    <CardTitle className="text-black">
                      Connexion {connexion.type_connexion}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Connexion établie le {new Date(connexion.date_connexion).toLocaleDateString('fr-FR')}
                    </p>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full text-center py-12 rounded-xl border border-gray-200 border-dashed bg-gray-50/50">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune connexion établie</h3>
                  <p className="text-gray-600 text-sm">Vos connexions avec d'autres membres apparaîtront ici.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recherche">
            <Card>
              <CardHeader>
                <CardTitle className="text-black">Recherche de Connexions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Fonctionnalités de recherche à venir...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ConnexionsReseau;







