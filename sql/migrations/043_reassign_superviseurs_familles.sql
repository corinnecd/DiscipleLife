-- ============================================
-- 043_reassign_superviseurs_familles.sql
-- Objectif : mettre à jour les superviseurs des familles
-- Contexte :
--   - Le script 040_assigner_superviseur_admin_test.sql a, pour les tests,
--     assigné l'admin (ex: Corinne Diarra) comme superviseur à toutes les familles.
--   - Après création des vrais superviseurs (profils avec role = 'superviseur'),
--     les noms affichés dans l'app restent ceux de l'admin, car superviseur_id
--     pointe toujours vers l'ID de l'admin.
--
-- But :
--   1) Ré-initialiser les superviseur_id qui pointent vers un profil admin/super_admin/pasteur
--   2) Ré-exécuter la logique d'assignation de 037_assigner_superviseurs.sql
--      pour rattacher chaque famille à son vrai superviseur.
-- ============================================

-- 1) Remettre à NULL les superviseurs de test (admin / super_admin / pasteur)
UPDATE familles_disciples f
SET superviseur_id = NULL,
    updated_at = NOW()
FROM profils p
WHERE f.superviseur_id = p.id
  AND p.role IN ('admin', 'super_admin', 'pasteur');

-- 2) Ré-assigner les superviseurs en utilisant la même logique que 037_assigner_superviseurs.sql
DO $$
DECLARE
  famille_record RECORD;
  superviseur_uuid UUID;
BEGIN
  -- Pour chaque famille sans superviseur, déterminer le superviseur attendu
  FOR famille_record IN
    SELECT 
      f.id as famille_id,
      f.identifiant_famille,
      f.nom as nom_famille,
      CASE 
        WHEN f.identifiant_famille = 'FAM001' THEN 'Alain SIL'
        WHEN f.identifiant_famille = 'FAM002' THEN 'Andréa ERNEST'
        WHEN f.identifiant_famille = 'FAM003' THEN 'Béraca KAZONGO'
        WHEN f.identifiant_famille = 'FAM004' THEN 'BETSALEEL BADILA'
        WHEN f.identifiant_famille = 'FAM005' THEN 'CARINE MATONDO'
        WHEN f.identifiant_famille = 'FAM006' THEN 'COCO OKANZI'
        WHEN f.identifiant_famille = 'FAM007' THEN 'CYNTHIA ALLOH'
        WHEN f.identifiant_famille = 'FAM008' THEN 'David SERVA'
        WHEN f.identifiant_famille = 'FAM009' THEN 'ÉLISABETH AMECY'
        WHEN f.identifiant_famille = 'FAM010' THEN 'EPHREM MBA'
        WHEN f.identifiant_famille = 'FAM011' THEN 'GERVAIS NKATOULOULOU'
        WHEN f.identifiant_famille = 'FAM012' THEN 'HÉLÈNE LAMAGO'
        WHEN f.identifiant_famille = 'FAM013' THEN 'JOCELYNE FORTUNE'
        WHEN f.identifiant_famille = 'FAM014' THEN 'KARINE WILLIAM'
        WHEN f.identifiant_famille = 'FAM015' THEN 'KEVIN THÉA'
        WHEN f.identifiant_famille = 'FAM016' THEN 'LAËTITIA MISSATOU'
        WHEN f.identifiant_famille = 'FAM017' THEN 'LAËTITIA OBAME'
        WHEN f.identifiant_famille = 'FAM018' THEN 'MANICIA THÉA'
        WHEN f.identifiant_famille = 'FAM019' THEN 'NANCY NZI'
        WHEN f.identifiant_famille = 'FAM020' THEN 'NASDÈNE KODIA'
        WHEN f.identifiant_famille = 'FAM021' THEN 'PATRICK BATSIAKA'
        WHEN f.identifiant_famille = 'FAM022' THEN 'PROSPER LEBA'
        WHEN f.identifiant_famille = 'FAM023' THEN 'ROCHELLE PASSI BEN'
        WHEN f.identifiant_famille = 'FAM024' THEN 'SERGE AMANY'
        WHEN f.identifiant_famille = 'FAM025' THEN 'SNELLA MOUSSIO'
        WHEN f.identifiant_famille = 'FAM026' THEN 'YVAN DESSANDE'
      END as nom_superviseur
    FROM familles_disciples f
    WHERE f.superviseur_id IS NULL
  LOOP
    -- Chercher le superviseur par nom dans profils
    SELECT id INTO superviseur_uuid
    FROM profils
    WHERE (
      LOWER(TRIM(first_name || ' ' || last_name)) = LOWER(TRIM(famille_record.nom_superviseur)) OR
      LOWER(TRIM(last_name || ' ' || first_name)) = LOWER(TRIM(famille_record.nom_superviseur)) OR
      LOWER(TRIM(last_name)) = LOWER(TRIM(SPLIT_PART(famille_record.nom_superviseur, ' ', 2))) OR
      LOWER(first_name || ' ' || last_name) LIKE LOWER('%' || famille_record.nom_superviseur || '%')
    )
    AND role = 'superviseur'
    LIMIT 1;

    -- Mettre à jour la famille si un superviseur a été trouvé
    IF superviseur_uuid IS NOT NULL THEN
      UPDATE familles_disciples
      SET superviseur_id = superviseur_uuid,
          updated_at = NOW()
      WHERE id = famille_record.famille_id;
    END IF;
  END LOOP;
END $$;

-- 3) Vérification rapide : nombre de familles avec/sans superviseur
SELECT 
  COUNT(*) FILTER (WHERE superviseur_id IS NOT NULL) AS familles_avec_superviseur,
  COUNT(*) FILTER (WHERE superviseur_id IS NULL) AS familles_sans_superviseur,
  COUNT(*) AS total_familles
FROM familles_disciples;

