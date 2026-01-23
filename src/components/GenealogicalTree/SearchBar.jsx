/**
 * SearchBar - Barre de recherche universelle pour l'Arbre Généalogique
 * 
 * Permet de rechercher n'importe quelle personne (pasteur, superviseur, mentor, disciple)
 * avec autocomplétion
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Users, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { searchPersons } from '@/lib/genealogicalUtils';
import { getAvatarColor, getInitials } from '@/lib/utils';

const SearchBar = ({ onSelectPerson, currentPersonId, onResetToSelf }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  // Recherche avec debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchResults = await searchPersons(searchTerm);
        setResults(searchResults);
        setShowResults(true);
      } catch (error) {
        console.error('Erreur recherche:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Fermer les résultats si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (person) => {
    setSearchTerm('');
    setShowResults(false);
    onSelectPerson(person);
  };

  const handleReset = () => {
    setSearchTerm('');
    setShowResults(false);
    onResetToSelf();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Rechercher une personne (nom, prénom, email)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
          className="pl-10 pr-20 bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setShowResults(false);
            }}
            className="absolute right-12 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {currentPersonId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 text-xs bg-blue-500 text-white hover:bg-purple-600 hover:text-white border-blue-500 hover:border-purple-600"
          >
            Mon arbre
          </Button>
        )}
      </div>

      {/* Résultats de recherche */}
      {showResults && (
        <Card className="absolute z-50 w-full mt-2 max-h-96 overflow-y-auto shadow-lg border-gray-200">
          <CardContent className="p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Aucun résultat trouvé</p>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((person) => (
                  <div
                    key={`${person.type}-${person.id}`}
                    onClick={() => handleSelect(person)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={person.avatar_url} />
                      <AvatarFallback className={getAvatarColor(person.name)}>
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {person.displayLabel || person.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {person.roleLabel || person.role}
                        </Badge>
                        {person.email && (
                          <span className="text-xs text-gray-500 truncate">{person.email}</span>
                        )}
                      </div>
                    </div>
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchBar;
