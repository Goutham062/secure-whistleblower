"use client"
import { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'; 
import Link from 'next/link'; 
import dynamic from 'next/dynamic';

// --- 1. DYNAMIC MAP ---
const MapPicker = dynamic(() => import('./components/MapPicker'), { 
  ssr: false, 
  loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">Loading Maps...</div>
});

// --- 2. TRANSLATIONS ---
const translations = {
  en: {
    heroTitle: "Speak Up. Stay Safe.",
    heroSub: "Secure, anonymous reporting & automated safety checks for Chennai.",
    tabReport: "Report", tabTrack: "Status", tabRide: "Ride Guard", tabSafe: "Safe Zones", tabFund: "Support Us",
    submitBtn: "Submit Secure Report", adminLogin: "Official Login",
    descLabel: "Description", descPlace: "Describe what happened...",
    agentLabel: "Request Guardian Verification?", agentSub: "A verified partner will visit the spot to check.", bountyLabel: "Offer Bounty (₹)"
  },
  ta: {
    heroTitle: "துணிந்து பேசுங்கள்.",
    heroSub: "பாதுகாப்பான சென்னைக்காக அனாமதேய புகார் மற்றும் பயண பாதுகாப்பு சேவை.",
    tabReport: "புகார்", tabTrack: "நிலை", tabRide: "பயண பாதுகாப்பு", tabSafe: "பாதுகாப்பு மண்டலம்", tabFund: "நன்கொடை",
    submitBtn: "பாதுகாப்பாக அனுப்பு", adminLogin: "அதிகாரி உள்நுழைவு",
    descLabel: "விவரம்", descPlace: "என்ன நடந்தது...",
    agentLabel: "கள ஆய்வாளர் வேண்டுமா?", agentSub: "சரிபார்க்க ஒரு நபர் அனுப்பப்படுவார்.", bountyLabel: "வெகுமதி (₹)"
  }
};

const CHENNAI_AREAS = [ "Adyar", "Alandur", "Ambattur", "Anna Nagar", "Ashok Nagar", "Avadi", "Ayanavaram", "Besant Nagar", "Chetpet", "Chromepet", "Egmore", "Guindy", "K.K. Nagar", "Kilpauk", "Kodambakkam", "Kolathur", "Korattur", "Kotturpuram", "Koyambedu", "Madhavaram", "Madipakkam", "Medavakkam", "Mogappair", "Mylapore", "Nandanam", "Nungambakkam", "Pallavaram", "Perambur", "Perungudi", "Poonamallee", "Porur", "Purasawalkam", "Red Hills", "Royapettah", "Royapuram", "Saidapet", "Sholinganallur", "T. Nagar", "Tambaram", "Teynampet", "Thiruvanmiyur", "Tondiarpet", "Triplicane", "Vadapalani", "Valasaravakkam", "Velachery", "Villivakkam", "Virugambakkam", "Washermanpet", "West Mambalam" ];

// FUNDING LIMIT (5 Lakhs)
const MONTHLY_LIMIT = 500000; 

export default function Home() {
  const [lang, setLang] = useState('en'); 
  const t = translations[lang]; 
  const [activeTab, setActiveTab] = useState('report'); 

  // States
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Cyber Fraud');
  const [area, setArea] = useState('Anna Nagar'); 
  const [location, setLocation] = useState(null); 
  const [loadingReport, setLoadingReport] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  // Agent/Bounty State
  const [requestGuardian, setRequestGuardian] = useState(false);
  const [bounty, setBounty] = useState('');

  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  const [rideDetails, setRideDetails] = useState({ vehicle: '', time: 10 }); 
  const [rideStatus, setRideStatus] = useState('idle'); 
  const [timer, setTimer] = useState(0);

  const [areaSafety, setAreaSafety] = useState([]);
  const [loadingSafe, setLoadingSafe] = useState(false);

  // Funding State
  const [currentFunds, setCurrentFunds] = useState(0);
  const [donateAmount, setDonateAmount] = useState('');

  // --- REPORT LOGIC ---
  const generateID = () => "WB-" + Math.random().toString(36).substr(2, 5).toUpperCase();
  
  const handleReportSubmit = async (e) => {
    e.preventDefault(); setLoadingReport(true);
    const newTrackingId = generateID();
    try {
      await addDoc(collection(db, "reports"), {
        trackingId: newTrackingId, description: desc, category: category, area: area, 
        timestamp: new Date(), location: location, status: "Unverified", language: lang,
        requiresAgent: requestGuardian, 
        bountyAmount: requestGuardian ? (bounty || "0") : "0",
        agentStatus: requestGuardian ? "Open for Pickup" : "NA"
      });
      setSubmittedId(newTrackingId); setLoadingReport(false); setDesc(''); setLocation(null); setBounty(''); setRequestGuardian(false);
    } catch (error) { alert('Error'); setLoadingReport(false); }
  };

  // --- TRACK LOGIC ---
  const handleTrackSearch = async (e) => {
    e.preventDefault(); setTrackError(''); setTrackResult(null);
    try {
      const q = query(collection(db, "reports"), where("trackingId", "==", trackInput.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) setTrackResult(querySnapshot.docs[0].data()); else setTrackError("ID Not Found");
    } catch (err) { setTrackError("Error"); }
  };

  // --- RIDE GUARD ---
  const startRide = () => { setRideStatus('active'); setTimer(rideDetails.time * 60); };
  const endRideSafe = () => { setRideStatus('safe'); };
  useEffect(() => {
    let interval = null;
    if (rideStatus === 'active' && timer > 0) interval = setInterval(() => setTimer((t) => t - 1), 1000);
    else if (rideStatus === 'active' && timer === 0) { setRideStatus('danger'); clearInterval(interval); }
    return () => clearInterval(interval);
  }, [rideStatus, timer]);
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${seconds % 60 < 10 ? '0' : ''}${seconds % 60}`;

  // --- SAFE ZONES ---
  const fetchSafetyData = async () => {
    setLoadingSafe(true);
    try {
      const q = query(collection(db, "reports")); const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => doc.data());
      const counts = {};
      reports.forEach(r => { const a = r.area || "Unknown"; if (!counts[a]) counts[a] = 0; counts[a]++; });
      const safetyData = CHENNAI_AREAS.map(areaName => {
        const count = counts[areaName] || 0;
        let status = 'Safe'; let color = 'bg-green-100 text-green-800 border-green-200';
        if (count >= 3) { status = 'High Risk'; color = 'bg-red-100 text-red-800 border-red-200'; } 
        else if (count >= 1) { status = 'Caution'; color = 'bg-yellow-100 text-yellow-800 border-yellow-200'; }
        return { name: areaName, count, status, color };
      });
      safetyData.sort((a, b) => b.count - a.count); setAreaSafety(safetyData);
    } catch (e) { console.error(e); }
    setLoadingSafe(false);
  };
  useEffect(() => { if (activeTab === 'safe') fetchSafetyData(); }, [activeTab]);

  // --- FUNDING LOGIC (NEW) ---
  const fetchFunds = async () => {
    try {
      const q = query(collection(db, "donations")); 
      const snap = await getDocs(q);
      const total = snap.docs.reduce((acc, doc) => acc + Number(doc.data().amount), 0);
      setCurrentFunds(total);
    } catch (e) { console.error(e); }
  };
  
  const handleDonate = async () => {
    if(!donateAmount || isNaN(donateAmount)) return alert("Enter valid amount");
    if(currentFunds + Number(donateAmount) > MONTHLY_LIMIT) return alert("Monthly Limit Reached! We cannot accept more funds.");
    
    await addDoc(collection(db, "donations"), { amount: Number(donateAmount), timestamp: new Date(), type: "Public Anonymous" });
    alert(`Thank you! ₹${donateAmount} received anonymously.`);
    setDonateAmount(''); fetchFunds();
  };
  useEffect(() => { if (activeTab === 'fund') fetchFunds(); }, [activeTab]);


  if (submittedId) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md text-center"><div className="text-5xl mb-4">✅</div><h1 className="text-2xl font-bold text-slate-800">Report Logged</h1><p className="text-slate-500 mt-2 font-mono text-xl">{submittedId}</p><button onClick={() => window.location.reload()} className="mt-6 w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Done</button></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      <a href="tel:100" className="fixed bottom-6 right-6 bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-red-200 animate-pulse z-[100] hover:scale-110 transition cursor-pointer" title="Call Police"><span className="font-bold text-xs text-center leading-none">SOS<br/>100</span></a>

      <header className="bg-white shadow-sm sticky top-0 z-50 p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <span className="font-bold text-xl text-blue-700">SecureWhistle</span>
          <div className="flex gap-2"><button onClick={() => setLang('en')} className={`text-xs font-bold px-2 py-1 rounded ${lang === 'en' ? 'bg-blue-100' : ''}`}>ENG</button><button onClick={() => setLang('ta')} className={`text-xs font-bold px-2 py-1 rounded ${lang === 'ta' ? 'bg-blue-100' : ''}`}>தமிழ்</button><Link href="/dashboard"><button className="bg-slate-800 text-white text-xs px-3 py-1 rounded font-bold">Dashboard</button></Link></div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8"><h1 className="text-3xl font-extrabold text-slate-900 mb-2">{t.heroTitle}</h1><p className="text-sm text-slate-500">{t.heroSub}</p></div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="flex bg-slate-50 p-1 m-2 rounded-2xl overflow-x-auto">
            {['report', 'track', 'ride', 'safe', 'fund'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[70px] py-3 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{t[`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`]}</button>
            ))}
          </div>

          {activeTab === 'report' && (
            <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Category</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm mt-1"><optgroup label="Field Agent Services (Safe)"><option value="Infrastructure Check">Infrastructure Check / உள்கட்டமைப்பு ஆய்வு</option><option value="Lost Item Search">Lost Item Search / தொலைந்த பொருள் தேடல்</option><option value="Safety Audit">Safety Audit / பாதுகாப்பு தணிக்கை</option></optgroup><optgroup label="Police Report (Serious)"><option value="Cyber Fraud">Cyber Fraud</option><option value="Harassment">Harassment</option><option value="Theft">Theft</option><option>Chain Snatching</option><option>Rash Driving</option></optgroup></select></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">Area</label><select value={area} onChange={(e) => setArea(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm mt-1">{CHENNAI_AREAS.map(a => <option key={a} value={a}>{a}</option>)}<option>Not in Chennai</option></select></div>
              <div><div className="flex justify-between items-end mb-1"><label className="text-xs font-bold text-slate-500 uppercase">{t.descLabel}</label><button type="button" onClick={() => alert("Voice active!")} className="text-[10px] flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100">🎙️ Audio</button></div><textarea placeholder={t.descPlace} value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl text-sm h-24" required /></div>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200"><div className="flex items-center gap-3"><input type="checkbox" id="guard" checked={requestGuardian} onChange={(e) => setRequestGuardian(e.target.checked)} className="w-5 h-5 rounded" /><label htmlFor="guard" className="text-sm font-bold text-slate-800">{t.agentLabel}</label></div>{requestGuardian && <div className="ml-8 mt-2"><label className="text-xs font-bold text-slate-500 uppercase">{t.bountyLabel}</label><input type="number" placeholder="50" value={bounty} onChange={(e) => setBounty(e.target.value)} className="w-full bg-white p-2 border rounded-lg text-sm mt-1" /></div>}</div>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer" onClick={() => alert("Upload...")}><p className="text-xs text-blue-500 font-bold">📸 Evidence</p></div>
              <div className="rounded-xl overflow-hidden border"><MapPicker location={location} setLocation={setLocation} /></div>
              <button type="submit" disabled={loadingReport} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50">{loadingReport ? "..." : t.submitBtn}</button>
            </form>
          )}

          {activeTab === 'track' && <div className="p-8 text-center"><input type="text" placeholder="WB-XXXX" value={trackInput} onChange={(e) => setTrackInput(e.target.value.toUpperCase())} className="w-full bg-slate-50 text-center text-xl font-mono p-4 rounded-xl uppercase mb-4" /><button onClick={handleTrackSearch} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">Check</button>{trackResult && <div className="mt-6 bg-green-50 p-4 rounded-xl border border-green-100 text-left"><p className="text-xs font-bold text-green-800 uppercase">Status: {trackResult.status}</p><p className="text-sm text-slate-600 mt-1">"{trackResult.adminNote || "No updates"}"</p></div>}</div>}

          {activeTab === 'ride' && <div className="p-6">{rideStatus === 'idle' ? <div className="space-y-4"><div className="bg-yellow-50 p-4 rounded-xl text-center border border-yellow-200"><p className="text-2xl">🚕</p><h3 className="font-bold">Dead Man's Switch</h3></div><input type="text" placeholder="Vehicle No" value={rideDetails.vehicle} onChange={e=>setRideDetails({...rideDetails, vehicle:e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl text-sm"/><input type="number" placeholder="Minutes" value={rideDetails.time} onChange={e=>setRideDetails({...rideDetails, time:e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl text-sm"/><button onClick={startRide} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg">Start</button></div> : <div className="text-center py-8"><span className="text-6xl font-mono font-bold text-slate-800">{formatTime(timer)}</span><br/><button onClick={endRideSafe} className="mt-6 w-full bg-green-500 text-white py-4 rounded-xl font-bold">I'm Safe</button></div>}</div>}

          {activeTab === 'safe' && <div className="p-6"><div className="text-center mb-6"><h2 className="text-xl font-bold text-slate-800">Safety Heatmap</h2></div>{loadingSafe ? <p className="text-center text-slate-400">Loading...</p> : <div className="space-y-3 h-96 overflow-y-auto pr-2">{areaSafety.map((item) => <div key={item.name} className={`flex justify-between items-center p-4 rounded-xl border ${item.color}`}><span className="font-bold text-sm">{item.name}</span><span className="text-xs font-bold uppercase">{item.status}</span></div>)}</div>}</div>}

          {/* NEW: PUBLIC FUNDING TAB */}
          {activeTab === 'fund' && (
            <div className="p-8 text-center">
               <div className="text-5xl mb-4">🤝</div>
               <h2 className="text-xl font-bold text-slate-800 mb-2">Support the Platform</h2>
               <p className="text-sm text-slate-500 mb-6">We accept anonymous public donations to fund our Guardian operations. Max limit ₹5 Lakhs/month.</p>
               
               {/* PROGRESS BAR */}
               <div className="w-full bg-slate-200 rounded-full h-4 mb-2 overflow-hidden">
                  <div className="bg-green-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${(currentFunds / MONTHLY_LIMIT) * 100}%` }}></div>
               </div>
               <div className="flex justify-between text-xs font-bold text-slate-500 mb-8">
                  <span>₹{currentFunds.toLocaleString()} Raised</span>
                  <span>Goal: ₹{MONTHLY_LIMIT.toLocaleString()}</span>
               </div>

               <input type="number" placeholder="Enter Amount (₹)" value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} className="w-full bg-slate-50 text-center text-xl font-mono p-4 rounded-xl mb-4" />
               <button onClick={handleDonate} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-700">Donate Anonymously</button>
               <p className="text-[10px] text-slate-400 mt-4">Secure • Private • Transparent</p>
            </div>
          )}

        </div>
      </main>
      
      <footer className="text-center py-12 bg-white border-t border-slate-100 mt-10 relative z-10">
        <div className="flex justify-center gap-6 mb-8"><Link href="/admin"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 cursor-pointer">{t.adminLogin}</span></Link><span className="text-slate-200">|</span><Link href="/tasks"><span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest hover:text-yellow-700 cursor-pointer">🕵️ Guardian Partner Login</span></Link></div>
        <div className="mb-4"><p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Official TN Police App</p><div className="flex flex-wrap justify-center gap-4"><a href="https://play.google.com/store/apps/details?id=com.amtexsystems.kaavaluthavi" target="_blank" className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-lg transition border border-slate-100"><span className="text-xs font-bold">Google Play</span></a><a href="https://apps.apple.com/in/app/kaaval-uthavi/id1388361252" target="_blank" className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-lg transition border border-slate-100"><span className="text-xs font-bold">App Store</span></a></div></div>
      </footer>
    </div>
  );
}