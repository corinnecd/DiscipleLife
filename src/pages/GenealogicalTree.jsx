import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GitFork,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronRight,
  ChevronDown,
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
  Crosshair,
  Image,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
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
import html2canvas from 'html2canvas';
import { toSvg } from 'html-to-image';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

// --- Légende des rôles (pour affichage) ---
const LEGEND_ROLES = [
  { key: 'pasteur', label: 'Pasteur', border: 'border-violet-500', bg: 'bg-violet-100' },
  { key: 'superviseur', label: 'Superviseur', border: 'border-blue-500', bg: 'bg-blue-100' },
  { key: 'mentor', label: 'Mentor', border: 'border-emerald-500', bg: 'bg-emerald-100' },
  { key: 'disciple', label: 'Disciple', border: 'border-slate-300', bg: 'bg-slate-100' },
];

// --- Couleurs par rôle (Pasteur, Superviseur, Mentor, Disciple) ---
const getRoleStyles = (role) => {
  const r = (role || 'disciple').toLowerCase();
  if (r === 'pasteur') return { border: 'border-violet-500', bg: 'bg-violet-50', badge: 'bg-violet-600' };
  if (r === 'superviseur') return { border: 'border-blue-500', bg: 'bg-blue-50', badge: 'bg-blue-600' };
  if (r === 'mentor') return { border: 'border-emerald-500', bg: 'bg-emerald-50', badge: 'bg-emerald-600' };
  return { border: 'border-slate-300', bg: 'bg-slate-50', badge: 'bg-slate-600' };
};

// --- Recursive Tree Node for Desktop (onNodeClick, expand/collapse, tooltips, couleurs par rôle) ---
const TreeNode = ({ node, level = 0, onNodeClick, selectedNodeId, collapsedIds, onToggleCollapse }) => {
  const hasChildren = node.children && node.children.length > 0;
  const avatarColor = getAvatarColor(node.name);
  const isSelected = selectedNodeId && node?.id === selectedNodeId;
  const isCollapsed = collapsedIds?.has(node.id);
  const roleStyles = getRoleStyles(node.role);
  const nbDisciples = node.children?.length ?? node.nb_disciples ?? 0;
  const tooltipText = `${node.name} · ${node.role || 'Disciple'}${nbDisciples > 0 ? ` · ${nbDisciples} disciple${nbDisciples > 1 ? 's' : ''} direct${nbDisciples > 1 ? 's' : ''}` : ''}`;

  return (
    <div className="flex flex-col items-center" role="treeitem" aria-expanded={hasChildren ? !isCollapsed : undefined} aria-selected={isSelected} data-node-id={node.id}>
      <motion.div
        role="button"
        tabIndex={0}
        title={tooltipText}
        aria-label={tooltipText}
        onClick={(e) => {
          e.stopPropagation();
          onNodeClick?.(node);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNodeClick?.(node); } }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`
          relative z-10 flex flex-col items-center p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer min-w-[140px] max-w-[180px]
          ${isSelected ? 'border-4 border-primary ring-2 ring-primary/30' : `border-2 ${roleStyles.border} ${roleStyles.bg}`}
          ${!isSelected && level === 0 && 'border-primary/50 bg-primary/5'}
        `}
      >
        <Avatar className={`h-12 w-12 mb-2 border-2 ${level === 0 ? 'border-primary' : 'border-white'} shadow-sm`}>
            <AvatarImage src={node.avatar_url} />
            <AvatarFallback className={`${avatarColor} text-white`}>{getInitials(node.name)}</AvatarFallback>
        </Avatar>
        
        <div className="text-center w-full min-w-0">
            <h4 className="font-semibold text-sm text-slate-900 truncate w-full px-1">{node.name}</h4>
            <p className="text-xs text-slate-500 truncate">{node.role || 'Disciple'}</p>
        </div>
        
        <div className="mt-2 flex items-center gap-1.5">
          {(hasChildren || nbDisciples > 0) && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white ${roleStyles.badge}`} title={`${nbDisciples} disciple${nbDisciples !== 1 ? 's' : ''} direct${nbDisciples !== 1 ? 's' : ''} (niveau 1)`}>
              {nbDisciples} disc. direct{nbDisciples !== 1 ? 's' : ''}
            </span>
          )}
          {hasChildren && onToggleCollapse && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleCollapse(node.id); }}
              className="p-0.5 rounded hover:bg-slate-200 transition-colors"
              aria-label={isCollapsed ? 'Déplier' : 'Replier'}
              title={isCollapsed ? 'Déplier la branche' : 'Replier la branche'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </motion.div>

      {hasChildren && !isCollapsed && (
        <div className="relative flex flex-col items-center mt-4" role="group" aria-label={`Enfants de ${node.name}`}>
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
                  {/* Horizontal line segments between siblings (un seul enfant = pas de trait horizontal) */}
                  {node.children.length > 1 && (
                   <div 
                     className={`absolute top-[-16px] h-px bg-slate-300 
                        ${index === 0 ? 'left-1/2 w-1/2' : ''} 
                        ${index === node.children.length - 1 ? 'right-1/2 w-1/2' : ''}
                        ${index > 0 && index < node.children.length - 1 ? 'w-full' : ''}
                     `}
                   />
                  )}

                  <TreeNode node={child} level={level + 1} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} collapsedIds={collapsedIds} onToggleCollapse={onToggleCollapse} />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Mini-carte (overview compact pour grands arbres) ---
const MinimapTree = ({ node, level = 0, onNodeClick, selectedNodeId, maxDepth = 3 }) => {
  if (!node || level > maxDepth) return null;
  const r = getRoleStyles(node.role);
  const isSelected = selectedNodeId === node.id;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={() => onNodeClick?.(node)}
        className={`w-3 h-3 rounded-full transition-all hover:scale-125 ${r.bg} ${r.border} border ${isSelected ? 'ring-2 ring-primary scale-125' : ''}`}
        title={node.name}
        aria-label={`${node.name}, ${node.role || 'Disciple'}`}
      />
      {level < maxDepth && node.children?.length > 0 && (
        <div className="flex gap-1 mt-0.5">
          {node.children.slice(0, 5).map((c) => (
            <MinimapTree key={c.id} node={c} level={level + 1} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} maxDepth={maxDepth} />
          ))}
          {node.children.length > 5 && <span className="text-[8px] text-slate-400">+{node.children.length - 5}</span>}
        </div>
      )}
    </div>
  );
};

// --- Desktop Tree View Component ---
const DesktopTreeView = ({ data, onNodeClick, selectedNodeId, collapsedIds, onToggleCollapse, showMinimap = true }) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const lastPinchRef = useRef(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.4));
  const handleReset = () => setScale(1);

  // Pinch-to-zoom sur tactile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        lastPinchRef.current = { d, scale: scaleRef.current };
      }
    };
    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && lastPinchRef.current) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const delta = d / lastPinchRef.current.d;
        const newScale = Math.min(2, Math.max(0.4, lastPinchRef.current.scale * delta));
        setScale(newScale);
        lastPinchRef.current = { d, scale: newScale };
      }
    };
    const handleTouchEnd = () => { lastPinchRef.current = null; };
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-140px)] overflow-hidden bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 bg-white p-1 rounded-lg shadow-md border border-slate-100">
        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8" aria-label="Zoom avant">
          <ZoomIn size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8" aria-label="Réinitialiser la vue">
          <Maximize size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8" aria-label="Zoom arrière">
          <ZoomOut size={18} />
        </Button>
      </div>

      <div ref={containerRef} className="absolute inset-0 overflow-auto cursor-grab active:cursor-grabbing p-20" role="tree" aria-label="Arbre généalogique">
         {/* Wrapper pleine largeur pour que l'arbre reste centré dans la zone visible (y compris avec la Fiche détaillée ouverte) */}
         <div className="min-h-full w-full flex justify-center items-start">
           <motion.div 
              style={{ scale, transformOrigin: 'top center' }}
              drag
              dragConstraints={containerRef}
              className="flex justify-center"
           >
               {data ? (
                  <TreeNode node={data} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} collapsedIds={collapsedIds} onToggleCollapse={onToggleCollapse} />
               ) : (
                  <div className="text-slate-400">Aucune donnée à afficher</div>
               )}
           </motion.div>
         </div>
      </div>

      {/* Mini-carte (overview) */}
      {showMinimap && data && (
        <div className="absolute bottom-4 left-4 z-50 bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow-lg p-2 max-h-32 overflow-auto" role="navigation" aria-label="Vue d'ensemble de l'arbre">
          <p className="text-[10px] font-medium text-slate-500 uppercase mb-1">Vue d'ensemble</p>
          <MinimapTree node={data} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} maxDepth={2} />
        </div>
      )}
    </div>
  );
};


// --- Mobile Tree View Component (Drill-down, pinch-to-zoom si arbre, zones tactiles 44px+) ---
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
            className="h-11 w-11 shrink-0 min-h-[44px] min-w-[44px]" 
            onClick={() => handleNavigateUp(0)} 
            disabled={history.length === 1}
            aria-label="Accueil / racine"
         >
            <Home size={18} />
         </Button>
         
         {history.map((node, idx) => (
             <React.Fragment key={node.id || idx}>
                 {idx > 0 && <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                 <button 
                    onClick={() => handleNavigateUp(idx)}
                    className={`text-sm font-medium px-3 py-2.5 min-h-[44px] rounded hover:bg-slate-200 transition-colors active:scale-95 ${idx === history.length - 1 ? 'text-slate-900 bg-white shadow-sm' : 'text-slate-500'}`}
                    aria-label={idx === 0 ? 'Racine' : `Retour à ${node.name}`}
                 >
                    {idx === 0 ? 'Racine' : node.name}
                 </button>
             </React.Fragment>
         ))}
      </div>

      {/* Current Level View - zones tactiles min 44px pour mobile */}
      <div className="flex-1 overflow-y-auto p-4 touch-manipulation">
         {/* Current Node Header (clic = sélectionner ; min-h 56px pour touch) */}
         <div
           role="button"
           tabIndex={0}
           onClick={() => onNodeClick?.(currentNode)}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNodeClick?.(currentNode); } }}
           className={`flex items-center gap-4 mb-6 p-4 min-h-[56px] rounded-xl cursor-pointer transition-all active:scale-[0.98] ${isCurrentSelected ? 'bg-primary/10 border-4 border-primary ring-2 ring-primary/30' : 'bg-primary/5 border border-primary/10'}`}
           aria-label={`${currentNode.name}, ${currentNode.role || 'Disciple'}, ${currentNode.children?.length || 0} disciples directs`}
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
                        className={`flex items-center justify-between p-4 min-h-[52px] rounded-xl transition-all cursor-pointer bg-white shadow-sm active:scale-[0.98] ${isChildSelected ? 'border-4 border-primary ring-2 ring-primary/30' : 'border border-slate-100 hover:border-primary/30 hover:bg-slate-50'}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNodeClick?.(child); handleNavigateDown(child); } }}
                        aria-label={`${child.name}, ${child.children?.length > 0 ? child.children.length + ' disciples' : 'Pas encore de disciples'}`}
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


// --- Vérifier si un nœud correspond à la recherche : prénom, nom ou famille COMMENCE par la recherche (pas contient) ---
function nodeMatchesSearch(node, q) {
  if (!q) return true;
  const s = (v) => (v || '').toLowerCase();
  const ql = q.toLowerCase();
  return (
    s(node.first_name).startsWith(ql) ||
    s(node.last_name).startsWith(ql) ||
    s(node.famille_nom).startsWith(ql)
  );
}

// --- Filtrer l'arbre par rôle : garder les nœuds dont le rôle est dans roleFilter (Set) ---
function filterTreeByRole(node, roleFilter) {
  if (!node || !roleFilter?.size) return node;
  const r = (node.role || 'disciple').toLowerCase();
  const keep = roleFilter.has(r);
  const filteredChildren = (node.children || [])
    .map((c) => filterTreeByRole(c, roleFilter))
    .filter(Boolean);
  if (keep || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }
  return null;
}

// --- Filtrer l'arbre : garder les nœuds qui matchent ou qui ont des descendants qui matchent ---
function filterTreeBySearch(node, q) {
  if (!node || !q) return node;
  const filteredChildren = (node.children || [])
    .map((c) => filterTreeBySearch(c, q))
    .filter(Boolean);
  if (nodeMatchesSearch(node, q) || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }
  return null;
}

// --- Build tree from get_arbre_4_niveaux flat list (filtered by family) ---
function buildTreeFromArbreRows(rows) {
  if (!rows?.length) return null;
  const byId = {};
  rows.forEach((r) => {
    byId[r.id] = {
      id: r.id,
      name: [r.prenom, r.nom].filter(Boolean).join(' ').trim() || r.nom || '—',
      first_name: r.prenom,
      last_name: r.nom,
      famille_nom: r.famille_nom,
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
    ...node,
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingSvg, setExportingSvg] = useState(false);
  const [mobileOrganigrammeMode, setMobileOrganigrammeMode] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
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
  // Nombre de disciples de la famille (aligné avec FamillesDisciples via get_nombre_profils_par_familles)
  const [nombreDisciplesFamille, setNombreDisciplesFamille] = useState(null);
  // Branches repliées (Set de node ids)
  const [collapsedNodeIds, setCollapsedNodeIds] = useState(() => new Set());
  // Filtre par rôle (Set de 'pasteur'|'superviseur'|'mentor'|'disciple') ; vide = tous
  const [roleFilter, setRoleFilter] = useState(() => new Set());
  // Tri vue liste : 'name'|'role'|'nb_disciples'|'name_desc'
  const [listSort, setListSort] = useState('name');
  // Pagination vue liste
  const [listPage, setListPage] = useState(1);
  const LIST_PAGE_SIZE = 15;

  const isPasteur = userProfile?.role === 'pasteur';

  const toggleRoleFilter = (roleKey) => {
    setRoleFilter((prev) => {
      const next = new Set(prev);
      if (next.has(roleKey)) next.delete(roleKey);
      else next.add(roleKey);
      return next;
    });
    setListPage(1);
  };

  const toggleCollapse = (nodeId) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  // Trouver le nœud de l'utilisateur connecté dans l'arbre
  const findUserNodeInTree = (root, userId) => {
    if (!root || !userId) return null;
    if (root.id === userId) return root;
    for (const child of root.children || []) {
      const found = findUserNodeInTree(child, userId);
      if (found) return found;
    }
    return null;
  };

  const handleCenterOnMe = () => {
    const userNode = findUserNodeInTree(treeData, user?.id);
    if (userNode) {
      setDisplayedTreeRoot(userNode);
      setSelectedNode(byId[userNode.id] ?? userNode);
      setViewFilter('descendants');
      setViewMode('tree');
      setCollapsedNodeIds(new Set());
      toast({ title: 'Centré sur vous', description: "L'arbre affiche votre position." });
    } else {
      toast({ variant: 'destructive', title: 'Non trouvé', description: "Votre profil n'apparaît pas dans cet arbre." });
    }
  };

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

  // Réinitialiser racine affichée, sélection et branches repliées quand on change de données
  useEffect(() => {
    setDisplayedTreeRoot(null);
    setSelectedNode(null);
    setCollapsedNodeIds(new Set());
  }, [treeData?.id]);

  const byId = useMemo(() => treeToById(treeData), [treeData]);
  const listForViewRaw = useMemo(() => {
    if (!treeData) return [];
    if (viewFilter === 'descendants' || viewFilter === 'full') return flattenTree(treeData);
    if (viewFilter === 'ascendants' && selectedNode && byId[selectedNode.id])
      return getAncestors(selectedNode, byId);
    return flattenTree(treeData);
  }, [treeData, viewFilter, selectedNode, byId]);

  const listForViewFiltered = useMemo(() => {
    let list = listForViewRaw;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((node) => nodeMatchesSearch(node, q));
    }
    if (roleFilter.size > 0) {
      list = list.filter((n) => roleFilter.has((n.role || 'disciple').toLowerCase()));
    }
    return list;
  }, [listForViewRaw, searchQuery, roleFilter]);

  const listForViewSorted = useMemo(() => {
    const list = [...listForViewFiltered];
    if (listSort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (listSort === 'name_desc') list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    else if (listSort === 'role') list.sort((a, b) => (a.role || 'Disciple').localeCompare(b.role || 'Disciple'));
    else if (listSort === 'nb_disciples') list.sort((a, b) => (b.children?.length ?? b.nb_disciples ?? 0) - (a.children?.length ?? a.nb_disciples ?? 0));
    return list;
  }, [listForViewFiltered, listSort]);

  const listForViewPaginated = useMemo(() => {
    const start = (listPage - 1) * LIST_PAGE_SIZE;
    return listForViewSorted.slice(start, start + LIST_PAGE_SIZE);
  }, [listForViewSorted, listPage]);

  const listTotalPages = Math.ceil(listForViewSorted.length / LIST_PAGE_SIZE) || 1;

  // Suggestions de recherche (autocomplétion) : max 8 résultats
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || !listForViewRaw.length) return [];
    const q = searchQuery.trim().toLowerCase();
    return listForViewRaw
      .filter((n) => nodeMatchesSearch(n, q))
      .slice(0, 8);
  }, [listForViewRaw, searchQuery]);

  // Organigramme : selon le filtre, afficher la chaîne ascendants, le sous-arbre descendants, ou l'arbre complet ; appliquer recherche et rôle
  const treeToDisplay = useMemo(() => {
    let tree = treeData;
    if (viewFilter === 'ascendants' && selectedNode && byId[selectedNode.id])
      tree = buildAncestorsChainTree(selectedNode, byId);
    else if (viewFilter === 'descendants' && selectedNode)
      tree = subtreeAsRoot(selectedNode);
    else if (displayedTreeRoot)
      tree = subtreeAsRoot(displayedTreeRoot);
    if (tree && searchQuery.trim()) {
      tree = filterTreeBySearch(tree, searchQuery.trim().toLowerCase());
    }
    if (tree && roleFilter.size > 0) {
      tree = filterTreeByRole(tree, roleFilter);
    }
    return tree;
  }, [viewFilter, selectedNode, byId, displayedTreeRoot, treeData, searchQuery, roleFilter]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Récupérer le nombre de disciples aligné avec FamillesDisciples (get_nombre_profils_par_familles)
  useEffect(() => {
    if (!selectedFamilleId) {
      setNombreDisciplesFamille(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: rpcCounts, error } = await supabase.rpc('get_nombre_profils_par_familles', {
        p_famille_ids: [selectedFamilleId],
      });
      if (cancelled) return;
      if (!error && Array.isArray(rpcCounts) && rpcCounts.length > 0) {
        const row = rpcCounts[0];
        const nb = Number(row.nb_profils ?? row.nbProfils) ?? 0;
        setNombreDisciplesFamille(nb);
      } else {
        setNombreDisciplesFamille(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedFamilleId]);

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

        // --- Arbre de la famille sélectionnée : construit depuis profils (famille_id) pour cohérence avec FamillesDisciples ---
        const family = familles.find((f) => f.id === selectedFamilleId);
        if (!family) {
          setLoading(false);
          return;
        }

        const superviseurId = family.superviseur_id;
        if (!superviseurId) {
          setLoading(false);
          return;
        }

        // Membres de la famille (même source que get_nombre_profils_par_familles)
        const { data: membresData } = await supabase
          .from('profils')
          .select('id, first_name, last_name, avatar_url, role, mentor_id')
          .eq('famille_id', family.id);
        const dataList = membresData || [];

        const familleNom = (family.nom || '').trim();
        const buildHierarchy = (parentId) =>
          dataList
            .filter((d) => d.mentor_id === parentId)
            .map((d) => ({
              id: d.id,
              name: [d.first_name, d.last_name].filter(Boolean).join(' ').trim() || 'Sans nom',
              first_name: d.first_name,
              last_name: d.last_name,
              famille_nom: familleNom,
              avatar_url: d.avatar_url,
              role: d.role || 'Disciple',
              parent_id: parentId,
              children: buildHierarchy(d.id),
            }));

        // Superviseur de la famille
        const { data: superviseurData } = await supabase
          .from('profils')
          .select('id, first_name, last_name, avatar_url, role')
          .eq('id', superviseurId)
          .single();

        if (family.pasteur_id) {
          // Arbre avec Pasteur en racine → Superviseur(s) de cette famille → Mentors → Disciples
          const { data: pasteurData } = await supabase
            .from('profils')
            .select('id, first_name, last_name, avatar_url, role')
            .eq('id', family.pasteur_id)
            .single();
          // Pasteur a pour disciples directs le superviseur de cette famille
          const superviseurNode = {
            id: superviseurId,
            name: [superviseurData?.first_name, superviseurData?.last_name].filter(Boolean).join(' ').trim() || 'Superviseur',
            first_name: superviseurData?.first_name,
            last_name: superviseurData?.last_name,
            famille_nom: familleNom,
            avatar_url: superviseurData?.avatar_url,
            role: superviseurData?.role || 'Superviseur',
            parent_id: family.pasteur_id,
            children: buildHierarchy(superviseurId),
          };
          const root = {
            id: family.pasteur_id,
            name: [pasteurData?.first_name, pasteurData?.last_name].filter(Boolean).join(' ').trim() || 'Pasteur',
            first_name: pasteurData?.first_name,
            last_name: pasteurData?.last_name,
            famille_nom: familleNom,
            avatar_url: pasteurData?.avatar_url,
            role: pasteurData?.role || 'Pasteur',
            parent_id: null,
            children: [superviseurNode],
          };
          setTreeData(root);
        } else {
          // Famille sans pasteur_id : superviseur en racine
          const root = {
            id: superviseurId,
            name: [superviseurData?.first_name, superviseurData?.last_name].filter(Boolean).join(' ').trim() || 'Superviseur',
            first_name: superviseurData?.first_name,
            last_name: superviseurData?.last_name,
            famille_nom: familleNom,
            avatar_url: superviseurData?.avatar_url,
            role: superviseurData?.role || 'Superviseur',
            parent_id: null,
            children: buildHierarchy(superviseurId),
          };
          setTreeData(root);
        }
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

      <div className="w-full h-full flex flex-col p-6 space-y-4">
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
              {selectedFamilleId && nombreDisciplesFamille !== null && !urlPasteurId && (
                <span className="ml-2 font-semibold text-primary">
                  — {nombreDisciplesFamille} disciple{nombreDisciplesFamille !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Bouton Export PDF tout en haut à droite */}
            {treeData && (
              <Button
                variant="outline"
                size="sm"
                disabled={exporting}
                className="bg-slate-100 text-slate-900 border-slate-200 hover:bg-primary hover:text-primary-foreground hover:border-primary"
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
              >
                <FileDown className="h-4 w-4 mr-1" />
                {exporting ? 'Export...' : 'Export PDF'}
              </Button>
            )}
            {treeData && (
              <Button
                variant="outline"
                size="sm"
                disabled={exportingPng}
                onClick={async () => {
                  setExportingPng(true);
                  try {
                    const el = document.getElementById('arbre-genealogique-export');
                    if (!el) throw new Error('Élément non trouvé');
                    const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                    canvas.toBlob((blob) => {
                      if (blob) saveAs(blob, `arbre_genealogique_${format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: fr })}.png`);
                    });
                    toast({ title: 'Export PNG réussi', description: "L'arbre a été exporté en image PNG." });
                  } catch (error) {
                    console.error('Export PNG error:', error);
                    toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'exporter en PNG." });
                  } finally {
                    setExportingPng(false);
                  }
                }}
                className="bg-slate-100 text-slate-900 border-slate-200 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <Image className="h-4 w-4 mr-1" />
                {exportingPng ? 'Export...' : 'Export PNG'}
              </Button>
            )}
            {treeData && (
              <Button
                variant="outline"
                size="sm"
                disabled={exportingSvg}
                onClick={async () => {
                  setExportingSvg(true);
                  try {
                    const el = document.getElementById('arbre-genealogique-export');
                    if (!el) throw new Error('Élément non trouvé');
                    const dataUrl = await toSvg(el, { quality: 1, pixelRatio: 2 });
                    const link = document.createElement('a');
                    link.href = dataUrl;
                    link.download = `arbre_genealogique_${format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: fr })}.svg`;
                    link.click();
                    toast({ title: 'Export SVG réussi', description: "L'arbre a été exporté en SVG." });
                  } catch (error) {
                    console.error('Export SVG error:', error);
                    toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'exporter en SVG." });
                  } finally {
                    setExportingSvg(false);
                  }
                }}
                className="bg-slate-100 text-slate-900 border-slate-200 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <GitBranch className="h-4 w-4 mr-1" />
                {exportingSvg ? 'Export...' : 'Export SVG'}
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
            {/* Filtrer par rôle */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3 mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filtrer :</span>
              {LEGEND_ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => toggleRoleFilter(r.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${roleFilter.has(r.key) ? `${r.bg} ${r.border} border-2 ring-2 ring-offset-1 ring-slate-400` : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  aria-pressed={roleFilter.has(r.key)}
                  aria-label={`Filtrer par ${r.label}`}
                >
                  <span className={`w-2 h-2 rounded-full ${r.bg} border ${r.border}`} />
                  {r.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRoleFilter(new Set())}
                className={`text-xs underline transition-opacity ${roleFilter.size > 0 ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Réinitialiser les filtres
              </button>
            </div>

            {/* Barre de recherche avec suggestions / autocomplétion */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Rechercher par prénom, nom ou famille..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  aria-autocomplete="list"
                  aria-expanded={searchSuggestions.length > 0 && (searchFocused || !!searchQuery)}
                  aria-controls="search-suggestions-list"
                  role="combobox"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchFocused(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
                    aria-label="Effacer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {searchSuggestions.length > 0 && (searchFocused || searchQuery) && (
                  <ul
                    id="search-suggestions-list"
                    className="absolute top-full left-0 right-0 mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                    role="listbox"
                  >
                    {searchSuggestions.map((node) => (
                      <li
                        key={node.id}
                        role="option"
                        tabIndex={0}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedNode(byId[node.id] ?? node);
                          setDisplayedTreeRoot(node);
                          setSearchQuery(node.name);
                          setSearchFocused(false);
                          setViewMode('tree');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedNode(byId[node.id] ?? node);
                            setDisplayedTreeRoot(node);
                            setSearchQuery(node.name);
                            setSearchFocused(false);
                            setViewMode('tree');
                          }
                        }}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${getRoleStyles(node.role).bg} border ${getRoleStyles(node.role).border}`} />
                        <span className="font-medium text-slate-900 truncate">{node.name}</span>
                        <span className="text-xs text-slate-500 shrink-0">{node.role || 'Disciple'}</span>
                      </li>
                    ))}
                  </ul>
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
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                {isMobile && viewMode === 'tree' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMobileOrganigrammeMode(!mobileOrganigrammeMode)}
                    className={`shrink-0 ${mobileOrganigrammeMode ? 'bg-primary text-white border-primary' : ''}`}
                    title={mobileOrganigrammeMode ? 'Passer en vue liste (drill-down)' : 'Passer en organigramme complet avec zoom tactile'}
                  >
                    <GitBranch className="h-4 w-4 mr-1" />
                    {mobileOrganigrammeMode ? 'Liste' : 'Organigramme complet'}
                  </Button>
                )}
                {viewMode === 'tree' && user?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCenterOnMe}
                    className="shrink-0 bg-slate-100 text-slate-900 border-slate-200 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    title="Centrer l'arbre sur votre position"
                  >
                    <Crosshair className="h-4 w-4 mr-1" />
                    Superviseur
                  </Button>
                )}
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
              /* Vue arbre (organigramme) : clic sur un nom = sélection + panneau latéral ; expand/collapse ; Centrer sur moi */
              <div className="flex-1 flex gap-4 min-h-[500px] overflow-hidden">
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex-1 min-h-[400px] rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    {(isMobile && !mobileOrganigrammeMode) ? (
                      <MobileTreeView data={treeToDisplay} onNodeClick={(node) => setSelectedNode(byId[node.id] ?? node)} selectedNodeId={selectedNode?.id} />
                    ) : (
                      <DesktopTreeView
                        data={treeToDisplay}
                        onNodeClick={(node) => setSelectedNode(byId[node.id] ?? node)}
                        selectedNodeId={selectedNode?.id}
                        collapsedIds={collapsedNodeIds}
                        onToggleCollapse={toggleCollapse}
                      />
                    )}
                  </div>
                </div>
                {/* Panneau latéral fiche détaillée (desktop et mobile) */}
                <motion.div
                  initial={false}
                  animate={{ width: selectedNode ? (isMobile ? '100%' : 320) : 0, opacity: selectedNode ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={`shrink-0 overflow-hidden border-l border-slate-200 bg-white rounded-r-xl ${selectedNode ? 'border' : 'border-0'}`}
                >
                  {selectedNode && (
                    <div className="w-[320px] flex flex-col h-full max-h-[calc(100vh-280px)]">
                      <div className="flex items-center justify-between p-3 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900">Fiche détaillée</h3>
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
                        <div className="flex flex-col items-center text-center mb-4">
                          <Avatar className="h-16 w-16 mb-2 border-2 border-slate-100">
                            <AvatarImage src={selectedNode.avatar_url} />
                            <AvatarFallback className={`${getAvatarColor(selectedNode.name)} text-white text-lg`}>
                              {getInitials(selectedNode.name)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-slate-900">{selectedNode.name}</p>
                          <Badge className={`mt-1 ${getRoleStyles(selectedNode.role).badge} text-white`}>
                            {selectedNode.role || 'Disciple'}
                          </Badge>
                          {(selectedNode.children?.length > 0 || (selectedNode.nb_disciples != null && selectedNode.nb_disciples > 0)) && (
                            <p className="text-xs text-slate-500 mt-1">
                              {(selectedNode.children?.length ?? selectedNode.nb_disciples ?? 0)} disciple{(selectedNode.children?.length ?? selectedNode.nb_disciples ?? 0) !== 1 ? 's' : ''} directs
                            </p>
                          )}
                        </div>
                        <div className="border-t border-slate-100 pt-4 space-y-2">
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
                          <Button
                            variant="outline"
                            className="w-full bg-slate-100 text-slate-900 border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                            onClick={() => navigate(`/disciples/${selectedNode.id}`)}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Voir le profil
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            ) : (
              /* Vue liste + panneau Détails (tri, pagination) */
              <div className="flex-1 flex gap-4 min-h-[500px] overflow-hidden">
                <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {/* Tri + pagination */}
                  <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-medium text-slate-500">Trier par :</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { key: 'name', label: 'Nom A-Z' },
                        { key: 'name_desc', label: 'Nom Z-A' },
                        { key: 'role', label: 'Rôle' },
                        { key: 'nb_disciples', label: 'Nb disciples' },
                      ].map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => { setListSort(o.key); setListPage(1); }}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${listSort === o.key ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setListPage(1)} disabled={listPage === 1} aria-label="Première page">
                        <ChevronsLeft size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setListPage((p) => Math.max(1, p - 1))} disabled={listPage === 1} aria-label="Page précédente">
                        <ChevronLeft size={16} />
                      </Button>
                      <span className="text-sm text-slate-600 px-2">
                        Page {listPage} / {listTotalPages} ({listForViewSorted.length} au total)
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setListPage((p) => Math.min(listTotalPages, p + 1))} disabled={listPage >= listTotalPages} aria-label="Page suivante">
                        <ChevronRight size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setListPage(listTotalPages)} disabled={listPage >= listTotalPages} aria-label="Dernière page">
                        <ChevronsRight size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {viewFilter === 'ascendants' && !selectedNode && (
                      <p className="text-sm text-slate-500 p-3 bg-amber-50 border border-amber-100 rounded-lg mb-2">
                        Sélectionnez une personne dans la liste pour voir ses ascendants.
                      </p>
                    )}
                    {listForViewPaginated.map((node, index) => {
                      const globalIndex = (listPage - 1) * LIST_PAGE_SIZE + index;
                      return (
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
                          {globalIndex + 1}
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
                              <span className="text-xs text-slate-500" title="Disciples directs (niveau 1 uniquement)">
                                {(node.children?.length ?? node.nb_disciples ?? 0)} disciple{(node.children?.length ?? node.nb_disciples ?? 0) !== 1 ? 's' : ''} direct{(node.children?.length ?? node.nb_disciples ?? 0) !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                      </motion.button>
                    );
                    })}
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
                        <div className="border-t border-slate-100 pt-4 space-y-2">
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
                          <Button
                            variant="outline"
                            className="w-full bg-slate-100 text-slate-900 border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                            onClick={() => navigate(`/disciples/${selectedNode.id}`)}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Voir le profil
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