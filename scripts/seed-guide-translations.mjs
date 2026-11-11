// scripts/seed-guide-translations.mjs
// Offline seed pipeline for the 28 Rights Guides (Tier 2 on-demand bundles)

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, "i18n", "guides");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. Load canonical English source from content/rights.js
const rightsSource = fs.readFileSync(path.join(ROOT_DIR, "content", "rights.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(rightsSource, sandbox);

const CANONICAL_GUIDES = sandbox.window.RA_RIGHTS_DETAIL || [];
console.log(`Loaded ${CANONICAL_GUIDES.length} canonical rights topics from content/rights.js.`);

// Load dictionary strings from content/i18n.js for consistent titles and summaries
const i18nSource = fs.readFileSync(path.join(ROOT_DIR, "content", "i18n.js"), "utf8");
vm.runInContext(i18nSource, sandbox);
const strings = sandbox.window.RA_I18N.strings;

// 2. Localized content generator for Nigerian Pidgin (pcm), Yoruba (yo), Igbo (ig), Hausa (ha)
// Preserves statutory citations in brackets, e.g. [Section 35, 1999 Constitution]

function buildLocalizedBundle(lang) {
  const bundle = {};

  for (const guide of CANONICAL_GUIDES) {
    const id = guide.id;
    const titleKey = `right.${id}`;
    const sumKey = `rightsum.${id}`;

    const title = strings[titleKey]?.[lang] || guide.title;
    const summary = strings[sumKey]?.[lang] || guide.summary;

    let explanation = guide.explanation || [];
    let meaning = guide.meaning || [];
    let canDo = guide.canDo || [];
    let avoid = guide.avoid || [];

    // Localized checklists & explanations per language
    if (lang === "pcm") {
      explanation = explanation.map(p => p
        .replace(/Fundamental rights are the minimum guarantees/g, "Basic rights na the minimum guarantee wey")
        .replace(/In Nigeria they are set out in Chapter IV of the 1999 Constitution/g, "For Nigeria dem write am for Chapter IV of the 1999 Constitution")
        .replace(/These rights limit what the government/g, "This rights dey stop wetin government")
        .replace(/can lawfully do to you/g, "fit do to you by law")
      );
      meaning = meaning.map(m => m
        .replace(/You are entitled to these rights regardless of/g, "You get right to this things no matter your")
        .replace(/Some rights are absolute/g, "Some rights dey solid kpata-kpata")
        .replace(/If a fundamental right is violated, you can seek redress in court/g, "If person break your right, you fit carry am go court")
      );
      canDo = canDo.map(c => c
        .replace(/Learn the rights in/g, "Learn your rights for")
        .replace(/Document violations: dates, places, people involved/g, "Write everything down: date, place, people name, and photos")
        .replace(/Report through proper channels/g, "Report am for proper place and find lawyer quick")
      );
      avoid = avoid.map(a => a
        .replace(/Do not assume every unfair situation is a constitutional violation/g, "No assume say every bad thing na constitution matter")
        .replace(/Do not delay/g, "No delay at all")
        .replace(/Do not confront armed or hostile actors physically/g, "No go fight person wey hold gun; your life first")
      );
    } else if (lang === "yo") {
      explanation = explanation.map(p => p
        .replace(/Fundamental rights are the minimum guarantees/g, "Àwọn ẹ̀tọ́ pàtàkì jẹ́ àwọn ẹ̀tọ́ kíkéré jùlọ tí")
        .replace(/In Nigeria they are set out in Chapter IV of the 1999 Constitution/g, "Ní Nàìjíríà, a kọ wọ́n sínú Chapter IV ti 1999 Constitution")
        .replace(/These rights limit what the government/g, "Àwọn ẹ̀tọ́ wọ̀nyí ń dín ohun tí ìjọba")
        .replace(/can lawfully do to you/g, "lè fi òfin ṣe sí ọ kù")
      );
      meaning = meaning.map(m => m
        .replace(/You are entitled to these rights regardless of/g, "O ní ẹ̀tọ́ sí àwọn ẹ̀tọ́ wọ̀nyí láìwo")
        .replace(/Some rights are absolute/g, "Àwọn ẹ̀tọ́ kan wà tí kò ṣe é yẹ̀bà")
        .replace(/If a fundamental right is violated, you can seek redress in court/g, "Bí wọ́n bá tẹ ẹ̀tọ́ rẹ lójú, o lè gba ẹ̀tọ́ rẹ ní kòòtù")
      );
      canDo = canDo.map(c => c
        .replace(/Learn the rights in/g, "Kọ́ nípa àwọn ẹ̀tọ́ rẹ nínú")
        .replace(/Document violations: dates, places, people involved/g, "Kọ gbogbo nǹkan sílẹ̀: ọjọ́, ibi tí ó ti ṣẹlẹ̀, àwọn ènìyàn tí ó wà níbẹ̀")
        .replace(/Report through proper channels/g, "Fi ẹ̀sùn sùn ní àwọn ọ̀nà tí ó tọ́ kí o sì wá agbẹjọ́rò ní kíákíá")
      );
      avoid = avoid.map(a => a
        .replace(/Do not assume every unfair situation is a constitutional violation/g, "Má ṣe rò pé gbogbo àìṣedéédéé ló jẹ́ ẹ̀ṣẹ̀ sí òfin ìpìlẹ̀")
        .replace(/Do not delay/g, "Má ṣe falẹ̀ rárá")
        .replace(/Do not confront armed or hostile actors physically/g, "Má ṣe bá àwọn tó gbé ohun ìjà jà ní ti ara; ààbò ẹ̀mí rẹ ló ṣe pàtàkì jù")
      );
    } else if (lang === "ig") {
      explanation = explanation.map(p => p
        .replace(/Fundamental rights are the minimum guarantees/g, "Ikike ndị dị mkpa bụ nkwa kacha nta")
        .replace(/In Nigeria they are set out in Chapter IV of the 1999 Constitution/g, "Na Naịjirịa, edere ha na Chapter IV nke 1999 Constitution")
        .replace(/These rights limit what the government/g, "Ikike ndị a na-egbochi ihe gọọmentị")
        .replace(/can lawfully do to you/g, "nwere ike iji iwu mee gị")
      );
      meaning = meaning.map(m => m
        .replace(/You are entitled to these rights regardless of/g, "I nwere ikike ndị a n'agbanyeghị")
        .replace(/Some rights are absolute/g, "Ụfọdụ ikike siri ike kpamkpam")
        .replace(/If a fundamental right is violated, you can seek redress in court/g, "Ọ bụrụ na a mebie ikike gị, ị nwere ike ịgakwuru ụlọ ikpe")
      );
      canDo = canDo.map(c => c
        .replace(/Learn the rights in/g, "Mụta ikike ndị dị na")
        .replace(/Document violations: dates, places, people involved/g, "Detuo ihe niile merenụ: ụbọchị, ebe, ndị nọ ya, foto")
        .replace(/Report through proper channels/g, "Kpesa n'ụzọ ziri ezi ma chọọ onye ọka iwu ngwa ngwa")
      );
      avoid = avoid.map(a => a
        .replace(/Do not assume every unfair situation is a constitutional violation/g, "Echela na ihe ọ bụla na-ezighị ezi mebiri iwu ala")
        .replace(/Do not delay/g, "Egbughị oge ma ọlị")
        .replace(/Do not confront armed or hostile actors physically/g, "Ebusola ndị ji egbe agha; nchekwa ndụ gị kacha mkpa")
      );
    } else if (lang === "ha") {
      explanation = explanation.map(p => p
        .replace(/Fundamental rights are the minimum guarantees/g, "Hakkokin asali sune mafi karancin kariya")
        .replace(/In Nigeria they are set out in Chapter IV of the 1999 Constitution/g, "A Najeriya an bayyana su a Chapter IV na 1999 Constitution")
        .replace(/These rights limit what the government/g, "Wadannan hakkoki suna takaita abin da gwamnati")
        .replace(/can lawfully do to you/g, "za ta iya yi maka bisa doka")
      );
      meaning = meaning.map(m => m
        .replace(/You are entitled to these rights regardless of/g, "Kana da wadannan hakkoki ba tare da la'akari da")
        .replace(/Some rights are absolute/g, "Wasu hakkokin na dindindin ne")
        .replace(/If a fundamental right is violated, you can seek redress in court/g, "Idan an keta hakkin ka, za ka iya zuwa kotu neman hakki")
      );
      canDo = canDo.map(c => c
        .replace(/Learn the rights in/g, "Koyi hakkokin da ke cikin")
        .replace(/Document violations: dates, places, people involved/g, "Rubuta dukkan bayanan da suka faru: kwanan wata, wurin da abin ya faru, da sunayen mutane")
        .replace(/Report through proper channels/g, "Kai rahoto ta hanyar da ta dace kuma ka nemi lauya cikin gaggawa")
      );
      avoid = avoid.map(a => a
        .replace(/Do not assume every unfair situation is a constitutional violation/g, "Kada ka dauka cewa kowane rashin adalci ya saba wa kundin tsarin mulki")
        .replace(/Do not delay/g, "Kada ka bata lokaci")
        .replace(/Do not confront armed or hostile actors physically/g, "Kada ka fuskanci masu dauke da makamai da fada; amincin ranka ya fi komai")
      );
    }

    bundle[id] = {
      id: id,
      title: title,
      summary: summary,
      status: guide.status || "partial",
      review_status: "ai_draft_pending_review",
      explanation: explanation,
      meaning: meaning,
      legalBasis: guide.legalBasis || { text: "1999 Constitution", status: "verify" },
      canDo: canDo,
      avoid: avoid,
      examples: guide.examples || [],
      faqs: guide.faqs || [],
      related: guide.related || [],
      orgs: guide.orgs || [],
      sources: guide.sources || []
    };
  }

  return bundle;
}

// 3. Generate and write all 4 language bundles
const LANGUAGES = ["pcm", "yo", "ig", "ha"];

for (const lang of LANGUAGES) {
  const bundle = buildLocalizedBundle(lang);
  const count = Object.keys(bundle).length;
  if (count !== 28) {
    throw new Error(`Integrity error: Expected 28 guides for ${lang}, found ${count}`);
  }

  const filePath = path.join(OUTPUT_DIR, `${lang}.json`);
  fs.writeFileSync(filePath, JSON.stringify(bundle, null, 2), "utf8");
  console.log(`Generated ${filePath} (${count} topics, ${fs.statSync(filePath).size} bytes).`);
}

console.log("All 4 guide bundles successfully seeded to i18n/guides/!");

