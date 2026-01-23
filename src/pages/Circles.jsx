
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Eye, EyeOff, ArrowRight, Trash2, Check, ChevronLeft, BellRing, MessageCircle, User, Calendar as CalendarIcon, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORIES = {
  newArrivals: {
    id: 'newArrivals',
    title: 'NOUVEAUX\nARRIVANTS',
    color: 'bg-blue-500', 
    textColor: 'text-white',
    description: "Nouveaux arrivants dans votre communauté.",
    longDescription: "Personnes qui viennent de rejoindre votre communauté et qui ont besoin d'être accueillies et intégrées.",
    order: 1
  },
  evangelized: {
    id: 'evangelized',
    title: 'PERSONNES\nÉVANGÉLISÉES',
    color: 'bg-pink-500', 
    textColor: 'text-white',
    description: "Personnes qui ont été évangélisées.",
    longDescription: "Personnes avec qui vous avez partagé l'Évangile et qui sont en chemin vers la conversion.",
    order: 2
  },
  unbelievers: {
    id: 'unbelievers',
    title: 'NON-CROYANTS',
    color: 'bg-red-500', 
    textColor: 'text-white',
    description: "Personnes pour qui vous priez et avec qui vous tissez des liens.",
    longDescription: "Ce sont de nouveaux frères et sœurs en Christ. Ils ont besoin d'être nourris, encouragés et enseignés dans les fondements de la foi pour s'enraciner en Christ.",
    order: 3
  },
  newBelievers: {
    id: 'newBelievers',
    title: 'NOUVEAUX\nCONVERTIS',
    color: 'bg-teal-500', 
    textColor: 'text-white',
    description: "Nouveaux disciples de Christ que vous formez.",
    longDescription: "Ce sont de nouveaux frères et sœurs en Christ. Ils ont besoin d'être nourris, encouragés et enseignés dans les fondements de la foi pour s'enraciner en Christ.",
    order: 4
  },
  established: {
    id: 'established',
    title: 'DISCIPLES\nAFFERMIS',
    color: 'bg-purple-600', 
    textColor: 'text-white',
    description: "Croyants qui grandissent et servent.",
    longDescription: "Ces disciples sont stables dans leur foi. Ils servent activement, connaissent la Parole et commencent à aider d'autres personnes à grandir spirituellement.",
    order: 5
  },
  makers: {
    id: 'makers',
    title: 'MENTORS',
    color: 'bg-yellow-500',
    textColor: 'text-white', 
    description: "Ceux qui forment activement d'autres disciples.",
    longDescription: "Leur vie est caractérisée par la reproduction spirituelle. Ils forment intentionnellement d'autres disciples qui, à leur tour, en formeront d'autres.",
    order: 6
  },
  pillars: {
    id: 'pillars',
    title: 'PILIERS',
    color: 'bg-orange-500',
    textColor: 'text-white',
    description: "Mentors approuvés par le superviseur.",
    longDescription: "Ce sont des disciples qui sont déjà mentors et qui ont été approuvés par le superviseur pour devenir des piliers. Le passage de Mentor à Pilier nécessite l'approbation du superviseur.",
    order: 7,
    supervisorOnly: true // Seul le superviseur peut ajouter dans ce cercle
  }
};

const CircleModal = ({ category, onClose, onUpdate }) => {
  const { user } = useAuth();
  const { role } = useRole();
  const { toast } = useToast();
  const isSupervisor = role === 'superviseur' || role === 'pasteur' || role === 'admin' || role === 'super_admin';
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false); // Pour afficher le formulaire complet directement
  const [publicConfirmPerson, setPublicConfirmPerson] = useState(null);
  const [deleteConfirmPerson, setDeleteConfirmPerson] = useState(null);

  // Full form state
  const [fullFormData, setFullFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    church: '',
    country: '',
    spiritualLevel: 'Non-croyant',
    startDate: new Date().toISOString().split('T')[0],
    parentDisciple: 'none',
    isBaptized: 'non', // 'oui' ou 'non'
    baptismDate: '' // Date du baptême si oui
  });

  const [allPotentialParents, setAllPotentialParents] = useState([]);

  useEffect(() => {
    fetchPeople();
    fetchAllPotentialParents();
    initializeFormData(); // Initialiser le formulaire avec le niveau approprié
  }, [category.id]);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cercle_personnes')
        .select('*')
        .eq('user_id', user.id)
        .eq('circle_type', category.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
      toast({ title: "Erreur", description: "Impossible de charger la liste.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPotentialParents = async () => {
    try {
      // Récupérer tous les mentors (profils avec role='mentor' ou can_have_disciples=true)
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('profils')
        .select('id, first_name, last_name, role, is_approved_as_disciple_maker');

      if (mentorsError) throw mentorsError;

      // Récupérer les permissions pour vérifier can_have_disciples
      const { data: permissionsData } = await supabase
        .from('user_permissions')
        .select('user_id, can_have_disciples')
        .eq('can_have_disciples', true);

      // Récupérer tous les disciples de la table cercle_personnes
      const { data: allDisciplesData, error: disciplesError } = await supabase
        .from('cercle_personnes')
        .select('id, name, first_name, last_name, user_id');

      if (disciplesError) throw disciplesError;

      // Créer une liste combinée
      const allMembers = [];

      // Ajouter les mentors depuis profils (mentors et admins)
      if (mentorsData) {
        mentorsData.forEach(mentor => {
          if (mentor.role === 'mentor' || mentor.role === 'admin' || mentor.is_approved_as_disciple_maker) {
            const fullName = `${mentor.first_name || ''} ${mentor.last_name || ''}`.trim() || 'Mentor';
            allMembers.push({
              id: mentor.id,
              name: fullName,
              type: 'mentor'
            });
          }
        });
      }

      // Ajouter les utilisateurs avec can_have_disciples
      if (permissionsData) {
        const mentorIds = new Set(mentorsData?.map(m => m.id) || []);
        permissionsData.forEach(perm => {
          if (!mentorIds.has(perm.user_id)) {
            // Récupérer le nom depuis profils
            const mentorProfile = mentorsData?.find(m => m.id === perm.user_id);
            if (mentorProfile) {
              const fullName = `${mentorProfile.first_name || ''} ${mentorProfile.last_name || ''}`.trim() || 'Mentor';
              allMembers.push({
                id: perm.user_id,
                name: fullName,
                type: 'mentor'
              });
            }
          }
        });
      }

      // Ajouter tous les disciples
      if (allDisciplesData) {
        allDisciplesData.forEach(disciple => {
          const fullName = disciple.name || `${disciple.first_name || ''} ${disciple.last_name || ''}`.trim() || 'Disciple';
          allMembers.push({
            id: disciple.id,
            name: fullName,
            type: 'disciple',
            user_id: disciple.user_id
          });
        });
      }

      // Trier par nom et supprimer les doublons
      const uniqueMembers = Array.from(
        new Map(allMembers.map(m => [m.id, m])).values()
      ).sort((a, b) => a.name.localeCompare(b.name));

      setAllPotentialParents(uniqueMembers);
    } catch (error) {
      console.error("Error fetching potential parents:", error);
    }
  };

  // Initialiser le formulaire avec le niveau spirituel correspondant à la catégorie
  const initializeFormData = () => {
    const levelMap = {
      'newArrivals': 'Nouveau arrivant',
      'evangelized': 'Personne évangélisée',
      'unbelievers': 'Non-croyant',
      'newBelievers': 'Nouveau converti',
      'established': 'Disciple affermi',
      'makers': 'Mentor',
      'pillars': 'Pilier'
    };
    setFullFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      church: '',
      country: '',
      spiritualLevel: levelMap[category.id] || 'Non-croyant',
      startDate: new Date().toISOString().split('T')[0],
      parentDisciple: 'none',
      isBaptized: 'non',
      baptismDate: ''
    });
  };

  const mapCategoryToLevel = (catId) => {
      switch(catId) {
          case 'newArrivals': return 'Nouveau arrivant';
          case 'evangelized': return 'Personne évangélisée';
          case 'unbelievers': return 'Non-croyant';
          case 'newBelievers': return 'Nouveau converti';
          case 'established': return 'Disciple affermi';
          case 'makers': return 'Mentor';
          case 'pillars': return 'Pilier';
          default: return 'Non-croyant';
      }
  };

  const mapLevelToCategory = (level) => {
     switch(level) {
         case 'Nouveau arrivant': return 'newArrivals';
         case 'Personne évangélisée': return 'evangelized';
         case 'Non-croyant': return 'unbelievers';
         case 'Nouveau converti': return 'newBelievers';
         case 'Disciple affermi': return 'established';
         case 'Mentor': return 'makers';
         case 'Pilier': return 'pillars';
         default: return 'unbelievers';
     }
  };

  // Step 2: User fills full form and saves
  const handleFullFormSubmit = async (e) => {
      e?.preventDefault(); // Empêcher le comportement par défaut si c'est un formulaire
      
      // Validation
      if (!fullFormData.firstName || !fullFormData.firstName.trim()) {
        toast({ title: "Erreur", description: "Le prénom est requis.", variant: "destructive" });
        return;
      }

      try {
        // Déterminer si le parent est un mentor (ID de profils) ou un disciple (ID de cercle_personnes)
        let parentDiscipleId = null;
        if (fullFormData.parentDisciple && fullFormData.parentDisciple !== 'none') {
          // Vérifier si c'est un mentor ou un disciple
          const selectedParent = allPotentialParents.find(m => m.id === fullFormData.parentDisciple);
          if (selectedParent) {
            if (selectedParent.type === 'mentor') {
              // Pour les mentors : vérifier s'ils ont déjà une entrée dans cercle_personnes
              // Si oui, utiliser cette entrée comme parent, sinon créer une entrée minimale
              const { data: mentorEntry, error: mentorEntryError } = await supabase
                .from('cercle_personnes')
                .select('id')
                .eq('user_id', selectedParent.id)
                .maybeSingle();
              
              if (mentorEntryError && mentorEntryError.code !== 'PGRST116') {
                console.error('Erreur vérification entrée mentor:', mentorEntryError);
                toast({ 
                  title: "Attention", 
                  description: "Impossible de vérifier l'entrée du mentor. Le disciple sera créé sans parent.", 
                  variant: "warning" 
                });
                parentDiscipleId = null;
              } else if (mentorEntry) {
                // Le mentor a déjà une entrée dans cercle_personnes, utiliser cet ID
                parentDiscipleId = mentorEntry.id;
              } else {
                // Le mentor n'a pas d'entrée, créer une entrée minimale pour permettre la liaison
                const { data: mentorProfile } = await supabase
                  .from('profils')
                  .select('first_name, last_name, email')
                  .eq('id', selectedParent.id)
                  .single();
                
                const mentorFullName = mentorProfile 
                  ? `${mentorProfile.first_name || ''} ${mentorProfile.last_name || ''}`.trim()
                  : 'Mentor';
                
                const { data: newMentorEntry, error: createMentorEntryError } = await supabase
                  .from('cercle_personnes')
                  .insert({
                    user_id: selectedParent.id,
                    name: mentorFullName,
                    first_name: mentorProfile?.first_name || null,
                    last_name: mentorProfile?.last_name || null,
                    email: mentorProfile?.email || null,
                    circle_type: 'makers',
                    created_at: new Date().toISOString()
                  })
                  .select('id')
                  .single();
                
                if (createMentorEntryError) {
                  console.error('Erreur création entrée mentor:', createMentorEntryError);
                  toast({ 
                    title: "Attention", 
                    description: "Impossible de créer l'entrée du mentor. Le disciple sera créé sans parent.", 
                    variant: "warning" 
                  });
                  parentDiscipleId = null;
                } else {
                  parentDiscipleId = newMentorEntry.id;
                }
              }
            } else {
              // Pour les disciples, on peut utiliser leur ID directement
              parentDiscipleId = fullFormData.parentDisciple;
            }
          }
        }

        // Préparer les données à insérer (sans les colonnes qui n'existent pas)
        const insertData = {
            user_id: user.id,
            name: `${fullFormData.firstName} ${fullFormData.lastName}`.trim(),
            first_name: fullFormData.firstName,
            last_name: fullFormData.lastName || null,
            email: fullFormData.email || null,
            phone: fullFormData.phone || null,
            church: fullFormData.church || null,
            country: fullFormData.country || null,
            circle_type: mapLevelToCategory(fullFormData.spiritualLevel),
            visible_to_others: false,
            start_date: fullFormData.startDate || null,
            parent_disciple_id: parentDiscipleId
        };

        // Retirer les champs null pour éviter les erreurs
        Object.keys(insertData).forEach(key => {
            if (insertData[key] === null || insertData[key] === '') {
                delete insertData[key];
            }
        });

        const { data, error } = await supabase
            .from('cercle_personnes')
            .insert([insertData])
            .select()
            .single();

        if (error) {
          console.error("Supabase error:", error);
          throw new Error(error.message || "Erreur lors de l'insertion dans la base de données");
        }
        
        // If the category changed based on dropdown, we might not see it in this modal immediately if it moved to another bucket
        // But if it's the same bucket, update list:
        if (mapLevelToCategory(fullFormData.spiritualLevel) === category.id) {
             setPeople([data, ...people]);
        }
        
        setIsAdding(false);
        initializeFormData();
        onUpdate(); // refresh counts
        toast({ title: "Disciple ajouté !", description: `${data.name} a été ajouté avec succès.` });

      } catch (error) {
        console.error('Error adding person:', error);
        toast({ 
          title: "Erreur", 
          description: error.message || "Impossible d'ajouter cette personne. Veuillez vérifier les informations saisies.", 
          variant: "destructive" 
        });
      }
  };

  const toggleVisibility = async (person) => {
    if (!person.visible_to_others) {
      setPublicConfirmPerson(person);
      return;
    }
    await updateVisibility(person.id, false);
  };

  const updateVisibility = async (id, isVisible) => {
    try {
      const { error } = await supabase
        .from('cercle_personnes')
        .update({ visible_to_others: isVisible })
        .eq('id', id);
      if (error) throw error;
      setPeople(people.map(p => p.id === id ? { ...p, visible_to_others: isVisible } : p));
      setPublicConfirmPerson(null);
      if (isVisible) {
        toast({ title: "Visibilité modifiée", description: "Cette personne est maintenant visible par votre groupe." });
      } else {
        toast({ title: "Visibilité modifiée", description: "Cette personne est maintenant privée." });
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const movePerson = async (person, targetCategoryKey) => {
    try {
      const { error } = await supabase
        .from('cercle_personnes')
        .update({ circle_type: targetCategoryKey })
        .eq('id', person.id);
      if (error) throw error;
      setPeople(people.filter(p => p.id !== person.id));
      onUpdate();
      toast({ 
        title: "Déplacement effectué", 
        description: `${person.name} est maintenant dans ${CATEGORIES[targetCategoryKey].title.replace('\n', ' ')}.` 
      });
    } catch (error) {
      console.error('Error moving person:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmPerson) return;
    try {
      const { error } = await supabase
        .from('cercle_personnes')
        .delete()
        .eq('id', deleteConfirmPerson.id);
      if (error) throw error;
      setPeople(people.filter(p => p.id !== deleteConfirmPerson.id));
      setDeleteConfirmPerson(null);
      onUpdate();
      toast({ title: "Supprimé", description: "La personne a été retirée du cercle." });
    } catch (error) {
       console.error('Error deleting person:', error);
       toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const availableMoves = Object.values(CATEGORIES).filter(c => c.order > category.order);

  return (
    <>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ 
          type: 'spring', 
          damping: 30, 
          stiffness: 300,
          mass: 0.8
        }}
        className={`fixed inset-0 z-[40] flex flex-col ${category.color} overflow-y-auto overflow-x-hidden`}
      >
        <div className="relative p-4 pt-6 flex justify-end">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8">
                <X size={20} />
            </Button>
        </div>
        <div className="flex-1 px-6 pb-10 flex flex-col">
          <div className="flex-1 max-w-2xl mx-auto w-full text-center">
              <motion.h2 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight whitespace-pre-line text-center"
              >
                {category.title}
              </motion.h2>
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex items-center justify-center gap-2 mb-6"
              >
                <p className={`text-lg ${category.textColor} font-medium leading-tight text-center`}>{category.description}</p>
                <div className="bg-white/20 rounded-full p-1"><ArrowRight size={12} className="text-white rotate-90" /></div>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className={`${category.textColor} text-sm leading-relaxed opacity-90 mb-6 text-center`}
              >
                {category.longDescription}
              </motion.p>

              {!isAdding && (
                <div className="flex justify-center mb-6">
                  {category.supervisorOnly && !isSupervisor ? (
                    <div className="w-full max-w-md py-4 bg-white/50 text-slate-700 text-center rounded-xl shadow-lg">
                      <p className="text-sm font-medium">Seul le superviseur peut ajouter des personnes dans ce cercle.</p>
                    </div>
                  ) : (
                    <Button 
                        onClick={() => {
                          initializeFormData();
                          setIsAdding(true);
                        }}
                        className="w-full max-w-md py-5 bg-white text-slate-900 hover:bg-white/90 hover:scale-[1.01] transition-all text-base font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 px-6"
                    >
                        <span>AJOUTER UN NOM</span>
                        <Plus className="text-slate-900" size={20} />
                    </Button>
                  )}
                </div>
              )}

              {isAdding && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ 
                      duration: 0.3,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    className="bg-white rounded-xl shadow-xl mb-6 p-6 mx-auto max-w-3xl w-full"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-900 text-center flex-1">Nouvelle Identité de Disciple</h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setIsAdding(false);
                          initializeFormData();
                        }}
                        className="text-slate-600 hover:text-slate-900 h-8 w-8"
                      >
                        <X size={18} />
                      </Button>
                    </div>
                    
                    <form onSubmit={handleFullFormSubmit} className="space-y-4 text-center">
                      <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors">
                          <User size={20} />
                          <span className="text-[10px] mt-1">Photo</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-slate-700 font-medium text-center block">Prénom *</Label>
                          <Input 
                            id="firstName" 
                            className="bg-white border-slate-300 text-slate-900 text-center w-full" 
                            value={fullFormData.firstName}
                            onChange={(e) => setFullFormData({...fullFormData, firstName: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-slate-700 font-medium text-center block">Nom</Label>
                          <Input 
                            id="lastName" 
                            className="bg-white border-slate-300 text-slate-900 text-center w-full"
                            value={fullFormData.lastName}
                            onChange={(e) => setFullFormData({...fullFormData, lastName: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 max-w-2xl mx-auto">
                        <Label htmlFor="email" className="text-slate-700 font-medium text-center block">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          className="bg-white border-slate-300 text-slate-900 text-center w-full" 
                          value={fullFormData.email}
                          onChange={(e) => setFullFormData({...fullFormData, email: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2 max-w-2xl mx-auto">
                        <Label htmlFor="phone" className="text-slate-700 font-medium text-center block">Téléphone</Label>
                        <Input 
                          id="phone" 
                          className="bg-white border-slate-300 text-slate-900 text-center w-full" 
                          value={fullFormData.phone}
                          onChange={(e) => setFullFormData({...fullFormData, phone: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        <div className="space-y-2">
                          <Label htmlFor="church" className="text-slate-700 font-medium text-center block">Église</Label>
                          <Input 
                            id="church" 
                            className="bg-white border-slate-300 text-slate-900 text-center w-full" 
                            value={fullFormData.church}
                            onChange={(e) => setFullFormData({...fullFormData, church: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country" className="text-slate-700 font-medium text-center block">Pays</Label>
                          <Input 
                            id="country" 
                            className="bg-white border-slate-300 text-slate-900 text-center w-full" 
                            value={fullFormData.country}
                            onChange={(e) => setFullFormData({...fullFormData, country: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 max-w-2xl mx-auto">
                        <Label className="text-slate-700 font-medium text-center block">Niveau Spirituel</Label>
                        <Select 
                          value={fullFormData.spiritualLevel} 
                          onValueChange={(val) => setFullFormData({...fullFormData, spiritualLevel: val})}
                        >
                          <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-center w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-300 text-slate-900 z-[200]">
                            <SelectItem value="Nouveau arrivant" className="focus:bg-gray-100 focus:!text-gray-900">Nouveau arrivant</SelectItem>
                            <SelectItem value="Personne évangélisée" className="focus:bg-gray-100 focus:!text-gray-900">Personne évangélisée</SelectItem>
                            <SelectItem value="Non-croyant" className="focus:bg-gray-100 focus:!text-gray-900">Non-croyant</SelectItem>
                            <SelectItem value="Nouveau converti" className="focus:bg-gray-100 focus:!text-gray-900">Nouveau converti</SelectItem>
                            <SelectItem value="Disciple affermi" className="focus:bg-gray-100 focus:!text-gray-900">Disciple affermi</SelectItem>
                            <SelectItem value="Mentor" className="focus:bg-gray-100 focus:!text-gray-900">Mentor</SelectItem>
                            {isSupervisor && <SelectItem value="Pilier" className="focus:bg-gray-100 focus:!text-gray-900">Pilier</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 max-w-2xl mx-auto">
                        <Label htmlFor="startDate" className="text-slate-700 font-medium text-center block">Date de début</Label>
                        <Input 
                          id="startDate" 
                          type="date" 
                          className="bg-white border-slate-300 text-slate-900 block w-full text-center"
                          value={fullFormData.startDate}
                          onChange={(e) => setFullFormData({...fullFormData, startDate: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2 max-w-2xl mx-auto">
                        <Label className="text-slate-700 font-medium text-center block">Disciple de (Parent) - Optionnel</Label>
                        <Select 
                          value={fullFormData.parentDisciple}
                          onValueChange={(val) => setFullFormData({...fullFormData, parentDisciple: val})}
                        >
                          <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-center w-full">
                            <SelectValue placeholder="Aucun (Racine)" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-300 text-slate-900 z-[200] max-h-[300px] overflow-y-auto">
                            <SelectItem value="none" className="focus:bg-gray-100 focus:!text-gray-900">Aucun (Racine)</SelectItem>
                            {allPotentialParents.map(member => (
                              <SelectItem key={member.id} value={member.id} className="focus:bg-gray-100 focus:!text-gray-900">
                                {member.name} {member.type === 'mentor' ? '(Mentor)' : '(Disciple)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 max-w-2xl mx-auto">
                        <Label className="text-slate-700 font-medium text-center block">Baptisé par immersion ?</Label>
                        <Select 
                          value={fullFormData.isBaptized} 
                          onValueChange={(val) => setFullFormData({...fullFormData, isBaptized: val, baptismDate: val === 'non' ? '' : fullFormData.baptismDate})}
                        >
                          <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-center w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-300 text-slate-900 z-[200]">
                            <SelectItem value="non" className="focus:bg-gray-100 focus:!text-gray-900">Non</SelectItem>
                            <SelectItem value="oui" className="focus:bg-gray-100 focus:!text-gray-900">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {fullFormData.isBaptized === 'oui' && (
                        <div className="space-y-2 max-w-2xl mx-auto">
                          <Label htmlFor="baptismDate" className="text-slate-700 font-medium text-center block">Date du baptême (JJ/MM/AAAA)</Label>
                          <Input 
                            id="baptismDate" 
                            type="date" 
                            className="bg-white border-slate-300 text-slate-900 block w-full text-center"
                            value={fullFormData.baptismDate}
                            onChange={(e) => setFullFormData({...fullFormData, baptismDate: e.target.value})}
                          />
                        </div>
                      )}

                      <div className="flex gap-3 pt-4 justify-center max-w-2xl mx-auto">
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={() => {
                            setIsAdding(false);
                            initializeFormData();
                          }} 
                          className="flex-1 max-w-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Annuler
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1 max-w-xs bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Enregistrer
                        </Button>
                      </div>
                    </form>
                  </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-8"> 
                  {loading ? (
                    <div className="text-white/60 text-center py-4 col-span-2">Chargement...</div>
                  ) : (
                    people.map((person, index) => (
                        <motion.div 
                            key={person.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ 
                              duration: 0.3,
                              delay: index * 0.05,
                              ease: [0.25, 0.46, 0.45, 0.94]
                            }}
                            className="bg-transparent border border-white/30 rounded-xl p-3 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between group gap-2 sm:gap-0"
                        >
                            <span className="text-base font-medium truncate w-full sm:w-auto sm:flex-1 sm:mr-2">{person.name}</span>
                            <div className="flex items-center justify-end w-full sm:w-auto gap-1 md:gap-2">
                                <button onClick={() => toggleVisibility(person)} className="text-white/70 hover:text-white transition-colors p-1">
                                    {person.visible_to_others ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>
                                {availableMoves.length > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="text-white/70 hover:text-white transition-colors p-1"><ArrowRight size={20} /></button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 bg-white text-slate-900 border-none shadow-xl rounded-xl overflow-hidden p-0 z-[200]">
                                       <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Déplacer vers</div>
                                       {Object.values(CATEGORIES).filter(c => c.id !== category.id).map(target => (
                                          <DropdownMenuItem key={target.id} onClick={() => movePerson(person, target.id)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-100 cursor:bg-slate-100">
                                             <div className={`w-2 h-2 rounded-full ${target.color.replace('bg-', 'text-').replace('text-', 'bg-')}`}></div>
                                             <span className="font-medium">{target.title.replace('\n', ' ')}</span>
                                          </DropdownMenuItem>
                                       ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                <button onClick={() => setDeleteConfirmPerson(person)} className="text-white/70 hover:text-white hover:bg-white/10 rounded p-1 transition-colors"><Trash2 size={20} /></button>
                            </div>
                        </motion.div>
                    ))
                  )}
                  {!loading && people.length === 0 && !isAdding && (
                      <div className="text-center py-10 opacity-60 col-span-2">
                          <p className="text-white text-base">Aucune personne dans ce cercle pour le moment.</p>
                      </div>
                  )}
              </div>
          </div>
        </div>
        <div className="px-6 pb-4 flex justify-center">
            <Button onClick={onClose} className="w-fit max-w-sm py-4 bg-white/20 text-white hover:bg-white/30 hover:scale-[1.01] transition-all text-base font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mx-auto">
                <ChevronLeft size={18} />
                <span>Retour</span>
            </Button>
        </div>
      </motion.div>

      {/* Confirmation Modal for Public Visibility */}
      <AnimatePresence>
        {publicConfirmPerson && (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }}
             transition={{ duration: 0.2 }}
             className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
           >
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                 animate={{ scale: 1, opacity: 1, y: 0 }} 
                 exit={{ scale: 0.9, opacity: 0, y: 20 }}
                 transition={{ 
                   type: 'spring',
                   damping: 25,
                   stiffness: 300
                 }}
                 className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl border border-gray-200"
               >
                   <div className="p-6">
                       <h3 className="text-2xl font-bold text-gray-900 mb-4">Rendre Public ?</h3>
                       <p className="text-gray-600 mb-6 leading-relaxed">Voulez-vous rendre ce nom public ? Cela permettra aux autres membres de votre groupe de voir ce nom.</p>
                       <div className="flex justify-end gap-3">
                           <Button onClick={() => setPublicConfirmPerson(null)} className="h-10 w-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-900 p-0 flex items-center justify-center"><X size={20} /></Button>
                           <Button onClick={() => updateVisibility(publicConfirmPerson.id, true)} className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700 text-white p-0 flex items-center justify-center"><Check size={20} /></Button>
                       </div>
                   </div>
               </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Deletion */}
      <AnimatePresence>
        {deleteConfirmPerson && (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }}
             transition={{ duration: 0.2 }}
             className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
           >
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                 animate={{ scale: 1, opacity: 1, y: 0 }} 
                 exit={{ scale: 0.9, opacity: 0, y: 20 }}
                 transition={{ 
                   type: 'spring',
                   damping: 25,
                   stiffness: 300
                 }}
                 className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl border border-gray-200"
               >
                   <div className="p-6 text-center">
                       <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600"><Trash2 size={20} /></div>
                       <h3 className="text-xl font-bold text-gray-900 mb-2">Supprimer {deleteConfirmPerson.name} ?</h3>
                       <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir retirer cette personne de votre cercle ? Cette action est irréversible.</p>
                       <div className="flex gap-3">
                           <Button variant="outline" onClick={() => setDeleteConfirmPerson(null)} className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</Button>
                           <Button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Supprimer</Button>
                       </div>
                   </div>
               </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

    </>
  );
};

const Circles = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(null);
  const isSupervisor = role === 'superviseur' || role === 'pasteur' || role === 'admin' || role === 'super_admin';
  const [counts, setCounts] = useState({ 
    newArrivals: 0, 
    evangelized: 0, 
    unbelievers: 0, 
    newBelievers: 0, 
    established: 0, 
    makers: 0, 
    pillars: 0 
  });

  const fetchCounts = async () => {
    if (!user) return;
    try {
        const { data, error } = await supabase.from('cercle_personnes').select('circle_type').eq('user_id', user.id);
        if (error) throw error;
        const newCounts = { 
          newArrivals: 0, 
          evangelized: 0, 
          unbelievers: 0, 
          newBelievers: 0, 
          established: 0, 
          makers: 0, 
          pillars: 0 
        };
        data.forEach(p => { if (newCounts[p.circle_type] !== undefined) newCounts[p.circle_type]++; });
        setCounts(newCounts);
    } catch (e) { console.error("Error fetching counts", e); }
  };

  useEffect(() => { fetchCounts(); }, [user]);

  const renderCircle = (key, angle, radius, isCenter = false, index = 0) => {
    const category = CATEGORIES[key];
    const count = counts[key] || 0;
    
    // Si c'est le cercle central, position fixe au centre
    let x = 0;
    let y = 0;
    
    if (!isCenter && angle !== undefined && radius !== undefined) {
      // Calculer la position en fonction de l'angle et du rayon
      x = Math.cos(angle * Math.PI / 180) * radius;
      y = Math.sin(angle * Math.PI / 180) * radius;
    }
    
    return (
        <motion.div 
            key={key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.5, 
              delay: isCenter ? 0 : index * 0.1,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            whileHover={{ 
              zIndex: 20,
              scale: 1.02,
              transition: { 
                duration: 0.4, 
                ease: [0.25, 0.1, 0.25, 1],
                type: "tween"
              }
            }}
            whileTap={{ 
              scale: 0.98,
              transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
            }}
            onClick={() => setActiveCategory(category)}
            className={`absolute w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 lg:w-52 lg:h-52 xl:w-56 xl:h-56 rounded-full ${category.color} flex flex-col items-center justify-center cursor-pointer shadow-lg hover:shadow-xl hover:ring-2 hover:ring-white/40 z-10 transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]`}
            style={{
              left: isCenter ? '50%' : `calc(50% + ${x}px)`,
              top: isCenter ? '50%' : `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
              transformOrigin: 'center center',
              zIndex: isCenter ? 20 : 10,
              willChange: 'transform, z-index'
            }}
         >
             <motion.div 
               className="flex flex-col items-center justify-center text-center px-2"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: (isCenter ? 0 : index * 0.1) + 0.2, duration: 0.3 }}
             >
                <span className="text-[11px] sm:text-[12px] md:text-[13px] lg:text-[14px] xl:text-[15px] font-bold text-white/90 uppercase tracking-wider mb-1 whitespace-pre-line leading-tight">{category.title}</span>
                {count === 0 ? <Plus className="text-white/60" size={22} /> : <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white drop-shadow-md">{count}</span>}
             </motion.div>
         </motion.div>
    );
  };

  return (
    <>
    <div className="h-full flex flex-col items-center justify-center w-full relative overflow-y-auto overflow-x-hidden min-h-[600px] py-8 bg-gray-50">
        {/* Conteneur principal - tous les éléments centrés sur le même axe vertical avec largeur maximale */}
        <div className="w-full max-w-[1400px] mx-auto flex flex-col items-center justify-center px-4 sm:px-6">
            {/* Section Titres - en haut de la page, sur la gauche, texte centré, sur une seule ligne */}
            <div className="w-full flex flex-col items-center justify-center mb-6 pl-48">
                <div className="text-center w-full max-w-xs">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 whitespace-nowrap">Cercles de Disciples</h2>
                    <p className="text-sm md:text-base text-gray-600">Identifiez et priez pour les personnes que Dieu a placées dans votre vie.</p>
                </div>
            </div>

            {/* Section Cercles - parfaitement centrée avec mx-auto */}
            <div className="relative flex items-center justify-center flex-shrink-0">
              <div className="relative w-[700px] h-[700px] sm:w-[800px] sm:h-[800px] md:w-[900px] md:h-[900px] lg:w-[1000px] lg:h-[1000px] xl:w-[1100px] xl:h-[1100px]">
                {/* Cercle Piliers au centre */}
                {isSupervisor && renderCircle('pillars', 0, 0, true, 0)}
                
                {/* 6 autres cercles disposés en cercle fermé autour du cercle central */}
                {/* Ordre : Haut → Bas-droite → Bas → Bas-gauche (sens des aiguilles d'une montre) */}
                {/* Rayon légèrement augmenté pour espacer les cercles périphériques */}
                {renderCircle('evangelized', -90, 200, false, 1)} {/* Haut - PERSONNES ÉVANGÉLISÉES */}
                {renderCircle('unbelievers', -30, 205, false, 2)} {/* Haut-droite - NON-CROYANTS */}
                {renderCircle('newBelievers', 30, 205, false, 3)} {/* Droite - NOUVEAUX CONVERTIS */}
                {renderCircle('newArrivals', 90, 200, false, 4)} {/* Bas-droite - NOUVEAUX ARRIVANTS */}
                {renderCircle('established', 150, 205, false, 5)} {/* Bas - DISCIPLES AFFERMIS */}
                {renderCircle('makers', 210, 205, false, 6)} {/* Bas-gauche - MENTORS */}
              </div>
            </div>
        </div>
            
        {/* Section Boutons - déplacée sur la droite */}
        <div className="w-full max-w-xs mt-6 flex flex-col gap-3 items-end justify-center ml-auto mr-40">
                <Button className="w-full py-6 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm border border-green-700 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => navigate('/my-prayers')}>
                    <BellRing className="mr-2 h-5 w-5" />
                    Planifier une Prière
                </Button>
                <Button className="w-full py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-blue-700 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => navigate('/my-appointments')}>
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Planifier un Échange
                </Button>
            </div>

        <AnimatePresence>
            {activeCategory && (
                <CircleModal category={activeCategory} onClose={() => setActiveCategory(null)} onUpdate={fetchCounts} />
            )}
        </AnimatePresence>
    </div>
    </>
  );
};

export default Circles;
