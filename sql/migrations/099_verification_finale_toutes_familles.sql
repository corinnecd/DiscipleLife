-- ============================================
-- Migration: Vérification finale de toutes les familles
-- Objectif: Confirmer que tous les pasteurs ont le bon nombre de familles
-- Date: 2025-01-XX
-- ============================================

-- 1. Résumé global par pasteur
SELECT 
    '=== RÉSUMÉ GLOBAL PAR PASTEUR ===' AS info;

SELECT 
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(DISTINCT s.id) AS nb_superviseurs,
    COUNT(DISTINCT f.id) AS nb_familles,
    CASE pasteur.identifiant_unique
        WHEN 'PASTEUR-001' THEN 12
        WHEN 'PASTEUR-002' THEN 5
        WHEN 'PASTEUR-003' THEN 4
        WHEN 'PASTEUR-004' THEN 5
        ELSE 0
    END AS nb_familles_attendu,
    CASE 
        WHEN COUNT(DISTINCT f.id) = CASE pasteur.identifiant_unique
            WHEN 'PASTEUR-001' THEN 12
            WHEN 'PASTEUR-002' THEN 5
            WHEN 'PASTEUR-003' THEN 4
            WHEN 'PASTEUR-004' THEN 5
            ELSE 0
        END THEN '✅ CORRECT'
        ELSE '⚠️  MANQUANT'
    END AS statut
FROM profils pasteur
LEFT JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
LEFT JOIN familles_disciples f ON f.pasteur_id = pasteur.id
WHERE pasteur.role = 'pasteur' AND pasteur.identifiant_unique LIKE 'PASTEUR-%'
GROUP BY pasteur.id, pasteur.identifiant_unique, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.identifiant_unique;

-- 2. Détail des familles de DR MODE (PASTEUR-001)
SELECT 
    '=== DÉTAIL DES FAMILLES DE DR MODE (PASTEUR-001) ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS famille_nom,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    s.email AS superviseur_email,
    CASE 
        WHEN f.superviseur_id IS NOT NULL AND f.pasteur_id IS NOT NULL THEN '✅ COMPLÈTE'
        WHEN f.superviseur_id IS NULL THEN '⚠️  SANS SUPERVISEUR'
        WHEN f.pasteur_id IS NULL THEN '⚠️  SANS PASTEUR'
        ELSE '⚠️  INCOMPLÈTE'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
ORDER BY f.identifiant_famille;

-- 3. Détail des familles de PS PEGGY NN (PASTEUR-003)
SELECT 
    '=== DÉTAIL DES FAMILLES DE PS PEGGY NN (PASTEUR-003) ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS famille_nom,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    s.email AS superviseur_email,
    CASE 
        WHEN f.superviseur_id IS NOT NULL AND f.pasteur_id IS NOT NULL THEN '✅ COMPLÈTE'
        WHEN f.superviseur_id IS NULL THEN '⚠️  SANS SUPERVISEUR'
        WHEN f.pasteur_id IS NULL THEN '⚠️  SANS PASTEUR'
        ELSE '⚠️  INCOMPLÈTE'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
ORDER BY f.identifiant_famille;

-- 4. Vérification des deux Laetitia
SELECT 
    '=== VÉRIFICATION DES DEUX LAETITIA ===' AS info;

SELECT 
    p.first_name || ' ' || p.last_name AS superviseur_nom,
    p.email AS superviseur_email,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    f.nom AS famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN LOWER(TRIM(p.last_name)) = 'obame' 
            AND pasteur.identifiant_unique = 'PASTEUR-001' 
            AND f.nom = 'LES RACHETÉS' 
        THEN '✅ CORRECT (LAËTITIA OBAME - DR MODE - LES RACHETÉS)'
        WHEN LOWER(TRIM(p.last_name)) = 'missatou' 
            AND pasteur.identifiant_unique = 'PASTEUR-003' 
            AND f.nom = 'LES VICTORIEUX' 
        THEN '✅ CORRECT (LAETITIA MISSATOU - PS PEGGY NN - LES VICTORIEUX)'
        WHEN LOWER(TRIM(p.last_name)) = 'obame' 
            AND pasteur.identifiant_unique != 'PASTEUR-001' 
        THEN '❌ ERREUR: LAËTITIA OBAME devrait être sous DR MODE'
        WHEN LOWER(TRIM(p.last_name)) = 'missatou' 
            AND pasteur.identifiant_unique != 'PASTEUR-003' 
        THEN '❌ ERREUR: LAETITIA MISSATOU devrait être sous PS PEGGY NN'
        WHEN f.id IS NULL THEN '⚠️  PAS DE FAMILLE'
        ELSE '⚠️  À VÉRIFIER'
    END AS statut
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND LOWER(TRIM(p.first_name)) LIKE '%laetitia%'
ORDER BY p.last_name;

-- 5. Superviseurs sans famille
SELECT 
    '=== SUPERVISEURS SANS FAMILLE ===' AS info;

SELECT 
    p.id,
    p.first_name || ' ' || p.last_name AS superviseur_nom,
    p.email AS superviseur_email,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    '❌ PAS DE FAMILLE' AS statut
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND f.id IS NULL
ORDER BY pasteur.identifiant_unique, p.first_name, p.last_name;

-- 6. Familles sans superviseur
SELECT 
    '=== FAMILLES SANS SUPERVISEUR ===' AS info;

SELECT 
    f.id,
    f.nom AS famille_nom,
    f.identifiant_famille,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    '⚠️  SANS SUPERVISEUR' AS statut
FROM familles_disciples f
LEFT JOIN profils pasteur ON pasteur.id = f.pasteur_id
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.superviseur_id IS NULL
ORDER BY pasteur.identifiant_unique, f.identifiant_famille;

-- 7. Résumé final
SELECT 
    '=== RÉSUMÉ FINAL ===' AS info;

SELECT 
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') AS total_superviseurs,
    (SELECT COUNT(*) FROM familles_disciples) AS total_familles,
    (SELECT COUNT(*) FROM profils p JOIN familles_disciples f ON f.superviseur_id = p.id WHERE p.role = 'superviseur') AS superviseurs_avec_famille,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND famille_id IS NOT NULL) AS superviseurs_avec_famille_id,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND NOT EXISTS (SELECT 1 FROM familles_disciples WHERE superviseur_id = profils.id)) AS superviseurs_sans_famille,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NULL) AS familles_sans_superviseur,
    CASE 
        WHEN (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') = 26
            AND (SELECT COUNT(*) FROM familles_disciples) = 26
            AND (SELECT COUNT(*) FROM profils p JOIN familles_disciples f ON f.superviseur_id = p.id WHERE p.role = 'superviseur') = 26
            AND (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND famille_id IS NOT NULL) = 26
        THEN '✅ TOUT EST CORRECT (26 superviseurs, 26 familles)'
        ELSE '⚠️  PROBLÈME DÉTECTÉ'
    END AS statut_final;
