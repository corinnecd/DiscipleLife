-- Migration: Ajouter le champ 'titre' à la table profils
-- Ce champ permet de stocker le titre du superviseur/mentor (Pasteur, Berger, Mentor)
-- Date: 2024

-- Ajouter la colonne 'titre' à la table profils
ALTER TABLE profils
ADD COLUMN IF NOT EXISTS titre TEXT;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN profils.titre IS 'Titre du superviseur ou mentor: Pasteur, Berger, ou Mentor';

-- Créer un index pour améliorer les performances des requêtes par titre
CREATE INDEX IF NOT EXISTS idx_profils_titre ON profils(titre);
