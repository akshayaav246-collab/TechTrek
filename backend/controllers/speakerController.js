const Speaker = require('../models/Speaker');

const normalizeName = (value = '') => value.trim().toLowerCase();

// ─── List speakers ────────────────────────────────────────────────────────────
const listSpeakers = async (req, res) => {
  try {
    const filter = req.user.role === 'superAdmin' ? {} : { createdBy: req.user._id };
    const speakers = await Speaker.find(filter).sort({ updatedAt: -1, name: 1 }).lean();
    res.json(speakers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Upsert speaker ───────────────────────────────────────────────────────────
const upsertSpeaker = async (req, res) => {
  try {
    const { name = '', role = '', company = '', bio = '' } = req.body;
    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: 'Speaker name is required' });
    }

    const speaker = await Speaker.findOneAndUpdate(
      { createdBy: req.user._id, normalizedName: normalizeName(trimmedName) },
      {
        $set: {
          name: trimmedName,
          normalizedName: normalizeName(trimmedName),
          role: role.trim(),
          company: company.trim(),
          bio: bio.trim(),
          createdBy: req.user._id,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(speaker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── LinkedIn Auto-Fill via Apify + Gemini ────────────────────────────────────
const extractLinkedInData = async (req, res) => {
  const { linkedinUrl } = req.body;

  if (!linkedinUrl || typeof linkedinUrl !== 'string') {
    return res.status(400).json({ success: false, message: 'linkedinUrl is required', data: null });
  }

  const APIFY_KEY = process.env.APIFY_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  console.log('[LinkedIn Extract] ── Starting extraction for:', linkedinUrl);
  console.log('[LinkedIn Extract] APIFY_KEY present:', !!APIFY_KEY);
  console.log('[LinkedIn Extract] GEMINI_KEY present:', !!GEMINI_KEY);

  if (!APIFY_KEY || !GEMINI_KEY) {
    console.error('[LinkedIn Extract] FATAL: API keys missing in .env');
    return res.status(500).json({ success: false, message: 'API keys not configured', data: null });
  }

  // ── Step 1: Fetch from Apify ────────────────────────────────────────────────
  // Primary:  harvestapi~linkedin-profile-scraper  (No cookies, 14K users, 4.5★)
  // Fallback: supreme_coder~linkedin-profile-scraper (No cookies, 5.2K users, 4.4★)
  const ACTORS = [
    'harvestapi~linkedin-profile-scraper',
    'supreme_coder~linkedin-profile-scraper',
  ];

  let rawProfile = null;

  for (const actorId of ACTORS) {
    if (rawProfile) break;
    try {
      const apifyUrl =
        `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items` +
        `?token=${APIFY_KEY}&timeout=60&memory=512`;

      console.log(`[LinkedIn Extract] Trying actor: ${actorId}`);

      const runRes = await fetch(apifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileUrls: [linkedinUrl.trim()],
          // harvestapi uses 'urls', supreme_coder uses 'profileUrls' — send both to be safe
          urls: [linkedinUrl.trim()],
        }),
      });

      console.log(`[LinkedIn Extract] ${actorId} HTTP status:`, runRes.status, runRes.statusText);
      const rawText = await runRes.text();
      console.log(`[LinkedIn Extract] ${actorId} response (first 600):`, rawText.slice(0, 600));

      if (!runRes.ok) {
        console.warn(`[LinkedIn Extract] ${actorId} returned non-OK, trying next actor...`);
        continue;
      }

      let items;
      try { items = JSON.parse(rawText); }
      catch (e) { console.error(`[LinkedIn Extract] ${actorId} JSON parse error:`, e.message); continue; }

      if (Array.isArray(items) && items.length > 0) {
        rawProfile = items[0];
        console.log(`[LinkedIn Extract] ✓ ${actorId} returned profile keys:`, Object.keys(rawProfile).join(', '));
      } else {
        console.warn(`[LinkedIn Extract] ${actorId} returned empty array — trying next actor...`);
      }
    } catch (err) {
      console.error(`[LinkedIn Extract] ${actorId} fetch threw:`, err.message);
    }
  }


  if (!rawProfile) {
    console.error('[LinkedIn Extract] rawProfile is null — returning failure fallback.');
    return res.json({ success: false, message: 'Auto extraction failed', data: null });
  }

  // ── Step 2: Normalise field names ──────────────────────────────────────────
  // Real Apify sample keys: firstName, lastName, headline, summary, occupation,
  // jobTitle, companyName, positions[{title, companyName?, locationName}]
  const name =
    rawProfile.fullName ||
    rawProfile.full_name ||
    [rawProfile.firstName, rawProfile.lastName].filter(Boolean).join(' ') ||
    rawProfile.name ||
    '';

  const headline =
    rawProfile.headline ||
    rawProfile.occupation ||      // e.g. "Sr. Scrum Master at Tandem Diabetes"
    rawProfile.jobTitle ||
    rawProfile.job_title ||
    rawProfile.title ||
    '';

  const summary =
    rawProfile.summary ||
    rawProfile.about ||
    rawProfile.description ||
    rawProfile.bio ||
    '';

  // For company: top-level companyName is most reliable per sample data
  // We pass it directly to Gemini inside the experience list
  const topLevelCompany = rawProfile.companyName || rawProfile.company_name || rawProfile.currentCompany?.name || '';
  const topLevelTitle   = rawProfile.jobTitle || rawProfile.job_title || rawProfile.title || '';

  const expArray =
    rawProfile.positions ||
    rawProfile.experiences ||
    rawProfile.experience ||
    rawProfile.workExperience ||
    [];

  const experienceLines = Array.isArray(expArray)
    ? expArray
        .slice(0, 5)
        .map((exp) => {
          const t = exp.title || exp.jobTitle || exp.job_title || exp.role || '';
          const c = exp.companyName || exp.company || exp.company_name || topLevelCompany || '';
          return `${t}${c ? ` at ${c}` : ''}`;
        })
        .filter(Boolean)
        .join('\n')
    : topLevelTitle ? `${topLevelTitle}${topLevelCompany ? ` at ${topLevelCompany}` : ''}` : '';

  console.log(
    '[LinkedIn Extract] Parsed — name:', `"${name}"`,
    '| headline:', `"${headline}"`,
    '| summary chars:', summary.length,
    '| experiences:', experienceLines.slice(0, 120)
  );

  const profileText = [
    name ? `Name: ${name}` : '',
    headline ? `Headline: ${headline}` : '',
    summary ? `Summary: ${summary}` : '',
    experienceLines ? `Experience:\n${experienceLines}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!profileText.trim()) {
    console.error('[LinkedIn Extract] profileText is blank — all fields empty after normalisation.');
    return res.json({ success: false, message: 'Auto extraction failed', data: null });
  }

  // ── Step 3: Send to Gemini ──────────────────────────────────────────────────
  const prompt = `You are a data extraction engine.

Extract the following fields from the given LinkedIn profile data:
- name
- role
- organization
- short_bio

Rules:
- name: full person name
- role: current job title only
- organization: current company name only
- short_bio: 2-3 sentence professional summary

If current role or organization is unclear, infer from the most recent experience.

Return ONLY valid JSON in this format:
{
  "name": "",
  "role": "",
  "organization": "",
  "short_bio": ""
}

Do not include markdown, explanation, or extra text.

LinkedIn Profile Data:
${profileText}`;

  let geminiResult = null;
  try {
    console.log('[LinkedIn Extract] Calling Gemini 2.5 Flash...');
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    console.log('[LinkedIn Extract] Gemini HTTP status:', geminiRes.status);
    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('[LinkedIn Extract] Gemini error body:', JSON.stringify(geminiData).slice(0, 400));
    }

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[LinkedIn Extract] Gemini raw text:', rawText.slice(0, 400));

    const cleanText = rawText.replace(/```json|```/gi, '').trim();
    geminiResult = JSON.parse(cleanText);
    console.log('[LinkedIn Extract] Gemini parsed OK:', geminiResult);
  } catch (err) {
    console.error('[LinkedIn Extract] Gemini processing error:', err.message);
    return res.json({ success: false, message: 'Auto extraction failed', data: null });
  }

  // ── Step 4: Validate output ─────────────────────────────────────────────────
  if (!geminiResult || typeof geminiResult !== 'object') {
    console.error('[LinkedIn Extract] geminiResult is not an object:', geminiResult);
    return res.json({ success: false, message: 'Auto extraction failed', data: null });
  }

  const data = {
    name:         typeof geminiResult.name         === 'string' ? geminiResult.name.trim()         : '',
    role:         typeof geminiResult.role         === 'string' ? geminiResult.role.trim()         : '',
    organization: typeof geminiResult.organization === 'string' ? geminiResult.organization.trim() : '',
    short_bio:    typeof geminiResult.short_bio    === 'string' ? geminiResult.short_bio.trim()    : '',
  };

  console.log('[LinkedIn Extract] ✓ SUCCESS — data:', data);
  return res.json({ success: true, data });
};

module.exports = { listSpeakers, upsertSpeaker, normalizeName, extractLinkedInData };
