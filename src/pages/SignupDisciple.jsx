
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react';

const SignupDisciple = () => {
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
        toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(formData.email, formData.password, {
        data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'disciple' // Explicitly setting disciple role
        }
      });

      if (error) throw error;
      
      toast({
          title: "Inscription réussie !",
          description: "Bienvenue ! Vérifiez votre email pour commencer.",
      });
      navigate('/auth'); // Redirect to login
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
    <div className="min-h-screen bg-[#0f0518] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1a0b2e] border-white/10 text-white">
        <CardHeader>
           <Button variant="ghost" className="w-fit p-0 hover:bg-transparent text-gray-400 hover:text-white mb-2" onClick={() => navigate('/')}>
               <ArrowLeft size={16} className="mr-2" /> Retour
           </Button>
           <div className="w-12 h-12 bg-teal-500/10 rounded-lg flex items-center justify-center text-teal-400 mb-4">
               <UserPlus size={24} />
           </div>
           <CardTitle className="text-2xl">Inscription Disciple</CardTitle>
           <CardDescription className="text-gray-400">Commencez votre voyage de croissance spirituelle dès aujourd'hui.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input name="firstName" value={formData.firstName} onChange={handleInputChange} required className="bg-black/20 border-white/10" />
                </div>
                <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input name="lastName" value={formData.lastName} onChange={handleInputChange} required className="bg-black/20 border-white/10" />
                </div>
             </div>
             <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="bg-black/20 border-white/10" />
             </div>
             <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input type="password" name="password" value={formData.password} onChange={handleInputChange} required className="bg-black/20 border-white/10" />
             </div>
             <div className="space-y-2">
                <Label>Confirmer le mot de passe</Label>
                <Input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required className="bg-black/20 border-white/10" />
             </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
             <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
                 {loading ? <Loader2 className="animate-spin" /> : "Créer mon compte Gratuit"}
             </Button>
             <p className="text-sm text-gray-400 text-center">
                 Déjà inscrit ? <Link to="/auth" className="text-teal-400 hover:underline">Se connecter</Link>
             </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignupDisciple;
