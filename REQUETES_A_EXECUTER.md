# Toutes les requêtes / migrations à exécuter

**Où exécuter :** Supabase → SQL Editor (copier-coller le contenu de chaque fichier et exécuter dans l’ordre).

---

## 1. Priorité immédiate (KPI et rôles) ✅ FAIT

Exécuté dans l’ordre :

| Ordre | Fichier | Rôle | Statut |
|-------|---------|------|--------|
| 1 | `sql/migrations/096_rpc_effectifs_100_profils_sans_cercle.sql` | KPI Pasteur et effectifs familles 100 % profils (sans cercle) | ✅ Exécuté |
| 2 | `sql/migrations/098_rpc_superviseur_dashboard_100_profils.sql` | KPI Dashboard Superviseur 100 % profils (membres, disciples, suivi_par, etc.) | ✅ Exécuté |
| 3 | `sql/migrations/100_role_pilier_trigger_mentor_auto.sql` | Rôle `pilier` + trigger : disciple avec ≥ 1 disciple → rôle `mentor` automatiquement | ✅ Exécuté |

Les dashboards Pasteur et Superviseur utilisent maintenant les RPC 100 % profils, et le passage automatique disciple → mentor est actif.

---

## 2. Prérequis données (sync et colonnes profils)

À exécuter si pas encore fait (ordre recommandé) :

| Ordre | Fichier | Rôle |
|-------|---------|------|
| 4 | `sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql` | Sync cercle_personnes → profils (profil_id, trigger) – prérequis données |
| 5 | `sql/migrations/074_add_pasteur_id_to_reports.sql` | Colonne `pasteur_id` sur table `reports` (optionnel si déjà géré en front) |
| 6 | `sql/migrations/092_add_date_entree_famille_profils.sql` | Colonne `date_entree_famille` sur `profils` |
| 7 | `sql/migrations/093_add_phone_ville_residence_profils.sql` | Colonnes `phone`, `ville_residence` sur `profils` |

---

## 2b. Backfill : migrer toutes les données cercles → profils

Pour que **toutes** les entrées de `cercle_personnes` aient un profil correspondant (et que `profil_id` soit renseigné) :

| Ordre | Fichier | Rôle |
|-------|---------|------|
| — | `sql/migrations/108_backfill_cercle_vers_profils.sql` | Crée un profil pour chaque ligne `cercle_personnes` sans `profil_id`, puis met à jour `profil_id`. Copie `circle_type` vers profils si la colonne existe (097). |

**Prérequis :** migration **075** exécutée (colonne `profil_id` + trigger). Optionnel : **097** pour copier aussi `circle_type`.

**Si beaucoup de cercles restent sans profil** (emails sans compte Auth) : exécuter d’abord le script  
`node scripts/create_comptes_cercles_sans_profil.js` (avec `.env` : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`),  
puis relancer la migration **108**.

---

## 2c. Arbre généalogique : superviseurs = disciples directs du pasteur

Pour que l’arbre affiche bien **Pasteur → 12 superviseurs → mentors → disciples** (les superviseurs sont les disciples directs de chaque pasteur) :

| Ordre | Fichier | Rôle |
|-------|---------|------|
| — | `sql/migrations/109_arbre_superviseurs_disciples_directs_pasteur.sql` | Sync `profils.pasteur_id` pour tous les superviseurs (depuis leur famille) ; sync `familles_disciples.pasteur_id` ; mise à jour `nb_disciples` des pasteurs (nombre de superviseurs). |
| — | `sql/migrations/110_arbre_pasteur_nb_disciples_superviseurs.sql` | RPC `get_arbre_4_niveaux` : pour le pasteur, `nb_disciples` = nombre de superviseurs (disciples directs). |

**Prérequis :** migration **103** (ou au moins la RPC `get_arbre_4_niveaux` en place). Exécuter **109** puis **110**.

**Si DR MODE n’a qu’un seul superviseur dans l’arbre** (au lieu de 12) : exécuter en plus  
`sql/migrations/111_dr_mode_12_superviseurs_arbre.sql` — force l’affectation des 12 superviseurs (liste officielle) à PASTEUR-001 et met à jour les familles correspondantes.

---

## 3. Optionnel (colonnes et seeds)

| Ordre | Fichier | Rôle |
|-------|---------|------|
| 8 | `sql/migrations/097_profils_circle_type_visible_to_others.sql` | Colonnes `circle_type`, `visible_to_others` sur profils (si pas déjà fait) |
| 9 | `sql/migrations/099_seed_5_mentors_les_glorieux.sql` | Seed 5 mentors pour Les Glorieux (FAM012) – optionnel |

---

## 4. Bloc 090–100 complet (si vous repartez de zéro sur cette tranche)

Si les migrations 090 à 098 ne sont pas encore appliquées, exécuter **dans cet ordre** :

| Ordre | Fichier | Rôle |
|-------|---------|------|
| 1 | `sql/migrations/090_fix_les_glorieux_total_65.sql` | Correction effectifs Les Glorieux |
| 2 | `sql/migrations/091_rpc_nombre_profils_hybride_max_profils_ou_cercle.sql` | RPC effectifs hybride |
| 3 | `sql/migrations/092_add_date_entree_famille_profils.sql` | Colonne date_entree_famille |
| 4 | `sql/migrations/093_add_phone_ville_residence_profils.sql` | Colonnes phone, ville_residence |
| 5 | `sql/migrations/094_rpc_superviseur_dashboard_phase2.sql` | RPC dashboard superviseur phase 2 |
| 6 | `sql/migrations/095_rpc_superviseur_dashboard_phase2_extra.sql` | RPC phase 2 extra (rapports, superviseurs famille) |
| 7 | `sql/migrations/096_rpc_effectifs_100_profils_sans_cercle.sql` | RPC effectifs 100 % profils |
| 8 | `sql/migrations/097_profils_circle_type_visible_to_others.sql` | Colonnes circle_type, visible_to_others |
| 9 | `sql/migrations/098_rpc_superviseur_dashboard_100_profils.sql` | RPC dashboard superviseur 100 % profils |
| 10 | `sql/migrations/099_seed_5_mentors_les_glorieux.sql` | Seed 5 mentors Les Glorieux (optionnel) |
| 11 | `sql/migrations/100_role_pilier_trigger_mentor_auto.sql` | Rôle pilier + trigger disciple → mentor |

---

## 5. Autres migrations utiles (selon besoin)

À exécuter uniquement si le contexte le demande (nouvelle base, correction, fonctionnalité précise) :

| Fichier | Rôle |
|---------|------|
| `sql/migrations/075b_fix_trigger_mentor_optionnel.sql` | Fix trigger mentor optionnel (après 075) |
| `sql/migrations/075_finaliser_backfill.sql` | Backfill final sync cercle → profils (contrainte auth) |
| `sql/migrations/077_sync_profils_vers_cercle_personnes.sql` | Sync profils → cercle_personnes |
| `sql/migrations/078_rpc_kpi_disciples_par_pasteur.sql` | RPC KPI disciples par pasteur |
| `sql/migrations/079_rpc_kpi_familles_pour_pasteur.sql` | RPC KPI familles pour pasteur |
| `sql/migrations/081_rpc_nombre_disciples_par_familles.sql` | RPC nombre disciples par familles |
| `sql/migrations/082_rpc_mentors_avec_disciples_pasteur.sql` | RPC mentors avec disciples (pasteur) |
| `sql/migrations/084_rpc_nombre_profils_par_familles.sql` | RPC nombre profils par familles |
| `sql/migrations/085_sync_nombre_disciples_actuels.sql` | Sync nombre disciples actuels |
| `sql/migrations/102_profils_nb_disciples_trigger.sql` | Trigger nb_disciples sur profils |
| `sql/migrations/103_arbre_4_niveaux_rpc.sql` | RPC arbre 4 niveaux |
| `sql/migrations/103b_fix_sync_triggers_anti_recursion.sql` | Fix triggers anti-récursion |
| `sql/migrations/105_les_determines_55_12_42.sql` | Les Déterminés (55, 12, 42) |
| `sql/migrations/106_verifier_superviseurs_affectes_pasteur.sql` | Vérification superviseurs affectés pasteur |
| `sql/migrations/107_corriger_role_dr_mode_pasteur.sql` | Corriger rôle DR MODE (pasteur) |

---

## 6. Résumé – ordre minimal recommandé pour “tout aligner”

✅ **096, 098, 100** – Exécutées. KPI et logique discipolat alignés.

Si besoin ensuite : **075**, **074**, **092**, **093**, **097**, **099** comme indiqué en § 2 et § 3.

---

**Références :** `OU_EN_SOMMES_NOUS_PROCHAINES_ETAPES.md`, `PROCHAINE_ETAPE.md`, `INSTRUCTIONS_MIGRATIONS_090_100.md`, `PLAN_PRIORITE_1_TESTS_ET_VERIFICATIONS.md`.
