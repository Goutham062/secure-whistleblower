"use client"
import { useState } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  
  // Tabs: 'reports' or 'applications'
  const [tab, setTab] = useState('reports'); 
  
  const [reports, setReports] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- FETCH ALL DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Reports
      const q1 = query(collection(db, "reports"), orderBy("timestamp", "desc"));
      const snap1 = await getDocs(q1);
      setReports(snap1.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Fetch Guardian Applications
      const q2 = query(collection(db, "guardian_applications"), orderBy("timestamp", "desc"));
      const snap2 = await getDocs(q2);
      setApplications(snap2.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // --- REPORT ACTIONS ---
  const handleUpdateStatus = async (id, newStatus) => {
    await updateDoc(doc(db, "reports", id), { status: newStatus });
    alert(`Status updated: ${newStatus}`); fetchData();
  };

  const handleAddNote = async (id, currentNote) => {
    const note = prompt("Enter Note:", currentNote || "");
    if (note) { await updateDoc(doc(db, "reports", id), { adminNote: note }); fetchData(); }
  };

  // --- GUARDIAN ACTIONS ---
  const handleApproveGuardian = async (app) => {
    const badgeId = "G-" + Math.floor(1000 + Math.random() * 9000); 
    
    // Add to authorized list
    await addDoc(collection(db, "guardians"), {
        name: app.name,
        badgeId: badgeId,
        skills: app.skills,
        joined: new Date()
    });

    // Update application status
    await updateDoc(doc(db, "guardian_applications", app.id), { status: "Approved", badgeId: badgeId });
    
    alert(`Guardian Approved!\nBADGE ID: ${badgeId}`);
    fetchData();
  };

  // --- MAGIC TOOLS ---
  const handleClearDatabase = async () => {
    if(!confirm("⚠️ DELETE ALL REPORTS?")) return;
    setLoading(true);
    const q = query(collection(db, "reports"));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "reports", d.id)));
    await Promise.all(deletePromises);
    alert("Database Cleared!");
    fetchData();
  };

  const handleSeedData = async () => {
    if(!confirm("Inject 20 Fake Reports?")) return;
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

    // Create 20 items (looping through demoData)
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
            location: null 
        }));
    }

    await Promise.all(promises);
    alert("✅ 20 Demo Reports Added!");
    fetchData();
  };

  // --- LOGIN ---
  const handleLogin = (e) => { e.preventDefault(); if (password === "police123") { setIsLoggedIn(true); fetchData(); } else alert("Wrong Password"); };

  if (!isLoggedIn) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><form onSubmit={handleLogin} className="bg-white p-8 rounded"><h1 className="text-xl font-bold mb-4">👮‍♂️ Police Login</h1><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="border p-2 w-full mb-4"/><button className="bg-blue-900 text-white p-2 w-full rounded">Login</button></form></div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-900">👮‍♂️ HQ Control</h1>
        <button onClick={() => setIsLoggedIn(false)} className="text-red-600 underline">Logout</button>
      </div>

      {/* MAGIC TOOLS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex justify-between items-center">
        <h3 className="font-bold text-slate-700">🛠️ Demo Tools</h3>
        <div className="flex gap-2">
          <button onClick={handleClearDatabase} className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded text-xs font-bold hover:bg-red-100">🗑️ Wipe Data</button>
          <button onClick={handleSeedData} className="bg-purple-50 text-purple-600 border border-purple-200 px-3 py-1 rounded text-xs font-bold hover:bg-purple-100">✨ Inject Fake Data</button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('reports')} className={`px-6 py-2 rounded-lg font-bold transition ${tab === 'reports' ? 'bg-blue-900 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>
            Incidents
        </button>
        <button onClick={() => setTab('applications')} className={`px-6 py-2 rounded-lg font-bold transition ${tab === 'applications' ? 'bg-blue-900 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>
            Applications <span className="bg-yellow-400 text-black text-[10px] px-1.5 py-0.5 rounded-full ml-1">{applications.filter(a => a.status === 'Pending').length}</span>
        </button>
      </div>

      {/* CONTENT: REPORTS */}
      {tab === 'reports' && (
        <div className="grid gap-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-white p-5 rounded shadow border-l-4 border-blue-900">
               <div className="flex justify-between">
                   <h2 className="font-bold text-red-600">{r.category} <span className="text-slate-400 text-sm">({r.area})</span></h2>
                   <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold">{r.status}</span>
               </div>
               <p className="text-slate-700 mt-1 text-sm">{r.description}</p>
               {r.location && <a href={`https://www.google.com/maps?q=${r.location.lat},${r.location.lng}`} target="_blank" className="text-blue-600 underline text-xs mt-2 block">📍 Map Location</a>}
               
               <div className="mt-4 flex gap-2 border-t pt-3">
                 <button onClick={()=>handleUpdateStatus(r.id, "Verified")} className="bg-green-50 text-green-700 px-3 py-1 rounded text-xs font-bold border border-green-100">✅ Verify</button>
                 <button onClick={()=>handleUpdateStatus(r.id, "False Alarm")} className="bg-red-50 text-red-700 px-3 py-1 rounded text-xs font-bold border border-red-100">❌ False</button>
                 <button onClick={()=>handleAddNote(r.id, r.adminNote)} className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-xs font-bold">📝 Note</button>
               </div>
               {r.adminNote && <p className="mt-2 text-xs italic bg-yellow-50 p-2 text-yellow-800">Note: {r.adminNote}</p>}
            </div>
          ))}
          {reports.length === 0 && <p className="text-slate-400 text-center">No reports found.</p>}
        </div>
      )}

      {/* CONTENT: APPLICATIONS */}
      {tab === 'applications' && (
        <div className="grid gap-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-white p-5 rounded shadow border-l-4 border-yellow-500">
               <div className="flex justify-between items-start">
                   <div>
                       <h2 className="font-bold text-xl">{app.name}</h2>
                       <p className="text-sm text-slate-600">{app.background} • Fitness: {app.fitness}</p>
                   </div>
                   <span className={`px-2 py-1 text-xs font-bold rounded ${app.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{app.status}</span>
               </div>
               
               <div className="mt-3 bg-slate-50 p-3 rounded text-sm text-slate-700">
                   <strong>Skills:</strong> {app.skills}
               </div>
               <a href={app.proofLink} target="_blank" className="text-blue-600 text-xs mt-2 block underline">View Proof Documents</a>
               
               {app.status === 'Pending' && (
                   <button onClick={() => handleApproveGuardian(app)} className="mt-4 w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 shadow-md">
                       ✅ Approve & Generate Badge ID
                   </button>
               )}
               
               {app.badgeId && (
                   <div className="mt-4 text-center bg-green-50 p-3 border border-green-200 rounded">
                       <p className="text-xs text-green-600 font-bold uppercase">Badge ID Issued</p>
                       <p className="font-mono font-bold text-xl text-green-900 tracking-widest">{app.badgeId}</p>
                   </div>
               )}
            </div>
          ))}
          {applications.length === 0 && <p className="text-slate-400 text-center">No applications received yet.</p>}
        </div>
      )}

    </div>
  );
}