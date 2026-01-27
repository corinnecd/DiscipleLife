-- ============================================
-- SCRIPT DE SEED DATA POUR TESTS (VERSION COMPLÈTE ADAPTÉE)
-- ⚠️ IMPORTANT: Les pasteurs, superviseurs et familles EXISTENT DÉJÀ dans Supabase
-- Ce script crée UNIQUEMENT: ~170 disciples/mentors, 5 lignées, 5 générations, KPI présence, sujets prière
-- ============================================

-- ============================================
-- ÉTAPE 0: NETTOYAGE - Supprimer les anciens disciples de test
-- ============================================
DO $$
DECLARE
  v_count_presences INTEGER;
  v_count_prieres INTEGER;
  v_count_profils INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 0: NETTOYAGE DES ANCIENNES DONNÉES DE TEST';
  RAISE NOTICE '========================================';

  -- Supprimer les présences des disciples de test
  DELETE FROM attendance_tracking
  WHERE disciple_id IN (
    SELECT id FROM profils WHERE email LIKE '%@test.icc.ga'
  );
  GET DIAGNOSTICS v_count_presences = ROW_COUNT;
  RAISE NOTICE '✅ Supprimé % présences (attendance_tracking)', v_count_presences;

  -- Supprimer les sujets de prière des disciples de test
  DELETE FROM prayer_requests
  WHERE user_id IN (
    SELECT id FROM profils WHERE email LIKE '%@test.icc.ga'
  );
  GET DIAGNOSTICS v_count_prieres = ROW_COUNT;
  RAISE NOTICE '✅ Supprimé % sujets de prière (prayer_requests)', v_count_prieres;

  -- Supprimer les profils de test (CASCADE supprimera les dépendances)
  DELETE FROM profils WHERE email LIKE '%@test.icc.ga';
  GET DIAGNOSTICS v_count_profils = ROW_COUNT;
  RAISE NOTICE '✅ Supprimé % profils de test', v_count_profils;

  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ÉTAPE 1: VÉRIFICATION DES DONNÉES EXISTANTES
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 1: VÉRIFICATION DES DONNÉES EXISTANTES';
  RAISE NOTICE '========================================';

  -- Vérifier pasteurs
  IF (SELECT COUNT(*) FROM profils WHERE role IN ('pasteur', 'admin')) < 1 THEN
    RAISE EXCEPTION 'ERREUR: Aucun pasteur trouvé dans la base de données. Veuillez créer les pasteurs d''abord.';
  END IF;

  -- Vérifier superviseurs
  IF (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') < 1 THEN
    RAISE EXCEPTION 'ERREUR: Aucun superviseur trouvé dans la base de données. Veuillez créer les superviseurs d''abord.';
  END IF;

  -- Vérifier familles
  IF (SELECT COUNT(*) FROM familles_disciples) < 1 THEN
    RAISE EXCEPTION 'ERREUR: Aucune famille trouvée dans la base de données. Veuillez créer les familles d''abord.';
  END IF;

  RAISE NOTICE '✅ Vérification OK: % pasteurs, % superviseurs, % familles trouvés',
    (SELECT COUNT(*) FROM profils WHERE role IN ('pasteur', 'admin')),
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur'),
    (SELECT COUNT(*) FROM familles_disciples);

  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ÉTAPE 2: RÉCUPÉRATION DES IDS EXISTANTS
-- ============================================
DO $$
DECLARE
  famille_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 2: RÉCUPÉRATION DES FAMILLES EXISTANTES';
  RAISE NOTICE '========================================';

  -- Créer une table temporaire pour stocker les familles et leurs superviseurs
  DROP TABLE IF EXISTS temp_familles_superviseurs;
  CREATE TEMP TABLE temp_familles_superviseurs AS
  SELECT
    fd.id as famille_id,
    fd.nom as famille_nom,
    fd.superviseur_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Superviseur Inconnu') as superviseur_nom
  FROM familles_disciples fd
  LEFT JOIN profils p ON p.id = fd.superviseur_id
  WHERE fd.superviseur_id IS NOT NULL;

  -- Afficher les familles trouvées pour validation
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FAMILLES EXISTANTES TROUVÉES:';
  RAISE NOTICE '========================================';
  FOR famille_record IN SELECT * FROM temp_familles_superviseurs ORDER BY famille_nom LOOP
    RAISE NOTICE 'Famille: % (Superviseur: %)', famille_record.famille_nom, famille_record.superviseur_nom;
  END LOOP;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total: % familles trouvées', (SELECT COUNT(*) FROM temp_familles_superviseurs);
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ÉTAPE 3: CRÉATION DES DISCIPLES/MENTORS POUR TOUTES LES FAMILLES
-- ============================================
DO $$
DECLARE
  famille_record RECORD;
  superviseur_id_var UUID;
  famille_id_var UUID;

  -- IDs des mentors (génération 1) pour créer des lignées
  mentor1_id UUID; -- Lignée 1: Très profonde (5 générations)
  mentor2_id UUID; -- Lignée 2: Large (4 générations, multiples branches)
  mentor3_id UUID; -- Lignée 3: Moyenne (4 générations)
  mentor4_id UUID; -- Lignée 4: Simple (3 générations)
  mentor5_id UUID; -- Lignée 5: Simple (3 générations)

  -- IDs génération 2
  disciple_g2_1 UUID; -- Lignée 1
  disciple_g2_2 UUID; -- Lignée 2
  disciple_g2_3 UUID; -- Lignée 2
  disciple_g2_4 UUID; -- Lignée 3

  -- IDs génération 3
  disciple_g3_1 UUID; -- Lignée 1
  disciple_g3_2 UUID; -- Lignée 3

  -- IDs génération 4
  disciple_g4_1 UUID; -- Lignée 1
  disciple_g4_2 UUID; -- Lignée 3

  nb_familles_traitees INT := 0;
  total_disciples_crees INT := 0;

BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 3: CRÉATION DES DISCIPLES/MENTORS';
  RAISE NOTICE '========================================';

  -- Boucle sur chaque famille existante
  FOR famille_record IN SELECT * FROM temp_familles_superviseurs ORDER BY famille_nom LOOP

    famille_id_var := famille_record.famille_id;
    superviseur_id_var := famille_record.superviseur_id;

    RAISE NOTICE '';
    RAISE NOTICE '--- Traitement famille: % (Superviseur: %)', famille_record.famille_nom, famille_record.superviseur_nom;

    -- =====================================
    -- GÉNÉRATION 1: Disciples directs du superviseur
    -- =====================================

    -- LIGNÉE 1 PROFONDE (5 générations) - Mentor 1: Pierre MARTIN
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'pierre.martin.' || nb_familles_traitees || '@test.icc.ga',
      'Pierre', 'MARTIN', 'mentor', famille_id_var, superviseur_id_var, NOW()
    )
    RETURNING id INTO mentor1_id;
    total_disciples_crees := total_disciples_crees + 1;

    -- LIGNÉE 2 LARGE (4 générations, plusieurs branches) - Mentor 2: Grace ONDONGO
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'sophie.bernard.' || nb_familles_traitees || '@test.icc.ga',
      'Sophie', 'BERNARD', 'mentor', famille_id_var, superviseur_id_var, NOW()
    )
    RETURNING id INTO mentor2_id;
    total_disciples_crees := total_disciples_crees + 1;

    -- LIGNÉE 3 MOYENNE (4 générations) - Mentor 3: André MINTSA
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'andre.dubois.' || nb_familles_traitees || '@test.icc.ga',
      'André', 'DUBOIS', 'mentor', famille_id_var, superviseur_id_var, NOW()
    )
    RETURNING id INTO mentor3_id;
    total_disciples_crees := total_disciples_crees + 1;

    -- LIGNÉE 4 SIMPLE (3 générations) - Mentor 4: Esther EYENE
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'isabelle.mercier.' || nb_familles_traitees || '@test.icc.ga',
      'Isabelle', 'MERCIER', 'mentor', famille_id_var, superviseur_id_var, NOW()
    )
    RETURNING id INTO mentor4_id;
    total_disciples_crees := total_disciples_crees + 1;

    -- LIGNÉE 5 SIMPLE (3 générations) - Mentor 5: Jacques ONDO
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'jacques.petit.' || nb_familles_traitees || '@test.icc.ga',
      'Jacques', 'PETIT', 'mentor', famille_id_var, superviseur_id_var, NOW()
    )
    RETURNING id INTO mentor5_id;
    total_disciples_crees := total_disciples_crees + 1;

    -- DISCIPLES SIMPLES (Génération 1, sans descendants) - 10 disciples
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES
      (gen_random_uuid(), 'luc.robert.' || nb_familles_traitees || '@test.icc.ga', 'Luc', 'ROBERT', 'disciple', famille_id_var, superviseur_id_var, NOW()),
      (gen_random_uuid(), 'alice.laurent.' || nb_familles_traitees || '@test.icc.ga', 'Alice', 'LAURENT', 'disciple', famille_id_var, superviseur_id_var, NOW()),
      (gen_random_uuid(), 'martine.simon.' || nb_familles_traitees || '@test.icc.ga', 'Martine', 'SIMON', 'disciple', famille_id_var, superviseur_id_var, NOW()),
      (gen_random_uuid(), 'joseph.michel.' || nb_familles_traitees || '@test.icc.ga', 'Joseph', 'MICHEL', 'disciple', famille_id_var, superviseur_id_var, NOW()),
      (gen_random_uuid(), 'christine.lefevre.' || nb_familles_traitees || '@test.icc.ga', 'Christine', 'LEFEVRE', 'disciple', famille_id_var, superviseur_id_var, NOW()),
      (gen_random_uuid(), 'daniel.garcia.' || nb_familles_traitees || '@test.icc.ga', 'Daniel', 'GARCIA', 'disciple', famille_id_var, superviseur_id_var, NOW()),
      (gen_random_uuid(), 'sandrine.roux.' || nb_familles_traitees || '@test.icc.ga', 'Sandrine', 'ROUX', 'disciple', famille_id_var, superviseur_id_var, NOW()),
      (gen_random_uuid(), 'eric.morel.' || nb_familles_traitees || '@test.icc.ga', 'Éric', 'MOREL', 'disciple', famille_id_var, superviseur_id_var, NOW()),
      (gen_random_uuid(), 'valerie.fournier.' || nb_familles_traitees || '@test.icc.ga', 'Valérie', 'FOURNIER', 'disciple', famille_id_var, superviseur_id_var, NOW()),
      (gen_random_uuid(), 'franck.girard.' || nb_familles_traitees || '@test.icc.ga', 'Franck', 'GIRARD', 'disciple', famille_id_var, superviseur_id_var, NOW());
    total_disciples_crees := total_disciples_crees + 10;

    -- =====================================
    -- GÉNÉRATION 2: Disciples des mentors
    -- =====================================

    -- Lignée 1: Mentor1 → 1 disciple (qui deviendra mentor pour génération 3)
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'jean.dupont.' || nb_familles_traitees || '@test.icc.ga',
      'Jean', 'DUPONT', 'mentor', famille_id_var, mentor1_id, NOW()
    )
    RETURNING id INTO disciple_g2_1;
    total_disciples_crees := total_disciples_crees + 1;

    -- Lignée 2: Mentor2 → 3 disciples (dont 2 deviendront mentors)
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'david.moreau.' || nb_familles_traitees || '@test.icc.ga',
      'David', 'MOREAU', 'mentor', famille_id_var, mentor2_id, NOW()
    )
    RETURNING id INTO disciple_g2_2;
    total_disciples_crees := total_disciples_crees + 1;

    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'samuel.lambert.' || nb_familles_traitees || '@test.icc.ga',
      'Samuel', 'LAMBERT', 'mentor', famille_id_var, mentor2_id, NOW()
    )
    RETURNING id INTO disciple_g2_3;
    total_disciples_crees := total_disciples_crees + 1;

    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'julie.fontaine.' || nb_familles_traitees || '@test.icc.ga',
      'Julie', 'FONTAINE', 'disciple', famille_id_var, mentor2_id, NOW()
    );
    total_disciples_crees := total_disciples_crees + 1;

    -- Lignée 3: Mentor3 → 2 disciples (dont 1 deviendra mentor)
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'claire.rousseau.' || nb_familles_traitees || '@test.icc.ga',
      'Claire', 'ROUSSEAU', 'mentor', famille_id_var, mentor3_id, NOW()
    )
    RETURNING id INTO disciple_g2_4;
    total_disciples_crees := total_disciples_crees + 1;

    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'paul.vincent.' || nb_familles_traitees || '@test.icc.ga',
      'Paul', 'VINCENT', 'disciple', famille_id_var, mentor3_id, NOW()
    );
    total_disciples_crees := total_disciples_crees + 1;

    -- Lignée 4: Mentor4 → 2 disciples simples
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES
      (gen_random_uuid(), 'sarah.chevalier.' || nb_familles_traitees || '@test.icc.ga', 'Sarah', 'CHEVALIER', 'disciple', famille_id_var, mentor4_id, NOW()),
      (gen_random_uuid(), 'patrick.bonnet.' || nb_familles_traitees || '@test.icc.ga', 'Patrick', 'BONNET', 'disciple', famille_id_var, mentor4_id, NOW());
    total_disciples_crees := total_disciples_crees + 2;

    -- Lignée 5: Mentor5 → 3 disciples simples
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES
      (gen_random_uuid(), 'marie.blanc.' || nb_familles_traitees || '@test.icc.ga', 'Marie', 'BLANC', 'disciple', famille_id_var, mentor5_id, NOW()),
      (gen_random_uuid(), 'thomas.muller.' || nb_familles_traitees || '@test.icc.ga', 'Thomas', 'MULLER', 'disciple', famille_id_var, mentor5_id, NOW()),
      (gen_random_uuid(), 'rebecca.robin.' || nb_familles_traitees || '@test.icc.ga', 'Rebecca', 'ROBIN', 'disciple', famille_id_var, mentor5_id, NOW());
    total_disciples_crees := total_disciples_crees + 3;

    -- =====================================
    -- GÉNÉRATION 3: Petits-disciples
    -- =====================================

    -- Lignée 1: disciple_g2_1 (Jean MBIANDA) → 1 disciple (qui deviendra mentor pour G4)
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'thierry.renard.' || nb_familles_traitees || '@test.icc.ga',
      'Thierry', 'RENARD', 'mentor', famille_id_var, disciple_g2_1, NOW()
    )
    RETURNING id INTO disciple_g3_1;
    total_disciples_crees := total_disciples_crees + 1;

    -- Lignée 2: disciple_g2_2 (David AKONO) → 2 disciples (dont 1 mentor)
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'nadine.giraud.' || nb_familles_traitees || '@test.icc.ga',
      'Nadine', 'GIRAUD', 'disciple', famille_id_var, disciple_g2_2, NOW()
    );
    total_disciples_crees := total_disciples_crees + 1;

    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'boris.andre.' || nb_familles_traitees || '@test.icc.ga',
      'Boris', 'ANDRE', 'disciple', famille_id_var, disciple_g2_2, NOW()
    );
    total_disciples_crees := total_disciples_crees + 1;

    -- Lignée 2: disciple_g2_3 (Samuel NTOUTOUME) → 1 disciple
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'melissa.henry.' || nb_familles_traitees || '@test.icc.ga',
      'Melissa', 'HENRY', 'disciple', famille_id_var, disciple_g2_3, NOW()
    );
    total_disciples_crees := total_disciples_crees + 1;

    -- Lignée 3: disciple_g2_4 (Claire OBAME) → 1 disciple (qui deviendra mentor pour G4)
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'kevin.lopez.' || nb_familles_traitees || '@test.icc.ga',
      'Kevin', 'LOPEZ', 'mentor', famille_id_var, disciple_g2_4, NOW()
    )
    RETURNING id INTO disciple_g3_2;
    total_disciples_crees := total_disciples_crees + 1;

    -- =====================================
    -- GÉNÉRATION 4: Arrière-petits-disciples
    -- =====================================

    -- Lignée 1: disciple_g3_1 (Thierry NGOMA) → 1 disciple (qui deviendra mentor pour G5)
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'patricia.martinez.' || nb_familles_traitees || '@test.icc.ga',
      'Patricia', 'MARTINEZ', 'mentor', famille_id_var, disciple_g3_1, NOW()
    )
    RETURNING id INTO disciple_g4_1;
    total_disciples_crees := total_disciples_crees + 1;

    -- Lignée 3: disciple_g3_2 (Kevin MAPAGA) → 1 disciple
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'steve.sanchez.' || nb_familles_traitees || '@test.icc.ga',
      'Steve', 'SANCHEZ', 'disciple', famille_id_var, disciple_g3_2, NOW()
    );
    total_disciples_crees := total_disciples_crees + 1;

    -- =====================================
    -- GÉNÉRATION 5: Très arrière-petits-disciples (rare, seulement lignée 1 profonde)
    -- =====================================

    -- Lignée 1 seulement (la plus profonde)
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      'benoit.dupuis.' || nb_familles_traitees || '@test.icc.ga',
      'Benoît', 'DUPUIS', 'disciple', famille_id_var, disciple_g4_1, NOW()
    );
    total_disciples_crees := total_disciples_crees + 1;

    nb_familles_traitees := nb_familles_traitees + 1;

    RAISE NOTICE '✅ Famille % traitée: 35 disciples créés sur 5 générations', famille_record.famille_nom;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CRÉATION TERMINÉE: % familles traitées', nb_familles_traitees;
  RAISE NOTICE '✅ Total disciples/mentors créés: %', total_disciples_crees;
  RAISE NOTICE '========================================';

END $$;

-- ============================================
-- ÉTAPE 4: CRÉATION DES DONNÉES DE PRÉSENCE (12 MOIS)
-- ============================================
DO $$
DECLARE
  disciple_record RECORD;
  activity_date DATE;
  activity_type TEXT;
  presence_status TEXT;
  absence_reason TEXT;
  taux_presence FLOAT;
  v_i INTEGER;
  total_presences_crees INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 4: CRÉATION DES DONNÉES DE PRÉSENCE';
  RAISE NOTICE '========================================';

  -- Pour chaque disciple
  FOR disciple_record IN
    SELECT id, first_name, last_name
    FROM profils
    WHERE role IN ('disciple', 'mentor') AND email LIKE '%@test.icc.ga'
  LOOP

    -- Déterminer le taux de présence selon le profil (30% très actif, 40% actif, 20% peu actif, 10% inactif)
    taux_presence := CASE
      WHEN random() < 0.30 THEN 0.85 + (random() * 0.15) -- 85-100%
      WHEN random() < 0.70 THEN 0.60 + (random() * 0.24) -- 60-84%
      WHEN random() < 0.90 THEN 0.30 + (random() * 0.29) -- 30-59%
      ELSE random() * 0.30 -- 0-30%
    END;

    -- Générer présences Culte Dimanche (52 derniers dimanches)
    FOR v_i IN 0..51 LOOP
      activity_date := CURRENT_DATE - ((v_i * 7) || ' days')::INTERVAL;

      IF random() < taux_presence THEN
        presence_status := 'present';
        absence_reason := NULL;
      ELSE
        presence_status := 'absent';
        absence_reason := CASE
          WHEN random() < 0.30 THEN 'Maladie'
          WHEN random() < 0.55 THEN 'Voyage'
          WHEN random() < 0.70 THEN 'Travail'
          WHEN random() < 0.80 THEN 'Famille'
          ELSE 'Inconnu'
        END;
      END IF;

      INSERT INTO attendance_tracking (disciple_id, attendance_date, attendance_type, status, absence_reason, created_at)
      VALUES (disciple_record.id, activity_date, 'culte_dimanche', presence_status, absence_reason, NOW());
      total_presences_crees := total_presences_crees + 1;
    END LOOP;

    -- Générer présences Culte Samedi (52 derniers samedis)
    FOR v_i IN 0..51 LOOP
      activity_date := CURRENT_DATE - ((v_i * 7 + 1) || ' days')::INTERVAL; -- Samedi

      IF random() < (taux_presence * 0.75) THEN -- Taux réduit pour samedi
        presence_status := 'present';
        absence_reason := NULL;
      ELSE
        presence_status := 'absent';
        absence_reason := CASE
          WHEN random() < 0.30 THEN 'Maladie'
          WHEN random() < 0.55 THEN 'Voyage'
          WHEN random() < 0.70 THEN 'Travail'
          WHEN random() < 0.80 THEN 'Famille'
          ELSE 'Inconnu'
        END;
      END IF;

      INSERT INTO attendance_tracking (disciple_id, attendance_date, attendance_type, status, absence_reason, created_at)
      VALUES (disciple_record.id, activity_date, 'culte_samedi', presence_status, absence_reason, NOW());
      total_presences_crees := total_presences_crees + 1;
    END LOOP;

    -- Générer présences After Culte (52 fois)
    FOR v_i IN 0..51 LOOP
      activity_date := CURRENT_DATE - ((v_i * 7) || ' days')::INTERVAL;

      IF random() < (taux_presence * 0.7) THEN
        presence_status := 'present';
        absence_reason := NULL;
      ELSE
        presence_status := 'absent';
        absence_reason := 'Non disponible';
      END IF;

      INSERT INTO attendance_tracking (disciple_id, attendance_date, attendance_type, status, absence_reason, created_at)
      VALUES (disciple_record.id, activity_date, 'after_culte', presence_status, absence_reason, NOW());
      total_presences_crees := total_presences_crees + 1;
    END LOOP;

    -- Générer présences Réunion de Prière (52 fois)
    FOR v_i IN 0..51 LOOP
      activity_date := CURRENT_DATE - ((v_i * 7 + 3) || ' days')::INTERVAL; -- Mercredi

      IF random() < (taux_presence * 0.65) THEN
        presence_status := 'present';
        absence_reason := NULL;
      ELSE
        presence_status := 'absent';
        absence_reason := 'Non disponible';
      END IF;

      INSERT INTO attendance_tracking (disciple_id, attendance_date, attendance_type, status, absence_reason, created_at)
      VALUES (disciple_record.id, activity_date, 'reunion_priere', presence_status, absence_reason, NOW());
      total_presences_crees := total_presences_crees + 1;
    END LOOP;

    -- Générer présences Veillée de Prière (12 fois - mensuel)
    FOR v_i IN 0..11 LOOP
      activity_date := CURRENT_DATE - ((v_i * 30) || ' days')::INTERVAL;

      IF random() < (taux_presence * 0.55) THEN
        presence_status := 'present';
        absence_reason := NULL;
      ELSE
        presence_status := 'absent';
        absence_reason := 'Non disponible';
      END IF;

      INSERT INTO attendance_tracking (disciple_id, attendance_date, attendance_type, status, absence_reason, created_at)
      VALUES (disciple_record.id, activity_date, 'veillee_priere', presence_status, absence_reason, NOW());
      total_presences_crees := total_presences_crees + 1;
    END LOOP;

    -- Générer présences Méditation Biblique (24 fois - bi-mensuel)
    FOR v_i IN 0..23 LOOP
      activity_date := CURRENT_DATE - ((v_i * 15) || ' days')::INTERVAL;

      IF random() < (taux_presence * 0.60) THEN
        presence_status := 'present';
        absence_reason := NULL;
      ELSE
        presence_status := 'absent';
        absence_reason := 'Non disponible';
      END IF;

      INSERT INTO attendance_tracking (disciple_id, attendance_date, attendance_type, status, absence_reason, created_at)
      VALUES (disciple_record.id, activity_date, 'meditation_biblique', presence_status, absence_reason, NOW());
      total_presences_crees := total_presences_crees + 1;
    END LOOP;

  END LOOP;

  RAISE NOTICE '✅ Total présences créées: %', total_presences_crees;
  RAISE NOTICE '========================================';

END $$;

-- ============================================
-- ÉTAPE 5: CRÉATION DES SUJETS DE PRIÈRE
-- ============================================
DO $$
DECLARE
  superviseur_record RECORD;
  disciple_record RECORD;
  nb_sujets INT;
  sujet_statut TEXT;
  sujet_categorie TEXT;
  sujet_titre TEXT;
  sujet_description TEXT;
  total_prieres_crees INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 5: CRÉATION DES SUJETS DE PRIÈRE';
  RAISE NOTICE '========================================';

  -- Pour chaque superviseur
  FOR superviseur_record IN
    SELECT DISTINCT p.id, p.first_name, p.last_name, fd.id as famille_id
    FROM profils p
    JOIN familles_disciples fd ON fd.superviseur_id = p.id
    WHERE p.role = 'superviseur'
  LOOP

    -- Nombre de sujets de prière pour ce superviseur (5-10)
    nb_sujets := 5 + floor(random() * 6)::INT;

    -- Récupérer les disciples de cette famille
    FOR disciple_record IN
      SELECT id, first_name, last_name
      FROM profils
      WHERE famille_id = superviseur_record.famille_id
        AND role IN ('disciple', 'mentor')
        AND email LIKE '%@test.icc.ga'
      ORDER BY random()
      LIMIT nb_sujets
    LOOP

      -- Déterminer statut du sujet (40% en_attente, 35% repondu, 20% en_cours, 5% annule)
      sujet_statut := CASE
        WHEN random() < 0.40 THEN 'en_attente'
        WHEN random() < 0.75 THEN 'repondu'
        WHEN random() < 0.95 THEN 'en_cours'
        ELSE 'annule'
      END;

      -- Déterminer catégorie (25% santé, 20% famille, 20% travail, 15% spirituel, 10% evangelisation, 10% autre)
      sujet_categorie := CASE
        WHEN random() < 0.25 THEN 'sante'
        WHEN random() < 0.45 THEN 'famille'
        WHEN random() < 0.65 THEN 'travail_finances'
        WHEN random() < 0.80 THEN 'spirituel'
        WHEN random() < 0.90 THEN 'evangelisation'
        ELSE 'autre'
      END;

      -- Générer titre et description selon catégorie
      CASE sujet_categorie
        WHEN 'sante' THEN
          sujet_titre := (ARRAY['Guérison de ma mère', 'Problème de santé chronique', 'Opération chirurgicale', 'Guérison divine'])[floor(random() * 4 + 1)];
          sujet_description := 'Prière pour guérison et restauration complète';
        WHEN 'famille' THEN
          sujet_titre := (ARRAY['Conversion de mon mari', 'Réconciliation familiale', 'Mariage béni', 'Éducation de mes enfants'])[floor(random() * 4 + 1)];
          sujet_description := 'Prière pour harmonie et bénédiction familiale';
        WHEN 'travail_finances' THEN
          sujet_titre := (ARRAY['Recherche d''emploi', 'Provision financière', 'Développement de mon business', 'Paiement de loyer'])[floor(random() * 4 + 1)];
          sujet_description := 'Prière pour percée professionnelle et financière';
        WHEN 'spirituel' THEN
          sujet_titre := (ARRAY['Baptême du Saint-Esprit', 'Délivrance', 'Croissance spirituelle', 'Consécration'])[floor(random() * 4 + 1)];
          sujet_description := 'Prière pour maturité et révélation spirituelle';
        WHEN 'evangelisation' THEN
          sujet_titre := (ARRAY['Conversion de mes proches', 'Courage pour témoigner', 'Fruit dans l''évangélisation'])[floor(random() * 3 + 1)];
          sujet_description := 'Prière pour l''extension du royaume';
        ELSE
          sujet_titre := 'Divers sujets de prière';
          sujet_description := 'Prière pour diverses situations';
      END CASE;

      INSERT INTO prayer_requests (user_id, request_text, disciple_name, is_urgent, is_answered, created_at)
      VALUES (
        disciple_record.id,
        sujet_titre || ' - ' || sujet_description,
        disciple_record.first_name || ' ' || disciple_record.last_name,
        CASE WHEN random() < 0.3 THEN true ELSE false END,
        CASE WHEN sujet_statut = 'repondu' THEN true ELSE false END,
        NOW() - (floor(random() * 90) || ' days')::INTERVAL -- Créé il y a 0-90 jours
      );

      total_prieres_crees := total_prieres_crees + 1;

    END LOOP;

    RAISE NOTICE '✅ Superviseur %: % sujets de prière créés', superviseur_record.first_name || ' ' || superviseur_record.last_name, nb_sujets;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Total sujets de prière créés: %', total_prieres_crees;
  RAISE NOTICE '========================================';

END $$;

-- ============================================
-- ÉTAPE 6: MISE À JOUR DES FORMATIONS PCNC
-- ============================================
DO $$
DECLARE
  total_formations_mises_a_jour INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 6: MISE À JOUR DES FORMATIONS PCNC';
  RAISE NOTICE '========================================';

  UPDATE profils SET formations_pcnc =
    CASE
      WHEN random() < 0.30 THEN '["fondements"]'::JSONB
      WHEN random() < 0.50 THEN '["fondements", "disciple_affermi"]'::JSONB
      WHEN random() < 0.60 THEN '["fondements", "disciple_affermi", "faiseur_disciples"]'::JSONB
      ELSE '[]'::JSONB
    END
  WHERE role IN ('disciple', 'mentor') AND email LIKE '%@test.icc.ga';

  GET DIAGNOSTICS total_formations_mises_a_jour = ROW_COUNT;

  RAISE NOTICE '✅ Formations PCNC mises à jour: % profils', total_formations_mises_a_jour;
  RAISE NOTICE '========================================';

END $$;

-- ============================================
-- RAPPORT FINAL
-- ============================================
DO $$
DECLARE
  v_total_disciples INTEGER;
  v_total_presences INTEGER;
  v_total_prieres INTEGER;
  v_nb_familles INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RAPPORT FINAL - DONNÉES DE TEST CRÉÉES';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO v_nb_familles FROM temp_familles_superviseurs;
  SELECT COUNT(*) INTO v_total_disciples FROM profils WHERE email LIKE '%@test.icc.ga';
  SELECT COUNT(*) INTO v_total_presences FROM attendance_tracking WHERE disciple_id IN (SELECT id FROM profils WHERE email LIKE '%@test.icc.ga');
  SELECT COUNT(*) INTO v_total_prieres FROM prayer_requests WHERE user_id IN (SELECT id FROM profils WHERE email LIKE '%@test.icc.ga');

  RAISE NOTICE 'Familles traitées: %', v_nb_familles;
  RAISE NOTICE 'Disciples/Mentors créés: %', v_total_disciples;
  RAISE NOTICE 'Présences créées (12 mois): %', v_total_presences;
  RAISE NOTICE 'Sujets de prière créés: %', v_total_prieres;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Structure par famille:';
  RAISE NOTICE '   - 5 mentors (génération 1)';
  RAISE NOTICE '   - 10 disciples simples (génération 1)';
  RAISE NOTICE '   - 5 lignées généalogiques distinctes';
  RAISE NOTICE '   - Profondeur: 3-5 générations';
  RAISE NOTICE '   - Total: ~35 personnes/famille';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Données de présence:';
  RAISE NOTICE '   - 6 types d''activités';
  RAISE NOTICE '   - 12 mois de données';
  RAISE NOTICE '   - Profils variés (30%% très actif, 40%% actif, 20%% peu actif, 10%% inactif)';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SEED DATA COMPLET TERMINÉ!';
  RAISE NOTICE '========================================';

END $$;

-- Nettoyer la table temporaire
DROP TABLE IF EXISTS temp_familles_superviseurs;
