"use client"
import { useState } from 'react';
import { db } from '../../firebase'; 
import { collection, addDoc } from 'firebase/firestore'; 
import Link from 'next/link'; 

export default function GuardianApplication() {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    background: 'Civilian Expert', // Army, Police, Martial Artist
    fitness: 'High',
    skills: '', // Karate, Boxing, High IQ
    proofLink: '', // Google Drive link to documents
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "guardian_applications"), {
      ...formData,
      status: "Pending", // Admin must approve
      timestamp: new Date()
    });
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
      <div className="bg-slate-800 p-10 rounded-2xl border border-yellow-600 max-w-md">
        <div className="text-5xl mb-4">🛡️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Application Received</h1>
        <p className="text-slate-400 mb-6">Our team will verify your fitness, background, and skills. If approved, you will receive a <strong>Guardian Badge ID</strong> via email.</p>
        <Link href="/"><button className="bg-yellow-600 text-black font-bold px-6 py-2 rounded">Back Home</button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-extrabold text-yellow-500 mb-2">Join the Guardian Force</h1>
        <p className="text-slate-400 mb-8">We recruit only the best. Elite fitness, tactical intelligence, or defense background required.</p>

        <form onSubmit={handleSubmit} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 space-y-6">
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input type="text" required className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white" onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Background</label>
                <select className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white" onChange={e => setFormData({...formData, background: e.target.value})}>
                    <option>Civilian Expert</option>
                    <option>Retired Army</option>
                    <option>Retired Police</option>
                    <option>Private Security</option>
                    <option>Martial Artist</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Physical Fitness</label>
                <select className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white" onChange={e => setFormData({...formData, fitness: e.target.value})}>
                    <option>High (Athlete)</option>
                    <option>Elite (Special Forces)</option>
                    <option>Moderate</option>
                </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Special Skills (IQ, Martial Arts, etc.)</label>
            <textarea placeholder="e.g. Black belt in Karate, MENSA member, First Aid Certified..." className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white h-24" onChange={e => setFormData({...formData, skills: e.target.value})} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proof of Eligibility (Link)</label>
            <input type="text" placeholder="Google Drive/Dropbox link to Certificates/Videos" required className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white" onChange={e => setFormData({...formData, proofLink: e.target.value})} />
            <p className="text-[10px] text-slate-500 mt-1">Upload video of fitness test or photo of certificates.</p>
          </div>

          <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-4 rounded-xl transition shadow-lg shadow-yellow-900/20">
            Submit Application
          </button>

        </form>
      </div>
    </div>
  );
}