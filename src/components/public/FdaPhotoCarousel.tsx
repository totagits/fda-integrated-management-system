import React, { useState, useEffect, useRef } from 'react';
import { FDA_CAROUSEL_SLIDES, FDAPhotoSlide } from '../../assets/fdaPhotos';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const FdaPhotoCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
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
    if (!isHovered) {
      timerRef.current = setInterval(() => {
        nextSlide();
      }, 5000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isHovered]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-forest-600/40 bg-forest-950 group h-[440px] sm:h-[480px] lg:h-[530px] w-full flex flex-col justify-end"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Full-Frame Authentic FDA Photo - Crystal Clear & Unobstructed */}
      <img
        key={currentSlide.id}
        src={currentSlide.image}
        alt={currentSlide.title}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out transform group-hover:scale-102"
      />

      {/* Subtle Bottom Gradient for Minimal Caption Legibility */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />

      {/* Floating Left Navigation Arrow */}
      <button
        onClick={prevSlide}
        title="Previous Photo"
        aria-label="Previous Slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-forest-950/70 hover:bg-forest-900 text-white backdrop-blur-md border border-white/20 transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-lg z-10"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Floating Right Navigation Arrow */}
      <button
        onClick={nextSlide}
        title="Next Photo"
        aria-label="Next Slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-forest-950/70 hover:bg-forest-900 text-white backdrop-blur-md border border-white/20 transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-lg z-10"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Clean, Non-Cluttered Bottom Bar with Title and Dots */}
      <div className="relative z-10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="max-w-md sm:max-w-lg">
          <p className="text-xs sm:text-sm font-bold text-white drop-shadow leading-snug line-clamp-1">
            {currentSlide.title}
          </p>
        </div>

        {/* Minimalist Slide Dots */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-6 bg-gold-400 shadow'
                  : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
