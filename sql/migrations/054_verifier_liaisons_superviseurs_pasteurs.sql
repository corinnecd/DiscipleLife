-- ============================================
-- Vérification complète: Liaisons superviseurs ↔ pasteurs
-- Objectif: Vérifier que tous les superviseurs sont liés à un pasteur
-- ============================================

-- Étape 1: Compter tous les superviseurs
SELECT 
    '=== STATISTIQUES GLOBALES ===' AS info;

SELECT 
    COUNT(*) AS total_superviseurs,
    COUNT(pasteur_id) AS superviseurs_lies,
    COUNT(*) - COUNT(pasteur_id) AS superviseurs_non_lies,
    CASE 
        WHEN COUNT(*) = COUNT(pasteur_id) THEN '✅ TOUS LES SUPERVISEURS SONT LIÉS'
        ELSE '⚠️  CERTAINS SUPERVISEURS NE SONT PAS LIÉS'
    END AS statut
FROM profils
WHERE role = 'superviseur';

-- Étape 2: Liste de tous les superviseurs avec leur état de liaison
SELECT 
    '=== TOUS LES SUPERVISEURS (avec état de liaison) ===' AS info;

SELECT 
    p.id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS nom_complet,
    p.email,
    p.pasteur_id,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    pasteur.identifiant_unique AS pasteur_identifiant,
    CASE 
        WHEN p.pasteur_id IS NULL THEN '❌ NON LIÉ'
        WHEN pasteur.identifiant_unique LIKE 'PASTEUR-%' THEN '✅ LIÉ (' || pasteur.identifiant_unique || ')'
        ELSE '⚠️  LIÉ MAIS PASTEUR INVALIDE'
    END AS statut_liaison
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
WHERE p.role = 'superviseur'
ORDER BY 
    CASE WHEN p.pasteur_id IS NULL THEN 0 ELSE 1 END,
    pasteur.identifiant_unique,
    p.first_name,
    p.last_name;

-- Étape 3: Superviseurs NON liés (à corriger)
SELECT 
    '=== SUPERVISEURS NON LIÉS (à corriger) ===' AS info;

SELECT 
    p.id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS nom_complet,
    p.email,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id = p.id) AS nb_familles_associees
FROM profils p
WHERE p.role = 'superviseur'
AND p.pasteur_id IS NULL
ORDER BY p.first_name, p.last_name;

-- Étape 4: Répartition par pasteur
SELECT 
    '=== RÉPARTITION DES SUPERVISEURS PAR PASTEUR ===' AS info;

SELECT 
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(p.id) AS nb_superviseurs,
    STRING_AGG(p.first_name || ' ' || p.last_name, ', ' ORDER BY p.first_name, p.last_name) AS liste_superviseurs
FROM profils pasteur
LEFT JOIN profils p ON p.pasteur_id = pasteur.id AND p.role = 'superviseur'
WHERE pasteur.role = 'pasteur' AND pasteur.identifiant_unique LIKE 'PASTEUR-%'
GROUP BY pasteur.id, pasteur.identifiant_unique, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.identifiant_unique;

-- Étape 5: Détail des superviseurs par pasteur
SELECT 
    '=== DÉTAIL PAR PASTEUR ===' AS info;

-- PASTEUR-001 (DR MODE) - Attendu: 12 superviseurs
SELECT 
    'PASTEUR-001 (DR MODE)' AS pasteur,
    p.first_name || ' ' || p.last_name AS superviseur,
    p.email,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id = p.id) AS nb_familles,
    CASE 
        WHEN p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
            THEN '✅ CORRECT'
        ELSE '❌ ERREUR'
    END AS statut
FROM profils p
WHERE p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
AND p.role = 'superviseur'
ORDER BY p.first_name, p.last_name;

-- PASTEUR-002 (PS JULIANA) - Attendu: 5 superviseurs
SELECT 
    'PASTEUR-002 (PS JULIANA)' AS pasteur,
    p.first_name || ' ' || p.last_name AS superviseur,
    p.email,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id = p.id) AS nb_familles,
    CASE 
        WHEN p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur' LIMIT 1)
            THEN '✅ CORRECT'
        ELSE '❌ ERREUR'
    END AS statut
FROM profils p
WHERE p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur' LIMIT 1)
AND p.role = 'superviseur'
ORDER BY p.first_name, p.last_name;

-- PASTEUR-003 (PS PEGGY NN) - Attendu: 4 superviseurs
SELECT 
    'PASTEUR-003 (PS PEGGY NN)' AS pasteur,
    p.first_name || ' ' || p.last_name AS superviseur,
    p.email,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id = p.id) AS nb_familles,
    CASE 
        WHEN p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
            THEN '✅ CORRECT'
        ELSE '❌ ERREUR'
    END AS statut
FROM profils p
WHERE p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
AND p.role = 'superviseur'
ORDER BY p.first_name, p.last_name;

-- PASTEUR-004 (PS JESSY) - Attendu: 5 superviseurs
SELECT 
    'PASTEUR-004 (PS JESSY)' AS pasteur,
    p.first_name || ' ' || p.last_name AS superviseur,
    p.email,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id = p.id) AS nb_familles,
    CASE 
        WHEN p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1)
            THEN '✅ CORRECT'
        ELSE '❌ ERREUR'
    END AS statut
FROM profils p
WHERE p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1)
AND p.role = 'superviseur'
ORDER BY p.first_name, p.last_name;

-- Étape 6: Résumé par pasteur avec nombre attendu
SELECT 
    '=== RÉSUMÉ AVEC NOMBRES ATTENDUS ===' AS info;

SELECT 
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(p.id) AS nb_superviseurs_actuels,
    CASE pasteur.identifiant_unique
        WHEN 'PASTEUR-001' THEN 12
        WHEN 'PASTEUR-002' THEN 5
        WHEN 'PASTEUR-003' THEN 4
        WHEN 'PASTEUR-004' THEN 5
        ELSE 0
    END AS nb_superviseurs_attendu,
    CASE 
        WHEN COUNT(p.id) = CASE pasteur.identifiant_unique
            WHEN 'PASTEUR-001' THEN 12
            WHEN 'PASTEUR-002' THEN 5
            WHEN 'PASTEUR-003' THEN 4
            WHEN 'PASTEUR-004' THEN 5
            ELSE 0
        END THEN '✅ CORRECT'
        WHEN COUNT(p.id) < CASE pasteur.identifiant_unique
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
        END - COUNT(p.id)) || ' manquant(s))'
        ELSE '⚠️  TROP DE SUPERVISEURS'
    END AS statut
FROM profils pasteur
LEFT JOIN profils p ON p.pasteur_id = pasteur.id AND p.role = 'superviseur'
WHERE pasteur.role = 'pasteur' AND pasteur.identifiant_unique LIKE 'PASTEUR-%'
GROUP BY pasteur.id, pasteur.identifiant_unique, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.identifiant_unique;

-- Étape 7: Vérification finale globale
SELECT 
    '=== VÉRIFICATION FINALE GLOBALE ===' AS info;

SELECT 
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') AS total_superviseurs,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND pasteur_id IS NOT NULL) AS superviseurs_lies,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND pasteur_id IS NULL) AS superviseurs_non_lies,
    CASE 
        WHEN (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND pasteur_id IS NULL) = 0
            THEN '✅ TOUS LES SUPERVISEURS SONT LIÉS À UN PASTEUR'
        ELSE '❌ IL MANQUE DES LIENS: ' || (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND pasteur_id IS NULL) || ' superviseur(s) non lié(s)'
    END AS conclusion;
