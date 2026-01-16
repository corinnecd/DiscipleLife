-- ============================================
-- Migration: Identifier et corriger les superviseurs sans famille
-- Objectif: Trouver les superviseurs qui n'ont pas de famille assignée
-- ============================================

-- 1. Identifier les superviseurs sans famille
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.identifiant_unique,
    p.pasteur_id,
    (SELECT identifiant_unique FROM profils WHERE id = p.pasteur_id) as pasteur_identifiant
FROM profils p
WHERE p.role = 'superviseur'
  AND NOT EXISTS (
    SELECT 1 
    FROM familles_disciples f 
    WHERE f.superviseur_id = p.id
  )
ORDER BY p.first_name, p.last_name;

-- 2. Vérifier le nombre total de superviseurs et de familles
SELECT 
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') as total_superviseurs,
    (SELECT COUNT(DISTINCT superviseur_id) FROM familles_disciples WHERE superviseur_id IS NOT NULL) as total_familles_avec_superviseur,
    (SELECT COUNT(*) FROM familles_disciples) as total_familles;

-- 3. Afficher tous les superviseurs avec leur famille (ou NULL si pas de famille)
SELECT 
    p.id as superviseur_id,
    p.first_name || ' ' || p.last_name as superviseur_nom,
    p.identifiant_unique as superviseur_identifiant,
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
ORDER BY p.first_name, p.last_name;
