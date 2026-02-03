import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GitFork,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronRight,
  User,
  Users,
  Home,
  ArrowDown,
  ArrowUp,
  Network,
  Link2,
  X,
  Search,
  List,
  GitBranch,
  FileDown,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { Helmet } from 'react-helmet';
import { exportElementToPDF } from '@/lib/ExportUtils';
import { useToast } from '@/components/ui/use-toast';

// --- Recursive Tree Node for Desktop (onNodeClick = sélection au clic pour Ascendants/Descendants) ---
const TreeNode = ({ node, level = 0, onNodeClick, selectedNodeId }) => {
  const hasChildren = node.children && node.children.length > 0;
  const avatarColor = getAvatarColor(node.name);
  const isSelected = selectedNodeId && node?.id === selectedNodeId;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        role="button"
        tabIndex={0}
        onClick={() => onNodeClick?.(node)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNodeClick?.(node); } }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`
          relative z-10 flex flex-col items-center p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer min-w-[140px] max-w-[180px]
          ${isSelected ? 'border-4 border-primary ring-2 ring-primary/30' : 'border'}
          ${!isSelected && (level === 0 ? 'border-primary/50 bg-primary/5' : 'border-slate-200')}
        `}
      >
        <Avatar className={`h-12 w-12 mb-2 border-2 ${level === 0 ? 'border-primary' : 'border-white'} shadow-sm`}>
            <AvatarImage src={node.avatar_url} />
            <AvatarFallback className={`${avatarColor} text-white`}>{getInitials(node.name)}</AvatarFallback>
        </Avatar>
        
        <div className="text-center">
            <h4 className="font-semibold text-sm text-slate-900 truncate w-full px-1">{node.name}</h4>
            <p className="text-xs text-slate-500 truncate">{node.role || 'Disciple'}</p>
        </div>
        
        {(hasChildren || (node.nb_disciples != null && node.nb_disciples > 0)) && (
            <span className="mt-2 inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-medium text-white">
                {(node.children?.length ?? node.nb_disciples ?? 0)} {(node.children?.length ?? node.nb_disciples ?? 0) === 1 ? 'disciple' : 'disciples'}
            </span>
        )}
      </motion.div>

      {hasChildren && (
        <div className="relative flex flex-col items-center mt-4">
          {/* Vertical line from parent to children container */}
          <div className="w-px h-8 bg-slate-300"></div>
          
          <div className="flex gap-8 relative pt-4">
             {/* Horizontal connector line */}
             {node.children.length > 1 && (
                <div className="absolute top-0 left-0 right-0 h-px bg-slate-300 mx-[calc(50%/var(--child-count))]"></div> 
             )}
             {/* Note: The horizontal line logic in CSS flex trees can be tricky. 
                 A simpler CSS-only approach often uses ::before/::after on the children wrapper.
                 For this implementation, we'll use a standard flex approach with connecting lines.
             */}
             
             {node.children.map((child, index) => (
               <div key={`${child.id}-${level}-${index}`} className="flex flex-col items-center relative">
                  {/* Vertical line entering the child */}
                  <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 w-px h-4 bg-slate-300"></div>
                  {/* Horizontal line segments for siblings */}
                   <div 
                     className={`absolute top-[-16px] h-px bg-slate-300 
                        ${index === 0 ? 'left-1/2 w-1/2' : ''} 
                        ${index === node.children.length - 1 ? 'right-1/2 w-1/2' : ''}
                        ${index > 0 && index < node.children.length - 1 ? 'w-full' : ''}
                     `}
                   ></div>

                  <TreeNode node={child} level={level + 1} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Desktop Tree View Component ---
const DesktopTreeView = ({ data, onNodeClick, selectedNodeId }) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.4));
  const handleReset = () => setScale(1);

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

      <div ref={containerRef} className="absolute inset-0 overflow-auto cursor-grab active:cursor-grabbing p-20 flex justify-center min-w-full">
         <motion.div 
            style={{ scale, transformOrigin: 'top center' }}
            drag
            dragConstraints={containerRef}
            className="flex justify-center"
         >
             {data ? (
                <TreeNode node={data} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />
             ) : (
                <div className="text-slate-400">Aucune donnée à afficher</div>
             )}
         </motion.div>
      </div>
    </div>
  );
};


// --- Mobile Tree View Component (Drill-down) ---
const MobileTreeView = ({ data, onNodeClick, selectedNodeId }) => {
  const [history, setHistory] = useState([data]); // Stack of nodes to track path
  const currentNode = history[history.length - 1]; // Current view
  const isCurrentSelected = selectedNodeId && currentNode?.id === selectedNodeId;

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

  if (!data) return <div className="p-4 text-center text-slate-500">Chargement...</div>;

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
         {/* Current Node Header (clic = sélectionner ; contour épais si sélectionné) */}
         <div
           role="button"
           tabIndex={0}
           onClick={() => onNodeClick?.(currentNode)}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNodeClick?.(currentNode); } }}
           className={`flex items-center gap-4 mb-6 p-4 rounded-xl cursor-pointer transition-all ${isCurrentSelected ? 'bg-primary/10 border-4 border-primary ring-2 ring-primary/30' : 'bg-primary/5 border border-primary/10'}`}
         >
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
                 currentNode.children.map((child) => {
                   const isChildSelected = selectedNodeId && child.id === selectedNodeId;
                   return (
                     <motion.div
                        key={child.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { onNodeClick?.(child); handleNavigateDown(child); }}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer bg-white shadow-sm ${isChildSelected ? 'border-4 border-primary ring-2 ring-primary/30' : 'border border-slate-100 hover:border-primary/30 hover:bg-slate-50'}`}
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
                   );
                 })
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


// --- Build tree from get_arbre_4_niveaux flat list (filtered by family) ---
function buildTreeFromArbreRows(rows) {
  if (!rows?.length) return null;
  const byId = {};
  rows.forEach((r) => {
    byId[r.id] = {
      id: r.id,
      name: [r.prenom, r.nom].filter(Boolean).join(' ').trim() || r.nom || '—',
      role: r.role_niveau || 'Disciple',
      nb_disciples: r.nb_disciples ?? 0,
      parent_id: r.parent_id,
      children: [],
    };
  });
  let root = null;
  rows.forEach((r) => {
    const node = byId[r.id];
    if (!node) return;
    if (r.parent_id == null) root = node;
    else if (byId[r.parent_id]) byId[r.parent_id].children.push(node);
  });
  return root;
}

// --- Flatten tree to list (root first, then descendants depth-first) ---
function flattenTree(node) {
  if (!node) return [];
  const out = [];
  function walk(n) {
    out.push(n);
    (n.children || []).forEach(walk);
  }
  walk(node);
  return out;
}

// --- Build map id -> node from tree (for ancestors) ---
function treeToById(root) {
  const byId = {};
  function walk(n) {
    if (!n) return;
    byId[n.id] = n;
    (n.children || []).forEach(walk);
  }
  walk(root);
  return byId;
}

// --- Ancestors of node (from node up to root) ---
function getAncestors(node, byId) {
  const list = [];
  let cur = node;
  while (cur?.parent_id && byId[cur.parent_id]) {
    cur = byId[cur.parent_id];
    list.push(cur);
  }
  return list.reverse();
}

// --- Extract subtree with given node as root ---
function subtreeAsRoot(node) {
  if (!node) return null;
  return {
    id: node.id,
    name: node.name,
    role: node.role,
    nb_disciples: node.nb_disciples,
    avatar_url: node.avatar_url,
    children: (node.children || []).map(subtreeAsRoot),
  };
}

// --- Build organigram chain from root to selectedNode (ascendants path) ---
function buildAncestorsChainTree(selectedNode, byId) {
  if (!selectedNode || !byId) return null;
  const ancestors = getAncestors(selectedNode, byId);
  if (ancestors.length === 0) return subtreeAsRoot(selectedNode);
  let node = { ...selectedNode, children: [] };
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = { ...ancestors[i], children: [node] };
  }
  return node;
}

// --- Main Page Component ---
const GenealogicalTree = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const urlFamilyId = searchParams.get('family');
  const urlPasteurId = searchParams.get('pasteur');
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [userProfile, setUserProfile] = useState(null); // { role, famille_id }
  const [familles, setFamilles] = useState([]); // Pour pasteur = familles sous sa tutelle, pour autres = non utilisé (arbre = leur famille)
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [selectedFamilleId, setSelectedFamilleId] = useState('');
  // Vue liste / arbre : 'list' = liste + détail, 'tree' = arbre hiérarchique (organigramme). Par défaut = organigramme.
  const [viewMode, setViewMode] = useState('tree');
  // Filtre : descendants (depuis racine), ascendants (ancêtres du sélectionné), vue complète
  const [viewFilter, setViewFilter] = useState('full'); // 'full' = organigramme par défaut
  const [selectedNode, setSelectedNode] = useState(null);
  // Racine affichée dans la vue arbre (après "Voir son arbre" = sous-arbre de ce nœud)
  const [displayedTreeRoot, setDisplayedTreeRoot] = useState(null);
  // Barre de recherche : filtrer par nom dans la famille
  const [searchQuery, setSearchQuery] = useState('');

  const isPasteur = userProfile?.role === 'pasteur';

  // Charger le profil utilisateur (role, famille_id)
  useEffect(() => {
    if (!user?.id) {
      setUserProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profils')
        .select('role, famille_id')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled && !error && data) setUserProfile({ role: data.role, famille_id: data.famille_id || null });
      else if (!cancelled) setUserProfile(null);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Charger les familles : pasteur = familles sous sa tutelle ; autres = la famille de l'utilisateur (pour résoudre l'arbre)
  useEffect(() => {
    if (!user?.id) {
      setFamilles([]);
      setLoadingFamilies(false);
      return;
    }
    let cancelled = false;
    setLoadingFamilies(true);
    (async () => {
      const { data: profile } = await supabase
        .from('profils')
        .select('role, famille_id')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile?.role === 'pasteur') {
        const { data: list, error } = await supabase
          .from('familles_disciples')
          .select('id, nom, pasteur_id, superviseur_id')
          .eq('pasteur_id', user.id)
          .order('nom');
        if (!cancelled) {
          setFamilles(list || []);
        }
      } else {
        // Superviseur : famille où superviseur_id = user.id ; autres : famille_id du profil
        let familleId = profile?.famille_id || null;
        if (profile?.role === 'superviseur' && !familleId) {
          const { data: fam } = await supabase
            .from('familles_disciples')
            .select('id, nom, pasteur_id, superviseur_id')
            .eq('superviseur_id', user.id)
            .maybeSingle();
          if (fam) familleId = fam.id;
        }
        if (familleId) {
          const { data: fam } = await supabase
            .from('familles_disciples')
            .select('id, nom, pasteur_id, superviseur_id')
            .eq('id', familleId)
            .maybeSingle();
          if (!cancelled) setFamilles(fam ? [fam] : []);
        } else if (!cancelled) setFamilles([]);
      }
      if (!cancelled) setLoadingFamilies(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Pour non-pasteur : forcer la famille de l'utilisateur (une seule) ; pour pasteur : initialiser depuis URL ou première famille
  useEffect(() => {
    if (!familles.length) return;
    if (isPasteur) {
      if (urlFamilyId && familles.some((f) => f.id === urlFamilyId)) setSelectedFamilleId(urlFamilyId);
      else if (!selectedFamilleId || !familles.some((f) => f.id === selectedFamilleId))
        setSelectedFamilleId(familles[0]?.id || '');
    } else {
      setSelectedFamilleId(familles[0]?.id || '');
    }
  }, [familles, isPasteur, urlFamilyId]);

  // Initialiser la sélection depuis l'URL (?family=) pour pasteur
  useEffect(() => {
    if (isPasteur && urlFamilyId && familles.length > 0 && familles.some((f) => f.id === urlFamilyId))
      setSelectedFamilleId(urlFamilyId);
  }, [urlFamilyId, familles, isPasteur]);

  // Réinitialiser racine affichée et sélection quand on change de données (garder viewMode pour ne pas forcer la liste au chargement)
  useEffect(() => {
    setDisplayedTreeRoot(null);
    setSelectedNode(null);
  }, [treeData?.id]);

  const byId = useMemo(() => treeToById(treeData), [treeData]);
  const listForViewRaw = useMemo(() => {
    if (!treeData) return [];
    if (viewFilter === 'descendants' || viewFilter === 'full') return flattenTree(treeData);
    if (viewFilter === 'ascendants' && selectedNode && byId[selectedNode.id])
      return getAncestors(selectedNode, byId);
    return flattenTree(treeData);
  }, [treeData, viewFilter, selectedNode, byId]);

  const listForView = useMemo(() => {
    if (!searchQuery.trim()) return listForViewRaw;
    const q = searchQuery.trim().toLowerCase();
    return listForViewRaw.filter((node) => (node.name || '').toLowerCase().includes(q));
  }, [listForViewRaw, searchQuery]);

  // Organigramme : selon le filtre, afficher la chaîne ascendants, le sous-arbre descendants, ou l'arbre complet
  const treeToDisplay = useMemo(() => {
    if (viewFilter === 'ascendants' && selectedNode && byId[selectedNode.id])
      return buildAncestorsChainTree(selectedNode, byId);
    if (viewFilter === 'descendants' && selectedNode)
      return subtreeAsRoot(selectedNode);
    if (displayedTreeRoot) return subtreeAsRoot(displayedTreeRoot);
    return treeData;
  }, [viewFilter, selectedNode, byId, displayedTreeRoot, treeData]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Tree Data : par famille (selectedFamilleId) ou DR mode (?pasteur=). Pas de "Ma lignée".
  useEffect(() => {
    const fetchTree = async () => {
      const hasPasteurUrl = urlPasteurId && urlPasteurId.length > 0;
      if (!selectedFamilleId && !hasPasteurUrl) return;
      setLoading(true);
      setTreeData(null);

      try {
        // --- Mode DR (lien dashboard pasteur) : arbre de toutes les familles du pasteur ---
        if (hasPasteurUrl) {
          const { data: arbreRows, error: rpcError } = await supabase.rpc('get_arbre_4_niveaux', {
            p_pasteur_id: urlPasteurId,
          });
          if (rpcError) throw rpcError;
          const root = buildTreeFromArbreRows(arbreRows || []);
          setTreeData(root);
          setLoading(false);
          return;
        }

        // --- Arbre de la famille sélectionnée (pasteur choisit une famille ; non-pasteur voient uniquement leur famille) ---
        const family = familles.find((f) => f.id === selectedFamilleId);
        if (!family) {
          setLoading(false);
          return;
        }
        const familyNom = (family.nom || '').trim();

        if (family.pasteur_id) {
          const { data: arbreRows, error: rpcError } = await supabase.rpc('get_arbre_4_niveaux', {
            p_pasteur_id: family.pasteur_id,
          });
          if (rpcError) throw rpcError;
          const filtered =
            (arbreRows || []).filter(
              (r) =>
                r.niveau === 1 ||
                (r.famille_nom && String(r.famille_nom).trim() === familyNom)
            ) || [];
          const root = buildTreeFromArbreRows(filtered);
          setTreeData(root);
          setLoading(false);
          return;
        }

        // Fallback : famille sans pasteur_id → arbre à partir du superviseur (profils + mentor_id)
        const superviseurId = family.superviseur_id;
        if (!superviseurId) {
          setLoading(false);
          return;
        }
        const { data: superviseurData } = await supabase
          .from('profils')
          .select('id, first_name, last_name, avatar_url, role')
          .eq('id', superviseurId)
          .single();
        const { data: membresData } = await supabase
          .from('profils')
          .select('id, first_name, last_name, avatar_url, mentor_id')
          .eq('famille_id', family.id);
        const dataList = membresData || [];
        const buildHierarchy = (parentId) =>
          dataList
            .filter((d) => d.mentor_id === parentId)
            .map((d) => ({
              id: d.id,
              name: [d.first_name, d.last_name].filter(Boolean).join(' ').trim() || 'Sans nom',
              avatar_url: d.avatar_url,
              role: 'Disciple',
              children: buildHierarchy(d.id),
            }));
        const root = {
          id: superviseurId,
          name:
            [superviseurData?.first_name, superviseurData?.last_name].filter(Boolean).join(' ').trim() ||
            'Superviseur',
          avatar_url: superviseurData?.avatar_url,
          role: superviseurData?.role || 'Superviseur',
          children: buildHierarchy(superviseurId),
        };
        setTreeData(root);
      } catch (error) {
        console.error('Error building tree:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, [selectedFamilleId, familles, urlPasteurId]);

  return (
    <>
      <Helmet>
        <title>Arbre Généalogique | DiscipleLife</title>
      </Helmet>

      <div className="w-full max-w-7xl mx-auto h-full flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-slate-900 flex items-center gap-2">
              <GitFork className="text-primary" />
              Arbre Généalogique
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {urlPasteurId
                ? 'Vue : toutes les familles (DR mode) – Pasteur → Superviseurs → Mentors → Disciples.'
                : isPasteur
                  ? 'Choisissez une famille pour afficher son arbre.'
                  : 'Arbre de votre famille.'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Bouton Export PDF tout en haut à droite */}
            {treeData && (
              <Button
                variant="outline"
                size="sm"
                disabled={exporting}
                onClick={async () => {
                  setExporting(true);
                  try {
                    await exportElementToPDF('arbre-genealogique-export', 'arbre_genealogique');
                    toast({ title: 'Export PDF réussi', description: "L'arbre généalogique a été exporté en PDF." });
                  } catch (error) {
                    console.error('Export PDF error:', error);
                    toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'exporter en PDF." });
                  } finally {
                    setExporting(false);
                  }
                }}
                className="bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white hover:border-red-700"
              >
                <FileDown className="h-4 w-4 mr-1" />
                {exporting ? 'Export...' : 'Export PDF'}
              </Button>
            )}
            {/* Menu déroulant "Vue" : uniquement pour les pasteurs (familles sous leur tutelle) */}
            {!urlPasteurId && isPasteur && (
              <>
                <Label htmlFor="famille-select" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  Vue
                </Label>
                <Select
                  value={selectedFamilleId || ''}
                  onValueChange={(v) => setSelectedFamilleId(v || '')}
                  disabled={loadingFamilies}
                >
                  <SelectTrigger id="famille-select" className="w-[220px] bg-white">
                    <SelectValue placeholder="Choisir une famille" />
                  </SelectTrigger>
                  <SelectContent>
                    {(familles || []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nom || f.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : !treeData ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p>
              {selectedFamilleId
                ? 'Aucune donnée pour cette famille.'
                : 'Connectez-vous pour voir votre lignée.'}
            </p>
          </div>
        ) : (
          <div id="arbre-genealogique-export" className="flex flex-col flex-1 min-h-0">
            {/* Barre de recherche par nom dans la famille */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un nom dans la famille..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Effacer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Barre de filtres : Descendants / Ascendants / Vue complète à gauche ; Vue Liste / Vue organigramme tout à droite */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => { setViewFilter('descendants'); setViewMode('tree'); setDisplayedTreeRoot(null); }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  viewFilter === 'descendants'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <ArrowDown className="h-4 w-4" />
                Descendants
              </button>
              <button
                type="button"
                onClick={() => { setViewFilter('ascendants'); setViewMode('tree'); setDisplayedTreeRoot(null); }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  viewFilter === 'ascendants'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <ArrowUp className="h-4 w-4" />
                Ascendants
              </button>
              <button
                type="button"
                onClick={() => { setViewFilter('full'); setViewMode('tree'); setDisplayedTreeRoot(null); }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  viewFilter === 'full'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Network className="h-4 w-4" />
                Vue complète
              </button>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setViewMode('list'); setDisplayedTreeRoot(null); }}
                  className={`shrink-0 ${viewMode === 'list' ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 hover:text-white' : 'bg-blue-600 text-white border-blue-600 hover:bg-white hover:text-blue-600 hover:border-blue-600'}`}
                >
                  <List className="h-4 w-4 mr-1" />
                  Vue Liste
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('tree')}
                  className={`shrink-0 ${viewMode === 'tree' ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 hover:text-white' : 'bg-blue-600 text-white border-blue-600 hover:bg-white hover:text-blue-600 hover:border-blue-600'}`}
                >
                  <GitBranch className="h-4 w-4 mr-1" />
                  Vue organigramme
                </Button>
              </div>
            </div>

            {viewMode === 'tree' ? (
              /* Vue arbre (organigramme) : clic sur un nom = sélection ; Descendants / Ascendants filtrent l'organigramme */
              <div className="flex-1 flex flex-col min-h-[500px]">
                {selectedNode && (
                  <p className="text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 mb-3">
                    Personne sélectionnée : <span className="font-semibold text-slate-900">{selectedNode.name}</span>
                  </p>
                )}
                <div className="flex-1 min-h-[400px] rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  {isMobile ? (
                    <MobileTreeView data={treeToDisplay} onNodeClick={(node) => setSelectedNode(byId[node.id] ?? node)} selectedNodeId={selectedNode?.id} />
                  ) : (
                    <DesktopTreeView data={treeToDisplay} onNodeClick={(node) => setSelectedNode(byId[node.id] ?? node)} selectedNodeId={selectedNode?.id} />
                  )}
                </div>
              </div>
            ) : (
              /* Vue liste + panneau Détails */
              <div className="flex-1 flex gap-4 min-h-[500px] overflow-hidden">
                <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-2">
                    {viewFilter === 'ascendants' && !selectedNode && (
                      <p className="text-sm text-slate-500 p-3 bg-amber-50 border border-amber-100 rounded-lg mb-2">
                        Sélectionnez une personne dans la liste pour voir ses ascendants.
                      </p>
                    )}
                    {listForView.map((node, index) => (
                      <motion.button
                        key={`${node.id}-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedNode(node);
                          setDisplayedTreeRoot(node);
                          setViewMode('tree');
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                          selectedNode?.id === node.id ? 'bg-violet-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          selectedNode?.id === node.id ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {index}
                        </span>
                        <Avatar className="h-10 w-10 shrink-0 border border-slate-100">
                          <AvatarFallback className={`${getAvatarColor(node.name)} text-white text-sm`}>
                            {getInitials(node.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{node.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {node.role || 'Disciple'}
                            </span>
                            {(node.children?.length > 0 || (node.nb_disciples != null && node.nb_disciples > 0)) && (
                              <span className="text-xs text-slate-500">
                                {(node.children?.length ?? node.nb_disciples ?? 0)} disciple{(node.children?.length ?? node.nb_disciples ?? 0) !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="w-[320px] shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Détails</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedNode(null)}
                      aria-label="Fermer"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {selectedNode ? (
                      <>
                        <div className="flex flex-col items-center text-center mb-4">
                          <Avatar className="h-16 w-16 mb-2 border-2 border-slate-100">
                            <AvatarFallback className={`${getAvatarColor(selectedNode.name)} text-white text-lg`}>
                              {getInitials(selectedNode.name)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-slate-900">{selectedNode.name}</p>
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 mt-1">
                            {selectedNode.role || 'Disciple'}
                          </span>
                        </div>
                        <div className="border-t border-slate-100 pt-4">
                          <Button
                            className="w-full bg-primary hover:bg-primary/90 text-white"
                            onClick={() => {
                              setDisplayedTreeRoot(selectedNode);
                              setViewMode('tree');
                            }}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Voir son arbre
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-8">
                        Sélectionnez une personne dans la liste pour afficher ses détails.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default GenealogicalTree;