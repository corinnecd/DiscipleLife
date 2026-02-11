import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Mail, Eye, FileText, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar as CalendarIcon } from 'lucide-react';

/**
 * Onglet Rapports du dashboard pasteur : stats rapports reçus, liste avec filtre mois/année, rapports manquants.
 */
const PasteurReports = ({
  globalStats,
  navigate,
  loadingRapportsRecus,
  rapportsRecus,
  filtreRapportsAnnee,
  filtreRapportsMois,
  setFiltreRapportsAnnee,
  setFiltreRapportsMois,
  onFetchRapportsRecus,
  setRapportDetailModal,
  missingReports,
  showAllMissingReports,
  setShowAllMissingReports,
}) => {
  return (
    <div className="space-y-6">
      {/* Sommaire / Sur cette page */}
      <Card className="bg-gray-100 border-gray-200 shadow-sm">
        <CardContent className="py-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Sur cette page :</p>
          <nav className="flex flex-wrap gap-2" aria-label="Navigation dans l'onglet Rapports">
            <a href="#rapports-stats" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">Rapports reçus (stats)</a>
            <span className="text-gray-400">·</span>
            <a href="#rapports-liste" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">Liste des rapports</a>
            <span className="text-gray-400">·</span>
            <a href="#rapports-manquants" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">Rapports manquants</a>
          </nav>
        </CardContent>
      </Card>

      {/* Rapports Reçus — stats */}
      <Card id="rapports-stats" className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200 shadow-sm scroll-mt-4">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-600" />
            Rapports Reçus
          </CardTitle>
          <CardDescription>Vue d&apos;ensemble des rapports envoyés par vos superviseurs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-purple-700">{globalStats.totalRapports || 0}</div>
              <div className="text-xs text-purple-600 mt-1 font-medium">Total Rapports</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{globalStats.rapportsHebdo || 0}</div>
              <div className="text-xs text-blue-600 mt-1 font-medium">Hebdomadaires</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{globalStats.rapportsMensuels || 0}</div>
              <div className="text-xs text-green-600 mt-1 font-medium">Mensuels</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{globalStats.rapportsTrimestriels || 0}</div>
              <div className="text-xs text-amber-600 mt-1 font-medium">Trimestriels</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{globalStats.rapportsAnnuels || 0}</div>
              <div className="text-xs text-red-600 mt-1 font-medium">Annuels</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={() => navigate('/admin/reports')}
              className="w-full bg-blue-600 hover:bg-purple-600 text-white border-0 hover:border-0 transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              Voir tous les rapports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rapports reçus : liste par superviseur */}
      <Card id="rapports-liste" className="bg-white border-gray-200 shadow-sm scroll-mt-4">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-black">
            <FileText className="h-5 w-5" />
            Rapports reçus
          </CardTitle>
          <CardDescription>Rapports soumis par vos superviseurs. Filtrez par année et mois.</CardDescription>
          <div className="flex flex-wrap gap-2 mt-5 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[180px] justify-start text-left font-normal bg-gray-100 border-gray-300 text-gray-900 hover:bg-violet-100 hover:border-violet-400 hover:text-black"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-600" />
                  {format(
                    new Date(
                      parseInt(filtreRapportsAnnee, 10) || new Date().getFullYear(),
                      (filtreRapportsMois === '' || filtreRapportsMois === '__tous__' ? 0 : parseInt(filtreRapportsMois, 10)) || 0,
                      1
                    ),
                    'MMMM yyyy',
                    { locale: fr }
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-gray-200 [&_select]:text-gray-800 [&_select_option]:text-gray-800 [&_select_option]:bg-white" align="start">
                <Calendar
                  mode="single"
                  selected={
                    new Date(
                      parseInt(filtreRapportsAnnee, 10) || new Date().getFullYear(),
                      (filtreRapportsMois === '' || filtreRapportsMois === '__tous__' ? 0 : parseInt(filtreRapportsMois, 10)) || 0,
                      1
                    )
                  }
                  onSelect={(d) => {
                    if (d) {
                      setFiltreRapportsAnnee(String(d.getFullYear()));
                      setFiltreRapportsMois(String(d.getMonth()));
                    }
                  }}
                  captionLayout="dropdown"
                  fromYear={2025}
                  toYear={2035}
                  initialFocus
                  labels={{
                    labelMonthDropdown: () => 'Mois : ',
                    labelYearDropdown: () => 'Année : ',
                  }}
                  classNames={{
                    caption_label: 'hidden',
                    head_cell: 'text-gray-700 rounded-md w-9 font-normal text-[0.8rem]',
                    dropdown_month: 'text-gray-800 bg-white border border-gray-300 rounded-md px-2 py-1 text-sm font-medium',
                    dropdown_year: 'text-gray-800 bg-white border border-gray-300 rounded-md px-2 py-1 text-sm font-medium',
                    day: 'h-9 w-9 p-0 font-normal text-gray-800 aria-selected:opacity-100',
                    day_outside: 'text-gray-500 opacity-70 aria-selected:bg-accent/50 aria-selected:text-gray-800 aria-selected:opacity-100',
                    day_today: 'bg-gray-200 text-gray-900 font-medium',
                    day_selected: 'bg-gray-800 text-white hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white',
                    day_disabled: 'text-gray-500 opacity-60',
                    nav_button_previous: 'absolute left-1 text-gray-700',
                    nav_button_next: 'absolute right-1 text-gray-700',
                  }}
                />
              </PopoverContent>
            </Popover>
            <Select value={filtreRapportsMois || '__tous__'} onValueChange={(v) => setFiltreRapportsMois(v === '__tous__' ? '' : v)}>
              <SelectTrigger className="w-[160px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-violet-100 hover:border-violet-400 [&>svg]:text-gray-600">
                <SelectValue placeholder="Tous les mois" />
              </SelectTrigger>
              <SelectContent className="bg-gray-100 text-gray-900 border-gray-200">
                <SelectItem value="__tous__" className="text-gray-900 hover:bg-gray-400 hover:text-gray-900 data-[highlighted]:bg-gray-400 data-[highlighted]:text-gray-900 focus:bg-gray-400 focus:text-gray-900 cursor-pointer">
                  Tous les mois
                </SelectItem>
                {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m, i) => (
                  <SelectItem key={i} value={String(i)} className="text-gray-900 hover:bg-gray-400 hover:text-gray-900 data-[highlighted]:bg-gray-400 data-[highlighted]:text-gray-900 focus:bg-gray-400 focus:text-gray-900 cursor-pointer">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={onFetchRapportsRecus}
              disabled={loadingRapportsRecus}
              className="bg-gray-200 text-gray-900 border-gray-300 hover:bg-gray-300 hover:text-gray-900"
            >
              {loadingRapportsRecus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRapportsRecus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : rapportsRecus.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-2">Aucun rapport reçu pour les critères sélectionnés.</p>
              <p className="text-xs text-gray-400">Modifiez l&apos;année ou le mois dans les filtres ci-dessus pour élargir la recherche.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Superviseur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rapportsRecus.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.superviseurName}</TableCell>
                      <TableCell>
                        <Badge variant={r.report_type === 'annuel' ? 'default' : 'secondary'}>
                          {r.report_type === 'hebdomadaire' ? 'Hebdo' : r.report_type === 'mensuel' ? 'Mensuel' : r.report_type === 'trimestriel' ? 'Trim.' : r.report_type === 'annuel' ? 'Annuel' : r.report_type || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setRapportDetailModal({ report: r, superviseurName: r.superviseurName })}>
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rapports manquants */}
      {missingReports.length > 0 && (
        <Card id="rapports-manquants" className="bg-amber-50 border-amber-200 shadow-sm scroll-mt-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Rapports manquants ({missingReports.length})
                </CardTitle>
                <CardDescription className="text-amber-700 mt-2">
                  {(() => {
                    const now = new Date();
                    const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                    const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                    const previousMonthName = monthNames[previousMonth];
                    return `Les superviseurs suivants n'ont pas encore envoyé leur rapport mensuel pour ${previousMonthName} ${previousYear} :`;
                  })()}
                </CardDescription>
              </div>
              {missingReports.length > 4 && (
                <Button
                  onClick={() => setShowAllMissingReports(!showAllMissingReports)}
                  className="bg-amber-400 text-white border-amber-500 hover:bg-amber-600 hover:text-black shrink-0 transition-colors"
                >
                  {showAllMissingReports ? 'Voir moins' : 'Voir Tout'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(showAllMissingReports ? missingReports : missingReports.slice(0, 4)).map((superviseur) => (
                <div key={superviseur.id} className="flex items-center justify-between p-2 bg-white rounded border border-amber-200">
                  <div>
                    <p className="font-medium text-gray-900">{superviseur.name}</p>
                    {superviseur.email && <p className="text-sm text-gray-600">{superviseur.email}</p>}
                  </div>
                  <Badge className="bg-amber-400 text-white font-medium border border-amber-500 hover:bg-amber-600 hover:text-black transition-colors cursor-default">
                    Rapport manquant
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PasteurReports;
