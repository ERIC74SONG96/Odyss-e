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
