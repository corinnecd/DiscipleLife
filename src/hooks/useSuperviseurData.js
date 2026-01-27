/**
 * Hook useSuperviseurData – Regroupe les requêtes "phase 1" du dashboard superviseur
 * (famille + superviseur + pasteur) pour limiter les appels et centraliser la logique.
 * Une vue SQL agrégée ou un RPC pourra remplacer ces appels plus tard.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getOrSetCache } from '@/lib/CacheUtils';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Récupère en parallèle famille + superviseur + pasteur (phase 1).
 * Utilisable depuis fetchSuperviseurData pour regrouper les requêtes sans changer le state.
 * @param {string} userId
 * @returns {Promise<{ famille: object|null, superviseur: object|null, pasteur: object|null }>}
 */
export async function fetchSuperviseurPhase1(userId) {
  if (!userId) return { famille: null, superviseur: null, pasteur: null };
  const cacheKeyBase = `superviseur_${userId}`;
  const [famille, superviseur] = await Promise.all([
    getOrSetCache(
      `${cacheKeyBase}_famille`,
      async () => {
        const { data, error } = await supabase
          .from('familles_disciples')
          .select('*')
          .eq('superviseur_id', userId)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      CACHE_TTL_MS
    ),
    getOrSetCache(
      `${cacheKeyBase}_superviseur`,
      async () => {
        const { data, error } = await supabase
          .from('profils')
          .select('first_name, last_name, pasteur_id, titre')
          .eq('id', userId)
          .single();
        if (error) throw error;
        return data;
      },
      CACHE_TTL_MS
    )
  ]);
  let pasteur = null;
  if (superviseur?.pasteur_id) {
    const { data, error } = await supabase
      .from('profils')
      .select('id, first_name, last_name, identifiant_unique, avatar_url')
      .eq('id', superviseur.pasteur_id)
      .single();
    if (!error && data) pasteur = data;
  }
  return { famille: famille ?? null, superviseur: superviseur ?? null, pasteur };
}

export function useSuperviseurData(userId) {
  const [famille, setFamille] = useState(null);
  const [superviseur, setSuperviseur] = useState(null);
  const [pasteur, setPasteur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchInProgressRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!userId) {
      setFamille(null);
      setSuperviseur(null);
      setPasteur(null);
      setLoading(false);
      return;
    }
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { famille: f, superviseur: s, pasteur: p } = await fetchSuperviseurPhase1(userId);
      setFamille(f);
      setSuperviseur(s);
      setPasteur(p);
    } catch (err) {
      setError(err);
      setFamille(null);
      setSuperviseur(null);
      setPasteur(null);
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    famille,
    setFamille,
    superviseur,
    pasteur,
    setPasteur,
    loading,
    error,
    refetch
  };
}

export default useSuperviseurData;
