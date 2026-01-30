import React from 'react';
import { Users, Loader2, CheckCircle2, X, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
 * Tableau détaillé des disciples (10 colonnes) : pilier, disciple, statut, dates, engagement, présence.
 */
export function TableauDetailleDisciples({
  loading = false,
  disciples = [],
  onNavigate,
  onExportExcel,
}) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Tableau Détaillé des Disciples</CardTitle>
            <CardDescription>
              Vue détaillée de tous les disciples avec leurs informations de suivi
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-5 w-5 animate-spin text-purple-600" />}
            {onExportExcel && disciples.length > 0 && (
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
            <p className="text-gray-500">Chargement des données détaillées...</p>
          </div>
        ) : disciples.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun disciple trouvé dans votre famille.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-purple-200 hover:bg-purple-300">
                  <TableHead className="font-semibold text-gray-900">Prénom Pilier</TableHead>
                  <TableHead className="font-semibold text-gray-900">Nom Pilier</TableHead>
                  <TableHead className="font-semibold text-gray-900">Prénom Disciple</TableHead>
                  <TableHead className="font-semibold text-gray-900">Nom Disciple</TableHead>
                  <TableHead className="font-semibold text-gray-900">Statut</TableHead>
                  <TableHead className="font-semibold text-gray-900">Date d'ajout</TableHead>
                  <TableHead className="font-semibold text-gray-900">Date Dernière Présence</TableHead>
                  <TableHead className="font-semibold text-gray-900">Niveau d'Engagement</TableHead>
                  <TableHead className="font-semibold text-gray-900">Statut (Actif/Inactif)</TableHead>
                  <TableHead className="font-semibold text-gray-900">Présence Dernier Culte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disciples.map((disciple) => (
                  <TableRow key={disciple.disciple_id} className="hover:bg-gray-50 hover:text-black">
                    <TableCell className="font-semibold text-gray-900">{disciple.mentor_prenom || '-'}</TableCell>
                    <TableCell className="font-semibold text-gray-900">{disciple.mentor_nom || '-'}</TableCell>
                    <TableCell
                      className="font-semibold text-gray-900 cursor-pointer hover:text-purple-600"
                      onClick={() => onNavigate?.(`/disciples/${disciple.disciple_id}`)}
                    >
                      {disciple.disciple_prenom}
                    </TableCell>
                    <TableCell
                      className="font-semibold text-gray-900 cursor-pointer hover:text-purple-600"
                      onClick={() => onNavigate?.(`/disciples/${disciple.disciple_id}`)}
                    >
                      {disciple.disciple_nom}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-purple-200 text-purple-700">
                        {disciple.statut_spirituel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700">{disciple.date_ajout}</TableCell>
                    <TableCell className="text-gray-700">{disciple.date_derniere_presence}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          disciple.niveau_engagement === 'Élevé'
                            ? 'border-green-200 text-green-700 bg-green-50'
                            : disciple.niveau_engagement === 'Moyen'
                            ? 'border-amber-200 text-amber-700 bg-amber-50'
                            : 'border-red-200 text-red-700 bg-red-50'
                        }
                      >
                        {disciple.niveau_engagement}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={disciple.statut_actif ? 'default' : 'secondary'}
                        className={disciple.statut_actif ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}
                      >
                        {disciple.statut_actif ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {disciple.presence_dernier_culte ? (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Oui
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-200 text-red-700">
                          <X className="h-3 w-3 mr-1" />
                          Non
                        </Badge>
                      )}
                    </TableCell>
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
