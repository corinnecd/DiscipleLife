import React from 'react';
import { Users, Church, Camera, Target, UserCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Cartes Famille + Pasteur de tutelle (objectif, progression, avatars).
 */
export function FamillePasteurCards({
  famille,
  user,
  stats,
  superviseurNom,
  pasteur,
  familleAvatarPreview,
  familleAvatarFile,
  uploadingFamilleAvatar,
  onFamilleAvatarChange,
  uploadFamilleAvatar,
  pasteurAvatarPreview,
  pasteurAvatarFile,
  uploadingPasteurAvatar,
  onPasteurAvatarChange,
  uploadPasteurAvatar,
}) {
  if (!famille) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Users className="h-5 w-5 text-purple-600" />
                {(() => {
                  const nomComplet = `${superviseurNom?.titre === 'Pasteur' ? 'Pasteur ' : ''}${superviseurNom?.first_name || ''} ${superviseurNom?.last_name || ''}`.trim();
                  return nomComplet ? `Famille de ${nomComplet}` : 'Ma Famille';
                })()}
              </CardTitle>
              <CardDescription className="text-gray-600">
                <span>{famille.nom} ({famille.identifiant_famille})</span>
                {user?.email && (
                  <span className="block mt-1 text-sm text-gray-500">{user.email}</span>
                )}
              </CardDescription>
            </div>
            <div className="relative">
              <label htmlFor="famille-avatar" className="cursor-pointer">
                <Avatar className="w-20 h-20 border-2 border-purple-200 hover:border-purple-400 transition-colors">
                  <AvatarImage src={familleAvatarPreview} alt={famille.nom} />
                  <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                    {famille.nom.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 border-2 border-white shadow-sm hover:bg-purple-700 transition-colors">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </label>
              <input
                id="famille-avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFamilleAvatarChange}
              />
              {familleAvatarFile && (
                <Button
                  size="sm"
                  onClick={uploadFamilleAvatar}
                  disabled={uploadingFamilleAvatar}
                  className="mt-2 w-full bg-purple-600 hover:bg-purple-700"
                >
                  {uploadingFamilleAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Enregistrer'
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Objectif</span>
                <span className="text-lg font-semibold text-gray-900">{stats?.objectif ?? 70} disciples</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Membres actuels</span>
                <span className="text-lg font-semibold text-purple-600">{stats?.nombreMembres ?? 0}</span>
              </div>
              {stats?.reste > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Il manque</span>
                  <span className="text-lg font-semibold text-red-600">{stats.reste} Disciples</span>
                </div>
              )}
              {stats?.nombreMembres > stats?.objectif && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Objectif Atteint</span>
                  <span className="text-lg font-semibold text-green-600">+ {stats.nombreMembres - stats.objectif} Disciples</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progression</span>
                <span className="font-medium">{(stats?.progression ?? 0).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats?.progression ?? 0}%` }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    'h-3 rounded-full',
                    (stats?.progression ?? 0) >= 100 ? 'bg-green-500' : 'bg-purple-600'
                  )}
                />
              </div>
            </div>
            {(stats?.nombreMembres ?? 0) >= (stats?.objectif ?? 70) && (
              <Badge className="mt-4 bg-green-500 text-white">
                <Target className="h-3 w-3 mr-1" />
                Objectif atteint ! 🎉
              </Badge>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Church className="h-5 w-5 text-purple-600" />
                {pasteur ? `${pasteur.first_name} ${pasteur.last_name}` : 'Pasteur de tutelle'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {pasteur ? `Pasteur de tutelle de la famille ${famille.nom}` : 'Responsable de votre famille'}
              </CardDescription>
            </div>
            <div className="relative">
              <label htmlFor="pasteur-avatar" className="cursor-pointer">
                <Avatar className="w-20 h-20 border-2 border-purple-200 hover:border-purple-400 transition-colors">
                  {pasteur ? (
                    <>
                      <AvatarImage src={pasteurAvatarPreview || pasteur.avatar_url} alt={`${pasteur.first_name} ${pasteur.last_name}`} />
                      <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                        {pasteur.first_name?.charAt(0) || ''}{pasteur.last_name?.charAt(0) || ''}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-gray-100 text-gray-400 text-lg">
                      <UserCircle className="h-8 w-8" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 border-2 border-white shadow-sm hover:bg-purple-700 transition-colors">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </label>
              <input
                id="pasteur-avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPasteurAvatarChange}
                disabled={!pasteur}
              />
              {pasteurAvatarFile && (
                <Button
                  size="sm"
                  onClick={uploadPasteurAvatar}
                  disabled={uploadingPasteurAvatar || !pasteur}
                  className="mt-2 w-full bg-purple-600 hover:bg-purple-700"
                >
                  {uploadingPasteurAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Enregistrer'
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pasteur ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{pasteur.identifiant_unique}</p>
                    <p className="text-sm text-gray-600">
                      {pasteur.first_name} {pasteur.last_name}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 pt-2 border-t border-gray-200 italic">
                  <p className="font-medium text-purple-600 mb-1">Matthieu 4:19 (LSG)</p>
                  <p className="text-gray-700">Jésus leur dit : Suivez-moi, et je vous ferai pêcheurs d'hommes.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <p className="text-sm text-gray-500">Pasteur de tutelle non assigné</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
