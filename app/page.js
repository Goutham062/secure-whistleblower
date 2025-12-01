"use client"
import { useState, useEffect } from 'react';
import { db } from '../firebase'; // FIXED PATH
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'; 
import Link from 'next/link'; 
import dynamic from 'next/dynamic';

// --- DYNAMIC MAP ---
const MapPicker = dynamic(() => import('./components/MapPicker'), { 
  ssr: false, 
  loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400">Loading Maps...</div>
});

// --- TRANSLATIONS ---
const translations = {
  en: {
    heroTitle: "Speak Up. Stay Safe.", heroSub: "Secure, anonymous reporting for a safer Chennai.",
    tabReport: "Report Incident", tabTrack: "Track Status", tabRide: "Ride Guard", tabSafe: "Safe Zones", tabFund: "Support Us",
    submitBtn: "Submit Secure Report", adminLogin: "Official Login",
    descLabel: "Description", descPlace: "Describe what happened...",
    agentLabel: "Request Guardian Verification?", agentSub: "A verified partner will visit the spot to check.", bountyLabel: "Offer Bounty (₹)"
  },
  ta: {
    heroTitle: "துணிந்து பேசுங்கள்.", heroSub: "பாதுகாப்பான சென்னைக்காக அனாமதேய புகார் சேவை.",
    tabReport: "புகார் செய்", tabTrack: "புகார் நிலை", tabRide: "பயண பாதுகாப்பு", tabSafe: "பாதுகாப்பு மண்டலம்", tabFund: "நன்கொடை",
    submitBtn: "புகாரை அனுப்பு", adminLogin: "அதிகாரி உள்நுழைவு",
    descLabel: "விவரம்", descPlace: "என்ன நடந்தது...",
    agentLabel: "கள ஆய்வாளர் வேண்டுமா?", agentSub: "சரிபார்க்க ஒரு நபர் அனுப்பப்படுவார்.", bountyLabel: "வெகுமதி (₹)"
  }
};

const CHENNAI_AREAS = [ "Adyar", "Anna Nagar", "Avadi", "Ambattur", "Besant Nagar", "Chromepet", "Egmore", "Guindy", "K.K. Nagar", "Kodambakkam", "Koyambedu", "Madipakkam", "Mylapore", "Nungambakkam", "Perambur", "Porur", "T. Nagar", "Tambaram", "Thiruvanmiyur", "Velachery", "Vadodara" ];
const MONTHLY_LIMIT = 500000; 

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
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
  
  // Features
  const [requestGuardian, setRequestGuardian] = useState(false);
  const [bounty, setBounty] = useState('');
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');
  
  // Ride Guard
  const [rideDetails, setRideDetails] = useState({ vehicle: '', time: 10 }); 
  const [rideStatus, setRideStatus] = useState('idle'); 
  const [timer, setTimer] = useState(0);
  
  // Data
  const [areaSafety, setAreaSafety] = useState([]);
  const [loadingSafe, setLoadingSafe] = useState(false);
  const [currentFunds, setCurrentFunds] = useState(0);
  const [donateAmount, setDonateAmount] = useState('');

  useEffect(() => { const timer = setTimeout(() => setShowSplash(false), 2500); return () => clearTimeout(timer); }, []);

  // --- SUBMIT REPORT ---
  const handleReportSubmit = async (e) => {
    e.preventDefault(); setLoadingReport(true);
    const id = "WB-" + Math.random().toString(36).substr(2, 5).toUpperCase();
    try {
      await addDoc(collection(db, "reports"), {
        trackingId: id, description: desc, category, area, timestamp: new Date(), location, 
        status: "Unverified", language: lang, 
        requiresAgent: requestGuardian, 
        bountyAmount: requestGuardian ? (bounty || "0") : "0", 
        agentStatus: requestGuardian ? "Open" : "NA"
      });
      setSubmittedId(id); setLoadingReport(false); setDesc(''); setLocation(null); setBounty(''); setRequestGuardian(false);
    } catch (error) { alert('Error'); setLoadingReport(false); }
  };

  // --- TRACK REPORT ---
  const handleTrackSearch = async (e) => {
    e.preventDefault(); setTrackError(''); setTrackResult(null);
    try {
      const q = query(collection(db, "reports"), where("trackingId", "==", trackInput.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (!snap.empty) setTrackResult(snap.docs[0].data()); else setTrackError("ID Not Found");
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
  const formatTime = (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  // --- SAFE ZONES ---
  const fetchSafetyData = async () => {
    setLoadingSafe(true);
    try {
      const q = query(collection(db, "reports")); const snap = await getDocs(q);
      const counts = {}; snap.docs.forEach(d => { const a = d.data().area || "Unknown"; counts[a] = (counts[a] || 0) + 1; });
      const data = CHENNAI_AREAS.map(name => ({ name, count: counts[name] || 0, status: (counts[name]||0)>=3 ? 'High Risk' : (counts[name]||0)>=1 ? 'Caution' : 'Safe', color: (counts[name]||0)>=3 ? 'bg-red-100 border-red-200' : (counts[name]||0)>=1 ? 'bg-yellow-100 border-yellow-200' : 'bg-green-100 border-green-200' }));
      setAreaSafety(data.sort((a, b) => b.count - a.count));
    } catch (e) { console.error(e); }
    setLoadingSafe(false);
  };
  useEffect(() => { if (activeTab === 'safe') fetchSafetyData(); }, [activeTab]);

  // --- FUNDING ---
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
    alert(`Thank you! ₹${donateAmount} received.`); setDonateAmount(''); fetchFunds();
  };
  useEffect(() => { if (activeTab === 'fund') fetchFunds(); }, [activeTab]);

  // --- UI RENDER ---
  if (showSplash) return <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999] animate-fade-out"><div className="text-center animate-pulse"><h1 className="text-6xl font-extrabold text-red-600 tracking-tighter scale-150 transition-transform duration-[2000ms]">S<span className="text-white">W</span></h1><p className="text-slate-400 mt-4 text-sm tracking-widest uppercase">Secure Whistleblower</p></div></div>;

  if (submittedId) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md text-center"><div className="text-6xl mb-4">✅</div><h1 className="text-3xl font-bold text-slate-800">Report Logged</h1><div className="bg-slate-100 p-6 rounded-2xl mt-6 mb-6"><p className="text-slate-500 text-sm uppercase font-bold tracking-wider">Tracking ID</p><p className="text-4xl font-mono font-bold text-blue-600 mt-2">{submittedId}</p></div><button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] transition">Done</button></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <a href="tel:100" className="fixed bottom-6 right-6 bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-4 border-red-200 animate-pulse z-[100] hover:scale-110 transition cursor-pointer" title="Call Police"><span className="font-bold text-xs text-center leading-none">SOS<br/>100</span></a>

      <header className="bg-white shadow-sm sticky top-0 z-50 p-4">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <span className="font-extrabold text-2xl text-blue-700 tracking-tight">Secure<span className="text-slate-900">Whistle</span></span>
          <div className="flex gap-2"><button onClick={() => setLang('en')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${lang === 'en' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>ENG</button><button onClick={() => setLang('ta')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${lang === 'ta' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>தமிழ்</button></div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="text-center mb-10"><h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">{t.heroTitle}</h1><p className="text-base text-slate-500">{t.heroSub}</p></div>

        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {['report', 'track', 'ride', 'safe', 'fund'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-shrink-0 px-6 py-3 text-sm font-bold rounded-full transition-all border ${activeTab === tab ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{t[`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`]}</button>
              ))}
            </div>
          </div>

          <div className="p-6 md:p-8">
            {/* 1. REPORT */}
            {activeTab === 'report' && (
              <form onSubmit={handleReportSubmit} className="space-y-6">
                <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Category</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-700 text-base appearance-none border border-slate-200 outline-none"><optgroup label="🚨 Urgent"><option>Harassment</option><option>Chain Snatching</option><option>Theft</option><option>Suspicious Activity</option><option>Cyber Fraud</option></optgroup><optgroup label="🚧 Civic"><option>Street Light Issue</option><option>Public Nuisance</option><option>Rash Driving</option></optgroup></select></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Location</label><select value={area} onChange={(e) => setArea(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-700 text-base appearance-none border border-slate-200 outline-none">{CHENNAI_AREAS.map(a => <option key={a} value={a}>{a}</option>)}<option>Not in Chennai</option></select></div>
                <div><div className="flex justify-between items-end mb-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.descLabel}</label><button type="button" onClick={() => alert("Voice Recording Started...")} className="text-xs flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 font-bold">🎙️ Record</button></div><textarea placeholder={t.descPlace} value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl text-base h-32 border border-slate-200 outline-none resize-none" required /></div>
                <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-200"><div className="flex items-center gap-4"><input type="checkbox" id="guard" checked={requestGuardian} onChange={(e) => setRequestGuardian(e.target.checked)} className="w-6 h-6 text-blue-600 rounded-md" /><label htmlFor="guard" className="text-base font-bold text-slate-800 cursor-pointer">{t.agentLabel}</label></div>{requestGuardian && (<div className="mt-4 pl-10 animate-in fade-in slide-in-from-top-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">{t.bountyLabel}</label><input type="number" placeholder="e.g. 100" value={bounty} onChange={(e) => setBounty(e.target.value)} className="w-full bg-white p-3 border border-slate-300 rounded-xl font-bold text-lg" /><p className="text-xs text-green-700 mt-2 font-medium">✨ Funds released only after proof.</p></div>)}</div>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition cursor-pointer" onClick={() => alert("Opening Gallery...")}><div className="text-2xl mb-2">📸</div><p className="text-sm font-bold text-blue-600">Attach Evidence</p></div>
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner"><MapPicker location={location} setLocation={setLocation} /></div>
                <button type="submit" disabled={loadingReport} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50">{loadingReport ? "Encrypting Data..." : t.submitBtn}</button>
              </form>
            )}

            {/* 2. TRACK */}
            {activeTab === 'track' && <div className="text-center py-10"><input type="text" placeholder="WB-XXXX" value={trackInput} onChange={(e) => setTrackInput(e.target.value.toUpperCase())} className="w-full bg-slate-100 text-center text-3xl font-mono p-5 rounded-2xl uppercase mb-6 tracking-widest border border-slate-200 outline-none" /><button onClick={handleTrackSearch} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg">Check Status</button>{trackResult && (<div className="mt-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-lg text-left"><div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</span><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${trackResult.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{trackResult.status}</span></div><p className="text-slate-600 italic">"{trackResult.adminNote || "Pending Review..."}"</p></div>)}</div>}

            {/* 3. RIDE GUARD */}
            {activeTab === 'ride' && <div className="py-4">{rideStatus === 'idle' ? (<div className="space-y-6"><div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-200 text-center"><div className="text-4xl mb-3">🚕</div><h3 className="text-xl font-bold text-yellow-900">Dead Man's Switch</h3></div><div className="space-y-4"><input type="text" placeholder="Vehicle No" value={rideDetails.vehicle} onChange={e=>setRideDetails({...rideDetails, vehicle:e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-lg border border-slate-200"/><input type="number" placeholder="Minutes" value={rideDetails.time} onChange={e=>setRideDetails({...rideDetails, time:e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-lg border border-slate-200"/></div><button onClick={startRide} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg shadow-xl">Start Protection</button></div>) : (<div className="text-center py-12"><div className="text-7xl font-mono font-bold text-slate-800 mb-8 animate-pulse">{formatTime(timer)}</div>{rideStatus === 'danger' ? <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-500 animate-bounce"><h3 className="text-2xl font-bold text-red-600">ALARM TRIGGERED</h3></div> : <button onClick={endRideSafe} className="w-full bg-green-500 text-white py-5 rounded-2xl font-bold text-xl shadow-lg">I Arrived Safely</button>}</div>)}</div>}

            {/* 4. SAFE ZONES */}
            {activeTab === 'safe' && <div className="py-2"><div className="text-center mb-8"><h2 className="text-2xl font-bold text-slate-800">Chennai Safety Heatmap</h2></div>{loadingSafe ? <p className="text-center text-slate-400">Loading...</p> : (<div className="space-y-3 h-[500px] overflow-y-auto pr-2 custom-scrollbar">{areaSafety.map((item) => (<div key={item.name} className={`flex justify-between items-center p-5 rounded-2xl border transition-all hover:scale-[1.01] ${item.color}`}><div className="flex items-center gap-4"><div className={`w-4 h-4 rounded-full shadow-sm ${item.status === 'Safe' ? 'bg-green-500' : item.status.includes('Caution') ? 'bg-yellow-500' : 'bg-red-600 animate-pulse'}`}></div><span className="font-bold text-base text-slate-800">{item.name}</span></div><div className="text-right"><span className="block text-[10px] font-extrabold uppercase tracking-widest opacity-60">{item.status}</span><span className="text-sm font-bold">{item.count} Reports</span></div></div>))}</div>)}</div>}

            {/* 5. FUNDING */}
            {activeTab === 'fund' && <div className="text-center py-6"><div className="text-6xl mb-6">🤝</div><h2 className="text-2xl font-bold text-slate-800 mb-3">Support the Mission</h2><p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">We accept anonymous public donations to fund our Guardian operations. Max limit ₹5 Lakhs/month.</p><div className="bg-slate-100 p-6 rounded-3xl mb-8"><div className="flex justify-between text-xs font-bold text-slate-500 mb-2"><span>₹{currentFunds.toLocaleString()} Raised</span><span>Goal: ₹{MONTHLY_LIMIT.toLocaleString()}</span></div><div className="w-full bg-slate-300 rounded-full h-3 overflow-hidden"><div className="bg-green-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${(currentFunds / MONTHLY_LIMIT) * 100}%` }}></div></div></div><input type="number" placeholder="Enter Amount (₹)" value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} className="w-full bg-slate-50 text-center text-3xl font-bold p-6 rounded-2xl mb-4 border border-slate-200 outline-none focus:ring-2 focus:ring-green-500 text-green-700" /><button onClick={handleDonate} className="w-full bg-green-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] transition">Donate Anonymously</button></div>}

          </div>
        </div>
      </main>
      
      {/* FOOTER */}
      <footer className="text-center py-12 bg-white border-t border-slate-100 mt-10 relative z-10">
        <div className="flex justify-center gap-8 mb-8 items-center"><Link href="/admin"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 cursor-pointer">{t.adminLogin}</span></Link><span className="text-slate-200">|</span><Link href="/tasks"><span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest hover:text-yellow-700 cursor-pointer bg-yellow-50 px-3 py-1 rounded-full">🕵️ Guardian Partner</span></Link></div>
        <div className="mb-4"><p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Official TN Police App</p><div className="flex flex-wrap justify-center gap-4"><a href="https://play.google.com/store/apps/details?id=com.amtexsystems.kaavaluthavi" target="_blank" className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-5 py-2 rounded-xl transition border border-slate-100 flex items-center gap-2"><span className="text-xl">🤖</span><span className="text-xs font-bold">Google Play</span></a><a href="https://apps.apple.com/in/app/kaaval-uthavi/id1388361252" target="_blank" className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-5 py-2 rounded-xl transition border border-slate-100 flex items-center gap-2"><span className="text-xl">🍎</span><span className="text-xs font-bold">App Store</span></a></div></div>
      </footer>
    </div>
  );
}