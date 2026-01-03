import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  BookOpen, 
  PlayCircle, 
  TrendingUp,
  Heart,
  Video,
  Quote,
  Library,
  Award,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const DiscipleDashboard = ({ targetDiscipleId = null }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams(); 
  
  const effectiveId = targetDiscipleId || id || user?.id;
  const isViewingSelf = !id && !targetDiscipleId;

  const [stats, setStats] = useState({
    nextRdv: null,
    nextPrayer: null
  });
  const [loading, setLoading] = useState(true);

  // Upgrade to Mentor State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [mentorCode, setMentorCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, effectiveId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch Next Appointment
      const { data: appt } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'scheduled')
        .or(`disciple_id.eq.${effectiveId},mentor_id.eq.${effectiveId}`)
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Fetch Next Prayer
      const { data: prayer } = await supabase
        .from('prayer_sessions')
        .select('*')
        .eq('status', 'scheduled')
        .or(`disciple_id.eq.${effectiveId},mentor_id.eq.${effectiveId}`)
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      setStats({
        nextRdv: appt || null,
        nextPrayer: prayer || null
      });

    } catch (error) {
      console.error("Error loading disciple dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBecomeMentor = async () => {
    if (!mentorCode.trim()) {
      toast({ variant: "destructive", title: "Code requis", description: "Veuillez entrer un code d'accès." });
      return;
    }

    setIsVerifyingCode(true);

    try {
      // 1. Verify Code Existence and Validity
      const { data: codeData, error: codeError } = await supabase
        .from('mentor_access_codes')
        .select('*')
        .eq('code', mentorCode.trim())
        .single();

      if (codeError || !codeData) {
        throw new Error("Code invalide ou introuvable.");
      }

      if (codeData.is_used) {
        throw new Error("Ce code a déjà été utilisé.");
      }

      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        throw new Error("Ce code a expiré.");
      }

      // 2. Begin Update Transaction (simulated via sequential calls)
      
      // Update the code as used
      const { error: updateCodeError } = await supabase
        .from('mentor_access_codes')
        .update({ 
          is_used: true, 
          used_by: user.id 
        })
        .eq('id', codeData.id);

      if (updateCodeError) throw new Error("Erreur lors de la validation du code.");

      // 3. Update User Role
      const { error: updateProfileError } = await supabase
        .from('profils')
        .update({ role: 'mentor', is_approved_as_disciple_maker: true })
        .eq('id', user.id);
        
      if (updateProfileError) throw new Error("Erreur lors de la mise à jour du profil.");

      // 4. Update Permissions (if using separate table)
      const { error: updatePermError } = await supabase
        .from('user_permissions')
        .upsert({ 
          user_id: user.id, 
          can_have_disciples: true 
        }, { onConflict: 'user_id' });

      if (updatePermError) console.error("Permission update warning:", updatePermError);

      // 5. Success Flow
      toast({
        title: "Félicitations ! 🎉",
        description: "Vous êtes maintenant Mentor. Redirection vers votre nouvel espace...",
        className: "bg-green-600 border-green-700 text-white"
      });
      
      setIsUpgradeModalOpen(false);
      
      // Force reload or redirect after short delay
      setTimeout(() => {
        window.location.href = '/dashboard'; 
      }, 1500);

    } catch (error) {
      console.error("Mentor upgrade error:", error);
      toast({
        variant: "destructive",
        title: "Échec de l'activation",
        description: error.message || "Une erreur est survenue.",
      });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isViewingSelf ? "Mon Espace Disciple" : "Espace Disciple"}
          </h1>
          <p className="text-gray-400">
            {isViewingSelf 
              ? "Bienvenue dans votre espace de croissance spirituelle." 
              : "Suivi et accompagnement du disciple."}
          </p>
        </div>
      </div>

      <motion.div 
        variants={container} 
        initial="hidden" 
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Next RDV Card */}
        <Card className="bg-gradient-to-br from-indigo-900/40 to-indigo-800/20 border-indigo-500/30 cursor-pointer hover:border-indigo-400/50 transition-all" onClick={() => navigate('/my-appointments')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-300">Prochain RDV</CardTitle>
            <Calendar className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            {stats.nextRdv ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white">
                  {format(new Date(stats.nextRdv.scheduled_date), 'dd MMM', { locale: fr })}
                </div>
                <p className="text-xs text-indigo-200">
                  {format(new Date(stats.nextRdv.scheduled_date), 'HH:mm')}
                </p>
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-2">Aucun rendez-vous</div>
            )}
            <p className="text-[10px] text-indigo-300 mt-2 flex items-center gap-1">
                Voir tout <TrendingUp size={10} />
            </p>
          </CardContent>
        </Card>

        {/* Next Prayer Card */}
        <Card className="bg-gradient-to-br from-pink-900/40 to-pink-800/20 border-pink-500/30 cursor-pointer hover:border-pink-400/50 transition-all" onClick={() => navigate('/my-prayers')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-pink-300">Prière à venir</CardTitle>
            <Heart className="h-4 w-4 text-pink-400" />
          </CardHeader>
          <CardContent>
            {stats.nextPrayer ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white">
                  {format(new Date(stats.nextPrayer.scheduled_date), 'dd MMM', { locale: fr })}
                </div>
                <p className="text-xs text-pink-200 line-clamp-1">
                   {stats.nextPrayer.prayer_topic}
                </p>
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-2">Aucune prière prévue</div>
            )}
            <p className="text-[10px] text-pink-300 mt-2 flex items-center gap-1">
                Voir tout <TrendingUp size={10} />
            </p>
          </CardContent>
        </Card>

        {/* Resources Shortcut */}
        <Card className="bg-card/40 border-white/10 hover:bg-card/60 transition-all cursor-pointer" onClick={() => navigate('/ebooks')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Mes Ressources</CardTitle>
            <BookOpen className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-white">Bibliothèque</div>
             <p className="text-xs text-gray-400">Accéder aux E-Books</p>
          </CardContent>
        </Card>

        {/* Video Shortcut */}
        <Card className="bg-card/40 border-white/10 hover:bg-card/60 transition-all cursor-pointer" onClick={() => navigate('/teaching-videos')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Enseignements</CardTitle>
            <PlayCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">Vidéos</div>
            <p className="text-xs text-gray-400">Regarder maintenant</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Feature Links Grid */}
      <h2 className="text-xl font-bold text-white mt-8">Accès Rapide</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-white/10 bg-[#1a0b2e] hover:bg-white/5 hover:text-white" onClick={() => navigate('/my-appointments')}>
              <Calendar className="text-indigo-400" size={24} />
              <span>Mes Rendez-vous</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-white/10 bg-[#1a0b2e] hover:bg-white/5 hover:text-white" onClick={() => navigate('/my-prayers')}>
              <Heart className="text-pink-400" size={24} />
              <span>Mes Prières</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-white/10 bg-[#1a0b2e] hover:bg-white/5 hover:text-white" onClick={() => navigate('/teaching-videos')}>
              <Video className="text-red-400" size={24} />
              <span>Enseignements</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-white/10 bg-[#1a0b2e] hover:bg-white/5 hover:text-white" onClick={() => navigate('/testimonial-videos')}>
              <Quote className="text-teal-400" size={24} />
              <span>Témoignages</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-white/10 bg-[#1a0b2e] hover:bg-white/5 hover:text-white" onClick={() => navigate('/books-to-read')}>
              <Library className="text-amber-400" size={24} />
              <span>Livres à Lire</span>
          </Button>
      </div>

      {isViewingSelf && (
        <div className="flex justify-center mt-8">
           <Button 
             onClick={() => setIsUpgradeModalOpen(true)}
             className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2 shadow-lg shadow-amber-500/20"
           >
             <Award size={18} />
             Devenir Mentor
           </Button>
        </div>
      )}

      {/* Mentor Upgrade Modal */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="bg-[#1e1b4b] border-white/10 text-white max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-amber-500/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Award className="text-amber-500" size={24} />
            </div>
            <DialogTitle className="text-center text-xl">Devenir Mentor</DialogTitle>
            <DialogDescription className="text-center text-gray-400">
              Entrez le code d'activation fourni par un responsable pour passer au statut de Mentor.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Code d'activation</label>
              <Input 
                value={mentorCode}
                onChange={(e) => setMentorCode(e.target.value)}
                placeholder="Ex: MENTOR-2024-XY"
                className="bg-black/20 border-white/10 text-center uppercase tracking-widest"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsUpgradeModalOpen(false)}
              className="w-full border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleBecomeMentor}
              disabled={isVerifyingCode || !mentorCode}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isVerifyingCode ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiscipleDashboard;