"use client"
import { useEffect, useState } from 'react';
import { db } from '../../firebase'; 
import { collection, getDocs, orderBy, query, doc, updateDoc, increment } from 'firebase/firestore';
import Link from 'next/link';

// --- ICONS ---
const ShareIcon = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.66 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>;
const UpvoteIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>;
const MapIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>;

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [safetyStatus, setSafetyStatus] = useState({ level: 'Safe', message: 'No major threats detected.', color: 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-400' });

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const reportsList = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            upvotes: doc.data().upvotes || 0 
        }));
        
        setReports(reportsList);
        analyzeSafetyLevel(reportsList); 
        setLoading(false);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  // --- FEATURE 1: "I SAW IT TOO" (UPVOTE) ---
  const handleUpvote = async (id) => {
    // Optimistic Update (Update screen instantly)
    const updatedReports = reports.map(r => r.id === id ? {...r, upvotes: r.upvotes + 1} : r);
    setReports(updatedReports);
    
    // Update Database
    const reportRef = doc(db, "reports", id);
    await updateDoc(reportRef, { upvotes: increment(1) });
  };

  const analyzeSafetyLevel = (data) => {
    if (data.length === 0) return;
    const areaCounts = {}; 
    data.forEach(report => {
      const area = report.area || "Unknown";
      if (['Harassment', 'Suspicious Activity', 'Chain Snatching', 'Rash Driving'].includes(report.category)) {
        if (!areaCounts[area]) areaCounts[area] = 0;
        areaCounts[area]++;
      }
    });

    let dangerousArea = null;
    let maxCount = 0;
    for (const [area, count] of Object.entries(areaCounts)) {
      if (count > maxCount) { maxCount = count; dangerousArea = area; }
    }

    if (maxCount >= 3) {
      setSafetyStatus({ level: 'CRITICAL', message: `⚠️ HIGH ALERT: Multiple incidents in ${dangerousArea}.`, color: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-400' });
    } else if (maxCount >= 1) {
      setSafetyStatus({ level: 'WARNING', message: `✋ CAUTION: Reports from ${dangerousArea}. Stay alert.`, color: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-400' });
    } else {
      setSafetyStatus({ level: 'NORMAL', message: 'Neighborhood activity is normal.', color: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 font-sans transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Community Pulse</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Real-time anonymous updates</p>
          </div>
          <Link href="/">
            <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition font-bold shadow-lg text-sm">+ New Report</button>
          </Link>
        </div>

        {!loading && (
          <div className={`p-6 rounded-2xl border mb-8 flex items-start gap-4 shadow-sm transition-colors duration-300 ${safetyStatus.color}`}>
            <div className="text-3xl bg-white dark:bg-transparent p-2 rounded-full shadow-sm">
              {safetyStatus.level === 'CRITICAL' ? '🚨' : safetyStatus.level === 'WARNING' ? '⚠️' : '🛡️'}
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wider opacity-90">{safetyStatus.level} STATUS</h2>
              <p className="font-medium mt-1 text-sm md:text-base">{safetyStatus.message}</p>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-white dark:bg-slate-900 rounded-2xl animate-pulse"></div>)}</div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <div key={report.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition duration-300 relative overflow-hidden">
                
                <div className="absolute top-0 right-0 p-4">
                     <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${
                        report.status === 'Verified' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 
                        report.status === 'Resolved' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                     }`}>
                        {report.status}
                    </span>
                </div>

                <div className="pr-20">
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-extrabold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                    📍 {report.area || "Unknown Area"}
                    </span>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{report.category}</h2>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{report.description}</p>
                </div>
                
                {/* --- NEW FEATURES ACTION BAR --- */}
                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
                    
                    {/* 1. UPVOTE BUTTON */}
                    <button 
                        onClick={() => handleUpvote(report.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg transition"
                    >
                        <UpvoteIcon /> 
                        {report.upvotes > 0 ? `${report.upvotes} Verified` : "I saw this too"}
                    </button>

                    <div className="flex gap-2">
                        {/* 2. MAP LINK */}
                        {report.location && (
                            <a 
                                href={`https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg transition flex items-center gap-1"
                            >
                                <MapIcon /> Map
                            </a>
                        )}

                        {/* 3. WHATSAPP SHARE BUTTON */}
                        <a 
                            href={`https://wa.me/?text=⚠️ Alert: ${report.category} in ${report.area}. Stay Safe! - View on SecureWhistle`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 px-3 py-2 rounded-lg transition flex items-center gap-1 border border-green-100 dark:border-green-800"
                        >
                            <ShareIcon /> Share Alert
                        </a>
                    </div>
                </div>
                
                <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono text-right">
                  ID: {report.trackingId} • {report.timestamp ? new Date(report.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}