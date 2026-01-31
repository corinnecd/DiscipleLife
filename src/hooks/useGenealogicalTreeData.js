/**
 * Hook useGenealogicalTreeData – Récupère les données de l'arbre généalogique
 * pour une famille (superviseur) ou pour toutes les familles d'un pasteur (DR mode).
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

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

/**
 * @param {Object} options
 * @param {'family'|'pasteur'} options.mode - 'family' = arbre d'une famille, 'pasteur' = arbre de toutes les familles du pasteur (DR mode)
 * @param {Object} [options.famille] - Pour mode 'family' : { id, nom, pasteur_id, superviseur_id }
 * @param {string} [options.pasteurId] - Pour mode 'pasteur' : UUID du pasteur
 * @returns {{ treeData: object|null, loading: boolean, error: Error|null }}
 */
export function useGenealogicalTreeData({ mode, famille, pasteurId }) {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTree = async () => {
      setLoading(true);
      setError(null);
      setTreeData(null);

      try {
        if (mode === 'pasteur' && pasteurId) {
          const { data: arbreRows, error: rpcError } = await supabase.rpc('get_arbre_4_niveaux', {
            p_pasteur_id: pasteurId,
          });
          if (rpcError) throw rpcError;
          const root = buildTreeFromArbreRows(arbreRows || []);
          if (!cancelled) setTreeData(root);
          return;
        }

        if (mode === 'family' && famille?.id) {
          const familyNom = (famille.nom || '').trim();

          if (famille.pasteur_id) {
            const { data: arbreRows, error: rpcError } = await supabase.rpc('get_arbre_4_niveaux', {
              p_pasteur_id: famille.pasteur_id,
            });
            if (rpcError) throw rpcError;
            const filtered = (arbreRows || []).filter(
              (r) =>
                r.niveau === 1 ||
                (r.famille_nom && String(r.famille_nom).trim() === familyNom)
            );
            const root = buildTreeFromArbreRows(filtered);
            if (!cancelled) setTreeData(root);
            return;
          }

          const superviseurId = famille.superviseur_id;
          if (!superviseurId) {
            if (!cancelled) setTreeData(null);
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
            .eq('famille_id', famille.id);
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
          if (!cancelled) setTreeData(root);
          return;
        }

        if (!cancelled) setTreeData(null);
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setTreeData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTree();
    return () => { cancelled = true; };
  }, [mode, famille?.id, famille?.nom, famille?.pasteur_id, famille?.superviseur_id, pasteurId]);

  return { treeData, loading, error };
}
