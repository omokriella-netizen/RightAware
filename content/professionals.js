/* RightAware Professionals directory data (v2).
   HONESTY RULE: every record here is FICTIONAL DEMO data (isDemo:true) for interface
   development only. Real professionals are added later via admin onboarding with
   credential checks; each real record carries verification {status, source, date}.
   Full-record schema: id, name, photo, qualification, specializations[], experienceYrs,
   location, languages[], bio, consultation {options[], feeNote}, availability,
   ratingAvg, ratingsCount, verification {status, source, date}, isDemo, reviews[].
   Reviews schema: {user, rating, text, date, verifiedInteraction, status, reports}. */
window.RA_PROFESSIONALS = [
  { id:"d1", name:"Demo Advocate 1", isDemo:true, photo:"", qualification:"Barrister (DEMO — fictional)",
    specializations:["Human Rights","Police Matters"], experienceYrs:"8 (demo)", location:"Lagos",
    languages:["English","Pidgin"], bio:"Handles stop-and-search, arrest and bail guidance in this demo dataset.",
    consultation:{ options:["Chat (demo)","Phone (demo)"], feeNote:"Demo rate" }, availability:"Mon–Fri (demo)",
    ratingAvg:4.9, ratingsCount:42, verification:{ status:"unverified", source:"Demo record — no real credential", date:"" },
    reviews:[
      { user:"Demo Client A", rating:5, text:"Clear explanation of bail steps. (Demo review)", date:"2026-08-10", verifiedInteraction:false, status:"published", reports:0 },
      { user:"Demo Client B", rating:5, text:"Polite and prompt response. (Demo review)", date:"2026-08-18", verifiedInteraction:false, status:"published", reports:0 } ] },
  { id:"d2", name:"Demo Advocate 2", isDemo:true, photo:"", qualification:"Barrister (DEMO — fictional)",
    specializations:["Family","Gender-Based Violence"], experienceYrs:"6 (demo)", location:"Abuja FCT",
    languages:["English","Hausa"], bio:"Supports survivors with safety planning and referral paths in this demo.",
    consultation:{ options:["Chat (demo)"], feeNote:"First chat free (demo)" }, availability:"Mon–Sat (demo)",
    ratingAvg:4.8, ratingsCount:35, verification:{ status:"unverified", source:"Demo record — no real credential", date:"" },
    reviews:[ { user:"Demo Client C", rating:5, text:"Felt listened to and guided. (Demo review)", date:"2026-08-20", verifiedInteraction:false, status:"published", reports:0 } ] },
  { id:"d3", name:"Demo Advocate 3", isDemo:true, photo:"", qualification:"Barrister (DEMO — fictional)",
    specializations:["Employment","Workplace Disputes"], experienceYrs:"7 (demo)", location:"Rivers",
    languages:["English","Pidgin"], bio:"Unpaid salary, dismissal letters and settlement talks (demo).",
    consultation:{ options:["Chat (demo)","Phone (demo)"], feeNote:"Demo rate" }, availability:"Mon–Fri (demo)",
    ratingAvg:4.7, ratingsCount:28, verification:{ status:"unverified", source:"Demo record — no real credential", date:"" },
    reviews:[ { user:"Demo Client D", rating:4, text:"Helped draft my demand letter. (Demo review)", date:"2026-07-30", verifiedInteraction:false, status:"published", reports:0 } ] },
  { id:"d4", name:"Demo Advocate 4", isDemo:true, photo:"", qualification:"Barrister (DEMO — fictional)",
    specializations:["Tenancy","Property"], experienceYrs:"9 (demo)", location:"Oyo",
    languages:["English","Yoruba"], bio:"Tenancy agreements, notices and eviction defence overview (demo).",
    consultation:{ options:["Chat (demo)","In-person (demo)"], feeNote:"Demo rate" }, availability:"Mon–Fri (demo)",
    ratingAvg:4.8, ratingsCount:31, verification:{ status:"unverified", source:"Demo record — no real credential", date:"" },
    reviews:[ { user:"Demo Client E", rating:5, text:"Explained my notice period clearly. (Demo review)", date:"2026-08-02", verifiedInteraction:false, status:"published", reports:0 } ] },
  { id:"d5", name:"Demo Advocate 5", isDemo:true, photo:"", qualification:"Barrister (DEMO — fictional)",
    specializations:["Consumer","Digital Fraud"], experienceYrs:"5 (demo)", location:"Kano",
    languages:["English","Hausa"], bio:"Faulty goods, failed transfers and online-scam first steps (demo).",
    consultation:{ options:["Chat (demo)"], feeNote:"Demo rate" }, availability:"Mon–Sat (demo)",
    ratingAvg:4.6, ratingsCount:19, verification:{ status:"unverified", source:"Demo record — no real credential", date:"" },
    reviews:[ { user:"Demo Client F", rating:4, text:"Knew the complaint steps. (Demo review)", date:"2026-08-12", verifiedInteraction:false, status:"published", reports:0 } ] },
  { id:"d6", name:"Demo Legal Clinic", isDemo:true, photo:"", qualification:"Clinic (DEMO — fictional)",
    specializations:["General Guidance","Students","Low Income"], experienceYrs:"Clinic (demo)", location:"Enugu",
    languages:["English","Igbo"], bio:"First-line guidance and referrals for those who cannot pay (demo).",
    consultation:{ options:["Chat (demo)"], feeNote:"Free (demo)" }, availability:"Mon–Fri (demo)",
    ratingAvg:4.9, ratingsCount:57, verification:{ status:"unverified", source:"Demo record — no real credential", date:"" },
    reviews:[ { user:"Demo Client G", rating:5, text:"Grateful for the free guidance. (Demo review)", date:"2026-08-25", verifiedInteraction:false, status:"published", reports:0 } ] }
];
