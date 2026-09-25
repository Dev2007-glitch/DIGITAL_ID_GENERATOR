import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [view, setView] = useState('create');
  
  // Form State
  const [college, setCollege] = useState('');
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  
  // Verification State
  const [verifyId, setVerifyId] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<null | 'VERIFIED' | 'INVALID'>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getTemplate = () => {
    const c = college.toLowerCase();
    if (c.includes('vignan') || c.includes('vfstr')) return 'vignan';
    if (c.includes('vvit')) return 'vvit';
    if (c.includes('vit')) return 'vit';
    if (c.includes('jntua')) return 'jntua';
    if (c.includes('priyadarshini')) return 'priyadarshini';
    if (c.includes('du') || c.includes('delhi')) return 'du';
    return 'default';
  };
  
  const getLogo = (c: string) => {
    const name = c.toLowerCase();
    if (name.includes('vit')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/Vellore_Institute_of_Technology_seal_2017.svg/1200px-Vellore_Institute_of_Technology_seal_2017.svg.png';
    if (name.includes('vignan')) return 'https://vignan.ac.in/images/vignan-logo.png';
    if (name.includes('vvit')) return 'https://www.vvitguntur.com/images/logo.png';
    if (name.includes('jntua')) return 'https://upload.wikimedia.org/wikipedia/en/8/87/Jawaharlal_Nehru_Technological_University%2C_Anantapur_logo.png';
    if (name.includes('du')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Delhi_University_logo.svg/1200px-Delhi_University_logo.svg.png';
    if (name.includes('priyadarshini')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Priyadarshini_College_of_Engineering_Logo.jpg/220px-Priyadarshini_College_of_Engineering_Logo.jpg';
    return null;
  };
  
  const templateKey = getTemplate();
  const collegeLogo = getLogo(college);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0A0A0C]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-black group-hover:border-white transition-colors">
              <div className="w-3 h-3 bg-white rounded-full transition-transform group-hover:scale-110"></div>
            </div>
            <span className="text-sm font-semibold tracking-[0.2em] uppercase">IDStream (React)</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xs font-semibold tracking-widest text-white/50 hover:text-white uppercase">Sign Out</Link>
            <div className="w-10 h-10 rounded-full border border-white/20 bg-white/5 overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-full h-full opacity-80" alt="Profile" />
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 max-w-[1600px] mx-auto w-full h-[calc(100vh-80px)] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/10 bg-[#050505] flex flex-col py-8 px-4 h-full shrink-0">
          <div className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-6 px-4">Menu</div>
          <nav className="space-y-2 flex-1">
            <button onClick={() => setView('create')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${view === 'create' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}>
              Create Card
            </button>
            <button onClick={() => setView('verify')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${view === 'verify' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}>
              Verify a card
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex overflow-hidden">
          {view === 'create' ? (
             <div className="flex w-full h-full">
                <div className="w-[500px] border-r border-white/10 bg-[#0A0A0C] flex flex-col h-full overflow-y-auto p-8">
                   <h2 className="text-2xl font-bold mb-6">Generate Card</h2>
                   
                   <div className="space-y-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">College Selection</label>
                        <div className="grid grid-cols-2 gap-2">
                           {['VIT', 'Vignan', 'VVIT', 'JNTUA', 'DU', 'Priyadarshini'].map(col => (
                              <button key={col} onClick={() => setCollege(col)} className={`text-xs font-bold py-3 rounded-lg border transition-colors ${college === col ? 'bg-white text-black border-white' : 'bg-[#050505] text-white/60 border-white/10 hover:border-white/40'}`}>
                                {col}
                              </button>
                           ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3" placeholder="e.g. John Doe" />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">Registration No.</label>
                        <input type="text" value={regNo} onChange={e => setRegNo(e.target.value)} className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3" placeholder="e.g. 21BCE0001" />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">Photo</label>
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3" />
                      </div>
                   </div>
                </div>
                
                <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[#050505] flex flex-col items-center justify-center relative p-8 perspective-1000">
                   <div className="text-white font-bold text-xl mb-8 flex items-center justify-between w-full max-w-[300px]">
                      <span>Live Preview</span>
                      <button onClick={() => setIsFlipped(!isFlipped)} className="text-xs bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors">
                        Flip Card
                      </button>
                   </div>
                   
                   {/* Simplified React Template Card for Demo */}
                   <div className={`w-[300px] aspect-[1/1.586] relative transition-all duration-700 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                      {/* Front of Card */}
                      <div className="absolute inset-0 bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-200 text-black flex flex-col items-center pt-8 backface-hidden">
                        <div className="w-[100px] h-[130px] bg-gray-100 border-2 border-gray-300 rounded overflow-hidden flex items-center justify-center mb-4">
                          {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" alt="Student" /> : <span className="text-gray-400 text-xs">Photo</span>}
                        </div>
                        <h3 className="text-xl font-black uppercase text-center px-4 w-full truncate">{name || 'STUDENT NAME'}</h3>
                        <p className="text-sm font-bold text-gray-700">{regNo || 'REG NUMBER'}</p>
                        
                        <div className="mt-auto w-full h-12 bg-blue-900 flex items-center justify-center gap-2 px-4">
                           {collegeLogo ? (
                             <img src={collegeLogo} className="h-8 object-contain" alt="Logo" />
                           ) : (
                             <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">🏫</div>
                           )}
                           <span className="text-white font-bold uppercase tracking-widest truncate">{college || 'COLLEGE'}</span>
                        </div>
                      </div>

                      {/* Back of Card */}
                      <div className="absolute inset-0 bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-200 text-black flex flex-col items-center p-6 backface-hidden rotate-y-180">
                         <div className="w-full h-8 bg-gray-200 mb-6"></div>
                         <h4 className="font-bold uppercase tracking-widest text-sm mb-4">Scan for Portal</h4>
                         <div className="bg-white p-2 border border-gray-200 rounded-lg">
                           <QRCodeSVG value={`https://portal.${college.toLowerCase().replace(/\s+/g, '') || 'university'}.edu/${regNo}`} size={120} />
                         </div>
                         <div className="mt-auto text-[10px] text-gray-500 text-center">
                           Property of {college || 'University'}. <br/> If found, please return to the administration block.
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          ) : (
             <div className="w-full h-full flex flex-col p-12">
                <h2 className="text-3xl font-bold mb-8">Verify a Card</h2>
                <div className="flex gap-4 max-w-md">
                   <input type="text" value={verifyId} onChange={e => setVerifyId(e.target.value)} placeholder="Enter Reg Number" className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-4 py-3" />
                   <button onClick={() => {
                     if (verifyId && verifyId === regNo) {
                       setVerifyStatus('VERIFIED');
                     } else {
                       setVerifyStatus('INVALID');
                     }
                   }} className="bg-white text-black px-6 rounded-xl font-bold">Verify</button>
                </div>
                {verifyStatus === 'VERIFIED' && (
                  <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl max-w-md">
                    <h3 className="text-emerald-400 font-bold text-xl">VERIFIED ACTIVE STUDENT</h3>
                    <p className="text-white/70 mt-2">Registration Number: {verifyId}</p>
                    <p className="text-white/50 text-sm mt-1">Name: {name}</p>
                  </div>
                )}
                {verifyStatus === 'INVALID' && (
                  <div className="mt-8 p-6 bg-red-500/10 border border-red-500/30 rounded-xl max-w-md">
                    <h3 className="text-red-400 font-bold text-xl">NOT VERIFIED / NO LOGIN</h3>
                    <p className="text-white/70 mt-2">Registration Number: {verifyId} not found in active records.</p>
                  </div>
                )}
             </div>
          )}
        </main>
      </div>
    </div>
  );
}
