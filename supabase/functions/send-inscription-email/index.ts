// Edge Function : envoie l'email avec le lien vers le formulaire d'inscription complet
// Déployer avec : supabase functions deploy send-inscription-email
// Variables d'environnement : RESEND_API_KEY (ou configurer Supabase Auth > Email templates)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface ReqBody {
  email: string;
  lien: string;
  prenom?: string;
  nom?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { email, lien, prenom, nom } = (await req.json()) as ReqBody;
    if (!email || !lien) {
      return new Response(
        JSON.stringify({ error: 'email et lien requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('RESEND_API_KEY non configurée');
      return new Response(
        JSON.stringify({ error: 'Service email non configuré' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const nomComplet = [prenom, nom].filter(Boolean).join(' ') || 'Utilisateur';
    const html = `
      <h2>DiscipleLife - Formulaire d'inscription</h2>
      <p>Bonjour ${nomComplet},</p>
      <p>Vous avez commencé votre inscription sur DiscipleLife. Cliquez sur le lien ci-dessous pour accéder au formulaire complet et finaliser votre inscription :</p>
      <p><a href="${lien}" style="color:#8b5cf6;font-weight:bold">Accéder au formulaire d'inscription</a></p>
      <p>Ce lien est valide 7 jours.</p>
      <p>Si vous n'avez pas demandé cette inscription, vous pouvez ignorer cet email.</p>
      <p>— L'équipe DiscipleLife</p>
    `;

    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'DiscipleLife <noreply@disciplelife.app>',
        to: [email],
        subject: 'DiscipleLife - Complétez votre inscription',
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(
        JSON.stringify({ error: 'Échec envoi email', details: err }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
