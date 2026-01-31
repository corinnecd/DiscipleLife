/**
 * Système de monitoring des performances
 * Mesure et enregistre les temps de chargement et les requêtes pour valider les optimisations
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: {},
      apiCalls: [],
      cacheHits: 0,
      cacheMisses: 0,
      renderTimes: {}
    };
    
    // Stocker dans localStorage pour persister entre les sessions
    if (typeof window !== 'undefined' && window.localStorage) {
      this.loadFromStorage();
    }
  }

  /**
   * Démarre le monitoring d'une page
   */
  startPageLoad(pageName) {
    const startTime = performance.now();
    this.metrics.pageLoads[pageName] = {
      startTime,
      loadTime: null,
      apiCallCount: 0,
      cacheHitCount: 0,
      cacheMissCount: 0
    };
  }

  /**
   * Termine le monitoring d'une page
   */
  endPageLoad(pageName) {
    if (this.metrics.pageLoads[pageName]) {
      const endTime = performance.now();
      const prev = this.metrics.pageLoads[pageName];
      this.metrics.pageLoads[pageName] = {
        ...prev,
        loadTime: endTime - (prev.startTime || endTime)
      };
      this.saveToStorage();
    }
  }

  /**
   * Enregistre un appel API
   */
  recordApiCall(endpoint, method = 'GET', duration = null, fromCache = false) {
    const apiCall = {
      endpoint,
      method,
      duration: duration || null,
      timestamp: new Date().toISOString(),
      fromCache
    };

    this.metrics.apiCalls = [...(this.metrics.apiCalls || []), apiCall];

    if (fromCache) {
      this.metrics.cacheHits = (this.metrics.cacheHits || 0) + 1;
      const pageKeys = Object.keys(this.metrics.pageLoads || {});
      const lastKey = pageKeys[pageKeys.length - 1];
      if (lastKey && this.metrics.pageLoads[lastKey]) {
        const prev = this.metrics.pageLoads[lastKey];
        this.metrics.pageLoads[lastKey] = { ...prev, cacheHitCount: (prev.cacheHitCount || 0) + 1 };
      }
    } else {
      this.metrics.cacheMisses = (this.metrics.cacheMisses || 0) + 1;
      const pageKeys = Object.keys(this.metrics.pageLoads || {});
      const lastKey = pageKeys[pageKeys.length - 1];
      if (lastKey && this.metrics.pageLoads[lastKey]) {
        const prev = this.metrics.pageLoads[lastKey];
        this.metrics.pageLoads[lastKey] = { ...prev, cacheMissCount: (prev.cacheMissCount || 0) + 1 };
      }
    }

    // Garder seulement les 100 derniers appels
    if (this.metrics.apiCalls.length > 100) {
      this.metrics.apiCalls = this.metrics.apiCalls.slice(-100);
    }

    this.saveToStorage();
  }

  /**
   * Mesure le temps de rendu d'un composant
   */
  measureRender(componentName, renderFn) {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();

    const prevTimes = this.metrics.renderTimes[componentName] || [];
    const nextTimes = [...prevTimes, endTime - startTime].slice(-50);
    this.metrics.renderTimes = { ...this.metrics.renderTimes, [componentName]: nextTimes };

    this.saveToStorage();
    return result;
  }

  /**
   * Retourne les pages dont le temps de chargement dépasse le seuil (pour alertes)
   * @param {number} thresholdMs - Seuil en ms (défaut 3000)
   * @returns {Array<{ page: string, loadTime: number }>}
   */
  getPagesOverThreshold(thresholdMs = 3000) {
    return Object.entries(this.metrics.pageLoads)
      .filter(([, data]) => data.loadTime != null && data.loadTime > thresholdMs)
      .map(([page, data]) => ({ page, loadTime: data.loadTime }));
  }

  /**
   * Obtient les statistiques de performance pour une page
   */
  getPageStats(pageName) {
    const pageLoad = this.metrics.pageLoads[pageName];
    if (!pageLoad) return null;

    const cacheHitRate = (pageLoad.cacheHitCount + pageLoad.cacheMissCount) > 0
      ? (pageLoad.cacheHitCount / (pageLoad.cacheHitCount + pageLoad.cacheMissCount)) * 100
      : 0;

    return {
      loadTime: pageLoad.loadTime,
      apiCallCount: pageLoad.apiCallCount,
      cacheHitRate: cacheHitRate.toFixed(2) + '%',
      cacheHits: pageLoad.cacheHitCount,
      cacheMisses: pageLoad.cacheMissCount
    };
  }

  /**
   * Obtient les statistiques globales
   */
  getGlobalStats() {
    const totalCalls = this.metrics.apiCalls.length;
    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
      : 0;

    const avgLoadTimes = Object.entries(this.metrics.pageLoads).reduce((acc, [page, data]) => {
      if (data.loadTime) {
        acc[page] = data.loadTime;
      }
      return acc;
    }, {});

    return {
      totalApiCalls: totalCalls,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      cacheHitRate: cacheHitRate.toFixed(2) + '%',
      pageLoadTimes: avgLoadTimes,
      recentApiCalls: this.metrics.apiCalls.slice(-10)
    };
  }

  /**
   * Génère un rapport de performance
   */
  generateReport() {
    const globalStats = this.getGlobalStats();
    const pageStats = Object.keys(this.metrics.pageLoads).reduce((acc, page) => {
      acc[page] = this.getPageStats(page);
      return acc;
    }, {});

    return {
      generatedAt: new Date().toISOString(),
      global: globalStats,
      pages: pageStats,
      renderTimes: Object.entries(this.metrics.renderTimes).reduce((acc, [component, times]) => {
        acc[component] = {
          avg: times.reduce((a, b) => a + b, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          count: times.length
        };
        return acc;
      }, {})
    };
  }

  /**
   * Exporte les métriques au format JSON
   */
  exportMetrics() {
    return JSON.stringify(this.generateReport(), null, 2);
  }

  /**
   * Réinitialise toutes les métriques
   */
  reset() {
    this.metrics = {
      pageLoads: {},
      apiCalls: [],
      cacheHits: 0,
      cacheMisses: 0,
      renderTimes: {}
    };
    this.saveToStorage();
  }

  /**
   * Sauvegarde dans localStorage
   */
  saveToStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('performance_metrics', JSON.stringify(this.metrics));
      } catch (e) {
        console.warn('Impossible de sauvegarder les métriques:', e);
      }
    }
  }

  /**
   * Charge depuis localStorage
   */
  loadFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('performance_metrics');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Fusionner avec les métriques actuelles
          this.metrics = {
            ...this.metrics,
            ...parsed,
            pageLoads: {
              ...this.metrics.pageLoads,
              ...parsed.pageLoads
            }
          };
        }
      } catch (e) {
        console.warn('Impossible de charger les métriques:', e);
      }
    }
  }

  /**
   * Affiche un résumé dans la console
   */
  logSummary() {
    const report = this.generateReport();
    console.group('📊 Rapport de Performance');
    console.log('Métriques Globales:', report.global);
    console.log('Métriques par Page:', report.pages);
    console.log('Temps de Rendu:', report.renderTimes);
    console.groupEnd();
    return report;
  }
}

// Instance singleton
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

// Hook React pour utiliser le monitor (nécessite React, donc optionnel)
if (typeof window !== 'undefined') {
  // Exposer globalement pour utilisation dans les composants
  window.performanceMonitor = performanceMonitor;
}
