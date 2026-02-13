# Plan – Objectif 3 (finalisation) puis Dashboards

**Date :** 11 février 2026

---

## 1. Objectif 3 – Finalisation (parcours, journal, évaluations, suivi post-crise)

### 1.1 État actuel (déjà en place)

| Élément | Statut | Fichier / tables |
|--------|--------|-------------------|
| Bibliothèque de parcours | **En place** | `Transformation.jsx`, `ParcoursDetail.jsx` ; `parcours_transformation`, `modules_parcours`, `user_parcours_progression` |
| Journal personnel | **En place** | Filtres date/thématique, recherche, édition, suppression ; **export CSV ajouté** (entrées filtrées) |
| Évaluations continues | **En place** | `evaluations_croissance`, formulaires, filtres domaine/type/date, graphiques |
| Ressources guérison | **En place** | Onglet « Ressources guérison » dans Transformation.jsx |
| Suivi post-crise | **En place** | `suivi_post_crise`, `historique_guerison` (migration 073), formulaire et liste |
| Statistiques | **En place** | Graphiques, export CSV/JSON, certificats PDF (parcours complétés) |

### 1.2 Modifications récentes

- **Export du journal** : bouton « Exporter le journal » dans l’onglet Journal ; exporte les entrées **filtrées** en CSV (Date, Titre, Thématique, Contenu).

### 1.3 Vérifications recommandées (à faire en base / manuellement)

1. **Migrations** : exécuter si besoin  
   - **016** (ou équivalent) : tables `parcours_transformation`, `modules_parcours`, `user_parcours_progression`, `journal_transformation`, `evaluations_croissance`.  
   - **073** : `suivi_post_crise`, `historique_guerison`.

2. **Script de vérification** : `sql/verification_objectif3_tables.sql` — exécuter dans Supabase pour vérifier l'existence des 7 tables et des colonnes ; une requête liste aussi les politiques RLS sur ces tables.

3. **RLS Supabase** : pour chaque table Objectif 3, vérifier que les politiques permettent à l’utilisateur connecté de lire/écrire **ses** données (ex. `user_id = auth.uid()` ou lien via `profils`).

4. **Données de test** : au moins un parcours avec modules, une entrée de journal, une évaluation, un suivi post-crise pour valider les onglets.

### 1.4 Optionnel (plus tard)

- Statistiques globales (comparaisons, tendances).
- Certificats de complétion déjà présents ; amélioration visuelle si besoin.
- Partage de progression (export, lien).
- Rappels/alertes suivi post-crise (notifications).

---

## 2. Dashboards – État et suite

### 2.1 Dashboard Pasteur

| Élément | Statut |
|--------|--------|
| Page dédiée `PasteurDashboard.jsx` | **Implémenté** |
| Tableau 7 colonnes (Nom, Prénom, Église, Nb disciples, Avancement %, etc.) | **Implémenté** |
| Statistiques agrégées, recherche, filtres | **Implémenté** |
| Export CSV/Excel | **Implémenté** |
| Redirection AdminDashboard → PasteurDashboard si role pasteur | **Implémenté** |

**Fait** : lien « Mon arbre » dans le bandeau du dashboard vers `/arbre-genealogique`.  
**Suite possible** : graphiques de progression dans le temps, alertes (familles sous objectif).

### 2.2 Dashboard Superviseur

| Élément | Statut |
|--------|--------|
| Tableau détaillé disciples (10 colonnes) | **Implémenté** |
| Vue consolidée mentors (piliers) | **Implémenté** |
| Export CSV/Excel/PDF | **Implémenté** |
| Stabilité (boucle infinie, stats comparatives) | **Corrigé** (sync ref, useEffect dédié) |
| Refactor (découpage composants) | Optionnel |

**Suite possible** : renforcer alertes, filtres avancés, graphiques de tendance.

**Fait** : lien « Mon arbre » ajouté dans l’en-tête (SuperviseurDashboardHeader) vers `/arbre-genealogique`. Exports PDF/Excel du bandeau, du tableau détaillé disciples et du tableau consolidé mentors sont en place dans `useSuperviseurDashboard`.

### 2.3 Ordre recommandé

1. **Finaliser Objectif 3** : vérifier migrations 016 et 073, RLS, tester tous les onglets Transformation + export journal.  
2. **Dashboard Pasteur** : si besoin, ajouter uniquement les évolutions souhaitées (ex. graphiques).  
3. **Dashboard Superviseur** : valider en prod, puis refactor/découpage si nécessaire.

---

## 3. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/pages/Transformation.jsx` | Page Objectif 3 (parcours, journal, évaluations, guérison, suivi post-crise, stats, export journal). |
| `src/pages/ParcoursDetail.jsx` | Détail d’un parcours, modules, progression. |
| `docs/OBJECTIF3_CHECKLIST.md` | Checklist tables et onglets. |
| `sql/migrations/016_objectif3_transformation_tables.sql` | Tables parcours, journal, évaluations. |
| `sql/migrations/073_objectif3_suivi_post_crise.sql` | Tables suivi post-crise. |
| `src/pages/dashboards/PasteurDashboard.jsx` | Dashboard Pasteur. |
| `src/pages/dashboards/SuperviseurDashboard.jsx` | Dashboard Superviseur. |

---

*Document de référence pour la finalisation Objectif 3 et la suite des dashboards.*
