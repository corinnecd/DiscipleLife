import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook personnalisé pour gérer les rappels de suivi post-crise
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} - { rappels, loading, error, markAsRead, refreshRappels }
 */
export const useSuiviRappels = (userId) => {
  const [rappels, setRappels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRappels = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Récupérer les suivis actifs avec rappels activés
      const { data, error: fetchError } = await supabase
        .from('suivi_post_crise')
        .select('*')
        .eq('user_id', userId)
        .eq('rappel_actif', true)
        .in('statut', ['actif', 'en_amelioration'])
        .order('prochain_rappel', { ascending: true });

      if (fetchError) throw fetchError;

      // Filtrer les suivis dont le prochain rappel est proche (dans les 24h) ou dépassé
      const now = new Date();
      const rappelsActifs = (data || []).filter(suivi => {
        if (!suivi.prochain_rappel) return true; // Pas de rappel défini = à traiter
        const prochainRappel = new Date(suivi.prochain_rappel);
        const diffHeures = (prochainRappel - now) / (1000 * 60 * 60);
        return diffHeures <= 24; // Rappels dans les 24h ou dépassés
      });

      setRappels(rappelsActifs);
    } catch (err) {
      console.error('Erreur lors du chargement des rappels:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRappels();

    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(fetchRappels, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  /**
   * Marquer un rappel comme traité en mettant à jour le prochain rappel
   */
  const markAsRead = async (suiviId) => {
    try {
      // Récupérer le suivi pour connaître la fréquence
      const { data: suivi, error: fetchError } = await supabase
        .from('suivi_post_crise')
        .select('frequence_rappels')
        .eq('id', suiviId)
        .single();

      if (fetchError) throw fetchError;

      // Calculer le prochain rappel selon la fréquence
      const now = new Date();
      let prochainRappel = new Date(now);

      switch (suivi.frequence_rappels) {
        case 'quotidien':
          prochainRappel.setDate(prochainRappel.getDate() + 1);
          break;
        case 'hebdomadaire':
          prochainRappel.setDate(prochainRappel.getDate() + 7);
          break;
        case 'bihebdomadaire':
          prochainRappel.setDate(prochainRappel.getDate() + 14);
          break;
        case 'mensuel':
          prochainRappel.setMonth(prochainRappel.getMonth() + 1);
          break;
        default:
          prochainRappel.setDate(prochainRappel.getDate() + 7);
      }

      // Mettre à jour le suivi
      const { error: updateError } = await supabase
        .from('suivi_post_crise')
        .update({
          dernier_rappel_envoye: now.toISOString(),
          prochain_rappel: prochainRappel.toISOString()
        })
        .eq('id', suiviId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Rafraîchir la liste des rappels
      await fetchRappels();

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du rappel:', err);
      return false;
    }
  };

  /**
   * Rafraîchir manuellement les rappels
   */
  const refreshRappels = () => {
    fetchRappels();
  };

  return {
    rappels,
    loading,
    error,
    markAsRead,
    refreshRappels,
    count: rappels.length
  };
};

export default useSuiviRappels;
