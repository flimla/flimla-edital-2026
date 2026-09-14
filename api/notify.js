// Chamado automaticamente pelo Supabase (trigger) toda vez que uma
// nova linha entra na tabela "inscricoes". Manda:
//   1. um aviso para o Instituto
//   2. uma confirmacao para a escola (se ela informou algum e-mail)
//
// Variaveis de ambiente necessarias no Vercel (Settings > Environment Variables):
//   RESEND_API_KEY        - chave da API do Resend (secreta)
//   NOTIFY_WEBHOOK_SECRET - senha compartilhada com o gatilho do Supabase

const FROM_EMAIL = 'flimla@institutomaelalu.org';
const INSTITUTE_EMAIL = 'flimla@institutomaelalu.org';
const SITE_URL = 'https://flimla-edital-2026.vercel.app';
const LOGO_FLIMLA = SITE_URL + '/assets/logo-flimla.png';
const LOGO_INSTITUTO = SITE_URL + '/assets/logo-instituto-mono.png';

async function sendEmail(payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

// Envelope visual usado nos dois e-mails: cabeçalho marrom com os dois
// logotipos, corpo em branco, rodapé com o endereço do Instituto.
function renderEmail(bodyHtml) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1ECE6;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ded4c7;">
        <tr>
          <td style="background:#663821;padding:22px 22px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="64" style="vertical-align:middle;">
                  <img src="${LOGO_INSTITUTO}" alt="Instituto Mãe Lalu" width="52" style="display:block;border:0;">
                </td>
                <td style="vertical-align:middle;text-align:center;">
                  <img src="${LOGO_FLIMLA}" alt="Flimlá 2026" width="190" style="display:block;margin:0 auto;border:0;">
                </td>
                <td width="64"></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 28px;color:#3a2115;font-size:15px;line-height:1.65;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#F1ECE6;padding:16px 28px;font-size:12px;color:#6b5647;text-align:center;">
            Instituto Mãe Lalu · Santiago do Iguape · Cachoeira-BA
          </td>
        </tr>
      </table>
    </td></tr>
  </table>`;
}

function detailRow(label, value) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#6b5647;width:180px;vertical-align:top;">${esc(label)}</td>
    <td style="padding:6px 0;font-size:14px;color:#3a2115;font-weight:600;">${esc(value)}</td>
  </tr>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  var secret = req.headers['x-notify-secret'];
  if (!process.env.NOTIFY_WEBHOOK_SECRET || secret !== process.env.NOTIFY_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  var row = (req.body && req.body.record) || req.body || {};
  var results = { institute: null, school: null };

  // 1) Aviso para o Instituto
  var institutoBody = `
    <p style="margin:0 0 18px;font-size:16px;">📥 <strong>Nova inscrição recebida</strong> no Edital 001/2026 da Flimlá.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      ${detailRow('Protocolo', row.protocolo)}
      ${detailRow('Escola', row.nome_escola)}
      ${detailRow('Comunidade', row.comunidade)}
      ${detailRow('Título da proposta', row.titulo_proposta)}
      ${detailRow('Formato', row.formato)}
      ${detailRow('Responsável', [row.telefone_responsavel, row.email_responsavel].filter(Boolean).join(' · '))}
    </table>
    <p style="margin:0;">
      <a href="${SITE_URL}/admin.html" style="display:inline-block;background:#5BC6D0;color:#4a2717;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:999px;font-size:14px;">Ver detalhes e baixar arquivos</a>
    </p>`;

  results.institute = await sendEmail({
    from: `Flimlá 2026 <${FROM_EMAIL}>`,
    to: INSTITUTE_EMAIL,
    subject: `Nova inscrição: ${row.nome_escola || 'escola'} — Flimlá 2026`,
    html: renderEmail(institutoBody),
    text: `Nova inscrição recebida.\nProtocolo: ${row.protocolo}\nEscola: ${row.nome_escola}\nVeja no painel: ${SITE_URL}/admin.html`
  });

  // 2) Confirmação para a escola (se ela informou algum e-mail)
  var schoolEmail = row.email_escola || row.email_responsavel;
  if (schoolEmail) {
    var schoolBody = `
      <p style="margin:0 0 16px;font-size:16px;">Olá! 🌻</p>
      <p style="margin:0 0 18px;">A inscrição da escola <strong>${esc(row.nome_escola)}</strong> no Edital 001/2026 da Flimlá foi recebida com sucesso.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
        ${detailRow('Protocolo', row.protocolo)}
        ${detailRow('Proposta', row.titulo_proposta)}
        ${detailRow('Formato', row.formato)}
      </table>
      <p style="margin:0 0 8px;">Guarde este número de protocolo — ele identifica a inscrição de vocês.</p>
      <p style="margin:0;">Em caso de dúvida, escreva para <a href="mailto:flimla@institutomaelalu.org" style="color:#3f9aa3;">flimla@institutomaelalu.org</a>.</p>
      <p style="margin:22px 0 0;font-style:italic;color:#6b5647;">"Construa isso com a gente." — Instituto Mãe Lalu</p>`;

    results.school = await sendEmail({
      from: `Flimlá 2026 <${FROM_EMAIL}>`,
      to: schoolEmail,
      subject: `Inscrição recebida — Flimlá 2026 (protocolo ${row.protocolo || ''})`,
      html: renderEmail(schoolBody),
      text: `Inscrição recebida! Protocolo: ${row.protocolo}. Escola: ${row.nome_escola}. Dúvidas: flimla@institutomaelalu.org`
    });
  }

  res.status(200).json({ ok: true, results });
};
