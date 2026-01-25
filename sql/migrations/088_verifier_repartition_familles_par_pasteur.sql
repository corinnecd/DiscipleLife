-- ============================================
-- Migration: Vérifier la répartition des familles par pasteur
-- Objectif: Confirmer que chaque pasteur a le bon nombre de familles
-- Date: 2025-01-XX
-- ============================================

-- Vérification détaillée par pasteur
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
        WHEN COUNT(DISTINCT f.id) < CASE pasteur.identifiant_unique
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
        END - COUNT(DISTINCT f.id)) || ' famille(s))'
        ELSE '⚠️  TROP DE FAMILLES'
    END AS statut
FROM profils pasteur
LEFT JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
LEFT JOIN familles_disciples f ON f.pasteur_id = pasteur.id
WHERE pasteur.role = 'pasteur' AND pasteur.identifiant_unique LIKE 'PASTEUR-%'
GROUP BY pasteur.id, pasteur.identifiant_unique, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.identifiant_unique;

-- Détail des familles pour DR MODE (PASTEUR-001)
SELECT 
    '=== DÉTAIL DES FAMILLES - DR MODE (PASTEUR-001) ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    s.email AS email_superviseur,
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

-- Résumé global
SELECT 
    '=== RÉSUMÉ GLOBAL ===' AS info;

SELECT 
    (SELECT COUNT(*) FROM familles_disciples) AS total_familles,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') AS total_superviseurs,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NOT NULL) AS familles_avec_superviseur,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND famille_id IS NOT NULL) AS superviseurs_avec_famille,
    (SELECT COUNT(*) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) AS familles_dr_mode,
    CASE 
        WHEN (SELECT COUNT(*) FROM familles_disciples) = 26 
            AND (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NOT NULL) = 26
            AND (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND famille_id IS NOT NULL) = 26
            AND (SELECT COUNT(*) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) = 12
        THEN '✅ TOUT EST CORRECT (26 familles, DR MODE: 12 familles)'
        ELSE '⚠️  VÉRIFICATION NÉCESSAIRE'
    END AS statut_final;
