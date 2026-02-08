
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [errors, setErrors] = useState({});
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showPasswordRegister, setShowPasswordRegister] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateLogin = () => {
    const e = {};
    if (!formData.email.trim()) e.email = 'L\'email est requis.';
    else if (!EMAIL_REGEX.test(formData.email)) e.email = 'Format d\'email invalide.';
    if (!formData.password) e.password = 'Le mot de passe est requis.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRegister = () => {
    const e = {};
    if (!formData.firstName?.trim()) e.firstName = 'Le prénom est requis.';
    if (!formData.lastName?.trim()) e.lastName = 'Le nom est requis.';
    if (!formData.email?.trim()) e.email = 'L\'email est requis.';
    else if (!EMAIL_REGEX.test(formData.email)) e.email = 'Format d\'email invalide.';
    if (!formData.password) e.password = 'Le mot de passe est requis.';
    else if (formData.password.length < 6) e.password = 'Le mot de passe doit contenir au moins 6 caractères.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);
    const timeoutMs = 20000; // 20 s pour éviter que le bouton reste bloqué (ex. Supabase injoignable)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('La connexion a expiré. Vérifiez votre connexion et réessayez.')), timeoutMs)
    );
    try {
      const signInPromise = (async () => {
        const { error } = await signIn(formData.email, formData.password);
        if (error) throw error;
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profils')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          const userRole = profileData?.role || 'disciple';
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
          const from = location.state?.from?.pathname || '/home';
          navigate(from, { replace: true });
        }
      })();
      await Promise.race([signInPromise, timeoutPromise]);
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
    if (!validateRegister()) return;
    setLoading(true);
    try {
      // Métadonnées alignées sur la table profils (champs de base ; pour famille/date/rôle, utiliser /signup)
      const { error } = await signUp(formData.email, formData.password, {
        data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'disciple'
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

          <Tabs defaultValue="login" value={activeTab} onValueChange={(v) => { setActiveTab(v); setErrors({}); }} className="w-full">
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
                            className={cn("pl-9 bg-black/20 focus:border-purple-500 transition-all", errors.email ? "border-red-500" : "border-white/10")}
                            value={formData.email}
                            onChange={handleInputChange}
                            onBlur={() => formData.email && validateLogin()}
                            required
                        />
                      </div>
                      {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input 
                            id="password" 
                            name="password" 
                            type={showPasswordLogin ? 'text' : 'password'} 
                            placeholder="••••••••"
                            className={cn("pl-9 pr-10 bg-black/20 focus:border-purple-500 transition-all", errors.password ? "border-red-500" : "border-white/10")}
                            value={formData.password}
                            onChange={handleInputChange}
                            onBlur={() => formData.password && validateLogin()}
                            required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordLogin(!showPasswordLogin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                          aria-label={showPasswordLogin ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        >
                          {showPasswordLogin ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 transition-colors" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Se connecter"} {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                    <p className="text-sm text-center text-slate-400">
                      <Link to="/forgot-password" className="text-purple-400 hover:underline font-medium">Mot de passe oublié ?</Link>
                    </p>
                    <p className="text-sm text-center text-slate-400">
                      Pas encore inscrit ? <Link to="/signup" className="text-purple-400 hover:underline font-medium">S'inscrire</Link>
                    </p>
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
                            className={cn("bg-black/20 focus:border-purple-500 transition-all", errors.firstName ? "border-red-500" : "border-white/10")}
                            value={formData.firstName}
                            onChange={handleInputChange}
                            onBlur={() => formData.firstName && validateRegister()}
                            required
                        />
                        {errors.firstName && <p className="text-xs text-red-400">{errors.firstName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input 
                            id="lastName" 
                            name="lastName" 
                            placeholder="Dupont" 
                            className={cn("bg-black/20 focus:border-purple-500 transition-all", errors.lastName ? "border-red-500" : "border-white/10")}
                            value={formData.lastName}
                            onChange={handleInputChange}
                            onBlur={() => formData.lastName && validateRegister()}
                            required
                        />
                        {errors.lastName && <p className="text-xs text-red-400">{errors.lastName}</p>}
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
                            className={cn("pl-9 bg-black/20 focus:border-purple-500 transition-all", errors.email ? "border-red-500" : "border-white/10")}
                            value={formData.email}
                            onChange={handleInputChange}
                            onBlur={() => formData.email && validateRegister()}
                            required
                        />
                      </div>
                      {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input 
                            id="password" 
                            name="password" 
                            type={showPasswordRegister ? 'text' : 'password'} 
                            placeholder="••••••••"
                            className={cn("pl-9 pr-10 bg-black/20 focus:border-purple-500 transition-all", errors.password ? "border-red-500" : "border-white/10")}
                            value={formData.password}
                            onChange={handleInputChange}
                            onBlur={() => formData.password && validateRegister()}
                            required
                            minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordRegister(!showPasswordRegister)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                          aria-label={showPasswordRegister ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        >
                          {showPasswordRegister ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 transition-colors" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "S'inscrire gratuitement"}
                    </Button>
                    <p className="text-sm text-center text-slate-400">
                      Rôle, famille, statut spirituel… <Link to="/signup" className="text-purple-400 hover:underline font-medium">Formulaire complet</Link>
                    </p>
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
