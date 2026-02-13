-- ============================================
-- Vues matérialisées pour optimiser les dashboards
-- Ces vues pré-calculent les statistiques fréquemment utilisées
-- ============================================

-- ----------------------------------------
-- Vue : Statistiques globales par famille
-- ----------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_famille_stats AS
SELECT 
  f.id AS famille_id,
  f.nom AS famille_nom,
  COUNT(DISTINCT p.id) AS total_membres,
  COUNT(DISTINCT CASE WHEN p.role = 'disciple' THEN p.id END) AS total_disciples,
  COUNT(DISTINCT CASE WHEN p.role = 'mentor' THEN p.id END) AS total_mentors,
  COUNT(DISTINCT CASE WHEN p.role = 'superviseur' THEN p.id END) AS total_superviseurs,
  COUNT(DISTINCT jt.id) AS total_journal_entries,
  COUNT(DISTINCT upp.id) AS total_parcours_actifs,
  AVG(CASE WHEN upp.progression_pourcentage IS NOT NULL THEN upp.progression_pourcentage ELSE 0 END) AS progression_moyenne,
  MAX(jt.created_at) AS derniere_activite
FROM familles_disciples f
LEFT JOIN profils p ON p.famille_id = f.id
LEFT JOIN journal_transformation jt ON jt.user_id = p.id
LEFT JOIN user_parcours_progression upp ON upp.user_id = p.id AND upp.statut = 'en_cours'
GROUP BY f.id, f.nom;

-- Index pour la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_famille_stats_famille_id ON mv_famille_stats(famille_id);

-- ----------------------------------------
-- Vue : Statistiques de suivi post-crise par utilisateur
-- ----------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_suivi_post_crise_stats AS
SELECT 
  spc.user_id,
  COUNT(*) AS total_suivis,
  COUNT(CASE WHEN spc.statut = 'actif' THEN 1 END) AS suivis_actifs,
  COUNT(CASE WHEN spc.statut = 'en_amelioration' THEN 1 END) AS suivis_en_amelioration,
  COUNT(CASE WHEN spc.statut = 'stabilise' THEN 1 END) AS suivis_stabilises,
  COUNT(CASE WHEN spc.statut = 'resolu' THEN 1 END) AS suivis_resolus,
  AVG(spc.gravite) AS gravite_moyenne,
  COUNT(DISTINCT hg.id) AS total_historique_entries,
  AVG(hg.etat_mental) AS etat_mental_moyen,
  AVG(hg.etat_spirituel) AS etat_spirituel_moyen,
  AVG(hg.etat_physique) AS etat_physique_moyen,
  MAX(spc.updated_at) AS derniere_mise_a_jour
FROM suivi_post_crise spc
LEFT JOIN historique_guerison hg ON hg.suivi_id = spc.id
GROUP BY spc.user_id;

-- Index pour la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_suivi_stats_user_id ON mv_suivi_post_crise_stats(user_id);

-- ----------------------------------------
-- Vue : Statistiques de transformation par utilisateur
-- ----------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_transformation_stats AS
SELECT 
  p.id AS user_id,
  COUNT(DISTINCT jt.id) AS total_journal_entries,
  COUNT(DISTINCT upp.id) AS total_parcours_inscrits,
  COUNT(DISTINCT CASE WHEN upp.statut = 'termine' THEN upp.id END) AS parcours_termines,
  COUNT(DISTINCT ec.id) AS total_evaluations,
  AVG(ec.score) AS score_moyen_evaluations,
  MAX(jt.created_at) AS derniere_entree_journal,
  MAX(upp.updated_at) AS derniere_progression_parcours
FROM profils p
LEFT JOIN journal_transformation jt ON jt.user_id = p.id
LEFT JOIN user_parcours_progression upp ON upp.user_id = p.id
LEFT JOIN evaluations_croissance ec ON ec.user_id = p.id
GROUP BY p.id;

-- Index pour la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_transformation_stats_user_id ON mv_transformation_stats(user_id);

-- ----------------------------------------
-- Vue : Alertes et rappels pour les dashboards
-- ----------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_alerts AS
SELECT 
  p.id AS user_id,
  p.famille_id,
  p.role,
  -- Alertes de suivi post-crise
  COUNT(DISTINCT CASE 
    WHEN spc.rappel_actif = true 
    AND spc.statut IN ('actif', 'en_amelioration')
    AND (spc.prochain_rappel IS NULL OR spc.prochain_rappel <= NOW() + INTERVAL '24 hours')
    THEN spc.id 
  END) AS rappels_suivi_en_attente,
  -- Alertes de parcours inactifs
  COUNT(DISTINCT CASE 
    WHEN upp.statut = 'en_cours' 
    AND upp.updated_at < NOW() - INTERVAL '7 days'
    THEN upp.id 
  END) AS parcours_inactifs,
  -- Alertes de journal (pas d'entrée depuis 7 jours)
  CASE 
    WHEN MAX(jt.created_at) < NOW() - INTERVAL '7 days' OR MAX(jt.created_at) IS NULL
    THEN 1 
    ELSE 0 
  END AS journal_inactif,
  -- Date de dernière activité globale
  GREATEST(
    COALESCE(MAX(jt.created_at), '1970-01-01'::timestamp),
    COALESCE(MAX(upp.updated_at), '1970-01-01'::timestamp),
    COALESCE(MAX(spc.updated_at), '1970-01-01'::timestamp)
  ) AS derniere_activite
FROM profils p
LEFT JOIN journal_transformation jt ON jt.user_id = p.id
LEFT JOIN user_parcours_progression upp ON upp.user_id = p.id
LEFT JOIN suivi_post_crise spc ON spc.user_id = p.id
GROUP BY p.id, p.famille_id, p.role;

-- Index pour la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_alerts_user_id ON mv_dashboard_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_dashboard_alerts_famille_id ON mv_dashboard_alerts(famille_id);
CREATE INDEX IF NOT EXISTS idx_mv_dashboard_alerts_role ON mv_dashboard_alerts(role);

-- ----------------------------------------
-- Fonction pour rafraîchir toutes les vues matérialisées
-- ----------------------------------------
CREATE OR REPLACE FUNCTION refresh_all_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_famille_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_suivi_post_crise_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_transformation_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_alerts;
  
  RAISE NOTICE 'Toutes les vues matérialisées ont été rafraîchies';
END;
$$;

-- ----------------------------------------
-- Fonction pour rafraîchir automatiquement les vues (à appeler périodiquement)
-- Exemple : via un cron job toutes les heures
-- ----------------------------------------
CREATE OR REPLACE FUNCTION auto_refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Rafraîchir uniquement si la dernière mise à jour date de plus de 1 heure
  -- (À adapter selon vos besoins)
  PERFORM refresh_all_dashboard_views();
END;
$$;

-- ----------------------------------------
-- Index supplémentaires pour optimiser les requêtes
-- ----------------------------------------

-- Index sur les tables de base
CREATE INDEX IF NOT EXISTS idx_profils_famille_role ON profils(famille_id, role);
CREATE INDEX IF NOT EXISTS idx_profils_mentor_id ON profils(mentor_id);
CREATE INDEX IF NOT EXISTS idx_profils_spiritual_stage ON profils(spiritual_stage);

CREATE INDEX IF NOT EXISTS idx_journal_user_created ON journal_transformation(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_thematique ON journal_transformation(thematique);

CREATE INDEX IF NOT EXISTS idx_upp_user_statut ON user_parcours_progression(user_id, statut);
CREATE INDEX IF NOT EXISTS idx_upp_parcours_statut ON user_parcours_progression(parcours_id, statut);
CREATE INDEX IF NOT EXISTS idx_upp_updated ON user_parcours_progression(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_evaluations_user_date ON evaluations_croissance(user_id, date_evaluation DESC);
CREATE INDEX IF NOT EXISTS idx_evaluations_type_domaine ON evaluations_croissance(type_evaluation, domaine_evalue);

-- Index pour les recherches fréquentes
-- Note : Nécessite l'extension pg_trgm pour les recherches floues
-- Si l'extension n'est pas disponible, ces index ne seront pas créés
DO $$
BEGIN
  -- Vérifier si l'extension pg_trgm est disponible
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    -- Créer les index avec pg_trgm
    CREATE INDEX IF NOT EXISTS idx_familles_nom_trgm ON familles_disciples USING gin(nom gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_profils_full_name_trgm ON profils USING gin((first_name || ' ' || last_name) gin_trgm_ops);
    RAISE NOTICE 'Index de recherche floue créés avec pg_trgm';
  ELSE
    -- Créer des index B-tree standard à la place
    CREATE INDEX IF NOT EXISTS idx_familles_nom_btree ON familles_disciples(nom);
    CREATE INDEX IF NOT EXISTS idx_profils_first_name_btree ON profils(first_name);
    CREATE INDEX IF NOT EXISTS idx_profils_last_name_btree ON profils(last_name);
    RAISE NOTICE 'Index standard créés (pg_trgm non disponible). Pour activer la recherche floue, exécutez : CREATE EXTENSION IF NOT EXISTS pg_trgm;';
  END IF;
END $$;

-- ----------------------------------------
-- Commentaires pour la documentation
-- ----------------------------------------
COMMENT ON MATERIALIZED VIEW mv_famille_stats IS 'Statistiques pré-calculées par famille pour les dashboards';
COMMENT ON MATERIALIZED VIEW mv_suivi_post_crise_stats IS 'Statistiques de suivi post-crise par utilisateur';
COMMENT ON MATERIALIZED VIEW mv_transformation_stats IS 'Statistiques de transformation par utilisateur';
COMMENT ON MATERIALIZED VIEW mv_dashboard_alerts IS 'Alertes et rappels pour les dashboards';
COMMENT ON FUNCTION refresh_all_dashboard_views() IS 'Rafraîchit toutes les vues matérialisées des dashboards';
COMMENT ON FUNCTION auto_refresh_dashboard_views() IS 'Rafraîchissement automatique des vues (à appeler via cron)';

-- ----------------------------------------
-- Exemple d'utilisation
-- ----------------------------------------

-- Pour rafraîchir manuellement toutes les vues :
-- SELECT refresh_all_dashboard_views();

-- Pour consulter les statistiques d'une famille :
-- SELECT * FROM mv_famille_stats WHERE famille_id = 'UUID_DE_LA_FAMILLE';

-- Pour consulter les alertes d'un utilisateur :
-- SELECT * FROM mv_dashboard_alerts WHERE user_id = 'UUID_DE_L_UTILISATEUR';

-- ----------------------------------------
-- Configuration recommandée pour le rafraîchissement automatique
-- ----------------------------------------

-- Option 1 : Via pg_cron (si disponible)
-- SELECT cron.schedule('refresh-dashboard-views', '0 * * * *', 'SELECT auto_refresh_dashboard_views()');

-- Option 2 : Via un trigger (rafraîchissement après chaque modification importante)
-- Note : Peut impacter les performances si les tables sont très volumineuses
/*
CREATE OR REPLACE FUNCTION trigger_refresh_dashboard_views()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_all_dashboard_views();
  RETURN NEW;
END;
$$;

CREATE TRIGGER refresh_views_after_journal
AFTER INSERT OR UPDATE OR DELETE ON journal_transformation
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_dashboard_views();
*/
