// Chamado automaticamente pelo Supabase (Database Webhook) toda vez que uma
// nova linha entra na tabela "inscricoes". Manda:
//   1. um aviso para o Instituto
//   2. uma confirmacao para a escola (se ela informou algum e-mail)
//
// Variaveis de ambiente necessarias no Vercel (Settings > Environment Variables):
//   RESEND_API_KEY     - chave da API do Resend (secreta)
//   NOTIFY_WEBHOOK_SECRET - senha compartilhada com o webhook do Supabase,
//                           para que so o Supabase consiga chamar este endpoint

const FROM_EMAIL = 'flimla@institutomaelalu.org';
const INSTITUTE_EMAIL = 'flimla@institutomaelalu.org';

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

function fmtList(v) {
  if (!v) return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return String(v);
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
  results.institute = await sendEmail({
    from: `Flimlá 2026 <${FROM_EMAIL}>`,
    to: INSTITUTE_EMAIL,
    subject: `Nova inscrição: ${row.nome_escola || 'escola'} — Flimlá 2026`,
    text: [
      `Nova inscrição recebida no Edital 001/2026.`,
      ``,
      `Protocolo: ${row.protocolo || '—'}`,
      `Escola: ${row.nome_escola || '—'}`,
      `Comunidade: ${row.comunidade || '—'}`,
      `Título da proposta: ${row.titulo_proposta || '—'}`,
      `Formato: ${row.formato || '—'}`,
      `Contato do(a) responsável: ${row.telefone_responsavel || '—'} ${row.email_responsavel ? '/ ' + row.email_responsavel : ''}`,
      ``,
      `Veja todos os detalhes e baixe os arquivos no painel:`,
      `https://flimla-edital-2026.vercel.app/admin.html`
    ].join('\n')
  });

  // 2) Confirmação para a escola (se ela informou algum e-mail)
  var schoolEmail = row.email_escola || row.email_responsavel;
  if (schoolEmail) {
    results.school = await sendEmail({
      from: `Flimlá 2026 <${FROM_EMAIL}>`,
      to: schoolEmail,
      subject: `Inscrição recebida — Flimlá 2026 (protocolo ${row.protocolo || ''})`,
      text: [
        `Olá!`,
        ``,
        `A inscrição da escola "${row.nome_escola || ''}" no Edital 001/2026 da Flimlá foi recebida com sucesso.`,
        ``,
        `Protocolo: ${row.protocolo || '—'}`,
        `Proposta: ${row.titulo_proposta || '—'}`,
        `Formato: ${row.formato || '—'}`,
        ``,
        `Guarde este número de protocolo. Em caso de dúvida, escreva para flimla@institutomaelalu.org.`,
        ``,
        `— Instituto Mãe Lalu`
      ].join('\n')
    });
  }

  res.status(200).json({ ok: true, results });
};
