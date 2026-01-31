import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email?.trim()) return;
    setLoading(true);
    setSent(false);
    try {
      const { error } = await resetPassword(email.trim());
      if (!error) setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0518] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="bg-[#1a0b2e] border-white/10 text-white">
          <CardHeader>
            <Button
              variant="ghost"
              className="w-fit p-0 hover:bg-transparent text-gray-400 hover:text-white mb-2"
              onClick={() => navigate('/auth')}
            >
              <ArrowLeft size={16} className="mr-2" /> Retour
            </Button>
            <CardTitle className="text-xl">Mot de passe oublié</CardTitle>
            <CardDescription className="text-gray-400">
              Entrez votre adresse email. Nous vous enverrons un lien pour créer un nouveau mot de passe.
            </CardDescription>
          </CardHeader>
          {sent ? (
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <CheckCircle2 size={24} className="shrink-0" />
                <p className="text-sm">
                  Un email vous a été envoyé. Vérifiez votre boîte de réception (et les spams) et cliquez sur le lien pour définir un nouveau mot de passe.
                </p>
              </div>
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" asChild>
                <Link to="/auth">Retour à la connexion</Link>
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="exemple@email.com"
                      className="pl-9 bg-black/20 border-white/10 text-white"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </Button>
                <p className="text-sm text-center text-gray-400">
                  <Link to="/auth" className="text-teal-400 hover:underline">Retour à la connexion</Link>
                </p>
              </CardFooter>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
