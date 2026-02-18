-- ============================================
-- Migration 125 : Activer l'extension pgcrypto
-- Requise pour gen_random_bytes() utilisé dans creer_invitation_famille
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
