import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.placego.com.br";
const FROM = "PlaceGo CRM <noreply@placego.com.br>";

export async function sendLeadAssignedEmail({
  brokerName,
  brokerEmail,
  contactName,
  contactPhone,
  contactEmail,
  notes,
}: {
  brokerName: string;
  brokerEmail: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
}) {
  const pipelineUrl = `${appUrl}/pipeline`;

  const contactRows = [
    contactPhone ? `<tr><td style="padding:4px 0;color:#71717a;font-size:14px;width:80px;">Telefone</td><td style="padding:4px 0;font-size:14px;color:#18181b;font-weight:500;">${contactPhone}</td></tr>` : "",
    contactEmail ? `<tr><td style="padding:4px 0;color:#71717a;font-size:14px;">Email</td><td style="padding:4px 0;font-size:14px;color:#18181b;font-weight:500;">${contactEmail}</td></tr>` : "",
    notes ? `<tr><td style="padding:4px 0;color:#71717a;font-size:14px;vertical-align:top;">Obs.</td><td style="padding:4px 0;font-size:14px;color:#18181b;">${notes}</td></tr>` : "",
  ].join("");

  await resend.emails.send({
    from: FROM,
    to: brokerEmail,
    subject: `Novo lead: ${contactName} — PlaceGo CRM`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">

        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:24px 32px;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">PlaceGo CRM</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">
              Novo lead para você
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#71717a;line-height:1.6;">
              Olá, <strong style="color:#18181b;">${brokerName}</strong>! O SDR distribuiu um novo lead para o seu pipeline.
            </p>

            <!-- Card do contato -->
            <table cellpadding="0" cellspacing="0" width="100%" style="background:#f9f9f9;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#18181b;">👤 ${contactName}</p>
                  <table cellpadding="0" cellspacing="0">
                    ${contactRows}
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${pipelineUrl}"
                     style="display:inline-block;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:-0.1px;">
                    Ver meu pipeline →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;text-align:center;">
              Se o botão não funcionar, copie e cole este link no navegador:<br>
              <a href="${pipelineUrl}" style="color:#71717a;word-break:break-all;">${pipelineUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f5;padding:16px 32px;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
              PlaceGo CRM · crm.placego.com.br<br>
              Você recebeu este email porque é corretor vinculado à PlaceGo.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
