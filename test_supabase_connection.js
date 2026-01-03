// Script de test pour vérifier la connexion Supabase
// Ce fichier peut être exécuté dans la console du navigateur

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test de connexion et vérification des tables
async function testConnection() {
  console.log('🔍 Test de connexion Supabase...');
  
  // Test 1: Vérifier la table visiteurs
  try {
    const { data, error } = await supabase
      .from('visiteurs')
      .select('count', { count: 'exact', head: true });
    if (error) {
      console.error('❌ Erreur table visiteurs:', error.message);
    } else {
      console.log('✅ Table visiteurs: OK');
    }
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }

  // Test 2: Vérifier la table campagnes_evangelisation
  try {
    const { data, error } = await supabase
      .from('campagnes_evangelisation')
      .select('count', { count: 'exact', head: true });
    if (error) {
      console.error('❌ Erreur table campagnes_evangelisation:', error.message);
    } else {
      console.log('✅ Table campagnes_evangelisation: OK');
    }
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }

  // Test 3: Vérifier la table codes_invitation
  try {
    const { data, error } = await supabase
      .from('codes_invitation')
      .select('count', { count: 'exact', head: true });
    if (error) {
      console.error('❌ Erreur table codes_invitation:', error.message);
    } else {
      console.log('✅ Table codes_invitation: OK');
    }
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }

  // Test 4: Vérifier la table invitations_envoyees
  try {
    const { data, error } = await supabase
      .from('invitations_envoyees')
      .select('count', { count: 'exact', head: true });
    if (error) {
      console.error('❌ Erreur table invitations_envoyees:', error.message);
    } else {
      console.log('✅ Table invitations_envoyees: OK');
    }
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
}

testConnection();
