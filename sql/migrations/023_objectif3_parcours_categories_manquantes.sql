-- ============================================
-- OBJECTIF 3: Ajout de parcours pour les catégories manquantes
-- ============================================

-- 1. PARCOURS: Identité en Christ
INSERT INTO parcours_transformation (nom, description, thematique, duree_jours, niveau, objectifs, statut, ordre_affichage, categorie)
SELECT 
  'Identité en Christ',
  'Découvrez qui vous êtes vraiment en Jésus-Christ et vivez dans votre identité de fils/fille de Dieu.',
  'Identité en Christ',
  14,
  'debutant',
  '[
    {"objectif": "Comprendre votre identité en Christ", "points": 1},
    {"objectif": "Vivre selon votre identité", "points": 2},
    {"objectif": "Rejeter les mensonges sur votre identité", "points": 3}
  ]'::jsonb,
  'actif',
  14,
  'identite_christ'
WHERE NOT EXISTS (
  SELECT 1 FROM parcours_transformation WHERE nom = 'Identité en Christ'
);

-- Module pour "Identité en Christ"
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Qui suis-je en Christ ?',
  'Découvrez votre véritable identité en Jésus-Christ.',
  '## Identité en Christ

### Votre identité en Christ :

1. **Vous êtes un enfant de Dieu**
   - Jean 1:12 - "Mais à tous ceux qui l''ont reçu, à ceux qui croient en son nom, il a donné le pouvoir de devenir enfants de Dieu"
   - Vous êtes aimé de Dieu
   - Vous avez une valeur inestimable

2. **Vous êtes une nouvelle créature**
   - 2 Corinthiens 5:17 - "Si quelqu''un est en Christ, il est une nouvelle créature"
   - Votre passé ne vous définit plus
   - Vous avez un nouveau départ

3. **Vous êtes héritier de Dieu**
   - Romains 8:17 - "Héritiers de Dieu, et cohéritiers de Christ"
   - Vous avez accès à toutes les promesses
   - Vous êtes destiné à la gloire

4. **Vous êtes plus que vainqueur**
   - Romains 8:37 - "Nous sommes plus que vainqueurs par celui qui nous a aimés"
   - Vous avez la victoire en Christ
   - Rien ne peut vous séparer de Son amour',
  'texte',
  25,
  1,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Identité en Christ'
  AND NOT EXISTS (
    SELECT 1 FROM modules_parcours m 
    WHERE m.parcours_id = p.id AND m.titre = 'Qui suis-je en Christ ?'
  );

-- 2. PARCOURS: Déploiement
INSERT INTO parcours_transformation (nom, description, thematique, duree_jours, niveau, objectifs, statut, ordre_affichage, categorie)
SELECT 
  'Déploiement',
  'Découvrez votre appel et déployez votre potentiel pour l''avancement du Royaume de Dieu.',
  'Déploiement',
  21,
  'intermediaire',
  '[
    {"objectif": "Découvrir votre appel", "points": 1},
    {"objectif": "Développer vos dons", "points": 2},
    {"objectif": "Vous déployer dans votre sphère d''influence", "points": 3}
  ]'::jsonb,
  'actif',
  15,
  'deploiement'
WHERE NOT EXISTS (
  SELECT 1 FROM parcours_transformation WHERE nom = 'Déploiement'
);

-- Module pour "Déploiement"
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Découvrir votre appel',
  'Comprenez votre appel et votre destinée en Christ.',
  '## Déploiement

### Découvrir votre appel :

1. **Votre appel est unique**
   - Éphésiens 2:10 - "Car nous sommes son ouvrage, ayant été créés en Jésus-Christ pour de bonnes œuvres"
   - Dieu vous a créé avec un but spécifique
   - Votre appel est personnel

2. **Vos dons et talents**
   - Romains 12:6 - "Nous avons des dons différents, selon la grâce qui nous a été accordée"
   - Identifiez vos dons spirituels
   - Développez vos talents

3. **Votre sphère d''influence**
   - Où Dieu vous a placé
   - Les personnes que vous pouvez toucher
   - Votre impact potentiel

4. **Passer à l''action**
   - Commencer petit
   - Être fidèle dans les petites choses
   - Grandir progressivement',
  'texte',
  30,
  1,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Déploiement'
  AND NOT EXISTS (
    SELECT 1 FROM modules_parcours m 
    WHERE m.parcours_id = p.id AND m.titre = 'Découvrir votre appel'
  );

-- 3. PARCOURS: Vie de Famille
INSERT INTO parcours_transformation (nom, description, thematique, duree_jours, niveau, objectifs, statut, ordre_affichage, categorie)
SELECT 
  'Vie de Famille selon Dieu',
  'Apprenez à bâtir une famille selon les principes bibliques et à vivre l''amour de Dieu dans votre foyer.',
  'Vie de Famille',
  21,
  'debutant',
  '[
    {"objectif": "Comprendre le plan de Dieu pour la famille", "points": 1},
    {"objectif": "Appliquer les principes bibliques", "points": 2},
    {"objectif": "Bâtir une famille unie", "points": 3}
  ]'::jsonb,
  'actif',
  16,
  'vie_famille'
WHERE NOT EXISTS (
  SELECT 1 FROM parcours_transformation WHERE nom = 'Vie de Famille selon Dieu'
);

-- Module pour "Vie de Famille"
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Le plan de Dieu pour la famille',
  'Découvrez comment Dieu veut que vous viviez en famille.',
  '## Vie de Famille selon Dieu

### Le plan de Dieu pour la famille :

1. **L''amour comme fondation**
   - Éphésiens 5:25 - "Maris, aimez vos femmes, comme Christ a aimé l''église"
   - L''amour inconditionnel
   - Le pardon et la grâce

2. **Le respect mutuel**
   - Éphésiens 5:33 - "Que chacun de vous aime sa femme comme lui-même, et que la femme respecte son mari"
   - L''honneur dans la famille
   - La communication respectueuse

3. **L''éducation des enfants**
   - Proverbes 22:6 - "Instruis l''enfant selon la voie qu''il doit suivre"
   - Élever les enfants dans la foi
   - Transmettre les valeurs bibliques

4. **L''unité et la paix**
   - Psaume 133:1 - "Qu''il est agréable, qu''il est doux pour des frères de demeurer ensemble !"
   - Vivre en harmonie
   - Résoudre les conflits avec amour',
  'texte',
  25,
  1,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Vie de Famille'
  AND NOT EXISTS (
    SELECT 1 FROM modules_parcours m 
    WHERE m.parcours_id = p.id AND m.titre = 'Le plan de Dieu pour la famille'
  );

-- Vérification finale
DO $$
DECLARE
  identite_count INTEGER;
  deploiement_count INTEGER;
  famille_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO identite_count FROM parcours_transformation WHERE categorie = 'identite_christ' AND statut = 'actif';
  SELECT COUNT(*) INTO deploiement_count FROM parcours_transformation WHERE categorie = 'deploiement' AND statut = 'actif';
  SELECT COUNT(*) INTO famille_count FROM parcours_transformation WHERE categorie = 'vie_famille' AND statut = 'actif';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PARCOURS CATÉGORIES MANQUANTES AJOUTÉS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Identité en Christ: %', identite_count;
  RAISE NOTICE 'Déploiement: %', deploiement_count;
  RAISE NOTICE 'Vie de Famille: %', famille_count;
  RAISE NOTICE '========================================';
END $$;

