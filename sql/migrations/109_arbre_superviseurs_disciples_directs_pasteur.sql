-- ============================================
-- Migration 109 : Arbre généalogique – Les superviseurs sont les disciples directs du pasteur
-- Objectif : Synchroniser pasteur_id sur les superviseurs (depuis leur famille) et
--            familles_disciples.pasteur_id (depuis le superviseur si famille sans pasteur),
--            pour que l'arbre affiche bien Pasteur → 12 superviseurs → mentors → disciples.
-- ============================================

-- 1. Synchroniser profils.pasteur_id pour TOUS les superviseurs depuis leur famille
--    (chaque superviseur = disciple direct de son pasteur)
UPDATE profils p
SET pasteur_id = f.pasteur_id,
    updated_at = COALESCE(p.updated_at, NOW())
FROM familles_disciples f
WHERE f.superviseur_id = p.id
  AND p.role = 'superviseur'
  AND f.pasteur_id IS NOT NULL
  AND (p.pasteur_id IS DISTINCT FROM f.pasteur_id);

-- 2. Pour les familles sans pasteur_id : renseigner depuis le superviseur de la famille (si le superviseur a un pasteur_id)
UPDATE familles_disciples f
SET pasteur_id = p.pasteur_id
FROM profils p
WHERE p.id = f.superviseur_id
  AND p.role = 'superviseur'
  AND p.pasteur_id IS NOT NULL
  AND f.pasteur_id IS NULL;

-- 3. Superviseurs encore sans pasteur (famille sans pasteur ou pas de famille) : affecter au premier pasteur
UPDATE profils
SET pasteur_id = (
  SELECT id FROM profils
  WHERE role = 'pasteur'
  ORDER BY identifiant_unique NULLS LAST, created_at
  LIMIT 1
),
updated_at = NOW()
WHERE role = 'superviseur'
  AND pasteur_id IS NULL
  AND EXISTS (SELECT 1 FROM profils WHERE role = 'pasteur' LIMIT 1);

-- 4. (Optionnel) Mise à jour de profils.nb_disciples pour les PASTEURS = nombre de superviseurs directs
--    (pour cohérence affichage si utilisé en dehors de l'arbre ; l'arbre utilise la RPC qui recalcule)
UPDATE profils pasteur
SET nb_disciples = COALESCE((
  SELECT COUNT(*)::INTEGER
  FROM profils s
  WHERE s.role = 'superviseur'
    AND (s.pasteur_id = pasteur.id OR EXISTS (
      SELECT 1 FROM familles_disciples f
      WHERE f.superviseur_id = s.id AND f.pasteur_id = pasteur.id
    ))
), 0),
updated_at = COALESCE(pasteur.updated_at, NOW())
WHERE pasteur.role = 'pasteur';

COMMENT ON FUNCTION get_arbre_4_niveaux(UUID) IS
'Arbre 4 niveaux : Pasteur (disciples directs = superviseurs) → Superviseur → Mentor → Disciple. Migration 103. Complété par 109 (sync pasteur_id).';
