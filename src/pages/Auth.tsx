import React from 'react';
import { Link } from 'react-router-dom';

export default function Auth() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black font-sans">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-60">
        <source src="/login.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md p-10 bg-[#0A0A0C]/80 backdrop-blur-xl rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.05)] border border-white/10">
        <div className="text-center mb-10">
          <div className="w-12 h-12 mx-auto rounded-full border border-white/20 flex items-center justify-center bg-black mb-6">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-[0.2em] uppercase mb-2">IDStream</h2>
          <p className="text-white/40 text-xs tracking-widest uppercase">Secure Authentication</p>
        </div>

        <form className="space-y-6" onSubmit={e => e.preventDefault()}>
          <div className="space-y-4">
            <input type="email" placeholder="Institutional Email" required className="w-full bg-[#050505] border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors" />
            <input type="password" placeholder="Password" required className="w-full bg-[#050505] border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors" />
          </div>

          <Link href="/dashboard" className="block w-full">
            <button type="button" className="w-full bg-white text-black font-bold text-sm tracking-widest uppercase rounded-xl py-4 mt-4 hover:bg-gray-200 transition-colors">
              Access Portal
            </button>
          </Link>

          <div className="text-center pt-6 border-t border-white/10">
            <p className="text-white/50 text-xs">
              Need access? <Link href="/signup" className="text-white hover:underline ml-1 font-semibold">Sign Up</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
