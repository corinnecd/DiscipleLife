-- ============================================
-- Mise à jour du badge "Multiplicateur" → "Faiseur de Disciples"
-- ============================================

-- Mettre à jour le nom du badge dans la table badges
UPDATE badges 
SET nom = 'Faiseur de Disciples',
    description = 'Former 5 disciples'
WHERE nom = 'Multiplicateur';

-- Mettre à jour les références dans user_badges si nécessaire
-- (Les user_badges référencent par badge_id, donc pas besoin de mise à jour directe)

-- Vérification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM badges WHERE nom = 'Multiplicateur') THEN
    RAISE NOTICE 'ATTENTION: Le badge "Multiplicateur" existe toujours. Vérifiez la mise à jour.';
  ELSE
    RAISE NOTICE '✅ Le badge "Multiplicateur" a été renommé en "Faiseur de Disciples" avec succès.';
  END IF;
END $$;

