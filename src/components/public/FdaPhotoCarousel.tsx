import React, { useState, useEffect, useRef } from 'react';
import { FDA_CAROUSEL_SLIDES, FDAPhotoSlide } from '../../assets/fdaPhotos';
import { ChevronLeft, ChevronRight, Play, Pause, ExternalLink, ShieldCheck, Camera, Sparkles } from 'lucide-react';

export const FdaPhotoCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = FDA_CAROUSEL_SLIDES;
  const currentSlide: FDAPhotoSlide = slides[currentIndex];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (isPlaying && !isHovered) {
      timerRef.current = setInterval(() => {
        nextSlide();
      }, 5500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPlaying, isHovered]);

  return (
    <div
      className="bg-forest-950/80 rounded-2xl p-4 sm:p-5 border border-forest-800/80 shadow-2xl relative overflow-hidden backdrop-blur-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-forest-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-forest-800/80 text-emerald-400 border border-forest-700">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider">
                FDA In Action • Field & Leadership
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live from fda.gov.lr
              </span>
            </div>
            <p className="text-[11px] text-forest-300">
              Official Photographic Archive • Forestry Development Authority
            </p>
          </div>
        </div>

        {/* Carousel Control Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Autoplay' : 'Resume Autoplay'}
            className="p-1.5 rounded-md bg-forest-900 hover:bg-forest-800 text-forest-300 hover:text-white transition border border-forest-800"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-gold-400" />}
          </button>
          <button
            onClick={prevSlide}
            title="Previous Photo"
            className="p-1.5 rounded-md bg-forest-900 hover:bg-forest-800 text-forest-300 hover:text-white transition border border-forest-800"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-bold text-forest-300 px-1">
            {currentIndex + 1}/{slides.length}
          </span>
          <button
            onClick={nextSlide}
            title="Next Photo"
            className="p-1.5 rounded-md bg-forest-900 hover:bg-forest-800 text-forest-300 hover:text-white transition border border-forest-800"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Slide Stage */}
      <div className="relative rounded-xl overflow-hidden bg-forest-950 aspect-[16/10] sm:aspect-[16/9] border border-forest-800 group shadow-inner">
        {/* Active Image */}
        <img
          key={currentSlide.id}
          src={currentSlide.image}
          alt={currentSlide.title}
          className="w-full h-full object-cover transition-all duration-700 ease-out transform group-hover:scale-102"
        />

        {/* Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="inline-flex items-center space-x-1.5 bg-forest-950/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-gold-500/40 text-[11px] font-bold text-gold-300 shadow">
            <Sparkles className="w-3 h-3 text-gold-400" />
            <span>{currentSlide.category}</span>
            <span className="text-forest-500">•</span>
            <span className="text-slate-300 font-medium">{currentSlide.badge}</span>
          </div>

          <a
            href={currentSlide.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Read official press release on fda.gov.lr"
            className="inline-flex items-center space-x-1 bg-forest-900/90 hover:bg-forest-800 backdrop-blur-md text-[11px] text-forest-200 hover:text-white px-2.5 py-1 rounded-full border border-forest-700 transition shadow"
          >
            <span>fda.gov.lr</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Bottom Content Caption Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 text-white">
          <h4 className="font-extrabold text-sm sm:text-base text-white leading-snug drop-shadow-md mb-1.5">
            {currentSlide.title}
          </h4>
          <p className="text-xs text-slate-200 line-clamp-3 sm:line-clamp-2 leading-relaxed drop-shadow">
            {currentSlide.caption}
          </p>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified GoL Official Record</span>
            </div>
            <a
              href={currentSlide.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300 font-semibold inline-flex items-center space-x-1 underline decoration-gold-400/50"
            >
              <span>View Source Article</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Animated Progress Bar when playing */}
        {isPlaying && !isHovered && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-forest-900/80">
            <div
              key={`progress-${currentIndex}`}
              className="h-full bg-gold-500 animate-[progress_5.5s_linear]"
              style={{
                animation: 'pulse 5.5s linear infinite'
              }}
            />
          </div>
        )}
      </div>

      {/* Slide Thumbnails Filmstrip */}
      <div className="mt-3.5 grid grid-cols-7 gap-1.5">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={slide.id}
              onClick={() => setCurrentIndex(idx)}
              title={slide.title}
              className={`relative rounded-lg overflow-hidden h-12 transition-all border ${
                isActive
                  ? 'border-gold-400 ring-2 ring-gold-400/50 scale-102 shadow-md'
                  : 'border-forest-800 opacity-60 hover:opacity-100 hover:border-forest-600'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              {isActive && (
                <div className="absolute inset-0 bg-gold-500/20 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Caption Footnote */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-forest-300">
        <span>Click any thumbnail to inspect FDA operational records</span>
        <span className="font-semibold text-slate-300">Forestry Development Authority • Liberia</span>
      </div>
    </div>
  );
};
