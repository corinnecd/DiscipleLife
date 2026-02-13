import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSuiviRappels } from '@/hooks/useSuiviRappels';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, Heart, Calendar, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const TYPES_CRISE_ICONS = {
  deuil: '💔',
  divorce: '💔',
  maladie: '🏥',
  chomage: '💼',
  trauma: '⚠️',
  depression: '😔',
  addiction: '🚬',
  conflit_familial: '👨‍👩‍👧',
  crise_spirituelle: '🙏',
  autre: '📝'
};

/**
 * Composant pour afficher les notifications de rappels de suivi post-crise
 * À intégrer dans le header ou la barre de navigation
 */
const SuiviRappelsNotification = ({ className }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { rappels, loading, markAsRead, count } = useSuiviRappels(user?.id);
  const [open, setOpen] = useState(false);

  const handleMarkAsRead = async (suiviId, e) => {
    e.stopPropagation();
    const success = await markAsRead(suiviId);
    if (success) {
      // Toast de confirmation (optionnel)
      console.log('Rappel marqué comme traité');
    }
  };

  const handleNavigateToSuivi = (suiviId) => {
    setOpen(false);
    navigate(`/suivi-post-crise/${suiviId}`);
  };

  const formatTimeRemaining = (prochainRappel) => {
    if (!prochainRappel) return 'À traiter';
    
    const now = new Date();
    const rappel = new Date(prochainRappel);
    const diffMs = rappel - now;
    const diffHeures = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      return 'En retard';
    } else if (diffHeures < 1) {
      return `Dans ${diffMinutes}min`;
    } else if (diffHeures < 24) {
      return `Dans ${diffHeures}h`;
    } else {
      return rappel.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative p-2 hover:bg-white/10 rounded-full",
            className
          )}
        >
          <Bell size={20} className="text-gray-300" />
          {count > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
            >
              {count > 9 ? '9+' : count}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 md:w-96 bg-[#1a0b2e] border-white/10 text-white p-0"
        align="end"
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Heart className="text-teal-400" size={20} />
              Rappels de suivi
            </h3>
            {count > 0 && (
              <Badge className="bg-red-500 text-white">
                {count}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Suivis post-crise nécessitant votre attention
          </p>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              Chargement...
            </div>
          ) : count === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-3" />
              <p className="text-gray-400">
                Aucun rappel en attente
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Tous vos suivis sont à jour
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {rappels.map((suivi) => (
                <motion.div
                  key={suivi.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="border-b border-white/10 last:border-0"
                >
                  <div
                    className="p-4 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => handleNavigateToSuivi(suivi.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {TYPES_CRISE_ICONS[suivi.type_crise] || '📝'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm capitalize">
                            {suivi.type_crise.replace('_', ' ')}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs flex-shrink-0",
                              !suivi.prochain_rappel || new Date(suivi.prochain_rappel) < new Date()
                                ? "border-red-400 text-red-400"
                                : "border-orange-400 text-orange-400"
                            )}
                          >
                            {formatTimeRemaining(suivi.prochain_rappel)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {suivi.description}
                        </p>
                        {suivi.prochaine_action && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-teal-400">
                            <Calendar size={12} />
                            <span className="line-clamp-1">{suivi.prochaine_action}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateToSuivi(suivi.id);
                        }}
                      >
                        Voir détails
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-gray-400 hover:text-white hover:bg-white/10"
                        onClick={(e) => handleMarkAsRead(suivi.id, e)}
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Traité
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-3 border-t border-white/10 bg-black/20">
          <Button
            variant="ghost"
            className="w-full text-sm text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
            onClick={() => {
              setOpen(false);
              navigate('/suivi-post-crise');
            }}
          >
            Voir tous les suivis
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SuiviRappelsNotification;
