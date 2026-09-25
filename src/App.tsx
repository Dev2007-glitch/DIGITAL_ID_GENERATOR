
import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Media refs
  const heroImgRef = useRef<HTMLImageElement>(null);
  const vidExplodeRef = useRef<HTMLVideoElement>(null);
  const vidZoomRef = useRef<HTMLVideoElement>(null);
  const vidSCurveRef = useRef<HTMLVideoElement>(null);

  // Text refs
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  const text1Ref = useRef<HTMLDivElement>(null);
  const text2Ref = useRef<HTMLDivElement>(null);
  const text3Ref = useRef<HTMLDivElement>(null);
  const text4Ref = useRef<HTMLDivElement>(null);
  const text5Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const { top, height } = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate overall progress from 0 to 1
      // top goes from 0 to -(height - windowHeight)
      const maxScroll = height - windowHeight;
      let progress = -top / maxScroll;
      progress = Math.max(0, Math.min(1, progress));

      // helper to map a sub-range [start, end] of progress to [0, 1]
      const mapRange = (val: number, start: number, end: number) => {
        if (val <= start) return 0;
        if (val >= end) return 1;
        return (val - start) / (end - start);
      };

      // 1. Title movement: Centered initially, moves left between 0% and 15%
      const titleProgress = mapRange(progress, 0, 0.15);
      if (titleContainerRef.current) {
        // Move from center (left 50%, translate -50%) to left (left 8%, translate 0%)
        titleContainerRef.current.style.left = `${50 - (titleProgress * 42)}%`;
        titleContainerRef.current.style.transform = `translateX(-${50 - (titleProgress * 50)}%)`;
      }

      // 2. Media transitions
      // 0-15%: Hero Image
      // 15-40%: Explode Video
      // 40-60%: Zoom Video
      // 60-100%: SCurve Video

      if (heroImgRef.current) {
        heroImgRef.current.style.opacity = progress < 0.15 ? "1" : "0";
      }

      if (vidExplodeRef.current) {
        const explodeP = mapRange(progress, 0.15, 0.40);
        vidExplodeRef.current.style.opacity = (progress >= 0.12 && progress < 0.40) ? "1" : "0";
        if (vidExplodeRef.current.duration) {
          vidExplodeRef.current.currentTime = explodeP * vidExplodeRef.current.duration;
        }
      }

      if (vidZoomRef.current) {
        const zoomP = mapRange(progress, 0.40, 0.60);
        vidZoomRef.current.style.opacity = (progress >= 0.40 && progress < 0.60) ? "1" : "0";
        if (vidZoomRef.current.duration) {
          vidZoomRef.current.currentTime = zoomP * vidZoomRef.current.duration;
        }
      }

      if (vidSCurveRef.current) {
        const sCurveP = mapRange(progress, 0.60, 1.0);
        vidSCurveRef.current.style.opacity = progress >= 0.60 ? "1" : "0";
        if (vidSCurveRef.current.duration) {
          vidSCurveRef.current.currentTime = sCurveP * vidSCurveRef.current.duration;
        }
      }

      // 3. Text Fades
      const updateText = (ref: React.RefObject<HTMLDivElement | null>, start: number, mid: number, end: number) => {
        if (!ref.current) return;
        let opacity = 0;
        if (progress >= start && progress < mid) {
          opacity = mapRange(progress, start, mid);
        } else if (progress >= mid && progress <= end) {
          opacity = 1 - mapRange(progress, mid, end);
        }
        // Special case for the last text, stay visible at the end
        if (end >= 1.0 && progress >= mid) {
            opacity = 1;
            if(progress >= 0.95) opacity = 1; 
        }
        ref.current.style.opacity = opacity.toString();
        ref.current.style.transform = `translateY(${(1 - opacity) * 20}px)`;
      };

      // 0–15% 
      updateText(text1Ref, 0, 0.05, 0.15);
      // 15–40%
      updateText(text2Ref, 0.15, 0.25, 0.40);
      // 40–60%
      updateText(text3Ref, 0.40, 0.50, 0.60);
      // 60–80%
      updateText(text4Ref, 0.60, 0.70, 0.80);
      // 80–100%
      updateText(text5Ref, 0.80, 0.90, 1.0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[600vh] bg-[#050505]">
      {/* Sticky Container */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden bg-[#050505]">
        
        {/* MEDIA LAYERS */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          <img 
            ref={heroImgRef}
            src="/Digitalidgenimg.jpg" 
            alt="Assembled Phone" 
            className="absolute w-full h-full object-cover transition-opacity duration-300"
          />
          <video 
            ref={vidExplodeRef}
            src="/exploring techs.mp4"
            muted playsInline preload="auto"
            className="absolute w-full h-full object-cover opacity-0 transition-opacity duration-300"
          />
          <video 
            ref={vidZoomRef}
            src="/zoom in.mp4"
            muted playsInline preload="auto"
            className="absolute w-full h-full object-cover opacity-0 transition-opacity duration-300"
          />
          <video 
            ref={vidSCurveRef}
            src="/s curve.mp4"
            muted playsInline preload="auto"
            className="absolute w-full h-full object-cover opacity-0 transition-opacity duration-300"
          />
        </div>

        {/* GRADIENT OVERLAYS (Optional, for text readability) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />

        {/* TYPOGRAPHY OVERLAYS */}
        
        {/* Main Title (Moves Left) */}
        <div 
          ref={titleContainerRef} 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-max z-10 transition-all duration-75"
          style={{ willChange: "transform, left" }}
        >
          <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold tracking-tight text-white drop-shadow-2xl">
            Digital ID Generator
          </h1>
        </div>

        {/* Text 1: 0-15% */}
        <div ref={text1Ref} className="absolute top-1/3 left-1/2 -translate-x-1/2 mt-12 md:mt-16 text-center opacity-0 transition-all duration-75 w-full max-w-2xl px-4">
          <p className="text-xl md:text-3xl text-white/80 font-medium">
            A smarter way to carry your student identity.
          </p>
        </div>

        {/* Left Aligned Texts for the rest of the sequence */}
        <div className="absolute top-1/2 left-[8%] -translate-y-1/2 w-full max-w-md z-10">
          
          {/* Text 2: 15-40% */}
          <div ref={text2Ref} className="absolute top-0 left-0 opacity-0 transition-all duration-75">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Built from the<br/>inside out.
            </h2>
            <p className="text-lg text-white/60">
              Premium components designed to house your digital presence.
            </p>
          </div>

          {/* Text 3: 40-60% */}
          <div ref={text3Ref} className="absolute top-0 left-0 opacity-0 transition-all duration-75">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Precision.<br/>Security.<br/>Simplicity.
            </h2>
            <p className="text-lg text-white/60">
              The central integrated circuit powers it all.
            </p>
          </div>

          {/* Text 4: 60-80% */}
          <div ref={text4Ref} className="absolute top-0 left-0 opacity-0 transition-all duration-75">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              One platform.<br/>Every student ID.
            </h2>
            <p className="text-lg text-white/60">
              Generate any fictional college or university card on demand.
            </p>
          </div>

          {/* Text 5: 80-100% */}
          <div ref={text5Ref} className="absolute top-0 left-0 opacity-0 transition-all duration-75">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Your identity,<br/>beautifully digital.
            </h2>
            <Link href="/dashboard">
              <button className="mt-8 bg-white text-black px-8 py-3 rounded-full text-base font-semibold hover:bg-gray-200 transition-colors">
                Start Generating
              </button>
            </Link>
          </div>
          
        </div>

      </div>
    </div>
  );
}
