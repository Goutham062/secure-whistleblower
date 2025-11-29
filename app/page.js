"use client"
import { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'; 
import Link from 'next/link'; 
import dynamic from 'next/dynamic';

// --- 1. DYNAMIC MAP COMPONENT ---
const MapPicker = dynamic(() => import('./components/MapPicker'), { 
  ssr: false, 
  loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">Loading Maps...</div>
});

// --- 2. TRANSLATIONS (English & Tamil) ---
const translations = {
  en: {
    heroTitle: "Speak Up. Stay Safe.",
    heroSub: "Secure, anonymous reporting & automated safety checks for Chennai.",
    tabReport: "Report",
    tabTrack: "Status",
    tabRide: "Ride Guard",
    tabSafe: "Safe Zones",
    submitBtn: "Submit Secure Report",
    adminLogin: "Official Login",
    descLabel: "Description",
    descPlace: "Describe what happened..."
  },
  ta: {
    heroTitle: "துணிந்து பேசுங்கள்.",
    heroSub: "பாதுகாப்பான சென்னைக்காக அனாமதேய புகார் மற்றும் பயண பாதுகாப்பு சேவை.",
    tabReport: "புகார்",
    tabTrack: "நிலை",
    tabRide: "பயண பாதுகாப்பு",
    tabSafe: "பாதுகாப்பு மண்டலம்",
    submitBtn: "பாதுகாப்பாக அனுப்பு",
    adminLogin: "அதிகாரி உள்நுழைவு",
    descLabel: "விவரம்",
    descPlace: "என்ன நடந்தது..."
  }
};

// --- 3. FULL CHENNAI AREA LIST ---
const CHENNAI_AREAS = [
  "Adyar", "Alandur", "Ambattur", "Anna Nagar", "Ashok Nagar", "Avadi", "Ayanavaram", 
  "Besant Nagar", "Chetpet", "Chromepet", "Egmore", "Guindy", "K.K. Nagar", 
  "Kilpauk", "Kodambakkam", "Kolathur", "Korattur", "Kotturpuram", "Koyambedu", 
  "Madhavaram", "Madipakkam", "Medavakkam", "Mogappair", "Mylapore", "Nandanam", 
  "Nungambakkam", "Pallavaram", "Perambur", "Perungudi", "Poonamallee", "Porur", 
  "Purasawalkam", "Red Hills", "Royapettah", "Royapuram", "Saidapet", "Sholinganallur", 
  "T. Nagar", "Tambaram", "Teynampet", "Thiruvanmiyur", "Tondiarpet", "Triplicane", 
  "Vadapalani", "Valasaravakkam", "Velachery", "Villivakkam", "Virugambakkam", 
  "Washermanpet", "West Mambalam"
];

export default function Home() {
  const [lang, setLang] = useState('en'); 
  const t = translations[lang]; 
  const [activeTab, setActiveTab] = useState('report'); 

  // --- STATE VARIABLES ---
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Cyber Fraud');
  const [area, setArea] = useState('Anna Nagar'); 
  const [location, setLocation] = useState(null); 
  const [loadingReport, setLoadingReport] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  const [rideDetails, setRideDetails] = useState({ vehicle: '', time: 10 }); 
  const [rideStatus, setRideStatus] = useState('idle'); 
  const [timer, setTimer] = useState(0);

  const [areaSafety, setAreaSafety] = useState([]);
  const [loadingSafe, setLoadingSafe] = useState(false);

  // --- LOGIC: REPORT SUBMISSION ---
  const generateID = () => "WB-" + Math.random().toString(36).substr(2, 5).toUpperCase();
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setLoadingReport(true);
    const newTrackingId = generateID();
    try {
      await addDoc(collection(db, "reports"), {
        trackingId: newTrackingId,
        description: desc,
        category: category,
        area: area, 
        timestamp: new Date(),
        location: location, 
        status: "Unverified",
        language: lang 
      });
      setSubmittedId(newTrackingId);
      setLoadingReport(false);
      setDesc(''); setLocation(null);
    } catch (error) {
      alert('Error'); setLoadingReport(false);
    }
  };

  // --- LOGIC: TRACKING ---
  const handleTrackSearch = async (e) => {
    e.preventDefault();
    setTrackError(''); setTrackResult(null);
    try {
      const q = query(collection(db, "reports"), where("trackingId", "==", trackInput.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) setTrackResult(querySnapshot.docs[0].data());
      else setTrackError("ID Not Found");
    } catch (err) { setTrackError("Error"); }
  };

  // --- LOGIC: RIDE GUARD (DEAD MAN SWITCH) ---
  const startRide = () => { setRideStatus('active'); setTimer(rideDetails.time * 60); };
  const endRideSafe = () => { setRideStatus('safe'); };
  
  useEffect(() => {
    let interval = null;
    if (rideStatus === 'active' && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (rideStatus === 'active' && timer === 0) {
      setRideStatus('danger'); clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [rideStatus, timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- LOGIC: SAFE ZONES HEATMAP ---
  const fetchSafetyData = async () => {
    setLoadingSafe(true);
    try {
      const q = query(collection(db, "reports"));
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => doc.data());

      const counts = {};
      reports.forEach(r => {
        const a = r.area || "Unknown";
        if (!counts[a]) counts[a] = 0;
        counts[a]++;
      });

      const safetyData = CHENNAI_AREAS.map(areaName => {
        const count = counts[areaName] || 0;
        let status = 'Safe';
        let color = 'bg-green-100 text-green-800 border-green-200';
        if (count >= 3) { status = 'High Risk'; color = 'bg-red-100 text-red-800 border-red-200'; } 
        else if (count >= 1) { status = 'Caution'; color = 'bg-yellow-100 text-yellow-800 border-yellow-200'; }
        return { name: areaName, count, status, color };
      });
      
      safetyData.sort((a, b) => b.count - a.count);
      setAreaSafety(safetyData);
    } catch (e) { console.error(e); }
    setLoadingSafe(false);
  };

  useEffect(() => {
    if (activeTab === 'safe') fetchSafetyData();
  }, [activeTab]);


  // --- VIEW: SUCCESS SCREEN ---
  if (submittedId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Report Logged</h1>
          <div className="bg-slate-100 p-4 rounded-xl mb-6">
            <p className="text-3xl font-mono font-bold text-blue-600">{submittedId}</p>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Done</button>
        </div>
      </div>
    );
  }

  // --- VIEW: MAIN INTERFACE ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* FEATURE: SOS FLOATING BUTTON (FIXED Z-INDEX) */}
      <a 
        href="tel:100" 
        className="fixed bottom-6 right-6 bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-red-200 animate-pulse z-[100] hover:scale-110 transition cursor-pointer"
        title="Call Police"
      >
        <span className="font-bold text-xs text-center leading-none">SOS<br/>100</span>
      </a>

      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-50 p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <span className="font-bold text-xl text-blue-700">SecureWhistle</span>
          <div className="flex gap-2">
            <button onClick={() => setLang('en')} className={`text-xs font-bold px-2 py-1 rounded ${lang === 'en' ? 'bg-blue-100' : ''}`}>ENG</button>
            <button onClick={() => setLang('ta')} className={`text-xs font-bold px-2 py-1 rounded ${lang === 'ta' ? 'bg-blue-100' : ''}`}>தமிழ்</button>
            <Link href="/dashboard"><button className="bg-slate-800 text-white text-xs px-3 py-1 rounded font-bold">Dashboard</button></Link>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{t.heroTitle}</h1>
          <p className="text-sm text-slate-500">{t.heroSub}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          {/* TABS */}
          <div className="flex bg-slate-50 p-1 m-2 rounded-2xl overflow-x-auto">
            {['report', 'track', 'ride', 'safe'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[80px] py-3 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                {tab === 'report' ? t.tabReport : tab === 'track' ? t.tabTrack : tab === 'ride' ? t.tabRide : t.tabSafe}
              </button>
            ))}
          </div>

          {/* TAB 1: REPORT FORM */}
          {activeTab === 'report' && (
            <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm mt-1">
                  <optgroup label="Crimes">
                    <option>Cyber Fraud</option><option>Harassment</option><option>Theft</option><option>Chain Snatching</option>
                  </optgroup>
                  <optgroup label="Public Safety">
                    <option>Street Light Issue</option><option>Public Nuisance</option><option>Rash Driving</option><option>Suspicious Activity</option>
                  </optgroup>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Area / Neighborhood</label>
                <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm mt-1">
                   {CHENNAI_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                   <option>Not in Chennai</option>
                </select>
              </div>

              {/* FEATURE: VOICE UI */}
              <div>
                 <div className="flex justify-between items-end mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.descLabel}</label>
                    <button type="button" onClick={() => alert("Voice recording will be enabled in the next update!")} className="text-[10px] flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100 transition">
                      🎙️ Record / ஆடியோ
                    </button>
                 </div>
                 <textarea placeholder={t.descPlace} value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl text-sm h-24" required />
              </div>

              {/* FEATURE: EVIDENCE UPLOAD UI */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition cursor-pointer" onClick={() => alert("File upload will be enabled in the next update!")}>
                 <p className="text-xs text-blue-500 font-bold">📸 Attach Photo / Video Evidence</p>
              </div>

              <div className="rounded-xl overflow-hidden border"><MapPicker location={location} setLocation={setLocation} /></div>
              <button type="submit" disabled={loadingReport} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50">
                {loadingReport ? "Sending..." : t.submitBtn}
              </button>
            </form>
          )}

          {/* TAB 2: TRACK FORM */}
          {activeTab === 'track' && (
            <div className="p-8 text-center">
              <input type="text" placeholder="WB-XXXX" value={trackInput} onChange={(e) => setTrackInput(e.target.value.toUpperCase())} className="w-full bg-slate-50 text-center text-xl font-mono p-4 rounded-xl uppercase mb-4" />
              <button onClick={handleTrackSearch} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">Check Status</button>
              {trackResult && (
                <div className="mt-6 bg-green-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs font-bold text-green-800 uppercase">Status: {trackResult.status}</p>
                  <p className="text-sm text-slate-600 mt-1">"{trackResult.adminNote || "No updates"}"</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RIDE GUARD FORM */}
          {activeTab === 'ride' && (
            <div className="p-6">
              {rideStatus === 'idle' && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center">
                    <p className="text-2xl mb-1">🚕</p>
                    <h3 className="font-bold text-yellow-800">Dead Man's Switch</h3>
                    <p className="text-xs text-yellow-700 mt-1">Auto-alert if you don't check in safely.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Vehicle</label>
                    <input type="text" placeholder="TN-05-AB-1234" value={rideDetails.vehicle} onChange={(e) => setRideDetails({...rideDetails, vehicle: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Time (Mins)</label>
                    <input type="number" value={rideDetails.time} onChange={(e) => setRideDetails({...rideDetails, time: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm mt-1" />
                  </div>
                  <button onClick={startRide} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg">Start Protection</button>
                </div>
              )}
              {rideStatus === 'active' && (
                <div className="text-center py-8">
                  <div className="animate-pulse mb-6"><span className="text-6xl font-mono font-bold text-slate-800">{formatTime(timer)}</span></div>
                  <button onClick={endRideSafe} className="w-full bg-green-500 text-white py-4 rounded-xl font-bold shadow-lg text-lg animate-bounce">I Have Arrived Safely</button>
                </div>
              )}
              {rideStatus === 'safe' && (
                <div className="text-center py-10">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-green-600">Glad you are safe!</h3>
                  <button onClick={() => setRideStatus('idle')} className="mt-6 text-sm text-slate-500 underline">Start New Ride</button>
                </div>
              )}
              {rideStatus === 'danger' && (
                <div className="text-center py-10 bg-red-50 rounded-xl border-2 border-red-500">
                  <div className="text-5xl mb-4 animate-ping">🚨</div>
                  <h3 className="text-xl font-bold text-red-600">TIMER EXPIRED</h3>
                  <p className="text-sm text-red-800 mt-2">Simulating Alert...</p>
                  <button onClick={() => setRideStatus('idle')} className="mt-6 bg-white border border-red-200 px-4 py-2 rounded text-red-600 font-bold">Reset</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAFE ZONES */}
          {activeTab === 'safe' && (
            <div className="p-6">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Safety Heatmap</h2>
                    <p className="text-xs text-slate-500">Analyzing 50+ Areas in Chennai</p>
                </div>
                
                {loadingSafe ? <p className="text-center text-slate-400">Analyzing Data...</p> : (
                    <div className="space-y-3 h-96 overflow-y-auto pr-2">
                        {areaSafety.map((item) => (
                            <div key={item.name} className={`flex justify-between items-center p-4 rounded-xl border ${item.color}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${item.status === 'Safe' ? 'bg-green-500' : item.status === 'Caution' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                    <span className="font-bold text-sm">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs font-extrabold uppercase tracking-wider">{item.status}</span>
                                    <span className="text-[10px] opacity-70">{item.count} Reports</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}

        </div>
      </main>
      
      {/* FEATURE: KAVALAN SOS FOOTER (FIXED Z-INDEX) */}
      <footer className="text-center py-12 bg-white border-t border-slate-100 mt-10 relative z-10">
        <div className="mb-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            For Immediate Police Emergency
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            
            {/* Android Link - Kaaval Uthavi */}
            <a 
              href="https://play.google.com/store/apps/details?id=com.amtexsystems.kaavaluthavi" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-3 rounded-xl transition shadow-sm cursor-pointer"
            >
              <span className="text-xl">🤖</span>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase leading-none text-slate-500">Get it on</p>
                <p className="text-sm font-bold leading-none">Google Play</p>
              </div>
            </a>
            
            {/* iOS Link - Kaaval Uthavi */}
            <a 
              href="https://apps.apple.com/in/app/kaaval-uthavi/id1388361252" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-3 rounded-xl transition shadow-sm cursor-pointer"
            >
              <span className="text-xl">🍎</span>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase leading-none text-slate-500">Download on the</p>
                <p className="text-sm font-bold leading-none">App Store</p>
              </div>
            </a>

          </div>
          <p className="text-[10px] text-slate-400 mt-2">Official App: Kaaval Uthavi (TN Police)</p>
        </div>

        <Link href="/admin">
           <button className="text-[10px] font-bold text-slate-300 hover:text-slate-500 uppercase tracking-widest transition cursor-pointer">{t.adminLogin}</button>
        </Link>
      </footer>
    </div>
  );
}
