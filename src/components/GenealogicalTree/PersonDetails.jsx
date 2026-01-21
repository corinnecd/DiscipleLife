/**
 * PersonDetails - Panneau de détails pour une personne dans l'Arbre Généalogique
 * 
 * Affiche les informations complètes d'une personne avec actions rapides
 */

import React from 'react';
import { User, Mail, Phone, MapPin, ExternalLink, MessageCircle, Users, GitBranch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarColor, getInitials } from '@/lib/utils';

const PersonDetails = ({ person, onViewProfile, onContact, onViewTree }) => {
  if (!person) return null;

  const getRoleLabel = (role) => {
    const labels = {
      'pasteur': 'Pasteur',
      'superviseur': 'Superviseur',
      'mentor': 'Mentor (Pilier)',
      'disciple': 'Disciple',
      'admin': 'Administrateur',
      'super_admin': 'Super Administrateur',
      'unbeliever': 'Non-croyant',
      'newbeliever': 'Nouveau converti',
      'established': 'Disciple Affermi',
      'maker': 'Faiseur de Disciples'
    };
    return labels[role] || role;
  };

  return (
    <Card className="w-full bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-purple-200">
            <AvatarImage src={person.avatar_url} />
            <AvatarFallback className={getAvatarColor(person.name)}>
              {getInitials(person.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{person.name}</CardTitle>
            <Badge variant="outline" className="mt-1">
              {getRoleLabel(person.role)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informations de contact */}
        {(person.email || person.phone) && (
          <div className="space-y-2">
            {person.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{person.email}</span>
              </div>
            )}
            {person.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{person.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Informations hiérarchiques */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {person.famille_id && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4 shrink-0" />
              <span>Famille ID: {person.famille_id}</span>
            </div>
          )}
          {person.pasteur_id && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <GitBranch className="h-4 w-4 shrink-0" />
              <span>Pasteur ID: {person.pasteur_id}</span>
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
          {onViewTree && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewTree(person)}
              className="w-full justify-start"
            >
              <GitBranch className="h-4 w-4 mr-2" />
              Voir son arbre
            </Button>
          )}
          {onViewProfile && person.type === 'profil' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewProfile(person.id)}
              className="w-full justify-start"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir le profil
            </Button>
          )}
          {onContact && person.email && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onContact(person.email)}
              className="w-full justify-start"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Contacter
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonDetails;
