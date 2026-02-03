import React from 'react';
import { Target, Trophy, Star, Zap, Sparkles, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
/**
 * Bandeau de bienvenue du tableau de bord superviseur (famille + exports).
 */
export function WelcomeBanner({
  famille,
  superviseurNom,
  onExportPDF,
  onExportExcel,
  exporting,
}) {
  if (!famille) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 via-purple-950 to-purple-900 border border-gray-200 shadow-lg p-8 md:p-12">
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-6 mb-4">
          <div className="flex-1 max-w-3xl">
            <h1
              className="text-2xl md:text-4xl font-bold text-white mb-4 min-h-[2.5rem] md:min-h-[3rem]"
            >
              BIENVENUE dans la Famille de {superviseurNom.titre === 'Pasteur' ? 'Pasteur ' : ''}{superviseurNom.first_name} {superviseurNom.last_name}
            </h1>
            <p className="text-base md:text-xl text-white/90 mb-4 leading-relaxed">
              Ici, vous êtes chez vous.
            </p>
            <p className="text-sm md:text-lg text-white/90 leading-relaxed">
              Un espace de partage, de soutien et de croissance spirituelle, où chacun est accompagné dans sa marche avec Dieu afin de devenir de véritables disciples de Christ.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onExportPDF}
              disabled={exporting}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exporting ? 'Export...' : 'PDF'}
            </Button>
            <Button
              onClick={onExportExcel}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
            >
              <FileText className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-6 relative z-10 min-h-[2.5rem] md:min-h-[3rem]">
        <div className="text-3xl md:text-4xl font-bold text-amber-400">
          « {famille.nom} »
        </div>
      </div>
      <div className="absolute bottom-8 right-8 flex-shrink-0">
        <div
          className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30"
        >
          {famille.nom.toLowerCase().includes('déterminé') || famille.nom.toLowerCase().includes('determine') ? (
            <Target className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
          ) : famille.nom.toLowerCase().includes('victoire') || famille.nom.toLowerCase().includes('victory') ? (
            <Trophy className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
          ) : famille.nom.toLowerCase().includes('étoile') || famille.nom.toLowerCase().includes('star') ? (
            <Star className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
          ) : famille.nom.toLowerCase().includes('feu') || famille.nom.toLowerCase().includes('fire') ? (
            <Zap className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
          ) : (
            <Sparkles className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
          )}
        </div>
      </div>
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
    </div>
  );
}
