import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration Supabase
const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function executeStep1() {
    console.log('🚀 ÉTAPE 1: Assignation des famille_id aux profils');
    console.log('='.repeat(60));
    
    try {
        // 1. Récupérer toutes les familles actives
        console.log('\n📋 Récupération des familles...');
        const { data: familles, error: famillesError } = await supabase
            .from('familles_disciples')
            .select('id, nom, identifiant_famille, superviseur_id')
            .or('statut.eq.actif,statut.is.null')
            .order('identifiant_famille');
        
        if (famillesError) {
            throw new Error(`Erreur lors de la récupération des familles: ${famillesError.message}`);
        }
        
        console.log(`✅ ${familles.length} famille(s) trouvée(s)`);
        
        if (familles.length === 0) {
            console.log('⚠️  Aucune famille trouvée. Arrêt de la migration.');
            return;
        }
        
        // 2. Pour chaque famille, assigner le famille_id au superviseur
        let updatedCount = 0;
        
        for (const famille of familles) {
            if (!famille.superviseur_id) {
                console.log(`⚠️  Famille ${famille.identifiant_famille} (${famille.nom}) n'a pas de superviseur_id`);
                continue;
            }
            
            // Vérifier si le superviseur existe
            const { data: superviseur, error: supError } = await supabase
                .from('profils')
                .select('id, first_name, last_name, famille_id')
                .eq('id', famille.superviseur_id)
                .single();
            
            if (supError || !superviseur) {
                console.log(`⚠️  Superviseur ${famille.superviseur_id} non trouvé pour la famille ${famille.identifiant_famille}`);
                continue;
            }
            
            // Vérifier si le famille_id est déjà assigné
            if (superviseur.famille_id === famille.id) {
                console.log(`✓ Superviseur ${superviseur.first_name} ${superviseur.last_name} a déjà le famille_id ${famille.identifiant_famille}`);
                continue;
            }
            
            // Assigner le famille_id
            const { error: updateError } = await supabase
                .from('profils')
                .update({
                    famille_id: famille.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', famille.superviseur_id);
            
            if (updateError) {
                console.error(`❌ Erreur lors de l'assignation pour ${famille.identifiant_famille}: ${updateError.message}`);
            } else {
                updatedCount++;
                console.log(`✅ Superviseur ${superviseur.first_name} ${superviseur.last_name} assigné à la famille ${famille.identifiant_famille} (${famille.nom})`);
            }
        }
        
        console.log(`\n✅ Assignation terminée: ${updatedCount} profil(s) mis à jour`);
        
        // 3. Vérification
        console.log('\n📊 Vérification des résultats...');
        const { data: profilsAvecFamille, error: verifError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, email, role, famille_id')
            .not('famille_id', 'is', null);
        
        if (verifError) {
            console.error(`❌ Erreur lors de la vérification: ${verifError.message}`);
        } else {
            console.log(`✅ ${profilsAvecFamille.length} profil(s) avec famille_id assigné`);
        }
        
        // Statistiques
        const { data: stats, error: statsError } = await supabase
            .from('profils')
            .select('id, famille_id');
        
        if (!statsError && stats) {
            const avecFamille = stats.filter(p => p.famille_id !== null).length;
            const sansFamille = stats.filter(p => p.famille_id === null).length;
            const total = stats.length;
            
            console.log('\n📈 Statistiques:');
            console.log(`   - Profils avec famille_id: ${avecFamille}`);
            console.log(`   - Profils sans famille_id: ${sansFamille}`);
            console.log(`   - Total profils: ${total}`);
        }
        
        console.log('\n✅ ÉTAPE 1 TERMINÉE AVEC SUCCÈS');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('\n❌ ERREUR LORS DE L\'ÉTAPE 1:');
        console.error(error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Exécuter
executeStep1();
