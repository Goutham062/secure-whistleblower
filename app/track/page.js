"use client"
import { useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

export default function TrackReport() {
  const [inputID, setInputID] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);

    try {
      // Query Firebase for the specific trackingId
      const q = query(collection(db, "reports"), where("trackingId", "==", inputID.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Found it!
        const docData = querySnapshot.docs[0].data();
        setReport(docData);
      } else {
        setError("Report not found. Please check your ID.");
      }
    } catch (err) {
      console.error(err);
      setError("System error. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <Link href="/" className="text-sm text-gray-500 hover:underline mb-4 block">← Back to Home</Link>
        <h1 className="text-2xl font-bold mb-6 text-gray-800">🔍 Track Your Status</h1>
        
        <form onSubmit={handleSearch} className="mb-6">
          <label className="block mb-2 font-bold text-gray-700">Enter Tracking ID</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. WB-X9Z2"
              value={inputID}
              onChange={(e) => setInputID(e.target.value.toUpperCase())}
              className="border p-3 w-full rounded uppercase tracking-widest text-black"
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? "..." : "Check"}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>

        {report && (
          <div className="border-t pt-6">
            <h2 className="text-lg font-bold mb-4">Report Details</h2>
            <div className="bg-gray-50 p-4 rounded border">
              <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-gray-700">Status:</span>
                 <span className={`px-2 py-1 rounded text-sm font-bold ${report.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                   {report.status}
                 </span>
              </div>
              <p className="text-gray-600 mb-2"><span className="font-bold">Category:</span> {report.category}</p>
              <p className="text-gray-600 text-sm"><span className="font-bold">Submitted:</span> {new Date(report.timestamp.seconds * 1000).toLocaleDateString()}</p>
              
              <div className="mt-4 p-3 bg-white border rounded">
                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Admin Note:</p>
                <p className="text-gray-700 italic">
                  {report.adminNote || "No updates from the moderation team yet."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}