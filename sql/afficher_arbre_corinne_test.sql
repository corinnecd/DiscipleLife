-- ============================================
-- Afficher l'arbre généalogique de Corinne Test
-- Exécuter dans Supabase SQL Editor
-- ============================================

DO $$
DECLARE
  v_profil_id UUID;
  v_nom_complet TEXT;
  v_role TEXT;
  v_famille_nom TEXT;
  v_mentor_nom TEXT;
  rec RECORD;
  v_niveau INT;
  v_prefix TEXT;
  v_enfants INT;
BEGIN
  -- Trouver le profil Corinne Test (first_name = Corinne, last_name = Test ou nom similaire)
  SELECT p.id, 
         TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS nom,
         p.role,
         COALESCE(f.nom, '—') AS famille
  INTO v_profil_id, v_nom_complet, v_role, v_famille_nom
  FROM profils p
  LEFT JOIN familles_disciples f ON f.id = p.famille_id
  WHERE UPPER(TRIM(p.first_name)) = 'CORINNE'
    AND (UPPER(TRIM(p.last_name)) = 'TEST' OR UPPER(TRIM(p.last_name)) LIKE 'TEST%')
  LIMIT 1;

  IF v_profil_id IS NULL THEN
    RAISE NOTICE '❌ Profil "Corinne Test" introuvable.';
    RAISE NOTICE 'Vérifiez que le profil existe : SELECT id, first_name, last_name, role FROM profils WHERE first_name ILIKE ''%%corinne%%'';';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '  ARBRE GÉNÉALOGIQUE DE : %', v_nom_complet;
  RAISE NOTICE '  Rôle : % | Famille : %', v_role, v_famille_nom;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Mentor (ascendant)
  SELECT TRIM(COALESCE(m.first_name, '') || ' ' || COALESCE(m.last_name, '')) INTO v_mentor_nom
  FROM profils m
  JOIN profils p ON p.mentor_id = m.id
  WHERE p.id = v_profil_id;

  IF v_mentor_nom IS NOT NULL THEN
    RAISE NOTICE '  ↑ Mentor : %', v_mentor_nom;
    RAISE NOTICE '';
  END IF;

  -- Corinne Test (racine affichée)
  RAISE NOTICE '  ■ % [%]', v_nom_complet, v_role;
  RAISE NOTICE '  │';

  -- Descendants (récursif via CTE)
  FOR rec IN
    WITH RECURSIVE arbre AS (
      SELECT id, first_name, last_name, role, mentor_id, 1 AS niv
      FROM profils
      WHERE mentor_id = v_profil_id
      UNION ALL
      SELECT p.id, p.first_name, p.last_name, p.role, p.mentor_id, a.niv + 1
      FROM profils p
      JOIN arbre a ON p.mentor_id = a.id
      WHERE a.niv < 5
    )
    SELECT a.niv,
           TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')) AS nom,
           a.role,
           (SELECT COUNT(*) FROM profils c WHERE c.mentor_id = a.id) AS nb_enfants
    FROM arbre a
    ORDER BY a.niv, nom
  LOOP
    v_prefix := REPEAT('  │ ', rec.niv);
    IF rec.nb_enfants > 0 THEN
      RAISE NOTICE '%├── % [%] (% disciples)', v_prefix, rec.nom, rec.role, rec.nb_enfants;
    ELSE
      RAISE NOTICE '%└── % [%]', v_prefix, rec.nom, rec.role;
    END IF;
  END LOOP;

  -- Nombre total de disciples (directs + indirects)
  SELECT COUNT(*) INTO v_enfants
  FROM (
    WITH RECURSIVE arbre AS (
      SELECT id FROM profils WHERE mentor_id = v_profil_id
      UNION ALL
      SELECT p.id FROM profils p
      JOIN arbre a ON p.mentor_id = a.id
    )
    SELECT 1 FROM arbre
  ) t;

  RAISE NOTICE '';
  RAISE NOTICE '───────────────────────────────────────────────────────────────';
  RAISE NOTICE '  Total : % disciple(s) dans la lignée', COALESCE(v_enfants, 0);
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Alternative : vue tabulaire simple
SELECT 
  p.id,
  TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS nom_complet,
  p.role,
  TRIM(COALESCE(m.first_name, '') || ' ' || COALESCE(m.last_name, '')) AS mentor,
  (SELECT COUNT(*) FROM profils c WHERE c.mentor_id = p.id) AS nb_disciples_directs
FROM profils p
LEFT JOIN profils m ON m.id = p.mentor_id
WHERE UPPER(TRIM(p.first_name)) = 'CORINNE'
  AND (UPPER(TRIM(p.last_name)) = 'TEST' OR UPPER(TRIM(p.last_name)) LIKE 'TEST%');
