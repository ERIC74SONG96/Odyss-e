const INSCRIPTION_EMAIL = process.env.INSCRIPTION_EMAIL || 'contact@odyssee-express.org';

function sanitize(value, maxLen = 200) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const body = req.body || {};
  const honeypot = sanitize(body.website, 50);

  if (honeypot) {
    return res.status(200).json({ ok: true });
  }

  const prenom = sanitize(body.prenom, 80);
  const nom = sanitize(body.nom, 80);
  const email = sanitize(body.email, 120);
  const telephone = sanitize(body.telephone, 30);
  const profil = sanitize(body.profil, 120);
  const mode = sanitize(body.mode, 120);
  const nomEquipe = sanitize(body.nom_equipe, 100);
  const etablissement = sanitize(body.etablissement, 120);
  const message = sanitize(body.message, 800);
  const consent = body.consent === 'oui' || body.consent === true;

  if (!prenom || !nom || !email || !telephone || !profil || !mode) {
    return res.status(400).json({ ok: false, error: 'Champs obligatoires manquants' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Adresse e-mail invalide' });
  }

  if (!consent) {
    return res.status(400).json({ ok: false, error: 'Consentement requis' });
  }

  const payload = {
    _subject: `Inscription L'Odyssée Express — ${prenom} ${nom}`,
    _template: 'table',
    _captcha: 'false',
    Prénom: prenom,
    Nom: nom,
    Email: email,
    Téléphone: telephone,
    Profil: profil,
    Inscription: mode,
    'Nom équipe': nomEquipe || '—',
    Établissement: etablissement || '—',
    Message: message || '—',
  };

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(INSCRIPTION_EMAIL)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'Service de messagerie indisponible' });
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ ok: false, error: 'Envoi impossible' });
  }
}
