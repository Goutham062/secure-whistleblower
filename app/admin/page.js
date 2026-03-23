"use client"
import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc, arrayUnion } from 'firebase/firestore';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(''); 
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('reports'); 
  const [reports, setReports] = useState([]);
  const [applications, setApplications] = useState([]);
  const [donations, setDonations] = useState([]);
  const [totalFunds, setTotalFunds] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // State to handle typing messages for different reports
  const [adminReplies, setAdminReplies] = useState({});

  // Auto-refresh data every 5 seconds to get live chat updates
  useEffect(() => {
    let interval;
    if (isLoggedIn) {
      fetchData();
      interval = setInterval(fetchData, 5000);
    }
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      const q1 = query(collection(db, "reports"), orderBy("timestamp", "desc"));
      const snap1 = await getDocs(q1);
      setReports(snap1.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const q2 = query(collection(db, "guardian_applications"), orderBy("timestamp", "desc"));
      const snap2 = await getDocs(q2);
      setApplications(snap2.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const q3 = query(collection(db, "donations"), orderBy("timestamp", "desc"));
      const snap3 = await getDocs(q3);
      const donationList = snap3.docs.map(doc => doc.data());
      setDonations(donationList);
      setTotalFunds(donationList.reduce((acc, curr) => acc + curr.amount, 0));
    } catch (error) { console.error(error); }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    await updateDoc(doc(db, "reports", id), { status: newStatus });
    alert(`Status updated: ${newStatus}`);
    fetchData();
  };

  const handleAddNote = async (id, currentNote) => {
    const note = prompt("Enter Note:", currentNote || "");
    if (note) { await updateDoc(doc(db, "reports", id), { adminNote: note }); fetchData(); }
  };
  const handleRequestVerification = async (id) => {
    if(!confirm("Request official Aadhaar verification from the reporter?")) return;
    
    // Updates the database to flag that verification is needed, and sends an automated system message.
    await updateDoc(doc(db, "reports", id), { 
      verificationRequested: true,
      messages: arrayUnion({
        sender: "System Command",
        text: "⚠️ Identity verification requested by Admin. Please check your tracking portal to verify securely.",
        timestamp: new Date().toISOString()
      })
    });
    alert("Verification request sent to victim.");
    fetchData();
  };

  const handleToggleChat = async (id, currentStatus) => {
    await updateDoc(doc(db, "reports", id), { chatEnabled: !currentStatus });
    fetchData();
  };

  const handleAdminSendMessage = async (id) => {
    const text = adminReplies[id];
    if (!text || !text.trim()) return;

    const newMsg = {
      sender: role === 'admin' ? "NGO Admin" : "Police Dispatch",
      text: text,
      timestamp: new Date().toISOString()
    };

    await updateDoc(doc(db, "reports", id), {
      messages: arrayUnion(newMsg)
    });

    setAdminReplies(prev => ({...prev, [id]: ''}));
    fetchData();
  };

  const handleApproveGuardian = async (app) => {
    const badgeId = "G-" + Math.floor(1000 + Math.random() * 9000); 
    await addDoc(collection(db, "guardians"), { name: app.name, badgeId: badgeId, skills: app.skills, joined: new Date(), wallet: 0 });
    await updateDoc(doc(db, "guardian_applications", app.id), { status: "Approved", badgeId: badgeId });
    alert(`Guardian Approved!\nBADGE ID: ${badgeId}`);
    fetchData();
  };

  const handleReleasePayment = async (report) => {
    if(!confirm(`Release ₹${report.bountyAmount} to Guardian?`)) return;
    await updateDoc(doc(db, "reports", report.id), { status: "Resolved", adminNote: `Verified by Guardian. Payment of ₹${report.bountyAmount} released.` });
    alert("💰 Payment Released! Transferred to Guardian's Wallet.");
    fetchData();
  };

  const handleClearDatabase = async () => {
    if(!confirm("⚠️ DELETE ALL DATA? This cannot be undone.")) return;
    setLoading(true);
    const q = query(collection(db, "reports"));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "reports", d.id)));
    await Promise.all(deletePromises);
    alert("Database Cleared!");
    setLoading(false);
    fetchData();
  };

  const handleSeedData = async () => {
    if(!confirm("Inject Fake Reports for Demo?")) return;
    setLoading(true);
    const demoData = [ { cat: "Harassment", area: "Anna Nagar", desc: "Verbal abuse near park." }, { cat: "Cyber Fraud", area: "Adyar", desc: "Bank OTP scam." } ];
    const promises = [];
    for(let i=0; i<5; i++) {
        const item = demoData[i % demoData.length];
        promises.push(addDoc(collection(db, "reports"), { trackingId: "DEMO-" + Math.floor(Math.random() * 10000), category: item.cat, area: item.area, description: item.desc, status: "Unverified", timestamp: new Date(), language: "en", location: null, requiresAgent: false, bountyAmount: "0", chatEnabled: false, messages: [] }));
    }
    await Promise.all(promises);
    alert("✅ Demo Reports Added!");
    setLoading(false);
    fetchData();
  };

  const handleLogin = (e) => { 
      e.preventDefault(); 
      if (password === "police123") { setIsLoggedIn(true); setRole('police'); } 
      else if (password === "admin999") { setIsLoggedIn(true); setRole('admin'); } 
      else { alert("Wrong Password"); }
  };

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-sm border border-slate-700">
          <h1 className="text-2xl font-bold mb-6 text-center text-slate-800 dark:text-white">Secure Access</h1>
          <div className="space-y-4">
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white p-3 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter Access Code"/>
              <button className="w-full bg-blue-900 dark:bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-800 dark:hover:bg-blue-500 transition">Login</button>
          </div>
          <div className="mt-6 text-xs text-slate-400 text-center"><p>Police Code: police123</p><p>Admin Code: admin999</p></div>
        </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 p-8 font-sans transition-colors duration-300">
      
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-extrabold text-blue-900 dark:text-blue-400">{role === 'admin' ? "🛡️ NGO Command Center" : "👮‍♂️ Police Dispatch"}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Logged in as: <span className="font-bold uppercase">{role}</span></p>
        </div>
        <button onClick={() => setIsLoggedIn(false)} className="text-red-600 dark:text-red-400 font-bold hover:underline">Logout</button>
      </div>

      {role === 'admin' && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 flex flex-wrap justify-between items-center gap-4">
            <div><h3 className="font-bold text-slate-800 dark:text-white">🛠️ Demo & Debug Tools</h3><p className="text-xs text-slate-500 dark:text-slate-400">For demonstration purposes only.</p></div>
            <div className="flex gap-3">
              <button onClick={handleClearDatabase} disabled={loading} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition disabled:opacity-50">🗑️ Wipe Database</button>
              <button onClick={handleSeedData} disabled={loading} className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-100 dark:hover:bg-purple-900/50 transition disabled:opacity-50">✨ Inject Reports</button>
            </div>
          </div>
      )}

      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        <button onClick={() => setTab('reports')} className={`px-6 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${tab === 'reports' ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Incidents</button>
        {role === 'admin' && (
            <>
                <button onClick={() => setTab('bounties')} className={`px-6 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${tab === 'bounties' ? 'bg-yellow-500 text-black shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700'}`}>💰 Active Bounties ({reports.filter(r => r.requiresAgent && r.status !== 'Resolved').length})</button>
                <button onClick={() => setTab('applications')} className={`px-6 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${tab === 'applications' ? 'bg-green-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Applications <span className="bg-black/20 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{applications.filter(a => a.status === 'Pending').length}</span></button>
                <button onClick={() => setTab('finances')} className={`px-6 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${tab === 'finances' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Finances</button>
            </>
        )}
      </div>

      {tab === 'reports' && (
        <div className="grid gap-6">
          {reports.map((r) => (
            <div key={r.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border-l-4 border-blue-900 dark:border-blue-500 hover:shadow-md transition">
               
              {/* TOP HEADER: ID, Category, Status */}
<div className="flex justify-between items-start">
    <div>
        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 dark:text-slate-400">ID: {r.trackingId}</span>
        
        {/* NEW: Verified Citizen Badge */}
        {r.verificationStatus === 'Verified' && (
            <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold border border-blue-300">
                ✓ VERIFIED CITIZEN
            </span>
        )}
        
        <h2 className="font-bold text-red-600 dark:text-red-400 text-lg mt-1">{r.category} <span className="text-slate-400 dark:text-slate-500 font-normal text-base">in {r.area}</span></h2>
    </div>
    {/* ... rest of your header code ... */}
</div>

{/* ... DESCRIPTION CODE ... */}

{/* ACTION BUTTONS */}
<div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
  <button onClick={()=>handleUpdateStatus(r.id, "Verified")} className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg text-xs font-bold border border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50">✅ Verify</button>
  <button onClick={()=>handleUpdateStatus(r.id, "False Alarm")} className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-xs font-bold border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50">❌ False Alarm</button>
  
  {/* NEW: Request ID Verification Button */}
  {!r.verificationStatus && (
      <button 
        onClick={() => handleRequestVerification(r.id)} 
        disabled={r.verificationRequested} 
        className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-lg text-xs font-bold border border-purple-100 dark:border-purple-800 hover:bg-purple-100 disabled:opacity-50"
      >
        {r.verificationRequested ? "⏳ Verification Pending" : "🛡️ Request ID Verification"}
      </button>
  )}
  
  <button onClick={()=>handleUpdateStatus(r.id, "Resolved")} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50">🏁 Resolved</button>
  <button onClick={()=>handleAddNote(r.id, r.adminNote)} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 ml-auto">📝 Add Official Note</button>
</div>
               
               {/* ADMIN NOTE DISPLAY */}
               {r.adminNote && (
                   <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800">
                       <p className="text-xs text-yellow-800 dark:text-yellow-400 italic"><span className="font-bold not-italic">Officer Note:</span> {r.adminNote}</p>
                   </div>
               )}

               {/* CHAT INTERFACE FOR ADMIN/POLICE */}
               <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                     💬 Secure Victim Chat {r.chatEnabled && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                   </h3>
                   <button 
                     onClick={() => handleToggleChat(r.id, r.chatEnabled)} 
                     className={`text-xs px-3 py-1.5 rounded-full font-bold transition ${r.chatEnabled ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'}`}
                   >
                     {r.chatEnabled ? "🔒 Lock Chat" : "🔓 Unlock Chat"}
                   </button>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden h-48 flex flex-col">
                   <div className="flex-1 overflow-y-auto p-3 space-y-3 flex flex-col">
                     {(r.messages || []).length === 0 ? (
                       <p className="text-xs text-center text-slate-400 my-auto">No messages yet. Unlock chat to request info.</p>
                     ) : (
                       (r.messages || []).map((msg, idx) => (
                         <div key={idx} className={`max-w-[85%] p-2.5 rounded-xl text-xs ${msg.sender === 'Victim / Reporter' ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 self-start rounded-tl-none' : 'bg-blue-600 text-white self-end rounded-tr-none ml-auto'}`}>
                           <p className="text-[9px] opacity-60 mb-1 font-bold">{msg.sender}</p>
                           <p>{msg.text}</p>
                         </div>
                       ))
                     )}
                   </div>
                   
                   {r.chatEnabled ? (
                     <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                       <input 
                         type="text" 
                         value={adminReplies[r.id] || ''} 
                         onChange={(e) => setAdminReplies({...adminReplies, [r.id]: e.target.value})} 
                         placeholder="Type a message to the reporter..." 
                         className="flex-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-xs outline-none dark:text-white"
                       />
                       <button 
                         onClick={() => handleAdminSendMessage(r.id)} 
                         className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition"
                       >
                         Send
                       </button>
                     </div>
                   ) : (
                     <div className="p-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Chat is Locked</p>
                     </div>
                   )}
                 </div>
               </div>

            </div>
          ))}
          {reports.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-center py-10">No incidents reported yet.</p>}
        </div>
      )}

      {tab === 'bounties' && role === 'admin' && (
        <div className="grid gap-4">
          {reports.filter(r => r.requiresAgent && r.status !== 'Resolved').map((r) => (
             <div key={r.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-yellow-300 dark:border-yellow-700">
                <div className="flex justify-between items-center mb-3">
                   <h2 className="font-bold text-slate-800 dark:text-white">{r.category}</h2>
                   <span className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400 font-bold px-3 py-1 rounded-lg text-sm">₹{r.bountyAmount}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{r.description}</p>
                <div className="flex justify-between items-center">
                   <span className="text-xs font-bold text-slate-500">Agent Status: {r.agentStatus || 'Open'}</span>
                   <button onClick={() => handleReleasePayment(r)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-4 py-2 rounded-lg text-sm transition">Release Payment</button>
                </div>
             </div>
          ))}
          {reports.filter(r => r.requiresAgent && r.status !== 'Resolved').length === 0 && <p className="text-slate-400 text-center py-10">No active bounties.</p>}
        </div>
      )}

      {tab === 'applications' && role === 'admin' && (
        <div className="grid gap-4">
          {applications.map((app) => (
             <div key={app.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-3">
                   <h2 className="font-bold text-slate-800 dark:text-white text-lg">{app.name}</h2>
                   <span className={`text-xs font-bold px-3 py-1 rounded-full ${app.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{app.status}</span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-4 space-y-1">
                   <p><strong>Phone:</strong> {app.phone}</p>
                   <p><strong>Age:</strong> {app.age}</p>
                   <p><strong>Skills:</strong> {app.skills}</p>
                   <p><strong>Why:</strong> {app.reason}</p>
                </div>
                {app.status === 'Pending' && (
                  <button onClick={() => handleApproveGuardian(app)} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl transition hover:scale-[1.02]">Approve & Generate ID</button>
                )}
             </div>
          ))}
          {applications.length === 0 && <p className="text-slate-400 text-center py-10">No applications found.</p>}
        </div>
      )}

      {tab === 'finances' && role === 'admin' && (
        <div>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 text-center">
             <h2 className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">Total Mission Funds</h2>
             <p className="text-5xl font-extrabold text-green-600 dark:text-green-500">₹{totalFunds.toLocaleString()}</p>
          </div>
          <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Recent Anonymous Donations</h3>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
             {donations.map((d, i) => (
                <div key={i} className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                   <span className="text-slate-600 dark:text-slate-300 font-mono text-sm">{new Date(d.timestamp.seconds * 1000).toLocaleDateString()}</span>
                   <span className="font-bold text-green-600 dark:text-green-400">+ ₹{d.amount.toLocaleString()}</span>
                </div>
             ))}
             {donations.length === 0 && <p className="p-4 text-center text-slate-400">No donations yet.</p>}
          </div>
        </div>
      )}
      
    </div>
  );
}