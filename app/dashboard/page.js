"use client"
import { useEffect, useState } from 'react';
import { db } from '../../firebase'; 
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import Link from 'next/link';

// SVG Icons
const ShareIcon = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.66 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>;
const MapIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>;

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [safetyStatus, setSafetyStatus] = useState({ level: 'Safe', message: 'No major threats detected.', color: 'bg-green-100 border-green-500 text-green-800' });

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const reportsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
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

  // --- SAFETY PULSE ALGORITHM ---
  const analyzeSafetyLevel = (data) => {
    if (data.length === 0) return;

    const areaCounts = {}; 
    data.forEach(report => {
      const area = report.area || "Unknown";
      if (report.category === 'Harassment' || report.category === 'Suspicious Activity' || report.category === 'Chain Snatching') {
        if (!areaCounts[area]) areaCounts[area] = 0;
        areaCounts[area]++;
      }
    });

    let dangerousArea = null;
    let maxCount = 0;

    for (const [area, count] of Object.entries(areaCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dangerousArea = area;
      }
    }

    if (maxCount >= 3) {
      setSafetyStatus({
        level: 'CRITICAL',
        message: `⚠️ HIGH ALERT: Multiple incidents reported in ${dangerousArea}. Avoid this area alone.`,
        color: 'bg-red-50 border-red-200 text-red-900'
      });
    } else if (maxCount >= 2) {
      setSafetyStatus({
        level: 'WARNING',
        message: `✋ CAUTION: Recent activity reported in ${dangerousArea}. Stay alert.`,
        color: 'bg-orange-50 border-orange-200 text-orange-900'
      });
    } else {
      setSafetyStatus({
        level: 'NORMAL',
        message: 'Neighborhood activity is normal. Stay safe!',
        color: 'bg-emerald-50 border-emerald-200 text-emerald-800'
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Community Pulse</h1>
            <p className="text-slate-500 text-sm">Real-time safety updates from neighbors</p>
          </div>
          <Link href="/">
            <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition font-bold shadow-lg text-sm">
              + New Report
            </button>
          </Link>
        </div>

        {/* SAFETY ALERT BANNER */}
        {!loading && (
          <div className={`p-6 rounded-2xl border mb-8 flex items-start gap-4 shadow-sm ${safetyStatus.color}`}>
            <div className="text-3xl bg-white p-2 rounded-full shadow-sm">
              {safetyStatus.level === 'CRITICAL' ? '🚨' : safetyStatus.level === 'WARNING' ? '⚠️' : '🛡️'}
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wider opacity-90">{safetyStatus.level} STATUS</h2>
              <p className="font-medium mt-1 text-sm md:text-base">{safetyStatus.message}</p>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="space-y-4">
             {[1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse"></div>)}
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <div key={report.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition duration-300 relative overflow-hidden">
                
                {/* Status Badge */}
                <div className="absolute top-0 right-0 p-4">
                     <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${
                        report.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                     }`}>
                        {report.status}
                    </span>
                </div>

                <div className="pr-20">
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                    📍 {report.area || "Unknown Area"}
                    </span>
                    <h2 className="text-lg font-bold text-slate-800 mb-1">{report.category}</h2>
                    <p className="text-slate-600 text-sm leading-relaxed">{report.description}</p>
                </div>
                
                {/* Footer Actions */}
                <div className="mt-6 pt-4 border-t border-slate-50 flex flex-wrap gap-3 items-center justify-between">
                    
                    {/* Location Link */}
                    {report.location ? (
                    <a 
                        href={`https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-2 rounded-lg transition"
                    >
                        <MapIcon /> View Map
                    </a>
                    ) : (
                    <span className="text-xs text-slate-400 italic">No GPS data</span>
                    )}

                    <div className="flex gap-2">
                        {/* WHATSAPP SHARE BUTTON */}
                        <a 
                            href={`https://wa.me/?text=⚠️ *Safety Alert:* ${report.category} reported in ${report.area}.%0A%0ADescription: ${report.description}%0A%0AStay Safe! Check details on SecureWhistle.`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition flex items-center gap-1 border border-green-100"
                        >
                            <ShareIcon /> Share Alert
                        </a>
                    </div>
                </div>
                
                <div className="mt-2 text-[10px] text-slate-300 font-mono text-right">
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