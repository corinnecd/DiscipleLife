import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Cache en mémoire pour les données fréquemment utilisées
 */
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook personnalisé pour charger et mettre en cache des données avec recherche
 * @param {string} table - Nom de la table Supabase
 * @param {Object} options - Options de configuration
 * @returns {Object} - { data, loading, error, search, refetch }
 */
export const useCachedData = (table, options = {}) => {
  const {
    select = '*',
    orderBy = null,
    filters = {},
    searchFields = [],
    cacheKey = null,
    cacheDuration = CACHE_DURATION,
    enabled = true
  } = options;

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const abortControllerRef = useRef(null);

  const cacheKeyFinal = cacheKey || `${table}_${JSON.stringify({ select, orderBy, filters })}`;

  /**
   * Récupère les données depuis le cache ou la base de données
   */
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      setLoading(true);
      setError(null);

      // Vérifier le cache
      if (!forceRefresh && cache.has(cacheKeyFinal)) {
        const cached = cache.get(cacheKeyFinal);
        const now = Date.now();
        
        if (now - cached.timestamp < cacheDuration) {
          setData(cached.data);
          setFilteredData(cached.data);
          setLoading(false);
          return;
        }
      }

      // Créer un nouveau AbortController pour cette requête
      abortControllerRef.current = new AbortController();

      // Construire la requête Supabase
      let query = supabase.from(table).select(select);

      // Appliquer les filtres
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });

      // Appliquer le tri
      if (orderBy) {
        if (typeof orderBy === 'string') {
          query = query.order(orderBy);
        } else if (Array.isArray(orderBy)) {
          orderBy.forEach(({ column, ascending = true }) => {
            query = query.order(column, { ascending });
          });
        } else {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }
      }

      const { data: fetchedData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Mettre en cache les données
      cache.set(cacheKeyFinal, {
        data: fetchedData || [],
        timestamp: Date.now()
      });

      setData(fetchedData || []);
      setFilteredData(fetchedData || []);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(`Erreur lors du chargement de ${table}:`, err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [table, select, orderBy, filters, cacheKeyFinal, cacheDuration, enabled]);

  /**
   * Recherche dans les données
   */
  const search = useCallback((term) => {
    setSearchTerm(term);

    if (!term || !searchFields.length) {
      setFilteredData(data);
      return;
    }

    const lowerTerm = term.toLowerCase();
    const filtered = data.filter(item => {
      return searchFields.some(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], item);
        return value && String(value).toLowerCase().includes(lowerTerm);
      });
    });

    setFilteredData(filtered);
  }, [data, searchFields]);

  /**
   * Force le rechargement des données
   */
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  /**
   * Invalide le cache pour cette clé
   */
  const invalidateCache = useCallback(() => {
    cache.delete(cacheKeyFinal);
  }, [cacheKeyFinal]);

  // Charger les données au montage et quand les dépendances changent
  useEffect(() => {
    fetchData();

    // Nettoyer l'AbortController au démontage
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data: filteredData,
    allData: data,
    loading,
    error,
    search,
    searchTerm,
    refetch,
    invalidateCache
  };
};

/**
 * Hook spécialisé pour charger les familles avec recherche
 */
export const useFamilles = (options = {}) => {
  return useCachedData('familles_disciples', {
    select: 'id, nom, identifiant_famille',
    orderBy: 'nom',
    searchFields: ['nom', 'identifiant_famille'],
    cacheKey: 'familles_list',
    ...options
  });
};

/**
 * Hook spécialisé pour charger les mentors/superviseurs avec recherche
 */
export const useMentors = (options = {}) => {
  return useCachedData('profils', {
    select: 'id, first_name, last_name, role, email',
    filters: { role: ['mentor', 'superviseur'] },
    orderBy: 'last_name',
    searchFields: ['first_name', 'last_name', 'email'],
    cacheKey: 'mentors_list',
    ...options
  });
};

/**
 * Hook spécialisé pour charger les parcours de transformation
 */
export const useParcours = (options = {}) => {
  return useCachedData('parcours_transformation', {
    select: 'id, nom, description, thematique, niveau, statut',
    filters: { statut: 'publie' },
    orderBy: 'ordre_affichage',
    searchFields: ['nom', 'description', 'thematique'],
    cacheKey: 'parcours_list',
    ...options
  });
};

/**
 * Fonction utilitaire pour vider tout le cache
 */
export const clearAllCache = () => {
  cache.clear();
};

/**
 * Fonction utilitaire pour vider le cache d'une clé spécifique
 */
export const clearCache = (key) => {
  cache.delete(key);
};

/**
 * Exemple d'utilisation :
 * 
 * // Utilisation basique
 * const { data: familles, loading, search } = useFamilles();
 * 
 * // Avec recherche
 * <Input 
 *   placeholder="Rechercher une famille..."
 *   onChange={(e) => search(e.target.value)}
 * />
 * 
 * // Avec options personnalisées
 * const { data: mentors, refetch } = useMentors({
 *   filters: { famille_id: selectedFamilleId },
 *   enabled: !!selectedFamilleId
 * });
 */

export default useCachedData;
