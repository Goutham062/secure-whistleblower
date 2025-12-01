"use client"
import { useState } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  
  // Tabs: 'reports', 'bounties', 'applications', 'finances'
  const [tab, setTab] = useState('reports'); 
  const [role, setRole] = useState(''); // 'police' or 'admin'
  
  const [reports, setReports] = useState([]);
  const [applications, setApplications] = useState([]);
  const [donations, setDonations] = useState([]);
  const [totalFunds, setTotalFunds] = useState(0);
  const [loading, setLoading] = useState(false);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Reports
      const q1 = query(collection(db, "reports"), orderBy("timestamp", "desc"));
      const snap1 = await getDocs(q1);
      setReports(snap1.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Applications
      const q2 = query(collection(db, "guardian_applications"), orderBy("timestamp", "desc"));
      const snap2 = await getDocs(q2);
      setApplications(snap2.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 3. Donations
      const q3 = query(collection(db, "donations"), orderBy("timestamp", "desc"));
      const snap3 = await getDocs(q3);
      const donationList = snap3.docs.map(doc => doc.data());
      setDonations(donationList);
      setTotalFunds(donationList.reduce((acc, curr) => acc + curr.amount, 0));
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // --- ACTIONS ---
  const handleUpdateStatus = async (id, newStatus) => { await updateDoc(doc(db, "reports", id), { status: newStatus }); alert(`Status: ${newStatus}`); fetchData(); };
  const handleAddNote = async (id, currentNote) => { const note = prompt("Enter Note:", currentNote || ""); if (note) { await updateDoc(doc(db, "reports", id), { adminNote: note }); fetchData(); } };
  
  // Guardian Logic
  const handleApproveGuardian = async (app) => { const badgeId = "G-" + Math.floor(1000 + Math.random() * 9000); await addDoc(collection(db, "guardians"), { name: app.name, badgeId, skills: app.skills, wallet: 0 }); await updateDoc(doc(db, "guardian_applications", app.id), { status: "Approved", badgeId }); alert(`Approved! ID: ${badgeId}`); fetchData(); };
  
  // Bounty Logic
  const handleReleasePayment = async (report) => { if(!confirm(`Release ₹${report.bountyAmount}?`)) return; await updateDoc(doc(db, "reports", report.id), { status: "Resolved", adminNote: `Paid ₹${report.bountyAmount}` }); alert("Paid!"); fetchData(); };
  
  // Magic Tools
  const handleClearDatabase = async () => { if(!confirm("Delete All?")) return; const q = query(collection(db, "reports")); const snap = await getDocs(q); snap.docs.forEach(d => deleteDoc(doc(db, "reports", d.id))); alert("Cleaned"); fetchData(); };
  const handleSeedData = async () => { if(!confirm("Inject Data?")) return; setLoading(true); const demoData = [{c:"Harassment",a:"Anna Nagar"},{c:"Theft",a:"Adyar"},{c:"Rash Driving",a:"T. Nagar"}]; const promises = []; for(let i=0; i<20; i++) { const d = demoData[i%3]; promises.push(addDoc(collection(db, "reports"), { trackingId: "DEMO-"+i, category: d.c, area: d.a, description: "Test report", status: "Unverified", timestamp: new Date(), requiresAgent: false, bountyAmount: "0" })); } await Promise.all(promises); alert("Done!"); fetchData(); };

  // Login
  const handleLogin = (e) => { e.preventDefault(); if (password === "police123") { setIsLoggedIn(true); setRole('police'); fetchData(); } else if (password === "admin999") { setIsLoggedIn(true); setRole('admin'); fetchData(); } else alert("Wrong Password"); };

  if (!isLoggedIn) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><form onSubmit={handleLogin} className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm"><h1 className="text-2xl font-bold mb-6 text-center text-slate-800">Secure Access</h1><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border border-slate-300 p-4 rounded-2xl text-lg outline-none focus:ring-2 focus:ring-blue-500 mb-4" placeholder="Access Code"/><button className="w-full bg-blue-900 text-white p-4 rounded-2xl font-bold hover:bg-blue-800 transition">Login</button><div className="mt-6 text-xs text-slate-400 text-center"><p>Police: police123</p><p>Admin: admin999</p></div></form></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      
      <div className="flex justify-between items-center mb-8">
        <div><h1 className="text-3xl font-extrabold text-blue-900">{role === 'admin' ? "🛡️ NGO Command" : "👮‍♂️ Police Dispatch"}</h1><p className="text-slate-500 text-sm font-medium">Logged in as: <span className="uppercase font-bold text-slate-700">{role}</span></p></div>
        <button onClick={() => setIsLoggedIn(false)} className="text-red-600 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition">Logout</button>
      </div>

      {/* MAGIC TOOLS (Only Admin) */}
      {role === 'admin' && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-wrap justify-between items-center gap-4">
            <div><h3 className="font-bold text-slate-800">🛠️ Demo Tools</h3><p className="text-xs text-slate-500">Hackathon Use Only</p></div>
            <div className="flex gap-3"><button onClick={handleClearDatabase} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-100 transition">🗑️ Wipe Data</button><button onClick={handleSeedData} className="bg-purple-50 text-purple-600 border border-purple-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-purple-100 transition">✨ Inject Fake Data</button></div>
          </div>
      )}

      {/* TABS */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        <button onClick={() => setTab('reports')} className={`px-6 py-3 rounded-xl font-bold transition whitespace-nowrap ${tab === 'reports' ? 'bg-blue-900 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'}`}>Incidents</button>
        {role === 'admin' && (
            <>
                <button onClick={() => setTab('bounties')} className={`px-6 py-3 rounded-xl font-bold transition whitespace-nowrap ${tab === 'bounties' ? 'bg-yellow-500 text-black shadow-lg' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'}`}>💰 Bounties</button>
                <button onClick={() => setTab('applications')} className={`px-6 py-3 rounded-xl font-bold transition whitespace-nowrap ${tab === 'applications' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'}`}>Applications <span className="bg-black/20 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{applications.filter(a => a.status === 'Pending').length}</span></button>
                <button onClick={() => setTab('finances')} className={`px-6 py-3 rounded-xl font-bold transition whitespace-nowrap ${tab === 'finances' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'}`}>Finances</button>
            </>
        )}
      </div>

      {/* 1. REPORTS */}
      {tab === 'reports' && (
        <div className="grid gap-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition">
               <div className="flex justify-between items-start">
                   <div><span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-wider">ID: {r.trackingId}</span><h2 className="font-extrabold text-red-600 text-xl mt-2">{r.category}</h2><p className="text-slate-400 text-sm font-medium">{r.area}</p></div>
                   <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-bold uppercase tracking-wider">{r.status}</span>
               </div>
               <p className="text-slate-700 mt-4 text-sm leading-relaxed">{r.description}</p>
               {r.location && <a href={`https://www.google.com/maps?q=${r.location.lat},${r.location.lng}`} target="_blank" className="text-blue-600 font-bold underline text-xs mt-3 block flex items-center gap-1">📍 View Exact GPS Location</a>}
               <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-50 pt-4">
                 <button onClick={()=>handleUpdateStatus(r.id, "Verified")} className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-xs font-bold border border-green-100 hover:bg-green-100 transition">✅ Verify</button>
                 <button onClick={()=>handleUpdateStatus(r.id, "False Alarm")} className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-xs font-bold border border-red-100 hover:bg-red-100 transition">❌ False Alarm</button>
                 <button onClick={()=>handleUpdateStatus(r.id, "Resolved")} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-100 transition">🏁 Resolved</button>
                 <button onClick={()=>handleAddNote(r.id, r.adminNote)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 ml-auto transition">📝 Add Note</button>
               </div>
               {r.adminNote && <div className="mt-3 bg-yellow-50 p-3 rounded-xl border border-yellow-100"><p className="text-xs text-yellow-800 italic"><span className="font-bold not-italic">Officer Note:</span> {r.adminNote}</p></div>}
            </div>
          ))}
          {reports.length === 0 && <p className="text-slate-400 text-center py-10">No incidents reported yet.</p>}
        </div>
      )}

      {/* 2. BOUNTIES */}
      {tab === 'bounties' && (
        <div className="grid gap-4">
          {reports.filter(r => r.requiresAgent).map((r) => (
            <div key={r.id} className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-yellow-400 relative">
               <div className="absolute top-6 right-6 text-right"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BOUNTY</p><p className="text-3xl font-extrabold text-green-600">₹{r.bountyAmount}</p></div>
               <h2 className="font-bold text-lg">{r.category}</h2><p className="text-sm text-slate-500 mb-4">Location: {r.area}</p>
               <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Guardian Status</p><p className="text-sm font-medium text-slate-800">{r.agentStatus || "Waiting for Guardian..."}</p>{r.agentNote ? <div className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded"><strong>Proof Submitted:</strong> "{r.agentNote}"</div> : <p className="text-xs text-slate-400 italic mt-1">No proof submitted yet.</p>}</div>
               {r.agentStatus?.includes("Assigned") && r.status !== "Resolved" && <button onClick={() => handleReleasePayment(r)} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg animate-pulse transition">💸 Approve Proof & Release Payment</button>}
               {r.status === "Resolved" && <div className="bg-green-50 p-3 rounded-xl text-center border border-green-200"><p className="text-green-700 font-bold flex items-center justify-center gap-2">✅ Payment Released & Issue Resolved</p></div>}
            </div>
          ))}
          {reports.filter(r => r.requiresAgent).length === 0 && <p className="text-center text-slate-400 py-10">No active bounties.</p>}
        </div>
      )}

      {/* 3. APPLICATIONS */}
      {tab === 'applications' && (
        <div className="grid gap-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-green-500">
               <div className="flex justify-between items-start"><div><h2 className="font-bold text-xl text-slate-800">{app.name}</h2><p className="text-sm text-slate-500 font-medium">{app.background} • Fitness: {app.fitness}</p></div><span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${app.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{app.status}</span></div>
               <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Skills</p><p className="text-sm text-slate-700">{app.skills}</p></div>
               <a href={app.proofLink} target="_blank" className="text-blue-600 text-xs mt-3 block font-bold hover:underline flex items-center gap-1">📄 View Proof Documents</a>
               {app.status === 'Pending' && <button onClick={() => handleApproveGuardian(app)} className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg transition">✅ Approve & Generate Badge ID</button>}
               {app.badgeId && <div className="mt-6 text-center bg-green-50 p-4 border-2 border-green-100 rounded-xl border-dashed"><p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Badge ID Issued</p><p className="font-mono font-bold text-2xl text-green-900 tracking-widest mt-1">{app.badgeId}</p></div>}
            </div>
          ))}
          {applications.length === 0 && <p className="text-slate-400 text-center py-10">No applications received yet.</p>}
        </div>
      )}

      {/* 4. FINANCES */}
      {tab === 'finances' && (
          <div>
              <div className="bg-slate-800 text-white p-8 rounded-3xl mb-8 shadow-xl"><p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Total Public Funds Collected</p><div className="flex items-end gap-2 mt-2"><p className="text-5xl font-mono text-green-400 font-bold">₹{totalFunds.toLocaleString()}</p><span className="text-sm text-slate-500 mb-2">/ ₹5,00,000 Goal</span></div><div className="w-full bg-slate-700 h-3 rounded-full mt-6 overflow-hidden"><div className="bg-green-500 h-3 rounded-full transition-all duration-1000" style={{width: `${(totalFunds/500000)*100}%`}}></div></div><p className="text-right text-xs text-slate-400 mt-2">{Math.round((totalFunds/500000)*100)}% Funded</p></div>
              <h3 className="font-bold text-slate-700 mb-4 text-lg">Recent Transactions</h3>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">{donations.map((d, i) => <div key={i} className="flex justify-between p-5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition"><div><p className="font-bold text-slate-800">Anonymous Donation</p><p className="text-xs text-slate-400 font-mono mt-1">{d.timestamp ? new Date(d.timestamp.seconds*1000).toLocaleString() : 'Just now'}</p></div><p className="text-green-600 font-bold text-lg">+ ₹{d.amount}</p></div>)}{donations.length === 0 && <p className="p-10 text-center text-slate-400">No donations received yet.</p>}</div>
          </div>
      )}

    </div>
  );
}
