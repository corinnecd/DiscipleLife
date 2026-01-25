-- ============================================
-- Migration: Identifier le superviseur de DR MODE sans famille
-- Objectif: Comparer les 12 superviseurs attendus avec ceux qui ont une famille
-- Date: 2025-01-XX
-- ============================================

-- 1. Liste des 12 superviseurs attendus pour DR MODE (PASTEUR-001)
SELECT 
    '=== LISTE DES 12 SUPERVISEURS ATTENDUS POUR DR MODE ===' AS info;

SELECT 
    'BETSALEEL BADILA' AS superviseur_attendu,
    'Les ÉCLAIRÉS' AS famille_attendue,
    'FAM004' AS identifiant_attendu
UNION ALL
SELECT 'COCO OKANZI', 'ZÉLES', 'FAM006'
UNION ALL
SELECT 'ELISABETH AMECY', 'LES COMBATTANTS', 'FAM009'
UNION ALL
SELECT 'EPHREM MBA', 'LES AGAPÉS', 'FAM010'
UNION ALL
SELECT 'HÉLÈNE LAMAGO', 'LES GLORIEUX', 'FAM012'
UNION ALL
SELECT 'KARINE WILLIAM', 'LES ÉQUIPÉS', 'FAM015'
UNION ALL
SELECT 'KÉVIN THÉA', 'LES INGÉNIEUX', 'FAM016'
UNION ALL
SELECT 'LAETITIA OBAME', 'LES RACHETÉS', 'FAM017'
UNION ALL
SELECT 'MANICIA THÉA', 'LES RADIEUSES', 'FAM018'
UNION ALL
SELECT 'NASDÈNE KODIA', 'LES INEBRANLABLES', 'FAM020'
UNION ALL
SELECT 'ROCHELLE PASSI BEN', 'LES PASSIONNÉS', 'FAM023'
UNION ALL
SELECT 'YVAN DESSANDE', 'LES DISCIPLES', 'FAM026'
ORDER BY superviseur_attendu;

-- 2. Comparer avec les superviseurs réels dans la base de données
SELECT 
    '=== COMPARAISON: SUPERVISEURS RÉELS VS ATTENDUS ===' AS info;

WITH superviseurs_attendus AS (
    SELECT 'BETSALEEL' AS prenom, 'BADILA' AS nom, 'Les ÉCLAIRÉS' AS famille_nom, 'FAM004' AS identifiant
    UNION ALL SELECT 'COCO', 'OKANZI', 'ZÉLES', 'FAM006'
    UNION ALL SELECT 'ELISABETH', 'AMECY', 'LES COMBATTANTS', 'FAM009'
    UNION ALL SELECT 'EPHREM', 'MBA', 'LES AGAPÉS', 'FAM010'
    UNION ALL SELECT 'HÉLÈNE', 'LAMAGO', 'LES GLORIEUX', 'FAM012'
    UNION ALL SELECT 'HÉLÈNE', 'LAMAGO', 'Les Vaillants', 'FAM013' -- Note: HÉLÈNE LAMAGO a 2 familles selon migration 035
    UNION ALL SELECT 'KARINE', 'WILLIAM', 'LES ÉQUIPÉS', 'FAM015'
    UNION ALL SELECT 'KÉVIN', 'THÉA', 'LES INGÉNIEUX', 'FAM016'
    UNION ALL SELECT 'KEVIN', 'THÉA', 'LES INGÉNIEUX', 'FAM016'
    UNION ALL SELECT 'LAETITIA', 'OBAME', 'LES RACHETÉS', 'FAM017'
    UNION ALL SELECT 'MANICIA', 'THÉA', 'LES RADIEUSES', 'FAM018'
    UNION ALL SELECT 'NASDÈNE', 'KODIA', 'LES INEBRANLABLES', 'FAM020'
    UNION ALL SELECT 'NASDENE', 'KODIA', 'LES INEBRANLABLES', 'FAM020'
    UNION ALL SELECT 'ROCHELLE', 'PASSI BEN', 'LES PASSIONNÉS', 'FAM023'
    UNION ALL SELECT 'ROCHELLE', 'PASSI', 'LES PASSIONNÉS', 'FAM023'
    UNION ALL SELECT 'YVAN', 'DESSANDE', 'LES DISCIPLES', 'FAM026'
),
superviseurs_reels AS (
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        p.famille_id,
        f.id AS famille_id_dans_familles,
        f.nom AS famille_nom,
        f.identifiant_famille,
        f.superviseur_id AS famille_superviseur_id
    FROM profils p
    LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
    WHERE p.role = 'superviseur'
      AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
)
SELECT 
    sr.first_name || ' ' || sr.last_name AS superviseur_reel,
    sr.email,
    sr.famille_id AS famille_id_dans_profils,
    sr.famille_id_dans_familles,
    sr.famille_nom AS famille_nom_reelle,
    sr.identifiant_famille AS identifiant_famille_reelle,
    sa.famille_nom AS famille_nom_attendue,
    sa.identifiant AS identifiant_attendu,
    CASE 
        WHEN sr.famille_id_dans_familles IS NULL THEN '❌ AUCUNE FAMILLE DANS familles_disciples'
        WHEN sr.famille_id IS NULL THEN '⚠️  PAS DE famille_id DANS profils'
        WHEN sr.famille_id != sr.famille_id_dans_familles THEN '⚠️  INCOHÉRENCE: famille_id différent'
        WHEN sa.famille_nom IS NULL THEN 'ℹ️  SUPERVISEUR NON DANS LA LISTE ATTENDUE'
        WHEN sr.famille_nom != sa.famille_nom THEN '⚠️  NOM DE FAMILLE DIFFÉRENT'
        ELSE '✅ CORRECT'
    END AS statut
FROM superviseurs_reels sr
LEFT JOIN superviseurs_attendus sa ON (
    LOWER(TRIM(sr.first_name)) = LOWER(TRIM(sa.prenom))
    AND LOWER(TRIM(sr.last_name)) = LOWER(TRIM(sa.nom))
)
ORDER BY 
    CASE 
        WHEN sr.famille_id_dans_familles IS NULL THEN 1
        WHEN sr.famille_id IS NULL THEN 2
        ELSE 3
    END,
    sr.first_name, sr.last_name;

-- 3. Identifier les superviseurs SANS famille dans familles_disciples
SELECT 
    '=== SUPERVISEURS SANS FAMILLE DANS familles_disciples ===' AS info;

SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.famille_id AS famille_id_dans_profils,
    f.id AS famille_id_dans_familles_disciples,
    CASE 
        WHEN p.famille_id IS NOT NULL AND f.id IS NULL THEN '⚠️  famille_id dans profils mais PAS de famille dans familles_disciples'
        WHEN p.famille_id IS NULL AND f.id IS NULL THEN '❌ AUCUNE FAMILLE (ni dans profils ni dans familles_disciples)'
        ELSE '✅ FAMILLE TROUVÉE'
    END AS statut
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
  AND f.id IS NULL
ORDER BY p.first_name, p.last_name;

-- 4. Compter les familles par superviseur (pour détecter les doublons ou manquants)
SELECT 
    '=== COMPTAGE DES FAMILLES PAR SUPERVISEUR ===' AS info;

SELECT 
    p.id,
    p.first_name || ' ' || p.last_name AS superviseur,
    COUNT(f.id) AS nombre_familles,
    STRING_AGG(f.identifiant_famille, ', ' ORDER BY f.identifiant_famille) AS identifiants_familles,
    STRING_AGG(f.nom, ', ' ORDER BY f.nom) AS noms_familles,
    CASE 
        WHEN COUNT(f.id) = 0 THEN '❌ AUCUNE FAMILLE'
        WHEN COUNT(f.id) > 1 THEN '⚠️  PLUSIEURS FAMILLES'
        ELSE '✅ UNE FAMILLE'
    END AS statut
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
GROUP BY p.id, p.first_name, p.last_name
ORDER BY 
    CASE 
        WHEN COUNT(f.id) = 0 THEN 1
        WHEN COUNT(f.id) > 1 THEN 2
        ELSE 3
    END,
    p.first_name, p.last_name;

-- 5. Résumé final
SELECT 
    '=== RÉSUMÉ FINAL ===' AS info;

SELECT 
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) AS total_superviseurs,
    (SELECT COUNT(DISTINCT superviseur_id) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) AS total_familles_avec_superviseur,
    (SELECT COUNT(*) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) AS total_familles,
    (SELECT COUNT(*) FROM profils p 
     LEFT JOIN familles_disciples f ON f.superviseur_id = p.id 
     WHERE p.role = 'superviseur' 
       AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
       AND f.id IS NULL) AS superviseurs_sans_famille,
    CASE 
        WHEN (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) = 12
            AND (SELECT COUNT(DISTINCT superviseur_id) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) = 12
        THEN '✅ CORRECT (12 superviseurs, 12 familles)'
        ELSE '⚠️  PROBLÈME DÉTECTÉ'
    END AS statut;
