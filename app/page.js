"use client"
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes'; 
import { db } from '../firebase'; 
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'; 
import Link from 'next/link'; 
import dynamic from 'next/dynamic';
import emailjs from '@emailjs/browser'; 

const MapPicker = dynamic(() => import('./components/MapPicker'), { 
  ssr: false, 
  loading: () => <div className="h-64 w-full bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-md animate-pulse rounded-3xl flex items-center justify-center text-slate-400 font-medium tracking-widest uppercase text-sm">Loading Maps...</div>
});

const translations = {
  en: {
    heroTitle: "Speak Up. Stay Safe.", heroSub: "Secure, anonymous reporting for a safer Chennai.",
    tabReport: "Report", tabTrack: "Track", tabRide: "Ride Guard", tabSafe: "Safe Zones", tabFund: "Fund Us",
    submitBtn: "Submit Secure Report", adminLogin: "Official Login",
    descLabel: "Description", descPlace: "Describe what happened...",
    agentLabel: "Request Guardian Verification?", agentSub: "A verified partner will visit the spot to check.", bountyLabel: "Offer Bounty (₹)",
    catLabel: "Category", locLabel: "Location", urgentGrp: "🚨 Urgent", civicGrp: "🚧 Civic",
    recordBtn: "🎙️ Voice", attachBtn: "Attach Evidence", checkStatusBtn: "Check Status", trackPlace: "WB-XXXX",
    rideTitle: "Dead Man's Switch", vehPlaceholder: "Vehicle No (e.g., TN01 AB 1234)", minPlaceholder: "Minutes to Destination", 
    contactPlaceholder: "Emergency Email Address", destPlaceholder: "Where are you going?",
    namePlaceholder: "Your Name / Alias (For Email Only)", // NEW FIELD
    startRideBtn: "Start Protection", arrivedBtn: "I Arrived Safely",
    safeTitle: "Safety Heatmap", reportsText: "Reports", safeStatus: "Safe", cautionStatus: "Caution", highRiskStatus: "High Risk",
    fundTitle: "Support the Mission", fundSub: "Anonymous donations to fund Guardians.", fundGoal: "Goal", fundRaised: "Raised", donateBtn: "Donate Anonymously",
    loadingText: "Encrypting...", doneBtn: "Done", reportLogTitle: "Report Logged", trackIdText: "Tracking ID",
    officialApp: "Official TN Police App"
  },
  ta: {
    heroTitle: "துணிந்து பேசுங்கள்.", heroSub: "பாதுகாப்பான சென்னைக்காக அனாமதேய புகார் சேவை.",
    tabReport: "புகார் செய்", tabTrack: "புகார் நிலை", tabRide: "பயண பாதுகாப்பு", tabSafe: "பாதுகாப்பு மண்டலம்", tabFund: "நன்கொடை",
    submitBtn: "புகாரை அனுப்பு", adminLogin: "அதிகாரி உள்நுழைவு",
    descLabel: "விவரம்", descPlace: "என்ன நடந்தது...",
    agentLabel: "கள ஆய்வாளர் வேண்டுமா?", agentSub: "சரிபார்க்க ஒரு நபர் அனுப்பப்படுவார்.", bountyLabel: "வெகுமதி (₹)",
    catLabel: "வகை (Category)", locLabel: "இடம் (Location)", urgentGrp: "🚨 அவசரம்", civicGrp: "🚧 குடிமை",
    recordBtn: "🎙️ குரல்", attachBtn: "ஆதாரத்தை இணைக்கவும்", checkStatusBtn: "நிலையைச் சரிபார்க்கவும்", trackPlace: "புகார் எண் (WB-XXXX)",
    rideTitle: "பயண பாதுகாப்பு", vehPlaceholder: "வாகன எண்", minPlaceholder: "பயண நேரம் (நிமிடங்கள்)", 
    contactPlaceholder: "அவசர மின்னஞ்சல்", destPlaceholder: "எங்கு செல்கிறீர்கள்?",
    namePlaceholder: "உங்கள் பெயர் (மின்னஞ்சலுக்கு மட்டும்)", // NEW FIELD
    startRideBtn: "பாதுகாப்பை தொடங்கு", arrivedBtn: "நான் பாதுகாப்பாக வந்துவிட்டேன்",
    safeTitle: "பாதுகாப்பு வரைபடம்", reportsText: "புகார்கள்", safeStatus: "பாதுகாப்பானது", cautionStatus: "எச்சரிக்கை", highRiskStatus: "ஆபத்து",
    fundTitle: "எங்கள் நோக்கத்திற்கு உதவுங்கள்", fundSub: "காவலர்களுக்கு நிதியளிக்க அனாமதேய நன்கொடைகள்.", fundGoal: "இலக்கு", fundRaised: "திரட்டப்பட்டது", donateBtn: "அனாமதேயமாக நன்கொடை அளிக்கவும்",
    loadingText: "குறியாக்கம் செய்யப்படுகிறது...", doneBtn: "முடிந்தது", reportLogTitle: "புகார் பதிவு செய்யப்பட்டது", trackIdText: "கண்காணிப்பு எண்",
    officialApp: "அதிகாரப்பூர்வ தமிழ்நாடு காவல்துறை செயலி"
  }
};

const CATEGORY_TRANSLATIONS = {
  "Harassment": "தொல்லை (Harassment)", "Chain Snatching": "சங்கிலி பறிப்பு (Chain Snatching)", "Theft": "திருட்டு (Theft)",
  "Suspicious Activity": "சந்தேகத்திற்குரிய செயல்", "Cyber Fraud": "இணைய மோசடி (Cyber Fraud)", 
  "Street Light Issue": "தெரு விளக்கு பிரச்சனை", "Public Nuisance": "பொது தொல்லை", "Rash Driving": "அலட்சியமான ஓட்டுநர்"
};

const AREA_TRANSLATIONS = {
  "Adyar": "அடையாறு", "Alandur": "ஆலந்தூர்", "Ambattur": "அம்பத்தூர்", "Anna Nagar": "அண்ணா நகர்", "Ashok Nagar": "அசோக் நகர்", "Avadi": "ஆவடி", 
  "Ayanavaram": "அயனாவரம்", "Besant Nagar": "பெசன்ட் நகர்", "Chetpet": "சேத்துப்பட்டு", "Chromepet": "குரோம்பேட்டை", "Egmore": "எழும்பூர்", 
  "Guindy": "கிண்டி", "K.K. Nagar": "கே.கே. நகர்", "Kilpauk": "கீழ்ப்பாக்கம்", "Kodambakkam": "கோடம்பாக்கம்", "Kolathur": "கொளத்தூர்", 
  "Korattur": "கொரட்டூர்", "Kotturpuram": "கோட்டூர்புரம்", "Koyambedu": "கோயம்பேடு", "Madhavaram": "மாதவரம்", "Madipakkam": "மடிப்பாக்கம்", 
  "Medavakkam": "மேடவாக்கம்", "Mogappair": "முகப்பேர்", "Mylapore": "மயிலாப்பூர்", "Nandanam": "நந்தனம்", "Nungambakkam": "நுங்கம்பாக்கம்", 
  "Pallavaram": "பல்லாவரம்", "Perambur": "பெரம்பூர்", "Perungudi": "பெருங்குடி", "Poonamallee": "பூந்தமல்லி", "Porur": "போரூர்", 
  "Purasawalkam": "புரசைவாக்கம்", "Red Hills": "செங்குன்றம்", "Royapettah": "ராயப்பேட்டை", "Royapuram": "ராயபுரம்", "Saidapet": "சைதாப்பேட்டை", 
  "Sholinganallur": "சோழிங்கநல்லூர்", "T. Nagar": "தி. நகர்", "Tambaram": "தாம்பரம்", "Teynampet": "தேனாம்பேட்டை", "Thiruvanmiyur": "திருவான்மியூர்", 
  "Tondiarpet": "தண்டையார்பேட்டை", "Triplicane": "திருவல்லிக்கேணி", "Vadapalani": "வடபழனி", "Valasaravakkam": "வளசரவாக்கம்", "Velachery": "வேளச்சேரி", 
  "Villivakkam": "வில்லிவாக்கம்", "Virugambakkam": "விருகம்பாக்கம்", "Washermanpet": "வண்ணாரப்பேட்டை", "West Mambalam": "மேற்கு மாம்பலம்",
  "Not in Chennai": "சென்னையில் இல்லை"
};

const CHENNAI_AREAS = Object.keys(AREA_TRANSLATIONS).filter(a => a !== "Not in Chennai");
const MONTHLY_LIMIT = 500000; 

const AI_KEYWORDS = {
  "Cyber Fraud": ["otp", "bank", "money", "scam", "hacked", "password", "fake call", "link"],
  "Chain Snatching": ["chain", "gold", "necklace", "snatched", "bike", "thieves"],
  "Harassment": ["following", "stalking", "catcalling", "abuse", "touch", "women"],
  "Street Light Issue": ["dark", "light", "bulb", "night", "blackout"],
  "Rash Driving": ["speed", "racing", "rash", "driving", "hit", "drunk"],
  "Public Nuisance": ["garbage", "smell", "noise", "loud", "drinking", "fight"]
};
const BAD_WORDS = ["stupid", "idiot", "fake", "prank", "test", "kill", "bomb"]; 

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [lang, setLang] = useState('en'); 
  const t = translations[lang]; 
  const [activeTab, setActiveTab] = useState('report'); 

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Cyber Fraud');
  const [area, setArea] = useState('Anna Nagar'); 
  const [location, setLocation] = useState(null); 
  const [loadingReport, setLoadingReport] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [requestGuardian, setRequestGuardian] = useState(false);
  const [bounty, setBounty] = useState('');
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');
  
  // NEW LOGIC: Added userName to state
  const [rideDetails, setRideDetails] = useState({ vehicle: '', time: 10, contact: '', destination: '', userName: '' }); 
  const [rideStatus, setRideStatus] = useState('idle'); 
  const [timer, setTimer] = useState(0);
  const [rideReportId, setRideReportId] = useState(null);

  const [areaSafety, setAreaSafety] = useState([]);
  const [loadingSafe, setLoadingSafe] = useState(false);
  const [currentFunds, setCurrentFunds] = useState(0);
  const [donateAmount, setDonateAmount] = useState('');

  const [aiThinking, setAiThinking] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [blockSubmit, setBlockSubmit] = useState(false);

  useEffect(() => { setMounted(true); const timer = setTimeout(() => setShowSplash(false), 2500); return () => clearTimeout(timer); }, []);

  useEffect(() => {
    if (desc.length > 5) {
      setAiThinking(true);
      const lowerDesc = desc.toLowerCase();
      const foundBadWord = BAD_WORDS.find(word => lowerDesc.includes(word));
      if (foundBadWord) {
        setAiSuggestion(lang === 'ta' ? "⚠️ AI எச்சரிக்கை: முறையற்ற உள்ளடக்கம்." : "⚠️ AI Alert: Inappropriate content detected.");
        setBlockSubmit(true); setAiThinking(false); return;
      } else { setBlockSubmit(false); }

      let foundCategory = null;
      for (const [cat, keywords] of Object.entries(AI_KEYWORDS)) {
        if (keywords.some(k => lowerDesc.includes(k))) { foundCategory = cat; break; }
      }
      if (foundCategory && foundCategory !== category) {
        setCategory(foundCategory); setAiSuggestion(lang === 'ta' ? `💡 AI பரிந்துரை: வகை தானாக மாற்றப்பட்டது` : `💡 AI Suggestion: Category auto-switched`);
      } else { setAiSuggestion(""); }
      setTimeout(() => setAiThinking(false), 800); 
    } else { setAiSuggestion(""); setBlockSubmit(false); }
  }, [desc, category, lang]); 

  const generateID = () => "WB-" + Math.random().toString(36).substr(2, 5).toUpperCase();
  
  const handleReportSubmit = async (e) => {
    e.preventDefault(); 
    if(blockSubmit) return alert("Cannot submit: AI flagged content.");
    setLoadingReport(true);
    const id = generateID();
    try {
      await addDoc(collection(db, "reports"), {
        trackingId: id, description: desc, category, area, timestamp: new Date(), location, 
        status: "Unverified", language: lang, requiresAgent: requestGuardian, 
        bountyAmount: requestGuardian ? (bounty || "0") : "0", agentStatus: requestGuardian ? "Open" : "NA"
      });
      setSubmittedId(id); setLoadingReport(false); setDesc(''); setLocation(null); setBounty(''); setRequestGuardian(false);
    } catch (error) { alert('Error'); setLoadingReport(false); }
  };

  const handleTrackSearch = async (e) => {
    e.preventDefault(); setTrackError(''); setTrackResult(null);
    try {
      const q = query(collection(db, "reports"), where("trackingId", "==", trackInput.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (!snap.empty) setTrackResult(snap.docs[0].data()); else setTrackError(lang==='ta' ? "எண் காணப்படவில்லை" : "ID Not Found");
    } catch (err) { setTrackError("Error"); }
  };

  const startRide = () => { 
      if(!rideDetails.vehicle || !rideDetails.contact || !rideDetails.userName) return alert(lang === 'ta' ? "தயவுசெய்து அனைத்து விவரங்களையும் நிரப்பவும்!" : "Please fill in all details, including your Name!");
      setRideStatus('active'); 
      setTimer(rideDetails.time * 60); 
      setRideReportId(null); 
  };

  const endRideSafe = async () => { 
      if (rideReportId) { 
          try { await updateDoc(doc(db, "reports", rideReportId), { status: "False Alarm - User Safe", adminNote: "User manually cancelled SOS alert." }); } catch(e) { console.error(e); } 
      }
      setRideStatus('safe'); 
  };

  useEffect(() => {
    let interval = null;
    if (rideStatus === 'active' && timer > 0) interval = setInterval(() => setTimer((t) => t - 1), 1000);
    else if (rideStatus === 'active' && timer === 0) { triggerLevel1SOS(); clearInterval(interval); }
    return () => clearInterval(interval);
  }, [rideStatus, timer]);

  const triggerLevel1SOS = async () => {
      setRideStatus('danger_level1'); 
      const id = "SOS-" + Math.floor(Math.random() * 10000);
      try { 
          const docRef = await addDoc(collection(db, "reports"), { 
              trackingId: id, category: "Ride Guard SOS", area: rideDetails.destination || "Unknown Route", 
              description: `CRITICAL: User failed to check in. Vehicle: ${rideDetails.vehicle}.`, 
              emergencyContact: rideDetails.contact, escalationStage: "Level 1: Family Alerted",
              timestamp: new Date(), status: "URGENT ALERT", language: "en" 
          }); 
          setRideReportId(docRef.id); 

          const SERVICE_ID = "service_g62o7yq";
          const TEMPLATE_ID = "template_zt1knn9";
          const PUBLIC_KEY = "jcsgjkYSM4HyFxG1R";

          // ADDED user_name TO THE TEMPLATE PARAMS
          const templateParams = {
              to_email: rideDetails.contact,
              user_name: rideDetails.userName,
              vehicle: rideDetails.vehicle,
              destination: rideDetails.destination || "Unknown Route",
              duration: rideDetails.time
          };

          await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      } catch (e) { console.error("SOS Trigger Failed:", e); }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  const fetchSafetyData = async () => {
    setLoadingSafe(true);
    try {
      const q = query(collection(db, "reports")); const snap = await getDocs(q);
      const counts = {}; snap.docs.forEach(d => { const a = d.data().area || "Unknown"; counts[a] = (counts[a] || 0) + 1; });
      const data = CHENNAI_AREAS.map(name => ({ name, count: counts[name] || 0, status: (counts[name]||0)>=3 ? 'High Risk' : (counts[name]||0)>=1 ? 'Caution' : 'Safe', color: (counts[name]||0)>=3 ? 'bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-400' : (counts[name]||0)>=1 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-700 dark:text-yellow-400' : 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' }));
      setAreaSafety(data.sort((a, b) => b.count - a.count));
    } catch (e) { console.error(e); }
    setLoadingSafe(false);
  };
  useEffect(() => { if (activeTab === 'safe') fetchSafetyData(); }, [activeTab]);

  const fetchFunds = async () => {
    try {
      const q = query(collection(db, "donations")); const snap = await getDocs(q);
      const total = snap.docs.reduce((acc, doc) => acc + Number(doc.data().amount), 0);
      setCurrentFunds(total);
    } catch (e) { console.error(e); }
  };
  const handleDonate = async () => {
    if(!donateAmount || isNaN(donateAmount)) return alert("Enter valid amount");
    await addDoc(collection(db, "donations"), { amount: Number(donateAmount), timestamp: new Date(), type: "Public Anonymous" });
    setDonateAmount(''); fetchFunds();
  };
  useEffect(() => { if (activeTab === 'fund') fetchFunds(); }, [activeTab]);

  if (showSplash) return <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[9999] animate-fade-out"><div className="text-center animate-pulse"><h1 className="text-6xl font-extrabold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent tracking-tighter scale-150 transition-transform duration-[2000ms]">S<span className="text-white">W</span></h1><p className="text-indigo-300 mt-4 text-sm tracking-widest uppercase font-semibold">Secure Whistleblower</p></div></div>;
  
  if (submittedId) return <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950 flex items-center justify-center p-6"><div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-white/50 dark:border-slate-700/50 w-full max-w-md text-center"><div className="text-7xl mb-6 drop-shadow-md">🛡️</div><h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">{t.reportLogTitle}</h1><div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-6 rounded-3xl mt-8 mb-8"><p className="text-indigo-600 dark:text-indigo-400 text-xs uppercase font-extrabold tracking-widest">{t.trackIdText}</p><p className="text-4xl font-mono font-black text-slate-800 dark:text-white mt-2 tracking-tight">{submittedId}</p></div><button onClick={() => window.location.reload()} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 hover:scale-[1.02] transition-all">{t.doneBtn}</button></div></div>;

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-indigo-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950 font-sans text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-500 selection:bg-indigo-500 selection:text-white">
      
      {/* FLOATING SOS BUTTON */}
      <a href="tel:100" className="fixed bottom-6 right-6 bg-gradient-to-br from-red-500 to-rose-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-rose-500/50 shadow-2xl border border-white/20 animate-pulse z-[100] hover:scale-110 transition-transform cursor-pointer" title="Call Police"><span className="font-extrabold text-xs text-center leading-none tracking-wider">SOS<br/>100</span></a>

      {/* GLASSMORPHISM HEADER */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-colors duration-500">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">Secure<span className="text-slate-900 dark:text-white">Whistle</span></span>
          <div className="flex gap-2 items-center">
            {mounted && (<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 rounded-full bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm">{theme === 'dark' ? '☀️' : '🌙'}</button>)}
            <Link href="/dashboard"><button className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs px-4 py-2.5 rounded-full font-extrabold shadow-sm border border-slate-200 dark:border-slate-700 hover:scale-105 transition-all">Dashboard</button></Link>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
                <button onClick={() => setLang('en')} className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full transition-all ${lang === 'en' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>EN</button>
                <button onClick={() => setLang('ta')} className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full transition-all ${lang === 'ta' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>TA</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-12"><h1 className="text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight drop-shadow-sm">{t.heroTitle}</h1><p className="text-lg text-slate-600 dark:text-slate-300 font-medium">{t.heroSub}</p></div>

        {/* MAIN GLASSMORPHISM CARD */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden border border-white/60 dark:border-slate-700/50 transition-all duration-500">
          
          {/* SLEEK PILL NAVIGATION */}
          <div className="p-4 sm:p-6 border-b border-slate-100/50 dark:border-slate-800/50">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
              {['report', 'track', 'ride', 'safe', 'fund'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-shrink-0 px-6 py-3 text-sm font-extrabold rounded-full transition-all duration-300 ${activeTab === tab ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/20 transform scale-105' : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}>{t[`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`]}</button>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === 'report' && (
              <form onSubmit={handleReportSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">{t.catLabel}</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-base appearance-none border border-slate-200/80 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                          <optgroup label={t.urgentGrp}><option value="Harassment">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Harassment"] : "Harassment"}</option><option value="Chain Snatching">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Chain Snatching"] : "Chain Snatching"}</option><option value="Theft">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Theft"] : "Theft"}</option><option value="Suspicious Activity">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Suspicious Activity"] : "Suspicious Activity"}</option><option value="Cyber Fraud">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Cyber Fraud"] : "Cyber Fraud"}</option></optgroup>
                          <optgroup label={t.civicGrp}><option value="Street Light Issue">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Street Light Issue"] : "Street Light Issue"}</option><option value="Public Nuisance">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Public Nuisance"] : "Public Nuisance"}</option><option value="Rash Driving">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Rash Driving"] : "Rash Driving"}</option></optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">{t.locLabel}</label>
                      <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-base appearance-none border border-slate-200/80 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                          {CHENNAI_AREAS.map(a => <option key={a} value={a}>{lang === 'ta' ? AREA_TRANSLATIONS[a] : a}</option>)}<option value="Not in Chennai">{lang === 'ta' ? AREA_TRANSLATIONS["Not in Chennai"] : "Not in Chennai"}</option>
                      </select>
                    </div>
                </div>
                
                <div className={`transition-all duration-300 ${aiSuggestion ? 'p-3 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-2xl flex items-center gap-2' : 'h-0 overflow-hidden opacity-0'}`}>{aiSuggestion && <span>✨</span>}{aiSuggestion}</div>

                <div>
                   <div className="flex justify-between items-end mb-2">
                      <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.descLabel}</label>
                      <button type="button" className="text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold transition-colors">{t.recordBtn}</button>
                   </div>
                   <textarea placeholder={t.descPlace} value={desc} onChange={(e) => setDesc(e.target.value)} className={`w-full bg-white/50 dark:bg-slate-800/50 p-5 rounded-3xl text-base h-36 border outline-none resize-none transition-all placeholder:text-slate-400 ${blockSubmit ? 'border-red-400 focus:ring-2 focus:ring-red-400' : 'border-slate-200/80 dark:border-slate-700/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'}`} required />
                </div>
                
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-yellow-900/10 dark:to-amber-900/10 p-6 rounded-3xl border border-yellow-200/50 dark:border-yellow-700/30">
                    <div className="flex items-center gap-4"><input type="checkbox" id="guard" checked={requestGuardian} onChange={(e) => setRequestGuardian(e.target.checked)} className="w-6 h-6 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500" /><label htmlFor="guard" className="text-base font-bold text-slate-800 dark:text-slate-200 cursor-pointer">{t.agentLabel}</label></div>
                    {requestGuardian && (<div className="mt-5 pl-10 animate-in fade-in slide-in-from-top-2"><label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">{t.bountyLabel}</label><input type="number" placeholder="e.g. 100" value={bounty} onChange={(e) => setBounty(e.target.value)} className="w-full bg-white/80 dark:bg-slate-800/80 p-4 border border-slate-200 dark:border-slate-600 rounded-2xl font-bold text-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all" /></div>)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-6 flex flex-col items-center justify-center hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition cursor-pointer group"><div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📸</div><p className="text-sm font-bold text-slate-600 dark:text-slate-400">{t.attachBtn}</p></div>
                    <div className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 shadow-inner h-full min-h-[150px]"><MapPicker location={location} setLocation={setLocation} /></div>
                </div>

                <button type="submit" disabled={loadingReport || blockSubmit} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale">{loadingReport ? t.loadingText : t.submitBtn}</button>
              </form>
            )}

            {activeTab === 'track' && <div className="text-center py-12"><div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🔍</div><input type="text" placeholder={t.trackPlace} value={trackInput} onChange={(e) => setTrackInput(e.target.value.toUpperCase())} className="w-full bg-white/50 dark:bg-slate-800/50 text-center text-4xl font-mono p-6 rounded-3xl uppercase mb-6 tracking-widest border border-slate-200/80 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all" /><button onClick={handleTrackSearch} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform">{t.checkStatusBtn}</button>{trackResult && (<div className="mt-10 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl text-left animate-in slide-in-from-bottom-4"><div className="flex justify-between items-center mb-6"><span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Status</span><span className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${trackResult.status === 'Verified' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>{trackResult.status}</span></div><p className="text-slate-700 dark:text-slate-300 text-lg font-medium leading-relaxed">"{trackResult.adminNote || (lang === 'ta' ? "பரிசீலனையில் உள்ளது..." : "Pending Review...")}"</p></div>)}</div>}
            
            {/* BEAUTIFUL RIDE GUARD UI */}
            {activeTab === 'ride' && (
              <div className="py-2">
                {rideStatus === 'idle' ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-8 rounded-[2.5rem] border border-indigo-100/50 dark:border-indigo-800/30 text-center mb-8 relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl"></div>
                      <div className="text-5xl mb-4 relative z-10 drop-shadow-md">🚕</div>
                      <h3 className="text-2xl font-black text-indigo-950 dark:text-indigo-300 relative z-10 tracking-tight">{t.rideTitle}</h3>
                      <p className="text-sm font-medium text-indigo-700/70 dark:text-indigo-400/70 mt-2 relative z-10">{lang === 'ta' ? "பயண விவரங்கள் அனாமதேயமாக கண்காணிக்கப்படும்" : "Secure, encrypted journey tracking"}</p>
                    </div>
                    
                    <div className="space-y-4">
                      {/* NEW USER NAME FIELD */}
                      <input type="text" placeholder={t.namePlaceholder} value={rideDetails.userName} onChange={e=>setRideDetails({...rideDetails, userName:e.target.value})} className="w-full bg-white/50 dark:bg-slate-800/50 p-5 rounded-2xl font-bold text-lg border border-slate-200/80 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all placeholder:text-slate-400"/>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="text" placeholder={t.vehPlaceholder} value={rideDetails.vehicle} onChange={e=>setRideDetails({...rideDetails, vehicle:e.target.value})} className="w-full bg-white/50 dark:bg-slate-800/50 p-5 rounded-2xl font-bold text-lg border border-slate-200/80 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all placeholder:text-slate-400"/>
                          <input type="text" placeholder={t.destPlaceholder} value={rideDetails.destination} onChange={e=>setRideDetails({...rideDetails, destination:e.target.value})} className="w-full bg-white/50 dark:bg-slate-800/50 p-5 rounded-2xl font-bold text-lg border border-slate-200/80 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all placeholder:text-slate-400"/>
                      </div>
                      
                      <input type="email" placeholder={t.contactPlaceholder} value={rideDetails.contact} onChange={e=>setRideDetails({...rideDetails, contact:e.target.value})} className="w-full bg-indigo-50/30 dark:bg-indigo-900/10 p-5 rounded-2xl font-bold text-lg border border-indigo-100 dark:border-indigo-800/30 outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-700 dark:text-indigo-300 transition-all placeholder:text-indigo-300 dark:placeholder:text-indigo-700"/>
                      
                      <div className="relative">
                          <input type="number" placeholder={t.minPlaceholder} value={rideDetails.time} onChange={e=>setRideDetails({...rideDetails, time:e.target.value})} className="w-full bg-white/50 dark:bg-slate-800/50 p-5 rounded-2xl font-black text-2xl text-center border border-slate-200/80 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-slate-800"/>
                          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-extrabold uppercase tracking-widest text-slate-400">Minutes</span>
                      </div>
                    </div>
                    <button onClick={startRide} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">{t.startRideBtn}</button>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="relative inline-block mb-10">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                        <div className="text-8xl font-mono font-black text-slate-800 dark:text-white tracking-tighter relative z-10">{formatTime(timer)}</div>
                    </div>
                    
                    {rideStatus === 'danger_level1' ? (
                      <div className="bg-gradient-to-b from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 p-8 rounded-[2.5rem] border border-red-200 dark:border-red-800/50 animate-in fade-in zoom-in duration-500 shadow-2xl shadow-red-500/10 space-y-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                        <h3 className="text-3xl font-black text-red-600 dark:text-red-500 tracking-tight">{lang === 'ta' ? "எச்சரிக்கை" : "EMERGENCY ALERT"}</h3>
                        <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                          {lang === 'ta' ? "அவசர மின்னஞ்சல் அனுப்பப்பட்டது." : "Emergency Email has been dispatched!"}
                        </p>
                        <p className="text-xs text-red-500 font-extrabold uppercase tracking-widest bg-red-100 dark:bg-red-900/30 inline-block px-4 py-2 rounded-full">
                          {lang === 'ta' ? "30 நிமிடங்களில் காவல்துறைக்கு தகவல் அனுப்பப்படும்." : "Escalating to Police in 30 mins"}
                        </p>
                        <div className="pt-4">
                            <button onClick={endRideSafe} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg">
                              ✅ {t.arrivedBtn} (Cancel)
                            </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={endRideSafe} className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white py-6 rounded-2xl font-black text-2xl shadow-xl shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all tracking-tight">{t.arrivedBtn}</button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'safe' && <div className="py-2"><div className="text-center mb-10"><h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t.safeTitle}</h2><p className="text-sm font-medium text-slate-500 mt-2">Live community risk analysis</p></div>{loadingSafe ? <p className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Analyzing Zones...</p> : (<div className="space-y-3 h-[500px] overflow-y-auto pr-2 custom-scrollbar">{areaSafety.map((item) => (<div key={item.name} className={`flex justify-between items-center p-5 rounded-2xl border bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm transition-all hover:bg-white/80 dark:hover:bg-slate-800/80 cursor-pointer ${item.color.includes('red') ? 'border-red-200/50 dark:border-red-800/30' : item.color.includes('yellow') ? 'border-yellow-200/50 dark:border-yellow-800/30' : 'border-slate-200/50 dark:border-slate-700/30'}`}><div className="flex items-center gap-4"><div className={`w-3 h-3 rounded-full shadow-sm ${item.status === 'Safe' ? 'bg-green-400' : item.status.includes('Caution') ? 'bg-amber-400' : 'bg-red-500 shadow-red-500/50 animate-pulse'}`}></div><span className="font-extrabold text-base text-slate-800 dark:text-slate-200">{lang === 'ta' ? AREA_TRANSLATIONS[item.name] : item.name}</span></div><div className="text-right"><span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${item.status === 'Safe' ? 'text-green-600 dark:text-green-400' : item.status.includes('Caution') ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{lang === 'ta' ? (item.status === 'Safe' ? t.safeStatus : item.status === 'Caution' ? t.cautionStatus : t.highRiskStatus) : item.status}</span><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{item.count} {t.reportsText}</span></div></div>))}</div>)}</div>}
            
            {activeTab === 'fund' && <div className="text-center py-10"><div className="text-7xl mb-6 drop-shadow-md">🤝</div><h2 className="text-3xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">{t.fundTitle}</h2><p className="text-base text-slate-500 dark:text-slate-400 mb-10 max-w-sm mx-auto font-medium">{t.fundSub}</p><div className="bg-white/50 dark:bg-slate-800/50 p-8 rounded-[2rem] mb-8 border border-slate-200/80 dark:border-slate-700/80"><div className="flex justify-between text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-widest"><span>₹{currentFunds.toLocaleString()} {t.fundRaised}</span><span>{t.fundGoal}: ₹{MONTHLY_LIMIT.toLocaleString()}</span></div><div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner"><div className="bg-gradient-to-r from-emerald-400 to-green-500 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${(currentFunds / MONTHLY_LIMIT) * 100}%` }}></div></div></div><input type="number" placeholder={lang === 'ta' ? "தொகையை உள்ளிடவும் (₹)" : "Enter Amount (₹)"} value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} className="w-full bg-emerald-50/50 dark:bg-emerald-900/10 text-center text-4xl font-black p-6 rounded-3xl mb-6 border border-emerald-200/50 dark:border-emerald-800/30 outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-700 dark:text-emerald-400 transition-all placeholder:text-emerald-300 dark:placeholder:text-emerald-700/50" /><button onClick={handleDonate} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all tracking-tight">{t.donateBtn}</button></div>}
          </div>
        </div>
      </main>
      
      <footer className="text-center py-16 mt-10 relative z-10">
        <div className="flex justify-center gap-8 mb-10 items-center">
          <Link href="/admin"><span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">{t.adminLogin}</span></Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link href="/tasks"><span className="text-[11px] font-black text-amber-500 dark:text-amber-600 uppercase tracking-widest hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer">🕵️ Guardian Partner</span></Link>
        </div>
        <div className="mb-4">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5">{t.officialApp}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://play.google.com/store/apps/details?id=com.amtexsystems.kaavaluthavi" target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-sm hover:shadow-md">
              <span className="text-xl">🤖</span><span className="text-xs font-extrabold tracking-wide">Google Play</span>
            </a>
            <a href="https://apps.apple.com/in/app/kaaval-uthavi/id1388361252" target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-sm hover:shadow-md">
              <span className="text-xl">🍎</span><span className="text-xs font-extrabold tracking-wide">App Store</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}