"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";

// Adapted from the "Circular Testimonials" component by maxim.bort.devel on
// 21st.dev (https://21st.dev/@maxim.bort.devel/components/circular-testimonials).
// Reworked to fit this codebase: Tailwind + design tokens instead of styled-jsx,
// inline SVG arrows instead of react-icons, and CSS keyframes (blur-in /
// testimonial-in) instead of framer-motion — so it stays dependency-free and
// honors prefers-reduced-motion via the global rule in globals.css.

interface Testimonial {
  quote: string;
  name: string;
  designation: string;
  src: string;
}
interface Colors {
  name?: string;
  designation?: string;
  testimony?: string;
  arrowBackground?: string;
  arrowForeground?: string;
  arrowHoverBackground?: string;
}
interface FontSizes {
  name?: string;
  designation?: string;
  quote?: string;
}
interface CircularTestimonialsProps {
  testimonials: Testimonial[];
  autoplay?: boolean;
  autoplayInterval?: number;
  colors?: Colors;
  fontSizes?: FontSizes;
}

function ArrowIcon({ dir, color }: { dir: "left" | "right"; color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {dir === "left" ? <path d="M19 12H5M12 19l-7-7 7-7" /> : <path d="M5 12h14M12 5l7 7-7 7" />}
    </svg>
  );
}

const SIDE_CARD_SCALE = 0.85;
// rotateY + perspective swing the card's near edge outside its scaled box, so
// the painted result is wider than the maths above predicts. The excess grows
// with the card, so reserve it as a fraction of the width rather than a fixed
// number of pixels — measured at ~1.5% on a 360px phone and ~3% at 640px.
const PERSPECTIVE_BULGE_RATIO = 0.05;

// The horizontal offset of the side cards scales gently with container width.
function calculateGap(width: number) {
  const minWidth = 1024;
  const maxWidth = 1456;
  const minGap = 60;
  const maxGap = 86;
  if (width <= minWidth) return minGap;
  if (width >= maxWidth) return Math.max(minGap, maxGap + 0.06018 * (width - maxWidth));
  return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
}

// The side cards translate outward by `gap`. On a phone the container is the
// full column width, so that offset pushed them past the page edge and gave the
// whole document a horizontal scrollbar — which is what forced visitors to
// pinch out. Cap the offset by the room that actually exists between the
// container and the viewport edges; roomy (desktop) layouts keep the full gap.
function fitGapToViewport(gap: number, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const slack = Math.min(rect.left, document.documentElement.clientWidth - rect.right);
  // A scaled-down card already sits this far inside each edge of the container.
  const inset = (rect.width * (1 - SIDE_CARD_SCALE)) / 2;
  return Math.max(0, Math.min(gap, inset + slack - rect.width * PERSPECTIVE_BULGE_RATIO));
}

export function CircularTestimonials({
  testimonials,
  autoplay = true,
  autoplayInterval = 6000,
  colors = {},
  fontSizes = {},
}: CircularTestimonialsProps) {
  const colorName = colors.name ?? "#000";
  const colorDesignation = colors.designation ?? "#6b7280";
  const colorTestimony = colors.testimony ?? "#4b5563";
  const colorArrowBg = colors.arrowBackground ?? "#141414";
  const colorArrowFg = colors.arrowForeground ?? "#f1f1f7";
  const colorArrowHoverBg = colors.arrowHoverBackground ?? "#00a6fb";
  const fontSizeName = fontSizes.name ?? "1.5rem";
  const fontSizeDesignation = fontSizes.designation ?? "0.925rem";
  const fontSizeQuote = fontSizes.quote ?? "1.125rem";

  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverPrev, setHoverPrev] = useState(false);
  const [hoverNext, setHoverNext] = useState(false);
  const [gap, setGap] = useState(() => calculateGap(1200));

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const autoplayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const testimonialsLength = useMemo(() => testimonials.length, [testimonials]);
  const activeTestimonial = useMemo(
    () => testimonials[activeIndex],
    [activeIndex, testimonials]
  );

  useEffect(() => {
    function handleResize() {
      const el = imageContainerRef.current;
      if (el) setGap(fitGapToViewport(calculateGap(el.offsetWidth), el));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % testimonialsLength);
    if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
  }, [testimonialsLength]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + testimonialsLength) % testimonialsLength);
    if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
  }, [testimonialsLength]);

  useEffect(() => {
    if (!autoplay) return;
    autoplayIntervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonialsLength);
    }, autoplayInterval);
    return () => {
      if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
    };
  }, [autoplay, autoplayInterval, testimonialsLength]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handlePrev, handleNext]);

  // Show three cards at a time: center (active), and the immediate left/right
  // peeking behind it; everything else is hidden.
  function getImageStyle(index: number): React.CSSProperties {
    const maxStickUp = gap * 0.8;
    const isActive = index === activeIndex;
    const isLeft = (activeIndex - 1 + testimonialsLength) % testimonialsLength === index;
    const isRight = (activeIndex + 1) % testimonialsLength === index;
    const transition = "all 0.8s cubic-bezier(.4,2,.3,1)";
    if (isActive) {
      return { zIndex: 3, opacity: 1, pointerEvents: "auto", transform: "translateX(0px) translateY(0px) scale(1) rotateY(0deg)", transition };
    }
    if (isLeft) {
      return { zIndex: 2, opacity: 1, pointerEvents: "auto", transform: `translateX(-${gap}px) translateY(-${maxStickUp}px) scale(${SIDE_CARD_SCALE}) rotateY(15deg)`, transition };
    }
    if (isRight) {
      return { zIndex: 2, opacity: 1, pointerEvents: "auto", transform: `translateX(${gap}px) translateY(-${maxStickUp}px) scale(${SIDE_CARD_SCALE}) rotateY(-15deg)`, transition };
    }
    return { zIndex: 1, opacity: 0, pointerEvents: "none", transition };
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="grid gap-12 md:grid-cols-2 md:gap-20">
        {/* Stacked, rotating image cards */}
        <div className="relative h-80 w-full [perspective:1000px] sm:h-96" ref={imageContainerRef}>
          {testimonials.map((testimonial, index) => (
            // Demo avatars are remote for now; plain <img> avoids next/image
            // domain config and is swapped for local photos later.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={testimonial.src}
              alt={testimonial.name}
              className="absolute inset-0 h-full w-full rounded-3xl object-cover shadow-elev-3"
              data-index={index}
              style={getImageStyle(index)}
            />
          ))}
        </div>

        {/* Quote + author + controls */}
        <div className="flex flex-col justify-between">
          {/* key remounts the block on change so the fade + blur-in replay */}
          <div key={activeIndex} className="animate-testimonial-in">
            <h3 className="font-bold leading-tight" style={{ color: colorName, fontSize: fontSizeName }}>
              {activeTestimonial.name}
            </h3>
            <p className="mb-6 mt-1" style={{ color: colorDesignation, fontSize: fontSizeDesignation }}>
              {activeTestimonial.designation}
            </p>
            <p className="leading-[1.75]" style={{ color: colorTestimony, fontSize: fontSizeQuote }}>
              {activeTestimonial.quote.split(" ").map((word, i) => (
                <span
                  key={i}
                  className="inline-block animate-blur-in"
                  style={{ animationDelay: `${Math.min(i * 0.02, 0.5)}s` }}
                >
                  {word}&nbsp;
                </span>
              ))}
            </p>
          </div>

          <div className="flex gap-5 pt-8 md:pt-0">
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-300"
              onClick={handlePrev}
              style={{ backgroundColor: hoverPrev ? colorArrowHoverBg : colorArrowBg }}
              onMouseEnter={() => setHoverPrev(true)}
              onMouseLeave={() => setHoverPrev(false)}
              aria-label="Previous testimonial"
            >
              <ArrowIcon dir="left" color={colorArrowFg} />
            </button>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-300"
              onClick={handleNext}
              style={{ backgroundColor: hoverNext ? colorArrowHoverBg : colorArrowBg }}
              onMouseEnter={() => setHoverNext(true)}
              onMouseLeave={() => setHoverNext(false)}
              aria-label="Next testimonial"
            >
              <ArrowIcon dir="right" color={colorArrowFg} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CircularTestimonials;
