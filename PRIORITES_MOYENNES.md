# Priorités Moyennes - Améliorations du Dashboard Pasteur

## ✅ État Actuel

### Tableau Consolidé des Mentors
Le tableau consolidé est **déjà implémenté** avec les 7 colonnes requises :
1. ✅ Nom
2. ✅ Prénom (mentor)
3. ✅ Église (famille)
4. ✅ Nombre de disciples
5. ✅ Avancement % vers objectif 70
6. ✅ Nombre de disciples présents
7. ✅ Taux de participation semaine (%)

**Fonctionnalités existantes:**
- ✅ Recherche/filtrage des mentors
- ✅ Export CSV/Excel
- ✅ Affichage des barres de progression pour l'avancement
- ✅ Calcul dynamique des statistiques si absentes dans `profils`
- ✅ Cache pour optimiser les performances (2 minutes)

---

## 🎯 Améliorations Recommandées

### 1. Optimisation des Performances

#### Problèmes identifiés:
- La fonction `fetchMentorsConsolides` fait des requêtes séquentielles dans une boucle `Promise.all`
- Chaque mentor nécessite potentiellement plusieurs requêtes pour calculer les statistiques
- Pas de pagination pour les grandes listes de mentors

#### Solutions proposées:
- [ ] **Optimiser les requêtes groupées:** Utiliser des requêtes agrégées au lieu de boucles
- [ ] **Ajouter la pagination:** Limiter l'affichage à 50 mentors par page
- [ ] **Améliorer le cache:** Augmenter la durée du cache à 5 minutes pour les données peu changeantes
- [ ] **Lazy loading:** Charger les données au fur et à mesure du scroll

---

### 2. Validation des Données

#### Problèmes identifiés:
- Pas de validation des données avant affichage
- Les valeurs nulles ou invalides peuvent causer des erreurs d'affichage
- Pas de vérification de cohérence entre les différentes sources de données

#### Solutions proposées:
- [ ] **Validation des données:** Vérifier que les valeurs sont dans des plages acceptables
- [ ] **Gestion des erreurs:** Afficher des messages d'erreur clairs si les données sont invalides
- [ ] **Valeurs par défaut:** Utiliser des valeurs par défaut sensées pour les champs manquants
- [ ] **Vérification de cohérence:** Comparer les données entre `profils` et `cercle_personnes`

---

### 3. Amélioration de l'Interface Utilisateur

#### Améliorations possibles:
- [ ] **Tri des colonnes:** Permettre de trier par n'importe quelle colonne
- [ ] **Filtres avancés:** Ajouter des filtres par église, avancement, etc.
- [ ] **Indicateurs visuels:** Ajouter des badges de statut (ex: "Objectif atteint", "En progression")
- [ ] **Graphiques:** Ajouter des graphiques pour visualiser les tendances
- [ ] **Export PDF:** Ajouter la possibilité d'exporter en PDF en plus du CSV

---

### 4. Gestion des Erreurs et États de Chargement

#### Améliorations possibles:
- [ ] **Meilleur feedback:** Afficher des messages plus détaillés lors des erreurs
- [ ] **Retry automatique:** Réessayer automatiquement en cas d'échec de requête
- [ ] **États de chargement granulaires:** Afficher le chargement par section au lieu de tout le dashboard
- [ ] **Gestion des timeouts:** Gérer les timeouts de requête de manière plus élégante

---

### 5. Tests et Qualité

#### À implémenter:
- [ ] **Tests unitaires:** Tester les fonctions de calcul des statistiques
- [ ] **Tests d'intégration:** Tester le flux complet de récupération des données
- [ ] **Tests de performance:** Vérifier que les requêtes sont optimisées
- [ ] **Validation des données:** Tester avec des données invalides ou manquantes

---

## 📋 Plan d'Action Recommandé

### Phase 1: Optimisation (Priorité 1)
1. Optimiser les requêtes groupées dans `fetchMentorsConsolides`
2. Ajouter la pagination au tableau
3. Améliorer le système de cache

### Phase 2: Validation (Priorité 2)
1. Ajouter la validation des données
2. Améliorer la gestion des erreurs
3. Ajouter des valeurs par défaut

### Phase 3: Interface (Priorité 3)
1. Ajouter le tri des colonnes
2. Ajouter des filtres avancés
3. Améliorer les indicateurs visuels

---

## 🔍 Points d'Attention

1. **Performance:** Le tableau peut être lent avec beaucoup de mentors (100+)
2. **Données manquantes:** Certains mentors peuvent ne pas avoir toutes les statistiques
3. **Cohérence:** Vérifier que les données sont cohérentes entre les différentes sources
4. **RLS:** Certaines requêtes peuvent être limitées par Row Level Security

---

## ✅ Checklist de Vérification

- [ ] Le tableau affiche correctement les 7 colonnes
- [ ] Les statistiques sont calculées correctement
- [ ] L'export CSV fonctionne
- [ ] La recherche fonctionne
- [ ] Les performances sont acceptables (< 3 secondes de chargement)
- [ ] Les erreurs sont gérées correctement
- [ ] Les données sont validées avant affichage

---

**Date de création:** 2025-01-XX
**Statut:** En attente d'implémentation
