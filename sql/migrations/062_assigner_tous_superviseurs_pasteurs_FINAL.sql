-- Migration: Assigner tous les superviseurs à leur pasteur de tutelle
-- Date: 2024
-- Objectif: Assigner les superviseurs selon la répartition officielle fournie

-- ============================================
-- RÉPARTITION OFFICIELLE DES SUPERVISEURS
-- ============================================

-- ============================================
-- DR MODE (PASTEUR-001)
-- ============================================
UPDATE profils
SET pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
WHERE role = 'superviseur'
  AND (
    (LOWER(first_name) LIKE '%betsaleel%' AND LOWER(last_name) LIKE '%badila%') OR
    (LOWER(first_name) LIKE '%coco%' AND LOWER(last_name) LIKE '%okanzi%') OR
    (LOWER(first_name) LIKE '%elisabeth%' AND LOWER(last_name) LIKE '%amecy%') OR
    (LOWER(first_name) LIKE '%ephrem%' AND LOWER(last_name) LIKE '%mba%') OR
    ((LOWER(first_name) LIKE '%helene%' OR LOWER(first_name) LIKE '%hélène%') AND LOWER(last_name) LIKE '%lamago%') OR
    (LOWER(first_name) LIKE '%karine%' AND LOWER(last_name) LIKE '%william%') OR
    ((LOWER(first_name) LIKE '%kevin%' OR LOWER(first_name) LIKE '%kévin%') AND (LOWER(last_name) LIKE '%thea%' OR LOWER(last_name) LIKE '%théa%')) OR
    (LOWER(first_name) LIKE '%laetitia%' AND LOWER(last_name) LIKE '%obame%') OR
    (LOWER(first_name) LIKE '%manicia%' AND (LOWER(last_name) LIKE '%thea%' OR LOWER(last_name) LIKE '%théa%')) OR
    ((LOWER(first_name) LIKE '%nasdene%' OR LOWER(first_name) LIKE '%nasdène%') AND LOWER(last_name) LIKE '%kodia%') OR
    (LOWER(first_name) LIKE '%rochelle%' AND LOWER(last_name) LIKE '%passi%') OR
    (LOWER(first_name) LIKE '%yvan%' AND LOWER(last_name) LIKE '%dessande%')
  );

-- ============================================
-- PS JULIANA (PASTEUR-002)
-- ============================================
UPDATE profils
SET pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur' LIMIT 1)
WHERE role = 'superviseur'
  AND (
    ((LOWER(first_name) LIKE '%beraca%' OR LOWER(first_name) LIKE '%béraca%') AND LOWER(last_name) LIKE '%kazongo%') OR
    (LOWER(first_name) LIKE '%cynthia%' AND LOWER(last_name) LIKE '%alloh%') OR
    (LOWER(first_name) LIKE '%jocelyne%' AND LOWER(last_name) LIKE '%fortune%') OR
    (LOWER(first_name) LIKE '%patrick%' AND (LOWER(last_name) LIKE '%batsiaga%' OR LOWER(last_name) LIKE '%batsiaka%')) OR
    (LOWER(first_name) LIKE '%snella%' AND LOWER(last_name) LIKE '%moussio%')
  );

-- ============================================
-- PS PEGGY NN (PASTEUR-003)
-- ============================================
UPDATE profils
SET pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
WHERE role = 'superviseur'
  AND (
    (LOWER(first_name) LIKE '%alain%' AND LOWER(last_name) LIKE '%sil%') OR
    (LOWER(first_name) LIKE '%carine%' AND LOWER(last_name) LIKE '%matondo%') OR
    (LOWER(first_name) LIKE '%gervais%' AND LOWER(last_name) LIKE '%nkatouloulou%') OR
    (LOWER(first_name) LIKE '%laetitia%' AND LOWER(last_name) LIKE '%missatou%')
  );

-- ============================================
-- PS JESSY (PASTEUR-004)
-- ============================================
UPDATE profils
SET pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1)
WHERE role = 'superviseur'
  AND (
    ((LOWER(first_name) LIKE '%andrea%' OR LOWER(first_name) LIKE '%andréa%') AND LOWER(last_name) LIKE '%ernest%') OR
    (LOWER(first_name) LIKE '%david%' AND LOWER(last_name) LIKE '%serva%') OR
    (LOWER(first_name) LIKE '%nancy%' AND LOWER(last_name) LIKE '%nzi%') OR
    ((LOWER(first_name) LIKE '%prospere%' OR LOWER(first_name) LIKE '%prosper%') AND LOWER(last_name) LIKE '%leba%') OR
    (LOWER(first_name) LIKE '%serge%' AND LOWER(last_name) LIKE '%amany%')
  );

-- ============================================
-- VÉRIFICATION ET RAPPORT FINAL
-- ============================================

-- Afficher la répartition finale par pasteur
SELECT 
  p.identifiant_unique AS pasteur_identifiant,
  p.first_name || ' ' || p.last_name AS pasteur_nom_complet,
  COUNT(s.id) AS nombre_superviseurs,
  STRING_AGG(s.first_name || ' ' || s.last_name, ', ' ORDER BY s.first_name) AS liste_superviseurs
FROM profils p
LEFT JOIN profils s ON s.pasteur_id = p.id AND s.role = 'superviseur'
WHERE p.role = 'pasteur'
GROUP BY p.id, p.identifiant_unique, p.first_name, p.last_name
ORDER BY p.identifiant_unique;

-- Afficher les superviseurs sans pasteur assigné (s'il y en a)
SELECT 
  id,
  first_name,
  last_name,
  email,
  identifiant_unique,
  pasteur_id
FROM profils
WHERE role = 'superviseur'
  AND pasteur_id IS NULL
ORDER BY email;

-- Afficher tous les superviseurs avec leur pasteur assigné (détaillé)
SELECT 
  s.first_name || ' ' || s.last_name AS superviseur,
  s.email AS superviseur_email,
  p.identifiant_unique AS pasteur_identifiant,
  p.first_name || ' ' || p.last_name AS pasteur_nom
FROM profils s
LEFT JOIN profils p ON s.pasteur_id = p.id
WHERE s.role = 'superviseur'
ORDER BY p.identifiant_unique, s.first_name;
