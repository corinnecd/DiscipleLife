-- ============================================
-- Migration 106 : Vérifier que tous les superviseurs sont affectés à un pasteur
-- Objectif : Lister les superviseurs sans pasteur_id, puis les corriger (famille ou 1er pasteur)
-- ============================================

-- 1. VÉRIFICATION : Superviseurs sans pasteur_id
SELECT
  'SUPERVISEURS SANS PASTEUR' AS type,
  p.id AS superviseur_id,
  p.first_name,
  p.last_name,
  p.email,
  p.identifiant_unique,
  f.id AS famille_id,
  f.nom AS famille_nom,
  f.pasteur_id AS famille_pasteur_id
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND p.pasteur_id IS NULL
ORDER BY p.first_name, p.last_name;

-- 2. CORRECTION : Affecter pasteur_id depuis la famille si la famille a un pasteur
UPDATE profils
SET pasteur_id = (
  SELECT f.pasteur_id
  FROM familles_disciples f
  WHERE f.superviseur_id = profils.id
    AND f.pasteur_id IS NOT NULL
  LIMIT 1
),
updated_at = NOW()
WHERE role = 'superviseur'
  AND pasteur_id IS NULL
  AND EXISTS (
    SELECT 1 FROM familles_disciples f
    WHERE f.superviseur_id = profils.id AND f.pasteur_id IS NOT NULL
  );

-- 3. CORRECTION : Pour les superviseurs encore sans pasteur (famille sans pasteur ou pas de famille), affecter au premier pasteur
UPDATE profils
SET pasteur_id = (
  SELECT id FROM profils
  WHERE role = 'pasteur'
  ORDER BY identifiant_unique NULLS LAST, created_at
  LIMIT 1
),
updated_at = NOW()
WHERE role = 'superviseur'
  AND pasteur_id IS NULL
  AND EXISTS (SELECT 1 FROM profils WHERE role = 'pasteur' LIMIT 1);

-- 4. VÉRIFICATION FINALE : Résumé
SELECT
  (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') AS total_superviseurs,
  (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND pasteur_id IS NOT NULL) AS superviseurs_avec_pasteur,
  (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND pasteur_id IS NULL) AS superviseurs_sans_pasteur;

-- 5. Liste finale : tous les superviseurs avec leur pasteur (pour contrôle)
SELECT
  p.id AS superviseur_id,
  p.first_name || ' ' || p.last_name AS superviseur_nom,
  p.email,
  pasteur.id AS pasteur_id,
  pasteur.identifiant_unique AS pasteur_identifiant,
  pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id AND pasteur.role = 'pasteur'
WHERE p.role = 'superviseur'
ORDER BY pasteur.identifiant_unique NULLS LAST, p.first_name, p.last_name;
