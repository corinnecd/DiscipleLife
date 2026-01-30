import React from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * Carte « Autres Superviseurs de la famille ».
 */
export function SuperviseursFamilleCard({
  superviseursFamille,
  nombreMembresParSuperviseur,
  onSelectSuperviseur,
}) {
  if (!superviseursFamille?.length) return null;

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Users className="h-5 w-5 text-purple-600" />
          Autres Superviseurs de la famille
        </CardTitle>
        <CardDescription className="text-gray-600">
          Autres superviseurs sous la même tutelle pastorale
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {superviseursFamille.map((superviseur) => (
            <div
              key={superviseur.id}
              onClick={() => onSelectSuperviseur?.(superviseur)}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <Avatar className="h-10 w-10 border border-gray-200">
                <AvatarImage src={superviseur.avatar_url} alt={`${superviseur.first_name} ${superviseur.last_name}`} />
                <AvatarFallback className="bg-purple-100 text-purple-600 text-sm">
                  {superviseur.first_name?.charAt(0) || ''}{superviseur.last_name?.charAt(0) || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {superviseur.first_name} {superviseur.last_name}
                </p>
                {superviseur.titre && (
                  <p className="text-xs text-gray-500">{superviseur.titre}</p>
                )}
                {superviseur.email && (
                  <p className="text-xs text-gray-600 truncate">{superviseur.email}</p>
                )}
                {nombreMembresParSuperviseur?.[superviseur.id] !== undefined && (
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-600">
                      {nombreMembresParSuperviseur[superviseur.id] || 0} membre{nombreMembresParSuperviseur[superviseur.id] !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
