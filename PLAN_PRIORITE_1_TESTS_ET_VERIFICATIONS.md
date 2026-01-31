# Priorité 1 – Tests et vérifications (avant déploiement)

**Date :** Janvier 2025  
**Objectif :** Valider le fonctionnement des dashboards, rapports et suivi de présence avant mise en production.

---

## Réalisé (à ce jour)

- **Script migrations 090–100** : `scripts/run_migrations_090_100.js` (exécution auto si `DATABASE_URL` défini, sinon génère `sql/RUN_MIGRATIONS_090_100.sql`).
- **Fichier 099+100 seul** : `sql/RUN_MIGRATIONS_099_100_ONLY.sql` pour exécuter uniquement les migrations 099 et 100 (après 090–098).
- **Migration 099 idempotente** : si l’email existe déjà dans `auth.users`, réutilisation de l’utilisateur au lieu d’un nouvel INSERT (plus d’erreur « duplicate key »).
- **Erreur « Attempted to assign to readonly property »** : corrections dans `PerformanceMonitor.js` (plus de mutation directe des métriques) et dans `CacheUtils.js` (retour systématique d’une copie des données en cache).
- **Instructions** : `INSTRUCTIONS_MIGRATIONS_090_100.md` et `PLAN_PRIORITE_1_TESTS_ET_VERIFICATIONS.md` (ce fichier).

---

## 1. Migrations SQL à exécuter dans Supabase

Exécuter dans l’ordre suivant (Supabase → SQL Editor) si ce n’est pas déjà fait :

| Ordre | Fichier | Description |
|-------|---------|-------------|
| 1 | `090_fix_les_glorieux_total_65.sql` | Correction effectifs Les Glorieux |
| 2 | `091_rpc_nombre_profils_hybride_max_profils_ou_cercle.sql` | RPC effectifs hybride |
| 3 | `092_add_date_entree_famille_profils.sql` | Colonne date_entree_famille sur profils |
| 4 | `093_add_phone_ville_residence_profils.sql` | Colonnes phone, ville, residence sur profils |
| 5 | `094_rpc_superviseur_dashboard_phase2.sql` | RPC phase 2 dashboard superviseur |
| 6 | `095_rpc_superviseur_dashboard_phase2_extra.sql` | RPC phase 2 extra (rapports, superviseurs famille) |
| 7 | `096_rpc_effectifs_100_profils_sans_cercle.sql` | RPC effectifs 100 % profils |
| 8 | `097_profils_circle_type_visible_to_others.sql` | Colonne visible_to_others / circle_type |
| 9 | `098_rpc_superviseur_dashboard_100_profils.sql` | RPC dashboard superviseur 100 % profils (remplace logique 094/095) |
| 10 | `099_seed_5_mentors_les_glorieux.sql` | Seed 5 mentors Les Glorieux (optionnel) |
| 11 | `100_role_pilier_trigger_mentor_auto.sql` | Trigger rôle pilier → mentor |

**Vérification après exécution :**
- [ ] Aucune erreur dans le SQL Editor
- [ ] Les tables `profils`, `familles_disciples`, `reports`, `attendance_tracking` existent
- [ ] Les RLS (Row Level Security) sont actives sur ces tables

---

## 2. Checklist – Dashboard Pasteur

**Prérequis :** Compte avec rôle `pasteur` (ex. Alain).

- [ ] **Connexion** : Se connecter en tant que pasteur, accéder au Dashboard Pasteur.
- [ ] **Modal Famille** : Cliquer sur une famille.
  - [ ] Nom du superviseur, infos affichées.
  - [ ] Liste des membres (ou message si vide).
  - [ ] Statistiques (nombre de membres, objectif, progression).
  - [ ] Barre de progression correcte.
- [ ] **Export PDF** : Lancer l’export PDF, ouvrir le fichier, vérifier contenu et mise en page.
- [ ] **Export Excel** : Lancer l’export Excel, vérifier colonnes et données.
- [ ] **Rapports manquants** : Vérifier la section (4 premiers + « Voir tout » si applicable).
- [ ] **Graphiques** : Changer la période (hebdo, mensuel, trimestre, annuel) et vérifier que les graphiques se mettent à jour.

---

## 3. Checklist – Dashboard Superviseur

**Prérequis :** Compte superviseur avec famille assignée.

- [ ] **Connexion** : Se connecter en tant que superviseur, accéder au Dashboard Superviseur.
- [ ] **Chargement initial** : La page se charge sans erreur (spinner puis contenu).
- [ ] **Bandeau / cartes** : Famille, pasteur, stats rapides affichés.
- [ ] **KPI** : Section KPI avec période (année, trimestre, mois, semaine) et graphiques.
- [ ] **Tableau détaillé disciples** : Données affichées, colonnes cohérentes.
- [ ] **Tableau mentors / piliers** : Données consolidées affichées.
- [ ] **Graphiques en lazy load** : En descendant, formations/vidéos, statuts spirituels, activité récente, stats comparatives se chargent sans erreur.
- [ ] **Exports** : PDF et Excel (général et listes disciples/mentors) fonctionnent.

---

## 4. Checklist – SendReport (Envoyer un rapport)

**Prérequis :** Compte superviseur ou mentor.

- [ ] **Accès** : Aller sur « Envoyer un rapport » (ou route `/send-report`).
- [ ] **Rapport vide** : Envoyer sans remplir → message d’alerte, pas d’envoi forcé.
- [ ] **Prévisualisation** : Remplir quelques KPI → prévisualisation affichée, nombres lisibles.
- [ ] **Historique** : Les derniers rapports (ex. 10) s’affichent.
- [ ] **Envoi** : Remplir et envoyer → message de succès (ex. email pasteur), disparition après quelques secondes.
- [ ] **Export** : Si export PDF/Excel existe depuis la page, vérifier qu’il fonctionne.

---

## 5. Checklist – Suivi de présence (Attendance)

**Prérequis :** Compte disciple (ou rôle avec accès au suivi de présence).

- [ ] **6 activités** visibles et utilisables :
  - [ ] Culte de Samedi Soir  
  - [ ] Culte du Dimanche Matin  
  - [ ] After Culte Dimanche  
  - [ ] Temps de Prière  
  - [ ] Temps de Partage  
  - [ ] Sortie d’Évangélisation  
- [ ] **Enregistrement** : Marquer une présence → enregistrement OK, pas d’erreur.
- [ ] **Statistiques** : Total, présents, absents, taux de présence cohérents.
- [ ] **Graphiques** : Affichage (ex. 6 derniers mois) sans erreur.
- [ ] **Export** : PDF/Excel si disponible.

---

## 6. Tests rapides transversaux

- [ ] **Recherche globale** : Ouvrir la recherche, taper un terme → résultats pertinents.
- [ ] **Arbre généalogique** : Ouvrir la page, affichage de l’arbre (au moins pour l’utilisateur connecté), navigation basique sans erreur.
- [ ] **Navigation** : Passer d’un dashboard à l’autre, retour, pas de crash ni de page blanche.

---

## 7. Lancer l’application pour les tests

```bash
cd "/Users/mbprocorinne/Downloads/PCNC 2024/DISCIPLES ADORATRICES/APPLI DISCIPLE LIFE"
npm run dev
```

Ouvrir l’URL indiquée (ex. `http://localhost:3000` selon la config Vite), se connecter avec un compte pasteur, un superviseur et un disciple pour couvrir toutes les checklists.

---

## 8. Prochaine action

1. **Si les migrations 099 et 100 ne sont pas encore appliquées** : exécuter `sql/RUN_MIGRATIONS_099_100_ONLY.sql` dans Supabase → SQL Editor.
2. **Lancer l’app** : `npm run dev`, puis enchaîner avec les checklists §2 à §6 (cocher au fur et à mesure).
3. **En cas d’erreur en console** : rechargement complet (Ctrl+F5 / Cmd+Shift+R) après les corrections CacheUtils / PerformanceMonitor ; le WebSocket Supabase (realtime) peut afficher « connection lost » sans impact sur les dashboards si le réseau est instable.

---

## 9. En cas de problème

- **Erreur Supabase** : Vérifier les messages dans le SQL Editor et l’ordre des migrations.
- **Données vides** : Vérifier qu’il existe des familles, des rapports et des présences en base (seeds ou données de test).
- **RLS** : Si « pas de lignes » ou accès refusé, vérifier les politiques RLS sur `profils`, `familles_disciples`, `reports`, `attendance_tracking`.
- **Erreur « readonly property »** : s’assurer que les dernières modifs de `PerformanceMonitor.js` et `CacheUtils.js` sont bien prises (rechargement complet).

---

*Document créé pour la Priorité 1 – Tests et vérifications. Dernière mise à jour : suite réalisée (script migrations, 099 idempotent, correctifs cache/readonly).*
