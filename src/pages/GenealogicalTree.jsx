import React, { useState, useEffect, useRef } from 'react';
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
  Home
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { Helmet } from 'react-helmet';

// --- Recursive Tree Node for Desktop ---
const TreeNode = ({ node, level = 0 }) => {
  const hasChildren = node.children && node.children.length > 0;
  const avatarColor = getAvatarColor(node.name);

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`
          relative z-10 flex flex-col items-center p-3 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer min-w-[140px] max-w-[180px]
          ${level === 0 ? 'border-primary/50 bg-primary/5' : 'border-slate-200'}
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
        
        {hasChildren && (
            <Badge variant="secondary" className="mt-2 text-[10px] h-5 px-1.5 bg-slate-100 text-slate-600">
                {node.children.length} {node.children.length === 1 ? 'disciple' : 'disciples'}
            </Badge>
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
               <div key={child.id} className="flex flex-col items-center relative">
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

                  <TreeNode node={child} level={level + 1} />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Desktop Tree View Component ---
const DesktopTreeView = ({ data }) => {
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

      <div className="absolute inset-0 overflow-auto cursor-grab active:cursor-grabbing p-20 flex justify-center min-w-full">
         <motion.div 
            style={{ scale, transformOrigin: 'top center' }}
            drag
            dragConstraints={containerRef}
            className="flex justify-center"
         >
             {data ? (
                <TreeNode node={data} />
             ) : (
                <div className="text-slate-400">Aucune donnée à afficher</div>
             )}
         </motion.div>
      </div>
    </div>
  );
};


// --- Mobile Tree View Component (Drill-down) ---
const MobileTreeView = ({ data }) => {
  const [history, setHistory] = useState([data]); // Stack of nodes to track path
  const currentNode = history[history.length - 1]; // Current view

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
                        onClick={() => handleNavigateDown(child)}
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
  const { user } = useAuth();
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Tree Data
  useEffect(() => {
    const fetchTree = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // Fetch current user details as root
        const { data: userData, error: userError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, avatar_url, role')
            .eq('id', user.id)
            .single();

        if (userError) throw userError;

        // Fetch all disciples recursively (simulated with flat fetch for now + simple reconstruction)
        // In a real optimized app, this might be a recursive CTE in SQL
        const { data: disciplesData, error: disciplesError } = await supabase
            .from('cercle_personnes')
            .select('id, name, first_name, last_name, avatar_url, parent_disciple_id, user_id, group_id')
            .eq('circle_type', 'Disciple')
            .order('name');
            
        if (disciplesError) throw disciplesError;

        // Build the tree
        const root = {
            id: user.id,
            name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email,
            avatar_url: userData.avatar_url,
            role: userData.role,
            children: []
        };

        // Note: The current DB structure has 'cercle_personnes' which tracks people.
        // We need to link them. Assuming 'parent_disciple_id' points to another entry in 'cercle_personnes'.
        // BUT the root is a 'profils' user. 
        // For this demo, let's assume 'cercle_personnes.user_id' refers to the mentor (the root user).
        
        // Let's attach direct disciples to root
        const directDisciples = disciplesData.filter(d => d.user_id === user.id);
        
        // Recursive function to attach children
        // (This assumes we have a way to track sub-disciples. If 'user_id' is always the root mentor, 
        // the current DB schema might be flat. We will assume a flat structure for now where all are direct children 
        // unless specific parent_disciple_id logic exists. 
        // To make the tree interesting, we will simulate a hierarchy if 'parent_disciple_id' is null or matches root)
        
        const buildHierarchy = (parentId) => {
             return disciplesData
                .filter(d => d.parent_disciple_id === parentId) // Find children of this node
                .map(d => ({
                    id: d.id,
                    name: d.name || `${d.first_name} ${d.last_name}`,
                    avatar_url: d.avatar_url,
                    role: 'Disciple',
                    children: buildHierarchy(d.id) // Recurse
                }));
        };

        // If parent_disciple_id is used for hierarchy within the disciple table:
        // We find top-level disciples (those belonging to user, with no parent within the disciple table, or parent is the user?)
        // Since 'parent_disciple_id' references 'cercle_personnes(id)', it can't reference the 'profils' root directly by foreign key usually 
        // unless UUIDs match. Let's assume top level have NULL parent_disciple_id
        
        const topLevelDisciples = disciplesData
            .filter(d => d.user_id === user.id && !d.parent_disciple_id)
            .map(d => ({
                id: d.id,
                name: d.name || `${d.first_name} ${d.last_name}`,
                avatar_url: d.avatar_url,
                role: 'Disciple',
                children: buildHierarchy(d.id)
            }));

        root.children = topLevelDisciples;
        setTreeData(root);

      } catch (error) {
        console.error('Error building tree:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, [user]);


  return (
    <>
      <Helmet>
        <title>Arbre Généalogique | DiscipleLife</title>
      </Helmet>

      <div className="h-full flex flex-col space-y-4">
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

        {loading ? (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        ) : (
            <div className="flex-1 min-h-[500px]">
                {isMobile ? (
                    <MobileTreeView data={treeData} />
                ) : (
                    <DesktopTreeView data={treeData} />
                )}
            </div>
        )}
      </div>
    </>
  );
};

export default GenealogicalTree;