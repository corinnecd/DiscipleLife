import React from 'react';
import { Users, Loader2, FileText, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Tableau consolidé des mentors (piliers) – 8 colonnes, aligné Dashboard Pasteur.
 * Clic sur Nom / Prénom → ouvre la fiche détail du disciple/mentor.
 */
export function TableauMentorsPiliers({
  loading = false,
  mentors = [],
  onExportExcel,
  onNavigate,
  onRefresh,
}) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Tableau Consolidé des Mentors (Piliers)</CardTitle>
            <CardDescription>
              Vue d'ensemble de tous les mentors (piliers) avec leurs statistiques de progression
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-5 w-5 animate-spin text-purple-600" />}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Rafraîchir
              </Button>
            )}
            {onExportExcel && mentors.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportExcel}
                disabled={loading}
                className="shrink-0 border-0 bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
              >
                <FileText className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-500">Chargement des données des mentors...</p>
          </div>
        ) : mentors.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-gray-200 border-dashed bg-gray-50/50">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun mentor trouvé</h3>
            <p className="text-gray-500 text-sm">Les mentors de votre famille apparaîtront ici.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-purple-200 hover:bg-purple-300">
                  <TableHead className="font-semibold text-gray-900">Nom</TableHead>
                  <TableHead className="font-semibold text-gray-900">Prénom</TableHead>
                  <TableHead className="font-semibold text-gray-900">Suivi par</TableHead>
                  <TableHead className="font-semibold text-gray-900">Famille</TableHead>
                  <TableHead className="font-semibold text-center text-gray-900">Nombre de disciples</TableHead>
                  <TableHead className="font-semibold text-center text-gray-900">Avancement % (objectif 70)</TableHead>
                  <TableHead className="font-semibold text-center text-gray-900">Présence Culte Samedi</TableHead>
                  <TableHead className="font-semibold text-center text-gray-900">Présence Culte Dimanche</TableHead>
                  <TableHead className="font-semibold text-center text-gray-900">Taux participation semaine</TableHead>
                  <TableHead className="font-semibold text-center text-gray-900">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mentors.map((mentor) => (
                  <TableRow key={mentor.mentor_id} className="hover:bg-gray-50 hover:text-black">
                    <TableCell
                      className={`font-semibold text-gray-900 ${onNavigate ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                      onClick={onNavigate ? () => onNavigate(`/disciples/${mentor.mentor_id}`) : undefined}
                    >
                      {mentor.nom}
                    </TableCell>
                    <TableCell
                      className={`font-semibold text-gray-900 ${onNavigate ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                      onClick={onNavigate ? () => onNavigate(`/disciples/${mentor.mentor_id}`) : undefined}
                    >
                      {mentor.prenom}
                    </TableCell>
                    <TableCell className="text-gray-700">{mentor.suivi_par ?? '—'}</TableCell>
                    <TableCell className="font-semibold text-gray-900">{mentor.eglise}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-blue-600">{mentor.nombre_disciples ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (mentor.avancement_pourcentage ?? 0) >= 100
                                ? 'bg-green-500'
                                : (mentor.avancement_pourcentage ?? 0) >= 50
                                ? 'bg-purple-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(mentor.avancement_pourcentage ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-12 text-left">
                          {mentor.avancement_pourcentage ?? 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-gray-700">{mentor.presence_culte_samedi != null ? mentor.presence_culte_samedi : '—'}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-gray-900">{mentor.disciples_presents ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${
                        (mentor.taux_participation_semaine ?? 0) >= 70
                          ? 'text-green-600'
                          : (mentor.taux_participation_semaine ?? 0) >= 50
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {mentor.taux_participation_semaine ?? 0}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-gray-700">{(mentor.nombre_disciples ?? 0) === 0 ? 'Disciple' : (mentor.statut ?? 'Disciple')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
