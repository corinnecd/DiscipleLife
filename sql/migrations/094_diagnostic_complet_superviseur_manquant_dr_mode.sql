-- ============================================
-- Migration: Diagnostic complet pour identifier le superviseur manquant de DR MODE
-- Objectif: Comparer exactement les 12 superviseurs attendus avec ceux qui ont une famille
-- Date: 2025-01-XX
-- ============================================

-- 1. Liste détaillée de tous les superviseurs de DR MODE avec leur statut famille
SELECT 
    '=== DIAGNOSTIC COMPLET: TOUS LES SUPERVISEURS DR MODE ===' AS info;

WITH superviseurs_attendus AS (
    SELECT 1 AS ordre, 'BETSALEEL' AS prenom, 'BADILA' AS nom, 'Les ÉCLAIRÉS' AS famille_nom, 'FAM004' AS identifiant
    UNION ALL SELECT 2, 'COCO', 'OKANZI', 'ZÉLES', 'FAM006'
    UNION ALL SELECT 3, 'ELISABETH', 'AMECY', 'LES COMBATTANTS', 'FAM009'
    UNION ALL SELECT 4, 'EPHREM', 'MBA', 'LES AGAPÉS', 'FAM010'
    UNION ALL SELECT 5, 'HÉLÈNE', 'LAMAGO', 'LES GLORIEUX', 'FAM012'
    UNION ALL SELECT 6, 'KARINE', 'WILLIAM', 'LES ÉQUIPÉS', 'FAM015'
    UNION ALL SELECT 7, 'KÉVIN', 'THÉA', 'LES INGÉNIEUX', 'FAM016'
    UNION ALL SELECT 8, 'LAETITIA', 'OBAME', 'LES RACHETÉS', 'FAM017'
    UNION ALL SELECT 9, 'MANICIA', 'THÉA', 'LES RADIEUSES', 'FAM018'
    UNION ALL SELECT 10, 'NASDÈNE', 'KODIA', 'LES INEBRANLABLES', 'FAM020'
    UNION ALL SELECT 11, 'ROCHELLE', 'PASSI BEN', 'LES PASSIONNÉS', 'FAM023'
    UNION ALL SELECT 12, 'YVAN', 'DESSANDE', 'LES DISCIPLES', 'FAM026'
)
SELECT 
    sa.ordre,
    sa.prenom || ' ' || sa.nom AS superviseur_attendu,
    sa.famille_nom AS famille_attendue,
    sa.identifiant AS identifiant_attendu,
    CASE 
        WHEN p.id IS NULL THEN '❌ SUPERVISEUR NON TROUVÉ'
        WHEN f.id IS NULL THEN '❌ FAMILLE MANQUANTE'
        WHEN f.identifiant_famille != sa.identifiant THEN '⚠️  MAUVAIS IDENTIFIANT (' || f.identifiant_famille || ')'
        WHEN f.nom != sa.famille_nom THEN '⚠️  MAUVAIS NOM (' || f.nom || ')'
        ELSE '✅ CORRECT'
    END AS statut,
    p.id AS superviseur_id,
    p.email AS superviseur_email,
    f.id AS famille_id,
    f.nom AS famille_reelle,
    f.identifiant_famille AS identifiant_reel,
    f.superviseur_id AS famille_superviseur_id
FROM superviseurs_attendus sa
LEFT JOIN profils p ON (
    (
        LOWER(TRIM(p.first_name)) = LOWER(TRIM(sa.prenom))
        OR (LOWER(TRIM(sa.prenom)) = 'kévin' AND LOWER(TRIM(p.first_name)) = 'kevin')
        OR (LOWER(TRIM(sa.prenom)) = 'hélène' AND LOWER(TRIM(p.first_name)) = 'helene')
        OR (LOWER(TRIM(sa.prenom)) = 'nasdène' AND LOWER(TRIM(p.first_name)) = 'nasdene')
    )
    AND (
        LOWER(TRIM(p.last_name)) = LOWER(TRIM(sa.nom))
        OR (LOWER(TRIM(sa.nom)) = 'passi ben' AND LOWER(TRIM(p.last_name)) LIKE '%passi%')
        OR (LOWER(TRIM(sa.nom)) = 'théa' AND LOWER(TRIM(p.last_name)) = 'thea')
    )
    AND p.role = 'superviseur'
    AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
)
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
ORDER BY sa.ordre;

-- 2. Résumé: Compter les superviseurs avec et sans famille
SELECT 
    '=== RÉSUMÉ: COMPTAGE ===' AS info;

WITH superviseurs_attendus AS (
    SELECT 'BETSALEEL' AS prenom, 'BADILA' AS nom, 'Les ÉCLAIRÉS' AS famille_nom, 'FAM004' AS identifiant
    UNION ALL SELECT 'COCO', 'OKANZI', 'ZÉLES', 'FAM006'
    UNION ALL SELECT 'ELISABETH', 'AMECY', 'LES COMBATTANTS', 'FAM009'
    UNION ALL SELECT 'EPHREM', 'MBA', 'LES AGAPÉS', 'FAM010'
    UNION ALL SELECT 'HÉLÈNE', 'LAMAGO', 'LES GLORIEUX', 'FAM012'
    UNION ALL SELECT 'KARINE', 'WILLIAM', 'LES ÉQUIPÉS', 'FAM015'
    UNION ALL SELECT 'KÉVIN', 'THÉA', 'LES INGÉNIEUX', 'FAM016'
    UNION ALL SELECT 'LAETITIA', 'OBAME', 'LES RACHETÉS', 'FAM017'
    UNION ALL SELECT 'MANICIA', 'THÉA', 'LES RADIEUSES', 'FAM018'
    UNION ALL SELECT 'NASDÈNE', 'KODIA', 'LES INEBRANLABLES', 'FAM020'
    UNION ALL SELECT 'ROCHELLE', 'PASSI BEN', 'LES PASSIONNÉS', 'FAM023'
    UNION ALL SELECT 'YVAN', 'DESSANDE', 'LES DISCIPLES', 'FAM026'
)
SELECT 
    COUNT(*) AS total_superviseurs_attendus,
    COUNT(p.id) AS superviseurs_trouves,
    COUNT(f.id) AS superviseurs_avec_famille,
    COUNT(*) - COUNT(f.id) AS superviseurs_sans_famille,
    STRING_AGG(
        CASE WHEN f.id IS NULL THEN sa.prenom || ' ' || sa.nom END, 
        ', ' 
        ORDER BY sa.prenom, sa.nom
    ) AS liste_superviseurs_sans_famille
FROM superviseurs_attendus sa
LEFT JOIN profils p ON (
    (
        LOWER(TRIM(p.first_name)) = LOWER(TRIM(sa.prenom))
        OR (LOWER(TRIM(sa.prenom)) = 'kévin' AND LOWER(TRIM(p.first_name)) = 'kevin')
        OR (LOWER(TRIM(sa.prenom)) = 'hélène' AND LOWER(TRIM(p.first_name)) = 'helene')
        OR (LOWER(TRIM(sa.prenom)) = 'nasdène' AND LOWER(TRIM(p.first_name)) = 'nasdene')
    )
    AND (
        LOWER(TRIM(p.last_name)) = LOWER(TRIM(sa.nom))
        OR (LOWER(TRIM(sa.nom)) = 'passi ben' AND LOWER(TRIM(p.last_name)) LIKE '%passi%')
        OR (LOWER(TRIM(sa.nom)) = 'théa' AND LOWER(TRIM(p.last_name)) = 'thea')
    )
    AND p.role = 'superviseur'
    AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
)
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id;

-- 3. Lister tous les superviseurs de DR MODE dans la base (pour comparaison)
SELECT 
    '=== TOUS LES SUPERVISEURS DR MODE DANS LA BASE ===' AS info;

SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.famille_id,
    f.id AS famille_id_dans_familles_disciples,
    f.nom AS famille_nom,
    f.identifiant_famille,
    f.superviseur_id AS famille_superviseur_id,
    CASE 
        WHEN f.id IS NULL THEN '❌ PAS DE FAMILLE'
        WHEN f.superviseur_id != p.id THEN '⚠️  FAMILLE LIÉE À UN AUTRE SUPERVISEUR'
        ELSE '✅ FAMILLE OK'
    END AS statut
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
ORDER BY p.first_name, p.last_name;

-- 4. Compter les familles par identifiant (pour détecter les doublons)
SELECT 
    '=== COMPTAGE DES FAMILLES PAR IDENTIFIANT ===' AS info;

SELECT 
    identifiant_famille,
    COUNT(*) AS nombre_occurrences,
    STRING_AGG(nom, ' | ' ORDER BY nom) AS noms,
    STRING_AGG(
        CASE WHEN superviseur_id IS NOT NULL 
            THEN (SELECT first_name || ' ' || last_name FROM profils WHERE id = superviseur_id)
            ELSE 'SANS SUPERVISEUR'
        END, 
        ' | ' 
        ORDER BY superviseur_id
    ) AS superviseurs,
    COUNT(CASE WHEN superviseur_id IS NULL THEN 1 END) AS nombre_sans_superviseur,
    CASE 
        WHEN COUNT(*) > 1 THEN '⚠️  DOUBLON'
        WHEN COUNT(*) = 1 AND COUNT(CASE WHEN superviseur_id IS NULL THEN 1 END) = 1 THEN '⚠️  ORPHELINE'
        ELSE '✅ OK'
    END AS statut
FROM familles_disciples
WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
   OR identifiant_famille IN ('FAM004', 'FAM006', 'FAM009', 'FAM010', 'FAM012', 'FAM015', 'FAM016', 'FAM017', 'FAM018', 'FAM020', 'FAM023', 'FAM026')
GROUP BY identifiant_famille
HAVING COUNT(*) > 1 OR COUNT(CASE WHEN superviseur_id IS NULL THEN 1 END) = COUNT(*)
ORDER BY identifiant_famille;
