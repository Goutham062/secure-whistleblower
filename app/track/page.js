"use client"
import { useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore'; 
import Link from 'next/link';

export default function TrackReport() {
  const [inputID, setInputID] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // State for the Verification Widget
  const [showVerification, setShowVerification] = useState(false);
  const [verificationStep, setVerificationStep] = useState(1);
  const [mockAadhaar, setMockAadhaar] = useState('');
  const [mockOTP, setMockOTP] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);

    try {
      const q = query(collection(db, "reports"), where("trackingId", "==", inputID.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // We store the actual Firestore Document ID as well
        const docRef = querySnapshot.docs[0];
        setReport({ id: docRef.id, ...docRef.data() });
      } else {
        setError("Report not found. Please check your ID.");
      }
    } catch (err) {
      console.error(err);
      setError("System error. Try again.");
    }
    setLoading(false);
  };

  // Handle the Zero-Knowledge Verification
  const handleVerifyAadhaar = async () => {
    if (verificationStep === 1) {
      if (mockAadhaar.length !== 12) return alert("Enter valid 12-digit Aadhaar");
      setVerificationStep(2); // Move to OTP step
    } else {
      if (mockOTP !== "123456") return alert("Invalid OTP. Use 123456 for demo.");
      
      setLoading(true);
      try {
        // We only update the status. We DO NOT save the Aadhaar number!
        await updateDoc(doc(db, "reports", report.id), {
          verificationStatus: 'Verified',
          verificationRequested: false,
          messages: arrayUnion({
            sender: "System Command",
            text: "✅ Victim has successfully verified their citizenship via UIDAI gateway.",
            timestamp: new Date().toISOString()
          })
        });
        
        // Update local state to hide widget
        setReport({...report, verificationStatus: 'Verified', verificationRequested: false});
        setShowVerification(false);
        alert("Identity Verified! Your Aadhaar data was NOT stored in our database.");
      } catch (err) {
        console.error("Verification failed", err);
      }
      setLoading(false);
    }
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

              {/* Secure Verification Widget */}
              {report.verificationRequested && report.verificationStatus !== 'Verified' && (
                <div className="mt-6 border-2 border-purple-500 rounded-lg p-5 bg-purple-50">
                  <h3 className="font-bold text-purple-800 flex items-center gap-2 mb-2">
                    🛡️ Action Required: Identity Verification
                  </h3>
                  <p className="text-sm text-purple-700 mb-4">
                    The admin requires you to verify your citizenship to escalate this report to law enforcement. 
                    <strong> Your Aadhaar number will NOT be stored in our database.</strong>
                  </p>
                  
                  {!showVerification ? (
                    <button onClick={() => setShowVerification(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold w-full hover:bg-purple-700 transition">
                      Start Secure Verification
                    </button>
                  ) : (
                    <div className="space-y-3 mt-4 bg-white p-4 rounded border border-purple-200">
                      {verificationStep === 1 ? (
                        <>
                          <label className="text-xs font-bold text-gray-600 uppercase">Enter Aadhaar Number</label>
                          <input type="text" maxLength="12" value={mockAadhaar} onChange={(e)=>setMockAadhaar(e.target.value)} placeholder="0000 0000 0000" className="w-full border p-2 rounded text-black" />
                        </>
                      ) : (
                        <>
                          <label className="text-xs font-bold text-gray-600 uppercase">Enter OTP sent to linked mobile</label>
                          <input type="text" maxLength="6" value={mockOTP} onChange={(e)=>setMockOTP(e.target.value)} placeholder="123456" className="w-full border p-2 rounded text-black" />
                          <p className="text-xs text-gray-500">Hint: Use 123456 for this demo.</p>
                        </>
                      )}
                      <button onClick={handleVerifyAadhaar} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold w-full hover:bg-green-700 mt-2 transition">
                        {loading ? "Verifying..." : verificationStep === 1 ? "Send OTP" : "Verify & Submit"}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}