export type FamilyConfidence = 'high' | 'medium' | 'low';

export type FamilyClassification = {
  slug: string;
  label: string;
  confidence: FamilyConfidence;
  durationTag: string | null;
};

type FamilyRule = {
  slug: string;
  label: string;
  patterns: RegExp[];
  confidence: FamilyConfidence;
};

const FAMILY_RULES: FamilyRule[] = [
  {
    slug: 'chatgpt',
    label: 'ChatGPT',
    confidence: 'high',
    patterns: [
      /\bchat\s*gpt\b/i,
      /\bgpt[-\s]?4\b/i,
      /\bgpt[-\s]?5\b/i,
      /\bopenai\b/i,
      /\bchatgpt\b/i,
    ],
  },
  {
    slug: 'claude',
    label: 'Claude',
    confidence: 'high',
    patterns: [/\bclaude\b/i, /\banthropic\b/i],
  },
  {
    slug: 'gemini',
    label: 'Gemini',
    confidence: 'high',
    patterns: [
      /\bgemini\b/i,
      /\bgoogle\s*ai\b/i,
      /\bgemini\s*ai\s*pro\b/i,
      /\bgoogle\s*one\s*ai\b/i,
    ],
  },
  {
    slug: 'netflix',
    label: 'Netflix',
    confidence: 'high',
    patterns: [/\bnetflix\b/i],
  },
  {
    slug: 'canva',
    label: 'Canva',
    confidence: 'high',
    patterns: [/\bcanva\b/i],
  },
  {
    slug: 'cursor',
    label: 'Cursor',
    confidence: 'high',
    patterns: [/\bcursor\b/i],
  },
  {
    slug: 'adobe',
    label: 'Adobe',
    confidence: 'high',
    patterns: [/\badobe\b/i, /\bcreative\s*cloud\b/i, /\bphotoshop\b/i],
  },
  {
    slug: 'spotify',
    label: 'Spotify',
    confidence: 'high',
    patterns: [/\bspotify\b/i],
  },
  {
    slug: 'midjourney',
    label: 'Midjourney',
    confidence: 'high',
    patterns: [/\bmidjourney\b/i, /\bmj\b/i],
  },
  {
    slug: 'leonardo',
    label: 'Leonardo',
    confidence: 'high',
    patterns: [/\bleonardo\b/i],
  },
  {
    slug: 'runway',
    label: 'Runway',
    confidence: 'high',
    patterns: [/\brunway\b/i],
  },
  {
    slug: 'elevenlabs',
    label: 'ElevenLabs',
    confidence: 'high',
    patterns: [/\belevenlabs\b/i, /\belevanlabs\b/i],
  },
  {
    slug: 'capcut',
    label: 'CapCut',
    confidence: 'high',
    patterns: [/\bcapcut\b/i],
  },
  {
    slug: 'notion',
    label: 'Notion',
    confidence: 'high',
    patterns: [/\bnotion\b/i],
  },
  {
    slug: 'linkedin',
    label: 'LinkedIn',
    confidence: 'high',
    patterns: [/\blinkedin\b/i, /\bsales\s*navigator\b/i],
  },
  {
    slug: 'lovable',
    label: 'Lovable',
    confidence: 'high',
    patterns: [/\blovable\b/i],
  },
  {
    slug: 'n8n',
    label: 'n8n',
    confidence: 'high',
    patterns: [/\bn8n\b/i],
  },
  {
    slug: 'railway',
    label: 'Railway',
    confidence: 'medium',
    patterns: [/\brailway\b/i],
  },
  {
    slug: 'supabase',
    label: 'Supabase',
    confidence: 'high',
    patterns: [/\bsupabase\b/i],
  },
  {
    slug: 'higgsfield',
    label: 'Higgsfield',
    confidence: 'high',
    patterns: [/\bhiggsfield\b/i, /\bhiggsflied\b/i],
  },
  {
    slug: 'manus',
    label: 'Manus',
    confidence: 'medium',
    patterns: [/\bmanus\b/i],
  },
  {
    slug: 'quillbot',
    label: 'Quillbot',
    confidence: 'high',
    patterns: [/\bquillbot\b/i],
  },
  {
    slug: 'gamma',
    label: 'Gamma',
    confidence: 'medium',
    patterns: [/\bgamma\b/i],
  },
  {
    slug: 'descript',
    label: 'Descript',
    confidence: 'high',
    patterns: [/\bdescript\b/i],
  },
  {
    slug: 'bolt',
    label: 'Bolt',
    confidence: 'medium',
    patterns: [/\bbolt\.new\b/i, /\bbolt\s*pro\b/i],
  },
  {
    slug: 'replit',
    label: 'Replit',
    confidence: 'high',
    patterns: [/\breplit\b/i],
  },
  {
    slug: 'warp',
    label: 'Warp',
    confidence: 'medium',
    patterns: [/\bwarp\b/i],
  },
  {
    slug: 'youtube',
    label: 'YouTube',
    confidence: 'high',
    patterns: [/\byoutube\b/i, /\byt\s*premium\b/i],
  },
  {
    slug: 'disney',
    label: 'Disney+',
    confidence: 'high',
    patterns: [/\bdisney\+?\b/i],
  },
  {
    slug: 'apple',
    label: 'Apple',
    confidence: 'medium',
    patterns: [/\bapple\s*(music|tv|one)\b/i],
  },
  {
    slug: 'vpn',
    label: 'VPN',
    confidence: 'high',
    patterns: [
      /\bnord\s*vpn\b/i,
      /\bexpress\s*vpn\b/i,
      /\bsurfshark\b/i,
      /\bproton\s*vpn\b/i,
      /\bmullvad\b/i,
      /\bvpn\b/i,
    ],
  },
  {
    slug: 'email',
    label: 'Email',
    confidence: 'high',
    patterns: [
      /\boutlook\b/i,
      /\bhotmail\b/i,
      /\bgmail\b/i,
      /\bgoogle\s*email\b/i,
      /\bmail\s*account\b/i,
    ],
  },
  {
    slug: 'discord',
    label: 'Discord',
    confidence: 'high',
    patterns: [/\bdiscord\b/i, /\bnitro\b/i],
  },
  {
    slug: 'microsoft365',
    label: 'Microsoft 365',
    confidence: 'high',
    patterns: [
      /\bmicrosoft\s*365\b/i,
      /\boffice\s*365\b/i,
      /\bm365\b/i,
      /\boffice\s*personal\b/i,
    ],
  },
  {
    slug: 'duolingo',
    label: 'Duolingo',
    confidence: 'high',
    patterns: [/\bduolingo\b/i],
  },
  {
    slug: 'amazon',
    label: 'Amazon',
    confidence: 'high',
    patterns: [/\bamazon\s*prime\b/i, /\bprime\s*video\b/i],
  },
  {
    slug: 'coursera',
    label: 'Coursera',
    confidence: 'high',
    patterns: [/\bcoursera\b/i],
  },
  {
    slug: 'headspace',
    label: 'Headspace',
    confidence: 'high',
    patterns: [/\bheadspace\b/i],
  },
  {
    slug: 'miro',
    label: 'Miro',
    confidence: 'high',
    patterns: [/\bmiro\b/i],
  },
  {
    slug: 'max',
    label: 'Max / HBO',
    confidence: 'high',
    patterns: [/\bhbo\b/i, /\bmax\s*plan\b/i, /\bhbo\s*max\b/i],
  },
];

const DURATION_PATTERNS: Array<{ tag: string; pattern: RegExp }> = [
  { tag: '18m', pattern: /\b18\s*(m|mo|month|months|شهر|شهور)\b/i },
  { tag: '12m', pattern: /\b(12|1)\s*(year|yr|y|سنة|عام)\b/i },
  { tag: '12m', pattern: /\b12\s*(m|mo|month|months|شهر)\b/i },
  { tag: '6m', pattern: /\b6\s*(m|mo|month|months|شهر)\b/i },
  { tag: '3m', pattern: /\b3\s*(m|mo|month|months|شهر)\b/i },
  { tag: '1m', pattern: /\b1\s*(m|mo|month|months|شهر)\b/i },
  { tag: '1m', pattern: /\bmonthly\b/i },
];

export function extractDurationTag(text: string): string | null {
  for (const rule of DURATION_PATTERNS) {
    if (rule.pattern.test(text)) return rule.tag;
  }
  return null;
}

export function classifyProduct(
  title: string,
  description?: string | null,
): FamilyClassification {
  const haystack = `${title}\n${description ?? ''}`;
  const durationTag = extractDurationTag(haystack);

  for (const rule of FAMILY_RULES) {
    if (rule.patterns.some((p) => p.test(haystack))) {
      return {
        slug: rule.slug,
        label: rule.label,
        confidence: rule.confidence,
        durationTag,
      };
    }
  }

  return {
    slug: 'other',
    label: 'أخرى',
    confidence: 'low',
    durationTag,
  };
}

export function familyFieldsFor(title: string, description?: string | null) {
  const c = classifyProduct(title, description);
  return {
    familySlug: c.slug,
    familyLabel: c.label,
    familyConfidence: c.confidence,
    durationTag: c.durationTag,
  };
}

export function listKnownFamilies() {
  return FAMILY_RULES.map((r) => ({ slug: r.slug, label: r.label }));
}
