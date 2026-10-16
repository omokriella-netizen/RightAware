/* RightAware shared content index.
   Search reads this file. The Rights Library lives in content/rights.js. */

window.RA_VIDEOS = [
  { title:"What to do if police arrest you", meta:"3:42 • English + Pidgin", tag:"Police & Arrest", desc:"Stop, search, statement, bail rules, and reporting abuse step by step." },
  { title:"Tenant rights: can your landlord lock you out?", meta:"4:15 • English", tag:"Housing", desc:"Rent agreements, receipts, mandatory notice, and stopping illegal lockouts." },
  { title:"Your vote, your power: election rights", meta:"5:02 • English", tag:"Civic Duty", desc:"Voter registration, PVC collection, polling unit rules, and reporting fraud." },
  { title:"Wrongful dismissal: first 3 steps", meta:"3:30 • English", tag:"Employment", desc:"What evidence to preserve, demand letters, and filing with the Industrial Court." },
  { title:"Online scams: protect your money", meta:"4:10 • English + Pidgin", tag:"Digital", desc:"Bank OTPs, fake online vendors, account freezing, and reporting to police." },
  { title:"Child safety basics for parents", meta:"3:55 • English", tag:"Children", desc:"Child rights protection, safe reporting, and child helpline contacts." }
];

window.RA_FAQS = [
  { q:"Is RightAware a law firm? Can it represent me?", a:"No. RightAware provides public legal education, rights guides, and verified referral directories. We do not provide private courtroom representation. If you need representation, contact the Legal Aid Council or a licensed legal practitioner in our directory." },
  { q:"Is RightAware content legal advice?", a:"No. Content is general legal awareness based on Nigerian statutes. If you are facing formal charges or court litigation, always consult a qualified lawyer for your specific situation." },
  { q:"Do I have to pay to use RightAware?", a:"All legal guides, resources, and search tools on RightAware are 100% free. Independent legal practitioners in our directory set their own consultation terms." },
  { q:"I am in danger right now. What should I do?", a:"If you or anyone is in immediate physical danger, call 112 or 767, or move to a crowded public area first. Once safe, document what happened and check our emergency guides." },
  { q:"Can police arrest me for owing money?", a:"No. Unpaid loans, tenant arrears, and personal debts are civil disputes. Section 32 of the Police Act 2020 explicitly bars police from arresting citizens over civil debt." },
  { q:"How do I report a rights violation on RightAware?", a:"Use Get Help → Report a Concern. Enter the officer or party details, what occurred, location, and evidence. You can save and print a copy for your records." },
  { q:"Are the lawyers in the directory verified?", a:"All listed legal practitioners are reviewed against Nigerian Bar Association (NBA) credentials and Supreme Court enrolment before being published." },
  { q:"What does the RightAware Legal Assistant do?", a:"The Legal Assistant helps you find exact sections and provisions in the 1999 Constitution, ACJA 2015, and state tenancy laws for your situation." }
];

/* Verified legal professionals directory. */
window.RA_LAWYERS = [
  { id:"d1", name:"Barrister Chinedu Okafor", initials:"CO", practice:"Human Rights & Police Matters", location:"Lagos", exp:"8 yrs practice", rating:"4.9", reviews:42, fee:"Initial Consultation Free", bio:"Specializes in police stop-and-search rights, unlawful arrest defense, and bail application.", tags:["police","arrest","bail"], rev:[["K. Adeyemi","Clear explanation of bail steps and calm guidance.","5"],["T. Usman","Prompt response during a checkpoint dispute.","5"]] },
  { id:"d2", name:"Barrister Amina Bello", initials:"AB", practice:"Family & Gender-Based Violence", location:"Abuja FCT", exp:"6 yrs practice", rating:"4.8", reviews:35, fee:"First consultation free", bio:"Dedicated to supporting survivors of domestic abuse, child welfare protection, and safety restraining orders.", tags:["women","children","family"], rev:[["S. Ibrahim","Felt listened to and protected throughout.","5"]] },
  { id:"d3", name:"Barrister Ebiere Briggs", initials:"EB", practice:"Employment & Workplace Disputes", location:"Rivers", exp:"7 yrs practice", rating:"4.7", reviews:28, fee:"Free initial case review", bio:"Handles wrongful dismissal, withheld salaries, and filings before the National Industrial Court.", tags:["employment","salary"], rev:[["D. Nwosu","Helped recover three months of unpaid salaries.","5"]] },
  { id:"d4", name:"Barrister Olumide Fashola", initials:"OF", practice:"Tenancy & Property Law", location:"Oyo", exp:"9 yrs practice", rating:"4.8", reviews:31, fee:"Initial review available", bio:"Expertise in tenancy recovery, statutory quit notices, and defending tenants against unlawful lockouts.", tags:["tenancy","rent","land"], rev:[["M. Adeleke","Explained my statutory notice period clearly.","5"]] },
  { id:"d5", name:"Barrister Fatima Garba", initials:"FG", practice:"Consumer & Digital Fraud", location:"Kano", exp:"5 yrs practice", rating:"4.6", reviews:19, fee:"Standard consultation", bio:"Represents victims of failed bank transfers, consumer fraud, and deceptive commercial contracts.", tags:["consumer","digital","fraud"], rev:[["A. Sani","Helped file our complaint with the FCCPC.","4"]] },
  { id:"d6", name:"Citizens Free Legal Clinic", initials:"CL", practice:"Free Legal Aid for Low Income Citizens", location:"Enugu", exp:"Pro Bono Clinic", rating:"4.9", reviews:57, fee:"Completely Free", bio:"First-line legal representation and human rights defense for citizens who cannot afford private counsel.", tags:["free","students"], rev:[["G. Okonkwo","Grateful for their dedicated free legal support.","5"]] }
];

/* Statutory bodies and citizen complaints desks. */
window.RA_ORGS = [
  { name:"Legal Aid Council of Nigeria (LACON)", help:"Free criminal legal representation and advice for indigent citizens across all 36 states.", contact:"Hotline: 0800 534 2524 | Abuja HQ & State Secretariats" },
  { name:"National Human Rights Commission (NHRC)", help:"Statutory body investigating human rights abuses, unlawful detention, and police brutality.", contact:"Toll-free: 0800 647 2428 | www.nigeriarights.gov.ng" },
  { name:"Police Complaint Response Unit (CRU)", help:"Official police oversight desk for reporting officer extortion, brutality, and illegal arrest.", contact:"WhatsApp: 0805 700 0001 | Phone: 0805 700 0002" },
  { name:"Domestic & Sexual Violence Agency (DSVA)", help:"Emergency medical aid, shelter, and legal restraining order support for survivors.", contact:"Lagos Toll-free: 0800 033 3333 | National Helplines Available" },
  { name:"National Agency for Prohibition of Trafficking in Persons (NAPTIP)", help:"Statutory agency investigating child abuse, exploitation, and human trafficking.", contact:"Toll-free: 0800 225 5627 | complaint@naptip.gov.ng" },
  { name:"Public Complaints Commission (PCC)", help:"Citizen ombudsman for administrative injustice, bureaucratic delay, and government workplace grievances.", contact:"www.pcc.org.ng | State Offices Nationwide" }
];

window.RA_SEARCH_INDEX = function(){
  const pages = [
    { title:"Home", url:"index.html", text:"home rightaware understand rights know power get started explore police bail rent salary" },
    { title:"About Us", url:"about.html", text:"about mission vision purpose civic tech" },
    { title:"Explore Rights", url:"rights.html", text:"explore rights library categories search police arrest tenancy employment" },
    { title:"Laws & Constitution Library", url:"laws.html", text:"laws constitution acts regulations documents legal library search download acja" },
    { title:"Video Library", url:"videos.html", text:"videos watch learn visual explainers arrest tenant scam" },
    { title:"Organizations Directory", url:"organizations.html", text:"organisations organizations directory help support ngo legal aid nhrc cru lacon" },
    { title:"Resources", url:"resources.html", text:"resources constitution guides videos faqs downloads links organisations checklists" },
    { title:"Get Help", url:"help.html", text:"get help emergency report concern legal aid organisations contacts triage" },
    { title:"Legal Directory", url:"lawyers.html", text:"lawyer professionals directory rating review book legal counsel" },
    { title:"My Account", url:"account.html", text:"account profile saved items consultations notifications settings" },
    { title:"Admin", url:"admin.html", text:"admin manage content users reviews messages dashboard" },
    { title:"Legal Assistant", url:"ai.html", text:"ai assistant chat ask question search statutes constitution" },
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
  /* Rights-protection agency directory records (content/organizations.js).
     kind/orgId let search.html apply the shared RA_ORG_BOOST ranking; profile
     links open organizations.html?id=<org-slug>. Existing entries untouched. */
  const orgs = (window.RA_ORGANIZATIONS||[]).map(o=>({
    kind:"org", orgId:o.id,
    title:"Organisation: "+o.name+(o.acronym?" ("+o.acronym+")":""),
    url:"organizations.html?id="+encodeURIComponent(o.id),
    text:([o.name,o.acronym,o.type,o.specialization,(o.rights_areas||[]).join(" "),
      (o.services||[]).join(" "),o.who_they_help,o.keywords,o.country,o.state,o.city,
      o.location,o.coverage].filter(Boolean).join(" ")).toLowerCase()
  }));
  return pages.concat(orgs, rights, laws, faqs, videos);
};
