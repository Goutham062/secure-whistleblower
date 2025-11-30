"use client"
import { useState, useEffect } from 'react';
import { db } from '../../firebase'; 
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link'; 

export default function GuardianPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [badgeId, setBadgeId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [guardianName, setGuardianName] = useState('');

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- LOGIN LOGIC ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    // Check if Badge ID exists in 'guardians' collection
    const q = query(collection(db, "guardians"), where("badgeId", "==", badgeId.trim().toUpperCase()));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        setIsAuthenticated(true);
        setGuardianName(snapshot.docs[0].data().name);
        fetchTasks();
    } else {
        setLoginError("Invalid Badge ID. Access Denied.");
    }
  };

  // --- FETCH TASKS ---
  const fetchTasks = async () => {
    try {
      const q = query(collection(db, "reports"), where("requiresAgent", "==", true));
      const querySnapshot = await getDocs(q);
      const taskList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(t => t.status !== "Resolved");
      setTasks(taskList);
      setLoading(false);
    } catch (error) { console.error(error); }
  };

  const handleAcceptTask = async (id) => {
    const proof = prompt("Enter verification details:");
    if(!proof) return;
    await updateDoc(doc(db, "reports", id), { status: "In Progress", agentNote: proof, agentStatus: `Assigned to ${guardianName}` });
    alert("Task Accepted!");
    fetchTasks(); // Refresh
  };

  // --- LOGIN SCREEN (LOCK) ---
  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-sm text-center">
                <div className="text-5xl mb-4">🔒</div>
                <h1 className="text-xl font-bold text-white mb-2">Restricted Access</h1>
                <p className="text-slate-500 text-sm mb-6">Only verified Guardians can access the bounty list.</p>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="text" placeholder="Enter Badge ID (e.g. G-921)" value={badgeId} onChange={e => setBadgeId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-white text-center font-mono tracking-widest uppercase" />
                    <button className="w-full bg-yellow-600 text-black font-bold py-3 rounded-lg hover:bg-yellow-500">Authenticate</button>
                </form>
                {loginError && <p className="text-red-500 text-xs mt-4">{loginError}</p>}
                
                <div className="mt-6 border-t border-slate-800 pt-4">
                    <Link href="/join-guardian" className="text-blue-400 text-xs hover:underline">Apply to become a Guardian</Link>
                </div>
            </div>
        </div>
    );
  }

  // --- TASK DASHBOARD (UNLOCKED) ---
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">🛡️ Command Center</h1>
          <p className="text-xs text-slate-400">Welcome, Officer {guardianName}</p>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="text-xs text-red-400">Logout</button>
      </div>

      {loading ? <p className="text-center animate-pulse">Loading Operations...</p> : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 relative">
              <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">Reward: ₹{task.bountyAmount}</div>
              <h3 className="text-lg font-bold text-white mb-1">{task.category}</h3>
              <p className="text-sm text-slate-400 mb-4">{task.area} - "{task.description}"</p>
              <button onClick={() => handleAcceptTask(task.id)} className="w-full bg-yellow-600 text-black py-2 rounded-lg text-xs font-bold hover:bg-yellow-500">🛡️ Accept Mission</button>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-center text-slate-500">No active missions.</p>}
        </div>
      )}
    </div>
  );
}