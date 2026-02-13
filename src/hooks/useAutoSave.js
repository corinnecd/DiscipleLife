import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook personnalisé pour la sauvegarde automatique des données de formulaire
 * Utilise le debouncing pour éviter trop d'écritures
 * @param {Object} data - Les données à sauvegarder
 * @param {string} key - La clé localStorage pour la sauvegarde
 * @param {number} delay - Délai de debounce en ms (défaut: 1000ms)
 * @returns {Object} - Fonctions de gestion de la sauvegarde
 */
export const useAutoSave = (data, key, delay = 1000) => {
  const timeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  const isSavingRef = useRef(false);

  /**
   * Sauvegarder les données dans localStorage
   */
  const save = useCallback(() => {
    try {
      const dataToSave = {
        ...data,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(dataToSave));
      lastSavedRef.current = new Date();
      isSavingRef.current = false;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde automatique:', error);
      isSavingRef.current = false;
    }
  }, [data, key]);

  /**
   * Charger les données depuis localStorage
   */
  const load = useCallback(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Retourner les données sans le timestamp
        const { savedAt, ...dataOnly } = parsed;
        return { data: dataOnly, savedAt };
      }
      return { data: null, savedAt: null };
    } catch (error) {
      console.error('Erreur lors du chargement des données sauvegardées:', error);
      return { data: null, savedAt: null };
    }
  }, [key]);

  /**
   * Supprimer les données sauvegardées
   */
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
      lastSavedRef.current = null;
    } catch (error) {
      console.error('Erreur lors de la suppression des données sauvegardées:', error);
    }
  }, [key]);

  /**
   * Vérifier si des données sont sauvegardées
   */
  const hasSavedData = useCallback(() => {
    return localStorage.getItem(key) !== null;
  }, [key]);

  /**
   * Obtenir le temps écoulé depuis la dernière sauvegarde
   */
  const getTimeSinceLastSave = useCallback(() => {
    if (!lastSavedRef.current) return null;
    return Math.floor((new Date() - lastSavedRef.current) / 1000); // En secondes
  }, []);

  // Effet pour la sauvegarde automatique avec debounce
  useEffect(() => {
    // Ne rien faire si les données sont vides
    if (!data || Object.keys(data).length === 0) {
      return;
    }

    // Annuler le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Marquer comme en cours de sauvegarde
    isSavingRef.current = true;

    // Créer un nouveau timeout
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    // Nettoyage
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, save]);

  return {
    save,
    load,
    clear,
    hasSavedData,
    getTimeSinceLastSave,
    lastSaved: lastSavedRef.current,
    isSaving: isSavingRef.current
  };
};

export default useAutoSave;
