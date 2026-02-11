/**
 * ArbreGenealogiqueEmbed – Arbre généalogique embarqué dans les dashboards
 * (Superviseur = famille connectée ; Pasteur = toutes les familles DR mode).
 */
import React from 'react';
import { motion } from 'framer-motion';
import { GitFork, Users, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { useGenealogicalTreeData } from '@/hooks/useGenealogicalTreeData';

/** Profondeur max pour éviter récursion infinie ou stack overflow (données circulaires / arbre très profond) */
const TREE_EMBED_MAX_DEPTH = 12;

/** Styles par rôle (aligné avec la page Arbre généalogique) */
const getRoleStyles = (role) => {
  const r = (role || 'disciple').toLowerCase();
  if (r === 'pasteur') return { border: 'border-violet-500', bg: 'bg-violet-50', badge: 'bg-violet-600' };
  if (r === 'superviseur') return { border: 'border-blue-500', bg: 'bg-blue-50', badge: 'bg-blue-600' };
  if (r === 'mentor') return { border: 'border-emerald-500', bg: 'bg-emerald-50', badge: 'bg-emerald-600' };
  return { border: 'border-slate-300', bg: 'bg-slate-50', badge: 'bg-slate-600' };
};

const TreeNodeEmbed = ({ node, level = 0 }) => {
  if (!node || typeof node !== 'object') return null;
  if (level >= TREE_EMBED_MAX_DEPTH) return null;

  const children = Array.isArray(node.children) ? node.children : [];
  const nbDisciples = node.children?.length ?? node.nb_disciples ?? 0;
  const hasChildren = children.length > 0 || nbDisciples > 0;
  const avatarColor = getAvatarColor(node.name || '');
  const nodeId = node.id ?? `node-${level}-${(node.name || '').slice(0, 8)}`;
  const roleStyles = getRoleStyles(node.role);

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`
          flex flex-col items-center p-2 rounded-lg border bg-white shadow-sm min-w-[120px] max-w-[160px]
          ${level === 0 ? 'border-primary/50 bg-primary/5' : `${roleStyles.border} ${roleStyles.bg}`}
        `}
      >
        <Avatar className={`h-10 w-10 mb-1 border-2 ${level === 0 ? 'border-primary' : 'border-white'}`}>
          <AvatarImage src={node.avatar_url} />
          <AvatarFallback className={`${avatarColor} text-white text-xs`}>{getInitials(node.name || '')}</AvatarFallback>
        </Avatar>
        <h4 className="font-semibold text-xs text-slate-900 truncate w-full px-1">{node.name || '—'}</h4>
        <p className="text-[10px] text-slate-500 truncate">{node.role || 'Disciple'}</p>
        {hasChildren && (
          <Badge
            variant="secondary"
            className={`mt-1 text-[10px] h-4 px-1 text-white ${roleStyles.badge}`}
            title={`${nbDisciples} disciple${nbDisciples !== 1 ? 's' : ''} direct${nbDisciples !== 1 ? 's' : ''} (niveau 1)`}
          >
            {nbDisciples} disc. direct{nbDisciples !== 1 ? 's' : ''}
          </Badge>
        )}
      </motion.div>
      {hasChildren && (
        <div className="flex flex-col items-center mt-2">
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex gap-4 pt-2">
            {children.map((child, index) => (
              <div key={`${nodeId}-${level}-${index}-${child?.id ?? index}`} className="flex flex-col items-center">
                <div className="w-px h-3 bg-slate-300 self-center" />
                <TreeNodeEmbed node={child} level={level + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export function ArbreGenealogiqueEmbed({ mode, famille, pasteurId, title, description, compactHeight = 420 }) {
  const { treeData, loading, error } = useGenealogicalTreeData({
    mode,
    famille: mode === 'family' ? famille : undefined,
    pasteurId: mode === 'pasteur' ? pasteurId : undefined,
  });

  const linkToFullPage =
    mode === 'family' && famille?.id
      ? `/arbre-genealogique?family=${famille.id}`
      : mode === 'pasteur' && pasteurId
        ? `/arbre-genealogique?pasteur=${pasteurId}`
        : '/arbre-genealogique';

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GitFork className="h-5 w-5 text-primary" />
              {title || (mode === 'family' ? `Arbre - ${famille?.nom || 'Famille'}` : 'Arbre généalogique - toutes les familles')}
            </CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to={linkToFullPage}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir en plein écran
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ minHeight: compactHeight }}>
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm text-gray-500">Chargement de l'arbre...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-red-600" style={{ minHeight: compactHeight }}>
            <p className="text-sm">Erreur lors du chargement.</p>
          </div>
        ) : !treeData ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500" style={{ minHeight: compactHeight }}>
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Aucune donnée pour afficher l'arbre.</p>
          </div>
        ) : treeData && typeof treeData === 'object' ? (
          <div
            className="overflow-auto rounded-lg border border-slate-200 bg-slate-50/50 p-4 flex justify-center"
            style={{ maxHeight: compactHeight }}
          >
            <TreeNodeEmbed node={treeData} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500" style={{ minHeight: compactHeight }}>
            <p className="text-sm">Données d&apos;arbre invalides.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
