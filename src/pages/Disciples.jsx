
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Plus, ChevronRight, Upload, Loader2, Camera, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { compressImage } from '@/lib/ImageCompression';

const STATUS_LABELS = {
  "newbelievers": "Nouveau converti",
  "newBelievers": "Nouveau converti",
  "NEWBELIEVERS": "Nouveau converti",
  "newBelivers": "Nouveau converti",
  "NEWBELIVERS": "Nouveau converti",
  "unbelievers": "Non-croyant",
  "makers": "Faiseur de disciples",
  "established": "Disciple affermi",
  "Non-croyant": "Non-croyant",
  "Nouveau converti": "Nouveau converti",
  "NOUVEAU CONVERTI": "Nouveau converti",
  "Disciple Affermi": "Disciple Affermi",
  "Faiseur de Disciples": "Faiseur de Disciples"
};

const getStatusLabel = (status) => {
  if (!status) return '';
  // Normaliser le statut pour gérer les variations
  const normalizedStatus = status.toString().toLowerCase().trim();
  
  // Mapping direct
  if (STATUS_LABELS[status]) {
    return STATUS_LABELS[status];
  }
  
  // Vérifier les variations (y compris les fautes d'orthographe)
  if (normalizedStatus.includes('newbeliever') || normalizedStatus.includes('newbeliver') || normalizedStatus.includes('nouveau') || normalizedStatus.includes('converti')) {
    return 'Nouveau converti';
  }
  if (normalizedStatus.includes('unbeliever') || normalizedStatus.includes('non-croyant')) {
    return 'Non-croyant';
  }
  if (normalizedStatus.includes('established') || normalizedStatus.includes('affermi')) {
    return 'Disciple affermi';
  }
  if (normalizedStatus.includes('maker') || normalizedStatus.includes('faiseur')) {
    return 'Faiseur de disciples';
  }
  
  return status;
};

const getStatusColor = (status) => {
  const s = status?.toLowerCase() || '';
  if (s.includes('non-croyant') || s.includes('unbeliever')) return 'text-pink-500';
  if (s.includes('nouveau') || s.includes('new') || s.includes('converti')) return 'text-teal-400';
  if (s.includes('affermi') || s.includes('established')) return 'text-indigo-400';
  if (s.includes('faiseur') || s.includes('maker')) return 'text-amber-400';
  return 'text-gray-400';
};

const Disciples = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [disciples, setDisciples] = useState([]);
  const [allMembers, setAllMembers] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      church: '',
      country: '',
      startDate: new Date().toISOString().split('T')[0],
      level: 'unbelievers', // Default: Non-croyant
      parentId: null,
      isBaptized: 'non', // 'oui' ou 'non'
      baptismDate: '' // Date du baptême si oui
  });
  
  // Avatar Upload State
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (user) {
        fetchDisciples();
        fetchAllPotentialParents();
    }
  }, [user]);

  const fetchDisciples = async () => {
    try {
      const { data, error } = await supabase
        .from('profils')
        .select('*')
        .eq('mentor_id', user.id)
        .order('first_name');
      
      if (error) throw error;
      setDisciples(data || []);
    } catch (error) {
      console.error(error);
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

          const { data: allDisciplesData, error: disciplesError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, mentor_id');

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
              const fullName = `${(disciple.first_name || '')} ${(disciple.last_name || '')}`.trim() || 'Disciple';
              allMembers.push({
                id: disciple.id,
                name: fullName,
                type: 'disciple',
                user_id: disciple.mentor_id
              });
            });
          }

          // Trier par nom et supprimer les doublons
          const uniqueMembers = Array.from(
            new Map(allMembers.map(m => [m.id, m])).values()
          ).sort((a, b) => a.name.localeCompare(b.name));

          setAllMembers(uniqueMembers);
      } catch (error) {
          console.error("Error fetching potential parents:", error);
      }
  };

  const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          setAvatarFile(file);
          const objectUrl = URL.createObjectURL(file);
          setAvatarPreview(objectUrl);
      }
  };

  const handleAddDisciple = async (e) => {
    e?.preventDefault(); // Empêcher le comportement par défaut si c'est un formulaire
    
    if (!formData.firstName || !formData.firstName.trim()) {
        toast({ title: "Erreur", description: "Le prénom est requis.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);

    try {
        let avatarUrl = null;

        if (avatarFile) {
            try {
                const compressedFile = await compressImage(avatarFile, {
                    maxWidth: 300,
                    maxHeight: 300,
                    quality: 0.8
                });
                
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `disciple-avatars/${user.id}/${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('resources')
                    .upload(fileName, compressedFile);
                
                if (uploadError) throw uploadError;
                
                const { data: publicUrlData } = supabase.storage
                    .from('resources')
                    .getPublicUrl(fileName);
                    
                avatarUrl = publicUrlData.publicUrl;
            } catch (imgError) {
                console.error("Image upload failed", imgError);
                toast({ title: "Attention", description: "L'image n'a pas pu être téléchargée, mais le disciple sera créé.", variant: "warning" });
            }
        }

        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        
        let mentorId = user.id;
        if (formData.parentId && formData.parentId !== 'none') {
          const selectedParent = allMembers.find(m => m.id === formData.parentId);
          if (selectedParent) mentorId = selectedParent.id;
        }

        const { data: myProfil } = await supabase.from('profils').select('famille_id').eq('id', user.id).maybeSingle();
        const insertData = {
            id: crypto.randomUUID(),
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email || null,
            role: 'disciple',
            mentor_id: mentorId,
            famille_id: myProfil?.famille_id || null,
            circle_type: formData.level,
            avatar_url: avatarUrl || null,
            created_at: new Date().toISOString()
        };

        Object.keys(insertData).forEach(key => {
            if (insertData[key] === null || insertData[key] === '') {
                delete insertData[key];
            }
        });

        const { data, error } = await supabase
            .from('profils')
            .insert([insertData])
            .select()
            .single();

        if (error) {
          console.error("Supabase error:", error);
          throw new Error(error.message || "Erreur lors de l'insertion dans la base de données");
        }

        setDisciples([...disciples, data]);
        fetchAllPotentialParents(); 
        
        setIsAddModalOpen(false);
        setFormData({
            firstName: '', lastName: '', email: '', phone: '',
            church: '', country: '', startDate: new Date().toISOString().split('T')[0],
            level: 'unbelievers', parentId: null,
            isBaptized: 'non', baptismDate: ''
        });
        setAvatarFile(null);
        setAvatarPreview(null);
        toast({ title: "Succès", description: "Nouveau disciple ajouté." });
    } catch (error) {
        console.error("Error adding disciple:", error);
        toast({ 
            title: "Erreur", 
            description: error.message || "Impossible d'ajouter le disciple. Veuillez vérifier les informations saisies.", 
            variant: "destructive" 
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const filteredDisciples = disciples.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper les disciples par niveau spirituel
  const groupDisciplesByStatus = (disciplesList) => {
    const groups = {
      'Non-croyants': [],
      'Nouveaux convertis': [],
      'Disciples affermis': [],
      'Faiseurs de disciples': []
    };

    disciplesList.forEach(disciple => {
      const status = getStatusLabel(disciple.circle_type);
      const normalizedStatus = status.toLowerCase();
      
      if (normalizedStatus.includes('non-croyant') || normalizedStatus.includes('unbeliever')) {
        groups['Non-croyants'].push(disciple);
      } else if (normalizedStatus.includes('nouveau') || normalizedStatus.includes('converti') || normalizedStatus.includes('newbeliever')) {
        groups['Nouveaux convertis'].push(disciple);
      } else if (normalizedStatus.includes('affermi') || normalizedStatus.includes('established')) {
        groups['Disciples affermis'].push(disciple);
      } else if (normalizedStatus.includes('faiseur') || normalizedStatus.includes('maker')) {
        groups['Faiseurs de disciples'].push(disciple);
      } else {
        // Par défaut, mettre dans "Nouveaux convertis"
        groups['Nouveaux convertis'].push(disciple);
      }
    });

    return groups;
  };

  const groupedDisciples = groupDisciplesByStatus(filteredDisciples);

  const groupConfig = [
    { 
      key: 'Non-croyants', 
      title: 'NON-CROYANTS', 
      color: 'text-gray-900',
      bgColor: 'bg-gray-300',
      borderColor: 'border-gray-400'
    },
    { 
      key: 'Nouveaux convertis', 
      title: 'NOUVEAUX CONVERTIS', 
      color: 'text-gray-900',
      bgColor: 'bg-gray-300',
      borderColor: 'border-gray-400'
    },
    { 
      key: 'Disciples affermis', 
      title: 'DISCIPLES AFFERMIS', 
      color: 'text-gray-900',
      bgColor: 'bg-gray-300',
      borderColor: 'border-gray-400'
    },
    { 
      key: 'Faiseurs de disciples', 
      title: 'FAISEURS DE DISCIPLES', 
      color: 'text-gray-900',
      bgColor: 'bg-gray-300',
      borderColor: 'border-gray-400'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">Mes Disciples</h1>
            <p className="text-gray-600">Suivi individuel et accompagnement.</p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
             <Plus size={20} /> Ajouter un disciple
          </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <Input 
          placeholder="Rechercher un disciple..." 
          className="pl-10 bg-white border-gray-300 text-gray-900 h-12"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-600">Chargement...</div>
      ) : filteredDisciples.length === 0 ? (
        <div className="text-center py-10 text-gray-600 bg-white rounded-xl border border-gray-200 border-dashed shadow-sm">
          Aucun disciple trouvé. Commencez par en ajouter un !
        </div>
      ) : (
        <div className="space-y-8">
          {groupConfig.map((group) => {
            const groupDisciples = groupedDisciples[group.key];
            if (groupDisciples.length === 0) return null;

            return (
              <div key={group.key} className="space-y-4">
                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${group.bgColor} ${group.borderColor} border`}>
                  <h2 className={`text-lg font-bold ${group.color}`}>{group.title}</h2>
                  <span className={`text-sm ${group.color} opacity-70`}>({groupDisciples.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupDisciples.map(disciple => (
                    <motion.div 
                      key={disciple.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => navigate(`/disciples/${disciple.id}`)}
                      className="bg-white border border-gray-200 p-4 rounded-xl cursor-pointer group hover:border-purple-300 hover:shadow-sm transition-colors relative overflow-hidden shadow-sm"
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        {disciple.avatar_url ? (
                          <Avatar className="h-12 w-12 border border-gray-200">
                            <AvatarImage src={disciple.avatar_url} objectFit="cover" />
                            <AvatarFallback className={`${getAvatarColor(disciple.name)} text-white`}>
                              {getInitials(disciple.name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className={`w-12 h-12 rounded-full ${getAvatarColor(disciple.name)} flex items-center justify-center text-white font-bold shadow-lg`}>
                            {getInitials(disciple.name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-gray-900 font-bold truncate pr-6 group-hover:text-purple-600 transition-colors">{disciple.name}</h3>
                          <p className={`text-xs uppercase tracking-wider font-semibold ${getStatusColor(disciple.circle_type)} whitespace-nowrap`}>
                            {getStatusLabel(disciple.circle_type).toUpperCase()}
                          </p>
                          {disciple.church && <p className="text-[10px] text-gray-600 truncate">{disciple.church}</p>}
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-gray-900">Nouvelle Identité de Disciple</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="flex flex-col items-center justify-center mb-4 gap-2">
                     <div className="relative group cursor-pointer">
                        <label htmlFor="avatar-upload" className="cursor-pointer block relative">
                             {avatarPreview ? (
                                 <Avatar className="h-24 w-24 border-2 border-purple-500/50">
                                     <AvatarImage src={avatarPreview} className="object-cover" />
                                     <AvatarFallback>IMG</AvatarFallback>
                                 </Avatar>
                             ) : (
                                 <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 group-hover:text-purple-600 group-hover:border-purple-300 transition-colors">
                                     <Upload size={24} />
                                     <span className="text-[10px] mt-1">Photo</span>
                                 </div>
                             )}
                             <div className="absolute inset-0 bg-gray-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Camera size={20} className="text-white" />
                             </div>
                        </label>
                        <input 
                            id="avatar-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                     </div>
                     <span className="text-xs text-gray-600">Cliquez pour ajouter une photo</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-gray-900">Prénom *</Label>
                        <Input name="firstName" value={formData.firstName} onChange={handleInputChange} className="bg-white border-gray-300 text-gray-900" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-900">Nom</Label>
                        <Input name="lastName" value={formData.lastName} onChange={handleInputChange} className="bg-white border-gray-300 text-gray-900" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-900">Email</Label>
                    <Input type="email" name="email" value={formData.email} onChange={handleInputChange} className="bg-white border-gray-300 text-gray-900" />
                </div>
                
                <div className="space-y-2">
                    <Label className="text-gray-900">Téléphone</Label>
                    <Input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="bg-white border-gray-300 text-gray-900" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-gray-900">Église</Label>
                        <Input name="church" value={formData.church} onChange={handleInputChange} className="bg-white border-gray-300 text-gray-900" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-900">Pays</Label>
                        <Input name="country" value={formData.country} onChange={handleInputChange} className="bg-white border-gray-300 text-gray-900" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-900">Niveau Spirituel</Label>
                    <Select value={formData.level} onValueChange={(val) => setFormData(p => ({...p, level: val}))}>
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                            <SelectValue placeholder="Sélectionner un niveau" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200]">
                            <SelectItem value="unbelievers" className="!text-gray-900 focus:bg-gray-100 focus:!text-gray-900 cursor-pointer">Non-croyant</SelectItem>
                            <SelectItem value="newBelievers" className="!text-gray-900 focus:bg-gray-100 focus:!text-gray-900 cursor-pointer">Nouveau converti</SelectItem>
                            <SelectItem value="established" className="!text-gray-900 focus:bg-gray-100 focus:!text-gray-900 cursor-pointer">Disciple affermi</SelectItem>
                            <SelectItem value="makers" className="!text-gray-900 focus:bg-gray-100 focus:!text-gray-900 cursor-pointer">Faiseur de disciples</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-900">Date de début</Label>
                    <Input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="bg-white border-gray-300 text-gray-900" />
                </div>
                
                 <div className="space-y-2">
                    <Label className="text-gray-900">Disciple de (Parent) - Optionnel</Label>
                    <Select value={formData.parentId || "none"} onValueChange={(val) => setFormData(p => ({...p, parentId: val === "none" ? null : val}))}>
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                            <SelectValue placeholder="Aucun (Racine)" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200] max-h-60 overflow-y-auto">
                            <SelectItem value="none" className="!text-gray-900 focus:bg-gray-100 focus:!text-gray-900 cursor-pointer">Aucun (Racine)</SelectItem>
                            {allMembers
                                .sort((a, b) => {
                                    // Trier d'abord par type (mentors en premier), puis par nom
                                    if (a.type !== b.type) {
                                        return a.type === 'mentor' ? -1 : 1;
                                    }
                                    return a.name.localeCompare(b.name);
                                })
                                .map(member => (
                                    <SelectItem key={member.id} value={member.id} className="!text-gray-900 focus:bg-gray-100 focus:!text-gray-900 cursor-pointer">
                                        {member.name} {member.type === 'mentor' ? '(Mentor)' : '(Disciple)'}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-900">Baptisé par immersion ?</Label>
                    <Select 
                        value={formData.isBaptized} 
                        onValueChange={(val) => setFormData(p => ({...p, isBaptized: val, baptismDate: val === 'non' ? '' : p.baptismDate}))}
                    >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                            <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200]">
                            <SelectItem value="non" className="!text-gray-900 focus:bg-gray-100 focus:!text-gray-900 cursor-pointer">Non</SelectItem>
                            <SelectItem value="oui" className="!text-gray-900 focus:bg-gray-100 focus:!text-gray-900 cursor-pointer">Oui</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {formData.isBaptized === 'oui' && (
                    <div className="space-y-2">
                        <Label className="text-gray-900">Date du baptême (JJ/MM/AAAA)</Label>
                        <Input 
                            type="date" 
                            name="baptismDate" 
                            value={formData.baptismDate} 
                            onChange={handleInputChange} 
                            className="bg-white border-gray-300 text-gray-900" 
                        />
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="text-gray-600 hover:text-gray-900">Annuler</Button>
                <Button onClick={handleAddDisciple} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                    Enregistrer
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Disciples;
