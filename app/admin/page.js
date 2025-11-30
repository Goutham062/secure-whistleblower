"use client"
import { useState } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('reports'); 
  
  const [reports, setReports] = useState([]);
  const [applications, setApplications] = useState([]);
  const [donations, setDonations] = useState([]);
  const [totalFunds, setTotalFunds] = useState(0);
  const [loading, setLoading] = useState(false);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const q1 = query(collection(db, "reports"), orderBy("timestamp", "desc"));
      const snap1 = await getDocs(q1);
      setReports(snap1.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const q2 = query(collection(db, "guardian_applications"), orderBy("timestamp", "desc"));
      const snap2 = await getDocs(q2);
      setApplications(snap2.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // NEW: Fetch Donations
      const q3 = query(collection(db, "donations"), orderBy("timestamp", "desc"));
      const snap3 = await getDocs(q3);
      const donationList = snap3.docs.map(doc => doc.data());
      setDonations(donationList);
      setTotalFunds(donationList.reduce((acc, curr) => acc + curr.amount, 0));

    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleUpdateStatus = async (id, newStatus) => { await updateDoc(doc(db, "reports", id), { status: newStatus }); alert(`Updated: ${newStatus}`); fetchData(); };
  const handleApproveGuardian = async (app) => { const badgeId = "G-" + Math.floor(1000 + Math.random() * 9000); await addDoc(collection(db, "guardians"), { name: app.name, badgeId, skills: app.skills }); await updateDoc(doc(db, "guardian_applications", app.id), { status: "Approved", badgeId }); alert(`Approved! ID: ${badgeId}`); fetchData(); };
  const handleReleasePayment = async (report) => { if(!confirm(`Release ₹${report.bountyAmount}?`)) return; await updateDoc(doc(db, "reports", report.id), { status: "Resolved", adminNote: `Paid ₹${report.bountyAmount}` }); alert("Paid!"); fetchData(); };
  const handleClearDatabase = async () => { if(!confirm("Delete All?")) return; const q = query(collection(db, "reports")); const snap = await getDocs(q); snap.docs.forEach(d => deleteDoc(doc(db, "reports", d.id))); alert("Cleaned"); fetchData(); };
  
  // MAGIC SEEDER
  const handleSeedData = async () => { 
      if(!confirm("Inject 20 Reports?")) return; 
      setLoading(true);
      const demoData = [{c:"Harassment",a:"Anna Nagar"},{c:"Theft",a:"Adyar"},{c:"Rash Driving",a:"T. Nagar"},{c:"Cyber Fraud",a:"Velachery"}];
      const promises = [];
      for(let i=0; i<20; i++) {
          const d = demoData[i%4];
          promises.push(addDoc(collection(db, "reports"), { trackingId: "DEMO-"+i, category: d.c, area: d.a, description: "Test report", status: "Unverified", timestamp: new Date(), requiresAgent: false, bountyAmount: "0" }));
      }
      await Promise.all(promises);
      alert("Done!"); fetchData();
  };

  const handleLogin = (e) => { e.preventDefault(); if (password === "police123") { setIsLoggedIn(true); fetchData(); } };

  if (!isLoggedIn) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><form onSubmit={handleLogin} className="bg-white p-8 rounded"><h1 className="text-xl font-bold mb-4">Admin Login</h1><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="border p-2 w-full mb-4"/><button className="bg-blue-900 text-white p-2 w-full rounded">Login</button></form></div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-blue-900">🛡️ Command Center</h1><button onClick={() => setIsLoggedIn(false)} className="text-red-600 underline">Logout</button></div>
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex justify-between"><h3 className="font-bold">Tools</h3><div className="flex gap-2"><button onClick={handleClearDatabase} className="text-red-600 border border-red-200 px-3 py-1 rounded text-xs font-bold">Wipe Data</button><button onClick={handleSeedData} className="text-purple-600 border border-purple-200 px-3 py-1 rounded text-xs font-bold">Inject Data</button></div></div>
      
      <div className="flex gap-2 mb-6 border-b pb-4 overflow-x-auto">
        {['reports', 'bounties', 'applications', 'finances'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg font-bold capitalize ${tab === t ? 'bg-blue-900 text-white' : 'bg-white shadow-sm'}`}>{t}</button>
        ))}
      </div>

      {tab === 'reports' && <div className="grid gap-4">{reports.map(r => <div key={r.id} className="bg-white p-5 rounded shadow border-l-4 border-blue-900"><h2 className="font-bold text-red-600">{r.category} ({r.area})</h2><p className="text-slate-700 text-sm">{r.description}</p><div className="mt-4 flex gap-2"><button onClick={()=>handleUpdateStatus(r.id, "Verified")} className="text-green-700 border border-green-100 px-3 py-1 rounded text-xs font-bold">Verify</button><button onClick={()=>handleUpdateStatus(r.id, "False Alarm")} className="text-red-700 border border-red-100 px-3 py-1 rounded text-xs font-bold">False</button></div></div>)}</div>}
      
      {tab === 'bounties' && <div className="grid gap-4">{reports.filter(r => r.requiresAgent).map(r => <div key={r.id} className="bg-white p-5 rounded shadow border-l-4 border-yellow-500 relative"><div className="absolute top-4 right-4 text-right"><p className="text-xs text-gray-400">BOUNTY</p><p className="text-2xl font-bold text-green-600">₹{r.bountyAmount}</p></div><h2 className="font-bold">{r.category}</h2><p className="text-sm">{r.agentStatus}</p>{r.agentStatus?.includes("Assigned") && r.status !== "Resolved" && <button onClick={() => handleReleasePayment(r)} className="w-full bg-green-600 text-white py-2 rounded font-bold mt-4">Approve & Pay</button>}</div>)}</div>}
      
      {tab === 'applications' && <div className="grid gap-4">{applications.map(app => <div key={app.id} className="bg-white p-5 rounded shadow border-l-4 border-green-500"><h2 className="font-bold">{app.name}</h2><p className="text-sm">{app.background}</p>{app.status === 'Pending' && <button onClick={() => handleApproveGuardian(app)} className="mt-4 bg-green-600 text-white px-4 py-2 rounded font-bold">Approve</button>}{app.badgeId && <p className="mt-2 text-green-700 font-mono font-bold">{app.badgeId}</p>}</div>)}</div>}

      {/* NEW: FINANCES TAB */}
      {tab === 'finances' && (
          <div>
              <div className="bg-slate-800 text-white p-6 rounded-2xl mb-6">
                  <p className="text-slate-400 text-sm uppercase font-bold">Total Public Funds Collected</p>
                  <p className="text-4xl font-mono text-green-400 font-bold mt-2">₹{totalFunds.toLocaleString()} <span className="text-sm text-slate-500">/ ₹5,00,000</span></p>
                  <div className="w-full bg-slate-700 h-2 rounded-full mt-4"><div className="bg-green-500 h-2 rounded-full" style={{width: `${(totalFunds/500000)*100}%`}}></div></div>
              </div>
              <h3 className="font-bold text-slate-700 mb-4">Recent Transactions</h3>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {donations.map((d, i) => (
                      <div key={i} className="flex justify-between p-4 border-b border-slate-100">
                          <div><p className="font-bold text-slate-800">Anonymous Donation</p><p className="text-xs text-slate-400">{d.timestamp ? new Date(d.timestamp.seconds*1000).toLocaleString() : 'Just now'}</p></div>
                          <p className="text-green-600 font-bold">+ ₹{d.amount}</p>
                      </div>
                  ))}
                  {donations.length === 0 && <p className="p-4 text-center text-slate-400">No donations yet.</p>}
              </div>
          </div>
      )}

    </div>
  );
}