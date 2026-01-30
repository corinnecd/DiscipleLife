import React from 'react';
import { GraduationCap, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Brush,
  ReferenceLine,
} from 'recharts';

/**
 * Trois graphiques supplémentaires du dashboard superviseur :
 * - Évolution formations/vidéos (12 derniers mois)
 * - Comparaison année en cours vs année précédente
 * - Répartition des statuts spirituels (camembert)
 */
export function ChartsSupplementaires({
  formationVideoChartData = [],
  formationVideoRef,
  chartData = [],
  chartDataPreviousYear = [],
  statutsSpirituelsData = [],
  statutsSpirituelsRef,
}) {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const hasComparisonData = chartData.length > 0 && chartDataPreviousYear.length > 0;
  const totalCurrent = chartData.reduce((sum, d) => sum + (d.culteDimancheMatin ?? 0), 0);
  const totalPrevious = chartDataPreviousYear.reduce((sum, d) => sum + (d.culteDimancheMatin ?? 0), 0);
  const comparisonBarData = [
    { name: 'Année en cours', value: totalCurrent, fill: '#8b5cf6' },
    { name: 'Année précédente', value: totalPrevious, fill: '#a78bfa' },
  ];

  return (
    <>
      {/* Évolution formations/vidéos */}
      <Card ref={formationVideoRef} className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            Évolution des Formations et Vidéos (12 derniers mois)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formationVideoChartData.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="h-[400px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={formationVideoChartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 80 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    }}
                    cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                  <Brush dataKey="name" height={30} stroke="#8b5cf6" tickFormatter={() => ''} />
                  <Line
                    type="monotone"
                    dataKey="formations"
                    name="Formations Terminées"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#8b5cf6' }}
                    activeDot={{ r: 8, fill: '#7c3aed' }}
                    animationDuration={1000}
                  />
                  <Line
                    type="monotone"
                    dataKey="videos"
                    name="Vidéos Terminées"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#ef4444' }}
                    activeDot={{ r: 8, fill: '#dc2626' }}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <div className="h-[300px] w-full flex items-center justify-center text-gray-500">
              <p>Aucune donnée disponible pour le moment</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparaison annuelle */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Comparaison Annuelle : {currentYear} vs {previousYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasComparisonData ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="h-[400px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonBarData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    }}
                    cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                  />
                  <ReferenceLine y={0} stroke="#888888" />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1000}>
                    {comparisonBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <div className="h-[300px] w-full flex items-center justify-center text-gray-500">
              <p>Données insuffisantes pour la comparaison (besoin de données sur 2 années)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camembert statuts spirituels */}
      <Card ref={statutsSpirituelsRef} className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Répartition des Statuts Spirituels
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statutsSpirituelsData.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-[400px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statutsSpirituelsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={120}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={3}
                    animationDuration={1000}
                  >
                    {statutsSpirituelsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value, name, props) => {
                      const total = statutsSpirituelsData.reduce((sum, d) => sum + d.value, 0);
                      return [`${value} (${total ? ((value / total) * 100).toFixed(1) : 0}%)`, props.payload.name];
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <div className="h-[300px] w-full flex items-center justify-center text-gray-500">
              <p>Aucune donnée de statut disponible</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
