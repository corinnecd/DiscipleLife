import React from 'react';
import {
  Building2, Search, Filter, Plus, Loader2, Eye, CheckCircle2, Users, ChevronDown, ChevronUp, X,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Onglet Familles du dashboard pasteur : bannière pasteur sélectionné, recherche, liste en cartes, tableau superviseurs/familles.
 */
const PasteurFamilies = ({
  selectedPasteurIdForFamilies,
  setSelectedPasteurIdForFamilies,
  kpiParPasteur,
  user,
  searchTerm,
  setSearchTerm,
  setSelectedFamille,
  famillesToShow,
  globalStats,
  loadingFamillesForPasteur,
  filteredFamilles,
  formatFamilleName,
  openCreateDialog,
  showAllSuperviseursFamilles,
  setShowAllSuperviseursFamilles,
}) => {
  return (
    <div className="space-y-6">
      {/* Sommaire / Sur cette page */}
      <Card className="bg-gray-100 border-gray-200 shadow-sm">
        <CardContent className="py-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Sur cette page :</p>
          <nav className="flex flex-wrap gap-2" aria-label="Navigation dans l'onglet Familles">
            <a href="#familles-recherche" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">Recherche et filtres</a>
            <span className="text-gray-400">·</span>
            <a href="#familles-liste" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">Liste des familles</a>
            <span className="text-gray-400">·</span>
            <a href="#familles-tableau" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">Tableau superviseurs et familles</a>
          </nav>
        </CardContent>
      </Card>

      {/* Bannière : familles du pasteur sélectionné */}
      {selectedPasteurIdForFamilies && (() => {
        const pasteur = kpiParPasteur.find((x) => x.id === selectedPasteurIdForFamilies);
        const nomPasteur = pasteur?.nomAffichage || 'ce pasteur';
        const isAutrePasteur = selectedPasteurIdForFamilies !== user?.id;
        return (
          <Card className="bg-purple-50 border-purple-200 shadow-sm">
            <CardContent className="py-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-gray-900">
                {isAutrePasteur ? `Familles de ${nomPasteur}` : `Vos familles (${nomPasteur})`}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-100"
                onClick={() => setSelectedPasteurIdForFamilies(null)}
              >
                {isAutrePasteur ? 'Revenir aux familles du pasteur connecté' : 'Voir toutes les familles'}
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      {/* Recherche et filtres */}
      <Card id="familles-recherche" className="bg-white border-gray-200 shadow-sm scroll-mt-4">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Recherche et Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par superviseur, famille ou identifiant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 bg-gray-100 border-gray-200 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-200 hover:border-gray-200 active:border-gray-200 text-gray-900"
                aria-label="Rechercher une famille ou un superviseur"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500 hover:text-red-700 transition-colors"
                  type="button"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={() => {
                setSelectedFamille(null);
                setSearchTerm('');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white focus:ring-0 focus:ring-offset-0 focus:outline-none hover:border-0 border-0"
            >
              <Filter className="h-4 w-4 mr-2" />
              Toutes les familles
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des Familles */}
      <Card id="familles-liste" className="bg-white border-gray-200 shadow-sm scroll-mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                Liste des Familles
              </CardTitle>
              <CardDescription>
                {selectedPasteurIdForFamilies && selectedPasteurIdForFamilies !== user?.id
                  ? `${famillesToShow.length} famille(s) pour le pasteur sélectionné`
                  : `Vue d'ensemble de toutes les familles sous votre supervision (${globalStats.totalFamilles} familles)`}
              </CardDescription>
            </div>
            {(!selectedPasteurIdForFamilies || selectedPasteurIdForFamilies === user?.id) && (
              <Button
                onClick={openCreateDialog}
                className="bg-gray-200 hover:bg-purple-600 text-gray-900 hover:text-white border-0 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter Nouvelle Famille
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingFamillesForPasteur ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Chargement des familles du pasteur…</span>
            </div>
          ) : filteredFamilles.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Aucun résultat trouvé pour votre recherche.' : 'Aucune famille assignée pour le moment.'}
              </p>
              {searchTerm ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setSearchTerm('')} className="border-gray-300 text-gray-700">
                  Réinitialiser la recherche
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFamilles.map((item) => (
                <div
                  key={item.superviseur.id}
                  className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {formatFamilleName(item.famille?.nom || 'Sans nom')}
                        </p>
                        <p className="text-xs text-gray-500">{item.famille?.identifiant_famille || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Superviseur:</span>
                      <span className="font-medium text-gray-900">
                        {item.superviseur.first_name} {item.superviseur.last_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Membres:</span>
                      <span className="font-semibold text-gray-900">{item.stats.nombreMembres} / {item.stats.objectif}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Progression</span>
                      <span className="font-medium text-gray-900">{Math.round(item.stats.progression)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.stats.progression >= 100 ? 'bg-green-500' : item.stats.progression >= 50 ? 'bg-purple-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(item.stats.progression, 100)}%` }}
                      />
                    </div>
                  </div>
                  {item.stats.progression >= 100 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Objectif atteint</span>
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <Button
                      size="sm"
                      className="w-full bg-purple-600 text-white hover:bg-blue-600 border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFamille(item);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir détails
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tableau consolidé 7 colonnes (rapport § 3.2) */}
      <Card id="familles-tableau" className="bg-white border-gray-200 shadow-sm scroll-mt-4">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Tableau consolidé – Familles</CardTitle>
            <CardDescription>
              Nom, Prénom (superviseur), Église (famille), Nombre de disciples, Avancement % vers objectif 70, Disciples présents, Taux de participation de la semaine
            </CardDescription>
          </div>
          {filteredFamilles.length > 5 && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setShowAllSuperviseursFamilles((v) => !v)}
              className="shrink-0 bg-blue-600 text-white hover:bg-blue-700"
            >
              {showAllSuperviseursFamilles ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Voir moins
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Voir plus
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {filteredFamilles.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Aucun résultat trouvé pour votre recherche.' : 'Aucun superviseur assigné pour le moment.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="group bg-purple-200 hover:bg-purple-300 transition-colors cursor-pointer">
                    <TableHead className="font-semibold text-gray-900">Nom</TableHead>
                    <TableHead className="font-semibold text-gray-900">Prénom (superviseur)</TableHead>
                    <TableHead className="font-semibold text-gray-900">Église (famille)</TableHead>
                    <TableHead className="font-semibold text-center text-gray-900">Nombre de disciples</TableHead>
                    <TableHead className="font-semibold text-center text-gray-900">Avancement % vers objectif 70</TableHead>
                    <TableHead className="font-semibold text-center text-gray-900">Nombre de disciples présents</TableHead>
                    <TableHead className="font-semibold text-center text-gray-900">Taux de participation de la semaine</TableHead>
                    <TableHead className="font-semibold text-center text-gray-900">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showAllSuperviseursFamilles ? filteredFamilles : filteredFamilles.slice(0, 5)).map((item) => (
                    <TableRow key={item.superviseur.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium text-gray-900">
                        {item.superviseur.last_name || '—'}
                      </TableCell>
                      <TableCell className="text-gray-900">
                        {item.superviseur.first_name || '—'}
                      </TableCell>
                      <TableCell>
                        {item.famille ? (
                          <span className="font-medium text-gray-900">{formatFamilleName(item.famille.nom)}</span>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-gray-900">{item.stats.nombreMembres}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                item.stats.progression >= 100 ? 'bg-green-500' : item.stats.progression >= 50 ? 'bg-purple-600' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(item.stats.progression, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12 text-left">{Math.round(item.stats.progression)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-gray-700">
                        {item.stats.disciples_presents != null ? item.stats.disciples_presents : '—'}
                      </TableCell>
                      <TableCell className="text-center text-gray-700">
                        {item.stats.taux_participation_semaine != null ? `${item.stats.taux_participation_semaine} %` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFamille(item);
                          }}
                          disabled={!item.famille}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 hover:border-0 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir détails
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
    </div>
  );
};

export default PasteurFamilies;
