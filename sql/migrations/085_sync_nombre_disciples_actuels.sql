-- ============================================
-- Migration 085 : Synchroniser nombre_disciples_actuels avec le vrai décompte
--
-- Met à jour familles_disciples.nombre_disciples_actuels à partir du nombre
-- réel de profils (famille_id) pour chaque famille. À exécuter après 084
-- si l’affichage utilisait encore l’ancienne colonne (ex. 53 partout).
-- ============================================

UPDATE familles_disciples f
SET nombre_disciples_actuels = COALESCE(
  (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id),
  0
);
