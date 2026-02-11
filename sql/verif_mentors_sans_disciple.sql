-- ============================================
-- Combien de mentors ont 0 disciple ?
-- Règle : un mentor doit avoir au moins 1 disciple, sinon c'est un simple disciple.
-- ============================================

-- Nombre total de mentors sans aucun disciple
SELECT COUNT(*) AS nb_mentors_sans_disciple
FROM profils p
WHERE p.role IN ('mentor', 'pilier')
  AND (SELECT COUNT(*) FROM profils q WHERE q.mentor_id = p.id) = 0;

-- Détail : liste des mentors sans disciple (prénom, nom, famille, email)
SELECT
  p.id,
  p.first_name AS prenom,
  p.last_name AS nom,
  p.email,
  f.nom AS famille,
  p.role
FROM profils p
LEFT JOIN familles_disciples f ON f.id = p.famille_id
WHERE p.role IN ('mentor', 'pilier')
  AND (SELECT COUNT(*) FROM profils q WHERE q.mentor_id = p.id) = 0
ORDER BY f.nom NULLS LAST, p.last_name, p.first_name;
