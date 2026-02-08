import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Carte listant les superviseurs de la famille (même pasteur) avec nombre de membres par superviseur.
 */
export function SuperviseursFamilleCard({
  superviseursFamille = [],
  nombreMembresParSuperviseur = {},
  onSelectSuperviseur,
}) {
  const [profils, setProfils] = useState({});

  useEffect(() => {
    if (!superviseursFamille?.length) return;
    const ids = superviseursFamille.map((f) => f.superviseur_id).filter(Boolean);
    if (ids.length === 0) return;
    supabase
      .from('profils')
      .select('id, first_name, last_name')
      .in('id', ids)
      .then(({ data }) => {
        const byId = (data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        setProfils(byId);
      });
  }, [superviseursFamille]);

  if (!superviseursFamille?.length) return null;

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          Superviseurs de la famille
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {superviseursFamille.map((f) => {
            const p = profils[f.superviseur_id];
            const nom = p ? `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || f.nom || 'Superviseur' : f.nom || 'Superviseur';
            const count = nombreMembresParSuperviseur[f.superviseur_id] ?? 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectSuperviseur?.(f.superviseur_id)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:border-purple-200 transition-colors"
              >
                <span className="font-medium">{nom}</span>
                <span className="text-gray-500">({count} membre{count !== 1 ? 's' : ''})</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default SuperviseursFamilleCard;
