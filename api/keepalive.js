// Executado automaticamente 1x por dia (ver vercel.json) só para manter o
// projeto do Supabase ativo — o plano gratuito pausa o projeto depois de
// 7 dias sem nenhum acesso. Essa chamada conta como acesso.
module.exports = async function handler(req, res) {
  const SUPABASE_URL = 'https://uklgjivsgljvkfvdnnqi.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_AJ0oX91NPtyzCgPgAvhOUQ_ojqi2tc4';

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/inscricoes?select=id&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    res.status(200).json({ ok: true, supabaseStatus: response.status, checkedAt: new Date().toISOString() });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err) });
  }
};
