/* RightAware shared content index (v1).
   Search reads this file. The Rights Library itself lives in ONE place: content/rights.js
   (window.RA_RIGHTS_DETAIL plus the derived window.RA_RIGHTS). Do not define RA_RIGHTS
   here — add or edit rights categories only in content/rights.js.
   NOTE: Overviews are general information. Source hints marked VERIFY must be
   confirmed against official texts before publishing as final. */

window.RA_VIDEOS = [
  { title:"What to do if police arrest you", meta:"3:42 • English + Pidgin • Coming soon", tag:"Police & Arrest", desc:"Stop, search, statement, bail and reporting abuse — step by step." },
  { title:"Tenant rights: can your landlord lock you out?", meta:"4:15 • English • Coming soon", tag:"Housing", desc:"Agreements, receipts, notice and lawful eviction process." },
  { title:"Your vote, your power: election rights", meta:"5:02 • English • Coming soon", tag:"Civic Duty", desc:"Registration, PVC, election day conduct and reporting malpractice." },
  { title:"Wrongful dismissal: first 3 steps", meta:"Coming soon", tag:"Employment", desc:"Documents to gather and how to write a formal demand. Placeholder." },
  { title:"Online scams: protect your money", meta:"Coming soon", tag:"Digital", desc:"OTPs, fake vendors and what to do in the first hour. Placeholder." },
  { title:"Child safety basics for parents", meta:"Coming soon", tag:"Children", desc:"Prevention, safe reporting and support paths. Placeholder." }
];

window.RA_FAQS = [
  { q:"Is RightAware a law firm? Can it represent me?", a:"No. RightAware provides general legal information and referrals only. It does not represent anyone. For representation, use Get Help or the Professionals directory to find a qualified lawyer." },
  { q:"Is RightAware content legal advice?", a:"No. Content is general information for awareness. Laws differ by state and change over time. Always confirm with a qualified legal practitioner for your specific case." },
  { q:"Do I have to pay to use RightAware?", a:"The v1 awareness library, resources and AI demo are free. Independent lawyers in the directory may charge their own fees — confirm fees before engaging anyone." },
  { q:"I am in danger right now. What should I do?", a:"Contact emergency services or go somewhere safe first, then document what happened. See Get Help for emergency guidance. (Verify current emergency numbers via official sources.)" },
  { q:"Can police arrest me for owing money?", a:"Debt is generally a civil matter. See the Police & Arrest guide for what police can and cannot do, and report violations." },
  { q:"How do I report a rights violation on RightAware?", a:"Use Get Help → Report a concern. Describe what happened, where/when, who was involved, and what evidence you have. You can save a copy for yourself." },
  { q:"Are the lawyers on RightAware verified?", a:"v1 uses DEMO profiles only — clearly marked placeholders, not real lawyers. Real verification (e.g. NBA enrolment checks) still needs to be built." },
  { q:"What does the RightAware AI do?", a:"The v1 AI is a demo assistant that points you to library pages. It is not connected to a live legal service and must not be treated as a lawyer." }
];

/* DEMO professionals — fictional placeholders. No real names, phones or emails. */
window.RA_LAWYERS = [
  { id:"d1", name:"Demo Advocate 1 (DEMO)", initials:"D1", practice:"Human Rights & Police Matters", location:"Lagos", exp:"8 yrs (demo)", rating:"4.9", reviews:42, fee:"Demo rate", bio:"Handles stop-and-search, arrest and bail guidance in this demo dataset.", tags:["police","arrest","bail"], rev:[["Demo Client A","Clear explanation of bail steps. (Demo review)","5"],["Demo Client B","Polite and prompt response. (Demo review)","5"]] },
  { id:"d2", name:"Demo Advocate 2 (DEMO)", initials:"D2", practice:"Family & Gender-Based Violence", location:"Abuja FCT", exp:"6 yrs (demo)", rating:"4.8", reviews:35, fee:"First chat free (demo)", bio:"Supports survivors with safety planning and referral paths in this demo.", tags:["women","children","family"], rev:[["Demo Client C","Felt listened to and guided. (Demo review)","5"]] },
  { id:"d3", name:"Demo Advocate 3 (DEMO)", initials:"D3", practice:"Employment & Workplace Disputes", location:"Rivers", exp:"7 yrs (demo)", rating:"4.7", reviews:28, fee:"Demo rate", bio:"Unpaid salary, dismissal letters and settlement talks (demo).", tags:["employment","salary"], rev:[["Demo Client D","Helped draft my demand letter. (Demo review)","4"]] },
  { id:"d4", name:"Demo Advocate 4 (DEMO)", initials:"D4", practice:"Tenancy & Property", location:"Oyo", exp:"9 yrs (demo)", rating:"4.8", reviews:31, fee:"Demo rate", bio:"Tenancy agreements, notices and eviction defence overview (demo).", tags:["tenancy","rent","land"], rev:[["Demo Client E","Explained my notice period clearly. (Demo review)","5"]] },
  { id:"d5", name:"Demo Advocate 5 (DEMO)", initials:"D5", practice:"Consumer & Digital Fraud", location:"Kano", exp:"5 yrs (demo)", rating:"4.6", reviews:19, fee:"Demo rate", bio:"Faulty goods, failed transfers and online-scam first steps (demo).", tags:["consumer","digital","fraud"], rev:[["Demo Client F","Knew the complaint steps. (Demo review)","4"]] },
  { id:"d6", name:"Demo Clinic (DEMO)", initials:"DC", practice:"Free Clinic — Students & Low Income", location:"Enugu", exp:"Clinic (demo)", rating:"4.9", reviews:57, fee:"Free (demo)", bio:"First-line guidance and referrals for those who cannot pay (demo).", tags:["free","students"], rev:[["Demo Client G","Grateful for the free guidance. (Demo review)","5"]] }
];

/* Organisation TYPES — no invented phone numbers/addresses. Verify contacts officially. */
window.RA_ORGS = [
  { name:"Legal Aid (free legal assistance)", help:"Free representation for those who cannot afford a lawyer, subject to eligibility.", contact:"VERIFY via official government directory before publishing." },
  { name:"Human-rights protection body", help:"Receives complaints of rights violations and can investigate or refer.", contact:"VERIFY via official directory before publishing." },
  { name:"Police complaints unit", help:"Receives complaints of police misconduct for internal/disciplinary review.", contact:"VERIFY via official police channels before publishing." },
  { name:"Domestic & sexual-violence support services", help:"Safety, medical, counselling and legal referral for survivors.", contact:"VERIFY current state helplines via official sources before publishing." },
  { name:"Child-protection services", help:"Response to abuse, neglect, trafficking and exploitation of minors.", contact:"VERIFY via state ministry/official directory before publishing." },
  { name:"Disability support organisations", help:"Advice, accessibility complaints and service referrals.", contact:"VERIFY via official/civil-society directories before publishing." }
];

window.RA_SEARCH_INDEX = function(){
  const pages = [
    { title:"Home", url:"index.html", text:"home rightaware understand rights know power get started explore" },
    { title:"About Us", url:"about.html", text:"about mission vision purpose civic tech" },
    { title:"Explore Rights (library)", url:"rights.html", text:"explore rights library categories search" },
    { title:"Laws & Constitution Library", url:"laws.html", text:"laws constitution acts regulations documents legal library search download" },
    { title:"Video Library", url:"videos.html", text:"videos watch learn visual explainers" },
    { title:"Organizations Directory", url:"organizations.html", text:"organisations organizations directory help support ngo legal aid" },
    { title:"Resources", url:"resources.html", text:"resources constitution guides videos faqs downloads links organisations" },
    { title:"Get Help", url:"help.html", text:"get help emergency report concern legal aid organisations contacts" },
    { title:"Legal Professionals (Demo)", url:"lawyers.html", text:"lawyer professionals directory demo rating review book" },
    { title:"My Account (Demo)", url:"account.html", text:"account profile saved items consultations notifications settings" },
    { title:"Admin (Demo)", url:"admin.html", text:"admin manage content users reviews messages dashboard" },
    { title:"RightAware AI (Demo)", url:"ai.html", text:"ai assistant chat ask question demo" },
    { title:"Contact Us", url:"contact.html", text:"contact email form message phone address" }
  ];
  const seen = {};
  const rights = [];
  (window.RA_RIGHTS||[]).forEach(r=>{ seen[r.title]=1; rights.push({
    title:r.title, url: (r.fullGuide || r.slug || (r.id ? ("rights/topic.html?id="+r.id) : "rights.html")),
    text:(r.title+" "+r.summary+" "+(r.keywords||"")).toLowerCase() }); });
  (window.RA_RIGHTS_DETAIL||[]).forEach(r=>{ if(seen[r.title]||r.fullGuide) return;
    rights.push({ title:r.title, url:"rights/topic.html?id="+r.id,
      text:(r.title+" "+r.summary+" "+(r.keywords||"")).toLowerCase() }); });
  const laws = (window.RA_LAWS||[]).map(l=>({ title:"Law: "+l.title, url:"laws.html",
    lawId:l.id, textAvailable:!!l.textAvailable,
    text:(l.title+" "+(l.description||"")+" "+l.category+" "+(l.keywords||"")+" "+(l.sourceNote||l.sourceHint||"")).toLowerCase() }));
  const faqs = (window.RA_FAQS||[]).map(f=>({ title:"FAQ: "+f.q, url:"resources.html#faqs", text:(f.q+" "+f.a).toLowerCase() }));
  const videos = (window.RA_VIDEOS||[]).map(v=>({ title:"Video: "+v.title, url:"resources.html#videos", text:(v.title+" "+v.desc+" "+v.tag).toLowerCase() }));
  return pages.concat(rights, laws, faqs, videos);
};
