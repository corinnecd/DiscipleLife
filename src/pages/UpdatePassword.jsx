import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { updateUserPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await updateUserPassword(password);
      if (result.error) {
        setError(result.error.message);
      } else {
        // Successful update
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
            background: `radial-gradient(circle at 50% 100%, #115e59 0%, #0f172a 40%, #020617 100%)`
        }}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
            <h2 className="text-3xl font-light text-white tracking-wide mb-2">Nouveau mot de passe</h2>
            <p className="text-gray-400 text-sm">
                Sécurisez votre compte avec un nouveau mot de passe
            </p>
        </div>

        <div className="bg-card/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1 relative">
                    <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Nouveau mot de passe" 
                        className="bg-black/20 border-white/10 text-white h-12 rounded-xl focus:ring-teal-500 focus:border-teal-500 placeholder:text-gray-500 pr-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>

                <div className="space-y-1 relative">
                    <Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="Confirmer le mot de passe" 
                        className="bg-black/20 border-white/10 text-white h-12 rounded-xl focus:ring-teal-500 focus:border-teal-500 placeholder:text-gray-500 pr-12"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>

                {error && (
                    <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded border border-red-500/20">
                        {error}
                    </p>
                )}

                <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-12 rounded-full text-base font-bold bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-black shadow-lg mt-4"
                >
                    {isLoading ? 'ENREGISTREMENT...' : "METTRE À JOUR"}
                </Button>
            </form>
        </div>
      </motion.div>
    </div>
  );
};

export default UpdatePassword;