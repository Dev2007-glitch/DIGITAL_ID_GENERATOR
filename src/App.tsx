import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Media refs
  const heroImgRef = useRef<HTMLImageElement>(null);
  const vidExplodeRef = useRef<HTMLVideoElement>(null);
  const vidZoomRef = useRef<HTMLVideoElement>(null);
  const vidSCurveRef = useRef<HTMLVideoElement>(null);

  // FX & text refs
  const lightFlareRef = useRef<HTMLDivElement>(null);
  const magicStatementRef = useRef<HTMLDivElement>(null);
  const generateTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const heroImg = heroImgRef.current;
    const vidExplode = vidExplodeRef.current;
    const vidZoom = vidZoomRef.current;
    const vidSCurve = vidSCurveRef.current;
    const lightFlare = lightFlareRef.current;
    const magicStatement = magicStatementRef.current;
    const generateText = generateTextRef.current;

    // Prime videos to first frame so scrubbing is instant
    const videos = [vidExplode, vidZoom, vidSCurve];
    videos.forEach((vid) => {
      if (vid) {
        vid.currentTime = 0.01;
        vid.pause();
      }
    });

    let targetProgress = 0;
    let currentProgress = 0;
    let animFrameId: number;

    const mapRange = (val: number, start: number, end: number) => {
      if (val <= start) return 0;
      if (val >= end) return 1;
      return (val - start) / (end - start);
    };

    const handleScroll = () => {
      if (!container) return;
      const { top, height } = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const maxScroll = height - windowHeight;
      if (maxScroll <= 0) return;

      const p = -top / maxScroll;
      targetProgress = Math.max(0, Math.min(1, p));
    };

    const scrubVideo = (
      vid: HTMLVideoElement | null,
      pStart: number,
      pEnd: number,
      progress: number,
      stayVisibleAfter = false
    ) => {
      if (!vid) return;

      const isActive =
        (progress >= pStart && progress < pEnd) ||
        (stayVisibleAfter && progress >= pEnd);

      vid.style.opacity = isActive ? "1" : "0";

      if (isActive && vid.duration && vid.readyState >= 2) {
        const p = mapRange(progress, pStart, pEnd);
        // Smoothstep easing for silky smooth scrub
        const easeP = p * p * (3 - 2 * p);
        const targetTime = easeP * vid.duration;

        if (Math.abs(vid.currentTime - targetTime) > 0.008) {
          vid.currentTime = targetTime;
        }
      }
    };

    const render = () => {
      // Smooth lerp factor for fluid inertia scroll
      currentProgress += (targetProgress - currentProgress) * 0.04;

      const progress = currentProgress;

      // 1. LIGHT FLARE (0.00 - 0.25)
      if (lightFlare) {
        if (progress > 0.0 && progress < 0.25) {
          const flareP = mapRange(progress, 0.0, 0.25);
          lightFlare.style.transform = `translateX(${-100 + flareP * 200}%)`;

          let flareOp = 1;
          if (flareP < 0.2) flareOp = flareP / 0.2;
          if (flareP > 0.8) flareOp = (1 - flareP) / 0.2;
          lightFlare.style.opacity = flareOp.toString();
        } else {
          lightFlare.style.opacity = "0";
        }
      }

      // 2. HERO IMAGE (0.00 - 0.25)
      if (heroImg) {
        heroImg.style.opacity = progress < 0.25 ? "1" : "0";
      }

      // 3. EXPLODE PHONE VIDEO (0.25 - 0.45)
      scrubVideo(vidExplode, 0.25, 0.45, progress);

      // 4. ZOOM INTO IC VIDEO (0.45 - 0.65)
      scrubVideo(vidZoom, 0.45, 0.65, progress);

      // 5. S-CURVE VIDEO (0.65 - 1.00)
      scrubVideo(vidSCurve, 0.65, 1.0, progress, true);

      // 6. MAGIC STATEMENT (0.70 - 0.88)
      if (magicStatement) {
        let magicOp = 0;
        let dropY = -50;

        if (progress >= 0.7 && progress < 0.76) {
          const p = mapRange(progress, 0.7, 0.76);
          magicOp = p;
          dropY = -50 * (1 - p);
        } else if (progress >= 0.76 && progress < 0.82) {
          magicOp = 1;
          dropY = 0;
        } else if (progress >= 0.82 && progress < 0.88) {
          const p = mapRange(progress, 0.82, 0.88);
          magicOp = 1 - p;
          dropY = 0;
        }

        magicStatement.style.opacity = magicOp.toString();
        magicStatement.style.transform = `translateY(${dropY}vh)`;
      }

      // 7. GENERATE CALL TO ACTION (0.88 - 1.00)
      if (generateText) {
        const textOpacity = mapRange(progress, 0.88, 1.0);
        generateText.style.opacity = textOpacity.toString();
        generateText.style.transform = `translateY(${(1 - textOpacity) * 30}px)`;
      }

      animFrameId = requestAnimationFrame(render);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    render();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <div className="bg-[#050505] text-white font-sans">
      {/* Header Navigation */}
      <header className="fixed top-0 inset-x-0 z-50 flex justify-between items-center px-8 md:px-12 py-6 pointer-events-auto mix-blend-difference">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center backdrop-blur-md group-hover:border-white transition-colors duration-300">
            <div className="w-3 h-3 bg-white rounded-full transition-transform duration-300 group-hover:scale-110"></div>
          </div>
          <span className="text-lg font-medium tracking-[0.25em] text-white uppercase">
            IDStream
          </span>
        </Link>

        {/* Auth Buttons */}
        <div className="flex items-center gap-8">
          <Link
            to="/auth"
            className="text-sm font-medium tracking-wide text-white hover:text-gray-300 transition-colors duration-300 hidden md:block"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="text-sm font-medium tracking-wide bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 px-6 py-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Register First
          </Link>
        </div>
      </header>

      {/* Scroll Container */}
      <div
        ref={containerRef}
        id="scroll-container"
        className="relative w-full h-[1000vh] bg-[#050505]"
      >
        {/* Pinned Section */}
        <div className="sticky top-0 left-0 w-full h-screen overflow-hidden bg-[#050505]">
          {/* Video & Image Layers */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none bg-black">
            <img
              ref={heroImgRef}
              id="hero-img"
              src="/Digitalidgenimg.jpg"
              alt="Hero"
              className="absolute w-full h-full object-cover transition-opacity duration-200"
            />
            <video
              ref={vidExplodeRef}
              id="vid-explode"
              src="/exploring techs.mp4"
              muted
              playsInline
              preload="auto"
              className="absolute w-full h-full object-cover opacity-0 transition-opacity duration-200"
            />
            <video
              ref={vidZoomRef}
              id="vid-zoom"
              src="/zoom in.mp4"
              muted
              playsInline
              preload="auto"
              className="absolute w-full h-full object-cover opacity-0 transition-opacity duration-200"
            />
            <video
              ref={vidSCurveRef}
              id="vid-scurve"
              src="/s curve.mp4"
              muted
              playsInline
              preload="auto"
              className="absolute w-full h-full object-cover opacity-0 transition-opacity duration-200"
            />

            {/* Lighting Effects */}
            <div
              ref={lightFlareRef}
              id="light-flare"
              className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-0"
              style={{
                background:
                  "linear-gradient(135deg, transparent 15%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,1) 45%, rgba(255,255,255,1) 55%, rgba(255,255,255,0.4) 70%, transparent 85%)",
                willChange: "transform, opacity",
                transform: "translateX(-100%)",
              }}
            />
          </div>

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none" />

          {/* Video Watermark Obscurer (Bottom Right) */}
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#050505] blur-2xl z-20 pointer-events-none rounded-tl-full" />

          {/* Magic Statement during S-Curve */}
          <div
            ref={magicStatementRef}
            id="magic-statement"
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 opacity-0"
            style={{ willChange: "opacity, transform" }}
          >
            <h2 className="text-4xl md:text-6xl font-medium tracking-wide text-white drop-shadow-2xl">
              Seamless. Secure. Identity.
            </h2>
          </div>

          {/* Generate Call to Action (Right Side) */}
          <div
            ref={generateTextRef}
            id="generate-text"
            className="absolute inset-y-0 right-[8%] w-full max-w-lg z-20 pointer-events-none flex flex-col justify-center text-right opacity-0"
            style={{ willChange: "opacity, transform" }}
          >
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
              Generate
            </h2>
            <p className="text-2xl text-white/80 drop-shadow-md">
              Create your digital student identity in seconds.
            </p>
            <div className="mt-8 pointer-events-auto flex justify-end">
              <Link
                to="/signup"
                className="inline-block bg-white text-black px-10 py-4 rounded-full text-lg font-semibold hover:bg-gray-200 transition-colors shadow-lg"
              >
                Start Generating
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="relative w-full bg-[#050505] text-white/50 py-24 px-8 md:px-12 border-t border-white/10 z-40">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6 opacity-80">
              <div className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="text-base font-medium tracking-[0.25em] text-white uppercase">
                IDStream
              </span>
            </div>
            <p className="text-sm max-w-sm leading-relaxed">
              The next generation of seamless, secure digital identity. Powered
              by advanced cryptographic layers and cinematic user experiences.
            </p>
          </div>
          <div>
            <h4 className="text-white/90 text-xs font-semibold tracking-widest uppercase mb-6">
              Platform
            </h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href="#scroll-container" className="hover:text-white transition-colors">
                  Hardware Tech
                </a>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">
                  Security
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white/90 text-xs font-semibold tracking-widest uppercase mb-6">
              Account
            </h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link to="/auth" className="hover:text-white transition-colors">
                  Log In
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Create Digital ID
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs pt-8 border-t border-white/10">
          <p>&copy; 2026 IDStream. All rights reserved.</p>
          <div className="flex gap-8 mt-4 md:mt-0">
            <span className="hover:text-white transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-white transition-colors cursor-pointer">
              Terms of Service
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
