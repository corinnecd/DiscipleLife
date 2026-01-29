import React from 'react';
import { AlertCircle, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Section alertes (disciples inactifs, membres sans progression).
 */
export function AlertesSection({
  alertes,
  showAllInactifs,
  setShowAllInactifs,
  showAllSansProgression,
  setShowAllSansProgression,
}) {
  const hasAlertes = alertes?.disciplesInactifs?.length > 0 || alertes?.membresSansProgression?.length > 0;

  if (hasAlertes) {
    return (
      <Card className="bg-white border-gray-200 shadow-sm border-orange-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Alertes et Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alertes.disciplesInactifs?.length > 0 && (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="text-sm font-semibold text-orange-900 mb-2">
                  Disciples Inactifs ({alertes.disciplesInactifs.length})
                </h3>
                <p className="text-xs text-orange-700 mb-2">
                  Disciples inactifs depuis plus de 30 jours
                </p>
                <div className="space-y-1">
                  {(showAllInactifs ? alertes.disciplesInactifs : alertes.disciplesInactifs.slice(0, 3)).map((disciple) => (
                    <div key={disciple.id} className="text-sm text-gray-900">
                      • {disciple.first_name} {disciple.last_name}
                    </div>
                  ))}
                  {alertes.disciplesInactifs.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllInactifs(!showAllInactifs)}
                      className="text-xs text-orange-700 hover:text-orange-900 hover:bg-orange-100 mt-2 h-7 px-2"
                    >
                      {showAllInactifs ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Voir moins
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Voir plus ({alertes.disciplesInactifs.length - 3} autres)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {alertes.membresSansProgression?.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="text-sm font-semibold text-red-900 mb-2">
                  Membres sans Progression ({alertes.membresSansProgression.length})
                </h3>
                <p className="text-xs text-red-700 mb-2">
                  Membres n'ayant aucune formation ni vidéo en cours ou terminée
                </p>
                <div className="space-y-1">
                  {(showAllSansProgression ? alertes.membresSansProgression : alertes.membresSansProgression.slice(0, 3)).map((membre) => (
                    <div key={membre.id} className="text-sm text-gray-900">
                      • {membre.first_name} {membre.last_name}
                    </div>
                  ))}
                  {alertes.membresSansProgression.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllSansProgression(!showAllSansProgression)}
                      className="text-xs text-red-700 hover:text-red-900 hover:bg-red-100 mt-2 h-7 px-2"
                    >
                      {showAllSansProgression ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Voir moins
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Voir plus ({alertes.membresSansProgression.length - 3} autres)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200 shadow-sm border-green-200">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-900">
            Aucune alerte : tous les membres sont actifs et suivent leurs formations !
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
