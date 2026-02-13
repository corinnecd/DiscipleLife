-- ============================================
-- Optimisations de requêtes pour améliorer les performances
-- ============================================

-- ----------------------------------------
-- 1. Analyse des requêtes lentes
-- ----------------------------------------

-- Activer l'extension pg_stat_statements (si disponible)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Requête pour identifier les requêtes lentes
/*
SELECT 
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  query
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- Requêtes avec un temps moyen > 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;
*/

-- ----------------------------------------
-- 2. Index composites pour les jointures fréquentes
-- ----------------------------------------

-- Optimiser les requêtes de dashboard qui joignent profils + famille + journal
CREATE INDEX IF NOT EXISTS idx_profils_famille_role_active 
ON profils(famille_id, role);

-- Optimiser les recherches de disciples par mentor
CREATE INDEX IF NOT EXISTS idx_profils_mentor_role 
ON profils(mentor_id, role) 
WHERE mentor_id IS NOT NULL;

-- Optimiser les requêtes de suivi post-crise avec rappels
CREATE INDEX IF NOT EXISTS idx_suivi_rappel_actif_statut 
ON suivi_post_crise(user_id, rappel_actif, statut, prochain_rappel) 
WHERE rappel_actif = true AND statut IN ('actif', 'en_amelioration');

-- Optimiser les requêtes d'historique de guérison par date
CREATE INDEX IF NOT EXISTS idx_historique_suivi_date 
ON historique_guerison(suivi_id, date_suivi DESC);

-- ----------------------------------------
-- 3. Index partiels pour les requêtes spécifiques
-- ----------------------------------------

-- Index pour les parcours en cours uniquement
CREATE INDEX IF NOT EXISTS idx_upp_en_cours 
ON user_parcours_progression(user_id, parcours_id, progression_pourcentage) 
WHERE statut = 'en_cours';

-- Index pour les suivis actifs avec rappels
CREATE INDEX IF NOT EXISTS idx_suivi_actif_rappel 
ON suivi_post_crise(user_id, prochain_rappel) 
WHERE statut IN ('actif', 'en_amelioration') AND rappel_actif = true;

-- Index pour les évaluations (optimisé pour les requêtes par date)
-- Note : Impossible d'utiliser NOW() dans un index partiel (fonction non IMMUTABLE)
-- L'index couvre toutes les évaluations, les requêtes avec filtre de date resteront efficaces
CREATE INDEX IF NOT EXISTS idx_evaluations_recentes 
ON evaluations_croissance(user_id, date_evaluation DESC, score);

-- ----------------------------------------
-- 4. Fonctions optimisées pour les dashboards
-- ----------------------------------------

-- Fonction pour récupérer les statistiques d'un utilisateur (optimisée)
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
  total_journal_entries BIGINT,
  total_parcours BIGINT,
  parcours_en_cours BIGINT,
  parcours_termines BIGINT,
  progression_moyenne NUMERIC,
  total_suivis BIGINT,
  suivis_actifs BIGINT,
  derniere_activite TIMESTAMP
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM journal_transformation WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM user_parcours_progression WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM user_parcours_progression WHERE user_id = p_user_id AND statut = 'en_cours')::BIGINT,
    (SELECT COUNT(*) FROM user_parcours_progression WHERE user_id = p_user_id AND statut = 'termine')::BIGINT,
    (SELECT AVG(progression_pourcentage) FROM user_parcours_progression WHERE user_id = p_user_id AND statut = 'en_cours')::NUMERIC,
    (SELECT COUNT(*) FROM suivi_post_crise WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM suivi_post_crise WHERE user_id = p_user_id AND statut = 'actif')::BIGINT,
    (SELECT MAX(created_at) FROM (
      SELECT created_at FROM journal_transformation WHERE user_id = p_user_id
      UNION ALL
      SELECT updated_at FROM user_parcours_progression WHERE user_id = p_user_id
      UNION ALL
      SELECT updated_at FROM suivi_post_crise WHERE user_id = p_user_id
    ) AS all_activities)::TIMESTAMP;
END;
$$;

-- Fonction pour récupérer les statistiques d'une famille (optimisée)
CREATE OR REPLACE FUNCTION get_famille_dashboard_stats(p_famille_id UUID)
RETURNS TABLE (
  total_membres BIGINT,
  total_disciples BIGINT,
  total_mentors BIGINT,
  total_journal_entries BIGINT,
  total_parcours_actifs BIGINT,
  membres_actifs_7j BIGINT,
  membres_inactifs_30j BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id)::BIGINT,
    COUNT(DISTINCT CASE WHEN p.role = 'disciple' THEN p.id END)::BIGINT,
    COUNT(DISTINCT CASE WHEN p.role = 'mentor' THEN p.id END)::BIGINT,
    COUNT(DISTINCT jt.id)::BIGINT,
    COUNT(DISTINCT CASE WHEN upp.statut = 'en_cours' THEN upp.id END)::BIGINT,
    COUNT(DISTINCT CASE 
      WHEN jt.created_at > NOW() - INTERVAL '7 days' 
      OR upp.updated_at > NOW() - INTERVAL '7 days'
      THEN p.id 
    END)::BIGINT,
    COUNT(DISTINCT CASE 
      WHEN (jt.created_at IS NULL OR jt.created_at < NOW() - INTERVAL '30 days')
      AND (upp.updated_at IS NULL OR upp.updated_at < NOW() - INTERVAL '30 days')
      THEN p.id 
    END)::BIGINT
  FROM profils p
  LEFT JOIN journal_transformation jt ON jt.user_id = p.id
  LEFT JOIN user_parcours_progression upp ON upp.user_id = p.id
  WHERE p.famille_id = p_famille_id;
END;
$$;

-- ----------------------------------------
-- 5. Requêtes optimisées courantes
-- ----------------------------------------

-- Requête optimisée : Liste des disciples avec leur dernière activité
CREATE OR REPLACE VIEW v_disciples_with_activity AS
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.famille_id,
  p.mentor_id,
  p.spiritual_stage,
  GREATEST(
    COALESCE(MAX(jt.created_at), '1970-01-01'::timestamp),
    COALESCE(MAX(upp.updated_at), '1970-01-01'::timestamp),
    COALESCE(MAX(spc.updated_at), '1970-01-01'::timestamp)
  ) AS derniere_activite,
  COUNT(DISTINCT jt.id) AS total_journal_entries,
  COUNT(DISTINCT upp.id) AS total_parcours,
  COUNT(DISTINCT spc.id) AS total_suivis
FROM profils p
LEFT JOIN journal_transformation jt ON jt.user_id = p.id
LEFT JOIN user_parcours_progression upp ON upp.user_id = p.id
LEFT JOIN suivi_post_crise spc ON spc.user_id = p.id
WHERE p.role = 'disciple'
GROUP BY p.id, p.first_name, p.last_name, p.email, p.famille_id, p.mentor_id, p.spiritual_stage;

-- Requête optimisée : Familles avec statistiques de transformation
CREATE OR REPLACE VIEW v_familles_with_transformation_stats AS
SELECT 
  f.id AS famille_id,
  f.nom AS famille_nom,
  COUNT(DISTINCT p.id) AS total_membres,
  COUNT(DISTINCT jt.id) AS total_journal_entries,
  COUNT(DISTINCT upp.id) AS total_parcours_actifs,
  AVG(CASE WHEN upp.progression_pourcentage IS NOT NULL THEN upp.progression_pourcentage ELSE 0 END) AS progression_moyenne,
  COUNT(DISTINCT CASE 
    WHEN jt.created_at > NOW() - INTERVAL '7 days' 
    OR upp.updated_at > NOW() - INTERVAL '7 days'
    THEN p.id 
  END) AS membres_actifs_7j
FROM familles_disciples f
LEFT JOIN profils p ON p.famille_id = f.id
LEFT JOIN journal_transformation jt ON jt.user_id = p.id
LEFT JOIN user_parcours_progression upp ON upp.user_id = p.id AND upp.statut = 'en_cours'
GROUP BY f.id, f.nom;

-- ----------------------------------------
-- 6. Maintenance et nettoyage
-- ----------------------------------------

-- Fonction pour nettoyer les anciennes données (à exécuter périodiquement)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Archiver les suivis résolus depuis plus d'un an
  UPDATE suivi_post_crise
  SET statut = 'archive'
  WHERE statut = 'resolu' 
    AND updated_at < NOW() - INTERVAL '1 year';

  -- Supprimer les anciennes notifications (si table existe)
  -- DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '3 months' AND read = true;

  RAISE NOTICE 'Nettoyage des anciennes données effectué';
END;
$$;

-- ----------------------------------------
-- 7. Analyse et vacuum automatique
-- ----------------------------------------

-- Configurer l'autovacuum pour les tables volumineuses
ALTER TABLE journal_transformation SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE user_parcours_progression SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE historique_guerison SET (autovacuum_vacuum_scale_factor = 0.05);

-- ----------------------------------------
-- 8. Statistiques et monitoring
-- ----------------------------------------

-- Vue pour monitorer l'utilisation des index
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- Vue pour monitorer la taille des tables
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ----------------------------------------
-- Commentaires pour la documentation
-- ----------------------------------------
COMMENT ON FUNCTION get_user_dashboard_stats(UUID) IS 'Récupère les statistiques optimisées d''un utilisateur pour le dashboard';
COMMENT ON FUNCTION get_famille_dashboard_stats(UUID) IS 'Récupère les statistiques optimisées d''une famille pour le dashboard';
COMMENT ON FUNCTION cleanup_old_data() IS 'Nettoie les anciennes données pour optimiser les performances';
COMMENT ON VIEW v_disciples_with_activity IS 'Vue optimisée des disciples avec leur dernière activité';
COMMENT ON VIEW v_familles_with_transformation_stats IS 'Vue optimisée des familles avec statistiques de transformation';
COMMENT ON VIEW v_index_usage IS 'Monitoring de l''utilisation des index';
COMMENT ON VIEW v_table_sizes IS 'Monitoring de la taille des tables';

-- ----------------------------------------
-- Exemple d'utilisation
-- ----------------------------------------

-- Pour récupérer les stats d'un utilisateur :
-- SELECT * FROM get_user_dashboard_stats('UUID_DE_L_UTILISATEUR');

-- Pour récupérer les stats d'une famille :
-- SELECT * FROM get_famille_dashboard_stats('UUID_DE_LA_FAMILLE');

-- Pour nettoyer les anciennes données :
-- SELECT cleanup_old_data();

-- Pour vérifier l'utilisation des index :
-- SELECT * FROM v_index_usage WHERE index_scans < 100;

-- Pour vérifier la taille des tables :
-- SELECT * FROM v_table_sizes;
