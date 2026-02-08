import React from 'react';
import { Target, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Carte des statistiques comparatives (moyenne autres familles, classement).
 */
export function StatsComparatives({ statsComparatives, loadingStatsComparatives, stats }) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          Statistiques Comparatives
        </CardTitle>
      </CardHeader>
      <CardContent>
        {statsComparatives && statsComparatives.moyenneAutresFamilles != null ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats?.nombreMembres ?? 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Votre famille</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {statsComparatives.moyenneAutresFamilles}
              </div>
              <div className="text-sm text-gray-600 mt-1">Moyenne des autres familles</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                #{statsComparatives.classement}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Classement sur {statsComparatives.totalFamilles} famille{statsComparatives.totalFamilles > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ) : loadingStatsComparatives ? (
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
            <p>Calcul en cours...</p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>Faites défiler pour charger les statistiques</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
