import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeletionConfirmationRequest {
  email: string;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, reason }: DeletionConfirmationRequest = await req.json();

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: "Email non valida" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending deletion confirmation to: ${email}`);

    const emailResponse = await resend.emails.send({
      from: "BillSnap <onboarding@resend.dev>",
      to: [email],
      subject: "Conferma Richiesta Cancellazione Dati - BillSnap",
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Conferma Cancellazione Dati</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                        BillSnap
                      </h1>
                      <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                        Conferma Richiesta GDPR
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: inline-block; width: 64px; height: 64px; background-color: #fef3c7; border-radius: 50%; line-height: 64px;">
                          <span style="font-size: 32px;">⚠️</span>
                        </div>
                      </div>

                      <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">
                        Richiesta Ricevuta
                      </h2>

                      <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6; text-align: center;">
                        Abbiamo ricevuto la tua richiesta di cancellazione dati in conformità al GDPR (Art. 17 - Diritto all'oblio).
                      </p>

                      <div style="background-color: #f9fafb; border-left: 4px solid #7c3aed; padding: 20px; margin: 24px 0; border-radius: 8px;">
                        <p style="margin: 0 0 12px; color: #111827; font-size: 14px; font-weight: 600;">
                          📧 Email: <span style="color: #7c3aed;">${email}</span>
                        </p>
                        ${reason ? `
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                          <strong>Motivo:</strong> ${reason}
                        </p>
                        ` : ''}
                      </div>

                      <h3 style="margin: 24px 0 12px; color: #111827; font-size: 18px; font-weight: 600;">
                        Prossimi Passi
                      </h3>

                      <div style="margin-bottom: 16px;">
                        <table role="presentation" style="width: 100%;">
                          <tr>
                            <td style="padding: 12px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
                              <span style="font-weight: 600; color: #7c3aed; margin-right: 8px;">1️⃣</span>
                              <span style="color: #374151; font-size: 14px;">Verifica della richiesta</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="height: 8px;"></td>
                          </tr>
                          <tr>
                            <td style="padding: 12px; background-color: #f9fafb; border-radius: 8px;">
                              <span style="font-weight: 600; color: #7c3aed; margin-right: 8px;">2️⃣</span>
                              <span style="color: #374151; font-size: 14px;">Blocco immediato dell'utilizzo dati</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="height: 8px;"></td>
                          </tr>
                          <tr>
                            <td style="padding: 12px; background-color: #f9fafb; border-radius: 8px;">
                              <span style="font-weight: 600; color: #7c3aed; margin-right: 8px;">3️⃣</span>
                              <span style="color: #374151; font-size: 14px;">Cancellazione definitiva entro 30 giorni</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="height: 8px;"></td>
                          </tr>
                          <tr>
                            <td style="padding: 12px; background-color: #f9fafb; border-radius: 8px;">
                              <span style="font-weight: 600; color: #7c3aed; margin-right: 8px;">4️⃣</span>
                              <span style="color: #374151; font-size: 14px;">Email di conferma finale</span>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <div style="background-color: #eff6ff; border: 1px solid #dbeafe; padding: 16px; margin: 24px 0; border-radius: 8px;">
                        <p style="margin: 0; color: #1e40af; font-size: 13px; line-height: 1.5;">
                          <strong>ℹ️ Informazione:</strong> I tuoi dati sono già stati bloccati e non verranno più utilizzati per alcuna finalità. 
                          La cancellazione fisica dal database avverrà entro il termine previsto dal GDPR.
                        </p>
                      </div>

                      <h3 style="margin: 24px 0 12px; color: #111827; font-size: 18px; font-weight: 600;">
                        Dati che verranno cancellati
                      </h3>

                      <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                        <li>File PDF e immagini delle bollette</li>
                        <li>Risultati analisi OCR e AI</li>
                        <li>Storico confronti offerte</li>
                        <li>Profilo utente e preferenze</li>
                        <li>Tutti i dati associati al tuo account</li>
                      </ul>

                      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; text-align: center;">
                          Hai cambiato idea?
                        </p>
                        <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
                          Contattaci entro 30 giorni a <a href="mailto:privacy@billsnap.it" style="color: #7c3aed; text-decoration: none; font-weight: 600;">privacy@billsnap.it</a> per annullare la richiesta.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px;">
                      <p style="margin: 0 0 12px; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.5;">
                        Questa email è stata inviata in risposta alla tua richiesta di cancellazione dati.
                        <br>
                        Per domande: <a href="mailto:privacy@billsnap.it" style="color: #7c3aed; text-decoration: none;">privacy@billsnap.it</a>
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} BillSnap - Progetto in fase di test
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Deletion confirmation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email di conferma inviata",
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending deletion confirmation email:", error);
    return new Response(
      JSON.stringify({ 
        error: "Impossibile inviare l'email di conferma",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
