-- Script de vérification: Vérifier si la colonne pasteur_id existe dans la table reports
-- Exécutez ce script pour vérifier si la migration 074_add_pasteur_id_to_reports.sql a été exécutée

-- 1. Vérifier si la colonne pasteur_id existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'reports' 
            AND column_name = 'pasteur_id'
        ) THEN '✅ La colonne pasteur_id EXISTE dans la table reports'
        ELSE '❌ La colonne pasteur_id N''EXISTE PAS dans la table reports'
    END AS status_colonne;

-- 2. Afficher les détails de la colonne si elle existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'reports' 
AND column_name = 'pasteur_id';

-- 3. Vérifier si l'index existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'reports' 
            AND indexname = 'idx_reports_pasteur_id'
        ) THEN '✅ L''index idx_reports_pasteur_id EXISTE'
        ELSE '❌ L''index idx_reports_pasteur_id N''EXISTE PAS'
    END AS status_index;

-- 4. Compter les rapports (seulement si la colonne pasteur_id existe)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'reports' 
            AND column_name = 'pasteur_id'
        ) THEN (
            SELECT 
                'Rapports sans pasteur: ' || COUNT(*) FILTER (WHERE pasteur_id IS NULL)::text || 
                ' | Rapports avec pasteur: ' || COUNT(*) FILTER (WHERE pasteur_id IS NOT NULL)::text ||
                ' | Total: ' || COUNT(*)::text
            FROM reports
        )
        ELSE 'La colonne pasteur_id n''existe pas encore'
    END AS statistiques_rapports;

-- 5. Afficher le total de rapports (toujours possible)
SELECT 
    COUNT(*) AS total_rapports,
    COUNT(DISTINCT user_id) AS nombre_superviseurs
FROM reports;
