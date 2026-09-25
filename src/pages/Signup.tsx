import React from 'react';
import { Link } from 'react-router-dom';

export default function Signup() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black font-sans">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-60">
        <source src="/SIGNUP.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md p-10 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white tracking-wider uppercase mb-2">Create Account</h2>
          <p className="text-white/60 text-sm">Join IDStream and generate your digital identity.</p>
        </div>

        <form className="space-y-6" onSubmit={e => e.preventDefault()}>
          <div className="space-y-4">
            <input type="text" placeholder="Full Name" required className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors" />
            <input type="email" placeholder="Email Address" required className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors" />
            <input type="password" placeholder="Password" required className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors" />
          </div>

          <Link href="/dashboard" className="block w-full">
            <button type="button" className="w-full bg-white text-black font-bold text-sm tracking-widest uppercase rounded-xl py-4 mt-2 hover:bg-gray-200 transition-colors shadow-lg">
              Sign Up
            </button>
          </Link>

          <div className="text-center mt-6">
            <p className="text-white/50 text-xs">
              Already have an account? <Link href="/auth" className="text-white hover:underline ml-1 font-semibold">Log In</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
