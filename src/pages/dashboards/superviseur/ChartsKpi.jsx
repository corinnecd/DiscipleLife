import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

/**
 * Graphiques d'évolution des KPI (12 derniers mois).
 */
export function ChartsKpi({ chartData }) {
  if (!chartData?.length) return null;

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          Évolution des KPI (12 derniers mois)
        </CardTitle>
        <CardDescription>
          Tendances des indicateurs clés de performance sur les 12 derniers mois
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Présences aux Cultes</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCulteSamedi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCulteDimanche" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAfterCulte" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="culteSamediSoir" name="Culte Samedi Soir" stroke="#6366f1" fillOpacity={1} fill="url(#colorCulteSamedi)" />
                  <Area type="monotone" dataKey="culteDimancheMatin" name="Culte Dimanche Matin" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCulteDimanche)" />
                  <Area type="monotone" dataKey="afterCulteDimanche" name="After Culte" stroke="#14b8a6" fillOpacity={1} fill="url(#colorAfterCulte)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Temps de Prière et Partage</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tempsPriere" name="Temps de Prière" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="tempsPartage" name="Temps de Partage" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Nouveaux Convertis et Arrivants</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNouveauxConvertis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNouveauxArrivants" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="nouveauxConvertis" name="Nouveaux Convertis" stroke="#ec4899" fillOpacity={1} fill="url(#colorNouveauxConvertis)" />
                  <Area type="monotone" dataKey="nouveauxArrivants" name="Nouveaux Arrivants" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorNouveauxArrivants)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Évangélisation</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sortiesEvangelisation" name="Sorties d'Évangélisation" stroke="#14b8a6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="personnesEvangelisees" name="Personnes évangélisées" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
