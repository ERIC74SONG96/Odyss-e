const INSCRIPTION_EMAIL = process.env.INSCRIPTION_EMAIL || 'contact@odyssee-express.org';
const INSCRIPTION_FROM_EMAIL = process.env.INSCRIPTION_FROM_EMAIL || "L'Odyssée Express <onboarding@resend.dev>";
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

function sanitize(value, maxLen = 200) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function payloadEntries(payload) {
  return Object.entries(payload).filter(([key]) => !key.startsWith('_'));
}

function payloadToText(payload) {
  return payloadEntries(payload)
    .map(([key, value]) => `${key}: ${value || '—'}`)
    .join('\n');
}

function payloadToHtml(payload) {
  const rows = payloadEntries(payload)
    .map(([key, value]) => {
      const safeKey = String(key).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char]));
      const safeValue = String(value || '—').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char]));
      return `<tr><th align="left" style="padding:6px 10px;border:1px solid #ddd;">${safeKey}</th><td style="padding:6px 10px;border:1px solid #ddd;">${safeValue}</td></tr>`;
    })
    .join('');

  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${rows}</table>`;
}

async function sendWithResend(payload) {
  if (!RESEND_API_KEY) return false;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: INSCRIPTION_FROM_EMAIL,
      to: [INSCRIPTION_EMAIL],
      reply_to: payload.Email,
      subject: payload._subject,
      text: payloadToText(payload),
      html: payloadToHtml(payload),
    }),
  });

  if (!response.ok) {
    throw new Error('Service de messagerie indisponible');
  }

  return true;
}

async function sendWithFormSubmit(payload) {
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(INSCRIPTION_EMAIL)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Service de messagerie indisponible');
  }

  return true;
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
  const evenement = sanitize(body.evenement, 80) || 'concours_eco_conception';
  const profil = sanitize(body.profil, 120);
  const mode = sanitize(body.mode, 120);
  const nomEquipe = sanitize(body.nom_equipe, 100);
  const etablissement = sanitize(body.etablissement, 120);
  const age = sanitize(String(body.age || ''), 3);
  const quartier = sanitize(body.quartier, 120);
  const disponibilite = sanitize(body.disponibilite, 80);
  const groupe = sanitize(body.groupe, 80);
  const message = sanitize(body.message, 800);
  const consent = body.consent === 'oui' || body.consent === true;

  if (!prenom || !nom || !email || !telephone) {
    return res.status(400).json({ ok: false, error: 'Champs obligatoires manquants' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Adresse e-mail invalide' });
  }

  if (!consent) {
    return res.status(400).json({ ok: false, error: 'Consentement requis' });
  }

  let payload;

  if (evenement === 'operation_quartier_propre') {
    if (!disponibilite) {
      return res.status(400).json({ ok: false, error: 'Disponibilité requise' });
    }

    payload = {
      _subject: `Inscription bénévole 3 juillet — ${prenom} ${nom}`,
      _template: 'table',
      _captcha: 'false',
      Événement: 'Opération Quartier Propre',
      Date: 'Vendredi 3 juillet 2026',
      Lieu: 'Cité Verte, Yaoundé',
      Prénom: prenom,
      Nom: nom,
      Email: email,
      Téléphone: telephone,
      Âge: age || '—',
      'Quartier / commune': quartier || '—',
      Disponibilité: disponibilite,
      Groupe: groupe || '—',
      Message: message || '—',
    };
  } else {
    if (!profil || !mode) {
      return res.status(400).json({ ok: false, error: 'Champs obligatoires manquants' });
    }

    payload = {
      _subject: `Inscription concours 4 juillet — ${prenom} ${nom}`,
      _template: 'table',
      _captcha: 'false',
      Événement: "Concours d'éco-conception",
      Date: 'Samedi 4 juillet 2026',
      Lieu: 'Lycée technique et Commercial de Yaoundé',
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
  }

  try {
    const sent = await sendWithResend(payload);
    if (!sent) {
      await sendWithFormSubmit(payload);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(502).json({ ok: false, error: error.message || 'Envoi impossible' });
  }
}
