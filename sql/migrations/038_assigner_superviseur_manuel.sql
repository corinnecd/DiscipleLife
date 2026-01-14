-- ============================================
-- Script pour assigner MANUELLEMENT un superviseur à une famille
-- Objectif: Permettre l'assignation précise par ID
-- ============================================

-- ⚠️ UTILISATION :
-- 1. Remplacez 'FAM001' par l'identifiant de la famille
-- 2. Remplacez 'SUPERVISEUR_UUID' par l'UUID du superviseur dans profils
-- 3. Exécutez cette requête pour chaque famille

-- Exemple d'utilisation :
-- UPDATE familles_disciples
-- SET superviseur_id = '123e4567-e89b-12d3-a456-426614174000'::UUID,
--     updated_at = NOW()
-- WHERE identifiant_famille = 'FAM001';

-- ============================================
-- MAPPING DES FAMILLES ET LEURS SUPERVISEURS
-- ============================================
-- FAM001 - LES DÉTERMINÉS : Alain SIL
-- FAM002 - Les VAILLANTS : Andréa ERNEST
-- FAM003 - Les ENRACINÉS : Béraca KAZONGO
-- FAM004 - Les ÉCLAIRÉS : BETSALEEL BADILA
-- FAM005 - Les AMOUREUX : CARINE MATONDO
-- FAM006 - ZÉLES : COCO OKANZI
-- FAM007 - INNARRÊTABLES : CYNTHIA ALLOH
-- FAM008 - LES TÉMOINS : ELISABETH AMECY
-- FAM009 - LES COMBATTANTS : Andréa Ernest
-- FAM010 - LES AGAPÉS : EPHREM MBA
-- FAM011 - LES FIDÈLES : GERVAIS NKATOULOULOU
-- FAM012 - LES GLORIEUX : Andréa Ernest
-- FAM013 - Les Vaillants : HÉLÈNE LAMAGO
-- FAM014 - LES PERSÉVERANTS : JOCELYNE FORTUNE
-- FAM015 - LES ÉQUIPÉS : KARINE WILLIAM
-- FAM016 - LES INGÉNIEUX : KEVIN THÉA
-- FAM017 - LES RACHETÉS : LAETITIA OBAME
-- FAM018 - LES RADIEUSES : MANICIA THÉA
-- FAM019 - LES INTIMES : NANCY NZI
-- FAM020 - LES INEBRANLABLES : NASDÈNE KODIA
-- FAM021 - LES CHOISIS : PATRICK BATSIAGA
-- FAM022 - LES BOULEVERSEURS : PROSPERE LEBA
-- FAM023 - LES PASSIONNÉS : ROCHELLE PASSI BEN
-- FAM024 - LES CONSACRÉS : SERGE AMANY
-- FAM025 - LES EMBRASÉS : SNELLA MOUSSIO
-- FAM026 - LES DISCIPLES : YVAN DESSANDE

-- ============================================
-- FONCTION UTILE : Trouver l'UUID d'un superviseur par email
-- ============================================
-- SELECT id, first_name, last_name, email, role
-- FROM profils
-- WHERE email = 'email@example.com'
-- AND role IN ('superviseur', 'admin', 'super_admin', 'pasteur');

-- ============================================
-- FONCTION UTILE : Lister tous les superviseurs disponibles
-- ============================================
SELECT 
  id,
  first_name,
  last_name,
  email,
  role,
  created_at
FROM profils
WHERE role IN ('superviseur', 'admin', 'super_admin', 'pasteur')
ORDER BY last_name, first_name;

-- ============================================
-- TEMPLATE D'ASSIGNATION (copier-coller et modifier)
-- ============================================
/*
UPDATE familles_disciples
SET superviseur_id = (SELECT id FROM profils WHERE email = 'superviseur@email.com' LIMIT 1),
    updated_at = NOW()
WHERE identifiant_famille = 'FAM001';

-- Vérifier l'assignation
SELECT 
  f.identifiant_famille,
  f.nom,
  p.first_name || ' ' || p.last_name as superviseur,
  p.email as email_superviseur
FROM familles_disciples f
JOIN profils p ON f.superviseur_id = p.id
WHERE f.identifiant_famille = 'FAM001';
*/

