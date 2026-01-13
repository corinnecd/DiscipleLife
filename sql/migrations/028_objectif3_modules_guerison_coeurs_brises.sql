-- Migration: Ajouter 5 modules supplémentaires pour "Jésus guérit les cœurs brisés"
-- Objectif: Compléter la formation avec 6 modules au total (1 existant + 5 nouveaux)
-- Date: 2024

-- Module 2: Identifier les blessures du cœur
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Identifier les blessures du cœur',
  'Apprenez à reconnaître et identifier les différentes blessures qui affectent votre cœur.',
  '## Identifier les blessures du cœur

Avant de pouvoir guérir, il est essentiel d''identifier les blessures qui affectent votre cœur. La Bible nous enseigne que "Le cœur connaît sa propre amertume" (Proverbes 14:10).

### Types de blessures courantes :
- **Rejet et abandon** : Sentiment d''être exclu ou laissé de côté
- **Trahison** : Déception causée par ceux en qui vous aviez confiance
- **Perte et deuil** : Douleur liée à la perte d''un être cher
- **Humiliation** : Sentiment de honte et de dévalorisation
- **Injustice** : Sentiment d''avoir été traité injustement

### Exercice pratique :
Prenez un moment pour réfléchir et écrire dans votre journal les blessures que vous avez identifiées. Soyez honnête avec vous-même et avec Dieu.

### Versets bibliques :
- Jérémie 17:9 - "Le cœur est tortueux par-dessus tout, et il est méchant"
- Psaume 51:17 - "Les sacrifices qui sont agréables à Dieu, c''est un esprit brisé"
- Proverbes 4:23 - "Garde ton cœur plus que toute autre chose"',
  'texte',
  25,
  2,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Jésus guérit les coeurs brisés'
AND NOT EXISTS (
  SELECT 1 FROM modules_parcours mp 
  WHERE mp.parcours_id = p.id 
  AND mp.ordre = 2
);

-- Module 3: La promesse de guérison divine
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'La promesse de guérison divine',
  'Découvrez les promesses de Dieu concernant la guérison de votre cœur brisé.',
  '## La promesse de guérison divine

Dieu a fait des promesses spécifiques concernant la guérison des cœurs brisés. Ces promesses sont pour vous aujourd''hui.

### Les promesses de Dieu :
1. **Il guérit les cœurs brisés** (Psaume 147:3)
   - Dieu n''est pas indifférent à votre douleur
   - Il a le pouvoir de restaurer ce qui est brisé

2. **Il est proche de vous** (Psaume 34:18)
   - Vous n''êtes jamais seul dans votre souffrance
   - Dieu est présent dans vos moments les plus difficiles

3. **Il transforme les cendres en beauté** (Ésaïe 61:3)
   - Votre douleur peut devenir un témoignage
   - Dieu peut utiliser votre histoire pour bénir d''autres

### Comment s''approprier ces promesses :
- **Méditez** sur ces versets quotidiennement
- **Priez** en vous appropriant ces promesses
- **Croyez** que Dieu est fidèle à Sa parole

### Versets bibliques :
- Psaume 147:3 - "Il guérit ceux qui ont le cœur brisé, Et il panse leurs blessures"
- Ésaïe 61:1 - "Il m''a envoyé pour guérir ceux qui ont le cœur brisé"
- Jérémie 30:17 - "Je te donnerai la santé, je guérirai tes plaies"',
  'texte',
  20,
  3,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Jésus guérit les coeurs brisés'
AND NOT EXISTS (
  SELECT 1 FROM modules_parcours mp 
  WHERE mp.parcours_id = p.id 
  AND mp.ordre = 3
);

-- Module 4: Le processus de guérison
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Le processus de guérison',
  'Comprenez les étapes du processus de guérison et comment y participer activement.',
  '## Le processus de guérison

La guérison est un processus, pas un événement instantané. Elle nécessite votre participation active.

### Les étapes de la guérison :

1. **Reconnaissance** : Admettre que vous êtes blessé
   - Ne minimisez pas votre douleur
   - Acceptez que vous avez besoin d''aide

2. **Confession** : Partager votre douleur avec Dieu
   - "Confessez donc vos péchés les uns aux autres, et priez les uns pour les autres, afin que vous soyez guéris" (Jacques 5:16)

3. **Pardon** : Libérer ceux qui vous ont blessé
   - Le pardon libère votre cœur
   - "Pardonne-nous nos offenses, comme nous aussi nous pardonnons à ceux qui nous ont offensés" (Matthieu 6:12)

4. **Restauration** : Permettre à Dieu de restaurer votre cœur
   - Laissez Dieu travailler en vous
   - "Je restaurerai votre santé, je guérirai vos blessures" (Jérémie 30:17)

### Pratique quotidienne :
- Passez du temps dans la présence de Dieu
- Lisez et méditez la Parole de Dieu
- Priez pour votre guérison

### Versets bibliques :
- Jacques 5:16 - "La prière fervente du juste a une grande efficacité"
- 1 Pierre 5:7 - "Déchargez-vous sur lui de tous vos soucis"
- Philippiens 4:6-7 - "Ne vous inquiétez de rien"',
  'texte',
  30,
  4,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Jésus guérit les coeurs brisés'
AND NOT EXISTS (
  SELECT 1 FROM modules_parcours mp 
  WHERE mp.parcours_id = p.id 
  AND mp.ordre = 4
);

-- Module 5: Vivre dans la liberté
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Vivre dans la liberté',
  'Apprenez à marcher dans la liberté que Christ vous a acquise et à maintenir votre guérison.',
  '## Vivre dans la liberté

Une fois guéri, il est important de maintenir votre guérison et de vivre dans la liberté que Christ vous a acquise.

### Comment maintenir votre guérison :

1. **Restez connecté à la source**
   - Passez du temps quotidien avec Dieu
   - "Je suis le cep, vous êtes les sarments. Celui qui demeure en moi et en qui je demeure porte beaucoup de fruit" (Jean 15:5)

2. **Renouvelez votre pensée**
   - "Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l''intelligence" (Romains 12:2)
   - Remplacez les pensées négatives par la Parole de Dieu

3. **Entourez-vous de soutien**
   - Rejoignez une communauté de croyants
   - "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d''eux" (Matthieu 18:20)

4. **Soyez reconnaissant**
   - La gratitude transforme votre perspective
   - "Rendez grâces en toutes choses" (1 Thessaloniciens 5:18)

### Signes de guérison :
- Vous pouvez parler de votre blessure sans douleur intense
- Vous avez pardonné à ceux qui vous ont blessé
- Vous ressentez la paix de Dieu
- Vous pouvez aider d''autres personnes blessées

### Versets bibliques :
- Jean 8:36 - "Si donc le Fils vous affranchit, vous serez réellement libres"
- 2 Corinthiens 3:17 - "Là où est l''Esprit du Seigneur, là est la liberté"
- Galates 5:1 - "C''est pour la liberté que Christ nous a affranchis"',
  'texte',
  25,
  5,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Jésus guérit les coeurs brisés'
AND NOT EXISTS (
  SELECT 1 FROM modules_parcours mp 
  WHERE mp.parcours_id = p.id 
  AND mp.ordre = 5
);

-- Module 6: Devenir un instrument de guérison
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Devenir un instrument de guérison',
  'Découvrez comment votre expérience de guérison peut devenir une bénédiction pour d''autres.',
  '## Devenir un instrument de guérison

Votre expérience de guérison n''est pas seulement pour vous. Dieu veut utiliser votre témoignage pour guérir d''autres cœurs brisés.

### Comment être un instrument de guérison :

1. **Partagez votre témoignage**
   - Votre histoire peut donner de l''espoir à d''autres
   - "Ils l''ont vaincu à cause du sang de l''agneau et à cause de la parole de leur témoignage" (Apocalypse 12:11)

2. **Écoutez avec compassion**
   - Soyez présent pour ceux qui souffrent
   - "Portez les fardeaux les uns des autres" (Galates 6:2)

3. **Priez pour les autres**
   - Intercédez pour ceux qui sont blessés
   - "Priez les uns pour les autres, afin que vous soyez guéris" (Jacques 5:16)

4. **Soyez un exemple**
   - Montrez par votre vie ce que signifie être guéri
   - "Vous êtes la lumière du monde" (Matthieu 5:14)

### Le cycle de la guérison :
1. Vous êtes blessé → 2. Vous êtes guéri → 3. Vous aidez d''autres à guérir

### Versets bibliques :
- 2 Corinthiens 1:4 - "Il nous console dans toutes nos afflictions, afin que, par la consolation dont nous sommes l''objet de la part de Dieu, nous puissions consoler ceux qui se trouvent dans quelque affliction"
- Matthieu 5:4 - "Heureux ceux qui pleurent, car ils seront consolés"
- 1 Pierre 4:10 - "Comme de bons dispensateurs des diverses grâces de Dieu, que chacun de vous mette au service des autres le don qu''il a reçu"

### Action finale :
Prenez un engagement aujourd''hui : "Seigneur, utilise mon témoignage de guérison pour bénir et guérir d''autres cœurs brisés."',
  'texte',
  20,
  6,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Jésus guérit les coeurs brisés'
AND NOT EXISTS (
  SELECT 1 FROM modules_parcours mp 
  WHERE mp.parcours_id = p.id 
  AND mp.ordre = 6
);

-- Vérification : Afficher le nombre de modules créés
DO $$
DECLARE
  module_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO module_count
  FROM modules_parcours mp
  INNER JOIN parcours_transformation p ON mp.parcours_id = p.id
  WHERE p.thematique = 'Jésus guérit les coeurs brisés'
  AND mp.statut = 'actif';
  
  RAISE NOTICE '✅ Modules créés pour "Jésus guérit les cœurs brisés": %', module_count;
END $$;


