
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Video, BarChart2, Megaphone, Send, Info, Church, AlertTriangle, Clock, Heart, UserPlus, Target, BookOpen, Moon, Download, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, getWeek, getQuarter, subWeeks, subMonths, subQuarters, format } from 'date-fns';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

const SendReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [discipleCount, setDiscipleCount] = useState(0);
  
  // Type de rapport (hebdomadaire, mensuel, trimestriel, annuel)
  const [reportType, setReportType] = useState('mensuel');
  
  // Pour les rapports mensuels
  const [reportMonth, setReportMonth] = useState(new Date().getMonth().toString());
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  
  // Pour les rapports hebdomadaires
  const [reportWeek, setReportWeek] = useState(() => {
    const now = new Date();
    return getWeek(now, { weekStartsOn: 1 }); // Semaine commence le lundi
  });
  const [reportYearWeek, setReportYearWeek] = useState(new Date().getFullYear().toString());
  
  // Pour les rapports trimestriels
  const [reportQuarter, setReportQuarter] = useState(() => {
    const now = new Date();
    return getQuarter(now).toString();
  });
  const [reportYearQuarter, setReportYearQuarter] = useState(new Date().getFullYear().toString());
  
  // Pour les rapports annuels
  const [reportYearAnnual, setReportYearAnnual] = useState(new Date().getFullYear().toString());

  const [stats, setStats] = useState({
    evangelizedCount: 0,
    videoViews: 0,
    completionRate: 0,
    sundayAttendanceCount: 0, // Culte Dimanche matin
    saturdayEveningCount: 0, // Culte samedi soir
    afterCulteCount: 0, // After Culte
    sundaySharingCount: 0,
    saturdayPrayerCount: 0,
    nouveauxConvertis: 0, // Nouveaux Convertis
    nouveauxArrivants: 0, // Nouveaux Arrivants
    sortiesEvangelisation: 0, // Sorties d'Évangélisation
    comFratDisciples: 0, // Com Frat Disciples
    veillee: 0, // Veillée
    meditationBible: 0, // Méditation Bible
    notes: ''
  });
  
  const [absentDisciples, setAbsentDisciples] = useState([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, reportType, reportMonth, reportYear, reportWeek, reportYearWeek, reportQuarter, reportYearQuarter, reportYearAnnual]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { count, error } = await supabase
        .from('cercle_personnes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (!error) {
        setDiscipleCount(count || 0);
      }

      // Fetch attendance counts for the selected month (mentor + disciples)
      if (count > 0) {
        // Récupérer les disciples avec leurs emails pour obtenir leurs IDs utilisateurs
        const { data: disciples } = await supabase
          .from('cercle_personnes')
          .select('id, email')
          .eq('user_id', user.id);
        
        // Récupérer les IDs utilisateurs des disciples
        const discipleUserIds = [];
        for (const disciple of disciples || []) {
          if (disciple.email) {
            const { data: profilData } = await supabase
              .from('profils')
              .select('id')
              .eq('email', disciple.email)
              .maybeSingle();
            
            if (profilData && profilData.id) {
              discipleUserIds.push(profilData.id);
            }
          }
        }
        
        // Inclure l'ID du mentor lui-même
        const allUserIds = [user.id, ...discipleUserIds];
        
        if (allUserIds.length > 0) {
          // Calculer les dates selon le type de rapport
          let periodStart, periodEnd;
          
          if (reportType === 'hebdomadaire') {
            // Pour hebdomadaire: calculer le début et la fin de la semaine
            const year = parseInt(reportYearWeek);
            const weekNum = parseInt(reportWeek);
            
            // Utiliser date-fns pour calculer correctement la semaine ISO
            // Créer une date approximative pour la semaine (janvier + jours jusqu'à la semaine)
            const jan4 = new Date(year, 0, 4); // 4 janvier est toujours dans la semaine 1
            const daysToAdd = (weekNum - 1) * 7;
            const targetDate = new Date(jan4);
            targetDate.setDate(jan4.getDate() + daysToAdd);
            
            // Ajuster pour que la date soit le lundi de cette semaine
            const weekStartDate = startOfWeek(targetDate, { weekStartsOn: 1 });
            const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
            
            periodStart = weekStartDate.toISOString().split('T')[0];
            periodEnd = new Date(weekEndDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +1 jour pour inclure le dernier jour
          } else if (reportType === 'trimestriel') {
            // Pour trimestriel: calculer le début et la fin du trimestre
            const year = parseInt(reportYearQuarter);
            const quarter = parseInt(reportQuarter);
            const quarterStartMonth = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
            
            const quarterStart = startOfQuarter(new Date(year, quarterStartMonth, 1));
            const quarterEnd = endOfQuarter(quarterStart);
            
            periodStart = quarterStart.toISOString().split('T')[0];
            periodEnd = new Date(quarterEnd.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          } else if (reportType === 'annuel') {
            // Pour annuel: calculer le début et la fin de l'année
            const year = parseInt(reportYearAnnual);
            periodStart = `${year}-01-01`;
            periodEnd = `${year + 1}-01-01`; // Début de l'année suivante
          } else {
            // Mensuel (par défaut)
            const selectedMonth = parseInt(reportMonth) + 1; // reportMonth est 0-indexed
            const selectedYear = parseInt(reportYear);
            
            periodStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
            periodEnd = selectedMonth === 12 
              ? `${selectedYear + 1}-01-01`
              : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
          }
          
          // Compter les présences pour tous les types d'événements
          const [sundayCount, sharingCount, prayerCount, saturdayEveningCount, afterCulteCount] = await Promise.all([
            supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_type', 'sunday_worship')
              .eq('status', 'present')
              .in('disciple_id', allUserIds)
              .gte('attendance_date', periodStart)
              .lt('attendance_date', periodEnd),
            supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_type', 'sunday_sharing')
              .eq('status', 'present')
              .in('disciple_id', allUserIds)
              .gte('attendance_date', periodStart)
              .lt('attendance_date', periodEnd),
            supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_type', 'saturday_prayer')
              .eq('status', 'present')
              .in('disciple_id', allUserIds)
              .gte('attendance_date', periodStart)
              .lt('attendance_date', periodEnd),
            // Culte du Samedi Soir
            supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_type', 'saturday_evening_worship')
              .eq('status', 'present')
              .in('disciple_id', allUserIds)
              .gte('attendance_date', periodStart)
              .lt('attendance_date', periodEnd),
            // After Culte du Dimanche
            supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_type', 'after_culte')
              .eq('status', 'present')
              .in('disciple_id', allUserIds)
              .gte('attendance_date', periodStart)
              .lt('attendance_date', periodEnd)
          ]);
          
          setStats(prev => ({
            ...prev,
            sundayAttendanceCount: sundayCount.count || 0,
            sundaySharingCount: sharingCount.count || 0,
            saturdayPrayerCount: prayerCount.count || 0,
            saturdayEveningCount: saturdayEveningCount.count || 0,
            afterCulteCount: afterCulteCount.count || 0
          }));
          
          // Récupérer les absences des disciples pour la période sélectionnée (uniquement dimanche)
          await fetchAbsentDisciples(discipleUserIds, periodStart, periodEnd);
        }
      }

    } catch (error) {
      console.error("Error fetching report data", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAbsentDisciples = async (discipleUserIds, periodStart, periodEnd) => {
    try {
      if (discipleUserIds.length === 0) {
        setAbsentDisciples([]);
        return;
      }
      
      // Récupérer les noms des disciples
      const { data: disciplesData } = await supabase
        .from('cercle_personnes')
        .select('id, name, first_name, last_name, email')
        .eq('user_id', user.id);
      
      // Créer une map disciple_id -> nom du disciple
      const discipleNameMap = {};
      
      for (const disciple of disciplesData || []) {
        if (disciple.email) {
          const { data: profilData } = await supabase
            .from('profils')
            .select('id')
            .eq('email', disciple.email)
            .maybeSingle();
          
          if (profilData && profilData.id) {
            discipleNameMap[profilData.id] = disciple.name || `${disciple.first_name || ''} ${disciple.last_name || ''}`.trim() || 'Disciple sans nom';
          }
        }
      }
      
      // Récupérer les absences du dimanche pour le mois en cours
      const { data: absencesData, error: absencesError } = await supabase
        .from('attendance_tracking')
        .select('disciple_id, attendance_date')
        .in('disciple_id', discipleUserIds)
        .eq('attendance_type', 'sunday_worship')
        .eq('status', 'absent')
        .gte('attendance_date', periodStart)
        .lt('attendance_date', periodEnd)
        .order('attendance_date', { ascending: true });
      
      if (absencesError) throw absencesError;
      
      // Grouper les absences par disciple (dédupliquer)
      const discipleAbsences = {};
      const seenAbsences = new Set();
      
      absencesData?.forEach(record => {
        const absenceKey = `${record.disciple_id}-${record.attendance_date}`;
        if (seenAbsences.has(absenceKey)) {
          return; // Ignorer les doublons
        }
        
        if (!discipleAbsences[record.disciple_id]) {
          discipleAbsences[record.disciple_id] = {
            count: 0,
            discipleId: record.disciple_id
          };
        }
        discipleAbsences[record.disciple_id].count++;
        seenAbsences.add(absenceKey);
      });
      
      // Convertir en tableau et ajouter les noms
      const absentDisciplesList = Object.keys(discipleAbsences)
        .map(discipleId => ({
          discipleId,
          discipleName: discipleNameMap[discipleId] || 'Disciple inconnu',
          absenceCount: discipleAbsences[discipleId].count
        }))
        .filter(d => d.absenceCount > 0)
        .sort((a, b) => {
          if (b.absenceCount !== a.absenceCount) {
            return b.absenceCount - a.absenceCount;
          }
          return a.discipleName.localeCompare(b.discipleName);
        });
      
      setAbsentDisciples(absentDisciplesList);
    } catch (error) {
      console.error("Error fetching absent disciples", error);
      setAbsentDisciples([]);
    }
  };

  const handleSend = async () => {
    setSubmitting(true);
    try {
      // Préparer les données selon le type de rapport
      const reportData = {
        user_id: user.id,
        report_type: reportType,
        content: stats.notes,
        statistics_snapshot: {
            disciples: discipleCount,
            evangelization: stats.evangelizedCount,
            video_views: stats.videoViews,
            completion_rate: stats.completionRate,
            sunday_attendance_count: stats.sundayAttendanceCount,
            saturday_evening_count: stats.saturdayEveningCount || 0,
            after_culte_count: stats.afterCulteCount || 0,
            sunday_sharing_count: stats.sundaySharingCount || 0,
            saturday_prayer_count: stats.saturdayPrayerCount || 0,
            nouveaux_convertis: stats.nouveauxConvertis || 0,
            nouveaux_arrivants: stats.nouveauxArrivants || 0,
            sorties_evangelisation: stats.sortiesEvangelisation || 0,
            com_frat_disciples: stats.comFratDisciples || 0,
            veillee: stats.veillee || 0,
            meditation_bible: stats.meditationBible || 0
        },
        status: 'submitted'
      };

      // Ajouter les champs selon le type de rapport
      if (reportType === 'hebdomadaire') {
        reportData.week_number = parseInt(reportWeek);
        reportData.year = parseInt(reportYearWeek);
      } else if (reportType === 'trimestriel') {
        reportData.quarter = parseInt(reportQuarter);
        reportData.year = parseInt(reportYearQuarter);
      } else if (reportType === 'annuel') {
        reportData.year = parseInt(reportYearAnnual);
      } else {
        // Mensuel
        reportData.month = parseInt(reportMonth);
        reportData.year = parseInt(reportYear);
      }

      const { error } = await supabase.from('reports').insert([reportData]);

      if (error) throw error;

      // Récupérer l'email du pasteur de tutelle
      let pasteurEmail = '';
      try {
        // Récupérer le profil de l'utilisateur pour obtenir pasteur_id
        const { data: userProfile } = await supabase
          .from('profils')
          .select('pasteur_id')
          .eq('id', user.id)
          .single();

        if (userProfile && userProfile.pasteur_id) {
          // Récupérer l'email du pasteur
          const { data: pasteurProfile } = await supabase
            .from('profils')
            .select('email')
            .eq('id', userProfile.pasteur_id)
            .single();

          if (pasteurProfile && pasteurProfile.email) {
            pasteurEmail = pasteurProfile.email;
          }
        }
      } catch (emailError) {
        console.error('Erreur lors de la récupération de l\'email du pasteur:', emailError);
      }

      const reportTypeLabel = reportType === 'hebdomadaire' ? 'hebdomadaire' : 
                              reportType === 'trimestriel' ? 'trimestriel' : 
                              reportType === 'annuel' ? 'annuel' : 'mensuel';
      
      const descriptionMessage = pasteurEmail 
        ? `Merci pour votre fidélité. Votre rapport a été envoyé à ${pasteurEmail}.`
        : "Merci pour votre fidélité. Votre pasteur de tutelle a bien reçu vos données.";
      
      toast({
        title: `Rapport ${reportTypeLabel} envoyé avec succès !`,
        description: descriptionMessage,
        className: "bg-green-600 text-white border-none"
      });
      
      setStats({ ...stats, notes: '' });

    } catch (error) {
      console.error("Error sending report", error);
      toast({
        variant: "destructive",
        title: "Erreur d'envoi",
        description: "Impossible d'envoyer le rapport. Veuillez réessayer."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const years = ["2024", "2025", "2026"];
  
  // Générer les semaines de l'année (1-52)
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  
  // Générer les trimestres (1-4)
  const quarters = [
    { value: "1", label: "Trimestre 1 (Jan-Mar)" },
    { value: "2", label: "Trimestre 2 (Avr-Juin)" },
    { value: "3", label: "Trimestre 3 (Juil-Sep)" },
    { value: "4", label: "Trimestre 4 (Oct-Déc)" }
  ];
  
  // Fonction pour obtenir le titre dynamique
  const getReportTitle = () => {
    switch (reportType) {
      case 'hebdomadaire':
        return 'Rapport Hebdomadaire';
      case 'trimestriel':
        return 'Rapport Trimestriel';
      case 'annuel':
        return 'Rapport Annuel';
      default:
        return 'Rapport Mensuel';
    }
  };
  
  // Fonction pour obtenir la description dynamique
  const getReportDescription = () => {
    switch (reportType) {
      case 'hebdomadaire':
        return 'Transmettez vos statistiques et vos témoignages pour la semaine sélectionnée.';
      case 'trimestriel':
        return 'Transmettez vos statistiques et vos témoignages pour le trimestre sélectionné.';
      case 'annuel':
        return 'Transmettez vos statistiques et vos témoignages pour l\'année sélectionnée.';
      default:
        return 'Transmettez vos statistiques et vos témoignages pour le mois sélectionné.';
    }
  };

  // Fonction pour obtenir la période du rapport
  const getReportPeriod = () => {
    switch (reportType) {
      case 'hebdomadaire':
        return `Semaine ${reportWeek} ${reportYearWeek}`;
      case 'trimestriel':
        return `Trimestre ${reportQuarter} ${reportYearQuarter}`;
      case 'annuel':
        return `Année ${reportYearAnnual}`;
      default:
        const monthName = months[parseInt(reportMonth)];
        return `${monthName} ${reportYear}`;
    }
  };

  // Fonction pour exporter en Excel avec UTF-8 BOM pour Excel
  const handleExportExcel = () => {
    // Fonction pour échapper les valeurs CSV
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Si contient des guillemets, virgules ou saut de ligne, échapper
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Construire le CSV avec formatage correct : Colonne A = Indicateurs, Colonne B = Valeurs
    const csvRows = [];
    
    // En-tête avec UTF-8 BOM pour Excel (Colonne A = Indicateurs, Colonne B = Valeurs)
    csvRows.push('\ufeffIndicateurs,Valeurs');
    
    // Section Informations Générales
    csvRows.push('Informations Générales,'); // Colonne A = titre section, Colonne B = vide
    csvRows.push(`Type de rapport,${escapeCSV(getReportTitle())}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Période,${escapeCSV(getReportPeriod())}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Date d'export,${escapeCSV(format(new Date(), 'dd/MM/yyyy HH:mm'))}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(','); // Ligne vide (Colonne A et B vides)
    
    // Section Présences et Activités
    csvRows.push('Présences et Activités,'); // Colonne A = titre section, Colonne B = vide
    csvRows.push(`Nombre de Disciples,${discipleCount}`); // Colonne A = label, Colonne B = valeur numérique
    csvRows.push(`Présence Culte Dimanche matin,${stats.sundayAttendanceCount}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Présence Culte du samedi soir,${stats.saturdayEveningCount || 0}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Présence à l'After Culte,${stats.afterCulteCount || 0}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Présences à la Prière,${stats.saturdayPrayerCount || 0}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Présences au Partage,${stats.sundaySharingCount || 0}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(','); // Ligne vide
    
    // Section Évangélisation
    csvRows.push('Évangélisation,'); // Colonne A = titre section, Colonne B = vide
    csvRows.push(`Personnes Évangélisées,${stats.evangelizedCount}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Nouveaux Convertis,${stats.nouveauxConvertis || 0}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Nouveaux Arrivants,${stats.nouveauxArrivants || 0}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Sorties d'Évangélisation,${stats.sortiesEvangelisation || 0}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(','); // Ligne vide
    
    // Section Formation et Engagement
    csvRows.push('Formation et Engagement,'); // Colonne A = titre section, Colonne B = vide
    csvRows.push(`Vidéos Visionnées (modules),${stats.videoViews}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Taux de Complétion (%),${stats.completionRate}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(','); // Ligne vide
    
    // Section Activités Communautaires
    csvRows.push('Activités Communautaires,'); // Colonne A = titre section, Colonne B = vide
    csvRows.push(`Com Frat Disciples,${stats.comFratDisciples || 0}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Veillée,${stats.veillee || 0}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(`Méditation Bible,${stats.meditationBible || 0}`); // Colonne A = label, Colonne B = valeur
    csvRows.push(','); // Ligne vide
    
    // Section Témoignage / Notes
    csvRows.push('Témoignage / Notes,'); // Colonne A = titre section, Colonne B = vide
    if (stats.notes && stats.notes.trim().length > 0) {
      csvRows.push(`${escapeCSV(stats.notes)},`); // Colonne A = témoignage, Colonne B = vide
    } else {
      csvRows.push('Aucun témoignage,'); // Colonne A = message, Colonne B = vide
    }

    // Créer le blob avec UTF-8 BOM pour Excel
    const csvContent = csvRows.join('\r\n'); // Utiliser \r\n pour Excel (saut de ligne Windows)
    const BOM = '\ufeff'; // UTF-8 BOM pour Excel
    
    // Créer le blob avec type correct pour Excel
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    // Sauvegarder le fichier
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `rapport_${reportType}_${timestamp}.csv`;
    
    saveAs(blob, filename);
  };

  // Fonction pour créer un tableau dans le PDF
  const createTable = (pdf, startY, headers, data, margin) => {
    const lineHeight = 7;
    const cellPadding = 3;
    const col1Width = 120;
    const col2Width = 50;
    let yPos = startY;

    // En-tête
    pdf.setFillColor(139, 92, 246);
    pdf.setDrawColor(139, 92, 246);
    pdf.rect(margin, yPos, col1Width + col2Width, lineHeight, 'FD');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(headers[0], margin + cellPadding, yPos + 5);
    pdf.text(headers[1], margin + col1Width + cellPadding, yPos + 5);
    
    yPos += lineHeight;

    // Lignes de données
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    data.forEach((row, index) => {
      if (yPos + lineHeight > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        yPos = margin;
      }
      
      // Bordure de ligne
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPos, col1Width + col2Width, lineHeight, 'D');
      
      // Contenu
      pdf.text(row[0] || '', margin + cellPadding, yPos + 5);
      pdf.text(String(row[1] || ''), margin + col1Width + cellPadding, yPos + 5);
      
      yPos += lineHeight;
    });

    return yPos + 5;
  };

  // Fonction pour exporter en PDF
  const handleExportPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Titre
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(getReportTitle(), margin, yPosition);
    yPosition += 10;

    // Période
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Période: ${getReportPeriod()}`, margin, yPosition);
    yPosition += 8;
    pdf.text(`Date d'export: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin, yPosition);
    yPosition += 15;

    // Section Présences et Activités
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Présences et Activités', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    const presenceData = [
      ['Nombre de Disciples', discipleCount],
      ['Présence Culte Dimanche matin', stats.sundayAttendanceCount],
      ['Présence Culte du samedi soir', stats.saturdayEveningCount || 0],
      ['Présence à l\'After Culte', stats.afterCulteCount || 0],
      ['Présences à la Prière', stats.saturdayPrayerCount || 0],
      ['Présences au Partage', stats.sundaySharingCount || 0]
    ];

    yPosition = createTable(pdf, yPosition, ['Indicateurs', 'Valeurs'], presenceData, margin);

    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = margin;
    } else {
      yPosition += 10;
    }

    // Section Évangélisation
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Évangélisation', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    const evangelizationData = [
      ['Personnes Évangélisées', stats.evangelizedCount],
      ['Nouveaux Convertis', stats.nouveauxConvertis || 0],
      ['Nouveaux Arrivants', stats.nouveauxArrivants || 0],
      ['Sorties d\'Évangélisation', stats.sortiesEvangelisation || 0]
    ];

    yPosition = createTable(pdf, yPosition, ['Indicateurs', 'Valeurs'], evangelizationData, margin);

    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = margin;
    } else {
      yPosition += 10;
    }

    // Section Formation et Engagement
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Formation et Engagement', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    const formationData = [
      ['Vidéos Visionnées (modules)', stats.videoViews],
      ['Taux de Complétion (%)', stats.completionRate]
    ];

    yPosition = createTable(pdf, yPosition, ['Indicateurs', 'Valeurs'], formationData, margin);

    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = margin;
    } else {
      yPosition += 10;
    }

    // Section Activités Communautaires
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Activités Communautaires', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    const communityData = [
      ['Com Frat Disciples', stats.comFratDisciples || 0],
      ['Veillée', stats.veillee || 0],
      ['Méditation Bible', stats.meditationBible || 0]
    ];

    yPosition = createTable(pdf, yPosition, ['Indicateurs', 'Valeurs'], communityData, margin);

    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = margin;
    } else {
      yPosition += 10;
    }

    // Section Témoignage / Notes
    if (stats.notes && stats.notes.trim().length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Témoignage / Notes', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const splitNotes = pdf.splitTextToSize(stats.notes, pageWidth - 2 * margin);
      pdf.text(splitNotes, margin, yPosition);
    }

    // Sauvegarder le PDF
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `rapport_${reportType}_${timestamp}.pdf`;
    pdf.save(filename);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{getReportTitle()}</h1>
           <p className="text-gray-600 mt-1">{getReportDescription()}</p>
        </div>
        
        {/* Type de rapport et Date Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Sélection du type de rapport */}
          <div className="bg-white p-2 rounded-xl border border-gray-300 shadow-sm">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-[160px] bg-white text-gray-900 border-gray-300 hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none">
                <SelectValue placeholder="Type de rapport" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 border-gray-200">
                <SelectItem value="hebdomadaire" className="focus:bg-gray-100 focus:!text-gray-900">Hebdomadaire</SelectItem>
                <SelectItem value="mensuel" className="focus:bg-gray-100 focus:!text-gray-900">Mensuel</SelectItem>
                <SelectItem value="trimestriel" className="focus:bg-gray-100 focus:!text-gray-900">Trimestriel</SelectItem>
                <SelectItem value="annuel" className="focus:bg-gray-100 focus:!text-gray-900">Annuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtres selon le type de rapport */}
          <div className="flex gap-3 bg-white p-2 rounded-xl border border-gray-300 shadow-sm">
            {reportType === 'hebdomadaire' && (
              <>
                <Select value={reportWeek} onValueChange={setReportWeek}>
                  <SelectTrigger className="w-[140px] bg-white text-gray-900 border-gray-300 hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none">
                    <SelectValue placeholder="Semaine" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border-gray-200">
                    {weeks.map((w) => (
                      <SelectItem key={w} value={w.toString()} className="focus:bg-gray-100 focus:!text-gray-900">Semaine {w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-[1px] bg-gray-300 my-1"></div>
                <Select value={reportYearWeek} onValueChange={setReportYearWeek}>
                  <SelectTrigger className="w-[100px] bg-white text-gray-900 border-gray-300 hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border-gray-200">
                    {years.map((y) => (
                      <SelectItem key={y} value={y} className="focus:bg-gray-100 focus:!text-gray-900">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            
            {reportType === 'mensuel' && (
              <>
                <Select value={reportMonth} onValueChange={setReportMonth}>
                  <SelectTrigger className="w-[140px] bg-white text-gray-900 border-gray-300 hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none">
                    <SelectValue placeholder="Mois" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border-gray-200">
                    {months.map((m, i) => (
                      <SelectItem key={i} value={i.toString()} className="focus:bg-gray-100 focus:!text-gray-900">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-[1px] bg-gray-300 my-1"></div>
                <Select value={reportYear} onValueChange={setReportYear}>
                  <SelectTrigger className="w-[100px] bg-white text-gray-900 border-gray-300 hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border-gray-200">
                    {years.map((y) => (
                      <SelectItem key={y} value={y} className="focus:bg-gray-100 focus:!text-gray-900">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            
            {reportType === 'trimestriel' && (
              <>
                <Select value={reportQuarter} onValueChange={setReportQuarter}>
                  <SelectTrigger className="w-[180px] bg-white text-gray-900 border-gray-300 hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none">
                    <SelectValue placeholder="Trimestre" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border-gray-200">
                    {quarters.map((q) => (
                      <SelectItem key={q.value} value={q.value} className="focus:bg-gray-100 focus:!text-gray-900">{q.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-[1px] bg-gray-300 my-1"></div>
                <Select value={reportYearQuarter} onValueChange={setReportYearQuarter}>
                  <SelectTrigger className="w-[100px] bg-white text-gray-900 border-gray-300 hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border-gray-200">
                    {years.map((y) => (
                      <SelectItem key={y} value={y} className="focus:bg-gray-100 focus:!text-gray-900">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            
            {reportType === 'annuel' && (
              <>
                <Select value={reportYearAnnual} onValueChange={setReportYearAnnual}>
                  <SelectTrigger className="w-[120px] bg-white text-gray-900 border-gray-300 hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0 focus:outline-none">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border-gray-200">
                    {years.map((y) => (
                      <SelectItem key={y} value={y} className="focus:bg-gray-100 focus:!text-gray-900">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Témoignage / Notes Section - Horizontal */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 text-lg">Témoignage / Notes</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={handleExportExcel} 
                className="px-3 py-2 h-auto text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white focus:ring-0 focus:ring-offset-0 focus:outline-none shrink-0"
                title="Exporter en Excel"
              >
                <FileText size={14} className="mr-1"/> Excel
              </Button>
              <Button 
                onClick={handleExportPDF} 
                className="px-3 py-2 h-auto text-xs font-medium bg-red-600 hover:bg-red-700 text-white focus:ring-0 focus:ring-offset-0 focus:outline-none shrink-0"
                title="Exporter en PDF"
              >
                <Download size={14} className="mr-1"/> PDF
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={submitting}
                className="px-4 py-2 h-auto text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white focus:ring-0 focus:ring-offset-0 focus:outline-none shrink-0"
              >
                {submitting ? "Envoi en cours..." : <><Send size={16} className="mr-2"/> Envoyer le Rapport</>}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea 
            value={stats.notes} 
            onChange={(e) => setStats({...stats, notes: e.target.value})}
            placeholder="Partagez un témoignage marquant ou des défis rencontrés ce mois-ci..."
            className="w-full bg-white border-gray-300 text-gray-900 resize-none min-h-[120px] focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-300"
          />
        </CardContent>
      </Card>

      {/* Main Content - KPIs in grid (4 per row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            
            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Users size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Total Disciples</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">{discipleCount}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                    <Info size={12} /> <span className="font-bold capitalize">Calculé automatiquement</span>
                  </div>
               </CardContent>
            </Card>

            {/* Absences de la période sélectionnée */}
            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <CardHeader className="border-b border-gray-200 pb-4">
                  <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
                     <AlertTriangle className="text-red-500" size={20} />
                     Absences au Culte du Dimanche
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                  {loading ? (
                     <p className="text-gray-600 text-sm">Chargement...</p>
                  ) : absentDisciples.length === 0 ? (
                     <p className="text-gray-600 text-sm">
                        Aucune absence enregistrée {reportType === 'hebdomadaire' ? 'cette semaine' : reportType === 'trimestriel' ? 'ce trimestre' : 'ce mois-ci'}
                     </p>
                  ) : (
                     <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {absentDisciples.map((disciple, index) => (
                           <div key={disciple.discipleId || index} className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                              <span className="text-gray-900 font-medium text-sm">{disciple.discipleName}</span>
                              <span className="text-red-600 font-semibold text-sm">
                                 Absent{disciple.absenceCount > 1 ? 's' : ''} {disciple.absenceCount} fois
                              </span>
                           </div>
                        ))}
                     </div>
                  )}
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Church size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Présence Culte Dimanche matin</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{stats.sundayAttendanceCount}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                    <Info size={12} /> <span className="font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Church size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Présence Culte du samedi soir</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">{stats.saturdayEveningCount || 0}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                    <Info size={12} /> <span className="font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Users size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Présence à l'After Culte</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-800 bg-clip-text text-transparent">{stats.afterCulteCount || 0}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                    <Info size={12} /> <span className="font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Présences à la Prière</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent">{stats.saturdayPrayerCount || 0}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                    <Info size={12} /> <span className="font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Users size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Présences au Partage</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">{stats.sundaySharingCount || 0}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                    <Info size={12} /> <span className="font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Megaphone size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Personnes Évangélisées</p>
                  <div className="flex flex-col gap-2">
                     <Input 
                        type="number"
                        min="0"
                        value={stats.evangelizedCount}
                        onChange={(e) => setStats({...stats, evangelizedCount: parseInt(e.target.value) || 0})}
                        className="w-24 bg-white border-gray-300 text-red-600 text-xl font-bold h-10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-300"
                     />
                     <span className="text-gray-600 text-sm font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Video size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Vidéos Visionnées</p>
                  <div className="flex flex-col gap-2">
                     <Input 
                        type="number"
                        min="0"
                        value={stats.videoViews}
                        onChange={(e) => setStats({...stats, videoViews: parseInt(e.target.value) || 0})}
                        className="w-24 bg-white border-gray-300 text-pink-600 text-xl font-bold h-10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-300"
                     />
                     <span className="text-gray-600 text-sm font-bold capitalize">Modules</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <BarChart2 size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Taux de Complétion</p>
                  <div className="flex flex-col gap-2">
                     <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={stats.completionRate}
                        onChange={(e) => setStats({...stats, completionRate: parseInt(e.target.value) || 0})}
                        className="w-24 bg-white border-gray-300 text-orange-600 text-xl font-bold h-10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-300"
                     />
                     <span className="text-gray-600 text-sm font-bold capitalize">% Global</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Heart size={80} className="text-green-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Nouveaux Convertis</p>
                  <div className="flex flex-col gap-2">
                     <Input 
                        type="number"
                        min="0"
                        value={stats.nouveauxConvertis}
                        onChange={(e) => setStats({...stats, nouveauxConvertis: parseInt(e.target.value) || 0})}
                        className="w-24 bg-white border-gray-300 text-green-600 text-xl font-bold h-10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-300"
                     />
                     <span className="text-gray-600 text-sm font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <UserPlus size={80} className="text-red-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Nouveaux Arrivants</p>
                  <div className="flex flex-col gap-2">
                     <Input 
                        type="number"
                        min="0"
                        value={stats.nouveauxArrivants}
                        onChange={(e) => setStats({...stats, nouveauxArrivants: parseInt(e.target.value) || 0})}
                        className="w-24 bg-white border-gray-300 text-red-600 text-xl font-bold h-10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-300"
                     />
                     <span className="text-gray-600 text-sm font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Target size={80} className="text-teal-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Sorties d'Évangélisation</p>
                  <div className="flex flex-col gap-2">
                     <Input 
                        type="number"
                        min="0"
                        value={stats.sortiesEvangelisation}
                        onChange={(e) => setStats({...stats, sortiesEvangelisation: parseInt(e.target.value) || 0})}
                        className="w-24 bg-white border-gray-300 text-teal-600 text-xl font-bold h-10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-300"
                     />
                     <span className="text-gray-600 text-sm font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Users size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Com Frat Disciples</p>
                  <div className="flex flex-col gap-2">
                     <Input 
                        type="number"
                        min="0"
                        value={stats.comFratDisciples}
                        onChange={(e) => setStats({...stats, comFratDisciples: parseInt(e.target.value) || 0})}
                        className="w-24 bg-white border-gray-300 text-purple-600 text-xl font-bold h-10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-300"
                     />
                     <span className="text-gray-600 text-sm font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Moon size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Veillée</p>
                  <div className="flex flex-col gap-2">
                     <Input 
                        type="number"
                        min="0"
                        value={stats.veillee}
                        onChange={(e) => setStats({...stats, veillee: parseInt(e.target.value) || 0})}
                        className="w-24 bg-white border-gray-300 text-purple-600 text-xl font-bold h-10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-300"
                     />
                     <span className="text-gray-600 text-sm font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <BookOpen size={80} className="text-orange-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-gray-900 font-medium text-sm mb-1 uppercase">Méditation Bible</p>
                  <div className="flex flex-col gap-2">
                     <Input 
                        type="number"
                        min="0"
                        value={stats.meditationBible}
                        onChange={(e) => setStats({...stats, meditationBible: parseInt(e.target.value) || 0})}
                        className="w-24 bg-white border-gray-300 text-orange-600 text-xl font-bold h-10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-300"
                     />
                     <span className="text-gray-600 text-sm font-bold capitalize">{reportType === 'hebdomadaire' ? 'Cette semaine' : reportType === 'trimestriel' ? 'Ce trimestre' : 'Ce mois-ci'}</span>
                  </div>
               </CardContent>
            </Card>

      </div>
    </div>
  );
};

export default SendReport;
