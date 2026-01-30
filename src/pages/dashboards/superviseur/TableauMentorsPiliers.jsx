import React from 'react';
import { Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Tableau consolidé des mentors (piliers) avec statistiques de progression.
 */
export function TableauMentorsPiliers({
  loading = false,
  mentors = [],
}) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Tableau Consolidé des Mentors (Piliers)</CardTitle>
            <CardDescription>
              Vue d'ensemble de tous les mentors (piliers) avec leurs statistiques de progression
            </CardDescription>
          </div>
          {loading && (
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-500">Chargement des données des mentors...</p>
          </div>
        ) : mentors.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun mentor trouvé dans votre famille.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-purple-200 hover:bg-purple-300">
                  <TableHead className="font-semibold text-gray-900">Nom</TableHead>
                  <TableHead className="font-semibold text-gray-900">Prénom</TableHead>
                  <TableHead className="font-semibold text-gray-900">Église</TableHead>
                  <TableHead className="font-semibold text-center text-gray-900">Nombre de Disciples</TableHead>
                  <TableHead className="font-semibold text-center text-gray-900">Avancement (%)</TableHead>
                  <TableHead className="font-semibold text-center text-gray-900">Disciples Présents</TableHead>
                  <TableHead className="font-semibold text-center text-gray-900">Taux Participation Semaine (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mentors.map((mentor) => (
                  <TableRow key={mentor.mentor_id} className="hover:bg-gray-50 hover:text-black">
                    <TableCell className="font-semibold text-gray-900">{mentor.nom}</TableCell>
                    <TableCell className="font-semibold text-gray-900">{mentor.prenom}</TableCell>
                    <TableCell className="text-gray-700">{mentor.eglise}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-gray-900">{mentor.nombre_disciples}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              mentor.avancement_pourcentage >= 100
                                ? 'bg-green-500'
                                : mentor.avancement_pourcentage >= 50
                                ? 'bg-purple-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(mentor.avancement_pourcentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-12 text-left">
                          {mentor.avancement_pourcentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-gray-900">{mentor.disciples_presents}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${
                        mentor.taux_participation_semaine >= 70
                          ? 'text-green-600'
                          : mentor.taux_participation_semaine >= 50
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {mentor.taux_participation_semaine}%
                      </span>
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
