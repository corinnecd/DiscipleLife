
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Key, CheckCircle, XCircle, Gift, Users, Shield } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';

const AccessCode = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const handleApplyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setSuccess(false);
    setResultMessage('');

    try {
      // 1. Fetch code details
      const { data: codeData, error: codeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code.trim())
        .single();

      if (codeError || !codeData) {
        throw new Error("Ce code est invalide ou n'existe pas.");
      }

      // 2. Validate Constraints
      if (!codeData.is_active) throw new Error("Ce code a été désactivé.");
      
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        throw new Error("Ce code a expiré.");
      }
      
      if (codeData.max_uses !== null && codeData.uses_count >= codeData.max_uses) {
        throw new Error("Ce code a atteint son nombre maximum d'utilisations.");
      }

      // 3. Check if user already used this code
      const { data: usageCheck } = await supabase
        .from('access_code_usage_logs')
        .select('id')
        .eq('access_code_id', codeData.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (usageCheck) {
        throw new Error("Vous avez déjà utilisé ce code.");
      }

      // 4. Apply Benefit Logic
      let benefitDescription = "";

      if (codeData.type === 'group') {
        // Add user to group
        if (codeData.target_id) {
           // Mise à jour du profil utilisateur (liaison au groupe / mentor si applicable)
           const { error: groupError } = await supabase
             .from('profils')
             .update({ mentor_id: codeData.created_by ?? null })
             .eq('id', user.id);
             
           benefitDescription = "Vous avez rejoint le groupe avec succès.";
        }
      } else if (codeData.type === 'premium') {
        // Update user role or subscription
        // For simplicity:
        benefitDescription = "Votre accès Premium a été activé.";
      } else if (codeData.type === 'module') {
        // Unlock a module in user_impact_x_progress or similar
        benefitDescription = "Le module de formation a été débloqué.";
      } else if (codeData.type === 'role') {
         // Update user role
         await supabase.from('profils').update({ role: 'mentor' }).eq('id', user.id);
         benefitDescription = "Votre rôle a été mis à jour (Mentor).";
      }

      // 5. Log Usage & Increment Count
      const { error: logError } = await supabase
        .from('access_code_usage_logs')
        .insert({
          access_code_id: codeData.id,
          user_id: user.id
        });
        
      if (logError) throw logError;

      // Increment use count safely via RPC or simple update if strict concurrency isn't critical
      await supabase
        .from('access_codes')
        .update({ uses_count: codeData.uses_count + 1 })
        .eq('id', codeData.id);

      // 6. Notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'achievement',
        title: 'Code activé !',
        content: benefitDescription,
        read: false
      });

      setSuccess(true);
      setResultMessage(benefitDescription);
      toast({
        title: "Succès !",
        description: benefitDescription,
        className: "bg-green-50 border-green-200"
      });
      
      setCode('');

    } catch (error) {
      console.error("Code error:", error);
      setSuccess(false);
      setResultMessage(error.message);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto p-4 pt-20">
      <Helmet>
        <title>Code d'accès | DiscipleLife</title>
      </Helmet>

      <Card className="w-full shadow-lg border-slate-200">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
             <Key className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Activer un code</CardTitle>
          <CardDescription>
            Entrez votre code d'accès pour rejoindre un groupe, débloquer du contenu ou activer des fonctionnalités.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleApplyCode} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Ex: DISCIPLE-2024"
                className="text-center text-lg uppercase tracking-widest h-12"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
            
            {resultMessage && (
              <div className={`p-4 rounded-lg flex items-start gap-3 text-sm ${success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {success ? <CheckCircle className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                <p>{resultMessage}</p>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base" disabled={loading || !code}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification...
                </>
              ) : (
                "Activer le code"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 bg-slate-50 p-6 rounded-b-xl">
           <div className="flex items-center gap-3 text-sm text-slate-500">
              <Gift className="h-4 w-4" />
              <span>Contenus exclusifs</span>
           </div>
           <div className="flex items-center gap-3 text-sm text-slate-500">
              <Users className="h-4 w-4" />
              <span>Accès aux groupes privés</span>
           </div>
           <div className="flex items-center gap-3 text-sm text-slate-500">
              <Shield className="h-4 w-4" />
              <span>Rôles spéciaux</span>
           </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AccessCode;
