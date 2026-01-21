import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitFork, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  ChevronRight, 
  ChevronLeft,
  User,
  Users,
  MapPin,
  Home,
  ArrowUp,
  ArrowDown,
  GitBranch,
  X
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { Helmet } from 'react-helmet';
import SearchBar from '@/components/GenealogicalTree/SearchBar';
import PersonDetails from '@/components/GenealogicalTree/PersonDetails';
import { fetchDescendants, fetchAscendants, fetchCompleteTree } from '@/lib/genealogicalUtils';

// --- Recursive Tree Node for Desktop ---
const TreeNode = ({ node, level = 0, onNodeClick, isAncestor = false }) => {
  // Protection contre les nodes invalides
  if (!node || !node.id) {
    return null;
  }
  
  const hasChildren = node.children && node.children.length > 0;
  const avatarColor = getAvatarColor(node.name || '');

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onClick={() => onNodeClick && onNodeClick(node)}
        className={`
          relative z-10 flex flex-col items-center p-3 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer min-w-[140px] max-w-[180px]
          ${level === 0 ? 'border-primary/50 bg-primary/5' : 'border-slate-200'}
          ${isAncestor ? 'border-blue-300 bg-blue-50' : ''}
        `}
      >
        <Avatar className={`h-12 w-12 mb-2 border-2 ${level === 0 ? 'border-primary' : isAncestor ? 'border-blue-400' : 'border-white'} shadow-sm`}>
            <AvatarImage src={node.avatar_url} />
            <AvatarFallback className={`${avatarColor} text-white`}>{getInitials(node.name)}</AvatarFallback>
        </Avatar>
        
        <div className="text-center">
            <h4 className="font-semibold text-sm text-slate-900 truncate w-full px-1">{node.name}</h4>
            <p className="text-xs text-slate-500 truncate">{node.role || 'Disciple'}</p>
        </div>
        
        {hasChildren && (
            <Badge variant="secondary" className="mt-2 text-[10px] h-5 px-1.5 bg-slate-100 text-slate-600">
                {node.children.length} {node.children.length === 1 ? 'disciple' : 'disciples'}
            </Badge>
        )}
      </motion.div>

      {hasChildren && (
        <div className="relative flex flex-col items-center mt-4">
          {/* Vertical line from parent to children container */}
          <div className={`w-px h-8 ${isAncestor ? 'bg-blue-300' : 'bg-slate-300'}`}></div>
          
          <div className="flex gap-8 relative pt-4">
             {/* Horizontal connector line */}
             {node.children.length > 1 && (
                <div className={`absolute top-0 left-0 right-0 h-px ${isAncestor ? 'bg-blue-300' : 'bg-slate-300'} mx-[calc(50%/var(--child-count))]`}></div> 
             )}
             
             {node.children.map((child, index) => (
               <div key={child.id} className="flex flex-col items-center relative">
                  {/* Vertical line entering the child */}
                  <div className={`absolute top-[-16px] left-1/2 -translate-x-1/2 w-px h-4 ${isAncestor ? 'bg-blue-300' : 'bg-slate-300'}`}></div>
                  {/* Horizontal line segments for siblings */}
                   <div 
                     className={`absolute top-[-16px] h-px ${isAncestor ? 'bg-blue-300' : 'bg-slate-300'} 
                        ${index === 0 ? 'left-1/2 w-1/2' : ''} 
                        ${index === node.children.length - 1 ? 'right-1/2 w-1/2' : ''}
                        ${index > 0 && index < node.children.length - 1 ? 'w-full' : ''}
                     `}
                   ></div>

                  <TreeNode node={child} level={level + 1} onNodeClick={onNodeClick} isAncestor={isAncestor} />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Desktop Tree View Component ---
const DesktopTreeView = ({ data, ancestors = [], viewMode = 'descendants', onNodeClick }) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  // Protection contre les données invalides
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p>Aucune donnée à afficher</p>
      </div>
    );
  }

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.4));
  const handleReset = () => setScale(1);

  // Vue complète : afficher ascendants en haut, personne au centre, descendants en bas
  const renderCompleteView = () => {
    return (
      <div className="flex flex-col items-center gap-8 py-8">
        {/* Ascendants (en haut, inversés) */}
        {ancestors.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
              Ascendants
            </div>
            <div className="flex flex-col items-center gap-2">
              {ancestors.map((ancestor, idx) => (
                <React.Fragment key={ancestor.id || idx}>
                  <TreeNode node={ancestor} level={ancestors.length - idx} onNodeClick={onNodeClick} isAncestor={true} />
                  {idx < ancestors.length - 1 && (
                    <div className="w-px h-6 bg-blue-300"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
            {data && <div className="w-px h-8 bg-blue-300"></div>}
          </div>
        )}

        {/* Personne centrale */}
        {data && (
          <div className="flex flex-col items-center">
            <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">
              Personne sélectionnée
            </div>
            <TreeNode node={data} level={0} onNodeClick={onNodeClick} />
          </div>
        )}

        {/* Descendants (en bas) */}
        {data && data.children && data.children.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Descendants
            </div>
            <TreeNode node={data} level={0} onNodeClick={onNodeClick} />
          </div>
        )}
      </div>
    );
  };

  // Vue descendants uniquement
  const renderDescendantsView = () => {
    return data ? <TreeNode node={data} level={0} onNodeClick={onNodeClick} /> : null;
  };

  // Vue ascendants uniquement (inversée)
  const renderAscendantsView = () => {
    if (ancestors.length === 0) return <div className="text-slate-400">Aucun ascendant trouvé</div>;
    
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
          Ascendants
        </div>
        {ancestors.map((ancestor, idx) => (
          <React.Fragment key={ancestor.id || idx}>
            <TreeNode node={ancestor} level={ancestors.length - idx} onNodeClick={onNodeClick} isAncestor={true} />
            {idx < ancestors.length - 1 && (
              <div className="w-px h-6 bg-blue-300"></div>
            )}
          </React.Fragment>
        ))}
        {data && (
          <>
            <div className="w-px h-8 bg-blue-300"></div>
            <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mt-4">
              Personne sélectionnée
            </div>
            <TreeNode node={data} level={0} onNodeClick={onNodeClick} />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] overflow-hidden bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 bg-white p-1 rounded-lg shadow-md border border-slate-100">
        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
          <ZoomIn size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
          <Maximize size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
          <ZoomOut size={18} />
        </Button>
      </div>

      <div 
        ref={containerRef}
        className="absolute inset-0 overflow-auto cursor-grab active:cursor-grabbing p-20 flex justify-center min-w-full"
      >
         <motion.div 
            style={{ scale, transformOrigin: 'top center' }}
            drag
            dragConstraints={containerRef}
            className="flex justify-center"
         >
             {viewMode === 'complete' ? renderCompleteView() :
              viewMode === 'ascendants' ? renderAscendantsView() :
              renderDescendantsView()}
         </motion.div>
      </div>
    </div>
  );
};


// --- Mobile Tree View Component (Drill-down) ---
const MobileTreeView = ({ data, ancestors = [], viewMode = 'descendants', onNodeClick }) => {
  const [history, setHistory] = useState(data ? [data] : []); // Stack of nodes to track path
  const currentNode = history[history.length - 1]; // Current view

  // Mettre à jour l'historique quand data change
  useEffect(() => {
    if (data) {
      setHistory([data]);
    }
  }, [data]);

  const handleNavigateDown = (childNode) => {
    setHistory([...history, childNode]);
  };

  const handleNavigateUp = (index) => {
    // If clicking breadcrumb, go back to that specific level
    if (index !== undefined) {
        setHistory(history.slice(0, index + 1));
    } else {
        // Just go back one level
        if (history.length > 1) {
            setHistory(history.slice(0, -1));
        }
    }
  };

  if (!data && !currentNode) return <div className="p-4 text-center text-slate-500">Chargement...</div>;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Breadcrumb Header */}
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
         <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0" 
            onClick={() => handleNavigateUp(0)} 
            disabled={history.length === 1}
         >
            <Home size={16} />
         </Button>
         
         {history.map((node, idx) => (
             <React.Fragment key={node.id || idx}>
                 {idx > 0 && <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                 <button 
                    onClick={() => handleNavigateUp(idx)}
                    className={`text-sm font-medium px-2 py-1 rounded hover:bg-slate-200 transition-colors ${idx === history.length - 1 ? 'text-slate-900 bg-white shadow-sm' : 'text-slate-500'}`}
                 >
                    {idx === 0 ? 'Racine' : node.name}
                 </button>
             </React.Fragment>
         ))}
      </div>

      {/* Current Level View */}
      <div className="flex-1 overflow-y-auto p-4">
         {/* Current Node Header */}
         <div className="flex items-center gap-4 mb-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                <AvatarImage src={currentNode.avatar_url} />
                <AvatarFallback className={`${getAvatarColor(currentNode.name)} text-white text-xl`}>
                    {getInitials(currentNode.name)}
                </AvatarFallback>
            </Avatar>
            <div>
                <h3 className="font-bold text-lg text-slate-900">{currentNode.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                    <User size={14} />
                    {currentNode.role || 'Disciple'}
                </p>
                <Badge variant="outline" className="mt-2 bg-white border-primary/20 text-primary">
                    {currentNode.children?.length || 0} disciples directs
                </Badge>
            </div>
         </div>

         {/* Children List */}
         <div className="space-y-3">
             <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Disciples</h4>
             
             {currentNode.children && currentNode.children.length > 0 ? (
                 currentNode.children.map((child) => (
                     <motion.div
                        key={child.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          handleNavigateDown(child);
                          onNodeClick && onNodeClick(child);
                        }}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-slate-50 transition-all cursor-pointer bg-white shadow-sm"
                     >
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={child.avatar_url} />
                                <AvatarFallback className={`${getAvatarColor(child.name)} text-white`}>
                                    {getInitials(child.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-slate-900">{child.name}</p>
                                <p className="text-xs text-slate-500">
                                    {child.children?.length > 0 
                                        ? `${child.children.length} disciples` 
                                        : 'Pas encore de disciples'}
                                </p>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-300" />
                     </motion.div>
                 ))
             ) : (
                 <div className="text-center py-8 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                     <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                     <p>Aucun disciple pour le moment</p>
                 </div>
             )}
         </div>
      </div>
    </div>
  );
};


// --- Main Page Component ---
const GenealogicalTree = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [treeData, setTreeData] = useState(null);
  const [ancestors, setAncestors] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [viewMode, setViewMode] = useState('descendants'); // 'descendants', 'ascendants', 'complete'
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState(null);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Charger l'arbre de l'utilisateur connecté par défaut
  const loadUserTree = useCallback(async () => {
    if (!user) {
      console.log('GenealogicalTree: Pas d\'utilisateur, arrêt du chargement');
      setLoading(false);
      return;
    }
    
    console.log('GenealogicalTree: Début du chargement pour utilisateur:', user.id);
    setLoading(true);
    setError(null);

    // Timeout de sécurité (30 secondes)
    const timeoutId = setTimeout(() => {
      console.warn('GenealogicalTree: Timeout du chargement après 30s');
      setLoading(false);
      setError('Le chargement prend plus de temps que prévu. Veuillez réessayer.');
    }, 30000);

    try {
      console.log('GenealogicalTree: Récupération des descendants...');
      const descendantsTree = await fetchDescendants(user.id, 'profil');
      console.log('GenealogicalTree: Descendants récupérés:', descendantsTree ? 'Oui' : 'Non');
      
      console.log('GenealogicalTree: Récupération des ascendants...');
      const ascendantsResult = await fetchAscendants(user.id, 'profil');
      console.log('GenealogicalTree: Ascendants récupérés:', ascendantsResult);

      // Toujours définir treeData, même si null
      if (descendantsTree) {
        setTreeData(descendantsTree);
      } else {
        // Créer un arbre minimal avec l'utilisateur comme racine
        const { data: userData } = await supabase
          .from('profils')
          .select('id, first_name, last_name, email, avatar_url, role')
          .eq('id', user.id)
          .maybeSingle();
        
        setTreeData({
          id: user.id,
          name: userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'Moi' : 'Moi',
          avatar_url: userData?.avatar_url,
          role: userData?.role || 'user',
          children: []
        });
      }
      
      setAncestors(ascendantsResult?.ancestors || []);
      setSelectedPerson({
        id: user.id,
        type: 'profil',
        name: descendantsTree?.name || 'Moi',
        ...(descendantsTree || {})
      });
    } catch (error) {
      console.error('Erreur chargement arbre utilisateur:', error);
      setError(error.message || 'Erreur lors du chargement de l\'arbre');
      // Même en cas d'erreur, définir un arbre minimal
      setTreeData({
        id: user.id,
        name: 'Moi',
        children: []
      });
      setAncestors([]);
      setSelectedPerson({
        id: user.id,
        type: 'profil',
        name: 'Moi'
      });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      console.log('GenealogicalTree: Fin du chargement');
      setLoading(false);
    }
  }, [user]);

  // Charger l'arbre d'une personne sélectionnée
  const loadPersonTree = useCallback(async (person, mode = viewMode) => {
    if (!person || !person.id) {
      console.warn('loadPersonTree: person ou person.id manquant', person);
      return;
    }
    
    setLoading(true);

    try {
      let descendantsTree = null;
      let ascendantsResult = { person: null, ancestors: [] };

      if (mode === 'descendants' || mode === 'complete') {
        descendantsTree = await fetchDescendants(person.id, person.type);
      }

      if (mode === 'ascendants' || mode === 'complete') {
        ascendantsResult = await fetchAscendants(person.id, person.type);
      }

      if (descendantsTree) {
        setTreeData(descendantsTree);
      } else if (ascendantsResult.person) {
        // Si pas de descendants, utiliser la personne elle-même comme racine
        setTreeData({
          ...ascendantsResult.person,
          children: []
        });
      } else {
        // Si aucune donnée, utiliser la personne elle-même avec un arbre minimal
        setTreeData({
          ...person,
          children: person.children || []
        });
      }

      setAncestors(ascendantsResult.ancestors || []);
    } catch (error) {
      console.error('Erreur chargement arbre personne:', error);
      // Même en cas d'erreur, définir un arbre minimal pour éviter l'écran blanc
      setTreeData({
        ...person,
        children: []
      });
      setAncestors([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  // Charger l'arbre au montage (attendre que l'auth soit terminée)
  useEffect(() => {
    // Attendre que l'authentification soit terminée
    if (authLoading) {
      return; // Ne rien faire tant que l'auth charge
    }
    
    if (user) {
      loadUserTree();
    } else {
      // Si pas d'utilisateur après le chargement de l'auth, arrêter le chargement
      setLoading(false);
    }
  }, [user, authLoading, loadUserTree]);

  // Recharger quand le mode de vue change (seulement si une personne est déjà sélectionnée et différente de l'utilisateur)
  // Utiliser une ref pour éviter les boucles infinies
  const isInitialLoad = useRef(true);
  const lastViewMode = useRef(viewMode);
  
  useEffect(() => {
    // Ignorer le premier rendu
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      lastViewMode.current = viewMode;
      return;
    }
    
    // Seulement recharger si le mode de vue a vraiment changé
    if (viewMode !== lastViewMode.current && selectedPerson && selectedPerson.id && selectedPerson.id !== user?.id) {
      lastViewMode.current = viewMode;
      loadPersonTree(selectedPerson, viewMode);
    }
  }, [viewMode, selectedPerson, user, loadPersonTree]);

  const handleSelectPerson = useCallback((person) => {
    if (person && person.id) {
      setSelectedPerson(person);
      loadPersonTree(person, viewMode);
      setShowDetails(true);
    }
  }, [viewMode, loadPersonTree]);

  const handleResetToSelf = useCallback(() => {
    loadUserTree();
    setShowDetails(false);
  }, [loadUserTree]);

  const handleNodeClick = (node) => {
    setSelectedPerson(node);
    setShowDetails(true);
  };

  const handleViewProfile = (personId) => {
    navigate(`/profile/${personId}`);
  };

  const handleContact = (email) => {
    window.location.href = `mailto:${email}`;
  };

  const handleViewTree = (person) => {
    handleSelectPerson(person);
  };


  // Afficher un message d'erreur si nécessaire
  if (error && !treeData) {
    return (
      <>
        <Helmet>
          <title>Arbre Généalogique | DiscipleLife</title>
        </Helmet>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <GitFork className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => { setError(null); loadUserTree(); }}>
              Réessayer
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Arbre Généalogique | DiscipleLife</title>
      </Helmet>

      <div className="h-full flex flex-col space-y-4">
        {/* Header avec recherche */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <GitFork className="text-primary" />
                Arbre Généalogique
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Visualisez votre descendance spirituelle et l'impact de votre ministère.
              </p>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <SearchBar
                onSelectPerson={handleSelectPerson}
                currentPersonId={selectedPerson?.id}
                onResetToSelf={handleResetToSelf}
              />
            </div>
          </div>

          {/* Mode de visualisation */}
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="descendants" className="flex items-center gap-2">
                <ArrowDown size={16} />
                Descendants
              </TabsTrigger>
              <TabsTrigger value="ascendants" className="flex items-center gap-2">
                <ArrowUp size={16} />
                Ascendants
              </TabsTrigger>
              <TabsTrigger value="complete" className="flex items-center gap-2">
                <GitBranch size={16} />
                Vue complète
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Contenu principal */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-[500px]">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-slate-500">Chargement de l'arbre généalogique...</p>
            </div>
          </div>
        ) : !treeData ? (
          <div className="flex-1 flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <GitFork className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">Aucune donnée disponible pour l'arbre généalogique.</p>
              <Button onClick={loadUserTree} className="mt-4">
                Recharger
              </Button>
            </div>
          </div>
        ) : (
            <div className="flex-1 min-h-[500px] flex gap-4">
            {/* Arbre */}
            <div className={`flex-1 ${showDetails && !isMobile ? 'w-2/3' : 'w-full'}`}>
              {isMobile ? (
                <MobileTreeView
                  data={treeData}
                  ancestors={ancestors}
                  viewMode={viewMode}
                  onNodeClick={handleNodeClick}
                />
              ) : (
                <DesktopTreeView
                  data={treeData}
                  ancestors={ancestors}
                  viewMode={viewMode}
                  onNodeClick={handleNodeClick}
                />
              )}
            </div>

            {/* Panneau de détails (desktop uniquement) */}
            {showDetails && selectedPerson && !isMobile && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-1/3"
              >
                <div className="sticky top-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Détails</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDetails(false)}
                      className="h-6 w-6"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                  <PersonDetails
                    person={selectedPerson}
                    onViewProfile={handleViewProfile}
                    onContact={handleContact}
                    onViewTree={handleViewTree}
                  />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default GenealogicalTree;