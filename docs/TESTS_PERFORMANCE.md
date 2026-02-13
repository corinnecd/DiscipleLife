# Tests de Performance - Disciple Life

Ce document décrit les tests de performance à effectuer pour identifier les goulots d'étranglement et optimiser l'application.

## 📋 Table des matières

1. [Tests de Performance Frontend](#1-tests-de-performance-frontend)
2. [Tests de Performance Backend](#2-tests-de-performance-backend)
3. [Tests de Performance Base de Données](#3-tests-de-performance-base-de-données)
4. [Outils de Monitoring](#4-outils-de-monitoring)
5. [Métriques Cibles](#5-métriques-cibles)

---

## 1. Tests de Performance Frontend

### 1.1 Lighthouse (Chrome DevTools)

**Objectif :** Évaluer les performances générales de l'application web.

**Procédure :**
1. Ouvrir Chrome DevTools (F12)
2. Aller dans l'onglet "Lighthouse"
3. Sélectionner les catégories : Performance, Accessibility, Best Practices, SEO
4. Cliquer sur "Generate report"

**Métriques à surveiller :**
- **First Contentful Paint (FCP)** : < 1.8s
- **Largest Contentful Paint (LCP)** : < 2.5s
- **Time to Interactive (TTI)** : < 3.8s
- **Total Blocking Time (TBT)** : < 200ms
- **Cumulative Layout Shift (CLS)** : < 0.1

**Pages à tester :**
- `/home` (Dashboard Home)
- `/space/pasteur` (Dashboard Pasteur)
- `/space/superviseur` (Dashboard Superviseur)
- `/space/mentor` (Dashboard Mentor)
- `/space/disciple` (Dashboard Disciple)
- `/suivi-post-crise` (Suivi Post-Crise)
- `/transformation` (Transformation)

### 1.2 React DevTools Profiler

**Objectif :** Identifier les composants React qui ralentissent le rendu.

**Procédure :**
1. Installer l'extension React DevTools
2. Ouvrir l'onglet "Profiler"
3. Cliquer sur "Record" et effectuer des actions dans l'application
4. Analyser les composants qui prennent le plus de temps à rendre

**Actions à tester :**
- Chargement initial des dashboards
- Navigation entre les pages
- Ouverture de modales/popups
- Recherche dans les listes
- Soumission de formulaires

**Composants critiques à surveiller :**
- `DiscipleDashboard`
- `MentorDashboard`
- `SuperviseurDashboard`
- `PasteurDashboard`
- `GenealogicalTree`
- `SuiviPostCrise`
- `SuiviPostCriseDetail`

### 1.3 Bundle Size Analysis

**Objectif :** Analyser la taille des bundles JavaScript pour identifier les dépendances lourdes.

**Procédure :**
```bash
# Installer webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# Analyser le bundle (si configuré dans Vite)
npm run build
npx vite-bundle-visualizer
```

**Optimisations recommandées :**
- Lazy loading des pages lourdes (déjà en place)
- Tree-shaking des dépendances non utilisées
- Code splitting pour les graphiques (recharts)
- Compression gzip/brotli

### 1.4 Network Performance

**Objectif :** Mesurer les temps de chargement des ressources réseau.

**Procédure :**
1. Ouvrir Chrome DevTools > Network
2. Rafraîchir la page
3. Observer les temps de chargement

**Métriques à surveiller :**
- Temps de chargement total < 3s
- Nombre de requêtes < 50
- Taille totale des ressources < 2 MB
- Temps de réponse API < 500ms

---

## 2. Tests de Performance Backend

### 2.1 Tests de Charge API

**Objectif :** Tester la capacité de l'API à gérer plusieurs requêtes simultanées.

**Outils :**
- Apache JMeter
- k6 (recommandé)
- Artillery

**Scénarios de test :**

#### Scénario 1 : Chargement du Dashboard
```javascript
// k6 script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Montée à 10 utilisateurs
    { duration: '1m', target: 50 },   // Montée à 50 utilisateurs
    { duration: '30s', target: 0 },   // Descente à 0
  ],
};

export default function () {
  const token = 'YOUR_AUTH_TOKEN';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test de chargement du dashboard
  let res = http.get('https://your-supabase-url.supabase.co/rest/v1/profils?select=*', {
    headers: headers,
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Commande :**
```bash
k6 run load-test.js
```

#### Scénario 2 : Création de Suivi Post-Crise
```javascript
export default function () {
  const payload = JSON.stringify({
    type_crise: 'maladie',
    description: 'Test de charge',
    gravite: 5,
    statut: 'actif',
  });

  let res = http.post('https://your-supabase-url.supabase.co/rest/v1/suivi_post_crise', payload, {
    headers: headers,
  });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(2);
}
```

**Métriques cibles :**
- Temps de réponse moyen < 500ms
- Temps de réponse p95 < 1s
- Taux d'erreur < 1%
- Throughput > 100 req/s

### 2.2 Tests de Stress

**Objectif :** Identifier le point de rupture de l'application.

**Procédure :**
```javascript
export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Montée rapide
    { duration: '5m', target: 100 },  // Maintien
    { duration: '2m', target: 200 },  // Montée extrême
    { duration: '5m', target: 200 },  // Maintien
    { duration: '2m', target: 0 },    // Descente
  ],
};
```

---

## 3. Tests de Performance Base de Données

### 3.1 Analyse des Requêtes Lentes

**Objectif :** Identifier les requêtes SQL qui prennent le plus de temps.

**Procédure dans Supabase :**
1. Aller dans le SQL Editor
2. Exécuter le script `sql/optimizations/query_optimizations.sql`
3. Consulter les vues de monitoring

**Requêtes de monitoring :**

```sql
-- Vérifier l'utilisation des index
SELECT * FROM v_index_usage WHERE index_scans < 100;

-- Vérifier la taille des tables
SELECT * FROM v_table_sizes;

-- Analyser les requêtes lentes (si pg_stat_statements est activé)
SELECT 
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  query
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 3.2 Tests de Charge Base de Données

**Objectif :** Tester les performances des requêtes avec un volume de données important.

**Procédure :**
1. Créer des données de test (10k+ enregistrements)
2. Exécuter les requêtes critiques
3. Mesurer les temps d'exécution

**Requêtes critiques à tester :**

```sql
-- Dashboard Pasteur : Statistiques globales
EXPLAIN ANALYZE
SELECT * FROM mv_famille_stats;

-- Dashboard Mentor : Liste des disciples
EXPLAIN ANALYZE
SELECT * FROM v_disciples_with_activity WHERE mentor_id = 'UUID';

-- Suivi Post-Crise : Liste des suivis actifs
EXPLAIN ANALYZE
SELECT * FROM suivi_post_crise 
WHERE user_id = 'UUID' AND statut IN ('actif', 'en_amelioration')
ORDER BY created_at DESC;

-- Historique de guérison : Évolution
EXPLAIN ANALYZE
SELECT * FROM historique_guerison 
WHERE suivi_id = 'UUID' 
ORDER BY date_suivi DESC;
```

**Métriques cibles :**
- Temps d'exécution < 100ms pour les requêtes simples
- Temps d'exécution < 500ms pour les requêtes complexes
- Utilisation des index > 90%

### 3.3 Rafraîchissement des Vues Matérialisées

**Objectif :** Mesurer le temps de rafraîchissement des vues matérialisées.

**Procédure :**
```sql
-- Mesurer le temps de rafraîchissement
\timing on
SELECT refresh_all_dashboard_views();
\timing off
```

**Métriques cibles :**
- Temps de rafraîchissement < 5s pour toutes les vues
- Pas de blocage des requêtes pendant le rafraîchissement (CONCURRENTLY)

---

## 4. Outils de Monitoring

### 4.1 Supabase Dashboard

**Métriques à surveiller :**
- Database CPU Usage
- Database Memory Usage
- Database Disk I/O
- API Requests per minute
- API Response time

**Alertes recommandées :**
- CPU > 80% pendant 5 minutes
- Mémoire > 90%
- Temps de réponse API > 1s
- Taux d'erreur > 5%

### 4.2 Browser Performance API

**Implémentation dans l'application :**

```javascript
// src/utils/performance.js
export const measurePageLoad = () => {
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
    const connectTime = timing.responseEnd - timing.requestStart;

    console.log('Page Load Time:', loadTime, 'ms');
    console.log('DOM Ready Time:', domReadyTime, 'ms');
    console.log('Connect Time:', connectTime, 'ms');

    // Envoyer les métriques à un service d'analytics (optionnel)
    // analytics.track('page_load', { loadTime, domReadyTime, connectTime });
  }
};

// Appeler au chargement de chaque page
window.addEventListener('load', measurePageLoad);
```

### 4.3 Custom Performance Hooks

**Hook pour mesurer le temps de rendu des composants :**

```javascript
// src/hooks/usePerformance.js
import { useEffect, useRef } from 'react';

export const usePerformance = (componentName) => {
  const startTime = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    if (renderTime > 100) {
      console.warn(`${componentName} took ${renderTime.toFixed(2)}ms to render`);
    }
  }, [componentName]);
};

// Utilisation
function MyComponent() {
  usePerformance('MyComponent');
  // ...
}
```

---

## 5. Métriques Cibles

### 5.1 Frontend

| Métrique | Cible | Critique |
|----------|-------|----------|
| FCP | < 1.8s | < 3s |
| LCP | < 2.5s | < 4s |
| TTI | < 3.8s | < 7.3s |
| TBT | < 200ms | < 600ms |
| CLS | < 0.1 | < 0.25 |
| Bundle Size | < 500 KB | < 1 MB |

### 5.2 Backend

| Métrique | Cible | Critique |
|----------|-------|----------|
| Temps de réponse API (moyenne) | < 200ms | < 500ms |
| Temps de réponse API (p95) | < 500ms | < 1s |
| Temps de réponse API (p99) | < 1s | < 2s |
| Throughput | > 100 req/s | > 50 req/s |
| Taux d'erreur | < 0.1% | < 1% |

### 5.3 Base de Données

| Métrique | Cible | Critique |
|----------|-------|----------|
| Temps d'exécution requête simple | < 50ms | < 100ms |
| Temps d'exécution requête complexe | < 200ms | < 500ms |
| Temps de rafraîchissement vues | < 5s | < 10s |
| Utilisation CPU | < 60% | < 80% |
| Utilisation Mémoire | < 70% | < 90% |

---

## 6. Plan d'Action en cas de Problèmes

### 6.1 Frontend Lent

**Symptômes :**
- FCP > 3s
- LCP > 4s
- TTI > 7s

**Actions :**
1. Analyser le bundle avec webpack-bundle-analyzer
2. Implémenter le lazy loading pour les composants lourds
3. Optimiser les images (compression, format WebP)
4. Réduire le nombre de re-renders (React.memo, useMemo, useCallback)
5. Utiliser la virtualisation pour les longues listes (react-window)

### 6.2 API Lente

**Symptômes :**
- Temps de réponse > 1s
- Taux d'erreur > 1%

**Actions :**
1. Vérifier les requêtes N+1
2. Ajouter des index sur les colonnes filtrées
3. Utiliser les vues matérialisées pour les statistiques
4. Implémenter la pagination pour les listes longues
5. Activer le cache HTTP (Cache-Control headers)

### 6.3 Base de Données Lente

**Symptômes :**
- Requêtes > 500ms
- CPU > 80%

**Actions :**
1. Analyser les requêtes avec EXPLAIN ANALYZE
2. Ajouter des index manquants
3. Optimiser les requêtes complexes
4. Rafraîchir les statistiques de la base (ANALYZE)
5. Augmenter les ressources de la base (scaling vertical)

---

## 7. Checklist de Performance

### Avant le Déploiement

- [ ] Tests Lighthouse sur toutes les pages principales
- [ ] Bundle size < 1 MB
- [ ] Lazy loading activé pour les pages lourdes
- [ ] Images optimisées (compression, format WebP)
- [ ] Vues matérialisées créées et rafraîchies
- [ ] Index créés sur toutes les colonnes filtrées
- [ ] Tests de charge API réussis (> 100 req/s)
- [ ] Temps de réponse API < 500ms (p95)
- [ ] Monitoring activé (Supabase Dashboard)

### Après le Déploiement

- [ ] Monitoring des métriques en production
- [ ] Alertes configurées (CPU, mémoire, erreurs)
- [ ] Logs analysés régulièrement
- [ ] Feedback utilisateurs collecté
- [ ] Tests de performance mensuels

---

## 8. Ressources

### Outils

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [React DevTools Profiler](https://reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html)
- [k6 Load Testing](https://k6.io/)
- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)

### Documentation

- [Web Vitals](https://web.dev/vitals/)
- [Supabase Performance](https://supabase.com/docs/guides/platform/performance)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Date de dernière mise à jour :** 2026-02-11
