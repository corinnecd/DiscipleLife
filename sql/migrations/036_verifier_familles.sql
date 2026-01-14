-- ============================================
-- Script de vérification des 26 familles
-- Objectif: Vérifier que toutes les familles sont créées
-- ============================================

-- 1. Compter le nombre total de familles
SELECT 
  COUNT(*) as nombre_total_familles,
  COUNT(CASE WHEN statut = 'actif' THEN 1 END) as familles_actives,
  COUNT(CASE WHEN statut = 'inactif' THEN 1 END) as familles_inactives,
  COUNT(CASE WHEN superviseur_id IS NULL THEN 1 END) as familles_sans_superviseur,
  COUNT(CASE WHEN superviseur_id IS NOT NULL THEN 1 END) as familles_avec_superviseur
FROM familles_disciples;

-- 2. Lister toutes les familles avec leurs détails
SELECT 
  identifiant_famille,
  nom,
  CASE 
    WHEN superviseur_id IS NULL THEN '❌ SANS SUPERVISEUR'
    ELSE '✅ AVEC SUPERVISEUR'
  END as statut_superviseur,
  superviseur_id,
  objectif_disciples,
  nombre_disciples_actuels,
  statut,
  created_at
FROM familles_disciples
ORDER BY identifiant_famille;

-- 3. Détails des familles avec leurs superviseurs (si assignés)
SELECT 
  f.identifiant_famille,
  f.nom as nom_famille,
  f.objectif_disciples,
  f.nombre_disciples_actuels,
  f.statut,
  CASE 
    WHEN f.superviseur_id IS NULL THEN 'Non assigné'
    ELSE CONCAT(p.first_name, ' ', p.last_name)
  END as nom_superviseur,
  CASE 
    WHEN f.superviseur_id IS NULL THEN NULL
    ELSE p.email
  END as email_superviseur,
  CASE 
    WHEN f.superviseur_id IS NULL THEN NULL
    ELSE p.role
  END as role_superviseur
FROM familles_disciples f
LEFT JOIN profils p ON f.superviseur_id = p.id
ORDER BY f.identifiant_famille;

-- 4. Liste des familles SANS superviseur (à assigner)
SELECT 
  identifiant_famille,
  nom,
  'Nécessite un superviseur' as action_requise
FROM familles_disciples
WHERE superviseur_id IS NULL
ORDER BY identifiant_famille;

-- 5. Vérification des identifiants uniques
SELECT 
  identifiant_famille,
  COUNT(*) as nombre_occurrences
FROM familles_disciples
GROUP BY identifiant_famille
HAVING COUNT(*) > 1;
-- Si cette requête retourne des lignes, il y a des doublons !

