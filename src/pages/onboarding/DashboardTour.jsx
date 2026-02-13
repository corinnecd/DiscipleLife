import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Users, TrendingUp, Bell, Settings, 
  ArrowRight, ArrowLeft, Check, Sparkles 
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { useOnboarding } from '../../hooks/useOnboarding';

/**
 * Page de tour du dashboard (Étape 4 de l'onboarding)
 * Présentation interactive des fonctionnalités du dashboard
 */
const DashboardTour = () => {
  const navigate = useNavigate();
  const { selectedRole, completeOnboarding, getDuration } = useOnboarding();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Définir les slides en fonction du rôle
  const getSlides = () => {
    const commonSlides = [
      {
        icon: Home,
        title: 'Bienvenue sur votre Dashboard',
        description: 'Votre espace personnel pour suivre votre parcours spirituel et gérer vos activités.',
        color: 'blue'
      },
      {
        icon: TrendingUp,
        title: 'Suivez votre progression',
        description: 'Visualisez votre croissance spirituelle avec des graphiques et des statistiques détaillées.',
        color: 'green'
      },
      {
        icon: Bell,
        title: 'Restez informé',
        description: 'Recevez des notifications pour les rappels, les événements et les suivis importants.',
        color: 'yellow'
      }
    ];

    const roleSpecificSlides = {
      disciple: [
        {
          icon: Users,
          title: 'Connectez-vous avec votre mentor',
          description: 'Communiquez avec votre mentor et partagez votre progression spirituelle.',
          color: 'purple'
        }
      ],
      mentor: [
        {
          icon: Users,
          title: 'Accompagnez vos disciples',
          description: 'Suivez la progression de vos disciples et apportez-leur le soutien nécessaire.',
          color: 'purple'
        }
      ],
      pasteur: [
        {
          icon: Users,
          title: 'Gérez votre famille spirituelle',
          description: 'Supervisez l\'ensemble de votre famille et identifiez les besoins prioritaires.',
          color: 'purple'
        }
      ],
      superviseur: [
        {
          icon: Users,
          title: 'Vue d\'ensemble complète',
          description: 'Accédez aux statistiques globales et gérez plusieurs familles spirituelles.',
          color: 'purple'
        }
      ]
    };

    const finalSlide = {
      icon: Sparkles,
      title: 'Vous êtes prêt !',
      description: 'Votre compte est configuré. Commencez votre parcours dès maintenant.',
      color: 'gradient'
    };

    return [
      ...commonSlides,
      ...(roleSpecificSlides[selectedRole] || []),
      finalSlide
    ];
  };

  const slides = getSlides();
  const isLastSlide = currentSlide === slides.length - 1;

  /**
   * Passer au slide suivant
   */
  const nextSlide = () => {
    if (isLastSlide) {
      handleComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  /**
   * Revenir au slide précédent
   */
  const prevSlide = () => {
    setCurrentSlide(prev => Math.max(0, prev - 1));
  };

  /**
   * Terminer le tour et rediriger vers le dashboard
   */
  const handleComplete = () => {
    completeOnboarding();

    // Rediriger vers le dashboard approprié
    const dashboardRoutes = {
      disciple: '/dashboard/disciple',
      mentor: '/dashboard/mentor',
      pasteur: '/dashboard/pasteur',
      superviseur: '/dashboard/superviseur'
    };

    const targetRoute = dashboardRoutes[selectedRole] || '/dashboard';
    navigate(targetRoute);
  };

  /**
   * Passer le tour
   */
  const handleSkip = () => {
    handleComplete();
  };

  const currentSlideData = slides[currentSlide];
  const Icon = currentSlideData.icon;

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
    gradient: 'from-blue-500 via-purple-500 to-pink-500'
  };

  return (
    <OnboardingLayout
      currentStep={4}
      showStepIndicator={true}
      showProgressBar={false}
      className="flex items-center justify-center"
    >
      <div className="w-full max-w-3xl">
        <Card className="p-12 bg-white/80 backdrop-blur-sm shadow-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Icône */}
              <motion.div
                className="flex justify-center mb-8"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5, delay: 0.1 }}
              >
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${colorClasses[currentSlideData.color]} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              {/* Titre */}
              <motion.h2
                className="text-3xl font-bold text-gray-900 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {currentSlideData.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                className="text-lg text-gray-600 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {currentSlideData.description}
              </motion.p>

              {/* Indicateurs de slides */}
              <div className="flex justify-center gap-2 mb-8">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentSlide
                        ? 'w-8 bg-blue-600'
                        : 'w-2 bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Aller au slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Boutons de navigation */}
              <div className="flex gap-3 justify-between">
                {/* Bouton Précédent */}
                <Button
                  onClick={prevSlide}
                  variant="outline"
                  disabled={currentSlide === 0}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Précédent
                </Button>

                {/* Bouton Passer */}
                {!isLastSlide && (
                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    className="flex-1"
                  >
                    Passer
                  </Button>
                )}

                {/* Bouton Suivant / Terminer */}
                <Button
                  onClick={nextSlide}
                  className={`flex-1 ${
                    isLastSlide
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      : ''
                  }`}
                >
                  {isLastSlide ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Commencer
                    </>
                  ) : (
                    <>
                      Suivant
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </Card>

        {/* Compteur de slides */}
        <div className="text-center mt-4 text-sm text-gray-600">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>
    </OnboardingLayout>
  );
};

export default DashboardTour;
