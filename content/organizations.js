/* RightAware Organizations directory (v3).
   HONESTY RULE: no invented names, contacts, addresses or websites.
   v2 lists generic ORGANIZATION TYPES (what they do).
   v3 adds the sourced RIGHTS PROTECTION AGENCIES DIRECTORY records: 18 Nigerian +
   18 international organizations extracted from the supplied PDF
   "RightAware Rights Protection Agencies Directory — Nigeria and World"
   (research date 2026-10-04), plus 10 official directory hubs (RA_ORG_HUBS,
   external resources — NOT fake organizations).
   Full-record schema: id, name, acronym, type, country, state, city, location,
   coverage, specialization, rights_areas[], services[], who_they_help,
   description, address, phone, email, website, directory_url, keywords,
   source, source_url, last_verified_at,
   verification {"status":"unverified|pending|verified","source":"","date":""},
   contactNote (optional).
   Never publish a record with verification.status "verified" unless the details
   were confirmed from an official source — directory records stay "unverified"
   with source attribution until an administrator approves them. */
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
/* Full organization records — the sourced Rights Protection Agencies Directory
   (v3). Extracted field-for-field from the supplied PDF; missing phone/e-mail/
   address values stay null (never invented). See the header for the schema. */
window.RA_ORG_SOURCE = "RightAware Rights Protection Agencies Directory";
window.RA_ORG_SOURCE_DATE = "2026-10-04";

window.RA_ORGANIZATIONS = [
  /* ==================== PART I — NIGERIA (18) ==================== */
  { id:"org-nhrc", name:"National Human Rights Commission", acronym:"NHRC",
    type:"Human-rights protection body", country:"Nigeria", state:"FCT", city:"Abuja",
    location:"Abuja, Nigeria", coverage:"Nigeria — state offices nationwide",
    specialization:"Statutory human-rights institution: complaints, investigations, victim assistance and redress, detention monitoring, education and policy review.",
    rights_areas:["Human rights & complaints","Police & security accountability","Detention & torture"],
    services:["Complaints and investigations","Victim assistance and redress","Detention monitoring","Human-rights education","Policy review"],
    who_they_help:"Anyone in Nigeria reporting a rights violation — including unlawful detention or abuse by security agencies.",
    description:"Statutory human-rights institution: complaints, investigations, victim assistance and redress, detention monitoring, education and policy review.",
    address:"No.19 Aguiyi Ironsi St., Maitama, Abuja",
    phone:"+234 800 647 2428; 6472 shortcode; +234 903 219 2577",
    email:"info@nhrc.gov.ng",
    website:"https://www.nhrc.gov.ng/",
    directory_url:"https://nhrc.gov.ng/regional-offices.html",
    keywords:"human rights, human rights violation, complaint, abuse, detention, police abuse, police brutality, government abuse, rights commission, report abuse, unlawful detention",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://nhrc.gov.ng/regional-offices.html", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-lacon", name:"Legal Aid Council of Nigeria", acronym:"LACON",
    type:"Legal Aid (free legal assistance)", country:"Nigeria", state:"FCT", city:"Abuja",
    location:"Abuja, Nigeria", coverage:"Nigeria",
    specialization:"Legal aid and representation for eligible poor and vulnerable persons; access to justice and criminal-justice assistance.",
    rights_areas:["Legal aid & access to justice"],
    services:["Legal aid and representation (eligibility applies)","Criminal-justice assistance","Access-to-justice support"],
    who_they_help:"Eligible poor and vulnerable people who cannot afford a lawyer.",
    description:"Legal aid and representation for eligible poor and vulnerable persons; access to justice and criminal-justice assistance.",
    address:"22 Port Harcourt Crescent, Area 11, Garki, Abuja",
    phone:"+234 903 043 6616; +234 703 191 5990",
    email:"info@legalaidcouncil.gov.ng",
    website:"https://www.legalaidcouncil.gov.ng/",
    directory_url:"https://www.legalaidcouncil.gov.ng/",
    keywords:"legal aid, free legal help, free lawyer, lawyer, legal representation, poor, indigent, criminal case, access to justice, vulnerable persons",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.legalaidcouncil.gov.ng/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-fida", name:"FIDA Nigeria", acronym:"FIDA",
    type:"Legal Aid (free legal assistance)", country:"Nigeria", state:"FCT", city:"Abuja",
    location:"Abuja, Nigeria", coverage:"Nigeria",
    specialization:"Free legal representation and assistance for indigent women and children; women's rights, family law, GBV and advocacy.",
    rights_areas:["Legal aid & access to justice","Women's rights & GBV","Child rights"],
    services:["Free legal representation and assistance","Family-law support","GBV response","Advocacy"],
    who_they_help:"Indigent women and children.",
    description:"Free legal representation and assistance for indigent women and children; women's rights, family law, GBV and advocacy.",
    address:"Block 1 Flat 1, Ankpa Close, Ogun St., Area 2, Garki, Abuja",
    phone:"+234 708 849 6115",
    email:"fidanigeria@yahoo.com",
    website:"https://fida.org.ng/",
    directory_url:"https://fida.org.ng/",
    keywords:"women rights, women, girls, children, GBV, domestic violence, family law, sexual violence, rape, free legal help, free legal representation, indigent women",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://fida.org.ng/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-hurilaws", name:"HURILAWS", acronym:null,
    type:"Legal Aid (free legal assistance)", country:"Nigeria", state:"Lagos", city:"Lagos",
    location:"Lagos, Nigeria", coverage:"Nigeria",
    specialization:"Human-rights litigation, legal assistance, constitutional and socio-economic rights, law reform, governance and accountability.",
    rights_areas:["Legal aid & access to justice","Human rights & complaints","Anti-corruption & accountability","Poverty & socio-economic rights"],
    services:["Human-rights litigation","Legal assistance","Law-reform advocacy","Governance and accountability work"],
    who_they_help:"People needing human-rights litigation or legal assistance, including socio-economic rights claims.",
    description:"Human-rights litigation, legal assistance, constitutional and socio-economic rights, law reform, governance and accountability.",
    address:"34 Creek Road, Apapa, Lagos",
    phone:"+234 1 342 6522",
    email:"info@hurilaws.org",
    website:"https://hurilaws.org/",
    directory_url:"https://hurilaws.org/contact-hurilaws/",
    keywords:"human rights, legal assistance, human rights litigation, constitutional rights, socio-economic rights, law reform, governance, accountability, free legal help, human rights lawyer",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://hurilaws.org/contact-hurilaws/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-cleen", name:"CLEEN Foundation", acronym:null,
    type:"Human-rights NGO", country:"Nigeria", state:"Lagos", city:"Lagos",
    location:"Lagos, Nigeria", coverage:"Nigeria",
    specialization:"Public safety, security and accessible justice; police and law-enforcement accountability, research and legislative advocacy.",
    rights_areas:["Police & security accountability","Rule of law & fair hearing","Human rights & complaints"],
    services:["Police and law-enforcement accountability","Research","Legislative advocacy","Public-safety programmes"],
    who_they_help:"Anyone concerned about police conduct, public safety and access to justice.",
    description:"Public safety, security and accessible justice; police and law-enforcement accountability, research and legislative advocacy.",
    address:"21 Akinsanya St., Ojodu-Ikeja, Lagos",
    phone:"0810 249 3148",
    email:"cleen@cleen.org",
    website:"https://cleen.org/",
    directory_url:"https://cleen.org/contact/",
    keywords:"police, police abuse, police brutality, law enforcement, security, public safety, accountability, justice, research, legislative advocacy",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://cleen.org/contact/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-serap", name:"SERAP", acronym:null,
    type:"Human-rights NGO", country:"Nigeria", state:"Lagos", city:"Lagos",
    location:"Lagos, Nigeria", coverage:"Nigeria",
    specialization:"Socio-economic rights, transparency, accountability, anti-corruption, civic space and strategic litigation.",
    rights_areas:["Anti-corruption & accountability","Poverty & socio-economic rights","Civic space & governance"],
    services:["Anti-corruption advocacy","Transparency and accountability work","Strategic litigation","Socio-economic rights advocacy"],
    who_they_help:"Citizens seeking transparency, accountability and enforcement of socio-economic rights.",
    description:"Socio-economic rights, transparency, accountability, anti-corruption, civic space and strategic litigation.",
    address:"2B Oyetola St., Opebi, Ikeja, Lagos",
    phone:"+234 816 053 7202",
    email:"info@serap-nigeria.org",
    website:"https://serap-nigeria.org/",
    directory_url:"https://serap-nigeria.org/contact/",
    keywords:"corruption, anti-corruption, transparency, accountability, socio-economic rights, strategic litigation, civic space, public funds, governance",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://serap-nigeria.org/contact/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-media-rights-agenda", name:"Media Rights Agenda", acronym:"MRA",
    type:"Media freedom organisation", country:"Nigeria", state:"Lagos", city:"Lagos",
    location:"Lagos, Nigeria", coverage:"Nigeria",
    specialization:"Freedom of expression, media freedom, access to information and digital rights.",
    rights_areas:["Freedom of expression & media","Digital rights & privacy"],
    services:["Media-freedom advocacy","Freedom-of-expression litigation","Access-to-information work","Digital-rights advocacy"],
    who_they_help:"Journalists, media workers and anyone whose expression or access to information is threatened.",
    description:"Freedom of expression, media freedom, access to information and digital rights.",
    address:"21 Budland St., Ojodu-Ikeja, Lagos",
    phone:"+234 813 875 5660",
    email:"info@mediarightsagenda.org",
    website:"https://mediarightsagenda.org/",
    directory_url:"https://mediarightsagenda.org/contact-us/",
    keywords:"media freedom, press freedom, journalist, journalists, freedom of expression, expression, access to information, digital rights, censorship, reporter, broadcast",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://mediarightsagenda.org/contact-us/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-actionaid-nigeria", name:"ActionAid Nigeria", acronym:null,
    type:"Human-rights NGO", country:"Nigeria", state:"FCT", city:"Abuja",
    location:"Abuja, Nigeria", coverage:"Nigeria",
    specialization:"Poverty and inequality, women's rights, governance, civic participation, humanitarian response and accountability.",
    rights_areas:["Poverty & socio-economic rights","Women's rights & GBV","Civic space & governance","Humanitarian & conflict"],
    services:["Poverty and inequality programmes","Women's-rights programming","Governance and civic participation","Humanitarian response","Accountability work"],
    who_they_help:"People living in poverty and exclusion, women, and communities needing civic or humanitarian support.",
    description:"Poverty and inequality, women's rights, governance, civic participation, humanitarian response and accountability.",
    address:"Plot 477, 41 Crescent, Gwarinpa, Abuja",
    phone:"+234 812 888 8825-7",
    email:"info.nigeria@actionaid.org",
    website:"https://nigeria.actionaid.org/",
    directory_url:"https://nigeria.actionaid.org/contact",
    keywords:"poverty, inequality, women rights, women, governance, civic participation, humanitarian, accountability, development, social justice",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://nigeria.actionaid.org/contact", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-paradigm-initiative", name:"Paradigm Initiative", acronym:"PIN",
    type:"Digital rights organisation", country:"Nigeria", state:"Lagos", city:"Lagos",
    location:"Lagos, Nigeria", coverage:"Nigeria",
    specialization:"Digital rights, privacy, online freedoms, policy and strategic litigation and digital inclusion.",
    rights_areas:["Digital rights & privacy","Civic space & governance"],
    services:["Digital-rights advocacy","Privacy and online-freedom work","Strategic litigation","Digital-inclusion programmes"],
    who_they_help:"Anyone whose digital rights, privacy or internet freedom are threatened, and people excluded from digital access.",
    description:"Digital rights, privacy, online freedoms, policy and strategic litigation and digital inclusion.",
    address:"374 Borno Way, Yaba, Lagos",
    phone:"+234 1 342 6245",
    email:"info@paradigmhq.org",
    website:"https://paradigmhq.org/",
    directory_url:"https://paradigmhq.org/contact/",
    keywords:"digital rights, privacy, internet freedom, online freedoms, online abuse, cyber rights, digital inclusion, social media, policy litigation",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://paradigmhq.org/contact/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-baobab", name:"BAOBAB for Women's Human Rights", acronym:null,
    type:"Women's rights & gender organisation", country:"Nigeria", state:"FCT", city:"Abuja",
    location:"Abuja, Nigeria", coverage:"Nigeria",
    specialization:"Women's and girls' rights, legal literacy, advocacy, research, capacity building and policy reform.",
    rights_areas:["Women's rights & GBV"],
    services:["Women's and girls' rights programming","Legal literacy","Research and policy reform","Capacity building","Advocacy"],
    who_they_help:"Women and girls seeking legal literacy, advocacy or research support.",
    description:"Women's and girls' rights, legal literacy, advocacy, research, capacity building and policy reform.",
    address:"No.10 Asheik Jarma St., Abuja",
    phone:"+234 810 170 0009; +234 902 937 2018",
    email:"info@baobabforwomen.org; baobabwomen@yahoo.com",
    website:"https://www.baobabforwomen.org/",
    directory_url:"https://www.baobabforwomen.org/",
    keywords:"women rights, women, girls, legal literacy, advocacy, research, capacity building, policy reform, gender equality",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.baobabforwomen.org/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-wrapa", name:"WRAPA", acronym:null,
    type:"Women's rights & gender organisation", country:"Nigeria", state:"FCT", city:"Abuja",
    location:"Abuja, Nigeria", coverage:"Nigeria",
    specialization:"Women's legal and social justice, legal support, gender equality, legal reform and protection from discrimination and violence.",
    rights_areas:["Women's rights & GBV"],
    services:["Women's legal and social-justice support","Gender-equality advocacy","Legal reform","Protection from discrimination and violence"],
    who_they_help:"Women facing discrimination, violence or injustice.",
    description:"Women's legal and social justice, legal support, gender equality, legal reform and protection from discrimination and violence.",
    address:"No.34 Ekikunam St., Utako, Abuja",
    phone:"+234 818 869 9961",
    email:"info@wrapanigeria.org",
    website:"https://www.wrapanigeria.org/",
    directory_url:"https://www.wrapanigeria.org/",
    keywords:"women rights, women, gender equality, violence, discrimination, legal support, legal reform, social justice, protection from violence",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.wrapanigeria.org/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-lawyers-alert", name:"Lawyers Alert", acronym:null,
    type:"Legal Aid (free legal assistance)", country:"Nigeria", state:"Benue", city:"Makurdi",
    location:"Makurdi, Nigeria", coverage:"Nigeria",
    specialization:"Citizen empowerment, socio-economic rights, legal assistance and human-rights advocacy.",
    rights_areas:["Legal aid & access to justice","Human rights & complaints","Poverty & socio-economic rights"],
    services:["Legal assistance","Citizen empowerment","Human-rights advocacy","Socio-economic rights work"],
    who_they_help:"Citizens needing legal assistance or human-rights advocacy.",
    description:"Citizen empowerment, socio-economic rights, legal assistance and human-rights advocacy.",
    address:"No.6 Ahmadu Bello Way, Old GRA, Makurdi; Abuja office also listed",
    phone:"+234 809 993 7358; +234 809 993 7318",
    email:"lawyersalert@lawyersalertng.org",
    website:"https://www.lawyersalertng.org/",
    directory_url:"https://www.lawyersalertng.org/",
    keywords:"legal aid, free legal help, lawyer, legal assistance, human rights, socio-economic rights, citizen empowerment, advocacy, makurdi",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.lawyersalertng.org/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-wacol", name:"WACOL", acronym:null,
    type:"Legal Aid (free legal assistance)", country:"Nigeria", state:"Enugu", city:"Enugu",
    location:"Enugu, Nigeria", coverage:"Nigeria",
    specialization:"Free legal aid, counselling, psychosocial support, women's and girls' rights, anti-trafficking and GBV support.",
    rights_areas:["Women's rights & GBV","Legal aid & access to justice","Child rights"],
    services:["Free legal aid","Counselling and psychosocial support","Women's and girls' rights support","Anti-trafficking response","GBV support"],
    who_they_help:"Women and girls needing legal, counselling or GBV support.",
    description:"Free legal aid, counselling, psychosocial support, women's and girls' rights, anti-trafficking and GBV support.",
    address:"WACOL Women House, No.9 Dr. Mathias Ilo Ave., Enugu; Abuja: 33 Yaoundé St., Wuse 6",
    phone:"0703 577 9083; 0809 575 7590; Abuja 0803 421 0193",
    email:"wacol@wacolnigeria.org; info@wacolnigeria.org",
    website:"https://wacolnigeria.org/",
    directory_url:"https://wacolnigeria.org/wp-content/uploads/2022/12/wacol.pdf",
    keywords:"women rights, girls, GBV, domestic violence, sexual violence, rape, free legal help, legal aid, counselling, psychosocial support, anti-trafficking, enugu",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://wacolnigeria.org/wp-content/uploads/2022/12/wacol.pdf", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-mirabel-centre", name:"Mirabel Centre", acronym:null,
    type:"Domestic & sexual-violence support services", country:"Nigeria", state:"Lagos", city:"Lagos",
    location:"Lagos, Nigeria", coverage:"Nigeria",
    specialization:"Free forensic medical care, psychosocial support, legal information and referral for rape and sexual-violence survivors.",
    rights_areas:["Women's rights & GBV"],
    services:["Free forensic medical care","Psychosocial support","Legal information and referral for rape and sexual-violence survivors"],
    who_they_help:"Rape and sexual-violence survivors needing medical, psychosocial or legal referral support.",
    description:"Free forensic medical care, psychosocial support, legal information and referral for rape and sexual-violence survivors.",
    address:"LASUTH, Ikeja, Lagos",
    phone:"0815 577 0000; 0818 724 3468; 0701 349 1769",
    email:"sarc@pjnigeria.org",
    website:"https://mirabelcentre.org/",
    directory_url:"https://mirabelcentre.org/contact-us/",
    keywords:"rape, sexual violence, survivor support, GBV, domestic violence, forensic medical care, psychosocial, counselling, help after rape, women, lagos",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://mirabelcentre.org/contact-us/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-partners-west-africa", name:"Partners West Africa Nigeria", acronym:null,
    type:"Human-rights NGO", country:"Nigeria", state:"FCT", city:"Abuja",
    location:"Abuja, Nigeria", coverage:"Nigeria",
    specialization:"Governance, security-sector reform, justice, conflict prevention and civic engagement.",
    rights_areas:["Civic space & governance","Rule of law & fair hearing","Police & security accountability"],
    services:["Governance programmes","Security-sector reform","Justice and conflict prevention","Civic engagement"],
    who_they_help:"Communities and citizens engaged in governance, security and justice reform.",
    description:"Governance, security-sector reform, justice, conflict prevention and civic engagement.",
    address:"No.66 Newark St., Suncity Estate, Galadimawa, Abuja",
    phone:"+234 809 125 7245",
    email:"info@partnersnigeria.org",
    website:"https://www.partnersnigeria.org/",
    directory_url:"https://www.partnersnigeria.org/get-in-touch/",
    keywords:"governance, security sector reform, justice, conflict prevention, civic engagement, accountability, peace, security",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.partnersnigeria.org/get-in-touch/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-asf-france-nigeria", name:"ASF France – Nigeria", acronym:"ASF",
    type:"Legal Aid (free legal assistance)", country:"Nigeria", state:"FCT", city:"Abuja",
    location:"Abuja, Nigeria", coverage:"Nigeria",
    specialization:"Legal aid, human-rights litigation, torture and arbitrary-detention cases and access to justice.",
    rights_areas:["Legal aid & access to justice","Detention & torture","Human rights & complaints"],
    services:["Legal aid","Human-rights litigation","Torture and arbitrary-detention case support","Access-to-justice work"],
    who_they_help:"People facing rights violations — including torture or arbitrary detention — who need legal help.",
    description:"Legal aid, human-rights litigation, torture and arbitrary-detention cases and access to justice.",
    address:"Nigeria programme, Abuja",
    phone:"+234 701 328 6982",
    email:"communication.nigeria@avocatssansfrontieres-france.org",
    website:"https://www.avocatssansfrontieres-france.org/en/",
    directory_url:"https://www.avocatssansfrontieres-france.org/en/",
    keywords:"legal aid, torture, arbitrary detention, unlawful detention, human rights litigation, access to justice, free lawyer, human rights, lawyers",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.avocatssansfrontieres-france.org/en/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-ledap", name:"LEDAP", acronym:null,
    type:"Legal Aid (free legal assistance)", country:"Nigeria", state:"Lagos", city:"Lagos",
    location:"Lagos, Nigeria", coverage:"Nigeria",
    specialization:"Free and public-interest legal representation for poor and vulnerable victims of rights violations.",
    rights_areas:["Legal aid & access to justice","Human rights & complaints"],
    services:["Free legal representation","Public-interest litigation","Rights-violation case support"],
    who_they_help:"Poor and vulnerable victims of rights violations who cannot afford a lawyer.",
    description:"Free and public-interest legal representation for poor and vulnerable victims of rights violations.",
    address:"11B Christ Ave., off Admiralty Rd., Lekki Phase 1, Lagos",
    phone:"+234 1 291 4123; 0803 691 3264",
    email:"info@ledapnigeria.org",
    website:"https://ledapnigeria.org/",
    directory_url:"https://ledapnigeria.org/",
    keywords:"legal aid, free legal help, lawyer, legal representation, public interest litigation, poor, vulnerable, rights violations, access to justice, human rights lawyer",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://ledapnigeria.org/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-nba", name:"Nigerian Bar Association", acronym:"NBA",
    type:"Bar association / professional body", country:"Nigeria", state:null, city:null,
    location:"Nigeria", coverage:"Nigeria",
    specialization:"Legal profession, rule of law, access to justice, ethics, human-rights advocacy and lawyer and branch referrals.",
    rights_areas:["Rule of law & fair hearing","Legal aid & access to justice"],
    services:["Lawyer and branch referrals","Rule-of-law advocacy","Ethics and professional standards","Human-rights advocacy"],
    who_they_help:"Anyone looking for a lawyer through branch referrals, and profession-level rights advocacy.",
    description:"Legal profession, rule of law, access to justice, ethics, human-rights advocacy and lawyer and branch referrals.",
    address:null,
    phone:null,
    email:null,
    website:"https://nigerianbar.org.ng/",
    directory_url:"https://nigerianbar.org.ng/",
    keywords:"lawyer, lawyers, bar association, branch referral, human rights lawyer, rule of law, access to justice, legal profession, ethics, nba",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://nigerianbar.org.ng/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"The directory lists no public phone or e-mail for the NBA — use the official site's current branch and office directory." },

  /* ==================== PART II — INTERNATIONAL (18) ==================== */
  { id:"org-ohchr", name:"OHCHR", acronym:null,
    type:"UN / intergovernmental body", country:"Switzerland", state:null, city:"Geneva",
    location:"Geneva, Switzerland", coverage:"International",
    specialization:"UN human-rights system: monitoring, reporting, treaty bodies, Special Procedures, standards and technical assistance.",
    rights_areas:["Human rights & complaints"],
    services:["Monitoring and reporting","Treaty bodies and Special Procedures","Standards setting","Technical assistance"],
    who_they_help:"Anyone engaging the UN human-rights system; states and civil society seeking standards or mechanisms.",
    description:"UN human-rights system: monitoring, reporting, treaty bodies, Special Procedures, standards and technical assistance.",
    address:"Palais des Nations, 1211 Geneva 10, Switzerland",
    phone:"+41 22 917 9000",
    email:"ohchr-registry@un.org",
    website:"https://www.ohchr.org/",
    directory_url:"https://www.ohchr.org/",
    keywords:"human rights, united nations, un, treaty bodies, special procedures, monitoring, reporting, universal periodic review, standards, complaint",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.ohchr.org/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-amnesty", name:"Amnesty International", acronym:null,
    type:"Human-rights NGO", country:"UK", state:null, city:"London",
    location:"London, UK", coverage:"International",
    specialization:"Research, campaigning, advocacy and urgent-action work across civil, political, economic, social and cultural rights.",
    rights_areas:["Human rights & complaints","Poverty & socio-economic rights"],
    services:["Research","Campaigning and advocacy","Urgent action"],
    who_they_help:"Anyone campaigning for civil, political, economic, social or cultural rights, and victims of violations seeking international attention.",
    description:"Research, campaigning, advocacy and urgent-action work across civil, political, economic, social and cultural rights.",
    address:"1 Easton Street, London WC1X 0DW, UK",
    phone:"+44 20 7413 5500",
    email:null,
    website:"https://www.amnesty.org/",
    directory_url:"https://www.amnesty.org/en/about-us/contact/",
    keywords:"human rights, urgent action, campaign, advocacy, research, abuse, detention, prisoners of conscience, civil political economic social cultural rights",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.amnesty.org/en/about-us/contact/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"No public e-mail in the directory — use the official contact form on the directory page." },

  { id:"org-hrw", name:"Human Rights Watch", acronym:null,
    type:"Human-rights NGO", country:"USA", state:"NY", city:"New York",
    location:"New York, USA", coverage:"International",
    specialization:"Investigates and reports human-rights abuses; advocacy with governments and international institutions.",
    rights_areas:["Human rights & complaints"],
    services:["Investigation and reporting of abuses","Advocacy with governments and international institutions"],
    who_they_help:"People and communities whose abuses need documentation and international advocacy.",
    description:"Investigates and reports human-rights abuses; advocacy with governments and international institutions.",
    address:"350 Fifth Ave., 34th Floor, New York, NY 10118-3299",
    phone:"+1 212 290 4700",
    email:null,
    website:"https://www.hrw.org/",
    directory_url:"https://www.hrw.org/contact-us",
    keywords:"human rights, abuse, investigation, reporting, advocacy, research, countries, violations",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.hrw.org/contact-us", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"No single public e-mail in the directory — use the office-specific e-mail directory on the directory page." },

  { id:"org-icj", name:"International Commission of Jurists", acronym:"ICJ",
    type:"Human-rights NGO", country:"Switzerland", state:null, city:"Geneva",
    location:"Geneva, Switzerland", coverage:"International",
    specialization:"Rule of law, judicial independence, human-rights law, access to justice and the legal profession.",
    rights_areas:["Rule of law & fair hearing","Legal aid & access to justice"],
    services:["Rule-of-law advocacy","Judicial-independence work","Human-rights law programmes","Legal-profession support"],
    who_they_help:"Jurists, lawyers and anyone working on rule of law, fair hearing or access to justice.",
    description:"Rule of law, judicial independence, human-rights law, access to justice and the legal profession.",
    address:"Rue des Buis 3, Geneva, Switzerland",
    phone:"+41 22 979 3800",
    email:"info@icj.org",
    website:"https://www.icj.org/",
    directory_url:"https://www.icj.org/",
    keywords:"rule of law, judicial independence, fair hearing, access to justice, human rights law, legal profession, lawyer, constitutional",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.icj.org/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-fidh", name:"FIDH", acronym:null,
    type:"Human-rights NGO", country:"France", state:null, city:"Paris",
    location:"Paris, France", coverage:"International",
    specialization:"Human-rights investigations, litigation, advocacy, defender and victim protection and accountability mechanisms.",
    rights_areas:["Human rights & complaints","Defender protection"],
    services:["Human-rights investigations","Litigation","Advocacy","Defender and victim protection","Accountability mechanisms"],
    who_they_help:"Victims of violations and human-rights defenders seeking investigation, litigation or protection.",
    description:"Human-rights investigations, litigation, advocacy, defender and victim protection and accountability mechanisms.",
    address:"17 Passage de la Main d'Or, Paris, France",
    phone:"+33 1 43 55 25 18",
    email:"contact@fidh.org",
    website:"https://www.fidh.org/",
    directory_url:"https://www.fidh.org/en/about-us/contact-1776/",
    keywords:"human rights, investigation, litigation, advocacy, defender protection, victim protection, accountability, international federation",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.fidh.org/en/about-us/contact-1776/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-omct", name:"OMCT", acronym:null,
    type:"Human-rights NGO", country:"Switzerland", state:null, city:"Geneva",
    location:"Geneva, Switzerland", coverage:"International",
    specialization:"Prevention of torture, victim assistance, defender protection, urgent interventions and accountability.",
    rights_areas:["Detention & torture","Defender protection","Human rights & complaints"],
    services:["Torture prevention","Victim assistance","Defender protection","Urgent interventions","Accountability work"],
    who_they_help:"Torture victims and defenders at risk needing urgent intervention or protection.",
    description:"Prevention of torture, victim assistance, defender protection, urgent interventions and accountability.",
    address:"8 rue du Vieux-Billard, Geneva, Switzerland",
    phone:"+41 22 809 4939",
    email:"omct@omct.org",
    website:"https://www.omct.org/",
    directory_url:"https://www.omct.org/en/contact-us",
    keywords:"torture, cruel treatment, detention, victim assistance, defender protection, urgent intervention, accountability, against torture",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.omct.org/en/contact-us", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-front-line-defenders", name:"Front Line Defenders", acronym:null,
    type:"Human-rights NGO", country:"Ireland", state:null, city:"Dublin",
    location:"Dublin, Ireland", coverage:"International",
    specialization:"Emergency protection, security support and advocacy for human-rights defenders at risk.",
    rights_areas:["Defender protection","Human rights & complaints"],
    services:["Emergency protection","Security support","Advocacy for defenders at risk"],
    who_they_help:"Human-rights defenders at risk of attack, intimidation or reprisals.",
    description:"Emergency protection, security support and advocacy for human-rights defenders at risk.",
    address:"Avoca Court, Temple Road, Blackrock, Dublin, Ireland",
    phone:"+353 1 212 3750",
    email:"info@frontlinedefenders.org",
    website:"https://www.frontlinedefenders.org/",
    directory_url:"https://www.frontlinedefenders.org/en/contact-us",
    keywords:"human rights defenders, protection, at risk, emergency, security support, advocacy, reprisals",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.frontlinedefenders.org/en/contact-us", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-ishr", name:"ISHR", acronym:null,
    type:"Human-rights NGO", country:"Switzerland", state:null, city:"Geneva",
    location:"Geneva, Switzerland", coverage:"International",
    specialization:"Supports human-rights defenders engaging UN and regional systems through training, information and advocacy.",
    rights_areas:["Defender protection","Civic space & governance"],
    services:["Training for defenders","Information and advocacy support","UN and regional systems engagement"],
    who_they_help:"Human-rights defenders engaging UN and regional human-rights systems.",
    description:"Supports human-rights defenders engaging UN and regional systems through training, information and advocacy.",
    address:"Geneva: Rue de Varembé 1; New York: 777 UN Plaza",
    phone:"+41 22 919 7100; +1 212 490 2199",
    email:null,
    website:"https://ishr.ch/",
    directory_url:"https://ishr.ch/contact/",
    keywords:"human rights defenders, un system, regional systems, training, advocacy, information, protection",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://ishr.ch/contact/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"No public e-mail in the directory — use the official contact page." },

  { id:"org-civicus", name:"CIVICUS", acronym:null,
    type:"Human-rights NGO", country:"South Africa", state:null, city:"Johannesburg",
    location:"Johannesburg, South Africa", coverage:"International",
    specialization:"Civil society, civic space, freedom of association and assembly, defender support, research and advocacy.",
    rights_areas:["Civic space & governance","Defender protection"],
    services:["Civil-society support","Civic-space research","Freedom of association and assembly advocacy","Defender support"],
    who_they_help:"Civil-society organisations and people defending civic space.",
    description:"Civil society, civic space, freedom of association and assembly, defender support, research and advocacy.",
    address:"25 Owl Street, Johannesburg, South Africa",
    phone:"+27 11 833 5959; Geneva +41 79 910 3428",
    email:"info@civicus.org",
    website:"https://www.civicus.org/",
    directory_url:"https://www.civicus.org/index.php/who-we-are/contact-us",
    keywords:"civic space, civil society, freedom of association, assembly, protest, defender support, research, advocacy, monitor",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.civicus.org/index.php/who-we-are/contact-us", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-unhcr", name:"UNHCR", acronym:null,
    type:"Refugee & humanitarian protection body", country:"Switzerland", state:null, city:"Geneva",
    location:"Geneva, Switzerland", coverage:"International",
    specialization:"Protection of refugees, asylum seekers, stateless people and others forced to flee.",
    rights_areas:["Refugee & asylum"],
    services:["Refugee and asylum protection","Statelessness protection","Protection for people forced to flee"],
    who_they_help:"Refugees, asylum seekers, stateless people and others forced to flee.",
    description:"Protection of refugees, asylum seekers, stateless people and others forced to flee.",
    address:"Case Postale 2500, CH-1211 Genève 2, Switzerland",
    phone:"+41 22 739 8111",
    email:null,
    website:"https://www.unhcr.org/",
    directory_url:"https://www.unhcr.org/contact-us",
    keywords:"refugee, asylum, displaced person, statelessness, refugee protection, asylum seeker, forced to flee, refugee help, country offices",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.unhcr.org/contact-us", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"No single public e-mail in the directory — use the country/contact form to reach the relevant country office." },

  { id:"org-icrc", name:"ICRC", acronym:null,
    type:"Refugee & humanitarian protection body", country:"Switzerland", state:null, city:"Geneva",
    location:"Geneva, Switzerland", coverage:"International",
    specialization:"Protection and assistance in armed conflict and violence; international humanitarian law; missing persons; family links; detention protection.",
    rights_areas:["Humanitarian & conflict","Detention & torture"],
    services:["Protection in armed conflict","Missing persons and family links","Detention visits","International humanitarian law"],
    who_they_help:"People affected by armed conflict and violence, families of missing persons, and detainees.",
    description:"Protection and assistance in armed conflict and violence; international humanitarian law; missing persons; family links; detention protection.",
    address:"19 Avenue de la Paix, Geneva, Switzerland",
    phone:"+41 22 734 60 01",
    email:null,
    website:"https://www.icrc.org/",
    directory_url:"https://icrc.org/en/contact",
    keywords:"humanitarian, armed conflict, missing persons, family links, detention, ihl, international humanitarian law, protection, conflict, war",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://icrc.org/en/contact", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"No single public e-mail in the directory — use the country/contact directory for the relevant country office." },

  { id:"org-un-women", name:"UN Women", acronym:null,
    type:"UN / intergovernmental body", country:"USA", state:"NY", city:"New York",
    location:"New York, USA", coverage:"International",
    specialization:"Women's rights, gender equality, ending violence against women, participation and gender-responsive policy.",
    rights_areas:["Women's rights & GBV"],
    services:["Women's-rights support","Gender-equality programmes","Ending violence against women","Gender-responsive policy"],
    who_they_help:"Women and gender-equality advocates, and governments seeking gender-responsive policy.",
    description:"Women's rights, gender equality, ending violence against women, participation and gender-responsive policy.",
    address:"220 East 42nd St., New York, NY 10017",
    phone:"+1 646 781 4400",
    email:null,
    website:"https://www.unwomen.org/",
    directory_url:"https://www.unwomen.org/en/where-we-are",
    keywords:"women rights, women, gender equality, violence against women, gbv, gender policy, participation, empowerment",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.unwomen.org/en/where-we-are", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"No single public e-mail in the directory — use the country/subject directory on the directory page." },

  { id:"org-freedom-house", name:"Freedom House", acronym:null,
    type:"Human-rights NGO", country:"USA", state:"DC", city:"Washington",
    location:"Washington DC, USA", coverage:"International",
    specialization:"Political rights, civil liberties, democracy, internet freedom and civic-space research.",
    rights_areas:["Civic space & governance","Digital rights & privacy"],
    services:["Political-rights and civil-liberties research","Democracy advocacy","Internet-freedom research","Civic-space research"],
    who_they_help:"People assessing political rights, civil liberties, democracy and internet freedom.",
    description:"Political rights, civil liberties, democracy, internet freedom and civic-space research.",
    address:"1225 I Street NW #1200, Washington DC 20005",
    phone:"+1 202 296 5101",
    email:"info@freedomhouse.org",
    website:"https://freedomhouse.org/",
    directory_url:"https://freedomhouse.org/about-us/contact-us",
    keywords:"political rights, civil liberties, democracy, internet freedom, freedom, civic space, research, ratings, internet",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://freedomhouse.org/about-us/contact-us", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" } },

  { id:"org-minority-rights-group", name:"Minority Rights Group International", acronym:null,
    type:"Human-rights NGO", country:"UK", state:null, city:"London",
    location:"London, UK", coverage:"International",
    specialization:"Minority and indigenous rights, anti-discrimination research, advocacy and coalition building.",
    rights_areas:["Minority & non-discrimination"],
    services:["Minority and indigenous-rights support","Anti-discrimination research","Advocacy","Coalition building"],
    who_they_help:"Minority and indigenous communities facing discrimination.",
    description:"Minority and indigenous rights, anti-discrimination research, advocacy and coalition building.",
    address:"54 Commercial Street, London E1 6LT, UK",
    phone:"+44 20 7422 4200",
    email:null,
    website:"https://minorityrights.org/",
    directory_url:"https://minorityrights.org/contact-us/",
    keywords:"minority rights, minorities, indigenous, discrimination, anti-discrimination, ethnic, religious minority, coalition, advocacy",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://minorityrights.org/contact-us/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"No public e-mail in the directory — use the official contact form." },

  { id:"org-global-fund-women", name:"Global Fund for Women", acronym:null,
    type:"Women's rights & gender organisation", country:"USA", state:"CA", city:"San Francisco",
    location:"San Francisco, USA", coverage:"International",
    specialization:"Women's rights, feminist movements, gender justice, grants and movement-building.",
    rights_areas:["Women's rights & GBV"],
    services:["Grants for women's-rights groups","Feminist movement building","Gender-justice support"],
    who_they_help:"Women's-rights and feminist organisations seeking grants or movement support.",
    description:"Women's rights, feminist movements, gender justice, grants and movement-building.",
    address:"505 Montgomery St., Floor 11, San Francisco, CA 94111",
    phone:"+1 415 248 4800",
    email:null,
    website:"https://www.globalfundforwomen.org/",
    directory_url:"https://www.globalfundforwomen.org/contact-us/",
    keywords:"women rights, women, feminist, gender justice, grants, movement building, girls, gender equality",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.globalfundforwomen.org/contact-us/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"No public e-mail in the directory — use the official contact page." },

  { id:"org-center-reproductive-rights", name:"Center for Reproductive Rights", acronym:null,
    type:"Women's rights & gender organisation", country:"USA", state:"NY", city:"New York",
    location:"New York, USA", coverage:"International",
    specialization:"Reproductive rights, strategic litigation, legal policy, abortion rights, maternal health and equality.",
    rights_areas:["Reproductive rights"],
    services:["Strategic litigation","Legal and policy advocacy","Maternal-health rights","Reproductive-rights defence"],
    who_they_help:"People whose reproductive rights and maternal health are at risk.",
    description:"Reproductive rights, strategic litigation, legal policy, abortion rights, maternal health and equality.",
    address:"199 Water St., 22nd Floor, New York, NY 10038",
    phone:"+1 917 637 3600",
    email:null,
    website:"https://reproductiverights.org/",
    directory_url:"https://reproductiverights.org/",
    keywords:"reproductive rights, abortion rights, maternal health, pregnancy, equality, strategic litigation, legal policy, health, women",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://reproductiverights.org/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"No public e-mail in the directory — use the official contact channels." },

  { id:"org-access-now", name:"Access Now", acronym:null,
    type:"Digital rights organisation", country:"International", state:null, city:null,
    location:"Global (online helpline)", coverage:"International",
    specialization:"Digital rights, internet freedom, privacy and 24/7 digital-security assistance for at-risk civil society.",
    rights_areas:["Digital rights & privacy"],
    services:["Digital-security assistance (24/7)","Privacy and internet-freedom support","Support for at-risk civil society"],
    who_they_help:"Civil-society users at digital risk, and anyone facing online threats or privacy intrusions.",
    description:"Digital rights, internet freedom, privacy and 24/7 digital-security assistance for at-risk civil society.",
    address:"Global; use online helpline/contact routes",
    phone:null,
    email:"help@accessnow.org",
    website:"https://www.accessnow.org/",
    directory_url:"https://www.accessnow.org/help/",
    keywords:"digital rights, privacy, internet freedom, digital security, online threats, cyber, social media, helpline, civil society",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.accessnow.org/help/", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"The helpline is primarily online and e-mail — use the help centre; no public phone number in the directory." },

  { id:"org-equal-rights-trust", name:"Equal Rights Trust", acronym:null,
    type:"Human-rights NGO", country:"UK", state:null, city:"London",
    location:"London, UK", coverage:"International",
    specialization:"Equality law, non-discrimination, legal standards, advocacy and capacity building.",
    rights_areas:["Minority & non-discrimination"],
    services:["Equality-law support","Non-discrimination advocacy","Legal-standards work","Capacity building"],
    who_they_help:"People and organisations working against discrimination and for equality.",
    description:"Equality law, non-discrimination, legal standards, advocacy and capacity building.",
    address:"167-169 Great Portland St., London W1W 5PF",
    phone:null,
    email:"info@equalrightstrust.org",
    website:"https://www.equalrightstrust.org/",
    directory_url:"https://www.equalrightstrust.org/contact",
    keywords:"equality, non-discrimination, discrimination, equality law, legal standards, capacity building, equal rights, advocacy",
    source:"RightAware Rights Protection Agencies Directory",
    source_url:"https://www.equalrightstrust.org/contact", last_verified_at:"2026-10-04",
    verification:{ status:"unverified", source:"RightAware Rights Protection Agencies Directory", date:"2026-10-04" },
    contactNote:"No public phone number in the directory — use the official contact page." }
];

/* PART III — official directory hubs (10). External resources that expand the
   list (state offices, branches, country contacts). NOT organizations — they
   must never be inserted into the organizations table. */
window.RA_ORG_HUBS = [
  { id:"hub-nhrc-states", name:"NHRC Nigeria — State Offices",
    description:"Official state-office directory for Nigeria's 36 states and FCT.",
    url:"https://nhrc.gov.ng/regional-offices.html" },
  { id:"hub-fida-branches", name:"FIDA Nigeria — Branch Network",
    description:"Use the official FIDA site to locate state branches and legal support.",
    url:"https://fida.org.ng/" },
  { id:"hub-unhcr-offices", name:"UNHCR — Country Offices",
    description:"Global country-office/protection directory.",
    url:"https://www.unhcr.org/contact-us" },
  { id:"hub-amnesty-offices", name:"Amnesty — International/National Offices",
    description:"International Secretariat and regional/national office contacts.",
    url:"https://www.amnesty.org/en/about-us/contact/" },
  { id:"hub-hrw-offices", name:"Human Rights Watch — Global Offices",
    description:"Global office directory.",
    url:"https://www.hrw.org/contact-us" },
  { id:"hub-fidh-offices", name:"FIDH — Offices & Delegations",
    description:"Paris headquarters and international/regional delegations.",
    url:"https://www.fidh.org/en/about-us/contact-1776/" },
  { id:"hub-frontline-defenders", name:"Front Line Defenders — Defender Protection",
    description:"Urgent protection and office contacts.",
    url:"https://www.frontlinedefenders.org/en/contact-us" },
  { id:"hub-icrc-offices", name:"ICRC — Office Search",
    description:"Country and global humanitarian protection contacts.",
    url:"https://icrc.org/en/contact" },
  { id:"hub-ohchr-un", name:"OHCHR — UN Human Rights",
    description:"UN human-rights mechanisms and country resources.",
    url:"https://www.ohchr.org/" },
  { id:"hub-civicus", name:"CIVICUS — Civic Space / Civil Society",
    description:"Global civil-society network and civic-space resources.",
    url:"https://www.civicus.org/" }
];

/* ---- Shared directory helpers (pure functions — no DOM.
       api/ai/chat.js loads this file server-side for AI retrieval, so nothing
       here may touch document/location/localStorage. ---- */
(function(){
  "use strict";
  function arr(x){ return Array.isArray(x) ? x : []; }
  function lower(x){ return String(x == null ? "" : x).toLowerCase(); }
  function tokens(q){
    return lower(q).split(/[^a-z0-9]+/).filter(function(w){ return w.length >= 3; });
  }
  /* Boundary-prefixed prefix match: "arrest" hits "arrested", "ny" misses "any". */
  function hasTrig(ql, trig){
    try {
      return new RegExp("(^|[^a-z0-9])" + trig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(ql);
    } catch(_){ return ql.indexOf(trig) > -1; }
  }

  /* Problem intents: a query word -> the rights areas / org types that should
     rise for it. Derived from the directory's documented specializations. */
  var INTENTS = [
    { key:"legal",
      trig:["free legal help","free lawyer","legal aid","legal help","cannot afford","can not afford","no money","pro bono","access to justice","human rights lawyer","need a lawyer","free representation","legal representation","lawyer"],
      areas:["Legal aid & access to justice"], types:["Legal Aid (free legal assistance)"] },
    { trig:["women","woman","girls","female","wife","gbv","gender based","domestic violence","sexual violence","rape","violence against","gender"],
      areas:["Women's rights & GBV"], types:["Women's rights & gender organisation","Domestic & sexual-violence support services"] },
    { trig:["child","children","minor","trafficking"], areas:["Child rights"], types:[] },
    { trig:["digital","online","privacy","internet","cyber","social media","data protection"],
      areas:["Digital rights & privacy"], types:["Digital rights organisation"] },
    { trig:["journalist","press","media","freedom of expression","expression","censorship","broadcast"],
      areas:["Freedom of expression & media"], types:["Media freedom organisation"] },
    { trig:["refugee","asylum","stateless","displaced","migrant","forced to flee"],
      areas:["Refugee & asylum"], types:["Refugee & humanitarian protection body"] },
    { trig:["torture"], areas:["Detention & torture"], types:[] },
    { trig:["unlawful detention","detention","detained","prison","jail","station"], areas:["Detention & torture"], types:[] },
    { trig:["police","arrest","brutality","law enforcement"], areas:["Police & security accountability"], types:[] },
    { trig:["corruption","bribery","transparency","accountability"], areas:["Anti-corruption & accountability"], types:[] },
    { trig:["minority","indigenous","discrimination","equality","equal rights","racism"],
      areas:["Minority & non-discrimination"], types:[] },
    { trig:["reproductive","abortion","maternal","pregnancy"], areas:["Reproductive rights"], types:[] },
    { trig:["human rights","rights violation","violation","abuse","beat","assault","complaint"],
      areas:["Human rights & complaints"], types:[], suppressIf:"legal" },
    { trig:["defender"], areas:["Defender protection"], types:[] },
    { trig:["constitutional","fair hearing","rule of law","court","judiciary","justice"],
      areas:["Rule of law & fair hearing"], types:[] },
    { trig:["governance","civic","protest","assembly","association","participation"],
      areas:["Civic space & governance"], types:[] },
    { trig:["humanitarian","armed conflict","war","conflict"], areas:["Humanitarian & conflict"], types:[] },
    { trig:["poverty","socio-economic","inequality","indigent","poor","vulnerable"],
      areas:["Poverty & socio-economic rights"], types:[] }
  ];

  function textOf(o){
    return lower([o.name, o.acronym, o.type, o.specialization,
      arr(o.services).join(" "),
      o.who_they_help, o.description, o.keywords,
      o.country, o.state, o.city, o.location, o.coverage].join(" "));
  }

  function baseScore(o, ql, toks){
    var name = lower(o.name), s = 0;
    if (name && name === ql) { s += 12; }
    else if (name && ql.length >= 4 && name.indexOf(ql) > -1) { s += 6; }
    var acr = lower(o.acronym);
    if (acr && toks.indexOf(acr) > -1) { s += 8; }
    var text = textOf(o);
    var areasText = lower(arr(o.rights_areas).join(" "));
    for (var i = 0; i < toks.length; i++){
      var w = toks[i];
      /* Direct evidence (name/type/spec/services/keywords/place) weighs more
         than a rights-area label match, so a topical boost never promotes an
         organisation whose own record says nothing about the problem. */
      if (text.indexOf(w) > -1) { s += w.length >= 5 ? 2 : 1; }
      if (areasText.indexOf(w) > -1) { s += 1; }
    }
    return s;
  }

  function intentHit(it, ql){
    for (var t = 0; t < it.trig.length; t++){
      if (hasTrig(ql, it.trig[t])) { return true; }
    }
    return false;
  }

  function boostOf(o, ql){
    var b = 0, areas = arr(o.rights_areas);
    /* A legal-aid question wants providers of legal help: when a legal-aid
       intent matches, the broad "human rights & complaints" intent stands
       down, so "human rights lawyer" ranks actual legal-aid organisations
       above generic rights bodies. Other intents are unaffected. */
    var legalHit = false;
    for (var k = 0; k < INTENTS.length; k++){
      if (INTENTS[k].key === "legal") { legalHit = intentHit(INTENTS[k], ql); break; }
    }
    for (var i = 0; i < INTENTS.length; i++){
      var it = INTENTS[i];
      if (!intentHit(it, ql)) { continue; }
      if (it.suppressIf === "legal" && legalHit) { continue; }
      for (var a = 0; a < it.areas.length; a++){
        if (areas.indexOf(it.areas[a]) > -1) { b += 5; break; }
      }
      if (it.types.indexOf(o.type) > -1) { b += 2; }
    }
    var st = lower(o.state), ct = lower(o.city);
    if (st && hasTrig(ql, st)) { b += 4; }
    if (ct && hasTrig(ql, ct)) { b += 4; }
    if (/\b(nigeria|nigerian|nigerians|naija)\b/.test(ql) && o.country === "Nigeria") { b += 3; }
    return b;
  }

  /* Base word/name matching is required before any topical boost applies —
     this is what keeps unrelated organizations out of a "torture" answer. */
  function score(org, q){
    if (!org) { return 0; }
    var ql = lower(q).trim();
    if (!ql) { return 0; }
    var b = baseScore(org, ql, tokens(ql));
    if (b <= 0) { return 0; }
    return b + boostOf(org, ql);
  }

  window.RA_ORG_SCORE = score;
  window.RA_ORG_BOOST = function(org, q){
    if (!org) { return 0; }
    var ql = lower(q).trim();
    if (!ql) { return 0; }
    var b = baseScore(org, ql, tokens(ql));
    if (b <= 0) { return 0; }
    return boostOf(org, ql);
  };

  /* Ranked results: [{org, score}] — highest score first, ties keep directory
     order (Nigerian organisations are listed first in the source). */
  window.RA_ORG_RANK = function(q, list){
    list = arr(list || window.RA_ORGANIZATIONS);
    return list.map(function(o, i){ return { org:o, score:score(o, q), i:i }; })
      .filter(function(x){ return x.score > 0; })
      .sort(function(a, b){ return (b.score - a.score) || (a.i - b.i); })
      .map(function(x){ return { org:x.org, score:x.score }; });
  };

  /* Browse/search with facet filters (type, rights area, country, state). */
  window.RA_ORG_QUERY = function(opt){
    opt = opt || {};
    var list = arr(window.RA_ORGANIZATIONS).filter(function(o){
      if (opt.type && o.type !== opt.type) { return false; }
      if (opt.area && arr(o.rights_areas).indexOf(opt.area) < 0) { return false; }
      if (opt.country && o.country !== opt.country) { return false; }
      if (opt.state && o.state !== opt.state) { return false; }
      return true;
    });
    var q = String(opt.q == null ? "" : opt.q).trim();
    if (!q) { return list; }
    return window.RA_ORG_RANK(q, list).map(function(x){ return x.org; });
  };

  window.RA_ORG_BY_ID = function(id){
    id = String(id == null ? "" : id);
    var list = arr(window.RA_ORGANIZATIONS);
    for (var i = 0; i < list.length; i++){ if (list[i].id === id) { return list[i]; } }
    return null;
  };

  /* Filter facets. states = Nigerian states only (city search covers the rest). */
  window.RA_ORG_FACETS = function(){
    var t = {}, a = {}, c = {}, s = {};
    arr(window.RA_ORGANIZATIONS).forEach(function(o){
      if (o.type) { t[o.type] = 1; }
      arr(o.rights_areas).forEach(function(x){ a[x] = 1; });
      if (o.country) { c[o.country] = 1; }
      if (o.country === "Nigeria" && o.state) { s[o.state] = 1; }
    });
    function keys(x){ return Object.keys(x).sort(); }
    return { types:keys(t), areas:keys(a), countries:keys(c), states:keys(s) };
  };

  /* "phone" is stored exactly as the source lists it ("a; b; Abuja c").
     Split into labelled parts with a dialable tel: href where a number exists;
     parts without a recognisable number stay plain text (never invented). */
  window.RA_ORG_TELS = function(phone){
    return String(phone || "").split(";")
      .map(function(p){ return p.replace(/\s+/g, " ").trim(); })
      .filter(Boolean)
      .map(function(p){
        var m = p.match(/\+?\d[\d\s.-]{4,}\d/);
        if (!m) { return { text:p, tel:null }; }
        return { text:p, tel:m[0].replace(/\s+/g, "") };
      });
  };

  window.RA_ORG_EMAILS = function(email){
    return String(email || "").split(/[;,]/)
      .map(function(e){ return e.trim(); })
      .filter(function(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); });
  };

  /* Shared renderers (pure strings — no DOM, safe anywhere). Used by
     organizations.html and help.html so both pages show identical contact
     links; every href is built from stored data only (tel:/mailto: plus the
     official website and directory page — never an invented contact). */
  function escHtml(s){
    return String(s == null ? "" : s).replace(/[&<>"]/g, function(m){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[m];
    });
  }
  function orgContactsHtml(o){
    var out = [];
    var tels = window.RA_ORG_TELS(o.phone);
    if (tels.length){
      out.push('<p><small><strong>📞 Phone:</strong> ' + tels.map(function(t){
        return t.tel ? '<a class="link" href="tel:' + escHtml(t.tel) + '">' + escHtml(t.text) + '</a>'
                     : escHtml(t.text);
      }).join(" • ") + '</small></p>');
    }
    var mails = window.RA_ORG_EMAILS(o.email);
    if (mails.length){
      out.push('<p><small><strong>✉️ E-mail:</strong> ' + mails.map(function(m){
        return '<a class="link" href="mailto:' + escHtml(m) + '">' + escHtml(m) + '</a>';
      }).join(", ") + '</small></p>');
    }
    if (o.website){
      out.push('<p><small><strong>🌐 Website:</strong> <a class="link" href="' + escHtml(o.website)
        + '" target="_blank" rel="noopener nofollow">' + escHtml(o.website) + ' ↗</a></small></p>');
    }
    if (o.directory_url && o.directory_url !== o.website){
      out.push('<p><small><strong>🗂 Directory page:</strong> <a class="link" href="' + escHtml(o.directory_url)
        + '" target="_blank" rel="noopener nofollow">' + escHtml(o.directory_url) + ' ↗</a></small></p>');
    }
    if (o.address){
      out.push('<p><small><strong>📍 Address:</strong> ' + escHtml(o.address) + '</small></p>');
    }
    return out.join("");
  }
  function orgCardHtml(o){
    var pill = [o.country, o.state].filter(Boolean).join(" • ").toUpperCase();
    var spec = o.specialization.length > 170 ? o.specialization.slice(0, 167) + "…" : o.specialization;
    var place = [o.location, o.coverage].filter(Boolean).join(" — ");
    return '<article class="card rv">'
      + '<span class="pill">' + escHtml(pill) + '</span>'
      + '<h3 style="margin-top:.5rem">' + escHtml(o.name) + (o.acronym ? ' <small>(' + escHtml(o.acronym) + ')</small>' : '') + '</h3>'
      + '<p><span class="tag">' + escHtml(o.type) + '</span></p>'
      + '<p><small>' + escHtml(spec) + '</small></p>'
      + '<p><small><strong>📍</strong> ' + escHtml(place) + '</small></p>'
      + orgContactsHtml(o)
      + '<div style="display:flex;gap:.5rem;margin-top:.7rem;flex-wrap:wrap"><a class="btn btn-primary btn-sm" href="organizations.html?id='
      + encodeURIComponent(o.id) + '">View full profile</a></div>'
      + '</article>';
  }
  window.RA_ORG_ESC = escHtml;
  window.RA_ORG_CONTACTS_HTML = orgContactsHtml;
  window.RA_ORG_CARD_HTML = orgCardHtml;
})();
