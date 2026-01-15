-- Migration: Ajouter le champ 'avatar_url' à la table familles_disciples
-- Date: 2024

-- Ajouter la colonne 'avatar_url' à la table familles_disciples
ALTER TABLE familles_disciples
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN familles_disciples.avatar_url IS 'URL de l''avatar/photo de la famille stockée dans Supabase Storage';
