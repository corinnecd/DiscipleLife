
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  HelpCircle, 
  Book, 
  Settings, 
  AlertTriangle, 
  MessageSquare, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  ThumbsUp, 
  ThumbsDown,
  PlayCircle,
  LifeBuoy,
  Loader2,
  User,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

// Mock Data for FAQs
const faqData = [
  {
    id: 1,
    category: 'getting-started',
    question: "Comment créer un compte disciple ?",
    answer: "Pour créer un compte disciple, votre mentor doit vous envoyer une invitation par email. Cliquez sur le lien reçu pour configurer votre mot de passe et votre profil initial."
  },
  {
    id: 2,
    category: 'features',
    question: "Comment utiliser le calendrier de prière ?",
    answer: "Le calendrier de prière se trouve dans l'onglet 'Agenda'. Vous pouvez y ajouter des sujets de prière, définir des rappels quotidiens et marquer les prières comme exaucées."
  },
  {
    id: 3,
    category: 'troubleshooting',
    question: "Je ne reçois pas les notifications",
    answer: "Vérifiez d'abord vos paramètres dans la page 'Profil > Notifications'. Assurez-vous également que votre navigateur n'a pas bloqué les notifications pour ce site."
  },
  {
    id: 4,
    category: 'account',
    question: "Comment changer mon mot de passe ?",
    answer: "Allez dans 'Paramètres' (roue dentée) puis dans la section 'Sécurité'. Vous devrez entrer votre mot de passe actuel avant d'en définir un nouveau."
  },
  {
    id: 5,
    category: 'getting-started',
    question: "Qu'est-ce qu'un cercle de disciples ?",
    answer: "Un cercle est un groupe restreint de disciples qui partagent leur progression, leurs requêtes de prière et leurs études bibliques sous la supervision d'un mentor."
  },
  {
    id: 6,
    category: 'features',
    question: "Puis-je télécharger les ebooks ?",
    answer: "Oui, tous les ebooks disponibles dans la section 'Ressources' peuvent être téléchargés au format PDF pour une lecture hors ligne."
  },
  {
    id: 7,
    category: 'troubleshooting',
    question: "L'application est lente",
    answer: "Essayez de vider le cache de votre navigateur. Si le problème persiste, vérifiez votre connexion internet ou contactez le support via le bouton 'Signaler un problème'."
  },
  {
    id: 8,
    category: 'account',
    question: "Comment supprimer mon compte ?",
    answer: "La suppression de compte est une action irréversible. Veuillez contacter un administrateur ou envoyer une demande via le formulaire de contact pour initier cette procédure."
  },
  {
    id: 9,
    category: 'other',
    question: "L'application est-elle gratuite ?",
    answer: "Oui, DiscipleLife est entièrement gratuit pour les disciples et les mentors. Notre mission est de faciliter la formation de disciples."
  }
];

const categories = [
  { id: 'all', label: 'Tout', icon: HelpCircle },
  { id: 'getting-started', label: 'Démarrage', icon: Book },
  { id: 'features', label: 'Fonctionnalités', icon: Settings },
  { id: 'troubleshooting', label: 'Dépannage', icon: AlertTriangle },
  { id: 'account', label: 'Compte', icon: User },
  { id: 'other', label: 'Autre', icon: MoreHorizontal },
];

const HelpFAQ = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState({});
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const toggleItem = (id) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleFeedback = (id, isHelpful) => {
    setFeedbackGiven(prev => ({ ...prev, [id]: true }));
    toast({
      title: "Merci pour votre avis !",
      description: isHelpful ? "Nous sommes ravis d'avoir pu vous aider." : "Nous allons travailler à améliorer cette réponse.",
      className: isHelpful ? "bg-green-600 border-none text-white" : "bg-gray-800 border-none text-white"
    });
  };

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Chargement de l'aide...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-6 space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Accueil</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-white font-medium">Aide & FAQ</span>
      </nav>

      {/* Header Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          Comment pouvons-nous vous aider ?
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Trouvez des réponses rapides, des tutoriels et de l'assistance pour tirer le meilleur parti de DiscipleLife.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto mt-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input 
            type="text"
            placeholder="Rechercher une question, un mot-clé..."
            className="pl-12 h-12 rounded-full bg-white dark:bg-[#1a0b2e] border-gray-200 dark:border-white/10 shadow-lg text-lg focus:ring-purple-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-500/20 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
              <Book size={24} />
            </div>
            <div>
              <CardTitle className="text-lg">Guide de Démarrage</CardTitle>
              <CardDescription>Premiers pas sur la plateforme</CardDescription>
            </div>
          </CardHeader>
        </Card>
        
        <Link to="/feedback" className="block">
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-500/20 hover:shadow-md transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <CardTitle className="text-lg">Signaler un Bug</CardTitle>
                <CardDescription>Un problème technique ?</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <a href="mailto:support@disciplelife.com" className="block">
          <Card className="bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-500/20 hover:shadow-md transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                <Mail size={24} />
              </div>
              <div>
                <CardTitle className="text-lg">Contacter le Support</CardTitle>
                <CardDescription>Envoyez-nous un email</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </a>
      </div>

      {/* Categories Filter */}
      <div className="flex flex-wrap justify-center gap-3 py-6">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.id ? "default" : "outline"}
            className={`
              gap-2 rounded-full px-6 transition-all
              ${activeCategory === cat.id 
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20 border-transparent' 
                : 'bg-white dark:bg-[#1a0b2e] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'}
            `}
            onClick={() => setActiveCategory(cat.id)}
          >
            <cat.icon size={16} />
            {cat.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main FAQ List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="text-purple-500" />
            Questions Fréquentes
          </h2>
          
          {filteredFAQs.length > 0 ? (
            <div className="space-y-3">
              {filteredFAQs.map((faq) => (
                <div 
                  key={faq.id} 
                  className="bg-white dark:bg-[#1a0b2e] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden transition-all duration-200 hover:border-purple-200 dark:hover:border-purple-500/30"
                >
                  <button
                    onClick={() => toggleItem(faq.id)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                  >
                    <span className="font-medium text-gray-900 dark:text-white pr-4">{faq.question}</span>
                    {openItems[faq.id] ? (
                      <ChevronUp className="h-5 w-5 text-purple-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {openItems[faq.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-4 text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-white/5 pt-4">
                          <p className="mb-4 leading-relaxed">{faq.answer}</p>
                          
                          {/* Feedback Section */}
                          <div className="flex items-center gap-4 pt-2 text-sm text-gray-500 border-t border-dashed border-gray-200 dark:border-white/10">
                            <span>Cela vous a-t-il aidé ?</span>
                            {!feedbackGiven[faq.id] ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 rounded-full hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600"
                                  onClick={() => handleFeedback(faq.id, true)}
                                >
                                  <ThumbsUp size={14} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                                  onClick={() => handleFeedback(faq.id, false)}
                                >
                                  <ThumbsDown size={14} />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-purple-500 text-xs italic font-medium">Merci pour votre retour !</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-[#1a0b2e] rounded-xl border border-dashed border-gray-300 dark:border-white/10">
              <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aucun résultat trouvé</h3>
              <p className="text-gray-500">Essayez d'autres mots-clés ou parcourez les catégories.</p>
              <Button 
                variant="link" 
                onClick={() => {setSearchQuery(''); setActiveCategory('all');}}
                className="mt-2 text-purple-500"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar / Video Tutorials */}
        <div className="space-y-6">
          <Card className="bg-[#1a0b2e] border-white/10 text-white overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PlayCircle className="text-pink-500" /> Tutoriels Vidéo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="group cursor-pointer">
                <div className="relative aspect-video bg-black/40 rounded-lg overflow-hidden border border-white/10 mb-2">
                  <iframe 
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=X" 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                  ></iframe>
                </div>
                <h4 className="font-medium text-sm text-gray-200 group-hover:text-purple-400 transition-colors">Découvrir l'interface Mentor</h4>
                <p className="text-xs text-gray-500">3:45 min</p>
              </div>

              <div className="group cursor-pointer">
                <div className="relative aspect-video bg-black/40 rounded-lg overflow-hidden border border-white/10 mb-2">
                   <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <PlayCircle className="h-12 w-12 text-white/50" />
                   </div>
                </div>
                <h4 className="font-medium text-sm text-gray-200 group-hover:text-purple-400 transition-colors">Gérer vos cercles de prière</h4>
                <p className="text-xs text-gray-500">2:15 min</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-white/10 text-white">
            <CardContent className="p-6 text-center space-y-4">
              <LifeBuoy className="h-10 w-10 text-purple-300 mx-auto" />
              <div>
                <h3 className="font-bold text-lg">Besoin d'aide supplémentaire ?</h3>
                <p className="text-sm text-purple-200 mt-1">
                  Notre équipe de support est disponible pour répondre à vos questions spécifiques.
                </p>
              </div>
              <a href="mailto:support@disciplelife.com" className="block w-full">
                <Button className="w-full bg-white text-purple-900 hover:bg-gray-100 font-semibold">
                  Ouvrir un ticket
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HelpFAQ;
