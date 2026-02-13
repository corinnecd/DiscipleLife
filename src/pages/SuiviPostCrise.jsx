import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, 
  Plus, 
  Heart, 
  Calendar, 
  AlertCircle, 
  TrendingUp, 
  Edit, 
  Trash2,
  ArrowLeft,
  ChevronRight,
  Download,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { exportSuivisToCSV, exportSuivisToPDF } from '@/utils/exportData';

const SuiviPostCrise = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingSuivis, setLoadingSuivis] = useState(true);
  const [suivis, setSuivis] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    type_crise: '',
    description: '',
    gravite: 5,
    objectifs: '',
    etat_actuel: '',
    besoins_specifiques: '',
    ressources_utilisees: '',
    prochaine_action: '',
    date_prochaine_action: '',
    rappel_actif: true,
    frequence_rappels: 'hebdomadaire',
    statut: 'actif',
    notes: ''
  });

  const TYPES_CRISE = [
    { value: 'deuil', label: 'Deuil', icon: '💔' },
    { value: 'divorce', label: 'Divorce', icon: '💔' },
    { value: 'maladie', label: 'Maladie', icon: '🏥' },
    { value: 'chomage', label: 'Chômage', icon: '💼' },
    { value: 'trauma', label: 'Trauma', icon: '⚠️' },
    { value: 'depression', label: 'Dépression', icon: '😔' },
    { value: 'addiction', label: 'Addiction', icon: '🚬' },
    { value: 'conflit_familial', label: 'Conflit familial', icon: '👨‍👩‍👧' },
    { value: 'crise_spirituelle', label: 'Crise spirituelle', icon: '🙏' },
    { value: 'autre', label: 'Autre', icon: '📝' }
  ];

  const STATUTS = [
    { value: 'actif', label: 'Actif', color: 'bg-red-500' },
    { value: 'en_amelioration', label: 'En amélioration', color: 'bg-orange-500' },
    { value: 'stabilise', label: 'Stabilisé', color: 'bg-yellow-500' },
    { value: 'resolu', label: 'Résolu', color: 'bg-green-500' },
    { value: 'archive', label: 'Archivé', color: 'bg-gray-500' }
  ];

  const FREQUENCES = [
    { value: 'quotidien', label: 'Quotidien' },
    { value: 'hebdomadaire', label: 'Hebdomadaire' },
    { value: 'bihebdomadaire', label: 'Bihebdomadaire' },
    { value: 'mensuel', label: 'Mensuel' }
  ];

  // Charger les suivis de l'utilisateur
  useEffect(() => {
    if (user) {
      fetchSuivis();
    }
  }, [user]);

  const fetchSuivis = async () => {
    try {
      setLoadingSuivis(true);
      const { data, error } = await supabase
        .from('suivi_post_crise')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuivis(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des suivis:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les suivis. Veuillez réessayer."
      });
    } finally {
      setLoadingSuivis(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.type_crise || !formData.description) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez remplir au moins le type de crise et la description."
      });
      return;
    }

    setLoading(true);
    try {
      // Préparer les données (convertir les chaînes en tableaux si nécessaire)
      const payload = {
        user_id: user.id,
        type_crise: formData.type_crise,
        description: formData.description,
        gravite: parseInt(formData.gravite, 10),
        objectifs: formData.objectifs ? formData.objectifs.split(',').map(o => o.trim()).filter(Boolean) : null,
        etat_actuel: formData.etat_actuel || null,
        besoins_specifiques: formData.besoins_specifiques ? formData.besoins_specifiques.split(',').map(b => b.trim()).filter(Boolean) : null,
        ressources_utilisees: formData.ressources_utilisees ? formData.ressources_utilisees.split(',').map(r => r.trim()).filter(Boolean) : null,
        prochaine_action: formData.prochaine_action || null,
        date_prochaine_action: formData.date_prochaine_action || null,
        rappel_actif: formData.rappel_actif,
        frequence_rappels: formData.frequence_rappels,
        statut: formData.statut,
        notes: formData.notes || null
      };

      if (editingId) {
        // Mise à jour
        const { error } = await supabase
          .from('suivi_post_crise')
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Suivi mis à jour",
          description: "Le suivi post-crise a été mis à jour avec succès."
        });
      } else {
        // Création
        const { error } = await supabase
          .from('suivi_post_crise')
          .insert([payload]);

        if (error) throw error;

        toast({
          title: "Suivi créé",
          description: "Le suivi post-crise a été créé avec succès."
        });
      }

      // Réinitialiser le formulaire et recharger les suivis
      resetForm();
      fetchSuivis();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du suivi:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la sauvegarde."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (suivi) => {
    setEditingId(suivi.id);
    setFormData({
      type_crise: suivi.type_crise || '',
      description: suivi.description || '',
      gravite: suivi.gravite || 5,
      objectifs: Array.isArray(suivi.objectifs) ? suivi.objectifs.join(', ') : '',
      etat_actuel: suivi.etat_actuel || '',
      besoins_specifiques: Array.isArray(suivi.besoins_specifiques) ? suivi.besoins_specifiques.join(', ') : '',
      ressources_utilisees: Array.isArray(suivi.ressources_utilisees) ? suivi.ressources_utilisees.join(', ') : '',
      prochaine_action: suivi.prochaine_action || '',
      date_prochaine_action: suivi.date_prochaine_action || '',
      rappel_actif: suivi.rappel_actif ?? true,
      frequence_rappels: suivi.frequence_rappels || 'hebdomadaire',
      statut: suivi.statut || 'actif',
      notes: suivi.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce suivi ?')) return;

    try {
      const { error } = await supabase
        .from('suivi_post_crise')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Suivi supprimé",
        description: "Le suivi post-crise a été supprimé avec succès."
      });

      fetchSuivis();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le suivi."
      });
    }
  };

  const resetForm = () => {
    setFormData({
      type_crise: '',
      description: '',
      gravite: 5,
      objectifs: '',
      etat_actuel: '',
      besoins_specifiques: '',
      ressources_utilisees: '',
      prochaine_action: '',
      date_prochaine_action: '',
      rappel_actif: true,
      frequence_rappels: 'hebdomadaire',
      statut: 'actif',
      notes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getStatutBadge = (statut) => {
    const statutObj = STATUTS.find(s => s.value === statut);
    return (
      <Badge className={cn(statutObj?.color || 'bg-gray-500', 'text-white')}>
        {statutObj?.label || statut}
      </Badge>
    );
  };

  const getTypeCriseIcon = (type) => {
    const typeObj = TYPES_CRISE.find(t => t.value === type);
    return typeObj?.icon || '📝';
  };

  return (
    <div className="min-h-screen bg-[#0f0518] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Heart className="text-teal-400" size={32} />
                Suivi Post-Crise
              </h1>
              <p className="text-gray-400 mt-1">
                Accompagnement personnalisé dans votre parcours de guérison et restauration
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {suivis.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => exportSuivisToCSV(suivis, `suivis_post_crise_${new Date().toISOString().split('T')[0]}`)}
                  className="border-white/10 text-gray-300 hover:bg-white/10"
                >
                  <Download size={16} className="mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const stats = {
                      totalSuivis: suivis.length,
                      suivisActifs: suivis.filter(s => s.statut === 'actif').length,
                      suivisResolus: suivis.filter(s => s.statut === 'resolu').length,
                      tauxGuerison: ((suivis.filter(s => s.statut === 'resolu').length / suivis.length) * 100).toFixed(1)
                    };
                    exportSuivisToPDF(suivis, stats);
                  }}
                  className="border-white/10 text-gray-300 hover:bg-white/10"
                >
                  <FileText size={16} className="mr-2" />
                  PDF
                </Button>
              </>
            )}
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus size={20} className="mr-2" />
              {showForm ? 'Annuler' : 'Nouveau suivi'}
            </Button>
          </div>
        </div>

        {/* Formulaire de création/édition */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-[#1a0b2e] border-white/10 mb-8">
              <CardHeader>
                <CardTitle className="text-white">
                  {editingId ? 'Modifier le suivi' : 'Créer un nouveau suivi'}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Renseignez les informations sur la crise et définissez les objectifs de guérison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Type de crise */}
                    <div className="space-y-2">
                      <Label>Type de crise <span className="text-red-400">*</span></Label>
                      <Select
                        value={formData.type_crise}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, type_crise: value }))}
                        required
                      >
                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                          <SelectValue placeholder="Sélectionnez un type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a0b2e] border-white/10">
                          {TYPES_CRISE.map((type) => (
                            <SelectItem
                              key={type.value}
                              value={type.value}
                              className="text-white focus:bg-teal-500/20"
                            >
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Gravité */}
                    <div className="space-y-2">
                      <Label>Gravité (1-10)</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="range"
                          name="gravite"
                          min="1"
                          max="10"
                          value={formData.gravite}
                          onChange={handleInputChange}
                          className="flex-1"
                        />
                        <span className="text-2xl font-bold text-teal-400 w-12 text-center">
                          {formData.gravite}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description de la crise <span className="text-red-400">*</span></Label>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Décrivez la situation, le contexte, les circonstances..."
                      className="bg-black/20 border-white/10 text-white min-h-[100px]"
                      required
                    />
                  </div>

                  {/* État actuel */}
                  <div className="space-y-2">
                    <Label>État actuel</Label>
                    <Textarea
                      name="etat_actuel"
                      value={formData.etat_actuel}
                      onChange={handleInputChange}
                      placeholder="Comment vous sentez-vous actuellement ? Où en êtes-vous dans votre parcours ?"
                      className="bg-black/20 border-white/10 text-white min-h-[80px]"
                    />
                  </div>

                  {/* Objectifs */}
                  <div className="space-y-2">
                    <Label>Objectifs de guérison/restauration</Label>
                    <Textarea
                      name="objectifs"
                      value={formData.objectifs}
                      onChange={handleInputChange}
                      placeholder="Ex: Retrouver la paix intérieure, Pardonner, Reconstruire ma foi... (séparez par des virgules)"
                      className="bg-black/20 border-white/10 text-white min-h-[80px]"
                    />
                    <p className="text-xs text-gray-500">Séparez les objectifs par des virgules</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Besoins spécifiques */}
                    <div className="space-y-2">
                      <Label>Besoins spécifiques</Label>
                      <Textarea
                        name="besoins_specifiques"
                        value={formData.besoins_specifiques}
                        onChange={handleInputChange}
                        placeholder="Ex: Accompagnement, Prière, Écoute... (séparez par des virgules)"
                        className="bg-black/20 border-white/10 text-white min-h-[80px]"
                      />
                    </div>

                    {/* Ressources utilisées */}
                    <div className="space-y-2">
                      <Label>Ressources utilisées</Label>
                      <Textarea
                        name="ressources_utilisees"
                        value={formData.ressources_utilisees}
                        onChange={handleInputChange}
                        placeholder="Ex: Livres, Formations, Counseling... (séparez par des virgules)"
                        className="bg-black/20 border-white/10 text-white min-h-[80px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Prochaine action */}
                    <div className="space-y-2">
                      <Label>Prochaine action</Label>
                      <Input
                        name="prochaine_action"
                        value={formData.prochaine_action}
                        onChange={handleInputChange}
                        placeholder="Ex: Rendez-vous avec le mentor"
                        className="bg-black/20 border-white/10 text-white"
                      />
                    </div>

                    {/* Date prochaine action */}
                    <div className="space-y-2">
                      <Label>Date de la prochaine action</Label>
                      <Input
                        type="date"
                        name="date_prochaine_action"
                        value={formData.date_prochaine_action}
                        onChange={handleInputChange}
                        className="bg-black/20 border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Statut */}
                    <div className="space-y-2">
                      <Label>Statut</Label>
                      <Select
                        value={formData.statut}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value }))}
                      >
                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a0b2e] border-white/10">
                          {STATUTS.map((statut) => (
                            <SelectItem
                              key={statut.value}
                              value={statut.value}
                              className="text-white focus:bg-teal-500/20"
                            >
                              {statut.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fréquence des rappels */}
                    <div className="space-y-2">
                      <Label>Fréquence des rappels</Label>
                      <Select
                        value={formData.frequence_rappels}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, frequence_rappels: value }))}
                      >
                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a0b2e] border-white/10">
                          {FREQUENCES.map((freq) => (
                            <SelectItem
                              key={freq.value}
                              value={freq.value}
                              className="text-white focus:bg-teal-500/20"
                            >
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rappel actif */}
                    <div className="space-y-2 flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="rappel_actif"
                          checked={formData.rappel_actif}
                          onChange={handleInputChange}
                          className="w-5 h-5 rounded border-white/10 bg-black/20 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm">Activer les rappels</span>
                      </label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes personnelles</Label>
                    <Textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Notes, réflexions, prières..."
                      className="bg-black/20 border-white/10 text-white min-h-[100px]"
                    />
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-4 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetForm}
                      className="text-gray-400 hover:text-white"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        editingId ? 'Mettre à jour' : 'Créer le suivi'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Liste des suivis */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-teal-400" size={24} />
            Mes suivis en cours
          </h2>

          {loadingSuivis ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            </div>
          ) : suivis.length === 0 ? (
            <Card className="bg-[#1a0b2e] border-white/10">
              <CardContent className="py-12 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-400 mb-4">
                  Aucun suivi post-crise enregistré pour le moment.
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus size={20} className="mr-2" />
                  Créer mon premier suivi
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suivis.map((suivi) => (
                <motion.div
                  key={suivi.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="bg-[#1a0b2e] border-white/10 hover:border-teal-500/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getTypeCriseIcon(suivi.type_crise)}</span>
                          <div>
                            <CardTitle className="text-white text-lg">
                              {TYPES_CRISE.find(t => t.value === suivi.type_crise)?.label || suivi.type_crise}
                            </CardTitle>
                            <p className="text-xs text-gray-400 mt-1">
                              Créé le {new Date(suivi.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        {getStatutBadge(suivi.statut)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-300 text-sm line-clamp-2">
                        {suivi.description}
                      </p>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <AlertCircle size={16} className="text-red-400" />
                          <span className="text-gray-400">Gravité:</span>
                          <span className="font-bold text-white">{suivi.gravite}/10</span>
                        </div>
                        {suivi.date_prochaine_action && (
                          <div className="flex items-center gap-1">
                            <Calendar size={16} className="text-teal-400" />
                            <span className="text-gray-400">
                              {new Date(suivi.date_prochaine_action).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        )}
                      </div>

                      {suivi.prochaine_action && (
                        <div className="bg-black/20 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Prochaine action:</p>
                          <p className="text-sm text-white">{suivi.prochaine_action}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(suivi)}
                          className="flex-1 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                        >
                          <Edit size={16} className="mr-2" />
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/suivi-post-crise/${suivi.id}`)}
                          className="flex-1 text-gray-400 hover:text-white hover:bg-white/10"
                        >
                          Détails
                          <ChevronRight size={16} className="ml-2" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(suivi.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuiviPostCrise;
