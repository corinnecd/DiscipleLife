
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RoleProvider, useRole } from '@/context/RoleContext';
import { ThemeProvider } from '@/context/ThemeContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import UpdatePassword from './pages/UpdatePassword';
import ForgotPassword from './pages/ForgotPassword';
import InscriptionParToken from './pages/InscriptionParToken';
import { useToast } from '@/components/ui/use-toast';

// Public Pages (chargées immédiatement)
import HomePage from './pages/HomePage';
import SignupDisciple from './pages/SignupDisciple';
import DashboardHome from './pages/DashboardHome';

// Pages critiques (chargées immédiatement)
import DiscipleDashboard from './pages/dashboards/DiscipleDashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Menu from './pages/Menu';
import HelpFAQ from './pages/HelpFAQ';
import Circles from './pages/Circles';
import Disciples from './pages/Disciples';
import DiscipleDetail from './pages/DiscipleDetail';
import PrayerList from './pages/PrayerList';

// Lazy loading - pages lourdes chargées à la demande
const MentorDashboard = lazy(() => import('./pages/dashboards/MentorDashboard'));
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard'));
const SuperviseurDashboard = lazy(() => import('./pages/dashboards/SuperviseurDashboard'));
const SendReport = lazy(() => import('./pages/SendReport'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Evangelization = lazy(() => import('./pages/Evangelization'));
const Engagement = lazy(() => import('./pages/Engagement'));
const Transformation = lazy(() => import('./pages/Transformation'));
const ParcoursDetail = lazy(() => import('./pages/ParcoursDetail'));
const Ebooks = lazy(() => import('./pages/Ebooks'));
const TeachingVideos = lazy(() => import('./pages/TeachingVideos'));
const TestimonialVideos = lazy(() => import('./pages/TestimonialVideos'));
const WordMeditation = lazy(() => import('./pages/WordMeditation'));
const BooksToRead = lazy(() => import('./pages/BooksToRead'));
const BookReader = lazy(() => import('./pages/BookReader'));
const ImpactX = lazy(() => import('./pages/ImpactX'));
const ImpactXVideo = lazy(() => import('./pages/ImpactXVideo'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const FeedbackForm = lazy(() => import('./pages/FeedbackForm'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const MeetingScheduler = lazy(() => import('./pages/MeetingScheduler'));
const PrayerReminder = lazy(() => import('./pages/PrayerReminder'));
const MySummaries = lazy(() => import('./pages/MySummaries'));
const AttendanceTracking = lazy(() => import('./pages/AttendanceTracking'));
const FamillesDisciples = lazy(() => import('./pages/FamillesDisciples'));
const GenealogicalTree = lazy(() => import('./pages/GenealogicalTree'));
const AppointmentsList = lazy(() => import('./pages/AppointmentsList'));
const PrayerSessionsList = lazy(() => import('./pages/PrayerSessionsList'));
const HistoryLog = lazy(() => import('./pages/HistoryLog'));
const AdminReportsView = lazy(() => import('./pages/AdminReportsView'));
const AdminTestimonyModeration = lazy(() => import('./pages/AdminTestimonyModeration'));
const AdminAccessCodeManager = lazy(() => import('./pages/AdminAccessCodeManager'));
const AdminActivityLog = lazy(() => import('./pages/AdminActivityLog'));
const AdminFeedback = lazy(() => import('./pages/AdminFeedback'));
const PerformanceDashboard = lazy(() => import('./components/PerformanceDashboard'));
const SuiviPostCrise = lazy(() => import('./pages/SuiviPostCrise'));
const SuiviPostCriseDetail = lazy(() => import('./pages/SuiviPostCriseDetail'));
const SuiviPostCriseStats = lazy(() => import('./pages/SuiviPostCriseStats'));

// Onboarding pages
const WelcomeOnboarding = lazy(() => import('./pages/WelcomeOnboarding'));
const QuickSignup = lazy(() => import('./pages/onboarding/QuickSignup'));
const EmailVerification = lazy(() => import('./pages/onboarding/EmailVerification'));
const CompleteProfile = lazy(() => import('./pages/onboarding/CompleteProfile'));
const DashboardTour = lazy(() => import('./pages/onboarding/DashboardTour'));

import { Helmet } from 'react-helmet';
import { Toaster } from "@/components/ui/toaster";

// Fallback pendant le chargement lazy
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">Chargement...</span>
    </div>
  </div>
);

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
      {/* Public Routes - Page d'accueil = Étape 1 formulaire simplifié */}
      <Route path="/" element={!user ? <HomePage /> : <Navigate to="/home" replace />} />
      <Route path="/auth" element={<Auth />} />
      {/* Formulaire unique d'inscription : une route /signup, rôle pré-rempli via ?role= */}
      <Route path="/signup" element={<SignupDisciple />} />
      <Route path="/signup/disciple" element={<Navigate to="/signup?role=disciple" replace />} />
      <Route path="/signup/mentor" element={<Navigate to="/signup?role=mentor" replace />} />
      <Route path="/signup/superviseur" element={<Navigate to="/signup?role=superviseur" replace />} />
      <Route path="/signup/pasteur" element={<Navigate to="/signup?role=pasteur" replace />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/inscription/:token" element={<InscriptionParToken />} />

      {/* Onboarding Routes */}
      <Route path="/onboarding/welcome" element={<Suspense fallback={<PageLoader />}><WelcomeOnboarding /></Suspense>} />
      <Route path="/onboarding/signup" element={<Suspense fallback={<PageLoader />}><QuickSignup /></Suspense>} />
      <Route path="/onboarding/verify-email" element={<Suspense fallback={<PageLoader />}><EmailVerification /></Suspense>} />
      <Route path="/onboarding/complete-profile" element={<Suspense fallback={<PageLoader />}><CompleteProfile /></Suspense>} />
      <Route path="/onboarding/dashboard-tour" element={<Suspense fallback={<PageLoader />}><DashboardTour /></Suspense>} />
      
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
        <Route path="arbre-genealogique" element={<GenealogicalTree />} />
        <Route path="prayer-requests" element={<PrayerList />} />
        <Route path="prayer-reminder" element={<PrayerReminder />} />
        <Route path="send-report" element={<SendReport />} />
        <Route path="evangelization" element={<Evangelization />} />
        <Route path="engagement" element={<Engagement />} />
        <Route path="transformation" element={<Transformation />} />
        <Route path="transformation/:parcoursId" element={<ParcoursDetail />} />
        
        {/* Suivi Post-Crise (Objectif 3) */}
        <Route path="suivi-post-crise" element={<SuiviPostCrise />} />
        <Route path="suivi-post-crise/:id" element={<SuiviPostCriseDetail />} />
        <Route path="suivi-post-crise-stats" element={<SuiviPostCriseStats />} />
        
        {/* Admin Routes */}
        <Route path="admin" element={
            <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
            </ProtectedRoute>
        } />
        <Route path="admin/reports" element={
          <ProtectedDashboard allowedRoles={['super_admin', 'admin', 'pasteur']} dashboardName="Rapports">
            <AdminReportsView />
          </ProtectedDashboard>
        } />
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
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <RoleProvider>
          <ThemeProvider defaultTheme="dark" storageKey="disciple-life-theme">
            <Helmet>
                <title>Disciple 70 | Vie de Disciple</title>
                <meta name="description" content="Plateforme de formation de disciples." />
                <meta name="theme-color" content="#0f0518" />
            </Helmet>
            <Suspense fallback={<PageLoader />}>
              <AppRoutes />
            </Suspense>
            <Toaster />
          </ThemeProvider>
        </RoleProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
