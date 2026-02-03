import React from 'react';
import { startOfWeek } from 'date-fns';
import {
  Moon, Church, Users, Heart, Target, UserPlus, Megaphone, UserCheck, Book, HeartHandshake,
  CheckCircle2, GraduationCap, PlayCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getKpiTitle(kpiPeriodType, kpiSelectedYearForPeriod, kpiSelectedQuarter, kpiSelectedMonth, kpiSelectedWeek) {
  if (kpiPeriodType === 'annuel') {
    return `KPI Annuels ${kpiSelectedYearForPeriod}`;
  }
  if (kpiPeriodType === 'trimestriel') {
    return `KPI Trimestriels T${kpiSelectedQuarter} ${kpiSelectedYearForPeriod}`;
  }
  if (kpiPeriodType === 'mensuel') {
    const monthName = MONTHS[parseInt(kpiSelectedMonth, 10)];
    return `KPI Mensuels ${monthName} ${kpiSelectedYearForPeriod}`;
  }
  const selectedYear = parseInt(kpiSelectedYearForPeriod, 10);
  const selectedWeek = parseInt(kpiSelectedWeek, 10);
  const jan1 = new Date(selectedYear, 0, 1);
  const firstWeekStart = startOfWeek(jan1, { weekStartsOn: 1 });
  const targetWeekStart = new Date(firstWeekStart);
  targetWeekStart.setDate(firstWeekStart.getDate() + (selectedWeek - 1) * 7);
  const monthName = MONTHS[targetWeekStart.getMonth()];
  return `KPI Hebdomadaires Sem ${kpiSelectedWeek} ${monthName} ${kpiSelectedYearForPeriod}`;
}

/**
 * Section KPI avec filtres de période et grille des 15 indicateurs.
 */
export function KpiSection({
  kpiPeriodType,
  setKpiPeriodType,
  kpiSelectedYearForPeriod,
  setKpiSelectedYearForPeriod,
  kpiSelectedQuarter,
  setKpiSelectedQuarter,
  kpiSelectedMonth,
  setKpiSelectedMonth,
  kpiSelectedWeek,
  setKpiSelectedWeek,
  kpiData,
}) {
  const kpi = kpiData || {};

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {getKpiTitle(kpiPeriodType, kpiSelectedYearForPeriod, kpiSelectedQuarter, kpiSelectedMonth, kpiSelectedWeek)}
          </CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={kpiPeriodType} onValueChange={setKpiPeriodType}>
              <SelectTrigger className="w-[140px] bg-gray-200 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900 hover:bg-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="hebdomadaire" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Hebdomadaire</SelectItem>
                <SelectItem value="mensuel" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Mensuel</SelectItem>
                <SelectItem value="trimestriel" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Trimestriel</SelectItem>
                <SelectItem value="annuel" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Annuel</SelectItem>
              </SelectContent>
            </Select>

            {kpiPeriodType === 'annuel' && (
              <Select value={kpiSelectedYearForPeriod} onValueChange={setKpiSelectedYearForPeriod}>
                <SelectTrigger className="w-[100px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">{year}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            )}

            {kpiPeriodType === 'trimestriel' && (
              <>
                <Select value={kpiSelectedQuarter} onValueChange={setKpiSelectedQuarter}>
                  <SelectTrigger className="w-[120px] bg-purple-600 border-0 text-white focus:ring-0 focus:ring-offset-0 focus:outline-none hover:bg-purple-700 [&>span]:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {[1, 2, 3, 4].map((q) => (
                      <SelectItem key={q} value={q.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">T{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={kpiSelectedYearForPeriod} onValueChange={setKpiSelectedYearForPeriod}>
                  <SelectTrigger className="w-[100px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">{year}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </>
            )}

            {kpiPeriodType === 'mensuel' && (
              <>
                <Select value={kpiSelectedMonth} onValueChange={setKpiSelectedMonth}>
                  <SelectTrigger className="w-[140px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 max-h-[200px]">
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={index.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-600">{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={kpiSelectedYearForPeriod} onValueChange={setKpiSelectedYearForPeriod}>
                  <SelectTrigger className="w-[100px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">{year}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </>
            )}

            {kpiPeriodType === 'hebdomadaire' && (
              <>
                <Select value={kpiSelectedWeek} onValueChange={setKpiSelectedWeek}>
                  <SelectTrigger className="w-[120px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 max-h-[200px]">
                    {Array.from({ length: 52 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Semaine {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={kpiSelectedYearForPeriod} onValueChange={setKpiSelectedYearForPeriod}>
                  <SelectTrigger className="w-[100px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {Array.from({ length: 7 }, (_, i) => {
                      const year = 2025 + i;
                      return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">{year}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>
        <CardDescription className="mt-2">
          Indicateurs de performance pour la période sélectionnée
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile value={kpi.culteSamediSoir} label="Culte du Samedi Soir" Icon={Moon} colors="indigo" />
          <KpiTile value={kpi.culteDimancheMatin} label="Culte du Dimanche Matin" Icon={Church} colors="blue" />
          <KpiTile value={kpi.afterCulteDimanche} label="After Culte du Dimanche" Icon={Users} colors="cyan" />
          <KpiTile value={kpi.tempsPriere} label="Temps de Prière" Icon={Heart} colors="amber" />
          <KpiTile value={kpi.personnesEvangelisees} label="Personnes évangélisées" Icon={Target} colors="pink" />
          <KpiTile value={kpi.nouveauxConvertis} label="Nouveaux Convertis" Icon={Heart} colors="emerald" />
          <KpiTile value={kpi.nouveauxArrivants} label="Nouveaux Arrivants" Icon={UserPlus} colors="rose" />
          <KpiTile value={kpi.sortiesEvangelisation} label="Sorties d'Évangélisation" Icon={Megaphone} colors="teal" />
          <KpiTile value={kpi.comFratDisciples} label="Com Frat Disciples" Icon={UserCheck} colors="purple" />
          <KpiTile value={kpi.veillee} label="Veillée" Icon={Moon} colors="violet" />
          <KpiTile value={kpi.meditationBible} label="Méditation Bible" Icon={Book} colors="orange" />
          <KpiTile value={kpi.tempsPartage} label="Temps de Partage" Icon={HeartHandshake} colors="green" />
          <KpiTile value={kpi.formationsTerminees} label="Formations Terminées" Icon={CheckCircle2} colors="blue" />
          <KpiTile value={kpi.formationsEnCours} label="Formations en Cours" Icon={GraduationCap} colors="yellow" />
          <KpiTile value={kpi.videosTerminees} label="Vidéos Terminées" Icon={PlayCircle} colors="red" />
        </div>
      </CardContent>
    </Card>
  );
}

const KPI_NUM_COLOR = {
  indigo: 'text-indigo-700',
  blue: 'text-blue-700',
  cyan: 'text-cyan-700',
  amber: 'text-amber-700',
  pink: 'text-pink-700',
  emerald: 'text-emerald-700',
  rose: 'text-rose-700',
  teal: 'text-teal-700',
  purple: 'text-purple-700',
  violet: 'text-violet-700',
  orange: 'text-orange-700',
  green: 'text-green-700',
  yellow: 'text-yellow-700',
  red: 'text-red-700',
};

function KpiTile({ value, label, Icon, colors }) {
  const colorMap = {
    indigo: 'from-indigo-200 to-indigo-300 border-indigo-400',
    blue: 'from-blue-200 to-blue-300 border-blue-400',
    cyan: 'from-cyan-200 to-cyan-300 border-cyan-400',
    amber: 'from-amber-200 to-amber-300 border-amber-400',
    pink: 'from-pink-200 to-pink-300 border-pink-400',
    emerald: 'from-emerald-200 to-emerald-300 border-emerald-400',
    rose: 'from-rose-200 to-rose-300 border-rose-400',
    teal: 'from-teal-200 to-teal-300 border-teal-400',
    purple: 'from-purple-200 to-purple-300 border-purple-400',
    violet: 'from-violet-200 to-violet-300 border-violet-400',
    orange: 'from-orange-200 to-orange-300 border-orange-400',
    green: 'from-green-200 to-green-300 border-green-400',
    yellow: 'from-yellow-200 to-yellow-300 border-yellow-400',
    red: 'from-red-200 to-red-300 border-red-400',
  };
  const c = colorMap[colors] || 'from-gray-200 to-gray-300 border-gray-400';
  const numColor = KPI_NUM_COLOR[colors] || 'text-gray-800';
  return (
    <div className={`group text-center p-4 bg-gradient-to-br ${c} hover:bg-purple-600 rounded-lg border-2 hover:border-purple-600 transition-colors cursor-pointer`}>
      <div className={`text-2xl font-bold ${numColor} group-hover:text-white transition-colors`}>
        {value ?? 0}
      </div>
      <div className="text-sm text-gray-900 group-hover:text-white mt-1 font-medium uppercase transition-colors">{label}</div>
      <Icon className="h-5 w-5 mx-auto mt-2 text-gray-700 group-hover:text-white transition-colors" />
    </div>
  );
}
