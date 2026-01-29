# Rapport – Tout ce qu’il y a à implémenter

**Date :** 27 janvier 2026  
**Objet :** Inventaire exhaustif des fonctionnalités, corrections et chantiers restant à réaliser sur l’application Disciple Life. **Ce document est le rapport de référence unique : toute la suite des fonctionnalités à implémenter se base sur ce dernier rapport.**

---

### Résumé exécutif

Ce rapport recense **tout ce qu’il reste à implémenter** et **intègre désormais** :
- **CRUD profils et formulaire unique** : profils = seule source de vérité, formulaire unique d’inscription/ajout de membre, cercles limités aux comptages par catégorie (voir § 2.3).
- **Comparaison profils / formulaires d’inscription** : schéma `profils` (24 colonnes + migrations 092/093), champs du formulaire d’inscription alignés (rôle, date d’entrée, suivi par, statut spirituel, formations PCNC, nombre de disciples, téléphone, ville de résidence) — voir § 2.3.

Sont également couverts : **modèle cible des données** (sync cercle → profils, migration 075), **fonctionnalités métier** (Dashboard Pasteur, Superviseur, arbre, rapports, présence/Disciples 70, Objectif 3), **nouveaux modules** (notation, bilans, signalisation d’abus CSA, KPI accueil), **performance et UX** (Phase 4 Claude), et **technique** (refactor SuperviseurDashboard, exports, ErrorHandler, qualité de code). Les priorités et l’ordre recommandé sont en sections **4, 5, 8 et 9**. **La suite des développements se basera sur ce rapport.**

---

## 1. Vue d’ensemble

Ce document regroupe **tout ce qui reste à implémenter** et constitue **le document de travail unique** pour planifier et prioriser les prochaines livraisons. **On se basera sur ce rapport pour la suite des fonctionnalités à implémenter.** Il intègre :
- **Rapport CRUD profils / formulaire unique** (`RAPPORT_CRUD_PROFILS_FORMULAIRE_UNIQUE_SOURCE_VERITE.md`) : profils = source de vérité, formulaire unique (inscription + ajout de membre), cercles = comptages par catégorie uniquement.
- **Comparaison profils / formulaires d’inscription** (`COMPARAISON_PROFILS_FORMULAIRES_INSCRIPTION.md`) : schéma `profils` (24 colonnes + date_entree_famille, phone, ville_residence), mapping formulaire → profils, statut spirituel = `spiritual_stage` (libellé FR).
- **Rapport Claude** (plan agile 14 sprints, 586 h), synthèse dans `RAPPORT_FEEDBACK_ANALYSE_CLAUDE_ET_COMPARAISON.md`.

Sont couverts : données et modèle cible (§ 2), **CRUD profils et formulaire unique** (§ 2.3), fonctionnalités métier (§ 3), performance et UX (§ 5), technique (§ 7), notation/bilans/signalisation d’abus. Sources : rapport Claude, `ETAT_FONCTIONNALITES_RESTANTES.md`, `ETAT_OBJECTIFS.md`, `MODELE_CIBLE_DONNEES.md`, `RAPPORT_CRUD_PROFILS_FORMULAIRE_UNIQUE_SOURCE_VERITE.md`, `COMPARAISON_PROFILS_FORMULAIRES_INSCRIPTION.md`.

---

## 2. Données et modèle cible

### 2.1 Modèle cible « tout en profils »

- **Source de vérité :** table `profils`.
- **Règle :** toute donnée ajoutée dans `cercle_personnes` doit être **automatiquement consolidée dans `profils`** (trigger sur INSERT/UPDATE).

**À faire / à vérifier :**

| Élément | Statut | Fichier / action |
|--------|--------|-------------------|
| Colonne `cercle_personnes.profil_id` | Migration prête | Exécuter `sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql` |
| Trigger de sync cercle → profils | Migration prête | Idem : 075 crée `sync_cercle_personnes_vers_profils` et le trigger |
| Vérification post-migration | À faire | Contrôler qu’à chaque INSERT/UPDATE dans `cercle_personnes` un profil existe et que `profil_id` est renseigné |
| Backfill des lignes existantes sans `profil_id` | Optionnel | Script dédié ou procédure (voir commentaires en fin de 075) |

Référence : **`MODELE_CIBLE_DONNEES.md`**.

### 2.2 Données de test (KPI, présence)

- Exécuter **`074_seed_donnees_test_completes_kpi_presence.sql`** si pas encore fait (pasteurs/superviseurs/familles existants, ne pas recréer).
- Aligner les noms de colonnes de `attendance_tracking` et `prayer_requests` avec le script et les migrations (010, 071, etc.).
- Créer les comptes profils pour les disciples de test puis, si prévu, le script de génération des présences (`075_generer_presences_apres_comptes.sql` ou équivalent).

---

### 2.3 CRUD profils et formulaire unique (source de vérité) — base pour la suite

**Références intégrées :** `RAPPORT_CRUD_PROFILS_FORMULAIRE_UNIQUE_SOURCE_VERITE.md`, `COMPARAISON_PROFILS_FORMULAIRES_INSCRIPTION.md`.

#### Objectif

- **Profils** = seule source de vérité pour les données des membres (identité, rôle, famille, mentor, statut spirituel, formations PCNC, téléphone, ville, etc.).
- **Un seul formulaire** pour l’inscription (page d’accueil) et l’ajout de membre (par mentor/superviseur/admin) ; tout écrit dans **profils** (et auth si compte).
- **Cercles** (`cercle_personnes`) : ne plus être la source des fiches membres ; uniquement **comptages par catégorie** (Non-croyant, Nouveau converti, Disciple affermi, Faiseur de disciples) pour les KPI.

#### Schéma `profils` et formulaire d’inscription (état actuel)

- **Colonnes profils (schéma réel, 24 colonnes + à ajouter)** : id, first_name, last_name, email, avatar_url, **spiritual_stage** (libellé formulaire : **Statut spirituel** — colonne existante), created_at, updated_at, role, is_approved_as_disciple_maker, famille_id, identifiant_disciple, superviseur_id, mentor_id, identifiant_unique, pasteur_id, eglise, nombre_disciples, avancement_pourcentage, nombre_disciples_presents, taux_participation_semaine, observations, formations_pcnc_realisees, titre. **À ajouter si absentes :** date_entree_famille (migration 092), phone, ville_residence (migration 093).
- **Formulaire d’inscription membre (SignupDisciple étendu)** couvre : prénom, nom, email, **rôle**, **famille**, **date d’entrée dans la famille**, **Suivi par** (mentor_id), **Statut spirituel** (spiritual_stage), **Formation(s) PCNC réalisées**, **Nombre de disciples**, **Numéro de téléphone**, **Ville de résidence**. Envoi en metadata au signUp + update profils après création.

#### Plan d’implémentation (CRUD profils — à suivre pour la suite)

| Phase | Contenu | Priorité pour la suite |
|-------|---------|-------------------------|
| **Phase 1** | Modèle de données : schéma profils complet (092, 093), politique d’écriture “une seule source”, trigger `handle_new_user` alimenté par metadata. | Prérequis |
| **Phase 2** | Formulaire unique : composant réutilisable (inscription + ajout membre), une seule route `/signup` avec rôle dans le formulaire, dépréciation des 4 routes signup/pasteur|superviseur|mentor|disciple. | Haute |
| **Phase 3** | Lecture depuis profils uniquement : listes “Mes disciples” / “Membres famille” depuis profils (plus depuis cercle_personnes), RPC et KPI basées sur profils uniquement, suppression logique hybride (ex. 091). | Haute |
| **Phase 4** | Cercles : uniquement comptages par catégorie ; optionnel vue/agrégat alimentée depuis profils. | Moyenne |
| **Phase 5** | CRUD cohérent : Create/Read/Update/Delete tous via profils ; pas de fiche membre dans cercle_personnes. | Haute |

**Actions immédiates déjà réalisées :** formulaire SignupDisciple étendu (rôle, date d’entrée, suivi par, statut spirituel, formations PCNC, nombre de disciples, téléphone, ville de résidence) ; migrations 092 (date_entree_famille), 093 (phone, ville_residence) ; rapport de comparaison profils/formulaires à jour. **À faire ensuite :** exécuter 092/093 si besoin, puis Phase 2 (formulaire unique réutilisable + une route), puis Phase 3 (lecture tout depuis profils).

---

## 3. Fonctionnalités métier à implémenter

### 3.1 Priorité 1 – Objectif 3 (Transformation / OKR)

Selon les documents, l’Objectif 3 est soit « 0 % » (vue OKR structuré), soit « ~98 % » (vue page Transformation actuelle). À **compléter ou finaliser** :

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Bibliothèque de parcours de transformation | À vérifier / compléter | Tables : `parcours_transformation`, `modules_parcours`, `user_parcours_progression`. Page avec inscription et suivi de progression. |
| Journal personnel de transformation | À vérifier / compléter | Table `journal_transformation`, interface d’édition, recherche/filtres par date et thématique, export. |
| Évaluations continues | À vérifier / compléter | Table `evaluations_croissance`, formulaires, graphiques de progression, rapports de croissance. |
| Ressources de guérison et restauration | À implémenter | Catalogue, filtrage par type de besoin, recommandations. |
| Module de suivi post-crise | À vérifier | Tables `suivi_post_crise`, `historique_guerison` (073), système de suivi, alertes, historique. |

**Estimation indicative :** 8–10 h si tout est à créer ; moins si une partie existe déjà (Transformation.jsx, ParcoursDetail, etc.).

---

### 3.2 Priorité 2 – Dashboard Pasteur

| Élément | Statut | Détail |
|--------|--------|--------|
| Page dédiée `PasteurDashboard.jsx` | À créer ou à distinguer | Vue d’ensemble des mentors sous sa responsabilité. |
| Tableau consolidé (7 colonnes) | À implémenter | Nom, Prénom (mentor), Église (famille), Nombre de disciples, Avancement % vers objectif 70, Nombre de disciples présents, Taux de participation de la semaine. |
| Statistiques agrégées par famille | À implémenter | Agrégation par famille / mentor. |
| Graphiques de progression globale | À implémenter | Évolution dans le temps. |
| Recherche et filtres | À implémenter | Sur familles, mentors, périodes. |
| Export CSV/Excel | À implémenter / réparer | Exports fonctionnels (voir aussi section Technique). |
| Redirection dans `AdminDashboard.jsx` | À implémenter | Afficher `PasteurDashboard` si `role === 'pasteur'`. |

**Estimation :** 3–4 h (avec tableau consolidé).

---

### 3.3 Priorité 3 – Améliorations Dashboard Superviseur

| Élément | Statut | Détail |
|--------|--------|--------|
| Section « Mes disciples » – tableau détaillé (10 colonnes) | Partiel / à compléter | Prénom/Nom pilier (mentor), Prénom/Nom disciple, Statut spirituel, Date d’ajout, Date dernière présence, Niveau d’engagement, Statut Actif/Inactif, Présence dernier culte. |
| Vue consolidée des mentors | À implémenter | Même logique que tableau Pasteur (7 colonnes), pour tous les mentors de la famille. |
| Export CSV/Excel / PDF | À implémenter ou réparer | Export pour rapport au pasteur, formatage professionnel. |
| Refactorisation du composant | Critique | Réduire taille et complexité (voir section 5.1). |

**Estimation :** 3–4 h (tableaux + exports).

---

### 3.4 Priorité 4 – Arbre généalogique

| Élément | Statut | Détail |
|--------|--------|--------|
| Recherche universelle | À implémenter | Recherche par nom/prénom dans `profils` et `cercle_personnes` (pasteur, superviseur, mentor, disciple), autocomplétion, bouton « Mon arbre ». |
| Visualisation des ascendants | À implémenter | Remontée Disciple → Mentor → Superviseur → Pasteur, affichage vers le haut. |
| Descendants multi-niveaux | À améliorer | Récursion complète sur plusieurs générations. |
| Vue complète (ascendants + descendants) | À implémenter | Personne au centre, ascendants en haut, descendants en bas. |
| Panneau de détails latéral | À implémenter | Infos complètes, actions (voir profil, contacter). |
| Fichiers à créer | À faire | `src/lib/genealogicalUtils.js`, `PersonNode.jsx`, `PersonDetails.jsx`, `SearchBar.jsx`. |
| Fichier à modifier | À faire | `src/pages/GenealogicalTree.jsx` (recherche, ascendants, vue complète, panneau détails). |

**Estimation :** 15–19 h (détail par phase dans `ETAT_FONCTIONNALITES_RESTANTES.md`).

---

### 3.5 Priorité 5 – Système de rapports

| Élément | Statut | Détail |
|--------|--------|--------|
| Flux Superviseur → Pasteur | À implémenter | Envoi de rapports mensuels, pré-remplissage du pasteur de tutelle, validation et envoi. |
| Vue Pasteur « Rapports reçus » | À implémenter | Liste des rapports par superviseur, filtres par mois/année. |
| Notifications | À implémenter | Notifier le pasteur à l’envoi, le superviseur à la consultation. |

**Estimation :** 2–3 h.

---

### 3.6 Présence et objectif « Disciples 70 »

| Élément | Statut | Détail |
|--------|--------|--------|
| 9 activités complètes | Partiel | Manquent : Culte samedi soir, ComFrat des familles, Veillée, Sorties évangélisation, Retraites, Challenges, Sujets de prière des membres (au moins 6 activités à ajouter). |
| Vue Superviseur – KPI et statistiques | À implémenter | Tableau de bord présences famille, stats par activité, taux de participation, tendances, filtres hebdo/mensuel/trimestriel/semestriel/annuel. |
| Suivi des nouveaux convertis | À implémenter | Liste, date de conversion, taux de participation, alertes après 2 absences consécutives. |
| Liste des absents récurrents | À implémenter | Nombre d’absences par disciple, activités les plus manquées. |
| Vue Mentor – KPI et stats | À implémenter | Même logique limitée à leurs disciples. |
| Regroupement par famille | À implémenter | Agrégation des présences et KPI par famille. |

Référence : **`RAPPORT_ANALYSE_DISCIPLES_70.md`**.

---

### 3.7 Notation semestrielle (Sprint 12)

| Élément | Statut | Détail |
|--------|--------|--------|
| Table `evaluations_semestrielles` | À implémenter | Critères : disponibilité, écoute, accompagnement, spiritualité, leadership ; anonymat. |
| Pages | À implémenter | `/evaluations`, `/evaluations/new/:personId`, `/evaluations/synthese`. |

**Estimation (rapport Claude) :** ~40 h.

---

### 3.8 Bilans périodiques (Sprints 13–14)

| Élément | Statut | Détail |
|--------|--------|--------|
| Tables `bilans`, `objectifs` | À implémenter | Schéma selon specs rapport Claude. |
| Questionnaire 8 sections | À implémenter | Dont « Forteresses spirituelles » (8 questions). |
| Workflow | À implémenter | Demande → questionnaire → RDV → validation bilatérale. |
| Pages | À implémenter | `/bilans`, `/bilans/new`, `/bilans/:id/questionnaire`, `/bilans/:id/validate`, `/bilans/sans-bilan`, `/objectifs`. |

**Estimation (rapport Claude) :** ~62 h.

---

### 3.9 Signalisation d’abus (CSA) (Sprint 14)

| Élément | Statut | Détail |
|--------|--------|--------|
| Table `signalements` | À implémenter | Workflow R.É.P.A.R.E.R. (7 étapes), 6 types d’abus (physique, émotionnel, psychologique, autorité, financier, discrimination). |
| Charte visuelle | À implémenter | Couleurs dédiées (#56195b, #7d2fa3). |
| Pages | À implémenter | `/signalements`, `/admin/signalements`. |
| Sécurité / conformité | À implémenter | Chiffrement, reCAPTCHA, piliers de sécurité. |

**Distinction :** à part du feedback général (`FeedbackForm`, table `feedback`).  
**Estimation (rapport Claude) :** ~32 h.

---

### 3.10 KPI page d’accueil (Sprint 11)

| Élément | Statut | Détail |
|--------|--------|--------|
| Vues SQL | À implémenter | `kpi_presence`, `kpi_disciples_par_famille` (ou équivalent). |
| Cartes KPI sur `/home` | À implémenter | Résumé indicateurs clés. |

---

## 4. Alignement avec le rapport Claude – Plan agile 14 sprints (586 h)

Le **rapport Claude** (« RAPPORT D’ANALYSE COMPLET - APPLICATION DISCIPLE LIFE », Analyse & Plan d’Action Agile) définit un plan en **5 phases / 14 sprints** (586 h). Ce rapport en tient compte. Synthèse dans `RAPPORT_FEEDBACK_ANALYSE_CLAUDE_ET_COMPARAISON.md`.

| Phase | Sprints | Contenu | Où dans ce rapport |
|-------|---------|---------|--------------------|
| **Phase 1** | 1–2 | Stabilisation : boucle infinie SuperviseurDashboard, tests, ErrorBoundary, exports PDF/Excel | § 6 Technique |
| **Phase 2** | 3–5 | Refactorisation : service layer, découpage composants (> 1 000 lignes), validation | § 6 Technique |
| **Phase 3** | 6–8 | Arbre généalogique, notifications, Objectif 3 | § 3.4, § 3.1 |
| **Phase 4** | 9–10 | **Performance, UX, accessibilité (A11y)** | § 5 Performance et UX |
| **Phase 5** | 11–14 | KPI + structure DB + seed data, notation, bilans, signalements (186 h) | § 3.7, 3.8, 3.9, 3.10, § 2.2 |

**État général (rapport Claude) :** complétude 85 % fonctionnel, qualité code 6,5/10 ; 72 pages/vues, 41 494 lignes ; 0 test automatisé (critique) ; 5 fichiers > 1 000 lignes ; ~523 `console.log`, ~30 % code dupliqué.

---

## 5. Performance et UX (Phase 4 du rapport Claude – Sprints 9–10)

Les éléments suivants sont **issus du rapport Claude** et de `INTEGRATION_ERRORHANDLER_PERFORMANCE.md`. Ils concernent la **performance** et l’**UX/accessibilité** à implémenter ou à compléter.

### 5.1 Monitoring et métriques de performance

| Élément | Statut | Détail |
|--------|--------|--------|
| **PerformanceMonitor.js** | Existant | Enregistrement temps de chargement, appels API, hits/misses cache, persistance localStorage. |
| **Dashboard `/admin/performance`** | Existant | Métriques globales, temps par page, taux de cache, 10 derniers appels API. |
| **Alertes de performance** | À implémenter | Notifier si les temps de chargement dépassent un seuil configurable. |
| **Graphiques de tendances** | À implémenter | Visualiser l’évolution des performances dans le temps (par page, par jour/semaine). |
| **Export CSV des métriques** | À implémenter | Alternative à l’export JSON pour analyse Excel. |
| **Dashboard performance pour superviseurs** | Optionnel | Version simplifiée accessible aux superviseurs (au lieu d’admin uniquement). |

Référence : **`INTEGRATION_ERRORHANDLER_PERFORMANCE.md`**.

### 5.2 Cache et réduction des appels

| Élément | Statut | Détail |
|--------|--------|--------|
| **CacheUtils** | Existant | 8 pages principales déjà optimisées (réduction 85–90 % requêtes), intégration avec PerformanceMonitor. |
| **Extension du cache** | À poursuivre | Étendre à d’autres pages lourdes (Transformation, Evangelization, FamillesDisciples, etc.). |
| **Objectifs** | Cible | Taux de cache 70–80 % de hits ; amélioration temps de chargement ~80 % sur les pages concernées. |

### 5.3 Optimisations techniques (performance)

| Élément | Détail |
|--------|--------|
| **Réduction des re-renders** | Mémoïsation (React.memo, useMemo, useCallback) sur composants lourds et listes longues. |
| **Lazy loading** | Code splitting par route (React.lazy / Suspense) ; lazy loading des graphiques / listes (virtualisation si nécessaire). |
| **Vues SQL agrégées** | Créer des vues ou endpoints qui agrègent (famille + superviseur + pasteur + KPIs) pour limiter le nombre d’appels depuis le client (notamment SuperviseurDashboard). |
| **Remplacement IntersectionObserver + setInterval** | Dans SuperviseurDashboard, remplacer la logique « stats comparatives » (4 IntersectionObserver + setInterval 200 ms × 25) par un effet borné ou un état « zone visible ». |

### 5.4 Accessibilité (A11y)

| Élément | Détail |
|--------|--------|
| **Audit A11y** | Vérifier contrastes, navigation clavier, labels ARIA, zones focus sur les principaux parcours (dashboards, formulaires, arbre). |
| **Corrections ciblées** | Liens et boutons accessibles, annonces pour les changements dynamiques (toasts, chargements). |

### 5.5 Récapitulatif Performance & UX

| Priorité | Élément | Estimation indicative |
|----------|---------|------------------------|
| Haute | Alertes de performance, graphiques de tendances, export CSV métriques | 4–6 h |
| Haute | Extension cache à pages lourdes, vues SQL agrégées SuperviseurDashboard | 6–8 h |
| Moyenne | Lazy loading / code splitting, réduction re-renders (memo) | 4–6 h |
| Moyenne | Audit et corrections accessibilité (A11y) | 4–6 h |
| Basse | Dashboard performance pour superviseurs | 2–3 h |

---

## 6. Améliorations optionnelles (basse priorité)

| Fonctionnalité | Détail |
|----------------|--------|
| Leaderboard d’engagement | Classement global, filtres par période, top performers. |
| Objectifs personnalisés mensuels | Définition et suivi par utilisateur, rappels. |
| Jobs / Cron | Recalcul des scores mensuels, nettoyage des notifications, génération de rapports. |
| Export PDF/CSV avancé | Templates, graphiques inclus, personnalisation. |
| Notifications push | Navigateur, e‑mails, SMS optionnel. |
| Objectif 3 – finition | Statistiques globales, certificats de complétion, partage de progression (~2 % restants si base déjà là). |

---

## 7. Technique, qualité et stabilité

### 7.1 SuperviseurDashboard (critique)

| Problème | Action à mener |
|----------|----------------|
| Fichier ~4 953 lignes | Découper en sous-composants (cartes KPI, graphiques, tableaux, filtres), viser &lt; 500 lignes par fichier. |
| ~55 `useState`, ~25 `useEffect` | Extraire logique dans hooks / services (ex. `useSuperviseurData(user, filters)`). |
| Boucle infinie signalée | Revoir les `useEffect` et leurs deps, éviter setters dans deps qui relancent l’effet. |
| ~80+ appels Supabase directs | Regrouper requêtes, vues SQL ou endpoints agrégés, couche service ou hooks dédiés. |
| Lazy loading graphiques (IntersectionObserver + setInterval) | Remplacer par logique plus simple et bornée (ex. état « zone visible » ou chargement différé clair). |

Référence : **`RAPPORT_FEEDBACK_ANALYSE_CLAUDE_ET_COMPARAISON.md`**, section 2.1.

### 5.2 Exports PDF/Excel

- Corriger les exports actuellement **non fonctionnels** (PasteurDashboard et autres).
- Tester avec des données du script 074.

### 7.3 ErrorHandler – pages restantes

- Environ **~180 occurrences** sur d’autres pages à traiter progressivement (pattern dans `INTEGRATION_ERRORHANDLER_COMPLETE.md`).
- Objectif : gestion d’erreurs centralisée, messages cohérents, toasts, types d’erreurs (NETWORK, AUTH, VALIDATION, etc.).

### 5.4 Qualité de code

| Élément | Action |
|--------|--------|
| ~523 `console.log` | Supprimer ou conditionner à `import.meta.env.DEV`. |
| Code dupliqué (~30 %) | Identifier et factoriser (composants, hooks, services). |
| Composants &gt; 1 000 lignes | Découper : SuperviseurDashboard, Transformation, Evangelization, PasteurDashboard, FamillesDisciples. |
| Service layer | Introduire une couche (ou hooks) pour les appels Supabase ; les composants n’appellent que des fonctions métier. |
| Tests automatisés | 0 % actuellement ; ajouter tests ciblés (chargement, sous-composants, hooks). |
| ErrorBoundary | Mettre ou renforcer un ErrorBoundary global / par zone. |

---

## 8. Tableau récapitulatif par priorité

| Priorité | Thématique | Statut global | Estimation indicative |
|----------|------------|----------------|------------------------|
| Données | Modèle cible (075, backfill optionnel) | Migration prête, à exécuter et vérifier | 0,5–1 h |
| Données | Seed KPI/présence (074), colonnes attendance/prayer | À exécuter / aligner | 1–2 h |
| 1 | Objectif 3 (parcours, journal, évaluations, suivi post-crise) | À compléter / finaliser | 8–10 h |
| 2 | Dashboard Pasteur (tableau 7 colonnes, exports, redirection) | À créer / compléter | 3–4 h |
| 3 | Dashboard Superviseur (tableaux détaillé + consolidé, exports, refactor) | Partiel + critique technique | 3–4 h + refactor |
| 4 | Arbre généalogique (recherche, ascendants, vue complète, panneau détails) | Partiel | 15–19 h |
| 5 | Rapports (flux superviseur→pasteur, vue pasteur, notifications) | À implémenter | 2–3 h |
| — | Présence / Disciples 70 (9 activités, KPI superviseur/mentor, nouveaux convertis) | Partiel | Variable |
| — | Notation semestrielle | À implémenter | ~40 h |
| — | Bilans périodiques | À implémenter | ~62 h |
| — | Signalisation d’abus (CSA) | À implémenter | ~32 h |
| — | KPI page d’accueil | À implémenter | Inclus dans Sprints |
| Technique | SuperviseurDashboard (refactor, boucle infinie, perf) | Critique | Inclus dans priorité 3 |
| Technique | Exports PDF/Excel | À réparer | 1–2 h |
| Technique | ErrorHandler (pages restantes) | À poursuivre | Progressif |
| Technique | Qualité (console.log, services, tests) | À traiter | Selon plan agile |

---

## 9. Ordre recommandé

### 9.1 Par quoi commencer ? (ordre performance-first)

Pour **tenir compte de la performance dès le début**, démarrer dans cet ordre :

| Étape | Action | Pourquoi (performance) | Durée indicative |
|-------|--------|--------------------------|------------------|
| **0** | Exécuter la migration **075** (sync cercle_personnes → profils) | Prérequis données, rapide ; évite incohérences ensuite. | 0,5 h |
| **1** | **Corriger la boucle infinie** SuperviseurDashboard + stabiliser les `useEffect` (deps, pas de cascade) | Point le plus critique : boucle = surcharge CPU et risque de blocage. | 2–4 h |
| **2** | **Remplacer** la logique « stats comparatives » (IntersectionObserver + setInterval 200 ms × 25) par un effet borné ou un état « zone visible » | Réduit la charge inutile et les délais (jusqu’à 5 s) au chargement. | 1–2 h |
| **3** | **Regrouper les requêtes** SuperviseurDashboard : vue SQL agrégée (famille + superviseur + pasteur + KPIs) ou hook `useSuperviseurData` qui limite les ~80 appels | Gain majeur : moins d’allers-retours réseau, temps de chargement plus court. | 4–6 h |
| **4** | **Étendre le cache** (CacheUtils) au SuperviseurDashboard si pas déjà fait | Réutilisation des données, moins de requêtes répétées (objectif 70–80 % hits). | 1–2 h |
| **5** | **Vérifier** que PerformanceMonitor + dashboard `/admin/performance` enregistrent bien le SuperviseurDashboard ; ajouter **alertes** si temps > seuil | Mesurer les gains et éviter les régressions. | 2–3 h |
| **6** | Découper SuperviseurDashboard en sous-composants (< 500 lignes) et extraire `useSuperviseurData` | Facilite mémoïsation (memo, useMemo), maintenance et tests. | 4–6 h |
| **7** | Réparer les exports PDF/Excel ; exécuter/aligner **074** si besoin | Fin de la Phase 1 Claude ; données de test pour les KPI. | 1–2 h |
| **8** | Métier prioritaire (Dashboard Pasteur, rapports, etc.) puis reste du plan | Une fois la base stable et performante. | — |

**Résumé :** commencer par **0 → 1 → 2 → 3** (données + stabilité + perf SuperviseurDashboard), puis **4, 5** (cache + monitoring), puis **6, 7, 8**.

---

### 9.2 Ordre général (référence)

1. **Données & modèle cible**  
   - Exécuter **075** (sync cercle_personnes → profils).  
   - Vérifier/aligner **074** et colonnes `attendance_tracking` / `prayer_requests`.  
   - Document : **`MODELE_CIBLE_DONNEES.md`**.

2. **CRUD profils et formulaire unique (§ 2.3)**  
   - Exécuter migrations **092** (date_entree_famille), **093** (phone, ville_residence) si pas encore fait.  
   - Phase 2 : formulaire unique réutilisable (inscription + ajout membre), une route `/signup`.  
   - Phases 3 à 5 : lecture depuis profils uniquement, cercles = comptages, CRUD cohérent via profils.

3. **Stabilité Dashboard Superviseur**  
   - Corriger la boucle infinie et les effets.  
   - Découper le composant et extraire la logique données.  
   - Réparer les exports PDF/Excel.

4. **Métier prioritaire**  
   - Dashboard Pasteur (création/complétion + tableau consolidé).  
   - Améliorations Dashboard Superviseur (tableaux détaillé et consolidé).  
   - Rapports (flux superviseur→pasteur, vue pasteur).  

5. **Objectif 3**  
   - Compléter parcours, journal, évaluations, suivi post-crise selon l’état actuel du code.

6. **Arbre généalogique**  
   - Recherche, ascendants, vue complète, panneau détails (phases décrites dans `ETAT_FONCTIONNALITES_RESTANTES.md`).

7. **Présence / Disciples 70**  
   - Activités manquantes, KPI superviseur/mentor, nouveaux convertis, absents récurrents.

8. **Sprints 11–14 (plan Claude)**  
   - KPI page d’accueil, notation semestrielle, bilans périodiques, signalisation d’abus (CSA), selon specs du rapport Claude.

9. **Qualité en continu**  
   - ErrorHandler sur les pages restantes, réduction des `console.log`, couche service, tests ciblés.

10. **Performance et UX (Phase 4 Claude – Sprints 9–10)**  
   - Alertes de performance, graphiques de tendances, export CSV métriques ; extension cache ; lazy loading / code splitting ; audit accessibilité (A11y). Voir § 5.

---

## 10. Documents de référence

| Document | Contenu utile |
|----------|----------------|
| **RAPPORT_TOUT_A_IMPLEMENTER.md** (ce document) | **Base de référence pour la suite des fonctionnalités.** Inventaire complet + CRUD profils / formulaire unique intégré (§ 2.3). |
| **RAPPORT_CRUD_PROFILS_FORMULAIRE_UNIQUE_SOURCE_VERITE.md** | Plan CRUD profils : profils = source de vérité, formulaire unique (inscription + ajout membre), cercles = comptages uniquement, phases 1–5 d’implémentation. |
| **COMPARAISON_PROFILS_FORMULAIRES_INSCRIPTION.md** | Schéma `profils` (24 colonnes + 092/093), mapping formulaire d’inscription → colonnes profils, statut spirituel = spiritual_stage, champs étendus (téléphone, ville de résidence). |
| **Rapport Claude** (synthèse : `RAPPORT_FEEDBACK_ANALYSE_CLAUDE_ET_COMPARAISON.md`) | Plan agile 14 sprints (586 h), 5 phases, bugs/perf SuperviseurDashboard, notation/bilans/signalements. **Source principale** pour performance, UX, A11y (Phase 4). |
| `INTEGRATION_ERRORHANDLER_PERFORMANCE.md` | PerformanceMonitor, dashboard `/admin/performance`, CacheUtils, améliorations monitoring. |
| `MODELE_CIBLE_DONNEES.md` | Règle « tout en profils », sync cercle_personnes → profils. |
| `ETAT_FONCTIONNALITES_RESTANTES.md` | Détail objectifs OKR, dashboards, arbre généalogique, tableaux, phases d’implémentation. |
| `ETAT_OBJECTIFS.md` | État des 3 objectifs et des pages. |
| `RAPPORT_ANALYSE_DISCIPLES_70.md` | 9 activités, KPI présence, vues superviseur/mentor. |
| `RAPPORT_DONNEES_TEST_KPI_ET_PRESENCE.md` | Procédure seed 074, vérifications, prérequis. |
| `INTEGRATION_ERRORHANDLER_COMPLETE.md` | Pattern d’intégration ErrorHandler, pages déjà traitées. |
| `sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql` | Migration modèle cible (profil_id + trigger). |
| `sql/migrations/092_add_date_entree_famille_profils.sql`, `093_add_phone_ville_residence_profils.sql` | Colonnes profils pour formulaire d’inscription (date d’entrée famille, téléphone, ville de résidence). |

---

*Rapport mis à jour le 27 janvier 2026. Intègre le rapport CRUD profils / formulaire unique et la comparaison profils–formulaires d’inscription. **Document de référence unique : la suite des fonctionnalités à implémenter se base sur ce dernier rapport.** À actualiser au fil des livraisons.*
