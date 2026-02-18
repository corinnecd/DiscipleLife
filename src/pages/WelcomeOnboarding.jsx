import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserCheck, 
  Crown, 
  Church,
  ArrowRight,
  Target,
  TrendingUp,
  Heart,
  BookOpen,
  Award,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/hooks/useOnboarding';

const WelcomeOnboarding = () => {
  const navigate = useNavigate();
  const { setRole } = useOnboarding();
  const [selectedRole, setSelectedRole] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Animation du compteur de progression
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgressPercentage(35); // 35% de la vision atteinte (à adapter selon vos vraies données)
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const roles = [
    {
      id: 'disciple',
      title: 'Disciple',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20 hover:border-blue-500',
      description: 'Je veux grandir spirituellement et être formé',
      features: [
        'Parcours de transformation personnalisé',
        'Accompagnement par un mentor',
        'Suivi de ma croissance spirituelle'
      ]
    },
    {
      id: 'mentor',
      title: 'Mentor',
      icon: UserCheck,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20 hover:border-green-500',
      description: 'J\'accompagne des disciples dans leur croissance',
      features: [
        'Outils d\'accompagnement',
        'Suivi de mes disciples',
        'Ressources de formation'
      ]
    },
    {
      id: 'superviseur',
      title: 'Superviseur',
      icon: Crown,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20 hover:border-purple-500',
      description: 'Je supervise plusieurs mentors et leurs équipes',
      features: [
        'Vue d\'ensemble des équipes',
        'Statistiques et rapports',
        'Gestion des mentors'
      ]
    },
    {
      id: 'pasteur',
      title: 'Pasteur',
      icon: Church,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20 hover:border-orange-500',
      description: 'Je dirige et coordonne toute la communauté',
      features: [
        'Dashboard global',
        'Gestion des familles',
        'Vision d\'ensemble complète'
      ]
    }
  ];

  const visionStats = [
    {
      value: '100,000',
      label: 'Disciples Formés',
      icon: Users,
      color: 'text-blue-400',
      current: 350
    },
    {
      value: '500',
      label: 'Mentors Équipés',
      icon: UserCheck,
      color: 'text-green-400',
      current: 175
    },
    {
      value: '100,000,000',
      label: 'Vies Touchées',
      icon: Heart,
      color: 'text-red-400',
      current: 3500
    },
    {
      value: '1,000',
      label: 'Familles Établies',
      icon: Church,
      color: 'text-purple-400',
      current: 35
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setRole(roleId); // Hook useOnboarding - enregistre le rôle pour le formulaire
    localStorage.setItem('selected_role', roleId);
    // Rediriger OBLIGATOIREMENT vers le formulaire simplifié d'inscription
    navigate('/onboarding/signup');
  };

  return (
    <div className="min-h-screen bg-[#0f0518] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-6">
              <span className="text-3xl font-bold">DL</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Disciple 70
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              Votre compagnon de croissance spirituelle
            </p>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
              Rejoignez une communauté de disciples engagés dans la transformation spirituelle 
              et l'impact du Royaume de Dieu
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-8"
                onClick={() => document.getElementById('role-selection').scrollIntoView({ behavior: 'smooth' })}
              >
                Commencer Maintenant
                <ArrowRight className="ml-2" size={20} />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 hover:bg-white/10 text-lg px-8"
                onClick={() => document.getElementById('vision-2030').scrollIntoView({ behavior: 'smooth' })}
              >
                Découvrir la Vision 2030
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Vision 2030 Section */}
        <section id="vision-2030" className="container mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Section Header */}
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 text-sm">
                <Target className="mr-2" size={16} />
                Vision 2030
              </Badge>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Familles de Disciples Adoratrices
              </h2>
              
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-4">
                "Transformer chaque disciple en faiseur de disciples,
              </p>
              <p className="text-xl md:text-2xl text-teal-400 font-semibold">
                pour impacter 100 millions de vies d'ici 2030"
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {visionStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-[#1a0b2e] border-white/10 hover:border-teal-500/50 transition-all duration-300 hover:scale-105">
                    <CardContent className="pt-6 text-center">
                      <stat.icon className={cn("mx-auto mb-4", stat.color)} size={40} />
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                        className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent"
                      >
                        {stat.value}
                      </motion.div>
                      <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                      <div className="text-xs text-teal-400">
                        {stat.current} actuellement
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="max-w-4xl mx-auto mb-12">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-400">Progression globale</span>
                <span className="text-lg font-bold text-teal-400">{progressPercentage}%</span>
              </div>
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${progressPercentage}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 rounded-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                Ensemble, nous construisons l'avenir du Royaume
              </p>
            </div>

            {/* Mission Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                <CardHeader>
                  <BookOpen className="text-blue-400 mb-2" size={32} />
                  <CardTitle className="text-white">Notre Mission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm">
                    Former des disciples matures qui, à leur tour, forment d'autres disciples, 
                    créant ainsi un mouvement de multiplication spirituelle.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <CardHeader>
                  <Award className="text-purple-400 mb-2" size={32} />
                  <CardTitle className="text-white">Nos Valeurs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <Sparkles size={16} className="text-teal-400 mt-1 flex-shrink-0" />
                      <span>Excellence dans le discipolat</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles size={16} className="text-teal-400 mt-1 flex-shrink-0" />
                      <span>Amour et authenticité</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles size={16} className="text-teal-400 mt-1 flex-shrink-0" />
                      <span>Multiplication intentionnelle</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
                <CardHeader>
                  <TrendingUp className="text-orange-400 mb-2" size={32} />
                  <CardTitle className="text-white">Notre Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm">
                    Chaque disciple formé devient un agent de transformation, 
                    touchant des familles, des communautés et des nations entières.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
              <Button
                size="lg"
                className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-lg px-8"
                onClick={() => document.getElementById('role-selection').scrollIntoView({ behavior: 'smooth' })}
              >
                Rejoindre la Vision 2030
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Role Selection Section */}
        <section id="role-selection" className="container mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Choisissez Votre Rôle
              </h2>
              <p className="text-xl text-gray-400">
                Sélectionnez le rôle qui correspond à votre appel
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {roles.map((role, index) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      "cursor-pointer transition-all duration-300 h-full",
                      "bg-[#1a0b2e] border-2",
                      role.borderColor,
                      selectedRole === role.id && "ring-2 ring-teal-500 border-teal-500"
                    )}
                    onClick={() => handleRoleSelect(role.id)}
                  >
                    <CardHeader>
                      <div className={cn("w-16 h-16 rounded-xl mb-4 flex items-center justify-center", role.bgColor)}>
                        <role.icon className="text-white" size={32} />
                      </div>
                      <CardTitle className="text-white text-2xl">{role.title}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {role.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {role.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={cn(
                          "w-full mt-6 bg-gradient-to-r",
                          role.color,
                          "hover:opacity-90"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRoleSelect(role.id);
                        }}
                      >
                        Choisir ce rôle
                        <ArrowRight className="ml-2" size={16} />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8">
          <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
            <p>© 2026 Disciple 70 - Familles de Disciples Adoratrices</p>
            <p className="mt-2">Tous droits réservés</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default WelcomeOnboarding;
