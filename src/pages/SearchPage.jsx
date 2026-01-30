
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  Search, Filter, Calendar, Users, BookOpen, 
  HelpingHand, FileText, Video, Target, ArrowRight,
  Clock, TrendingUp, ArrowDownAZ, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Helmet } from 'react-helmet';

const RESULTS_PER_PAGE = 20;

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [dateRange, setDateRange] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (query) {
      performSearch();
    } else {
      setLoading(false);
      setResults([]);
    }
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      // Parallel queries for different content types
      // Limit 20 per table to avoid huge payload, client side merge/sort
      const queries = [
        // 1. Disciples (profils)
        supabase.from('profils')
          .select('id, first_name, last_name, circle_type, created_at')
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
          .limit(20)
          .then(({ data }) => data?.map(d => ({
             id: d.id, type: 'disciple', title: `${(d.first_name || '')} ${(d.last_name || '')}`.trim() || 'Sans nom',
             description: `Disciple (${d.circle_type || '-'})`,
             date: d.created_at, link: `/space/disciple/${d.id}`
          })) || []),

        // 2. Prayer Requests
        supabase.from('prayer_requests')
          .select('id, request_text, disciple_name, created_at')
          .ilike('request_text', `%${query}%`)
          .limit(20)
          .then(({ data }) => data?.map(d => ({
             id: d.id, type: 'prayer', title: `Prière pour ${d.disciple_name || 'Inconnu'}`, 
             description: d.request_text, 
             date: d.created_at, link: `/prayer-requests`
          })) || []),

        // 3. Bible Studies
        supabase.from('bible_studies')
          .select('id, title, description, created_at')
          .ilike('title', `%${query}%`)
          .limit(20)
          .then(({ data }) => data?.map(d => ({
             id: d.id, type: 'study', title: d.title, 
             description: d.description, 
             date: d.created_at, link: `/meditations`
          })) || []),

        // 4. Testimonies
        supabase.from('testimonies')
          .select('id, content, created_at')
          .ilike('content', `%${query}%`)
          .eq('status', 'approved')
          .limit(20)
          .then(({ data }) => data?.map(d => ({
             id: d.id, type: 'testimony', title: 'Témoignage', 
             description: d.content, 
             date: d.created_at, link: `/videos`
          })) || []),

        // 5. Challenges
        supabase.from('challenge_21_days')
          .select('id, title, description, created_at')
          .ilike('title', `%${query}%`)
          .limit(20)
          .then(({ data }) => data?.map(d => ({
             id: d.id, type: 'challenge', title: d.title, 
             description: d.description, 
             date: d.created_at, link: `/challenge-21`
          })) || []),

         // 6. Resources (Try/Catch in case table missing, though asked in prompt)
         supabase.from('resources')
          .select('id, title, description, type, created_at')
          .ilike('title', `%${query}%`)
          .limit(20)
          .then(({ data }) => data?.map(d => ({
             id: d.id, type: 'resource', title: d.title, 
             description: d.description, 
             badge: d.type,
             date: d.created_at, link: `/ebooks` // Generic link or specific if available
          })) || [])
          .catch(() => []) // Silently fail if table missing
      ];

      const allResults = (await Promise.all(queries)).flat();
      setResults(allResults);

    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredResults = results.filter(item => {
     if (activeTab !== 'all' && item.type !== activeTab) return false;
     
     if (dateRange !== 'all') {
        const itemDate = new Date(item.date);
        const now = new Date();
        if (dateRange === '7days' && (now - itemDate) > 7 * 86400000) return false;
        if (dateRange === '30days' && (now - itemDate) > 30 * 86400000) return false;
     }
     
     return true;
  });

  // Sort Logic
  const sortedResults = [...filteredResults].sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date_asc') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'az') return a.title.localeCompare(b.title);
      return 0; // relevance default (as fetched)
  });

  // Pagination
  const totalPages = Math.ceil(sortedResults.length / RESULTS_PER_PAGE);
  const paginatedResults = sortedResults.slice((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE);

  const getIcon = (type) => {
      switch(type) {
          case 'disciple': return <Users className="text-teal-400" size={20} />;
          case 'prayer': return <HelpingHand className="text-pink-400" size={20} />;
          case 'study': return <BookOpen className="text-blue-400" size={20} />;
          case 'testimony': return <Video className="text-purple-400" size={20} />;
          case 'challenge': return <Target className="text-red-400" size={20} />;
          case 'resource': return <FileText className="text-orange-400" size={20} />;
          default: return <Search size={20} />;
      }
  };

  const getTypeLabel = (type) => {
      const labels = {
          disciple: 'Disciple',
          prayer: 'Prière',
          study: 'Étude',
          testimony: 'Témoignage',
          challenge: 'Challenge',
          resource: 'Ressource'
      };
      return labels[type] || type;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 min-h-screen">
       <Helmet>
         <title>Recherche | DiscipleLife</title>
       </Helmet>

       {/* Search Header */}
       <div className="space-y-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
             <Search className="h-8 w-8 text-yellow-400" />
             Résultats pour "{query}"
          </h1>
          
          <div className="flex flex-col md:flex-row gap-4 items-center bg-[#1a0b2e] p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                 <Filter size={16} className="text-gray-400 shrink-0" />
                 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-transparent h-auto p-0 gap-2">
                       <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-purple-600 data-[state=active]:text-white border border-white/10 h-8 px-4">Tout</TabsTrigger>
                       <TabsTrigger value="disciple" className="rounded-full data-[state=active]:bg-teal-600 data-[state=active]:text-white border border-white/10 h-8 px-4">Disciples</TabsTrigger>
                       <TabsTrigger value="prayer" className="rounded-full data-[state=active]:bg-pink-600 data-[state=active]:text-white border border-white/10 h-8 px-4">Prières</TabsTrigger>
                       <TabsTrigger value="resource" className="rounded-full data-[state=active]:bg-orange-600 data-[state=active]:text-white border border-white/10 h-8 px-4">Ressources</TabsTrigger>
                    </TabsList>
                 </Tabs>
              </div>

              <div className="flex gap-2 ml-auto w-full md:w-auto">
                 <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[140px] h-9 bg-black/20 border-white/10 text-white">
                        <Calendar className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Toute date</SelectItem>
                        <SelectItem value="7days">7 derniers jours</SelectItem>
                        <SelectItem value="30days">Ce mois</SelectItem>
                    </SelectContent>
                 </Select>

                 <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px] h-9 bg-black/20 border-white/10 text-white">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Trier" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="relevance">Pertinence</SelectItem>
                        <SelectItem value="date_desc">Plus récent</SelectItem>
                        <SelectItem value="date_asc">Plus ancien</SelectItem>
                        <SelectItem value="az">A-Z</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
          </div>
       </div>

       {/* Results */}
       {loading ? (
          <div className="py-20 flex justify-center">
             <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
          </div>
       ) : paginatedResults.length === 0 ? (
          <div className="text-center py-20 bg-[#1a0b2e]/50 rounded-xl border border-white/5 border-dashed">
             <Search className="h-16 w-16 mx-auto mb-4 text-gray-600" />
             <h2 className="text-xl font-medium text-white mb-2">Aucun résultat trouvé</h2>
             <p className="text-gray-400">Essayez d'autres mots-clés ou vérifiez l'orthographe.</p>
             <div className="mt-6 flex justify-center gap-4">
                <Button variant="outline" onClick={() => navigate('/ebooks')}>Explorer les ressources</Button>
                <Button variant="outline" onClick={() => navigate('/disciples')}>Voir mes disciples</Button>
             </div>
          </div>
       ) : (
          <div className="space-y-4">
             {paginatedResults.map((item, index) => (
                <div 
                   key={`${item.type}-${item.id}-${index}`}
                   className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-[#1a0b2e] p-4 rounded-xl border border-white/5 hover:border-purple-500/30 hover:bg-[#231238] transition-all group"
                >
                   <div className="h-12 w-12 rounded-full bg-black/30 flex items-center justify-center shrink-0 border border-white/5">
                      {getIcon(item.type)}
                   </div>
                   
                   <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                         <Badge variant="outline" className="text-xs uppercase tracking-wider border-white/10 text-gray-400">
                             {getTypeLabel(item.type)}
                         </Badge>
                         {item.badge && <Badge className="bg-purple-600/20 text-purple-300 border-none text-xs">{item.badge}</Badge>}
                         <span className="text-xs text-gray-500 flex items-center gap-1">
                             <Clock size={10} />
                             {format(new Date(item.date), 'dd MMM yyyy', { locale: fr })}
                         </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                          {item.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-1">
                          {item.description}
                      </p>
                   </div>
                   
                   <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                       <Button size="sm" variant="ghost" className="ml-auto text-gray-400 hover:text-white" asChild>
                          <Link to={item.link}>
                             Voir <ArrowRight size={14} className="ml-1" />
                          </Link>
                       </Button>
                   </div>
                </div>
             ))}
             
             {/* Pagination Controls */}
             {totalPages > 1 && (
                 <div className="flex justify-center gap-2 pt-8">
                     <Button 
                        variant="outline" 
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                     >
                        Précédent
                     </Button>
                     <span className="flex items-center px-4 text-sm text-gray-400">
                        Page {page} sur {totalPages}
                     </span>
                     <Button 
                        variant="outline" 
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                     >
                        Suivant
                     </Button>
                 </div>
             )}
          </div>
       )}
    </div>
  );
};

export default SearchPage;
