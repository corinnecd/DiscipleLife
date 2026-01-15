-- ============================================
-- Vérification complète: Familles et Pasteurs
-- Objectif: 
-- 1. Vérifier que toutes les familles sont liées aux bons pasteurs
-- 2. Vérifier que tous les pasteurs ont le bon nombre de familles
-- ============================================

-- Étape 1: Statistiques globales des familles
SELECT 
    '=== STATISTIQUES GLOBALES DES FAMILLES ===' AS info;

SELECT 
    COUNT(*) AS total_familles,
    COUNT(pasteur_id) AS familles_liees_pasteur,
    COUNT(*) - COUNT(pasteur_id) AS familles_non_liees,
    COUNT(superviseur_id) AS familles_liees_superviseur,
    COUNT(*) - COUNT(superviseur_id) AS familles_non_liees_superviseur,
    CASE 
        WHEN COUNT(pasteur_id) = COUNT(*) AND COUNT(superviseur_id) = COUNT(*) THEN '✅ TOUTES LES FAMILLES SONT LIÉES'
        ELSE '⚠️  CERTAINES FAMILLES NE SONT PAS LIÉES'
    END AS statut
FROM familles_disciples;

-- Étape 2: Familles NON liées à un pasteur (si applicable)
SELECT 
    '=== FAMILLES NON LIÉES À UN PASTEUR ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    s.email AS email_superviseur,
    (SELECT identifiant_unique FROM profils WHERE id = s.pasteur_id) AS pasteur_superviseur,
    CASE 
        WHEN f.superviseur_id IS NULL THEN '❌ PAS DE SUPERVISEUR'
        WHEN f.pasteur_id IS NULL THEN '❌ PAS DE PASTEUR'
        ELSE '❌ PROBLÈME INCONNU'
    END AS probleme
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.pasteur_id IS NULL
ORDER BY f.identifiant_famille;

-- Étape 3: Répartition des familles par pasteur (avec nombres attendus)
SELECT 
    '=== RÉPARTITION DES FAMILLES PAR PASTEUR ===' AS info;

SELECT 
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(f.id) AS nb_familles_actuelles,
    CASE pasteur.identifiant_unique
        WHEN 'PASTEUR-001' THEN 12
        WHEN 'PASTEUR-002' THEN 5
        WHEN 'PASTEUR-003' THEN 4
        WHEN 'PASTEUR-004' THEN 5
        ELSE 0
    END AS nb_familles_attendu,
    CASE 
        WHEN COUNT(f.id) = CASE pasteur.identifiant_unique
            WHEN 'PASTEUR-001' THEN 12
            WHEN 'PASTEUR-002' THEN 5
            WHEN 'PASTEUR-003' THEN 4
            WHEN 'PASTEUR-004' THEN 5
            ELSE 0
        END THEN '✅ CORRECT'
        WHEN COUNT(f.id) < CASE pasteur.identifiant_unique
            WHEN 'PASTEUR-001' THEN 12
            WHEN 'PASTEUR-002' THEN 5
            WHEN 'PASTEUR-003' THEN 4
            WHEN 'PASTEUR-004' THEN 5
            ELSE 0
        END THEN '⚠️  MANQUANT (' || (CASE pasteur.identifiant_unique
            WHEN 'PASTEUR-001' THEN 12
            WHEN 'PASTEUR-002' THEN 5
            WHEN 'PASTEUR-003' THEN 4
            WHEN 'PASTEUR-004' THEN 5
            ELSE 0
        END - COUNT(f.id)) || ' famille(s))'
        ELSE '⚠️  TROP DE FAMILLES'
    END AS statut
FROM profils pasteur
LEFT JOIN familles_disciples f ON f.pasteur_id = pasteur.id
WHERE pasteur.role = 'pasteur' AND pasteur.identifiant_unique LIKE 'PASTEUR-%'
GROUP BY pasteur.id, pasteur.identifiant_unique, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.identifiant_unique;

-- Étape 4: Détail des familles par pasteur
SELECT 
    '=== DÉTAIL DES FAMILLES PAR PASTEUR ===' AS info;

-- PASTEUR-001 (DR MODE) - 12 familles attendues
SELECT 
    'PASTEUR-001 (DR MODE)' AS pasteur,
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    CASE 
        WHEN f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
            THEN '✅ CORRECT'
        ELSE '❌ ERREUR'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
ORDER BY f.identifiant_famille;

-- PASTEUR-002 (PS JULIANA) - 5 familles attendues
SELECT 
    'PASTEUR-002 (PS JULIANA)' AS pasteur,
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    CASE 
        WHEN f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur' LIMIT 1)
            THEN '✅ CORRECT'
        ELSE '❌ ERREUR'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur' LIMIT 1)
ORDER BY f.identifiant_famille;

-- PASTEUR-003 (PS PEGGY NN) - 4 familles attendues
SELECT 
    'PASTEUR-003 (PS PEGGY NN)' AS pasteur,
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    CASE 
        WHEN f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
            THEN '✅ CORRECT'
        ELSE '❌ ERREUR'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
ORDER BY f.identifiant_famille;

-- PASTEUR-004 (PS JESSY) - 5 familles attendues
SELECT 
    'PASTEUR-004 (PS JESSY)' AS pasteur,
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    CASE 
        WHEN f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1)
            THEN '✅ CORRECT'
        ELSE '❌ ERREUR'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1)
ORDER BY f.identifiant_famille;

-- Étape 5: Vérifier la cohérence famille ↔ superviseur ↔ pasteur
SELECT 
    '=== VÉRIFICATION DE COHÉRENCE FAMILLE ↔ SUPERVISEUR ↔ PASTEUR ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    (SELECT identifiant_unique FROM profils WHERE id = s.pasteur_id) AS pasteur_superviseur,
    (SELECT identifiant_unique FROM profils WHERE id = f.pasteur_id) AS pasteur_famille,
    CASE 
        WHEN f.superviseur_id IS NULL THEN '❌ FAMILLE SANS SUPERVISEUR'
        WHEN s.pasteur_id IS NULL THEN '❌ SUPERVISEUR SANS PASTEUR'
        WHEN f.pasteur_id IS NULL THEN '❌ FAMILLE SANS PASTEUR'
        WHEN f.pasteur_id = s.pasteur_id THEN '✅ COHÉRENT'
        ELSE '⚠️  INCOHÉRENT: La famille et le superviseur sont liés à des pasteurs différents'
    END AS statut_coherence
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
ORDER BY f.identifiant_famille;

-- Étape 6: Familles incohérentes (si applicable)
SELECT 
    '=== FAMILLES INCOHÉRENTES (si applicable) ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    (SELECT identifiant_unique FROM profils WHERE id = s.pasteur_id) AS pasteur_superviseur,
    (SELECT identifiant_unique FROM profils WHERE id = f.pasteur_id) AS pasteur_famille,
    '⚠️  INCOHÉRENT' AS probleme
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.pasteur_id IS NOT NULL 
AND s.pasteur_id IS NOT NULL
AND f.pasteur_id != s.pasteur_id
ORDER BY f.identifiant_famille;

-- Étape 7: Résumé final complet
SELECT 
    '=== RÉSUMÉ FINAL COMPLET ===' AS info;

SELECT 
    (SELECT COUNT(*) FROM familles_disciples) AS total_familles,
    (SELECT COUNT(*) FROM familles_disciples WHERE pasteur_id IS NOT NULL) AS familles_liees_pasteur,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NOT NULL) AS familles_liees_superviseur,
    (SELECT COUNT(*) FROM familles_disciples f 
     JOIN profils s ON s.id = f.superviseur_id 
     WHERE f.pasteur_id = s.pasteur_id) AS familles_coherentes,
    CASE 
        WHEN (SELECT COUNT(*) FROM familles_disciples WHERE pasteur_id IS NOT NULL) = (SELECT COUNT(*) FROM familles_disciples)
            AND (SELECT COUNT(*) FROM familles_disciples f JOIN profils s ON s.id = f.superviseur_id WHERE f.pasteur_id = s.pasteur_id) = (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NOT NULL)
            THEN '✅ TOUT EST CORRECT'
        ELSE '⚠️  IL Y A DES PROBLÈMES À CORRIGER'
    END AS conclusion;

-- Étape 8: Tableau récapitulatif par pasteur
SELECT 
    '=== TABLEAU RÉCAPITULATIF PAR PASTEUR ===' AS info;

SELECT 
    pasteur.identifiant_unique AS "Pasteur ID",
    pasteur.first_name || ' ' || pasteur.last_name AS "Pasteur Nom",
    COUNT(DISTINCT s.id) AS "Nb Superviseurs",
    COUNT(DISTINCT f.id) AS "Nb Familles",
    CASE pasteur.identifiant_unique
        WHEN 'PASTEUR-001' THEN 12
        WHEN 'PASTEUR-002' THEN 5
        WHEN 'PASTEUR-003' THEN 4
        WHEN 'PASTEUR-004' THEN 5
        ELSE 0
    END AS "Nb Familles Attendu",
    CASE 
        WHEN COUNT(DISTINCT f.id) = CASE pasteur.identifiant_unique
            WHEN 'PASTEUR-001' THEN 12
            WHEN 'PASTEUR-002' THEN 5
            WHEN 'PASTEUR-003' THEN 4
            WHEN 'PASTEUR-004' THEN 5
            ELSE 0
        END THEN '✅'
        ELSE '⚠️'
    END AS "Statut"
FROM profils pasteur
LEFT JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
LEFT JOIN familles_disciples f ON f.pasteur_id = pasteur.id
WHERE pasteur.role = 'pasteur' AND pasteur.identifiant_unique LIKE 'PASTEUR-%'
GROUP BY pasteur.id, pasteur.identifiant_unique, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.identifiant_unique;
