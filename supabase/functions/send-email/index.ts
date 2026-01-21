// Supabase Edge Function pour l'envoi d'emails
// Cette fonction peut être déployée avec: supabase functions deploy send-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'DiscipleLife <noreply@disciplelife.app>'

serve(async (req) => {
  try {
    // Vérifier la méthode
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer les données de la requête
    const { to, subject, html, text, metadata } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let emailResult

    // Option 1: Utiliser Resend (recommandé)
    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, '')
        })
      })

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json()
        throw new Error(`Resend error: ${errorData.message || 'Unknown error'}`)
      }

      emailResult = await resendResponse.json()
    }
    // Option 2: Utiliser SendGrid
    else if (SENDGRID_API_KEY) {
      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SENDGRID_API_KEY}`
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }]
          }],
          from: {
            email: EMAIL_FROM.split('<')[1]?.split('>')[0] || 'noreply@disciplelife.app',
            name: EMAIL_FROM.split('<')[0]?.trim() || 'DiscipleLife'
          },
          subject,
          content: [
            {
              type: 'text/html',
              value: html
            },
            {
              type: 'text/plain',
              value: text || html.replace(/<[^>]*>/g, '')
            }
          ]
        })
      })

      if (!sendgridResponse.ok) {
        const errorText = await sendgridResponse.text()
        throw new Error(`SendGrid error: ${errorText}`)
      }

      emailResult = { success: true }
    }
    // Aucun service configuré
    else {
      return new Response(
        JSON.stringify({ 
          error: 'No email service configured. Please set RESEND_API_KEY or SENDGRID_API_KEY in Supabase secrets.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        data: emailResult 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
