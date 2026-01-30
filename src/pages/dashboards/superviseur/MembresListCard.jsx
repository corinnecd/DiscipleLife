import React from 'react';
import { Users, Search, Eye, Download, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Carte « Membres de la famille » : filtres, tableau paginé, exports.
 */
export function MembresListCard({
  filteredMembres,
  paginatedMembres,
  selectedMembres,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  progressionFilter,
  setProgressionFilter,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  totalPages,
  membresProgression,
  membresSuiviPar,
  toggleSelectAll,
  toggleSelectMembre,
  setShowSelectedModal,
  onNavigate,
  onExportFilteredList,
  onExportSelection,
  onFetchDisciples,
  toast,
}) {
  const handleOpenSelection = () => {
    if (selectedMembres.length === 0) {
      toast?.({
        title: 'Aucune sélection',
        description: 'Veuillez sélectionner au moins un membre.',
        variant: 'destructive',
      });
      return;
    }
    if (selectedMembres.length === 1) {
      onNavigate?.(`/disciples/${selectedMembres[0]}`);
    } else {
      setShowSelectedModal?.(true);
    }
  };

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Membres de la famille ({filteredMembres?.length ?? 0})
            </CardTitle>
            <CardDescription className="mt-1">
              Liste complète des disciples de votre famille
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {selectedMembres?.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {selectedMembres.length} sélectionné{selectedMembres.length > 1 ? 's' : ''}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenSelection}
                  className="bg-white border-gray-200 text-gray-900 hover:bg-purple-600 hover:text-white shrink-0"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ouvrir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSelectedModal?.(true)}
                  className="bg-white border-gray-200 text-gray-900 hover:bg-blue-600 hover:text-white shrink-0"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Voir sélection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExportSelection?.()}
                  className="bg-white border-gray-200 text-gray-900 hover:bg-green-600 hover:text-white shrink-0"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Exporter sélection
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExportFilteredList?.('excel')}
                className="bg-white border-gray-200 text-gray-900 hover:bg-green-600 hover:text-white shrink-0"
                disabled={!filteredMembres?.length}
              >
                <Download className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExportFilteredList?.('pdf')}
                className="bg-white border-gray-200 text-gray-900 hover:bg-red-600 hover:text-white shrink-0"
                disabled={!filteredMembres?.length}
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">Recherche et Filtres</h3>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <Input
                  placeholder="Rechercher par prénom, nom, nombre de disciples... (ex: >=5, <=10, >3, <2)"
                  value={searchTerm ?? ''}
                  onChange={(e) => {
                    setSearchTerm?.(e.target.value);
                    setCurrentPage?.(1);
                  }}
                  className="w-full pl-10 pr-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm?.('');
                      setCurrentPage?.(1);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={statusFilter ?? 'tous'} onValueChange={(v) => { setStatusFilter?.(v); setCurrentPage?.(1); }}>
                <SelectTrigger className="w-[180px] bg-white border-gray-300 text-gray-900 [&>svg]:text-purple-600 [&>span]:text-gray-900 hover:border-purple-500">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="tous" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Tous les statuts</SelectItem>
                  <SelectItem value="actif" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Actifs</SelectItem>
                  <SelectItem value="inactif" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label className="text-xs text-gray-600 mb-1 block">Date d'inscription</Label>
                <Input
                  type="date"
                  value={dateFilter ?? ''}
                  onChange={(e) => { setDateFilter?.(e.target.value); setCurrentPage?.(1); }}
                  className="w-full bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="w-[200px]">
                <Label className="text-xs text-gray-600 mb-1 block">Progression</Label>
                <Select value={progressionFilter ?? 'tous'} onValueChange={(v) => { setProgressionFilter?.(v); setCurrentPage?.(1); }}>
                  <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900 [&>svg]:text-purple-600 [&>span]:text-gray-900 hover:border-purple-500">
                    <SelectValue placeholder="Progression" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="tous" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Tous</SelectItem>
                    <SelectItem value="avec" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Avec progression</SelectItem>
                    <SelectItem value="sans" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Sans progression</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[150px]">
                <Label className="text-xs text-gray-600 mb-1 block">Par page</Label>
                <Select value={String(itemsPerPage ?? 10)} onValueChange={(v) => { setItemsPerPage?.(parseInt(v, 10)); setCurrentPage?.(1); }}>
                  <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900 [&>svg]:text-purple-600 [&>span]:text-gray-900 hover:border-purple-500">
                    <SelectValue placeholder="Par page" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="10" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">10 par page</SelectItem>
                    <SelectItem value="25" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">25 par page</SelectItem>
                    <SelectItem value="50" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">50 par page</SelectItem>
                    <SelectItem value="100" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">100 par page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {paginatedMembres?.length > 0 ? (
          <>
            <div className="rounded-md border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-purple-200 hover:bg-purple-300 text-gray-900">
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedMembres?.length === paginatedMembres?.length && paginatedMembres?.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[60px]">Photo</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut spirituel</TableHead>
                    <TableHead className="text-center">Nombre de Disciples</TableHead>
                    <TableHead>Progression</TableHead>
                    <TableHead>Suivi par</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMembres.map((membre) => (
                    <TableRow key={membre.id} className={`hover:bg-gray-50 hover:text-black ${selectedMembres?.includes(membre.id) ? 'bg-blue-50' : ''}`}>
                      <TableCell className="hover:text-black">
                        <Checkbox
                          checked={selectedMembres?.includes(membre.id)}
                          onCheckedChange={() => toggleSelectMembre?.(membre.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={membre.avatar_url} alt={`${membre.first_name} ${membre.last_name}`} />
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            {membre.first_name?.charAt(0) || ''}{membre.last_name?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium hover:text-black">
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:text-purple-600 transition-colors"
                          onClick={() => onNavigate?.(`/disciples/${membre.id}`)}
                        >
                          <span className="text-gray-900">{membre.first_name} {membre.last_name}</span>
                          <Eye className="h-4 w-4 text-gray-400 hover:text-purple-600" />
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 hover:text-black">{membre.email || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={membre.statut_spirituel === 'inactif' ? 'destructive' : 'default'}
                          className={membre.statut_spirituel === 'inactif' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                        >
                          {membre.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hover:text-black">
                        <button
                          type="button"
                          onClick={() => onFetchDisciples?.(membre.id, `${membre.first_name} ${membre.last_name}`)}
                          className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 hover:border-blue-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          {membre.nombreDisciples ?? 0}
                        </button>
                      </TableCell>
                      <TableCell className="text-gray-600 hover:text-black">
                        {membresProgression?.[membre.id] ? (
                          <div className="flex flex-col gap-1">
                            <div className="text-xs">
                              <span className="font-semibold text-purple-600">{membresProgression[membre.id].formations}</span> formations
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold text-red-600">{membresProgression[membre.id].videos}</span> vidéos
                            </div>
                            <div className="text-xs font-medium text-gray-900">
                              Total: {membresProgression[membre.id].total}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 hover:text-black">
                        {membresSuiviPar?.[membre.id] ? (
                          <span className="text-sm font-medium text-gray-900">{membresSuiviPar[membre.id].name}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 hover:text-black">
                        {membre.created_at ? format(new Date(membre.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'tous' || dateFilter || progressionFilter !== 'tous'
                ? 'Aucun membre ne correspond à vos critères de recherche.'
                : 'Aucun membre dans cette famille pour le moment.'}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-purple-200 bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-900">
            {(filteredMembres?.length ?? 0) > 0 ? (
              <>
                <span className="text-purple-600 font-bold">Page {currentPage}</span> sur <span className="text-purple-600 font-bold">{totalPages}</span> -
                Affichage de <span className="text-blue-600 font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> à <span className="text-blue-600 font-bold">{Math.min(currentPage * itemsPerPage, filteredMembres.length)}</span> sur <span className="text-purple-600 font-bold text-lg">{filteredMembres.length}</span> membre{filteredMembres.length > 1 ? 's' : ''}
              </>
            ) : (
              <span className="text-gray-600">Aucun membre trouvé</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenSelection}
              className="bg-white border-gray-300 text-gray-900 hover:bg-blue-600 hover:text-white hover:border-blue-600"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ouvrir
            </Button>
            {(totalPages ?? 1) > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage?.((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-white border-gray-300 text-gray-900 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-700"
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage?.((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-white border-gray-300 text-gray-900 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-700"
                >
                  Suivant
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
