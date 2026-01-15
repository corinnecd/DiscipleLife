
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';

const Auth = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(formData.email, formData.password);
      if (error) throw error;
      
      // Attendre un peu pour que le rôle soit chargé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Récupérer le rôle depuis la base de données
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profils')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        
        const userRole = profileData?.role || 'disciple';
        
        // Redirection intelligente selon le rôle
        const redirectPaths = {
          'super_admin': '/space/pasteur',
          'admin': '/space/pasteur',
          'pasteur': '/space/pasteur',
          'superviseur': '/space/superviseur',
          'mentor': '/space/mentor',
          'disciple': '/space/disciple'
        };
        
        const redirectPath = redirectPaths[userRole] || location.state?.from?.pathname || '/home';
        navigate(redirectPath, { replace: true });
      } else {
        // Fallback si pas d'utilisateur
        const from = location.state?.from?.pathname || '/home';
        navigate(from, { replace: true });
      }
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error.message || "Email ou mot de passe incorrect."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Pass metadata explicitly for the handle_new_user trigger
      const { error } = await signUp(formData.email, formData.password, {
        data: { // Supabase expects metadata inside 'data' key for signUp options in v2
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'disciple' // Default role
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Compte créé !",
        description: "Veuillez vérifier votre email pour confirmer votre inscription.",
      });
      // Optionally switch to login tab or wait for confirmation
      setActiveTab('login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0518] p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Bouton Retour */}
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 text-white hover:text-purple-400 hover:bg-white/5"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>

          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-purple-900/40 mb-4">
                 <span className="text-white font-bold text-2xl">DL</span>
             </div>
             <h1 className="text-3xl font-bold text-white tracking-tight">DiscipleLife</h1>
             <p className="text-slate-400 mt-2">Votre compagnon de croissance spirituelle</p>
          </div>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 mb-6 rounded-xl p-1">
              <TabsTrigger 
                value="login" 
                className="rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
              >
                Connexion
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
              >
                Inscription
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl text-white shadow-2xl">
                <form onSubmit={handleLogin}>
                  <CardHeader>
                    <CardTitle className="text-xl">Bon retour !</CardTitle>
                    <CardDescription className="text-slate-400">Entrez vos identifiants pour accéder à votre espace.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input 
                            id="email" 
                            name="email" 
                            type="email" 
                            placeholder="exemple@email.com" 
                            className="pl-9 bg-black/20 border-white/10 focus:border-purple-500 transition-all"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input 
                            id="password" 
                            name="password" 
                            type="password" 
                            placeholder="••••••••"
                            className="pl-9 bg-black/20 border-white/10 focus:border-purple-500 transition-all"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 transition-colors" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Se connecter"} {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl text-white shadow-2xl">
                <form onSubmit={handleRegister}>
                  <CardHeader>
                    <CardTitle className="text-xl">Créer un compte</CardTitle>
                    <CardDescription className="text-slate-400">Rejoignez la communauté DiscipleLife.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input 
                            id="firstName" 
                            name="firstName" 
                            placeholder="Jean" 
                            className="bg-black/20 border-white/10 focus:border-purple-500 transition-all"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input 
                            id="lastName" 
                            name="lastName" 
                            placeholder="Dupont" 
                            className="bg-black/20 border-white/10 focus:border-purple-500 transition-all"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input 
                            id="email" 
                            name="email" 
                            type="email" 
                            placeholder="exemple@email.com"
                            className="pl-9 bg-black/20 border-white/10 focus:border-purple-500 transition-all"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input 
                            id="password" 
                            name="password" 
                            type="password" 
                            placeholder="••••••••"
                            className="pl-9 bg-black/20 border-white/10 focus:border-purple-500 transition-all"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            minLength={6}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 transition-colors" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "S'inscrire gratuitement"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
    </div>
  );
};

export default Auth;
