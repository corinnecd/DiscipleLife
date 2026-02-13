/**
 * Hook useGenealogicalTreeData – Récupère les données de l'arbre généalogique
 * pour une famille (superviseur), pour un mentor (lui + ses disciples), ou pour un pasteur (DR mode).
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
 * @param {'family'|'pasteur'|'mentor'} options.mode - 'family' = arbre complet d'une famille (superviseur), 'pasteur' = arbre de toutes les familles du pasteur, 'mentor' = arbre du mentor uniquement (lui + ses disciples)
 * @param {Object} [options.famille] - Pour mode 'family' : { id, nom, pasteur_id, superviseur_id }
 * @param {string} [options.pasteurId] - Pour mode 'pasteur' : UUID du pasteur
 * @param {string} [options.mentorId] - Pour mode 'mentor' : UUID du mentor (utilisateur connecté)
 * @returns {{ treeData: object|null, loading: boolean, error: Error|null }}
 */
export function useGenealogicalTreeData({ mode, famille, pasteurId, mentorId }) {
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
        // Mode mentor : arbre centré sur le mentor (lui + ses disciples uniquement) — pas l'arbre du superviseur
        if (mode === 'mentor' && mentorId) {
          const { data: mentorData } = await supabase
            .from('profils')
            .select('id, first_name, last_name, prenom, nom, avatar_url, role, famille_id')
            .eq('id', mentorId)
            .maybeSingle();
          if (!mentorData) {
            if (!cancelled) setTreeData(null);
            return;
          }
          const familleId = mentorData.famille_id;
          const { data: membresData } = await supabase
            .from('profils')
            .select('id, first_name, last_name, prenom, nom, avatar_url, mentor_id, role')
            .eq('famille_id', familleId);
          const dataList = membresData || [];
          const toName = (d) => {
            const n = d.first_name || d.prenom;
            const ln = d.last_name || d.nom;
            return [n, ln].filter(Boolean).join(' ').trim() || 'Sans nom';
          };
          const buildHierarchy = (parentId) =>
            dataList
              .filter((d) => d.mentor_id === parentId)
              .map((d) => ({
                id: d.id,
                name: toName(d),
                avatar_url: d.avatar_url,
                role: d.role || 'Disciple',
                children: buildHierarchy(d.id),
              }));
          const root = {
            id: mentorData.id,
            name: toName(mentorData),
            avatar_url: mentorData.avatar_url,
            role: mentorData.role || 'Mentor',
            children: buildHierarchy(mentorId),
          };
          if (!cancelled) setTreeData(root);
          return;
        }

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
            .select('id, first_name, last_name, avatar_url, mentor_id, role')
            .eq('famille_id', famille.id);
          const dataList = membresData || [];
          const buildHierarchy = (parentId) =>
            dataList
              .filter((d) => d.mentor_id === parentId)
              .map((d) => ({
                id: d.id,
                name: [d.first_name, d.last_name].filter(Boolean).join(' ').trim() || 'Sans nom',
                avatar_url: d.avatar_url,
                role: d.role || 'Disciple',
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
  }, [mode, famille?.id, famille?.nom, famille?.pasteur_id, famille?.superviseur_id, pasteurId, mentorId]);

  return { treeData, loading, error };
}
