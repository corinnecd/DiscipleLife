import React from 'react';
import { Activity, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Section Activité récente (inscriptions semaine/mois/trimestre + derniers rapports).
 */
export function ActiviteRecente({ activiteRecente, onMemberClick }) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-600" />
          Activité Récente - Disciples Arrivés
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Cette Semaine</h3>
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                {activiteRecente?.inscriptionsSemaine?.length || 0}
              </Badge>
            </div>
            {activiteRecente?.inscriptionsSemaine?.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activiteRecente.inscriptionsSemaine.map((inscription) => (
                  <div
                    key={inscription.id}
                    className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                    onClick={() => onMemberClick?.(inscription.id)}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={inscription.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {inscription.first_name?.charAt(0)}{inscription.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {inscription.first_name} {inscription.last_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(inscription.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">Aucune inscription cette semaine</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Ce Mois</h3>
              <Badge variant="default" className="bg-green-100 text-green-800">
                {activiteRecente?.inscriptionsMois?.length || 0}
              </Badge>
            </div>
            {activiteRecente?.inscriptionsMois?.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activiteRecente.inscriptionsMois.map((inscription) => (
                  <div
                    key={inscription.id}
                    className="flex items-center gap-3 p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                    onClick={() => onMemberClick?.(inscription.id)}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={inscription.avatar_url} />
                      <AvatarFallback className="bg-green-100 text-green-600 text-xs">
                        {inscription.first_name?.charAt(0)}{inscription.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {inscription.first_name} {inscription.last_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(inscription.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">Aucune inscription ce mois</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Ce Trimestre</h3>
              <Badge variant="default" className="bg-purple-100 text-purple-800">
                {activiteRecente?.inscriptionsTrimestre?.length || 0}
              </Badge>
            </div>
            {activiteRecente?.inscriptionsTrimestre?.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activiteRecente.inscriptionsTrimestre.map((inscription) => (
                  <div
                    key={inscription.id}
                    className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                    onClick={() => onMemberClick?.(inscription.id)}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={inscription.avatar_url} />
                      <AvatarFallback className="bg-purple-100 text-purple-600 text-xs">
                        {inscription.first_name?.charAt(0)}{inscription.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {inscription.first_name} {inscription.last_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(inscription.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">Aucune inscription ce trimestre</p>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Derniers Rapports Soumis</h3>
          {activiteRecente?.derniersRapports?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {activiteRecente.derniersRapports.map((rapport) => (
                <div key={rapport.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      Rapport {rapport.report_type}
                    </p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(rapport.created_at), 'dd MMM', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-2">Aucun rapport récent</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
