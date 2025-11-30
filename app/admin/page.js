"use client"
import { useState } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(''); // 'police' or 'admin'
  const [password, setPassword] = useState('');
  
  // Tabs: 'reports', 'bounties', 'applications', 'finances'
  const [tab, setTab] = useState('reports'); 
  
  const [reports, setReports] = useState([]);
  const [applications, setApplications] = useState([]);
  const [donations, setDonations] = useState([]);
  const [totalFunds, setTotalFunds] = useState(0);
  const [loading, setLoading] = useState(false);

  // --- 1. FETCH ALL DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Reports
      const q1 = query(collection(db, "reports"), orderBy("timestamp", "desc"));
      const snap1 = await getDocs(q1);
      setReports(snap1.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Guardian Applications
      const q2 = query(collection(db, "guardian_applications"), orderBy("timestamp", "desc"));
      const snap2 = await getDocs(q2);
      setApplications(snap2.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Donations (Finances)
      const q3 = query(collection(db, "donations"), orderBy("timestamp", "desc"));
      const snap3 = await getDocs(q3);
      const donationList = snap3.docs.map(doc => doc.data());
      setDonations(donationList);
      setTotalFunds(donationList.reduce((acc, curr) => acc + curr.amount, 0));

    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // --- 2. REPORT ACTIONS (Police & Admin) ---
  const handleUpdateStatus = async (id, newStatus) => {
    await updateDoc(doc(db, "reports", id), { status: newStatus });
    alert(`Status updated: ${newStatus}`);
    fetchData();
  };

  const handleAddNote = async (id, currentNote) => {
    const note = prompt("Enter Note:", currentNote || "");
    if (note) { 
        await updateDoc(doc(db, "reports", id), { adminNote: note }); 
        fetchData(); 
    }
  };

  // --- 3. GUARDIAN ACTIONS (Admin Only) ---
  const handleApproveGuardian = async (app) => {
    const badgeId = "G-" + Math.floor(1000 + Math.random() * 9000); 
    
    // Add to authorized list
    await addDoc(collection(db, "guardians"), {
        name: app.name,
        badgeId: badgeId,
        skills: app.skills,
        joined: new Date(),
        wallet: 0
    });

    // Update application status
    await updateDoc(doc(db, "guardian_applications", app.id), { status: "Approved", badgeId: badgeId });
    
    alert(`Guardian Approved!\nBADGE ID: ${badgeId}`);
    fetchData();
  };

  // --- 4. PAYOUT LOGIC (Admin Only) ---
  const handleReleasePayment = async (report) => {
    if(!confirm(`Release ₹${report.bountyAmount} to Guardian?`)) return;
    
    // Mark as Resolved & Paid
    await updateDoc(doc(db, "reports", report.id), { 
        status: "Resolved", 
        adminNote: `Verified by Guardian. Payment of ₹${report.bountyAmount} released.` 
    });

    alert("💰 Payment Released! Transferred to Guardian's Wallet.");
    fetchData();
  };

  // --- 5. MAGIC TOOLS (Admin Only) ---
  const handleClearDatabase = async () => {
    if(!confirm("⚠️ DELETE ALL DATA? This cannot be undone.")) return;
    setLoading(true);
    const q = query(collection(db, "reports"));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "reports", d.id)));
    await Promise.all(deletePromises);
    alert("Database Cleared!");
    fetchData();
  };

  const handleSeedData = async () => {
    if(!confirm("Inject 20 Fake Reports for Demo?")) return;
    setLoading(true);
    
    const demoData = [
      { cat: "Harassment", area: "Anna Nagar", desc: "Verbal abuse near park." },
      { cat: "Chain Snatching", area: "Anna Nagar", desc: "Bike thieves snatched chain." },
      { cat: "Harassment", area: "Anna Nagar", desc: "Stalking reported." }, 
      { cat: "Cyber Fraud", area: "Adyar", desc: "Bank OTP scam." },
      { cat: "Street Light Issue", area: "Adyar", desc: "Dark street." },
      { cat: "Theft", area: "T. Nagar", desc: "Shop theft." },
      { cat: "Rash Driving", area: "Avadi", desc: "Bike racing." },
      { cat: "Suspicious Activity", area: "Velachery", desc: "Unknown van parked." },
      { cat: "Rash Driving", area: "Guindy", desc: "Wrong side driving." },
      { cat: "Harassment", area: "Tambaram", desc: "Eve teasing." }
    ];

    const promises = [];
    for(let i=0; i<20; i++) {
        const item = demoData[i % demoData.length];
        promises.push(addDoc(collection(db, "reports"), {
            trackingId: "DEMO-" + Math.floor(Math.random() * 10000),
            category: item.cat,
            area: item.area,
            description: item.desc,
            status: "Unverified",
            timestamp: new Date(),
            language: "en",
            location: null,
            requiresAgent: false,
            bountyAmount: "0"
        }));
    }

    await Promise.all(promises);
    alert("✅ 20 Demo Reports Added!");
    fetchData();
  };

  // --- LOGIN LOGIC ---
  const handleLogin = (e) => { 
      e.preventDefault(); 
      if (password === "police123") { 
          setIsLoggedIn(true); 
          setRole('police'); 
          fetchData(); 
      } else if (password === "admin999") { 
          setIsLoggedIn(true); 
          setRole('admin'); 
          fetchData(); 
      } else {
          alert("Wrong Password"); 
      }
  };

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">Secure Access</h1>
          <div className="space-y-4">
              <input 
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                className="w-full border border-slate-300 p-3 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Enter Access Code"
              />
              <button className="w-full bg-blue-900 text-white p-3 rounded-lg font-bold hover:bg-blue-800 transition">
                Login
              </button>
          </div>
          <div className="mt-6 text-xs text-slate-400 text-center">
              <p>Police Code: police123</p>
              <p>Admin Code: admin999</p>
          </div>
        </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-extrabold text-blue-900">
                {role === 'admin' ? "🛡️ NGO Command Center" : "👮‍♂️ Police Dispatch"}
            </h1>
            <p className="text-slate-500 text-sm">Logged in as: <span className="font-bold uppercase">{role}</span></p>
        </div>
        <button onClick={() => setIsLoggedIn(false)} className="text-red-600 font-bold hover:underline">Logout</button>
      </div>

      {/* MAGIC TOOLS (ADMIN ONLY) */}
      {role === 'admin' && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-wrap justify-between items-center gap-4">
            <div>
                <h3 className="font-bold text-slate-800">🛠️ Demo & Debug Tools</h3>
                <p className="text-xs text-slate-500">For hackathon demonstration purposes only.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleClearDatabase} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-100 transition">
                  🗑️ Wipe Database
              </button>
              <button onClick={handleSeedData} className="bg-purple-50 text-purple-600 border border-purple-200 px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-100 transition">
                  ✨ Inject 20 Fake Reports
              </button>
            </div>
          </div>
      )}

      {/* TABS */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        <button onClick={() => setTab('reports')} className={`px-6 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${tab === 'reports' ? 'bg-blue-900 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'}`}>
            Incidents
        </button>
        
        {/* HIDE THESE TABS FROM POLICE */}
        {role === 'admin' && (
            <>
                <button onClick={() => setTab('bounties')} className={`px-6 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${tab === 'bounties' ? 'bg-yellow-500 text-black shadow-lg' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'}`}>
                    💰 Active Bounties ({reports.filter(r => r.requiresAgent && r.status !== 'Resolved').length})
                </button>
                <button onClick={() => setTab('applications')} className={`px-6 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${tab === 'applications' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'}`}>
                    Applications <span className="bg-black/20 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{applications.filter(a => a.status === 'Pending').length}</span>
                </button>
                <button onClick={() => setTab('finances')} className={`px-6 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${tab === 'finances' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'}`}>
                    Finances
                </button>
            </>
        )}
      </div>

      {/* --- CONTENT AREA --- */}

      {/* 1. REPORTS TAB (POLICE & ADMIN) */}
      {tab === 'reports' && (
        <div className="grid gap-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-900 hover:shadow-md transition">
               <div className="flex justify-between items-start">
                   <div>
                       <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">ID: {r.trackingId}</span>
                       <h2 className="font-bold text-red-600 text-lg mt-1">{r.category} <span className="text-slate-400 font-normal text-base">in {r.area}</span></h2>
                   </div>
                   <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-bold uppercase tracking-wider">{r.status}</span>
               </div>
               
               <p className="text-slate-700 mt-3 text-sm leading-relaxed">{r.description}</p>
               
               {r.location && (
                   <a href={`https://www.google.com/maps?q=${r.location.lat},${r.location.lng}`} target="_blank" className="text-blue-600 font-bold underline text-xs mt-3 block flex items-center gap-1">
                       📍 View Exact GPS Location
                   </a>
               )}
               
               <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                 <button onClick={()=>handleUpdateStatus(r.id, "Verified")} className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-xs font-bold border border-green-100 hover:bg-green-100">✅ Verify</button>
                 <button onClick={()=>handleUpdateStatus(r.id, "False Alarm")} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-xs font-bold border border-red-100 hover:bg-red-100">❌ False Alarm</button>
                 <button onClick={()=>handleUpdateStatus(r.id, "Resolved")} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100">🏁 Resolved</button>
                 <button onClick={()=>handleAddNote(r.id, r.adminNote)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 ml-auto">📝 Add Official Note</button>
               </div>
               
               {r.adminNote && (
                   <div className="mt-3 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                       <p className="text-xs text-yellow-800 italic"><span className="font-bold not-italic">Officer Note:</span> {r.adminNote}</p>
                   </div>
               )}
            </div>
          ))}
          {reports.length === 0 && <p className="text-slate-400 text-center py-10">No incidents reported yet.</p>}
        </div>
      )}

      {/* 2. BOUNTIES TAB (ADMIN ONLY) */}
      {tab === 'bounties' && (
        <div className="grid gap-4">
          {reports.filter(r => r.requiresAgent).map((r) => (
            <div key={r.id} className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-yellow-500 relative">
               <div className="absolute top-6 right-6 text-right">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BOUNTY</p>
                   <p className="text-3xl font-bold text-green-600">₹{r.bountyAmount}</p>
               </div>
               
               <h2 className="font-bold text-lg">{r.category}</h2>
               <p className="text-sm text-slate-500 mb-4">Location: {r.area}</p>
               
               <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Guardian Status</p>
                   <p className="text-sm font-medium text-slate-800">{r.agentStatus || "Waiting for Guardian..."}</p>
                   {r.agentNote ? (
                       <div className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">
                           <strong>Proof Submitted:</strong> "{r.agentNote}"
                       </div>
                   ) : (
                       <p className="text-xs text-slate-400 italic mt-1">No proof submitted yet.</p>
                   )}
               </div>

               {/* PAY BUTTON */}
               {r.agentStatus?.includes("Assigned") && r.status !== "Resolved" && (
                   <button onClick={() => handleReleasePayment(r)} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg animate-pulse transition">
                       💸 Approve Proof & Release Payment
                   </button>
               )}
               
               {r.status === "Resolved" && (
                   <div className="bg-green-50 p-3 rounded-xl text-center border border-green-200">
                       <p className="text-green-700 font-bold flex items-center justify-center gap-2">✅ Payment Released & Issue Resolved</p>
                   </div>
               )}
            </div>
          ))}
          {reports.filter(r => r.requiresAgent).length === 0 && <p className="text-center text-slate-400 py-10">No active bounties.</p>}
        </div>
      )}

      {/* 3. APPLICATIONS TAB (ADMIN ONLY) */}
      {tab === 'applications' && (
        <div className="grid gap-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
               <div className="flex justify-between items-start">
                   <div>
                       <h2 className="font-bold text-xl text-slate-800">{app.name}</h2>
                       <p className="text-sm text-slate-500 font-medium">{app.background} • Fitness: {app.fitness}</p>
                   </div>
                   <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${app.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{app.status}</span>
               </div>
               
               <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Skills</p>
                   <p className="text-sm text-slate-700">{app.skills}</p>
               </div>
               
               <a href={app.proofLink} target="_blank" className="text-blue-600 text-xs mt-3 block font-bold hover:underline flex items-center gap-1">
                   📄 View Proof Documents
               </a>
               
               {app.status === 'Pending' && (
                   <button onClick={() => handleApproveGuardian(app)} className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg transition">
                       ✅ Approve & Generate Badge ID
                   </button>
               )}
               
               {app.badgeId && (
                   <div className="mt-6 text-center bg-green-50 p-4 border-2 border-green-100 rounded-xl border-dashed">
                       <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Badge ID Issued</p>
                       <p className="font-mono font-bold text-2xl text-green-800 tracking-widest mt-1">{app.badgeId}</p>
                   </div>
               )}
            </div>
          ))}
          {applications.length === 0 && <p className="text-slate-400 text-center py-10">No applications received yet.</p>}
        </div>
      )}

      {/* 4. FINANCES TAB (ADMIN ONLY) */}
      {tab === 'finances' && (
          <div>
              <div className="bg-slate-800 text-white p-8 rounded-3xl mb-8 shadow-xl">
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Total Public Funds Collected</p>
                  <div className="flex items-end gap-2 mt-2">
                      <p className="text-5xl font-mono text-green-400 font-bold">₹{totalFunds.toLocaleString()}</p>
                      <span className="text-sm text-slate-500 mb-2">/ ₹5,00,000 Goal</span>
                  </div>
                  <div className="w-full bg-slate-700 h-3 rounded-full mt-6 overflow-hidden">
                      <div className="bg-green-500 h-3 rounded-full transition-all duration-1000" style={{width: `${(totalFunds/500000)*100}%`}}></div>
                  </div>
                  <p className="text-right text-xs text-slate-400 mt-2">{Math.round((totalFunds/500000)*100)}% Funded</p>
              </div>
              
              <h3 className="font-bold text-slate-700 mb-4 text-lg">Recent Transactions</h3>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                  {donations.map((d, i) => (
                      <div key={i} className="flex justify-between p-5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                          <div>
                              <p className="font-bold text-slate-800">Anonymous Donation</p>
                              <p className="text-xs text-slate-400 font-mono mt-1">{d.timestamp ? new Date(d.timestamp.seconds*1000).toLocaleString() : 'Just now'}</p>
                          </div>
                          <p className="text-green-600 font-bold text-lg">+ ₹{d.amount}</p>
                      </div>
                  ))}
                  {donations.length === 0 && <p className="p-10 text-center text-slate-400">No donations received yet.</p>}
              </div>
          </div>
      )}

    </div>
  );
}