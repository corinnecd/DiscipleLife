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
  XCircle,
  GitBranch
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ArbreGenealogiqueEmbed } from '@/components/ArbreGenealogiqueEmbed';
import { MembersTableCard } from '@/components/MembersTableCard';
import { useMembersTable } from '@/hooks/useMembersTable';
import { exportToExcel, exportElementToPDF } from '@/lib/ExportUtils';

const DiscipleDashboard = ({ targetDiscipleId = null }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();
  const { id } = useParams(); 
  
  const effectiveId = targetDiscipleId || id || user?.id;
  const isViewingSelf = !id && !targetDiscipleId;

  const [stats, setStats] = useState({
    nextRdv: null,
    nextPrayer: null
  });
  const [loading, setLoading] = useState(true);
  const [famille, setFamille] = useState(null); // Famille du disciple (pour arbre généalogique)
  const [discipleFamilyMembers, setDiscipleFamilyMembers] = useState([]);
  const discipleFamilyTable = useMembersTable(discipleFamilyMembers, {
    membresProgression: {},
    membresDisciplesCount: {},
    membresSuiviPar: {},
  });

  // Récupérer la famille du disciple (famille_id du profil)
  useEffect(() => {
    if (!user?.id) return;
    const abort = { current: false };
    (async () => {
      const { data: profil } = await supabase.from('profils').select('famille_id').eq('id', user.id).maybeSingle();
      if (abort.current || !profil?.famille_id) return;
      const { data: fam } = await supabase.from('familles_disciples').select('id, nom, pasteur_id, superviseur_id').eq('id', profil.famille_id).maybeSingle();
      if (!abort.current && fam) setFamille(fam);
    })();
    return () => { abort.current = true; };
  }, [user?.id]);

  // Charger les membres de la famille du disciple pour le tableau « Membres de ma famille »
  useEffect(() => {
    if (!user?.id || !famille?.id) {
      setDiscipleFamilyMembers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email, avatar_url, created_at, role, mentor_id, spiritual_stage')
        .eq('famille_id', famille.id)
        .neq('id', user.id)
        .order('created_at', { ascending: false });
      if (error || cancelled) return;
      const members = (data || []).map((p) => ({
        ...p,
        statut_spirituel: (p.spiritual_stage === 'inactif' || p.spiritual_stage === 'inactive') ? 'inactif' : 'actif',
      }));
      if (!cancelled) setDiscipleFamilyMembers(members);
    })();
    return () => { cancelled = true; };
  }, [user?.id, famille?.id]);

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
      
      // OPTIMISATION: Utiliser le cache pour les prochains rendez-vous (TTL: 1 minute - données plus dynamiques)
      const cacheKey = `disciple_dashboard_${effectiveId}`;
      
      const result = await getOrSetCache(
        cacheKey,
        async () => {
          // OPTIMISATION: Paralléliser les requêtes pour appointment et prayer
          const [apptResult, prayerResult] = await Promise.all([
            supabase
              .from('appointments')
              .select('*')
              .eq('status', 'scheduled')
              .or(`disciple_id.eq.${effectiveId},mentor_id.eq.${effectiveId}`)
              .gte('scheduled_date', new Date().toISOString())
              .order('scheduled_date', { ascending: true })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('prayer_sessions')
              .select('*')
              .eq('status', 'scheduled')
              .or(`disciple_id.eq.${effectiveId},mentor_id.eq.${effectiveId}`)
              .gte('scheduled_date', new Date().toISOString())
              .order('scheduled_date', { ascending: true })
              .limit(1)
              .maybeSingle()
          ]);
          
          return {
            nextRdv: apptResult.data || null,
            nextPrayer: prayerResult.data || null
          };
        },
        1 * 60 * 1000 // 1 minute (données dynamiques)
      );

      setStats({
        nextRdv: result.nextRdv,
        nextPrayer: result.nextPrayer
      });

    } catch (error) {
      handleError(error, { context: 'fetchDashboardData', discipleId: effectiveId }, "Impossible de charger le tableau de bord.");
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

  const handleExportDiscipleFamilyMembers = (formatExport) => {
    const list = discipleFamilyTable.filteredMembres || [];
    if (!list.length) {
      toast({ title: 'Aucune donnée', description: 'Aucun membre ne correspond aux filtres.', variant: 'destructive' });
      return;
    }
    const exportData = list.map((m) => ({
      'Prénom': m.first_name || '',
      'Nom': m.last_name || '',
      'Email': m.email || '',
      'Statut': m.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif',
      "Date d'inscription": m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy', { locale: fr }) : '',
    }));
    const filename = `membres_famille_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`;
    if (formatExport === 'pdf') {
      const uniqueId = `pdf-disciple-family-${Date.now()}`;
      const tempDiv = document.createElement('div');
      tempDiv.id = uniqueId;
      tempDiv.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;';
      tempDiv.innerHTML = `<div style="font-family:Arial"><h2>Membres de ma famille</h2><p>Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p><p>Total: ${list.length} membre(s)</p><table style="width:100%;border-collapse:collapse;border:1px solid #ddd"><thead><tr style="background:#f3f4f6"><th style="padding:10px;border:1px solid #ddd">Prénom</th><th style="padding:10px;border:1px solid #ddd">Nom</th><th style="padding:10px;border:1px solid #ddd">Email</th><th style="padding:10px;border:1px solid #ddd">Statut</th><th style="padding:10px;border:1px solid #ddd">Date</th></tr></thead><tbody>${list.map(m=>`<tr><td style="padding:8px;border:1px solid #ddd">${m.first_name||''}</td><td style="padding:8px;border:1px solid #ddd">${m.last_name||''}</td><td style="padding:8px;border:1px solid #ddd">${m.email||'-'}</td><td style="padding:8px;border:1px solid #ddd">${m.statut_spirituel==='inactif'?'Inactif':'Actif'}</td><td style="padding:8px;border:1px solid #ddd">${m.created_at?format(new Date(m.created_at),'dd/MM/yyyy',{locale:fr}):'-'}</td></tr>`).join('')}</tbody></table></div>`;
      document.body.appendChild(tempDiv);
      exportElementToPDF(uniqueId, `${filename}.pdf`, { title: 'Membres de ma famille', subtitle: 'Disciple', showHeader: true, showFooter: true }).finally(() => { try { document.getElementById(uniqueId)?.remove(); } catch (_) {} });
    } else {
      exportToExcel(exportData, filename, { title: 'Membres de ma famille', description: 'Disciple', additionalInfo: { 'Nombre': list.length.toString() } });
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
          <h1 className="text-3xl font-bold text-gray-900">
            {isViewingSelf ? "Mon Espace Disciple" : "Espace Disciple"}
          </h1>
          <p className="text-gray-600">
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
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200 cursor-pointer hover:border-indigo-400 transition-all shadow-sm" onClick={() => navigate('/my-appointments')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700">Prochain RDV</CardTitle>
            <Calendar className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500 py-2">Chargement...</div>
            ) : stats.nextRdv ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">
                  {format(new Date(stats.nextRdv.scheduled_date), 'dd MMM', { locale: fr })}
                </div>
                <p className="text-xs text-indigo-600">
                  {format(new Date(stats.nextRdv.scheduled_date), 'HH:mm')}
                </p>
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-2">Aucun rendez-vous</div>
            )}
            <p className="text-[10px] text-indigo-600 mt-2 flex items-center gap-1">
                Voir tout <TrendingUp size={10} />
            </p>
          </CardContent>
        </Card>

        {/* Next Prayer Card */}
        <Card className="bg-gradient-to-br from-pink-50 to-white border-pink-200 cursor-pointer hover:border-pink-400 transition-all shadow-sm" onClick={() => navigate('/my-prayers')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-pink-700">Prière à venir</CardTitle>
            <Heart className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500 py-2">Chargement...</div>
            ) : stats.nextPrayer ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">
                  {format(new Date(stats.nextPrayer.scheduled_date), 'dd MMM', { locale: fr })}
                </div>
                <p className="text-xs text-pink-600 line-clamp-1">
                   {stats.nextPrayer.prayer_topic}
                </p>
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-2">Aucune prière prévue</div>
            )}
            <p className="text-[10px] text-pink-600 mt-2 flex items-center gap-1">
                Voir tout <TrendingUp size={10} />
            </p>
          </CardContent>
        </Card>

        {/* Resources Shortcut */}
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200 hover:border-emerald-400 transition-all cursor-pointer shadow-sm" onClick={() => navigate('/ebooks')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Mes Ressources</CardTitle>
            <BookOpen className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-gray-900">Bibliothèque</div>
             <p className="text-xs text-gray-600">Accéder aux E-Books</p>
          </CardContent>
        </Card>

        {/* Video Shortcut */}
        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200 hover:border-red-400 transition-all cursor-pointer shadow-sm" onClick={() => navigate('/teaching-videos')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Enseignements</CardTitle>
            <PlayCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">Vidéos</div>
            <p className="text-xs text-gray-600">Regarder maintenant</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Arbre généalogique de ma famille */}
      {famille?.id && (
        <div className="mt-6">
          <ArbreGenealogiqueEmbed
            mode="family"
            famille={famille}
            title={`Arbre généalogique - ${famille.nom || 'Ma famille'}`}
            description="Lignée spirituelle de votre famille (Pasteur → Superviseur → Mentors → Disciples)."
            compactHeight={380}
          />
        </div>
      )}

      {/* Feature Links Grid */}
      <h2 className="text-xl font-bold text-gray-900 mt-8">Accès Rapide</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-gray-700 shadow-sm" onClick={() => navigate('/my-appointments')}>
              <Calendar className="text-indigo-600" size={24} />
              <span>Mes Rendez-vous</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-gray-200 bg-white hover:bg-pink-50 hover:border-pink-300 text-gray-700 shadow-sm" onClick={() => navigate('/my-prayers')}>
              <Heart className="text-pink-600" size={24} />
              <span>Mes Prières</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-gray-200 bg-white hover:bg-red-50 hover:border-red-300 text-gray-700 shadow-sm" onClick={() => navigate('/teaching-videos')}>
              <Video className="text-red-600" size={24} />
              <span>Enseignements</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-gray-200 bg-white hover:bg-teal-50 hover:border-teal-300 text-gray-700 shadow-sm" onClick={() => navigate('/testimonial-videos')}>
              <Quote className="text-teal-600" size={24} />
              <span>Témoignages</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-gray-700 shadow-sm" onClick={() => navigate('/books-to-read')}>
              <Library className="text-amber-600" size={24} />
              <span>Livres à Lire</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 border-gray-200 bg-white hover:bg-purple-50 hover:border-purple-300 text-gray-700 shadow-sm" onClick={() => navigate('/arbre-genealogique')}>
              <GitBranch className="text-purple-600" size={24} />
              <span>Arbre généalogique</span>
          </Button>
      </div>

      {/* Tableau « Membres de ma famille » (même structure que superviseur) */}
      {famille?.id && (
        <div className="mt-8">
          <MembersTableCard
            title="Membres de ma famille"
            description="Liste des membres de votre famille"
            filteredMembres={discipleFamilyTable.filteredMembres}
            paginatedMembres={discipleFamilyTable.paginatedMembres}
            selectedMembres={discipleFamilyTable.selectedMembres}
            searchTerm={discipleFamilyTable.searchTerm}
            setSearchTerm={discipleFamilyTable.setSearchTerm}
            statusFilter={discipleFamilyTable.statusFilter}
            setStatusFilter={discipleFamilyTable.setStatusFilter}
            dateFilter={discipleFamilyTable.dateFilter}
            setDateFilter={discipleFamilyTable.setDateFilter}
            progressionFilter={discipleFamilyTable.progressionFilter}
            setProgressionFilter={discipleFamilyTable.setProgressionFilter}
            itemsPerPage={discipleFamilyTable.itemsPerPage}
            setItemsPerPage={discipleFamilyTable.setItemsPerPage}
            currentPage={discipleFamilyTable.currentPage}
            setCurrentPage={discipleFamilyTable.setCurrentPage}
            totalPages={discipleFamilyTable.totalPages}
            membresProgression={discipleFamilyTable.membresProgression}
            membresSuiviPar={discipleFamilyTable.membresSuiviPar}
            toggleSelectAll={discipleFamilyTable.toggleSelectAll}
            toggleSelectMembre={discipleFamilyTable.toggleSelectMembre}
            showExport={true}
            showSelection={true}
            showFetchDisciples={false}
            showProgression={false}
            showSuiviPar={false}
            showNombreDisciples={false}
            onNavigate={navigate}
            onExportFilteredList={handleExportDiscipleFamilyMembers}
            toast={toast}
          />
        </div>
      )}

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
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Award className="text-amber-600" size={24} />
            </div>
            <DialogTitle className="text-center text-xl">Devenir Mentor</DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Entrez le code d'activation fourni par un responsable pour passer au statut de Mentor.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Code d'activation</label>
              <Input
                value={mentorCode}
                onChange={(e) => setMentorCode(e.target.value)}
                placeholder="Ex: MENTOR-2024-XY"
                className="bg-gray-50 border-gray-300 text-center uppercase tracking-widest"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setIsUpgradeModalOpen(false)}
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
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