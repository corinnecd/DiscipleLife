-- Migration: Assigner tous les superviseurs à leur pasteur de tutelle
-- Date: 2024
-- Objectif: Répartir les 26 superviseurs entre les 4 pasteurs

-- ============================================
-- ÉTAPE 1: Assignations spécifiques (à personnaliser selon vos besoins)
-- ============================================

-- Alain SIL -> PASTEUR-002 (déjà fait dans migration 061, mais on le réassigne ici pour être sûr)
UPDATE profils
SET pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur' LIMIT 1)
WHERE role = 'superviseur'
  AND LOWER(first_name) LIKE '%alain%'
  AND LOWER(last_name) LIKE '%sil%';

-- COCO OKANZI -> PASTEUR-001 (selon migration 056)
UPDATE profils
SET pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
WHERE role = 'superviseur'
  AND LOWER(first_name) LIKE '%coco%'
  AND LOWER(last_name) LIKE '%okanzi%';

-- ============================================
-- ÉTAPE 2: Répartition équitable des superviseurs restants
-- ============================================
-- Répartition: ~6-7 superviseurs par pasteur
-- Les superviseurs sont assignés en fonction de leur identifiant_famille ou email

-- Assigner les superviseurs à PASTEUR-001 (environ 7 superviseurs)
UPDATE profils
SET pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
WHERE role = 'superviseur'
  AND pasteur_id IS NULL
  AND (
    LOWER(email) LIKE '%fam001%' OR
    LOWER(email) LIKE '%fam002%' OR
    LOWER(email) LIKE '%fam003%' OR
    LOWER(email) LIKE '%fam004%' OR
    LOWER(email) LIKE '%fam005%' OR
    LOWER(email) LIKE '%fam006%' OR
    LOWER(email) LIKE '%fam007%' OR
    -- Ou par nom si nécessaire
    LOWER(first_name) LIKE '%betsaleel%' OR
    LOWER(first_name) LIKE '%carine%' OR
    LOWER(first_name) LIKE '%cynthia%'
  );

-- Assigner les superviseurs à PASTEUR-002 (environ 7 superviseurs)
UPDATE profils
SET pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur' LIMIT 1)
WHERE role = 'superviseur'
  AND pasteur_id IS NULL
  AND (
    LOWER(email) LIKE '%fam008%' OR
    LOWER(email) LIKE '%fam009%' OR
    LOWER(email) LIKE '%fam010%' OR
    LOWER(email) LIKE '%fam011%' OR
    LOWER(email) LIKE '%fam012%' OR
    LOWER(email) LIKE '%fam013%' OR
    LOWER(email) LIKE '%fam014%' OR
    -- Ou par nom si nécessaire
    LOWER(first_name) LIKE '%elisabeth%' OR
    LOWER(first_name) LIKE '%ephrem%' OR
    LOWER(first_name) LIKE '%gervais%'
  );

-- Assigner les superviseurs à PASTEUR-003 (environ 6 superviseurs)
UPDATE profils
SET pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
WHERE role = 'superviseur'
  AND pasteur_id IS NULL
  AND (
    LOWER(email) LIKE '%fam015%' OR
    LOWER(email) LIKE '%fam016%' OR
    LOWER(email) LIKE '%fam017%' OR
    LOWER(email) LIKE '%fam018%' OR
    LOWER(email) LIKE '%fam019%' OR
    LOWER(email) LIKE '%fam020%' OR
    -- Ou par nom si nécessaire
    LOWER(first_name) LIKE '%helene%' OR
    LOWER(first_name) LIKE '%jocelyne%' OR
    LOWER(first_name) LIKE '%karine%' OR
    LOWER(first_name) LIKE '%kevin%' OR
    LOWER(first_name) LIKE '%laetitia%'
  );

-- Assigner les superviseurs restants à PASTEUR-004 (environ 6 superviseurs)
UPDATE profils
SET pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1)
WHERE role = 'superviseur'
  AND pasteur_id IS NULL;

-- ============================================
-- ÉTAPE 3: Vérification et rapport
-- ============================================

-- Afficher la répartition finale
SELECT 
  p.identifiant_unique AS pasteur_identifiant,
  p.first_name AS pasteur_prenom,
  p.last_name AS pasteur_nom,
  COUNT(s.id) AS nombre_superviseurs,
  STRING_AGG(s.first_name || ' ' || s.last_name, ', ' ORDER BY s.first_name) AS superviseurs
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
  AND pasteur_id IS NULL;
