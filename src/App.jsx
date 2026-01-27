
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RoleProvider, useRole } from '@/context/RoleContext';
import { ThemeProvider } from '@/context/ThemeContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import UpdatePassword from './pages/UpdatePassword';
import { useToast } from '@/components/ui/use-toast';

// Public Pages
import HomePage from './pages/HomePage';
import SignupMentor from './pages/SignupMentor';
import SignupDisciple from './pages/SignupDisciple';
import SignupSuperviseur from './pages/SignupSuperviseur';
import SignupPasteur from './pages/SignupPasteur';

// Dashboard imports
import MentorDashboard from './pages/dashboards/MentorDashboard';
import DiscipleDashboard from './pages/dashboards/DiscipleDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import SuperviseurDashboard from './pages/dashboards/SuperviseurDashboard';
import DashboardHome from './pages/DashboardHome';

// Feature Pages
import Circles from './pages/Circles';
import Disciples from './pages/Disciples';
import DiscipleDetail from './pages/DiscipleDetail';
import PrayerList from './pages/PrayerList';
import SendReport from './pages/SendReport';
import Statistics from './pages/Statistics'; // Import Statistics Page
import Evangelization from './pages/Evangelization';
import Engagement from './pages/Engagement';
import Transformation from './pages/Transformation';
import ParcoursDetail from './pages/ParcoursDetail';
import Ebooks from './pages/Ebooks';
import TeachingVideos from './pages/TeachingVideos';
import TestimonialVideos from './pages/TestimonialVideos';
import WordMeditation from './pages/WordMeditation';
import BooksToRead from './pages/BooksToRead';
import BookReader from './pages/BookReader';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Menu from './pages/Menu';
import ImpactX from './pages/ImpactX';
import ImpactXVideo from './pages/ImpactXVideo';
import SearchPage from './pages/SearchPage';
import HelpFAQ from './pages/HelpFAQ';
import FeedbackForm from './pages/FeedbackForm';
import NotificationCenter from './pages/NotificationCenter';
import MeetingScheduler from './pages/MeetingScheduler';
import PrayerReminder from './pages/PrayerReminder';
import MySummaries from './pages/MySummaries';
import AttendanceTracking from './pages/AttendanceTracking';
import FamillesDisciples from './pages/FamillesDisciples';

// New Feature Pages
import AppointmentsList from './pages/AppointmentsList';
import PrayerSessionsList from './pages/PrayerSessionsList';
import HistoryLog from './pages/HistoryLog';

// Admin imports
import AdminReportsView from './pages/AdminReportsView';
import AdminTestimonyModeration from './pages/AdminTestimonyModeration';
import AdminAccessCodeManager from './pages/AdminAccessCodeManager';
import AdminActivityLog from './pages/AdminActivityLog';
import AdminFeedback from './pages/AdminFeedback';
import PerformanceDashboard from './components/PerformanceDashboard';

import { Helmet } from 'react-helmet';
import { Toaster } from "@/components/ui/toaster";

// Composant pour protéger l'accès aux dashboards
const ProtectedDashboard = ({ allowedRoles, children, dashboardName }) => {
    const { role, loading } = useRole();
    const navigate = useNavigate();
    const { toast } = useToast();
    
    React.useEffect(() => {
        if (!loading && role && !allowedRoles.includes(role)) {
            toast({
                variant: "destructive",
                title: "Accès non autorisé",
                description: `Vous n'avez pas les permissions nécessaires pour accéder au ${dashboardName}.`
            });
            
            // Rediriger vers le dashboard approprié selon le rôle
            const redirectPath = {
                'super_admin': '/space/pasteur',
                'admin': '/space/pasteur',
                'pasteur': '/space/pasteur',
                'superviseur': '/space/superviseur',
                'mentor': '/space/mentor',
                'disciple': '/space/disciple'
            }[role] || '/home';
            
            navigate(redirectPath, { replace: true });
        }
    }, [role, loading, allowedRoles, dashboardName, navigate, toast]);
    
    if (loading) return <div className="flex items-center justify-center h-screen text-white">Chargement...</div>;
    
    if (!allowedRoles.includes(role)) {
        return <div className="flex items-center justify-center h-screen text-white">Redirection en cours...</div>;
    }
    
    return children;
};

// Dashboard Router Component
const DashboardRouter = () => {
    const { role, loading } = useRole();
    
    if (loading) return <div className="flex items-center justify-center h-screen text-white">Chargement...</div>;
    
    // Routing par rôle spécifique (ordre important)
    if (role === 'super_admin' || role === 'admin' || role === 'pasteur') {
        return <AdminDashboard />;
    }
    if (role === 'superviseur') {
        return <SuperviseurDashboard />;
    }
    if (role === 'mentor') {
        return <MentorDashboard />;
    }
    // Par défaut, afficher le Dashboard Disciple
    return <DiscipleDashboard />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={!user ? <HomePage /> : <Navigate to="/home" replace />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/signup/mentor" element={<SignupMentor />} />
      <Route path="/signup/disciple" element={<SignupDisciple />} />
      <Route path="/signup/superviseur" element={<SignupSuperviseur />} />
      <Route path="/signup/pasteur" element={<SignupPasteur />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* New Home for Logged In Users */}
        <Route path="home" element={<DashboardHome />} />

        {/* Smart Dashboard Routing */}
        <Route path="dashboard" element={<DashboardRouter />} />
        
        {/* Explicit Routes for each dashboard with access control */}
        {/* Règles d'accès :
            - Superviseur : ne peut pas accéder au dashboard pasteur, mais peut accéder au dashboard mentor et disciple
            - Mentor : ne peut pas accéder au dashboard pasteur ni au dashboard superviseur
            - Disciple : ne peut accéder qu'à son dashboard uniquement */}
        <Route path="space/pasteur" element={
          <ProtectedDashboard allowedRoles={['super_admin', 'admin', 'pasteur']} dashboardName="Dashboard Pasteur">
            <AdminDashboard />
          </ProtectedDashboard>
        } />
        <Route path="space/superviseur" element={
          <ProtectedDashboard allowedRoles={['super_admin', 'admin', 'pasteur', 'superviseur']} dashboardName="Dashboard Superviseur">
            <SuperviseurDashboard />
          </ProtectedDashboard>
        } />
        <Route path="space/mentor" element={
          <ProtectedDashboard allowedRoles={['super_admin', 'admin', 'pasteur', 'superviseur', 'mentor']} dashboardName="Dashboard Mentor">
            <MentorDashboard />
          </ProtectedDashboard>
        } />
        <Route path="space/disciple" element={
          <ProtectedDashboard allowedRoles={['super_admin', 'admin', 'pasteur', 'superviseur', 'disciple']} dashboardName="Dashboard Disciple">
            <DiscipleDashboard />
          </ProtectedDashboard>
        } />
        
        {/* Shared Features */}
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<NotificationCenter />} />
        <Route path="menu" element={<Menu />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="help" element={<HelpFAQ />} />
        <Route path="feedback" element={<FeedbackForm />} />
        <Route path="scheduler" element={<MeetingScheduler />} />
        <Route path="attendance" element={<AttendanceTracking />} /> 
        <Route path="statistics" element={<Statistics />} />
        <Route path="familles" element={<FamillesDisciples />} />

        {/* New Appointment System Routes */}
        <Route path="my-appointments" element={<AppointmentsList />} />
        <Route path="my-prayers" element={<PrayerSessionsList />} />
        <Route path="history-log" element={<HistoryLog />} />

        {/* Learning Resources */}
        <Route path="ebooks" element={<Ebooks />} />
        <Route path="teaching-videos" element={<TeachingVideos />} />
        <Route path="testimonial-videos" element={<TestimonialVideos />} />
        <Route path="meditations" element={<WordMeditation />} />
        <Route path="books-to-read" element={<BooksToRead />} />
        <Route path="books-to-read/:bookId" element={<BookReader />} />
        <Route path="my-summaries" element={<MySummaries />} />

        {/* Impact X */}
        <Route path="impact-x" element={<ImpactX />} />
        <Route path="impact-x/video/:id" element={<ImpactXVideo />} />

        {/* Mentor Specific Features */}
        <Route path="disciples" element={<Disciples />} />
        <Route path="disciples/:id" element={<DiscipleDetail />} />
        
        <Route path="circles" element={<Circles />} />
        <Route path="prayer-requests" element={<PrayerList />} />
        <Route path="prayer-reminder" element={<PrayerReminder />} />
        <Route path="send-report" element={<SendReport />} />
        <Route path="evangelization" element={<Evangelization />} />
        <Route path="engagement" element={<Engagement />} />
        <Route path="transformation" element={<Transformation />} />
        <Route path="transformation/:parcoursId" element={<ParcoursDetail />} />
        
        {/* Admin Routes */}
        <Route path="admin" element={
            <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
            </ProtectedRoute>
        } />
        <Route path="admin/reports" element={<AdminReportsView />} />
        <Route path="admin/testimonies" element={<AdminTestimonyModeration />} />
        <Route path="admin/access-codes" element={<AdminAccessCodeManager />} />
        <Route path="admin/activity-logs" element={<AdminActivityLog />} />
        <Route path="admin/feedback" element={<AdminFeedback />} />
        <Route path="admin/performance" element={
          <ProtectedRoute requiredRole="admin">
            <PerformanceDashboard />
          </ProtectedRoute>
        } />

      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <RoleProvider>
          <ThemeProvider defaultTheme="dark" storageKey="disciple-life-theme">
            <Helmet>
                <title>DiscipleLife | Vie de Disciple</title>
                <meta name="description" content="Plateforme de formation de disciples." />
                <meta name="theme-color" content="#0f0518" />
            </Helmet>
            <AppRoutes />
            <Toaster />
          </ThemeProvider>
        </RoleProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
