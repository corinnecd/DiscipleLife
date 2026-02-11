import React from 'react';
import { Loader2, Search, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MembersTableCard } from '@/components/MembersTableCard';

/**
 * Onglet Membres & Mentors du dashboard pasteur : tableau des membres des familles + tableau consolidé des mentors (piliers).
 */
const PasteurMembers = ({
  loadingPasteurMembers,
  pasteurMembersTable,
  navigate,
  onExportFilteredList,
  toast,
  loadingMentors,
  displayMentorsConsolides,
  mentorsConsolidesSansSuperviseurs,
  mentorsConsolides,
  searchTermMentors,
  setSearchTermMentors,
  filterEgliseMentors,
  setFilterEgliseMentors,
  filteredMentorsConsolidesLength,
  onExportExcelMentors,
  statutLabel,
}) => {
  return (
    <div className="space-y-6">
      {/* Sommaire / Sur cette page */}
      <Card className="bg-gray-100 border-gray-200 shadow-sm">
        <CardContent className="py-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Sur cette page :</p>
          <nav className="flex flex-wrap gap-2" aria-label="Navigation dans l'onglet Membres et Mentors">
            <a href="#membres-familles" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">Membres des familles</a>
            <span className="text-gray-400">·</span>
            <a href="#membres-mentors" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">Tableau consolidé des mentors</a>
          </nav>
        </CardContent>
      </Card>

      {/* Tableau « Membres des familles » */}
      {loadingPasteurMembers ? (
        <Card id="membres-familles" className="bg-white border-gray-200 shadow-sm scroll-mt-4">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </CardContent>
        </Card>
      ) : (
        <div id="membres-familles" className="scroll-mt-4">
        <MembersTableCard
          title="Membres des familles"
          description="Liste des disciples de toutes vos familles"
          filteredMembres={pasteurMembersTable.filteredMembres}
          paginatedMembres={pasteurMembersTable.paginatedMembres}
          selectedMembres={pasteurMembersTable.selectedMembres}
          searchTerm={pasteurMembersTable.searchTerm}
          setSearchTerm={pasteurMembersTable.setSearchTerm}
          statusFilter={pasteurMembersTable.statusFilter}
          setStatusFilter={pasteurMembersTable.setStatusFilter}
          dateFilter={pasteurMembersTable.dateFilter}
          setDateFilter={pasteurMembersTable.setDateFilter}
          progressionFilter={pasteurMembersTable.progressionFilter}
          setProgressionFilter={pasteurMembersTable.setProgressionFilter}
          itemsPerPage={pasteurMembersTable.itemsPerPage}
          setItemsPerPage={pasteurMembersTable.setItemsPerPage}
          currentPage={pasteurMembersTable.currentPage}
          setCurrentPage={pasteurMembersTable.setCurrentPage}
          totalPages={pasteurMembersTable.totalPages}
          membresProgression={pasteurMembersTable.membresProgression}
          membresSuiviPar={pasteurMembersTable.membresSuiviPar}
          toggleSelectAll={pasteurMembersTable.toggleSelectAll}
          toggleSelectMembre={pasteurMembersTable.toggleSelectMembre}
          showExport={true}
          showSelection={true}
          showFetchDisciples={false}
          showProgression={true}
          showSuiviPar={true}
          showNombreDisciples={true}
          onNavigate={navigate}
          onExportFilteredList={onExportFilteredList}
            toast={toast}
        />
        </div>
      )}

      {/* Tableau consolidé des mentors (pilier) */}
      <Card id="membres-mentors" className="bg-white border-gray-200 shadow-sm scroll-mt-4">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Tableau Consolidé des Mentors (Piliers)</CardTitle>
                <CardDescription>
                  Vue d&apos;ensemble de tous les mentors (piliers) avec leurs statistiques de progression
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {loadingMentors && <Loader2 className="h-5 w-5 animate-spin text-purple-600" />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportExcelMentors}
                  disabled={loadingMentors || displayMentorsConsolides.length === 0}
                  className="shrink-0 border-0 !opacity-100 bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:!opacity-100"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Exporter tableau mentors (CSV)
                </Button>
              </div>
            </div>
            {!loadingMentors && mentorsConsolides.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Nom, Prénom, Familles, Nbre disciples (ex: < 50, > 70, ≥ 53, ≤ 60)"
                    value={searchTermMentors}
                    onChange={(e) => setSearchTermMentors(e.target.value)}
                    className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                    aria-label="Rechercher un mentor"
                  />
                </div>
                <Select value={filterEgliseMentors || '__toutes__'} onValueChange={setFilterEgliseMentors}>
                  <SelectTrigger className="w-[200px] bg-gray-50 border-gray-200 text-gray-900">
                    <SelectValue placeholder="Toutes les Familles" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="__toutes__" className="text-gray-900">Toutes les Familles</SelectItem>
                    {[...new Set(mentorsConsolides.map((m) => m.eglise).filter(Boolean))].sort().map((eglise) => (
                      <SelectItem key={eglise} value={eglise} className="text-gray-900">{eglise}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchTermMentors || (filterEgliseMentors && filterEgliseMentors !== '__toutes__')) && (
                  <span className="text-sm text-gray-500">
                    {filteredMentorsConsolidesLength} / {mentorsConsolidesSansSuperviseurs.length} mentor(s)
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingMentors ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-500">Chargement des données des mentors...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="group bg-purple-200 hover:bg-purple-300 transition-colors">
                    <TableHead className="font-semibold text-gray-900">Nom</TableHead>
                    <TableHead className="font-semibold text-gray-900">Prénom</TableHead>
                    <TableHead className="font-semibold text-gray-900">Suivi par</TableHead>
                    <TableHead className="font-semibold text-gray-900">Famille</TableHead>
                    <TableHead className="font-semibold text-center text-gray-900">Nombre de disciples</TableHead>
                    <TableHead className="font-semibold text-center text-gray-900">Avancement % (objectif 70)</TableHead>
                    <TableHead className="font-semibold text-center text-gray-900">Nombre de disciples présents</TableHead>
                    <TableHead className="font-semibold text-center text-gray-900">Taux participation semaine</TableHead>
                    <TableHead className="font-semibold text-center text-gray-900">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayMentorsConsolides.length === 0 ? (
                    <TableRow className="hover:bg-gray-100 transition-colors">
                      <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                        {mentorsConsolides.length === 0 ? (
                          <>Aucun mentor trouvé dans les familles sous votre responsabilité.</>
                        ) : (
                          <>
                            Aucun mentor ne correspond aux critères de recherche.
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 ml-2 bg-green-600 text-white border-green-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                              onClick={() => {
                                setSearchTermMentors('');
                                setFilterEgliseMentors('__toutes__');
                              }}
                            >
                              Réinitialiser les filtres
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayMentorsConsolides.map((mentor, idx) => {
                      const avancement =
                        mentor.avancement_pourcentage != null
                          ? mentor.avancement_pourcentage
                          : (70 > 0 ? Math.round(Math.min(((mentor.nombre_disciples ?? 0) / 70) * 100, 100)) : 0);
                      return (
                        <TableRow key={mentor.mentor_id ?? `mentor-${idx}`} className="hover:bg-gray-50 transition-colors">
                          <TableCell>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/disciples/${mentor.mentor_id}`, {
                                  state: { displayNombreDisciples: mentor.nombre_disciples ?? 0 },
                                })
                              }
                              className="font-semibold text-purple-600 hover:text-purple-800 hover:underline text-left"
                            >
                              {mentor.nom || '—'}
                            </button>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-700">{mentor.prenom || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-700">{mentor.suivi_par || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-gray-900">{mentor.eglise || '—'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-blue-600">{mentor.nombre_disciples ?? 0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-gray-900">{avancement != null ? `${avancement} %` : '—'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-gray-700">{mentor.disciples_presents != null ? mentor.disciples_presents : '—'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-gray-700">{mentor.taux_participation_semaine != null ? `${mentor.taux_participation_semaine} %` : '—'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-gray-700">{(mentor.nombre_disciples ?? 0) === 0 ? 'Disciple' : statutLabel(mentor.titre)}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PasteurMembers;
