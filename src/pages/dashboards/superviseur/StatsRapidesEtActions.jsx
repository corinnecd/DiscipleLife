import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Activity, TrendingUp, History, GitBranch } from 'lucide-react';

/**
 * Statistiques rapides (3 cartes) + Actions rapides.
 */
export function StatsRapidesEtActions({ stats, onNavigate, onShowHistory }) {
  const objectif = stats?.objectif ?? 70;
  const nombreMembres = stats?.nombreMembres ?? 0;
  const progression = stats?.progression ?? 0;
  const reste = stats?.reste ?? objectif;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900">Membres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{nombreMembres}</div>
            <p className="text-xs text-gray-600 mt-1">sur {objectif} objectif</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900">Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{progression.toFixed(0)}%</div>
            <p className="text-xs text-gray-600 mt-1">vers l'objectif</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900">
              {nombreMembres >= objectif ? "Continuons d'évangéliser" : 'Disciples à évangéliser'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${nombreMembres >= objectif ? 'text-green-600' : 'text-red-600'}`}>
              {nombreMembres >= objectif ? `+ ${nombreMembres - objectif}` : reste}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {nombreMembres >= objectif ? "Objectif atteint" : "avant l'objectif"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="outline"
              className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
              onClick={() => onNavigate?.('/familles')}
            >
              <Eye className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
              Voir ma famille
            </Button>
            <Button
              variant="outline"
              className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
              onClick={() => onNavigate?.('/attendance')}
            >
              <Activity className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
              Suivi de présence
            </Button>
            <Button
              variant="outline"
              className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
              onClick={() => onNavigate?.('/statistics')}
            >
              <TrendingUp className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
              Statistiques
            </Button>
            <Button
              variant="outline"
              className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
              onClick={() => onShowHistory?.()}
            >
              <History className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
              Voir l'historique
            </Button>
            <Button
              variant="outline"
              className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
              onClick={() => onNavigate?.('/arbre-genealogique')}
            >
              <GitBranch className="h-4 w-4 mr-2 text-amber-600 group-hover:text-white transition-colors" />
              Arbre généalogique
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
