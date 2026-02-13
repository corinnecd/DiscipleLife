import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  ArrowLeft,
  Plus,
  TrendingUp,
  Heart,
  Brain,
  Activity,
  Calendar,
  Sparkles,
  Target,
  AlertCircle,
  BookOpen,
  CheckCircle,
  Download,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { exportHistoriqueToCSV, exportHistoriqueToPDF } from '@/utils/exportData';

const SuiviPostCriseDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [suivi, setSuivi] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [showAddHistorique, setShowAddHistorique] = useState(false);

  const [historiqueForm, setHistoriqueForm] = useState({
    etat_mental: 5,
    etat_spirituel: 5,
    etat_physique: 5,
    progres_observes: '',
    defis_rencontres: '',
    victoires: '',
    versets_bibliques: '',
    prieres_exaucees: '',
    actions_prises: '',
    notes: ''
  });

  useEffect(() => {
    if (user && id) {
      fetchSuivi();
      fetchHistorique();
    }
  }, [user, id]);

  const fetchSuivi = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('suivi_post_crise')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setSuivi(data);
    } catch (error) {
      console.error('Erreur lors du chargement du suivi:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger le suivi. Veuillez réessayer."
      });
      navigate('/suivi-post-crise');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorique = async () => {
    try {
      setLoadingHistorique(true);
      const { data, error } = await supabase
        .from('historique_guerison')
        .select('*')
        .eq('suivi_id', id)
        .order('date_suivi', { ascending: false });

      if (error) throw error;
      setHistorique(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      setLoadingHistorique(false);
    }
  };

  const handleAddHistorique = async (e) => {
    e.preventDefault();
    setLoadingHistorique(true);

    try {
      const payload = {
        suivi_id: id,
        etat_mental: parseInt(historiqueForm.etat_mental, 10),
        etat_spirituel: parseInt(historiqueForm.etat_spirituel, 10),
        etat_physique: parseInt(historiqueForm.etat_physique, 10),
        progres_observes: historiqueForm.progres_observes || null,
        defis_rencontres: historiqueForm.defis_rencontres || null,
        victoires: historiqueForm.victoires || null,
        versets_bibliques: historiqueForm.versets_bibliques ? historiqueForm.versets_bibliques.split(',').map(v => v.trim()).filter(Boolean) : null,
        prieres_exaucees: historiqueForm.prieres_exaucees ? historiqueForm.prieres_exaucees.split(',').map(p => p.trim()).filter(Boolean) : null,
        actions_prises: historiqueForm.actions_prises ? historiqueForm.actions_prises.split(',').map(a => a.trim()).filter(Boolean) : null,
        notes: historiqueForm.notes || null
      };

      const { error } = await supabase
        .from('historique_guerison')
        .insert([payload]);

      if (error) throw error;

      toast({
        title: "Entrée ajoutée",
        description: "Votre progression a été enregistrée avec succès."
      });

      // Réinitialiser le formulaire et recharger l'historique
      setHistoriqueForm({
        etat_mental: 5,
        etat_spirituel: 5,
        etat_physique: 5,
        progres_observes: '',
        defis_rencontres: '',
        victoires: '',
        versets_bibliques: '',
        prieres_exaucees: '',
        actions_prises: '',
        notes: ''
      });
      setShowAddHistorique(false);
      fetchHistorique();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'historique:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue."
      });
    } finally {
      setLoadingHistorique(false);
    }
  };

  const getChartData = () => {
    return historique
      .slice()
      .reverse()
      .map((entry) => ({
        date: new Date(entry.date_suivi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        Mental: entry.etat_mental,
        Spirituel: entry.etat_spirituel,
        Physique: entry.etat_physique
      }));
  };

  const getMoyenneEtat = () => {
    if (historique.length === 0) return { mental: 0, spirituel: 0, physique: 0 };
    const total = historique.reduce(
      (acc, entry) => ({
        mental: acc.mental + entry.etat_mental,
        spirituel: acc.spirituel + entry.etat_spirituel,
        physique: acc.physique + entry.etat_physique
      }),
      { mental: 0, spirituel: 0, physique: 0 }
    );
    return {
      mental: (total.mental / historique.length).toFixed(1),
      spirituel: (total.spirituel / historique.length).toFixed(1),
      physique: (total.physique / historique.length).toFixed(1)
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0518] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-400" />
      </div>
    );
  }

  if (!suivi) {
    return (
      <div className="min-h-screen bg-[#0f0518] flex items-center justify-center">
        <p className="text-white">Suivi introuvable</p>
      </div>
    );
  }

  const moyennes = getMoyenneEtat();

  return (
    <div className="min-h-screen bg-[#0f0518] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/suivi-post-crise')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Heart className="text-teal-400" size={32} />
              Détails du suivi
            </h1>
            <p className="text-gray-400 mt-1">
              {suivi.type_crise.charAt(0).toUpperCase() + suivi.type_crise.slice(1)} - 
              Créé le {new Date(suivi.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <Badge className={cn(
            suivi.statut === 'actif' ? 'bg-red-500' :
            suivi.statut === 'en_amelioration' ? 'bg-orange-500' :
            suivi.statut === 'stabilise' ? 'bg-yellow-500' :
            suivi.statut === 'resolu' ? 'bg-green-500' :
            'bg-gray-500',
            'text-white'
          )}>
            {suivi.statut}
          </Badge>
        </div>

        {/* Informations du suivi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#1a0b2e] border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">Gravité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="text-red-400" size={24} />
                <span className="text-3xl font-bold">{suivi.gravite}/10</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a0b2e] border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">Entrées d'historique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BookOpen className="text-teal-400" size={24} />
                <span className="text-3xl font-bold">{historique.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a0b2e] border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">Prochaine action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="text-purple-400" size={24} />
                <span className="text-sm">
                  {suivi.date_prochaine_action 
                    ? new Date(suivi.date_prochaine_action).toLocaleDateString('fr-FR')
                    : 'Non définie'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description et détails */}
        <Card className="bg-[#1a0b2e] border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">{suivi.description}</p>

            {suivi.etat_actuel && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">État actuel</h3>
                <p className="text-gray-300">{suivi.etat_actuel}</p>
              </div>
            )}

            {suivi.objectifs && suivi.objectifs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                  <Target size={16} /> Objectifs
                </h3>
                <ul className="space-y-1">
                  {suivi.objectifs.map((obj, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-300">
                      <CheckCircle size={16} className="text-teal-400 mt-1 flex-shrink-0" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suivi.prochaine_action && (
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-teal-400 mb-2">Prochaine action</h3>
                <p className="text-white">{suivi.prochaine_action}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graphique d'évolution */}
        {historique.length > 0 && (
          <Card className="bg-[#1a0b2e] border-white/10 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="text-teal-400" size={24} />
                Évolution de votre guérison
              </CardTitle>
              <CardDescription className="text-gray-400">
                Suivi de votre état mental, spirituel et physique au fil du temps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Mental</p>
                  <p className="text-2xl font-bold text-blue-400">{moyennes.mental}/10</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Spirituel</p>
                  <p className="text-2xl font-bold text-purple-400">{moyennes.spirituel}/10</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Physique</p>
                  <p className="text-2xl font-bold text-green-400">{moyennes.physique}/10</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis domain={[0, 10]} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a0b2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Mental" stroke="#60a5fa" strokeWidth={2} />
                  <Line type="monotone" dataKey="Spirituel" stroke="#a78bfa" strokeWidth={2} />
                  <Line type="monotone" dataKey="Physique" stroke="#34d399" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Bouton d'ajout d'historique */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-teal-400" size={24} />
            Historique de guérison
          </h2>
          <div className="flex gap-2">
            {historique.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => exportHistoriqueToCSV(historique, `historique_guerison_${new Date().toISOString().split('T')[0]}`)}
                  className="border-white/10 text-gray-300 hover:bg-white/10"
                >
                  <Download size={16} className="mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportHistoriqueToPDF(suivi, historique)}
                  className="border-white/10 text-gray-300 hover:bg-white/10"
                >
                  <FileText size={16} className="mr-2" />
                  PDF
                </Button>
              </>
            )}
            <Button
              onClick={() => setShowAddHistorique(!showAddHistorique)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus size={20} className="mr-2" />
              {showAddHistorique ? 'Annuler' : 'Ajouter une entrée'}
            </Button>
          </div>
        </div>

        {/* Formulaire d'ajout d'historique */}
        {showAddHistorique && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-[#1a0b2e] border-white/10 mb-8">
              <CardHeader>
                <CardTitle className="text-white">Nouvelle entrée d'historique</CardTitle>
                <CardDescription className="text-gray-400">
                  Enregistrez votre progression et vos observations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddHistorique} className="space-y-6">
                  {/* États (Mental, Spirituel, Physique) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Brain className="text-blue-400" size={16} />
                        État mental (1-10)
                      </Label>
                      <Input
                        type="range"
                        min="1"
                        max="10"
                        value={historiqueForm.etat_mental}
                        onChange={(e) => setHistoriqueForm(prev => ({ ...prev, etat_mental: e.target.value }))}
                        className="w-full"
                      />
                      <p className="text-center text-2xl font-bold text-blue-400">{historiqueForm.etat_mental}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Heart className="text-purple-400" size={16} />
                        État spirituel (1-10)
                      </Label>
                      <Input
                        type="range"
                        min="1"
                        max="10"
                        value={historiqueForm.etat_spirituel}
                        onChange={(e) => setHistoriqueForm(prev => ({ ...prev, etat_spirituel: e.target.value }))}
                        className="w-full"
                      />
                      <p className="text-center text-2xl font-bold text-purple-400">{historiqueForm.etat_spirituel}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Activity className="text-green-400" size={16} />
                        État physique (1-10)
                      </Label>
                      <Input
                        type="range"
                        min="1"
                        max="10"
                        value={historiqueForm.etat_physique}
                        onChange={(e) => setHistoriqueForm(prev => ({ ...prev, etat_physique: e.target.value }))}
                        className="w-full"
                      />
                      <p className="text-center text-2xl font-bold text-green-400">{historiqueForm.etat_physique}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Progrès observés</Label>
                      <Textarea
                        value={historiqueForm.progres_observes}
                        onChange={(e) => setHistoriqueForm(prev => ({ ...prev, progres_observes: e.target.value }))}
                        placeholder="Quels progrès avez-vous observés ?"
                        className="bg-black/20 border-white/10 text-white min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Défis rencontrés</Label>
                      <Textarea
                        value={historiqueForm.defis_rencontres}
                        onChange={(e) => setHistoriqueForm(prev => ({ ...prev, defis_rencontres: e.target.value }))}
                        placeholder="Quels défis avez-vous rencontrés ?"
                        className="bg-black/20 border-white/10 text-white min-h-[80px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Victoires / Avancées</Label>
                    <Textarea
                      value={historiqueForm.victoires}
                      onChange={(e) => setHistoriqueForm(prev => ({ ...prev, victoires: e.target.value }))}
                      placeholder="Quelles victoires avez-vous remportées ?"
                      className="bg-black/20 border-white/10 text-white min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Versets bibliques qui ont aidé</Label>
                      <Textarea
                        value={historiqueForm.versets_bibliques}
                        onChange={(e) => setHistoriqueForm(prev => ({ ...prev, versets_bibliques: e.target.value }))}
                        placeholder="Ex: Jean 3:16, Psaume 23... (séparez par des virgules)"
                        className="bg-black/20 border-white/10 text-white min-h-[60px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Prières exaucées</Label>
                      <Textarea
                        value={historiqueForm.prieres_exaucees}
                        onChange={(e) => setHistoriqueForm(prev => ({ ...prev, prieres_exaucees: e.target.value }))}
                        placeholder="Quelles prières ont été exaucées ? (séparez par des virgules)"
                        className="bg-black/20 border-white/10 text-white min-h-[60px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Actions concrètes prises</Label>
                    <Textarea
                      value={historiqueForm.actions_prises}
                      onChange={(e) => setHistoriqueForm(prev => ({ ...prev, actions_prises: e.target.value }))}
                      placeholder="Ex: Rencontre avec le mentor, Lecture de livre, Prière de groupe... (séparez par des virgules)"
                      className="bg-black/20 border-white/10 text-white min-h-[60px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes additionnelles</Label>
                    <Textarea
                      value={historiqueForm.notes}
                      onChange={(e) => setHistoriqueForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notes, réflexions personnelles..."
                      className="bg-black/20 border-white/10 text-white min-h-[80px]"
                    />
                  </div>

                  <div className="flex gap-4 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowAddHistorique(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={loadingHistorique}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {loadingHistorique ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        'Enregistrer l\'entrée'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Liste de l'historique */}
        <div className="space-y-4">
          {loadingHistorique && historique.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            </div>
          ) : historique.length === 0 ? (
            <Card className="bg-[#1a0b2e] border-white/10">
              <CardContent className="py-12 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-400 mb-4">
                  Aucune entrée d'historique pour ce suivi.
                </p>
                <Button
                  onClick={() => setShowAddHistorique(true)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus size={20} className="mr-2" />
                  Ajouter la première entrée
                </Button>
              </CardContent>
            </Card>
          ) : (
            historique.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-[#1a0b2e] border-white/10">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Calendar className="text-teal-400" size={20} />
                        {new Date(entry.date_suivi).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </CardTitle>
                      <div className="flex gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Mental</p>
                          <p className="text-lg font-bold text-blue-400">{entry.etat_mental}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Spirituel</p>
                          <p className="text-lg font-bold text-purple-400">{entry.etat_spirituel}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Physique</p>
                          <p className="text-lg font-bold text-green-400">{entry.etat_physique}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {entry.progres_observes && (
                      <div>
                        <h4 className="text-sm font-semibold text-green-400 mb-1">Progrès observés</h4>
                        <p className="text-gray-300">{entry.progres_observes}</p>
                      </div>
                    )}
                    {entry.victoires && (
                      <div>
                        <h4 className="text-sm font-semibold text-yellow-400 mb-1">Victoires</h4>
                        <p className="text-gray-300">{entry.victoires}</p>
                      </div>
                    )}
                    {entry.defis_rencontres && (
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-1">Défis rencontrés</h4>
                        <p className="text-gray-300">{entry.defis_rencontres}</p>
                      </div>
                    )}
                    {entry.versets_bibliques && entry.versets_bibliques.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-purple-400 mb-1">Versets bibliques</h4>
                        <div className="flex flex-wrap gap-2">
                          {entry.versets_bibliques.map((verset, index) => (
                            <Badge key={index} className="bg-purple-500/20 text-purple-300">
                              {verset}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {entry.notes && (
                      <div className="bg-black/20 rounded-lg p-3">
                        <p className="text-sm text-gray-300">{entry.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SuiviPostCriseDetail;
