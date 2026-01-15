-- ============================================
-- Diagnostic: Vérifier la famille manquante pour PASTEUR-003
-- Objectif: Identifier quelle famille n'est pas liée à PS PEGGY NN
-- ============================================

-- Les 4 superviseurs sous PS PEGGY NN (PASTEUR-003) sont :
-- 1. ALAIN SIL
-- 2. CARINE MATONDO
-- 3. GERVAIS NKATOULOULOU
-- 4. LAETITIA MISSATOU

-- Étape 1: Vérifier les superviseurs liés à PASTEUR-003
SELECT 
    '=== SUPERVISEURS SOUS PS PEGGY NN ===' AS info;

SELECT 
    p.id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS nom_superviseur,
    p.email,
    p.pasteur_id,
    (SELECT identifiant_unique FROM profils WHERE id = p.pasteur_id) AS pasteur_identifiant
FROM profils p
WHERE p.pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1
)
AND p.role = 'superviseur'
ORDER BY p.first_name, p.last_name;

-- Étape 2: Vérifier les familles liées à ces superviseurs
SELECT 
    '=== FAMILLES DES SUPERVISEURS ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    f.superviseur_id,
    f.pasteur_id,
    (SELECT identifiant_unique FROM profils WHERE id = f.pasteur_id) AS pasteur_identifiant_famille
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.superviseur_id IN (
    SELECT p.id
    FROM profils p
    WHERE p.pasteur_id = (
        SELECT id FROM profils 
        WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
        LIMIT 1
    )
    AND p.role = 'superviseur'
)
ORDER BY f.identifiant_famille;

-- Étape 3: Identifier la famille manquante
SELECT 
    '=== FAMILLE MANQUANTE ===' AS info;

SELECT 
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur,
    f.identifiant_famille,
    f.nom AS nom_famille,
    CASE 
        WHEN f.id IS NULL THEN '❌ FAMILLE MANQUANTE - Ce superviseur n''a pas de famille assignée'
        WHEN f.pasteur_id IS NULL THEN '⚠️  FAMILLE SANS PASTEUR - La famille existe mais n''est pas liée au pasteur'
        ELSE '✅ OK'
    END AS statut
FROM profils s
LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
WHERE s.pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1
)
AND s.role = 'superviseur'
ORDER BY s.first_name, s.last_name;

-- Étape 4: Vérifier toutes les familles qui devraient être liées à PASTEUR-003
SELECT 
    '=== TOUTES LES FAMILLES ATTENDUES ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    CASE 
        WHEN f.pasteur_id IS NULL THEN '❌ NON LIÉE'
        WHEN f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1) THEN '✅ LIÉE'
        ELSE '⚠️  LIÉE À UN AUTRE PASTEUR'
    END AS statut_liaison
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE s.pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1
)
OR f.superviseur_id IN (
    SELECT p.id
    FROM profils p
    WHERE p.pasteur_id = (
        SELECT id FROM profils 
        WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
        LIMIT 1
    )
    AND p.role = 'superviseur'
)
ORDER BY f.identifiant_famille;
