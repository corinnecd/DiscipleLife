import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus, CheckCircle2, XCircle } from 'lucide-react';

const CreateDiscipleAccounts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [disciplesWithoutAccounts, setDisciplesWithoutAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState([]);
  const [failed, setFailed] = useState([]);

  useEffect(() => {
    fetchDisciplesWithoutAccounts();
  }, []);

  const fetchDisciplesWithoutAccounts = async () => {
    try {
      setLoading(true);

      // Source unique : profils. Récupérer tous les disciples du mentor actuel (role=disciple, mentor_id=user.id)
      const { data: profilsData, error: profilsError } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email')
        .eq('mentor_id', user.id)
        .eq('role', 'disciple')
        .order('last_name');

      if (profilsError) throw profilsError;

      // Considérer comme "sans compte" les profils dont l'email n'est pas encore utilisé dans auth
      // (on ne peut pas interroger auth depuis le client ; on affiche la liste pour création de compte)
      const list = (profilsData || []).map((p) => ({
        ...p,
        name: `${(p.first_name || '')} ${(p.last_name || '')}`.trim() || 'Sans nom'
      }));

      setDisciplesWithoutAccounts(list);
    } catch (error) {
      console.error("Error fetching disciples:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des disciples.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateFictitiousEmail = (firstName, lastName, id) => {
    // Générer un email fictif basé sur le nom et l'ID
    const cleanFirstName = (firstName || '').toLowerCase().replace(/[^a-z]/g, '');
    const cleanLastName = (lastName || '').toLowerCase().replace(/[^a-z]/g, '');
    const shortId = id.substring(0, 8);
    return `${cleanFirstName}.${cleanLastName}.${shortId}@disciplelife.local`;
  };

  const createAccountForDisciple = async (disciple) => {
    try {
      // Générer un email fictif si le disciple n'en a pas
      const email = disciple.email || generateFictitiousEmail(
        disciple.first_name,
        disciple.last_name,
        disciple.id
      );
      
      // Vérifier d'abord si un compte existe déjà avec cet email
      const { data: existingProfils } = await supabase
        .from('profils')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (existingProfils) {
        if (!disciple.email || disciple.email !== email) {
          await supabase.from('profils').update({ email: email }).eq('id', disciple.id);
        }
        return { success: true, userId: existingProfils.id, email, method: 'existing' };
      }
      
      // Générer un UUID pour le nouvel utilisateur
      const userId = crypto.randomUUID();
      
      // Générer un mot de passe fictif (les disciples ne pourront pas se connecter avec)
      const password = `Disciple${disciple.id.substring(0, 8)}!`;
      
      // Essayer d'abord de créer via signUp (nécessite confirmation email désactivée dans Supabase)
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              first_name: disciple.first_name || '',
              last_name: disciple.last_name || '',
              role: 'disciple'
            },
            emailRedirectTo: undefined
          }
        });
        
        if (!authError && authData?.user) {
          // Attendre un peu pour que le trigger crée le profil
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Vérifier que le profil a été créé
          const { data: profilData } = await supabase
            .from('profils')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          
          if (profilData) {
            if (!disciple.email || disciple.email !== email) {
              await supabase.from('profils').update({ email: email }).eq('id', disciple.id);
            }
            return { success: true, userId: profilData.id, email, method: 'signup' };
          }
        }
      } catch (signUpError) {
        console.log("signUp failed, trying direct insert:", signUpError);
      }
      
      // Méthode alternative : insérer directement dans profils
      // Note: Cela nécessite que l'utilisateur auth soit créé séparément ou via un trigger
      const { data: insertedProfil, error: insertError } = await supabase
        .from('profils')
        .insert({
          id: userId,
          email: email,
          first_name: disciple.first_name || '',
          last_name: disciple.last_name || '',
          role: 'disciple',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        // Si l'insertion échoue, essayer de récupérer l'utilisateur existant
        if (insertError.code === '23505') { // Duplicate key
          const { data: existing } = await supabase
            .from('profils')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          
          if (existing) {
            if (!disciple.email || disciple.email !== email) {
              await supabase.from('profils').update({ email: email }).eq('id', disciple.id);
            }
            return { success: true, userId: existing.id, email, method: 'existing' };
          }
        }
        throw insertError;
      }
      
      if (!disciple.email || disciple.email !== email) {
        await supabase.from('profils').update({ email: email }).eq('id', disciple.id);
      }
      
      return { success: true, userId: insertedProfil.id, email, method: 'direct_insert' };
      
    } catch (error) {
      console.error(`Error creating account for ${disciple.first_name} ${disciple.last_name}:`, error);
      throw error;
    }
  };

  const createAllAccounts = async () => {
    setCreating(true);
    setCreated([]);
    setFailed([]);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const disciple of disciplesWithoutAccounts) {
      try {
        const result = await createAccountForDisciple(disciple);
        setCreated(prev => [...prev, { ...disciple, ...result }]);
        successCount++;
        
        // Petit délai entre chaque création pour éviter les limites de taux
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        setFailed(prev => [...prev, { ...disciple, error: error.message }]);
        failCount++;
      }
    }
    
    setCreating(false);
    
    toast({
      title: "Création terminée",
      description: `${successCount} compte(s) créé(s) avec succès, ${failCount} échec(s).`,
      className: successCount > 0 ? "bg-green-600 text-white border-none" : "bg-red-600 text-white border-none"
    });
    
    // Rafraîchir la liste
    await fetchDisciplesWithoutAccounts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0518]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0518] p-6">
      <div className="w-full max-w-[1800px] mx-auto space-y-6">
        <Card className="bg-[#1a0b2e] border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-2xl flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-teal-400" />
              Créer des comptes utilisateurs pour les disciples
            </CardTitle>
            <CardDescription className="text-gray-400">
              Cette page permet de créer automatiquement des comptes utilisateurs fictifs pour les disciples qui n'en ont pas encore.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                <strong>Note :</strong> Les comptes créés auront des emails fictifs (format: prenom.nom.id@disciplelife.local) 
                et des mots de passe générés automatiquement. Ces comptes sont destinés uniquement à permettre l'enregistrement 
                des présences dans la base de données.
              </p>
            </div>

            {disciplesWithoutAccounts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-white text-lg">Tous les disciples ont déjà un compte utilisateur !</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-white font-medium">
                    Disciples sans compte utilisateur ({disciplesWithoutAccounts.length})
                  </p>
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {disciplesWithoutAccounts.map((disciple) => (
                      <div
                        key={disciple.id}
                        className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {disciple.name || `${disciple.first_name} ${disciple.last_name}`.trim()}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Email: {disciple.email || 'Aucun email'}
                          </p>
                        </div>
                        {created.find(c => c.id === disciple.id) && (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        )}
                        {failed.find(f => f.id === disciple.id) && (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={createAllAccounts}
                  disabled={creating || disciplesWithoutAccounts.length === 0}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Créer {disciplesWithoutAccounts.length} compte(s)
                    </>
                  )}
                </Button>

                {created.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <p className="text-green-300 font-medium mb-2">
                      Comptes créés avec succès ({created.length})
                    </p>
                    <div className="space-y-1 text-sm text-gray-300">
                      {created.map((item) => (
                        <p key={item.id}>
                          ✓ {item.name} - {item.email}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {failed.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-300 font-medium mb-2">
                      Échecs ({failed.length})
                    </p>
                    <div className="space-y-1 text-sm text-gray-300">
                      {failed.map((item) => (
                        <p key={item.id}>
                          ✗ {item.name} - {item.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateDiscipleAccounts;

