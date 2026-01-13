-- ============================================
-- OBJECTIF 2: Données de test - Badges et Programmes
-- Insertion de badges et programmes de test
-- ============================================

-- 1. BADGES DE TEST

-- Badges de présence
INSERT INTO badges (nom, description, icone, points_requis, categorie, statut, conditions)
VALUES
  ('Premier Pas', 'Assister à votre premier culte', '👣', 10, 'presence', 'actif', '{"presences_min": 1}'::jsonb),
  ('Fidèle', 'Assister à 4 cultes dans le mois', '⛪', 40, 'presence', 'actif', '{"presences_min": 4}'::jsonb),
  ('Assidu', 'Assister à 8 cultes dans le mois', '🙏', 80, 'presence', 'actif', '{"presences_min": 8}'::jsonb),
  ('Pilier', 'Assister à 12 cultes dans le mois', '🏛️', 120, 'presence', 'actif', '{"presences_min": 12}'::jsonb),

-- Badges de prière
  ('Guerrier de Prière', 'Planifier 5 prières', '⚔️', 25, 'priere', 'actif', '{"prieres_min": 5}'::jsonb),
  ('Intercesseur', 'Planifier 10 prières', '🛡️', 50, 'priere', 'actif', '{"prieres_min": 10}'::jsonb),
  ('Maître de Prière', 'Planifier 20 prières', '👑', 100, 'priere', 'actif', '{"prieres_min": 20}'::jsonb),

-- Badges de ressources
  ('Apprenti', 'Consulter 5 ressources', '📚', 15, 'resource', 'actif', '{"resources_min": 5}'::jsonb),
  ('Étudiant', 'Consulter 10 ressources', '🎓', 30, 'resource', 'actif', '{"resources_min": 10}'::jsonb),
  ('Érudit', 'Consulter 15 ressources', '📖', 45, 'resource', 'actif', '{"resources_min": 15}'::jsonb),
  ('Sage', 'Consulter 30 ressources', '🧙', 90, 'resource', 'actif', '{"resources_min": 30}'::jsonb),

-- Badges de service
  ('Serviteur', 'Effectuer 1 service', '🤝', 15, 'service', 'actif', '{"services_min": 1}'::jsonb),
  ('Bénévole', 'Effectuer 3 services', '💪', 45, 'service', 'actif', '{"services_min": 3}'::jsonb),
  ('Ministre', 'Effectuer 5 services', '🌟', 75, 'service', 'actif', '{"services_min": 5}'::jsonb),

-- Badges de communauté
  ('Connecté', '3 interactions communautaires', '👥', 15, 'communaute', 'actif', '{"interactions_min": 3}'::jsonb),
  ('Actif', '10 interactions communautaires', '🔥', 50, 'communaute', 'actif', '{"interactions_min": 10}'::jsonb),
  ('Leader', '20 interactions communautaires', '⭐', 100, 'communaute', 'actif', '{"interactions_min": 20}'::jsonb),

-- Badges généraux
  ('Débutant', 'Atteindre 50 points au total', '🌱', 50, 'general', 'actif', '{}'::jsonb),
  ('Engagé', 'Atteindre 150 points au total', '💎', 150, 'general', 'actif', '{}'::jsonb),
  ('Passionné', 'Atteindre 300 points au total', '🔥', 300, 'general', 'actif', '{}'::jsonb),
  ('Dévoué', 'Atteindre 500 points au total', '👑', 500, 'general', 'actif', '{}'::jsonb),
  ('Exemplaire', 'Atteindre 1000 points au total', '🏆', 1000, 'general', 'actif', '{}'::jsonb),

-- Badges spéciaux
  ('Équilibré', 'Avoir des points dans toutes les catégories', '⚖️', 0, 'special', 'actif', '{"toutes_categories": true}'::jsonb),
  ('Constance', '7 jours consécutifs d''activité', '📅', 0, 'special', 'actif', '{"jours_consecutifs": 7}'::jsonb),
  ('Persévérance', '30 jours consécutifs d''activité', '💫', 0, 'special', 'actif', '{"jours_consecutifs": 30}'::jsonb),
  ('Faiseur de Disciples', 'Former 5 disciples', '🌱', 0, 'special', 'actif', '{"disciples_forms": 5}'::jsonb),
  ('Évangéliste', 'Partager l''évangile avec 10 personnes', '📢', 0, 'special', 'actif', '{"personnes_evangelisees": 10}'::jsonb),
  ('Champion', 'Atteindre 2000 points au total', '🏅', 2000, 'general', 'actif', '{}'::jsonb)
ON CONFLICT (nom) DO NOTHING;

-- 2. PROGRAMMES DE FIDÉLISATION DE TEST

INSERT INTO programmes_fidelisation (nom, description, duree_jours, objectifs, recompenses, statut, date_debut, date_fin)
VALUES
  (
    'Défi 21 Jours de Prière',
    'Un défi de 21 jours pour développer une vie de prière régulière. Chaque jour, priez pendant au moins 15 minutes et enregistrez votre prière.',
    21,
    '[
      {"jour": 1, "objectif": "Prier 15 minutes", "points": 5},
      {"jour": 7, "objectif": "Prier 7 jours consécutifs", "points": 20},
      {"jour": 14, "objectif": "Prier 14 jours consécutifs", "points": 30},
      {"jour": 21, "objectif": "Terminer le défi complet", "points": 50}
    ]'::jsonb,
    '{"badge": "Guerrier de Prière", "points_bonus": 100}'::jsonb,
    'actif',
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '90 days')
  ),
  (
    'Défi Présence Mensuel',
    'Assistez à tous les cultes du mois pour recevoir un badge spécial et des points bonus.',
    30,
    '[
      {"objectif": "Assister à 4 cultes", "points": 40},
      {"objectif": "Assister à 8 cultes", "points": 80},
      {"objectif": "Assister à 12 cultes", "points": 120}
    ]'::jsonb,
    '{"badge": "Pilier", "points_bonus": 50}'::jsonb,
    'actif',
    DATE_TRUNC('month', CURRENT_DATE),
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')
  ),
  (
    'Parcours de Croissance',
    'Un parcours complet de 60 jours pour développer votre engagement dans tous les domaines : présence, prière, ressources, service et communauté.',
    60,
    '[
      {"semaine": 1, "objectif": "Atteindre 50 points", "points": 25},
      {"semaine": 2, "objectif": "Atteindre 100 points", "points": 50},
      {"semaine": 4, "objectif": "Atteindre 200 points", "points": 100},
      {"semaine": 8, "objectif": "Terminer le parcours", "points": 200}
    ]'::jsonb,
    '{"badge": "Passionné", "points_bonus": 300}'::jsonb,
    'actif',
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '90 days')
  ),
  (
    'Défi Service Communautaire',
    'S''engager dans le service de la communauté pendant 30 jours. Effectuez au moins 3 services différents.',
    30,
    '[
      {"objectif": "Effectuer 1 service", "points": 15},
      {"objectif": "Effectuer 2 services", "points": 30},
      {"objectif": "Effectuer 3 services", "points": 45}
    ]'::jsonb,
    '{"badge": "Bénévole", "points_bonus": 100}'::jsonb,
    'actif',
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '60 days')
  ),
  (
    'Défi Lecture Biblique',
    'Lisez et méditez sur la Parole de Dieu pendant 30 jours. Consultez au moins 15 ressources bibliques.',
    30,
    '[
      {"objectif": "Consulter 5 ressources", "points": 15},
      {"objectif": "Consulter 10 ressources", "points": 30},
      {"objectif": "Consulter 15 ressources", "points": 45}
    ]'::jsonb,
    '{"badge": "Érudit", "points_bonus": 100}'::jsonb,
    'actif',
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '60 days')
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE badges IS 'Badges de test insérés pour l''Objectif 2';
COMMENT ON TABLE programmes_fidelisation IS 'Programmes de test insérés pour l''Objectif 2';

