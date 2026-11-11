/**
 * RightAware Indigenous Citation & Numeral Normalizer
 * File: supabase/functions/synthesize-indigenous-speech/citation-normalizer.ts
 * 
 * Expands Nigerian statutory citations and Arabic numerals into authentic
 * spoken phonetics for Naija Speech and Langa TTS models.
 */

export const STATUTORY_SPOKEN_MAP: Record<string, Record<"yo" | "ig" | "ha", string>> = {
  "1999 Constitution": {
    yo: "Iwe Ofin Naijiria",
    ig: "Iwu Ala Nigeria",
    ha: "Tsarin Mulkin Najeriya",
  },
  "ACJA 2015": {
    yo: "Ofin Idajo Odaran",
    ig: "Iwu Ikpe Mpu",
    ha: "Dokar Shari'ar Laifuka",
  },
  "Police Act 2020": {
    yo: "Ofin Olopaa",
    ig: "Iwu ndi Uwe Ojii",
    ha: "Dokar Rundunar Yan Sanda",
  },
  "Child Rights Act": {
    yo: "Ofin Eto Omode",
    ig: "Iwu Ikike Umuaka",
    ha: "Dokar Kare Hakkin Yara",
  },
  "Cybercrimes Act 2015": {
    yo: "Ofin Odaran Ayelujara",
    ig: "Iwu Mpu Kọmputa",
    ha: "Dokar Laifukan Yanar Gizo",
  },
};

export const SECTION_LABEL_MAP = {
  yo: {
    section: "Abala",
    subsection: "ẹsẹ",
    inStatute: "nínú",
  },
  ig: {
    section: "Nkeji",
    subsection: "nkebi",
    inStatute: "n'ime",
  },
  ha: {
    section: "Sashi na",
    subsection: "karamin sashi na",
    inStatute: "a cikin",
  },
} as const;

const DIGIT_WORDS: Record<"yo" | "ig" | "ha", string[]> = {
  yo: ["odo", "oókan", "eéjì", "ẹ́ẹ́ta", "ẹ́ẹ̀rin", "aárùn-ún", "ẹ́ẹ̀fà", "eéje", "ẹ́ẹ̀jọ", "ẹ́ẹ̀sán"],
  ig: ["efu", "otu", "abụọ", "atọ", "anọ", "ise", "isii", "asaa", "asatọ", "itoolu"],
  ha: ["sifili", "ɗaya", "biyu", "uku", "huɗu", "biyar", "shida", "bakwai", "takwas", "tara"],
};

export const NUMBERS_1_TO_50: Record<"yo" | "ig" | "ha", Record<number, string>> = {
  yo: {
    1: "oókan", 2: "eéjì", 3: "ẹ́ẹ́ta", 4: "ẹ́ẹ̀rin", 5: "aárùn-ún",
    6: "ẹ́ẹ̀fà", 7: "eéje", 8: "ẹ́ẹ̀jọ", 9: "ẹ́ẹ̀sán", 10: "mẹ́wàá",
    11: "oókànlá", 12: "eéjìlá", 13: "ẹ́ẹ́tàlá", 14: "ẹ́ẹ̀rìnlá", 15: "eédógún",
    16: "ẹ́rìndínlógún", 17: "eétàdínlógún", 18: "eéjìdínlógún", 19: "oókàndínlógún", 20: "ogún",
    21: "oókànlélógún", 22: "eéjìlélógún", 23: "ẹ́ẹ́tàlélógún", 24: "ẹ́ẹ̀rìnlélógún", 25: "mẹ́ẹ̀dọ́gbọ̀n",
    26: "ẹ́rìndínlọ́gbọ̀n", 27: "eétàdínlọ́gbọ̀n", 28: "eéjìdínlọ́gbọ̀n", 29: "oókàndínlọ́gbọ̀n", 30: "ọgbọ̀n",
    31: "oókànlélọ́gbọ̀n", 32: "eéjìlélọ́gbọ̀n", 33: "ẹ́ẹ́tàlélọ́gbọ̀n", 34: "ẹ́ẹ̀rìnlélọ́gbọ̀n", 35: "márùndínlógójì",
    36: "ẹ́rìndínlógójì", 37: "eétàdínlógójì", 38: "eéjìdínlógójì", 39: "oókàndínlógójì", 40: "ogójì",
    41: "oókànlélógójì", 42: "eéjìlélógójì", 43: "ẹ́ẹ́tàlélógójì", 44: "ẹ́ẹ̀rìnlélógójì", 45: "márùndínláàdọ́ta",
    46: "ẹ́rìndínláàdọ́ta", 47: "eétàdínláàdọ́ta", 48: "eéjìdínláàdọ́ta", 49: "oókàndínláàdọ́ta", 50: "àádọ́ta",
  },
  ig: {
    1: "otu", 2: "abụọ", 3: "atọ", 4: "anọ", 5: "ise",
    6: "isii", 7: "asaa", 8: "asatọ", 9: "itoolu", 10: "iri",
    11: "iri na otu", 12: "iri na abụọ", 13: "iri na atọ", 14: "iri na anọ", 15: "iri na ise",
    16: "iri na isii", 17: "iri na asaa", 18: "iri na asatọ", 19: "iri na itoolu", 20: "iri abụọ",
    21: "iri abụọ na otu", 22: "iri abụọ na abụọ", 23: "iri abụọ na atọ", 24: "iri abụọ na anọ", 25: "iri abụọ na ise",
    26: "iri abụọ na isii", 27: "iri abụọ na asaa", 28: "iri abụọ na asatọ", 29: "iri abụọ na itoolu", 30: "iri atọ",
    31: "iri atọ na otu", 32: "iri atọ na abụọ", 33: "iri atọ na atọ", 34: "iri atọ na anọ", 35: "iri atọ na ise",
    36: "iri atọ na isii", 37: "iri atọ na asaa", 38: "iri atọ na asatọ", 39: "iri atọ na itoolu", 40: "iri anọ",
    41: "iri anọ na otu", 42: "iri anọ na abụọ", 43: "iri anọ na atọ", 44: "iri anọ na anọ", 45: "iri anọ na ise",
    46: "iri anọ na isii", 47: "iri anọ na asaa", 48: "iri anọ na asatọ", 49: "iri anọ na itoolu", 50: "iri ise",
  },
  ha: {
    1: "ɗaya", 2: "biyu", 3: "uku", 4: "huɗu", 5: "biyar",
    6: "shida", 7: "bakwai", 8: "takwas", 9: "tara", 10: "goma",
    11: "goma sha ɗaya", 12: "goma sha biyu", 13: "goma sha uku", 14: "goma sha huɗu", 15: "goma sha biyar",
    16: "goma sha shida", 17: "goma sha bakwai", 18: "goma sha takwas", 19: "goma sha tara", 20: "ashirin",
    21: "ashirin da ɗaya", 22: "ashirin da biyu", 23: "ashirin da uku", 24: "ashirin da huɗu", 25: "ashirin da biyar",
    26: "ashirin da shida", 27: "ashirin da bakwai", 28: "ashirin da takwas", 29: "ashirin da tara", 30: "talatin",
    31: "talatin da ɗaya", 32: "talatin da biyu", 33: "talatin da uku", 34: "talatin da huɗu", 35: "talatin da biyar",
    36: "talatin da shida", 37: "talatin da bakwai", 38: "talatin da takwas", 39: "talatin da tara", 40: "arba'in",
    41: "arba'in da ɗaya", 42: "arba'in da biyu", 43: "arba'in da uku", 44: "arba'in da huɗu", 45: "arba'in da biyar",
    46: "arba'in da shida", 47: "arba'in da bakwai", 48: "arba'in da takwas", 49: "arba'in da tara", 50: "hamsin",
  },
};

/**
 * Converts an integer into spoken indigenous words.
 * Uses exact 1–50 tables; falls back to digit-by-digit words for n > 50.
 */
export function numberToIndigenousWords(n: number, lang: "yo" | "ig" | "ha"): string {
  if (NUMBERS_1_TO_50[lang] && NUMBERS_1_TO_50[lang][n]) {
    return NUMBERS_1_TO_50[lang][n];
  }

  return String(n)
    .split("")
    .map((d) => {
      const idx = parseInt(d, 10);
      return !isNaN(idx) ? DIGIT_WORDS[lang][idx] : d;
    })
    .join(" ");
}

/**
 * Strips acute (\u0301), grave (\u0300), macron (\u0304), caron (\u030C),
 * while strictly preserving combining dot below (\u0323) for essential
 * orthographic distinctions like ẹ, ọ, ṣ, ụ, ị.
 */
export function stripDiacriticsForNaijaSpeech(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u0301\u0304\u030C]/g, "")
    .normalize("NFC");
}

/**
 * Deterministically normalizes statutory citations and standalone numbers before TTS synthesis.
 */
export function normalizeCitationsForTTS(
  rawText: string,
  lang: "yo" | "ig" | "ha",
  stripToneMarks = false
): string {
  if (!rawText) return "";
  const labels = SECTION_LABEL_MAP[lang] || SECTION_LABEL_MAP.yo;

  // 1. Match and expand structured legal citations: [Section 35(1), 1999 Constitution]
  const citationRegex = /\[?(?:Section|S\.)\s*(\d+)(?:\(([a-zA-Z0-9]+)\))?,\s*([^\]\n]+)\]?/gi;

  let normalized = rawText.replace(citationRegex, (_, sectionStr, subSectionStr, statuteRaw) => {
    const secNum = parseInt(sectionStr, 10);
    const spokenSec = !isNaN(secNum) ? numberToIndigenousWords(secNum, lang) : sectionStr;

    const statuteClean = statuteRaw.trim();
    const spokenStatute = STATUTORY_SPOKEN_MAP[statuteClean]?.[lang] || statuteClean;

    let phrase = `${labels.section} ${spokenSec}`;

    if (subSectionStr) {
      const subNum = parseInt(subSectionStr, 10);
      const spokenSub = !isNaN(subNum) ? numberToIndigenousWords(subNum, lang) : subSectionStr;
      phrase += ` ${labels.subsection} ${spokenSub}`;
    }

    return `${phrase} ${labels.inStatute} ${spokenStatute}`;
  });

  // 2. Expand remaining standalone 1-2 digit numbers (e.g. "24 hours" -> "ẹ́ẹ̀rìnlélógún hours")
  normalized = normalized.replace(/\b(\d{1,2})\b/g, (_, numStr) => {
    const num = parseInt(numStr, 10);
    return !isNaN(num) ? numberToIndigenousWords(num, lang) : numStr;
  });

  // 3. Strip remaining bracket artifacts and collapse redundant whitespace
  normalized = normalized.replace(/[\[\]\(\)]/g, "").replace(/\s+/g, " ").trim();

  // 4. Optional tone-mark stripping for Naija Speech flat acoustic models
  if (stripToneMarks) {
    normalized = stripDiacriticsForNaijaSpeech(normalized);
  }

  return normalized;
}

