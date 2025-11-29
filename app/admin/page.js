"use client"
import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH REPORTS ---
  const fetchReports = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(list);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
    setLoading(false);
  };

  // --- 2. UPDATE STATUS ---
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const reportRef = doc(db, "reports", id);
      await updateDoc(reportRef, { status: newStatus });
      alert(`Status updated to: ${newStatus}`);
      fetchReports();
    } catch (error) {
      alert("Failed to update status");
    }
  };

  // --- 3. ADD NOTE ---
  const handleAddNote = async (id, currentNote) => {
    const note = prompt("Enter Note for User:", currentNote || "");
    if (note !== null) {
      try {
        const reportRef = doc(db, "reports", id);
        await updateDoc(reportRef, { adminNote: note });
        fetchReports();
      } catch (error) {
        console.error("Error adding note:", error);
      }
    }
  };

  // --- 4. MAGIC: CLEAR DATABASE ---
  const handleClearDatabase = async () => {
    if(!confirm("⚠️ WARNING: This will delete ALL reports in the system. Are you sure?")) return;
    
    setLoading(true);
    try {
      const q = query(collection(db, "reports"));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "reports", d.id)));
      await Promise.all(deletePromises);
      alert("✅ Database Cleared!");
      fetchReports();
    } catch (e) {
      alert("Error clearing data");
      setLoading(false);
    }
  };

  // --- 5. MAGIC: INJECT DEMO DATA ---
  const handleSeedData = async () => {
    if(!confirm("Generate 20 Realistic Reports for Chennai?")) return;
    setLoading(true);
    
    // Fake data logic
    const demoData = [
      { cat: "Harassment", area: "Anna Nagar", desc: "Group of men following women near park." },
      { cat: "Chain Snatching", area: "Anna Nagar", desc: "Bikeborne thieves snatched chain." },
      { cat: "Harassment", area: "Anna Nagar", desc: "Verbal abuse near bus stop." }, 
      { cat: "Cyber Fraud", area: "Adyar", desc: "Bank OTP scam call received." },
      { cat: "Street Light Issue", area: "Adyar", desc: "Whole street is dark, unsafe." },
      { cat: "Theft", area: "T. Nagar", desc: "Shop theft reported in crowded area." },
      { cat: "Public Nuisance", area: "T. Nagar", desc: "Drunk people creating scene." },
      { cat: "Rash Driving", area: "Avadi", desc: "Bike racing on main road." },
      { cat: "Suspicious Activity", area: "Velachery", desc: "Unknown van parked for 2 days." },
      { cat: "Noise Complaint", area: "Mylapore", desc: "Loudspeakers after 10 PM." },
      { cat: "Rash Driving", area: "Guindy", desc: "Car driving wrong side." },
      { cat: "Harassment", area: "Tambaram", desc: "Eve teasing near college." },
      { cat: "Theft", area: "Anna Nagar", desc: "Mobile phone stolen." },
      { cat: "Public Nuisance", area: "Marina Beach", desc: "Fighting in public." },
      { cat: "Chain Snatching", area: "Besant Nagar", desc: "Morning walker targeted." },
      { cat: "Street Light Issue", area: "Perambur", desc: "Street lights not working for a week." },
      { cat: "Cyber Fraud", area: "Online", desc: "Fake link sent via WhatsApp." },
      { cat: "Suspicious Activity", area: "Koyambedu", desc: "Person taking photos of houses." },
      { cat: "Rash Driving", area: "ECR", desc: "Speeding cars endangering public." },
      { cat: "Harassment", area: "Nungambakkam", desc: "Stalking incident reported." }
    ];

    const promises = demoData.map(item => 
      addDoc(collection(db, "reports"), {
        trackingId: "DEMO-" + Math.floor(Math.random() * 10000),
        category: item.cat,
        area: item.area,
        description: item.desc,
        status: "Unverified",
        timestamp: new Date(),
        language: "en",
        location: null // No GPS for fake data
      })
    );

    await Promise.all(promises);
    alert("✅ 20 Demo Reports Added! Check the Safe Zones tab.");
    fetchReports();
  };

  // --- LOGIN CHECK ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "police123") {
      setIsLoggedIn(true);
      fetchReports();
    } else {
      alert("Wrong Password");
    }
  };

  // --- RENDER LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-lg w-full max-w-sm">
          <h1 className="text-xl font-bold mb-4 text-center">👮‍♂️ Police Login</h1>
          <input 
            type="password" 
            placeholder="Enter Access Code" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 w-full mb-4 text-black"
          />
          <button type="submit" className="bg-blue-900 text-white p-2 w-full rounded font-bold hover:bg-blue-800">
            Access Portal
          </button>
        </form>
      </div>
    );
  }

  // --- RENDER DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-900">👮‍♂️ Police Dispatch Control</h1>
        <button onClick={() => setIsLoggedIn(false)} className="text-red-600 underline text-sm">Logout</button>
      </div>

      {/* --- NEW: ADMIN TOOLS SECTION --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h3 className="font-bold text-slate-800 mb-2">🛠️ Demo Tools (For Presentation)</h3>
        <div className="flex gap-4">
            <button 
                onClick={handleClearDatabase} 
                className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-100 transition"
            >
                🗑️ Wipe Database
            </button>
            <button 
                onClick={handleSeedData} 
                className="bg-purple-50 text-purple-600 border border-purple-200 px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-100 transition"
            >
                ✨ Inject 20 Fake Reports
            </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading reports...</p>
      ) : (
        <div className="grid gap-6 max-w-4xl mx-auto">
          {reports.map((report) => (
            <div key={report.id} className="bg-white p-6 rounded shadow border-l-4 border-blue-900">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded text-black">ID: {report.trackingId}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <h2 className="text-xl font-bold text-red-600">{report.category}</h2>
                    <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">{report.area}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    report.status === 'Verified' ? 'bg-green-100 text-green-800' : 
                    report.status === 'False Alarm' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-700 mb-2">{report.description}</p>
              
              {/* Location Link */}
              {report.location ? (
                 <a href={`https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm block mb-4">
                   📍 Open GPS Location
                 </a>
              ) : (
                 <p className="text-xs text-gray-400 mb-4 italic">No GPS Data</p>
              )}

              {/* Buttons */}
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 bg-gray-50 p-3 rounded">
                <span className="text-xs font-bold text-gray-500 uppercase mr-2 w-full mb-1">Update Status:</span>
                <button onClick={() => handleUpdateStatus(report.id, "Verified")} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">✅ Verify</button>
                <button onClick={() => handleUpdateStatus(report.id, "False Alarm")} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">❌ False Alarm</button>
                <button onClick={() => handleUpdateStatus(report.id, "Resolved")} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">🏁 Resolved</button>
                <button onClick={() => handleAddNote(report.id, report.adminNote)} className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 ml-auto">📝 Note</button>
              </div>
              
              {/* Note */}
              {report.adminNote && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-100 rounded">
                  <p className="text-sm text-gray-800 italic"><span className="font-bold not-italic">Officer Note:</span> {report.adminNote}</p>
                </div>
              )}
            </div>
          ))}
          {reports.length === 0 && <p className="text-center text-gray-500">No reports found.</p>}
        </div>
      )}
    </div>
  );
}