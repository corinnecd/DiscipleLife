# Prochaine étape – Disciple Life

**Date :** 30 janvier 2026

## Déjà fait (récent)

- **SuperviseurDashboard** : boucle infinie et perf (useEffect limités, cache, KPI recalculés sans refetch).
- **Dashboard Pasteur** : tableau 7 colonnes, vue « Rapports reçus », flux superviseur → pasteur (SendReport + `pasteur_id`).
- **Objectif 3** : état documenté ; évaluations continues et suivi post-crise déjà en place dans Transformation.jsx (`evaluations_croissance`, `suivi_post_crise`, `historique_guerison`).
- **Formulaire unique** : route `/signup`, rôle pré-rempli via `?role=`, liens HomePage et Auth (« S'inscrire », « Formulaire complet »).
- **Mot de passe** : visibilité (œil) sur Auth, SignupDisciple, UpdatePassword ; page « Mot de passe oublié » (`/forgot-password`) ; page nouveau mot de passe (`/update-password`). Voir **INSTRUCTIONS_RESET_PASSWORD_SUPABASE.md** pour configurer la redirection Supabase.
- **Correctif** : SelectItem « Tous les mois » (value non vide).

---

## Prochaine étape recommandée (au choix)

### 1. **Données – Migrations SQL** (prérequis, ~30 min)

À exécuter dans l’ordre dans Supabase (SQL Editor) si pas encore fait :

| Ordre | Migration | Rôle | Fichier |
|-------|-----------|------|---------|
| 1 | **096** | RPC effectifs 100 % profils (Pasteur/Superviseur) | [sql/migrations/096_rpc_effectifs_100_profils_sans_cercle.sql](sql/migrations/096_rpc_effectifs_100_profils_sans_cercle.sql) |
| 2 | **098** | RPC Superviseur Dashboard 100 % profils | [sql/migrations/098_rpc_superviseur_dashboard_100_profils.sql](sql/migrations/098_rpc_superviseur_dashboard_100_profils.sql) |
| 3 | **100** | Rôle pilier + trigger disciple → mentor auto | [sql/migrations/100_role_pilier_trigger_mentor_auto.sql](sql/migrations/100_role_pilier_trigger_mentor_auto.sql) |
| 4 | **074** | `pasteur_id` sur `reports` (optionnel, déjà géré en front) | [sql/migrations/074_add_pasteur_id_to_reports.sql](sql/migrations/074_add_pasteur_id_to_reports.sql) |
| 5 | **075** | Sync cercle_personnes → profils (modèle cible) | [sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql](sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql) |
| 6 | **092** | `date_entree_famille` sur profils | [sql/migrations/092_add_date_entree_famille_profils.sql](sql/migrations/092_add_date_entree_famille_profils.sql) |
| 7 | **093** | `phone`, `ville_residence` sur profils | [sql/migrations/093_add_phone_ville_residence_profils.sql](sql/migrations/093_add_phone_ville_residence_profils.sql) |

**Action :** Ouvrir le SQL Editor Supabase, copier-coller le contenu de chaque fichier ci-dessus et exécuter dans l’ordre (096 → 098 → 100 → 074 → 075 → 092 → 093).

---

### 2. **Formulaire unique d’inscription** (métier, 3–4 h)

- Un seul formulaire réutilisable (inscription + ajout membre par mentor/superviseur).
- Une route `/signup` avec rôle dans le formulaire ; déprécier les 4 routes signup/pasteur|superviseur|mentor|disciple.
- Tout écrit dans `profils` (+ auth si compte).

**Référence :** RAPPORT_TOUT_A_IMPLEMENTER.md § 2.3, RAPPORT_CRUD_PROFILS_FORMULAIRE_UNIQUE_SOURCE_VERITE.md.

---

### 3. **Objectif 3 – Compléments** (métier, 2–4 h)

- **Évaluations continues** : vérifier table `evaluations_croissance`, formulaires et graphiques dans Transformation.jsx.
- **Suivi post-crise** : vérifier migrations 073 (`suivi_post_crise`, `historique_guerison`), alertes, historique.
- **Ressources guérison** : catalogue + filtres (si prévu au cahier des charges).

**Référence :** OBJECTIF_3_ET_FLUX_ETAT.md.

---

### 4. **SuperviseurDashboard – Refactor** (technique, 3–4 h)

- Découper en sous-composants (< 500 lignes).
- Réparer exports PDF/Excel si besoin.
- Garder la logique actuelle (useEffect, cache) déjà corrigée.

---

### 5. **Arbre généalogique** (métier, 15–19 h)

- Recherche universelle, ascendants (Disciple → Mentor → Superviseur → Pasteur).
- Vue complète + panneau détails.
- **Référence :** RAPPORT_TOUT_A_IMPLEMENTER.md § 3.4, ETAT_FONCTIONNALITES_RESTANTES.md.

---

### 6. **Présence / Disciples 70** (métier)

- Compléter les 9 activités (Culte samedi, ComFrat, Veillée, etc.).
- KPI et stats par famille / mentor, nouveaux convertis, absents récurrents.

**Référence :** RAPPORT_ANALYSE_DISCIPLES_70.md.

---

## Ordre suggéré

1. **Migrations SQL** (1) si pas encore fait.
2. Ensuite, selon priorité métier : **formulaire unique** (2) ou **Objectif 3 compléments** (3).
3. Puis **refactor SuperviseurDashboard** (4) ou **arbre généalogique** (5) selon le planning.

Indiquez par quoi vous voulez continuer (ex. « migrations », « formulaire unique », « Objectif 3 », « arbre ») pour enchaîner concrètement.
