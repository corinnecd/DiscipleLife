import React from 'react';
import { Users, Download, Eye, History, User, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/**
 * Modals du tableau de bord superviseur : Disciples d'un membre, Sélection, Historique rapports, Fiche superviseur.
 */
export function SuperviseurModals({
  // Modal Disciples d'un membre
  selectedMembreForDisciples,
  setSelectedMembreForDisciples,
  disciplesList,
  setDisciplesList,
  loadingDisciplesList,
  onExportDisciplesList,
  onNavigate,
  // Modal Membres sélectionnés
  showSelectedModal,
  setShowSelectedModal,
  selectedMembres,
  filteredMembres,
  membresProgression,
  famille,
  onExportSelectedExcel,
  onExportSelectedPdf,
  onFetchDisciples,
  // Modal Historique
  showHistory,
  setShowHistory,
  rapports,
  // Modal Fiche Superviseur
  selectedSuperviseur,
  setSelectedSuperviseur,
  nombreMembresParSuperviseur,
}) {
  return (
    <>
      {/* Modal Liste des Disciples */}
      <Dialog open={selectedMembreForDisciples != null} onOpenChange={(open) => {
        if (!open) {
          setSelectedMembreForDisciples?.(null);
          setDisciplesList?.([]);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Disciples de {selectedMembreForDisciples?.name}
                </DialogTitle>
                <DialogDescription>
                  Liste des disciples suivis par ce membre ({disciplesList?.length ?? 0})
                </DialogDescription>
              </div>
              {(disciplesList?.length ?? 0) > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onExportDisciplesList?.('excel')} className="bg-white border-gray-200 text-gray-900 hover:bg-green-600 hover:text-white">
                    <Download className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onExportDisciplesList?.('pdf')} className="bg-white border-gray-200 text-gray-900 hover:bg-red-600 hover:text-white">
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {loadingDisciplesList ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              </div>
            ) : (disciplesList?.length ?? 0) === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun disciple suivi par ce membre.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {disciplesList.map((disciple) => (
                  <div
                    key={disciple.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      onNavigate?.(`/disciples/${disciple.id}`);
                      setSelectedMembreForDisciples?.(null);
                    }}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={disciple.avatar_url} />
                      <AvatarFallback className="bg-purple-100 text-purple-600">
                        {disciple.first_name?.charAt(0)}{disciple.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{disciple.first_name} {disciple.last_name}</p>
                      {disciple.email && <p className="text-xs text-gray-600 truncate">{disciple.email}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {disciple.circle_type && <Badge variant="outline" className="text-xs">{disciple.circle_type}</Badge>}
                        {disciple.disciplesSuivis !== undefined && (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Users className="h-3 w-3 text-purple-600" />
                            {disciple.disciplesSuivis > 0 ? `${disciple.disciplesSuivis} Disciple${disciple.disciplesSuivis > 1 ? 's' : ''}` : '0 Disciple'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-gray-400 hover:text-purple-600" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedMembreForDisciples?.(null); setDisciplesList?.([]); }} className="bg-white border-gray-200 text-gray-900 hover:bg-purple-600 hover:text-white hover:border-purple-600">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Membres Sélectionnés */}
      <Dialog open={showSelectedModal} onOpenChange={setShowSelectedModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Membres Sélectionnés ({selectedMembres?.length ?? 0})
                </DialogTitle>
                <DialogDescription>Liste des membres sélectionnés avec leurs détails</DialogDescription>
              </div>
              {(selectedMembres?.length ?? 0) > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onExportSelectedExcel?.()} className="bg-white border-gray-200 text-gray-900 hover:bg-green-600 hover:text-white">
                    <Download className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onExportSelectedPdf?.()} className="bg-white border-gray-200 text-gray-900 hover:bg-red-600 hover:text-white">
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {(selectedMembres?.length ?? 0) === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun membre sélectionné.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {(filteredMembres ?? [])
                  .filter((m) => selectedMembres?.includes(m.id))
                  .map((membre) => (
                    <div key={membre.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={membre.avatar_url} />
                          <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                            {membre.first_name?.charAt(0)}{membre.last_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-bold text-gray-900">{membre.first_name} {membre.last_name}</h3>
                            <Badge variant={membre.statut_spirituel === 'inactif' ? 'destructive' : 'default'} className={membre.statut_spirituel === 'inactif' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                              {membre.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif'}
                            </Badge>
                          </div>
                          {membre.email && <p className="text-sm text-gray-600 mb-2">{membre.email}</p>}
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-blue-600" />
                              <span className="font-semibold text-blue-700">{membre.nombreDisciples ?? 0}</span> Disciple{(membre.nombreDisciples ?? 0) !== 1 ? 's' : ''}
                            </div>
                            {membre.created_at && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-gray-500" />
                                <span>Inscrit le {format(new Date(membre.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                              </div>
                            )}
                          </div>
                          {membresProgression?.[membre.id] && (
                            <div className="flex items-center gap-3 text-xs mb-2">
                              <span className="flex items-center gap-1"><span className="font-semibold text-purple-600">{membresProgression[membre.id].formations}</span> formations</span>
                              <span className="flex items-center gap-1"><span className="font-semibold text-red-600">{membresProgression[membre.id].videos}</span> vidéos</span>
                              <span className="flex items-center gap-1"><span className="font-semibold text-gray-900">Total: {membresProgression[membre.id].total}</span></span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {(membre.nombreDisciples ?? 0) > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setShowSelectedModal?.(false);
                                await new Promise((r) => setTimeout(r, 100));
                                await onFetchDisciples?.(membre.id, `${membre.first_name} ${membre.last_name}`);
                              }}
                              className="bg-blue-600 text-white border-blue-600 hover:bg-purple-600 hover:border-purple-600 hover:text-white"
                            >
                              <Users className="h-4 w-4 mr-1" /> Voir disciples
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onNavigate?.(`/disciples/${membre.id}`);
                              setShowSelectedModal?.(false);
                            }}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          >
                            <Eye className="h-4 w-4 mr-1" /> Détails
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelectedModal?.(false)} className="bg-white border-gray-200 text-gray-900 hover:bg-purple-600 hover:text-white hover:border-purple-600">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Historique des rapports */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" />
              Historique des rapports
            </DialogTitle>
            <DialogDescription>Consultez vos rapports précédents</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {(rapports?.length ?? 0) === 0 ? (
              <p className="text-center text-gray-600 py-8">Aucun rapport envoyé pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {(rapports ?? []).slice(0, 10).map((report) => {
                  const stats = report.statistics_snapshot || {};
                  const reportPeriod = report.report_type === 'hebdomadaire'
                    ? `Semaine ${report.week_number} ${report.year}`
                    : report.report_type === 'trimestriel'
                    ? `Trimestre ${report.quarter} ${report.year}`
                    : report.report_type === 'annuel'
                    ? `Année ${report.year}`
                    : `${MONTHS[report.month]} ${report.year}`;
                  return (
                    <Card key={report.id} className="bg-white border-gray-200 shadow-sm">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={report.status === 'submitted' ? 'default' : 'secondary'} className="bg-purple-100 text-purple-800">
                                {report.report_type}
                              </Badge>
                              <span className="text-sm text-gray-600">{reportPeriod}</span>
                              <span className="text-xs text-gray-500">{format(new Date(report.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                              <p><span className="text-gray-600">Disciples:</span> <span className="font-bold text-purple-600">{stats.disciples ?? 0}</span></p>
                              <p><span className="text-gray-600">Présences:</span> <span className="font-bold text-blue-600">{stats.sunday_attendance_count ?? 0}</span></p>
                              <p><span className="text-gray-600">Évangélisations:</span> <span className="font-bold text-orange-600">{stats.evangelization ?? 0}</span></p>
                            </div>
                            {report.content && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.content}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory?.(false)} className="bg-white border-gray-200 text-gray-900 hover:bg-purple-600 hover:text-white hover:border-purple-600">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Fiche Superviseur */}
      <Dialog open={selectedSuperviseur != null} onOpenChange={(open) => { if (!open) setSelectedSuperviseur?.(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Fiche Superviseur
            </DialogTitle>
            <DialogDescription>Informations détaillées du superviseur</DialogDescription>
          </DialogHeader>
          {selectedSuperviseur && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Avatar className="h-20 w-20 border-2 border-purple-200">
                  <AvatarImage src={selectedSuperviseur.avatar_url} alt={`${selectedSuperviseur.first_name} ${selectedSuperviseur.last_name}`} />
                  <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                    {selectedSuperviseur.first_name?.charAt(0) || ''}{selectedSuperviseur.last_name?.charAt(0) || ''}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{selectedSuperviseur.first_name} {selectedSuperviseur.last_name}</h3>
                  {selectedSuperviseur.titre && <p className="text-sm text-gray-600 mt-1">{selectedSuperviseur.titre}</p>}
                  {selectedSuperviseur.email && <p className="text-sm text-gray-600 mt-1">{selectedSuperviseur.email}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Users className="h-4 w-4 text-purple-600" />
                      Membres de la famille
                    </div>
                    <div className="text-2xl font-bold text-purple-600 mt-2">
                      {nombreMembresParSuperviseur?.[selectedSuperviseur.id] ?? 0}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      membre{(nombreMembresParSuperviseur?.[selectedSuperviseur.id] ?? 0) !== 1 ? 's' : ''} au total
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSuperviseur?.(null)} className="bg-white border-gray-200 text-gray-900 hover:bg-purple-600 hover:text-white hover:border-purple-600">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
