import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, User, Users, Building2, Book, PlayCircle, Calendar, Video, FileText, Heart, Award, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { getOrSetCache } from '@/lib/CacheUtils';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalSearch = ({ onClose }) => {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Focus sur l'input au montage
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Gérer le clic en dehors pour fermer
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Recherche avec debounce
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const performSearch = async (term) => {
    try {
      setLoading(true);
      setShowResults(true);

      // OPTIMISATION: Utiliser le cache et paralléliser les requêtes
      const cacheKey = `global_search_${term.toLowerCase()}_${user?.id || 'guest'}`;
      
      const results = await getOrSetCache(
        cacheKey,
        async () => {
          const isSupervisorOrPasteur = role === 'superviseur' || role === 'pasteur' || role === 'admin';
          
          // Paralléliser toutes les requêtes pour améliorer les performances
          const [
            disciplesResult,
            supervisorsResult,
            familiesResult,
            reportsResult,
            videosResult,
            modulesResult,
            prayersResult,
            studiesResult,
            testimoniesResult,
            resourcesResult
          ] = await Promise.all([
            // 1. Recherche dans cercle_personnes (disciples)
            supabase
              .from('cercle_personnes')
              .select('id, first_name, last_name, name, email, circle_type')
              .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,name.ilike.%${term}%,email.ilike.%${term}%`)
              .limit(10)
              .then(({ data, error }) => ({ data: data || [], error }))
              .catch(() => ({ data: [], error: null })),

            // 2. Recherche dans profils (superviseurs, pasteurs)
            supabase
              .from('profils')
              .select('id, first_name, last_name, email, role, identifiant_unique')
              .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,identifiant_unique.ilike.%${term}%`)
              .in('role', ['superviseur', 'pasteur', 'admin'])
              .limit(10)
              .then(({ data, error }) => ({ data: data || [], error }))
              .catch(() => ({ data: [], error: null })),

            // 3. Recherche dans familles_disciples
            supabase
              .from('familles_disciples')
              .select('id, nom, identifiant_famille, superviseur_id')
              .or(`nom.ilike.%${term}%,identifiant_famille.ilike.%${term}%`)
              .limit(10)
              .then(({ data, error }) => ({ data: data || [], error }))
              .catch(() => ({ data: [], error: null })),

            // 4. Recherche dans reports (si autorisé)
            isSupervisorOrPasteur
              ? supabase
                  .from('reports')
                  .select('id, report_type, created_at, content, month, year')
                  .ilike('content', `%${term}%`)
                  .order('created_at', { ascending: false })
                  .limit(5)
                  .then(({ data, error }) => ({ data: data || [], error }))
                  .catch(() => ({ data: [], error: null }))
              : Promise.resolve({ data: [], error: null }),

            // 5. Recherche dans teaching_videos (vidéos d'enseignement)
            supabase
              .from('teaching_videos')
              .select('id, title, description, series_name, duration')
              .or(`title.ilike.%${term}%,description.ilike.%${term}%,series_name.ilike.%${term}%`)
              .limit(10)
              .then(({ data, error }) => ({ data: data || [], error }))
              .catch(() => ({ data: [], error: null })),

            // 6. Recherche dans impact_x_videos (modules)
            supabase
              .from('impact_x_videos')
              .select('id, title, description, module_name, order')
              .or(`title.ilike.%${term}%,description.ilike.%${term}%,module_name.ilike.%${term}%`)
              .limit(10)
              .then(({ data, error }) => ({ data: data || [], error }))
              .catch(() => ({ data: [], error: null })),

            // 7. Recherche dans prayer_requests (requêtes de prières)
            supabase
              .from('prayer_requests')
              .select('id, request_text, disciple_name, created_at, is_answered')
              .ilike('request_text', `%${term}%`)
              .order('created_at', { ascending: false })
              .limit(10)
              .then(({ data, error }) => ({ data: data || [], error }))
              .catch(() => ({ data: [], error: null })),

            // 8. Recherche dans bible_studies (études bibliques)
            supabase
              .from('bible_studies')
              .select('id, title, description, created_at')
              .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
              .limit(10)
              .then(({ data, error }) => ({ data: data || [], error }))
              .catch(() => ({ data: [], error: null })),

            // 9. Recherche dans testimonies (témoignages)
            supabase
              .from('testimonies')
              .select('id, content, author_name, created_at, status')
              .ilike('content', `%${term}%`)
              .eq('status', 'approved')
              .limit(10)
              .then(({ data, error }) => ({ data: data || [], error }))
              .catch(() => ({ data: [], error: null })),

            // 10. Recherche dans resources (ressources/ebooks)
            supabase
              .from('resources')
              .select('id, title, description, type, file_url')
              .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
              .limit(10)
              .then(({ data, error }) => ({ data: data || [], error }))
              .catch(() => ({ data: [], error: null }))
          ]);

          return {
            disciples: disciplesResult.data || [],
            supervisors: supervisorsResult.data || [],
            families: familiesResult.data || [],
            reports: reportsResult.data || [],
            videos: videosResult.data || [],
            modules: modulesResult.data || [],
            prayers: prayersResult.data || [],
            studies: studiesResult.data || [],
            testimonies: testimoniesResult.data || [],
            resources: resourcesResult.data || []
          };
        },
        1 * 60 * 1000 // 1 minute de cache
      );

      setResults(results);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (type, item) => {
    switch (type) {
      case 'disciple':
        navigate(`/disciples/${item.id}`);
        break;
      case 'supervisor':
      case 'pasteur':
        navigate(`/disciples/${item.id}`);
        break;
      case 'family':
        navigate('/familles-disciples');
        break;
      case 'report':
        navigate('/send-report');
        break;
      case 'video':
        navigate('/teaching-videos');
        break;
      case 'module':
        navigate('/impact-x');
        break;
      case 'prayer':
        navigate('/prayer-requests');
        break;
      case 'study':
        navigate('/meditations');
        break;
      case 'testimony':
        navigate('/videos');
        break;
      case 'resource':
        navigate('/ebooks');
        break;
      default:
        break;
    }
    setShowResults(false);
    setSearchTerm('');
    if (onClose) onClose();
  };

  const totalResults = 
    (results.disciples?.length || 0) +
    (results.supervisors?.length || 0) +
    (results.families?.length || 0) +
    (results.reports?.length || 0) +
    (results.videos?.length || 0) +
    (results.modules?.length || 0) +
    (results.prayers?.length || 0) +
    (results.studies?.length || 0) +
    (results.testimonies?.length || 0) +
    (results.resources?.length || 0);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Rechercher disciples, vidéos, modules, prières, études, ressources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (searchTerm.length >= 2) {
              setShowResults(true);
            }
          }}
          className="pl-10 pr-10 h-12 text-lg border-2 border-purple-200 focus:border-purple-500 rounded-lg"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setResults([]);
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showResults && (loading || totalResults > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            ref={resultsRef}
            className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[500px] overflow-y-auto"
          >
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
                <p className="text-gray-500">Recherche en cours...</p>
              </div>
            ) : totalResults > 0 ? (
              <div className="p-2">
                {/* Disciples */}
                {results.disciples && results.disciples.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Disciples ({results.disciples.length})
                    </div>
                    {results.disciples.map((disciple) => (
                      <motion.div
                        key={disciple.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-2 hover:bg-purple-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleResultClick('disciple', disciple)}
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-purple-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {disciple.first_name} {disciple.last_name} {disciple.name ? `(${disciple.name})` : ''}
                            </div>
                            {disciple.email && (
                              <div className="text-sm text-gray-500">{disciple.email}</div>
                            )}
                            {disciple.circle_type && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {disciple.circle_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Superviseurs/Pasteurs */}
                {results.supervisors && results.supervisors.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Superviseurs/Pasteurs ({results.supervisors.length})
                    </div>
                    {results.supervisors.map((supervisor) => (
                      <motion.div
                        key={supervisor.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-2 hover:bg-blue-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleResultClick('supervisor', supervisor)}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {supervisor.first_name} {supervisor.last_name}
                            </div>
                            {supervisor.email && (
                              <div className="text-sm text-gray-500">{supervisor.email}</div>
                            )}
                            <Badge variant="outline" className="mt-1 text-xs capitalize">
                              {supervisor.role}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Familles */}
                {results.families && results.families.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Familles ({results.families.length})
                    </div>
                    {results.families.map((family) => (
                      <motion.div
                        key={family.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-2 hover:bg-green-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleResultClick('family', family)}
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{family.nom}</div>
                            <div className="text-sm text-gray-500">ID: {family.identifiant_famille}</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Rapports */}
                {results.reports && results.reports.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Rapports ({results.reports.length})
                    </div>
                    {results.reports.map((report) => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-2 hover:bg-orange-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleResultClick('report', report)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-orange-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{report.report_type}</div>
                            <div className="text-sm text-gray-500">
                              {report.month && report.year ? `${report.month}/${report.year}` : new Date(report.created_at).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Vidéos d'enseignement */}
                {results.videos && results.videos.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Vidéos d'enseignement ({results.videos.length})
                    </div>
                    {results.videos.map((video) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-2 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleResultClick('video', video)}
                      >
                        <div className="flex items-center gap-3">
                          <PlayCircle className="h-5 w-5 text-red-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{video.title}</div>
                            {video.series_name && (
                              <div className="text-sm text-gray-500">{video.series_name}</div>
                            )}
                            {video.duration && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {video.duration} min
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Modules ImpactX */}
                {results.modules && results.modules.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Modules ImpactX ({results.modules.length})
                    </div>
                    {results.modules.map((module) => (
                      <motion.div
                        key={module.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-2 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleResultClick('module', module)}
                      >
                        <div className="flex items-center gap-3">
                          <Award className="h-5 w-5 text-indigo-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{module.title}</div>
                            {module.module_name && (
                              <div className="text-sm text-gray-500">{module.module_name}</div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Requêtes de prières */}
                {results.prayers && results.prayers.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Requêtes de prières ({results.prayers.length})
                    </div>
                    {results.prayers.map((prayer) => (
                      <motion.div
                        key={prayer.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-2 hover:bg-pink-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleResultClick('prayer', prayer)}
                      >
                        <div className="flex items-center gap-3">
                          <Heart className="h-5 w-5 text-pink-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {prayer.disciple_name ? `Prière pour ${prayer.disciple_name}` : 'Requête de prière'}
                            </div>
                            <div className="text-sm text-gray-500 line-clamp-1">{prayer.request_text}</div>
                            {prayer.is_answered && (
                              <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700 border-green-200">
                                Exaucée
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Études bibliques */}
                {results.studies && results.studies.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Études bibliques ({results.studies.length})
                    </div>
                    {results.studies.map((study) => (
                      <motion.div
                        key={study.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-2 hover:bg-yellow-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleResultClick('study', study)}
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-5 w-5 text-yellow-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{study.title}</div>
                            {study.description && (
                              <div className="text-sm text-gray-500 line-clamp-1">{study.description}</div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Témoignages */}
                {results.testimonies && results.testimonies.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Témoignages ({results.testimonies.length})
                    </div>
                    {results.testimonies.map((testimony) => (
                      <motion.div
                        key={testimony.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-2 hover:bg-teal-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleResultClick('testimony', testimony)}
                      >
                        <div className="flex items-center gap-3">
                          <Video className="h-5 w-5 text-teal-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {testimony.author_name ? `Témoignage de ${testimony.author_name}` : 'Témoignage'}
                            </div>
                            <div className="text-sm text-gray-500 line-clamp-1">{testimony.content}</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Ressources/Ebooks */}
                {results.resources && results.resources.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Ressources ({results.resources.length})
                    </div>
                    {results.resources.map((resource) => (
                      <motion.div
                        key={resource.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-2 hover:bg-blue-50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleResultClick('resource', resource)}
                      >
                        <div className="flex items-center gap-3">
                          <Book className="h-5 w-5 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{resource.title}</div>
                            {resource.type && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {resource.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Aucun résultat trouvé pour &quot;{searchTerm}&quot;
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
