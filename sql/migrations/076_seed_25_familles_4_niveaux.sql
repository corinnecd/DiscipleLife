-- ============================================
-- Migration 076 : Seed 25 familles (hors Les Déterminés) – 4 niveaux intergénérationnels
--
-- NIVEAU 1 : Pasteur (déjà en profils)
-- NIVEAU 2 : Superviseur (1 par famille, déjà en profils, responsable de 70 disciples)
-- NIVEAU 3 : Mentor / Pilier (disciple direct du superviseur qui a lui-même des disciples)
-- NIVEAU 4 : Disciple (n'a pas encore de disciples)
--
-- Par famille (25) : 10 disciples directs du superviseur dont 4 mentors + 4 disciples par mentor = 10 + 16 = 26 entrées cercle_personnes
-- Total : 25 × 26 = 650 entrées
-- ============================================

DO $$
DECLARE
  fam RECORD;
  v_superviseur_id UUID;
  v_identifiant TEXT;
  v_direct_ids UUID[] := '{}';
  v_mentor_id UUID;
  i INT;
  j INT;
  v_first TEXT;
  v_last TEXT;
  v_name TEXT;
  -- Pools de noms pour variété
  first_names TEXT[] := ARRAY['Marc','Sophie','Jean','Marie','Pierre','Julie','Paul','Emma','Lucas','Léa','Thomas','Camille','Nicolas','Chloé','Alexandre','Sarah','Hugo','Inès','Louis','Lola','Gabriel','Eva','Raphaël','Zoé','Arthur'];
  last_names TEXT[] := ARRAY['DUPONT','MARTIN','DURAND','BERNARD','LEBLANC','DUBOIS','MOREAU','LEFEBVRE','GARCIA','FOURNIER','MARTINEZ','ROUX','SIMON','VINCENT','LAMBERT','BONNET','ANDRE','LEROY','RENAUD','DAVID','LEFEVRE','MULLER','COLLIN','FERREIRA','LEMAIRE'];
BEGIN
  FOR fam IN
    SELECT id, nom, identifiant_famille, superviseur_id
    FROM familles_disciples
    WHERE superviseur_id IS NOT NULL
      AND LOWER(nom) NOT LIKE '%déterminé%'
      AND LOWER(nom) NOT LIKE '%determine%'
    ORDER BY identifiant_famille
  LOOP
    v_superviseur_id := fam.superviseur_id;
    v_identifiant := fam.identifiant_famille;
    v_direct_ids := '{}';

    -- ----- Disciples directs du superviseur (10) : 4 seront mentors (niveau 3), 6 restent disciples (niveau 4) -----
    FOR i IN 1..10 LOOP
      v_first := first_names[1 + (i + length(v_identifiant)) % array_length(first_names, 1)];
      v_last := last_names[1 + (i * 3 + length(v_identifiant)) % array_length(last_names, 1)] || ' ' || v_identifiant;
      v_name := v_first || ' ' || v_last;
      IF i <= 4 THEN
        INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
        VALUES (v_superviseur_id, v_name, v_first, v_last, 'Disciple', NOW())
        RETURNING id INTO v_mentor_id;
        v_direct_ids := array_append(v_direct_ids, v_mentor_id);
      ELSE
        INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
        VALUES (v_superviseur_id, v_name, v_first, v_last, 'Disciple', NOW());
      END IF;
    END LOOP;

    -- ----- Pour chaque mentor (4 premiers directs), créer 4 disciples (niveau 4) -----
    FOR i IN 1..4 LOOP
      FOR j IN 1..4 LOOP
        v_first := first_names[1 + (i * 5 + j + length(v_identifiant)) % array_length(first_names, 1)];
        v_last := last_names[1 + (i * 4 + j * 2) % array_length(last_names, 1)] || ' ' || v_identifiant || '-' || i;
        v_name := v_first || ' ' || v_last;
        INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
        VALUES (v_superviseur_id, v_name, v_first, v_last, 'Disciple', v_direct_ids[i], NOW());
      END LOOP;
    END LOOP;

    RAISE NOTICE 'Famille % (%) : 10 directs + 16 disciples de 4 mentors créés', v_identifiant, fam.nom;
  END LOOP;

  RAISE NOTICE 'Seed 076 terminé : 25 familles × 26 entrées = 650 lignes cercle_personnes (hors Les Déterminés)';
END;
$$;
