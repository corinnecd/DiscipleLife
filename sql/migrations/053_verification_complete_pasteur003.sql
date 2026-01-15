-- ============================================
-- Vérification complète: Toutes les familles de PASTEUR-003
-- Objectif: Afficher toutes les familles et identifier les problèmes
-- ============================================

-- Les 4 familles attendues sous PS PEGGY NN (PASTEUR-003):
-- 1. FAM001 - LES DÉTERMINÉS - Alain SIL
-- 2. FAM005 - Les AMOUREUX - CARINE MATONDO
-- 3. FAM011 - LES FIDÈLES - GERVAIS NKATOULOULOU
-- 4. FAM017 - LES VICTORIEUX - LAETITIA MISSATOU

-- Étape 1: Liste complète des superviseurs de PASTEUR-003
SELECT 
    '=== SUPERVISEURS SOUS PASTEUR-003 ===' AS info;

SELECT 
    p.id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS nom_complet,
    p.email,
    p.identifiant_unique,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id = p.id) AS nb_familles_associees
FROM profils p
WHERE p.pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1
)
AND p.role = 'superviseur'
ORDER BY p.first_name, p.last_name;

-- Étape 2: Toutes les familles (avec détails)
SELECT 
    '=== TOUTES LES FAMILLES AVEC LEURS SUPERVISEURS ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    COALESCE(s.first_name || ' ' || s.last_name, '❌ AUCUN SUPERVISEUR') AS superviseur,
    COALESCE(s.email, '') AS email_superviseur,
    CASE 
        WHEN f.superviseur_id IS NULL THEN '❌'
        WHEN s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
            THEN '✅'
        ELSE '⚠️'
    END AS est_sous_pasteur_003,
    (SELECT identifiant_unique FROM profils WHERE id = f.pasteur_id) AS pasteur_identifiant
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
ORDER BY f.identifiant_famille;

-- Étape 3: Familles spécifiques attendues pour PASTEUR-003
SELECT 
    '=== LES 4 FAMILLES ATTENDUES SOUS PASTEUR-003 ===' AS info;

SELECT 
    'FAM001' AS identifiant_attendu,
    'LES DÉTERMINÉS' AS nom_attendu,
    'Alain SIL' AS superviseur_attendu,
    CASE 
        WHEN EXISTS (SELECT 1 FROM familles_disciples f 
                     JOIN profils s ON s.id = f.superviseur_id 
                     WHERE f.identifiant_famille = 'FAM001' 
                     AND s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1))
            THEN '✅ OK'
        ELSE '❌ MANQUANTE OU MAL LIÉE'
    END AS statut
UNION ALL
SELECT 
    'FAM005',
    'Les AMOUREUX',
    'CARINE MATONDO',
    CASE 
        WHEN EXISTS (SELECT 1 FROM familles_disciples f 
                     JOIN profils s ON s.id = f.superviseur_id 
                     WHERE f.identifiant_famille = 'FAM005' 
                     AND s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1))
            THEN '✅ OK'
        ELSE '❌ MANQUANTE OU MAL LIÉE'
    END
UNION ALL
SELECT 
    'FAM011',
    'LES FIDÈLES',
    'GERVAIS NKATOULOULOU',
    CASE 
        WHEN EXISTS (SELECT 1 FROM familles_disciples f 
                     JOIN profils s ON s.id = f.superviseur_id 
                     WHERE f.identifiant_famille = 'FAM011' 
                     AND s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1))
            THEN '✅ OK'
        ELSE '❌ MANQUANTE OU MAL LIÉE'
    END
UNION ALL
SELECT 
    'FAM017',
    'LES VICTORIEUX',
    'LAETITIA MISSATOU',
    CASE 
        WHEN EXISTS (SELECT 1 FROM familles_disciples f 
                     JOIN profils s ON s.id = f.superviseur_id 
                     WHERE f.identifiant_famille = 'FAM017' 
                     AND s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1))
            THEN '✅ OK'
        ELSE '❌ MANQUANTE OU MAL LIÉE'
    END;

-- Étape 4: Vérification détaillée de FAM017
SELECT 
    '=== VÉRIFICATION DÉTAILLÉE FAM017 ===' AS info;

SELECT 
    f.id AS famille_id,
    f.identifiant_famille,
    f.nom AS nom_famille,
    f.superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_actuel,
    s.email AS email_superviseur,
    s.pasteur_id AS superviseur_pasteur_id,
    (SELECT identifiant_unique FROM profils WHERE id = s.pasteur_id) AS superviseur_pasteur_identifiant,
    f.pasteur_id AS famille_pasteur_id,
    (SELECT identifiant_unique FROM profils WHERE id = f.pasteur_id) AS famille_pasteur_identifiant,
    CASE 
        WHEN f.identifiant_famille = 'FAM017' 
            AND f.nom = 'LES VICTORIEUX'
            AND LOWER(s.first_name) IN ('laetitia', 'laëtitia')
            AND LOWER(s.last_name) = 'missatou'
            AND s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
            AND f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
            THEN '✅ TOUT EST CORRECT'
        WHEN f.identifiant_famille = 'FAM017' AND f.superviseur_id IS NULL
            THEN '❌ FAM017 EXISTE MAIS N''A PAS DE SUPERVISEUR'
        WHEN f.identifiant_famille = 'FAM017' AND s.id IS NULL
            THEN '❌ FAM17 EXISTE MAIS LE SUPERVISEUR ASSIGNÉ N''EXISTE PAS'
        WHEN f.identifiant_famille = 'FAM017' AND LOWER(s.last_name) != 'missatou'
            THEN '⚠️  FAM017 EST LIÉE À UN AUTRE SUPERVISEUR: ' || s.first_name || ' ' || s.last_name
        WHEN f.identifiant_famille = 'FAM017' AND s.pasteur_id != (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
            THEN '⚠️  FAM017 EST LIÉE À UN SUPERVISEUR QUI N''EST PAS SOUS PASTEUR-003'
        WHEN f.identifiant_famille = 'FAM017' AND f.pasteur_id != (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
            THEN '⚠️  FAM17 N''EST PAS LIÉE À PASTEUR-003'
        ELSE '❌ PROBLÈME NON IDENTIFIÉ'
    END AS diagnostic
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.identifiant_famille = 'FAM017';

-- Étape 5: Résumé final
SELECT 
    '=== RÉSUMÉ FINAL ===' AS info;

SELECT 
    (SELECT COUNT(*) FROM profils WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1) AND role = 'superviseur') AS nb_superviseurs_sous_pasteur_003,
    (SELECT COUNT(*) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)) AS nb_familles_liees_pasteur_003,
    CASE 
        WHEN (SELECT COUNT(*) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)) = 4
            THEN '✅ CORRECT: 4 familles liées'
        ELSE '❌ ATTENTION: ' || (SELECT COUNT(*) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)) || ' familles (attendu: 4)'
    END AS statut_final;
