"use client"
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes'; 
import { db } from '../firebase'; 
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'; 
import Link from 'next/link'; 
import dynamic from 'next/dynamic';
import emailjs from '@emailjs/browser'; 
import { useState, useEffect, useRef } from 'react';

const MapPicker = dynamic(() => import('./components/MapPicker'), { 
  ssr: false, 
  loading: () => <div className="h-64 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl flex items-center justify-center text-slate-400">Loading Maps...</div>
});

const translations = {
  en: {
    heroTitle: "Speak Up. Stay Safe.", heroSub: "Secure, anonymous reporting for a safer Chennai.",
    tabReport: "Report Incident", tabTrack: "Track Status", tabRide: "Ride Guard", tabSafe: "Safe Zones", tabFund: "Support Us",
    submitBtn: "Submit Secure Report", adminLogin: "Official Login",
    descLabel: "Description", descPlace: "Describe what happened...",
    agentLabel: "Request Guardian Verification?", agentSub: "A verified partner will visit the spot to check.", bountyLabel: "Offer Bounty (₹)",
    catLabel: "Category", locLabel: "Location", urgentGrp: "🚨 Urgent", civicGrp: "🚧 Civic",
    recordBtn: "🎙️ Record", attachBtn: "Attach Evidence", checkStatusBtn: "Check Status", trackPlace: "WB-XXXX",
    rideTitle: "Dead Man's Switch", vehPlaceholder: "Vehicle No (e.g., TN01 AB 1234)", minPlaceholder: "Minutes to Destination", 
    contactPlaceholder: "Emergency Email Address", destPlaceholder: "Where are you going?",
    namePlaceholder: "Your Name / Alias (For Email Only)",
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
    recordBtn: "🎙️ பதிவு செய்", attachBtn: "ஆதாரத்தை இணைக்கவும்", checkStatusBtn: "நிலையைச் சரிபார்க்கவும்", trackPlace: "புகார் எண் (WB-XXXX)",
    rideTitle: "பயண பாதுகாப்பு", vehPlaceholder: "வாகன எண்", minPlaceholder: "பயண நேரம் (நிமிடங்கள்)", 
    contactPlaceholder: "அவசர மின்னஞ்சல்", destPlaceholder: "எங்கு செல்கிறீர்கள்?",
    namePlaceholder: "உங்கள் பெயர் / புனைபெயர்",
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
  const [isRecording, setIsRecording] = useState(false);
 
  // NEW EVIDENCE STATES & REFS
  const [evidence, setEvidence] = useState(null);
  const [showEvidenceMenu, setShowEvidenceMenu] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

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
  
  // RIDE GUARD UPDATES (With Name Field)
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
        setBlockSubmit(true);
        setAiThinking(false);
        return;
      } else {
        setBlockSubmit(false);
      }

      let foundCategory = null;
      for (const [cat, keywords] of Object.entries(AI_KEYWORDS)) {
        if (keywords.some(k => lowerDesc.includes(k))) { foundCategory = cat; break; }
      }

      if (foundCategory && foundCategory !== category) {
        setCategory(foundCategory);
        setAiSuggestion(lang === 'ta' ? `💡 AI பரிந்துரை: வகை தானாக மாற்றப்பட்டது` : `💡 AI Suggestion: Category auto-switched`);
      } else {
        setAiSuggestion("");
      }
      setTimeout(() => setAiThinking(false), 800); 
    } else {
      setAiSuggestion(""); setBlockSubmit(false);
    }
  }, [desc, category, lang]); 

  const generateID = () => "WB-" + Math.random().toString(36).substr(2, 5).toUpperCase();
  
  const handleRecord = () => {
    // Check if the browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert(lang === 'ta' ? "உங்கள் உலாவி குரல் பதிவை ஆதரிக்கவில்லை (Your browser does not support speech recognition)." : "Your browser does not support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    
    // Set language dynamically based on the active language tab
    recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-IN'; 
    recognition.continuous = false; // Stops automatically when the user stops speaking
    recognition.interimResults = true; // Shows text as they speak

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      // Append the recognized text to the existing description
      if (finalTranscript) {
        setDesc((prev) => prev ? prev + ' ' + finalTranscript : finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        alert(lang === 'ta' ? "மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது." : "Microphone access denied.");
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    // If already recording, stop it. Otherwise, start it.
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };
  
  const handleReportSubmit = async (e) => {
    e.preventDefault(); 
    if(blockSubmit) return alert("Cannot submit: AI flagged content.");
    setLoadingReport(true);
    const id = generateID();
    
    try {
      await addDoc(collection(db, "reports"), {
        trackingId: id, 
        description: desc, 
        category, 
        area, 
        timestamp: new Date(), 
        location, 
        status: "Unverified", 
        language: lang, 
        requiresAgent: requestGuardian, 
        bountyAmount: requestGuardian ? (bounty || "0") : "0", 
        agentStatus: requestGuardian ? "Open" : "NA",
        
        // EVIDENCE SECURITY LOGIC
        hasEvidence: !!evidence,
        evidenceName: evidence ? evidence.name : null,
        evidenceVisibility: "Restricted to Admin/Police Only" // Tells public dashboards to hide this
      });
      
      setSubmittedId(id); 
      setLoadingReport(false); 
      setDesc(''); 
      setLocation(null); 
      setBounty(''); 
      setRequestGuardian(false); 
      setEvidence(null);
    } catch (error) { 
      alert('Error'); 
      setLoadingReport(false); 
    }
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
      if(!rideDetails.vehicle || !rideDetails.contact || !rideDetails.userName) return alert(lang === 'ta' ? "தயவுசெய்து அனைத்து விவரங்களையும் நிரப்பவும்!" : "Please fill in all details, including Name!");
      setRideStatus('active'); 
      setTimer(rideDetails.time * 60); 
      setRideReportId(null); 
  };

  const endRideSafe = async () => { 
      if (rideReportId) { 
          try { 
              await updateDoc(doc(db, "reports", rideReportId), { 
                  status: "False Alarm - User Safe", 
                  adminNote: "User manually cancelled SOS alert." 
              }); 
          } catch(e) { console.error(e); } 
      }
      setRideStatus('safe'); 
  };

  useEffect(() => {
    let interval = null;
    if (rideStatus === 'active' && timer > 0) {
        interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (rideStatus === 'active' && timer === 0) { 
        triggerLevel1SOS(); 
        clearInterval(interval); 
    }
    return () => clearInterval(interval);
  }, [rideStatus, timer]);

  // EMAILJS SOS
  const triggerLevel1SOS = async () => {
      setRideStatus('danger_level1'); 
      const id = "SOS-" + Math.floor(Math.random() * 10000);
      try { 
          const docRef = await addDoc(collection(db, "reports"), { 
              trackingId: id, 
              category: "Ride Guard SOS", 
              area: rideDetails.destination || "Unknown Route", 
              description: `CRITICAL: User failed to check in. Vehicle: ${rideDetails.vehicle}.`, 
              emergencyContact: rideDetails.contact,
              escalationStage: "Level 1: Family Alerted",
              timestamp: new Date(), 
              status: "URGENT ALERT", 
              language: "en" 
          }); 
          setRideReportId(docRef.id); 

          const SERVICE_ID = "service_g62o7yq";
          const TEMPLATE_ID = "template_zt1knn9";
          const PUBLIC_KEY = "jcsgjkYSM4HyFxG1R";

          const templateParams = {
              to_email: rideDetails.contact,
              user_name: rideDetails.userName, // Sending Name to Template
              vehicle: rideDetails.vehicle,
              destination: rideDetails.destination || "Unknown Route",
              duration: rideDetails.time
          };

          await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      } catch (e) { 
          console.error("SOS Trigger Failed:", e); 
      }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  const fetchSafetyData = async () => {
    setLoadingSafe(true);
    try {
      const q = query(collection(db, "reports")); const snap = await getDocs(q);
      const counts = {}; snap.docs.forEach(d => { const a = d.data().area || "Unknown"; counts[a] = (counts[a] || 0) + 1; });
      const data = CHENNAI_AREAS.map(name => ({ 
          name, count: counts[name] || 0, 
          status: (counts[name]||0)>=3 ? 'High Risk' : (counts[name]||0)>=1 ? 'Caution' : 'Safe', 
          color: (counts[name]||0)>=3 ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800' : (counts[name]||0)>=1 ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' : 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800' 
      }));
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

  if (showSplash) return <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999] animate-fade-out"><div className="text-center animate-pulse"><h1 className="text-6xl font-extrabold text-red-600 tracking-tighter scale-150 transition-transform duration-[2000ms]">S<span className="text-white">W</span></h1><p className="text-slate-400 mt-4 text-sm tracking-widest uppercase">Secure Whistleblower</p></div></div>;
  
  if (submittedId) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-300"><div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-xl w-full max-w-md text-center border border-slate-100 dark:border-slate-800"><div className="text-6xl mb-4">✅</div><h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.reportLogTitle}</h1><div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl mt-6 mb-6"><p className="text-slate-500 dark:text-slate-400 text-sm uppercase font-bold tracking-wider">{t.trackIdText}</p><p className="text-4xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-2">{submittedId}</p></div><button onClick={() => window.location.reload()} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold text-lg hover:scale-[1.02] transition">{t.doneBtn}</button></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-300">
      <a href="tel:100" className="fixed bottom-6 right-6 bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-4 border-red-200 dark:border-red-900 animate-pulse z-[100] hover:scale-110 transition cursor-pointer" title="Call Police"><span className="font-bold text-xs text-center leading-none">SOS<br/>100</span></a>

      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50 p-4 transition-colors duration-300 border-b border-transparent dark:border-slate-800">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <span className="font-extrabold text-2xl text-blue-700 dark:text-blue-500 tracking-tight">Secure<span className="text-slate-900 dark:text-white">Whistle</span></span>
          <div className="flex gap-2 items-center">
            {mounted && (
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:scale-105 transition">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            )}
            <Link href="/dashboard"><button className="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 transition">Dashboard</button></Link>
            <button onClick={() => setLang('en')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${lang === 'en' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>ENG</button>
            <button onClick={() => setLang('ta')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${lang === 'ta' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>தமிழ்</button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="text-center mb-10"><h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">{t.heroTitle}</h1><p className="text-base text-slate-500 dark:text-slate-400">{t.heroSub}</p></div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {['report', 'track', 'ride', 'safe', 'fund'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-shrink-0 px-6 py-3 text-sm font-bold rounded-full transition-all border ${activeTab === tab ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md transform scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{t[`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`]}</button>
              ))}
            </div>
          </div>

          <div className="p-6 md:p-8">
            {activeTab === 'report' && (
              <form onSubmit={handleReportSubmit} className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{t.catLabel}</label>
                  <div className={`transition-all duration-300 ${aiSuggestion ? 'mb-2 p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-lg border border-purple-200 dark:border-purple-800' : 'h-0 overflow-hidden'}`}>{aiSuggestion}</div>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-slate-700 dark:text-slate-200 text-base appearance-none border border-slate-200 dark:border-slate-700 outline-none">
                      <optgroup label={t.urgentGrp}>
                        <option value="Harassment">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Harassment"] : "Harassment"}</option>
                        <option value="Chain Snatching">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Chain Snatching"] : "Chain Snatching"}</option>
                        <option value="Theft">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Theft"] : "Theft"}</option>
                        <option value="Suspicious Activity">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Suspicious Activity"] : "Suspicious Activity"}</option>
                        <option value="Cyber Fraud">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Cyber Fraud"] : "Cyber Fraud"}</option>
                      </optgroup>
                      <optgroup label={t.civicGrp}>
                        <option value="Street Light Issue">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Street Light Issue"] : "Street Light Issue"}</option>
                        <option value="Public Nuisance">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Public Nuisance"] : "Public Nuisance"}</option>
                        <option value="Rash Driving">{lang === 'ta' ? CATEGORY_TRANSLATIONS["Rash Driving"] : "Rash Driving"}</option>
                      </optgroup>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{t.locLabel}</label>
                  <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-slate-700 dark:text-slate-200 text-base appearance-none border border-slate-200 dark:border-slate-700 outline-none">
                      {CHENNAI_AREAS.map(a => <option key={a} value={a}>{lang === 'ta' ? AREA_TRANSLATIONS[a] : a}</option>)}
                      <option value="Not in Chennai">{lang === 'ta' ? AREA_TRANSLATIONS["Not in Chennai"] : "Not in Chennai"}</option>
                  </select>
                </div>
                <div>
                   <div className="flex justify-between items-end mb-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.descLabel}</label>
                      {aiThinking && <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold animate-pulse">✨ AI Analyzing...</span>}
                      <button 
                        type="button" 
                        onClick={handleRecord}
                        className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all ${
                          isRecording 
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 animate-pulse border border-red-300' 
                            : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                        }`}
                      >
                        {isRecording ? (lang === 'ta' ? '🛑 கேட்கிறது...' : '🛑 Listening...') : t.recordBtn}
                      </button>
                   </div>
                   <textarea placeholder={t.descPlace} value={desc} onChange={(e) => setDesc(e.target.value)} className={`w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-base h-32 border focus:ring-2 outline-none resize-none ${blockSubmit ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500 dark:focus:ring-blue-400'}`} required />
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-5 rounded-2xl border border-yellow-200 dark:border-yellow-800/50">
                    <div className="flex items-center gap-4"><input type="checkbox" id="guard" checked={requestGuardian} onChange={(e) => setRequestGuardian(e.target.checked)} className="w-6 h-6 text-blue-600 rounded-md" /><label htmlFor="guard" className="text-base font-bold text-slate-800 dark:text-slate-200 cursor-pointer">{t.agentLabel}</label></div>
                    {requestGuardian && (<div className="mt-4 pl-10 animate-in fade-in slide-in-from-top-2"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">{t.bountyLabel}</label><input type="number" placeholder="e.g. 100" value={bounty} onChange={(e) => setBounty(e.target.value)} className="w-full bg-white dark:bg-slate-800 p-3 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-lg dark:text-white" /></div>)}
                </div>
                <div className="relative">
                  <div 
                    onClick={() => !evidence && setShowEvidenceMenu(!showEvidenceMenu)}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${evidence ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    {evidence ? (
                      <div>
                        <div className="text-2xl mb-2">✅</div>
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">Securely Attached: {evidence.name}</p>
                        <p className="text-[10px] text-slate-500 mt-1">🔒 Visible only to Admin/Police</p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEvidence(null); }} className="text-xs text-red-500 font-bold mt-3 hover:underline">Remove Evidence</button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl mb-2">📸</div>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{t.attachBtn}</p>
                      </div>
                    )}
                  </div>

                  {/* POPUP MENU FOR CAMERA OR GALLERY */}
                  {showEvidenceMenu && !evidence && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-10 flex flex-col">
                      <button type="button" onClick={() => { cameraRef.current.click(); setShowEvidenceMenu(false); }} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 transition text-left">
                        <span className="text-xl">📷</span> <span className="font-bold text-slate-700 dark:text-slate-200">{lang === 'ta' ? 'கேமரா (Take Photo/Video)' : 'Camera (Take Photo/Video)'}</span>
                      </button>
                      <button type="button" onClick={() => { galleryRef.current.click(); setShowEvidenceMenu(false); }} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left">
                        <span className="text-xl">📁</span> <span className="font-bold text-slate-700 dark:text-slate-200">{lang === 'ta' ? 'கேலரி (Browse Files)' : 'Gallery (Browse Files)'}</span>
                      </button>
                    </div>
                  )}
                  
                  {/* HIDDEN INPUTS TO TRIGGER NATIVE OS BEHAVIOR */}
                  {/* 'capture="environment"' forces mobile devices to open the rear camera */}
                  <input type="file" accept="image/*,video/*" capture="environment" ref={cameraRef} className="hidden" onChange={(e) => e.target.files[0] && setEvidence(e.target.files[0])} />
                  {/* No capture attribute allows picking from folder/gallery */}
                  <input type="file" accept="image/*,video/*" ref={galleryRef} className="hidden" onChange={(e) => e.target.files[0] && setEvidence(e.target.files[0])} />
                </div>
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner"><MapPicker location={location} setLocation={setLocation} /></div>
                <button type="submit" disabled={loadingReport || blockSubmit} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:bg-slate-400">{loadingReport ? t.loadingText : t.submitBtn}</button>
              </form>
            )}

            {activeTab === 'track' && <div className="text-center py-10"><input type="text" placeholder={t.trackPlace} value={trackInput} onChange={(e) => setTrackInput(e.target.value.toUpperCase())} className="w-full bg-slate-100 dark:bg-slate-800 text-center text-3xl font-mono p-5 rounded-2xl uppercase mb-6 tracking-widest border border-slate-200 dark:border-slate-700 outline-none dark:text-white" /><button onClick={handleTrackSearch} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg">{t.checkStatusBtn}</button>{trackResult && (<div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg text-left"><div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</span><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${trackResult.status === 'Verified' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>{trackResult.status}</span></div><p className="text-slate-600 dark:text-slate-300 italic">"{trackResult.adminNote || (lang === 'ta' ? "பரிசீலனையில் உள்ளது..." : "Pending Review...")}"</p></div>)}</div>}
            
            {/* FLAT UI RIDE GUARD WITH NAME AND CANCEL BUTTON */}
            {activeTab === 'ride' && (
              <div className="py-4">
                {rideStatus === 'idle' ? (
                  <div className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-3xl border border-yellow-200 dark:border-yellow-800/50 text-center">
                      <div className="text-4xl mb-3">🚕</div>
                      <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-500">{t.rideTitle}</h3>
                      <p className="text-xs text-yellow-700 dark:text-yellow-600 mt-2">{lang === 'ta' ? "பயண விவரங்கள் அனாமதேயமாக கண்காணிக்கப்படும்" : "Securely log your journey details"}</p>
                    </div>
                    <div className="space-y-4">
                      {/* FLAT UI NAME FIELD */}
                      <input type="text" placeholder={t.namePlaceholder} value={rideDetails.userName} onChange={e=>setRideDetails({...rideDetails, userName:e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-lg border border-slate-200 dark:border-slate-700 dark:text-white"/>
                      <input type="text" placeholder={t.vehPlaceholder} value={rideDetails.vehicle} onChange={e=>setRideDetails({...rideDetails, vehicle:e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-lg border border-slate-200 dark:border-slate-700 dark:text-white"/>
                      <input type="text" placeholder={t.destPlaceholder} value={rideDetails.destination} onChange={e=>setRideDetails({...rideDetails, destination:e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-lg border border-slate-200 dark:border-slate-700 dark:text-white"/>
                      <input type="email" placeholder={t.contactPlaceholder} value={rideDetails.contact} onChange={e=>setRideDetails({...rideDetails, contact:e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-lg border border-slate-200 dark:border-slate-700 dark:text-white"/>
                      <input type="number" placeholder={t.minPlaceholder} value={rideDetails.time} onChange={e=>setRideDetails({...rideDetails, time:e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-lg border border-slate-200 dark:border-slate-700 dark:text-white"/>
                    </div>
                    <button onClick={startRide} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-bold text-lg shadow-xl">{t.startRideBtn}</button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-7xl font-mono font-bold text-slate-800 dark:text-slate-100 mb-8 animate-pulse">{formatTime(timer)}</div>
                    
                    {rideStatus === 'danger_level1' ? (
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl border-2 border-orange-500 animate-pulse space-y-4">
                        <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-500">{lang === 'ta' ? "லெவல் 1 எச்சரிக்கை" : "LEVEL 1 ALERT"}</h3>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {lang === 'ta' ? "அவசர மின்னஞ்சல் அனுப்பப்பட்டது." : "Emergency Email has been sent!"}
                        </p>
                        <p className="text-xs text-red-500 font-bold mb-4">
                          {lang === 'ta' ? "30 நிமிடங்களில் காவல்துறைக்கு தகவல் அனுப்பப்படும்." : "ESCALATING TO POLICE IN 30 MINUTES."}
                        </p>
                        {/* FLAT UI CANCEL BUTTON */}
                        <button onClick={endRideSafe} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition duration-300">
                          ✅ {t.arrivedBtn} (Cancel Alert)
                        </button>
                      </div>
                    ) : (
                      <button onClick={endRideSafe} className="w-full bg-green-500 text-white py-5 rounded-2xl font-bold text-xl shadow-lg">{t.arrivedBtn}</button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'safe' && <div className="py-2"><div className="text-center mb-8"><h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.safeTitle}</h2></div>{loadingSafe ? <p className="text-center text-slate-400">Loading...</p> : (<div className="space-y-3 h-[500px] overflow-y-auto pr-2 custom-scrollbar">{areaSafety.map((item) => (<div key={item.name} className={`flex justify-between items-center p-5 rounded-2xl border transition-all hover:scale-[1.01] ${item.color}`}><div className="flex items-center gap-4"><div className={`w-4 h-4 rounded-full shadow-sm ${item.status === 'Safe' ? 'bg-green-500' : item.status.includes('Caution') ? 'bg-yellow-500' : 'bg-red-600 animate-pulse'}`}></div><span className="font-bold text-base text-slate-800 dark:text-slate-200">{lang === 'ta' ? AREA_TRANSLATIONS[item.name] : item.name}</span></div><div className="text-right"><span className="block text-[10px] font-extrabold uppercase tracking-widest opacity-60 dark:text-slate-300">{lang === 'ta' ? (item.status === 'Safe' ? t.safeStatus : item.status === 'Caution' ? t.cautionStatus : t.highRiskStatus) : item.status}</span><span className="text-sm font-bold dark:text-slate-200">{item.count} {t.reportsText}</span></div></div>))}</div>)}</div>}
            
            {activeTab === 'fund' && <div className="text-center py-6"><div className="text-6xl mb-6">🤝</div><h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">{t.fundTitle}</h2><p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">{t.fundSub}</p><div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-3xl mb-8"><div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2"><span>₹{currentFunds.toLocaleString()} {t.fundRaised}</span><span>{t.fundGoal}: ₹{MONTHLY_LIMIT.toLocaleString()}</span></div><div className="w-full bg-slate-300 dark:bg-slate-700 rounded-full h-3 overflow-hidden"><div className="bg-green-500 h-3 rounded-full" style={{ width: `${(currentFunds / MONTHLY_LIMIT) * 100}%` }}></div></div></div><input type="number" placeholder={lang === 'ta' ? "தொகையை உள்ளிடவும் (₹)" : "Enter Amount (₹)"} value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 text-center text-3xl font-bold p-6 rounded-2xl mb-4 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-green-500 text-green-700 dark:text-green-500" /><button onClick={handleDonate} className="w-full bg-green-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] transition">{t.donateBtn}</button></div>}
          </div>
        </div>
      </main>
      
      <footer className="text-center py-12 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 mt-10 relative z-10 transition-colors duration-300">
        <div className="flex justify-center gap-8 mb-8 items-center">
          <Link href="/admin"><span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">{t.adminLogin}</span></Link>
          <span className="text-slate-200 dark:text-slate-700">|</span>
          <Link href="/tasks"><span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-widest hover:text-yellow-700 dark:hover:text-yellow-400 cursor-pointer">🕵️ Guardian Partner</span></Link>
        </div>
        <div className="mb-4">
          <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-4">{t.officialApp}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://play.google.com/store/apps/details?id=com.amtexsystems.kaavaluthavi" target="_blank" rel="noopener noreferrer" className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-5 py-2 rounded-xl transition border border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <span className="text-xl">🤖</span><span className="text-xs font-bold">Google Play</span>
            </a>
            <a href="https://apps.apple.com/in/app/kaaval-uthavi/id1388361252" target="_blank" rel="noopener noreferrer" className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-5 py-2 rounded-xl transition border border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <span className="text-xl">🍎</span><span className="text-xs font-bold">App Store</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}