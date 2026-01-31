# Où en sommes-nous ? Prochaines étapes

**Date :** 30 janvier 2026  
**Référence :** `RAPPORT_TOUT_A_IMPLEMENTER.md`, `STATUT_MIGRATION_CERCLES_VERS_PROFILS.md`, `VERIFICATION_KPI_DASHBOARD_PROFILS.md`.

---

## 1. Ce qui a été fait (cette session)

| Domaine | Fait | Détail |
|--------|------|--------|
| **Source unique profils** | ✅ Code front + script | Cercles, CreateDiscipleAccounts, Transformation, VoiceMessageCenter, script Les Déterminés : lecture/écriture **uniquement profils**. Plus de lecture `cercle_personnes`. |
| **Page Cercles** | ✅ | Ajout d’une personne → insertion dans **profils** (role, mentor_id, circle_type, etc.). |
| **RPC 100 % profils** | ✅ Fichiers SQL prêts | **096** (Pasteur + effectifs familles), **098** (Dashboard Superviseur) : RPC recalculées sur **profils** uniquement. |
| **KPI dashboards** | ✅ Vérification | Rapport `VERIFICATION_KPI_DASHBOARD_PROFILS.md` : après exécution de 096 et 098, tous les KPI viennent des profils. |
| **5 mentors Les Glorieux** | ✅ Migration 099 | `099_seed_5_mentors_les_glorieux.sql` : ajout de 5 mentors à FAM012 (optionnel à exécuter). |
| **Logique discipolat + upgrades** | ✅ Code + migration 100 | **Migration 100** : rôle `pilier`, trigger automatique disciple → mentor. **DiscipleDetail.jsx** : boutons Tutoré→Disciple (par mentor), Mentor→Pilier/Berger (par superviseur), modal avec motif. |
| **Rapport** | ✅ | `RAPPORT_TOUT_A_IMPLEMENTER.md` mis à jour : § 2.4 Logique du discipolat, § 2.5 Migration 100 et upgrades, références 096/098/100. |

---

## 2. À faire en priorité (côté base de données)

Les **fichiers SQL** sont dans le projet ; il reste à les **exécuter dans Supabase** (SQL Editor) pour que les KPI et les rôles soient alignés :

| Ordre | Migration | Rôle |
|-------|-----------|------|
| 1 | **096** – `sql/migrations/096_rpc_effectifs_100_profils_sans_cercle.sql` | KPI Pasteur et effectifs familles 100 % profils. |
| 2 | **098** – `sql/migrations/098_rpc_superviseur_dashboard_100_profils.sql` | KPI Dashboard Superviseur 100 % profils (membres, disciples count, suivi_par, nombre_membres_par_superviseur). |
| 3 | **100** – `sql/migrations/100_role_pilier_trigger_mentor_auto.sql` | Rôle `pilier` + trigger : disciple avec ≥ 1 disciple → rôle `mentor` automatiquement. |
| (optionnel) | **097** – `sql/migrations/097_profils_circle_type_visible_to_others.sql` | Colonnes `circle_type`, `visible_to_others` sur profils (si pas déjà fait). |
| (optionnel) | **099** – `sql/migrations/099_seed_5_mentors_les_glorieux.sql` | 5 mentors supplémentaires pour Les Glorieux (FAM012). |

Sans exécuter **096** et **098**, les chiffres des dashboards Pasteur et Superviseur peuvent encore venir en partie des anciennes RPC (cercles). Sans **100**, le rôle `pilier` et le passage automatique disciple → mentor ne sont pas actifs en base.

---

## 3. Prochaines étapes (selon le rapport)

Après exécution des migrations ci‑dessus, l’ordre recommandé reste celui du **§ 9** de `RAPPORT_TOUT_A_IMPLEMENTER.md` :

| Priorité | Action | Pourquoi |
|----------|--------|----------|
| **0** | Exécuter **075** (sync cercle → profils) si pas encore fait | Prérequis données. |
| **1** | Corriger la **boucle infinie** SuperviseurDashboard + stabiliser les `useEffect` | Point critique : perf et stabilité. |
| **2** | Remplacer la logique « stats comparatives » (IntersectionObserver + setInterval) par un effet borné | Réduit charge et délais au chargement. |
| **3** | Regrouper les requêtes SuperviseurDashboard (RPC agrégées déjà en 094/098) ; s’assurer que **098** est bien exécutée | Moins d’appels, temps de chargement plus court. |
| **4** | Étendre le cache (CacheUtils) au SuperviseurDashboard si pas déjà fait | Moins de requêtes répétées. |
| **5** | Vérifier PerformanceMonitor + dashboard `/admin/performance` | Mesurer les gains. |
| **6** | Découper SuperviseurDashboard en sous-composants, extraire `useSuperviseurData` | Maintenance, tests. |
| **7** | Réparer les exports PDF/Excel ; aligner **074** si besoin | Données de test, exports. |
| **8** | Métier : Dashboard Pasteur (tableau consolidé), rapports (flux superviseur→pasteur), Objectif 3, arbre, Disciples 70, etc. | Selon plan du rapport. |

---

## 4. Résumé en une phrase

**Où en sommes-nous :** Le front et les scripts utilisent **profils** comme seule source ; les migrations **096, 098, 100** (et optionnellement 097, 099) sont prêtes en SQL mais doivent encore être **exécutées en base**. La fiche disciple permet déjà les upgrades Tutoré→Disciple et Mentor→Pilier/Berger ; le trigger 100 rendra le passage disciple→mentor automatique.

**Prochaine étape concrète :** Exécuter dans Supabase, dans l’ordre, les migrations **096**, **098** et **100**, puis enchaîner sur la **stabilité et la performance du SuperviseurDashboard** (boucle infinie, regroupement des requêtes, cache).
