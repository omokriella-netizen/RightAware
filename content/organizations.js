/* RightAware Organizations directory (v2).
   HONESTY RULE: no invented names, contacts, addresses or websites.
   v2 lists only generic ORGANIZATION TYPES (what they do). Full organization records
   are added later following the schema below, each with verification status + source.
   Full-record schema: id, name, logo, description, services[], specialization,
   location, address, phone, email, website, verification {"status":"unverified|pending|verified","source":"","date":""},
   source, contactNote. Never publish a record with verification.status "verified"
   unless the details were confirmed from an official source. */
window.RA_ORG_TYPES = [
  { id:"t-legalaid", name:"Legal Aid (free legal assistance)", icon:"⚖",
    help:"Free representation for those who cannot afford a lawyer, subject to eligibility.",
    specializations:["Criminal defence","Civil claims (eligible)","Detention cases"] },
  { id:"t-humanrights", name:"Human-rights protection body", icon:"🛡",
    help:"Receives complaints of rights violations and can investigate or refer.",
    specializations:["Rights complaints","Investigations","Referrals"] },
  { id:"t-police-complaints", name:"Police complaints unit", icon:"🚔",
    help:"Receives complaints of police misconduct for internal/disciplinary review.",
    specializations:["Misconduct reports","Bail extortion","Brutality complaints"] },
  { id:"t-gbv", name:"Domestic & sexual-violence support services", icon:"💜",
    help:"Safety, medical, counselling and legal referral for survivors.",
    specializations:["Safe shelter info","Medical referral","Counselling","Legal referral"] },
  { id:"t-child", name:"Child-protection services", icon:"🧒",
    help:"Response to abuse, neglect, trafficking and exploitation of minors.",
    specializations:["Abuse reports","Trafficking","School safety"] },
  { id:"t-disability", name:"Disability support organisations", icon:"♿",
    help:"Advice, accessibility complaints and service referrals.",
    specializations:["Accessibility","Education accommodation","Employment"] },
  { id:"t-consumer", name:"Consumer-protection bodies", icon:"🛒",
    help:"Complaints about faulty goods, failed services and unfair practices.",
    specializations:["Refunds","Fake products","Service failures"] },
  { id:"t-environment", name:"Environmental response channels", icon:"🌳",
    help:"Pollution and environmental-harm reporting routes.",
    specializations:["Spills","Emissions","Dumping"] }
];
/* Full organization records go here when verified (empty until then). */
window.RA_ORGANIZATIONS = [];
