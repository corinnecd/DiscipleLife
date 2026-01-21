import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, Trash2, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import performanceMonitor from '@/lib/PerformanceMonitor';
import { motion } from 'framer-motion';

const PerformanceDashboard = () => {
  const [report, setReport] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadReport();
  }, [refreshKey]);

  const loadReport = () => {
    const newReport = performanceMonitor.generateReport();
    setReport(newReport);
  };

  const handleExport = () => {
    const metrics = performanceMonitor.exportMetrics();
    const blob = new Blob([metrics], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser toutes les métriques ?')) {
      performanceMonitor.reset();
      setRefreshKey(prev => prev + 1);
    }
  };

  if (!report) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Chargement des métriques...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord des Performances</h1>
          <p className="text-gray-600 mt-2">
            Métriques de performance pour valider les optimisations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter JSON
          </Button>
          <Button onClick={handleReset} variant="outline" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={() => setRefreshKey(prev => prev + 1)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Métriques Globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Appels API Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{report.global.totalApiCalls}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taux de Cache</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{report.global.cacheHitRate}</div>
              <div className="text-xs text-gray-500 mt-1">
                {report.global.cacheHits} hits / {report.global.cacheMisses} misses
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cache Hits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{report.global.cacheHits}</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Requêtes évitées
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cache Misses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{report.global.cacheMisses}</div>
              <div className="flex items-center text-xs text-orange-600 mt-1">
                <TrendingDown className="h-3 w-3 mr-1" />
                Requêtes effectuées
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Temps de Chargement par Page */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Temps de Chargement par Page
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(report.pages).map(([page, stats]) => (
              stats && (
                <div key={page} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{page}</div>
                    <div className="text-sm text-gray-500">
                      {stats.apiCallCount} appels API • Cache: {stats.cacheHitRate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${stats.loadTime < 1000 ? 'text-green-600' : stats.loadTime < 3000 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {stats.loadTime ? stats.loadTime.toFixed(0) : 'N/A'}ms
                    </div>
                    <div className="text-xs text-gray-500">
                      {stats.loadTime < 1000 ? 'Excellent' : stats.loadTime < 3000 ? 'Bon' : 'À optimiser'}
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
          {Object.keys(report.pages).length === 0 && (
            <p className="text-center text-gray-500 py-8">Aucune métrique de page disponible</p>
          )}
        </CardContent>
      </Card>

      {/* Temps de Rendu des Composants */}
      {Object.keys(report.renderTimes).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Temps de Rendu des Composants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(report.renderTimes).map(([component, stats]) => (
                <div key={component} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900">{component}</div>
                  <div className="text-sm text-gray-600">
                    Moyenne: {stats.avg.toFixed(2)}ms • Min: {stats.min.toFixed(2)}ms • Max: {stats.max.toFixed(2)}ms
                    <span className="ml-2 text-gray-400">({stats.count} mesures)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Derniers Appels API */}
      {report.global.recentApiCalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>10 Derniers Appels API</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.global.recentApiCalls.map((call, index) => (
                <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${call.fromCache ? 'bg-green-500' : 'bg-blue-500'}`} />
                    <span className="font-mono text-gray-700">{call.endpoint}</span>
                    <Badge variant="outline" className="text-xs">
                      {call.method}
                    </Badge>
                  </div>
                  <div className="text-gray-500">
                    {call.fromCache ? (
                      <span className="text-green-600">Cache</span>
                    ) : (
                      call.duration ? `${call.duration.toFixed(0)}ms` : 'N/A'
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-gray-500 text-center">
        Rapport généré le {new Date(report.generatedAt).toLocaleString('fr-FR')}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
