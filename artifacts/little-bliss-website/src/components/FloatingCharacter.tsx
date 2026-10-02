import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface FloatingCharacterProps {
  src: string;
  alt: string;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  topPosition?: string;
}

export function FloatingCharacter({ 
  src, 
  alt, 
  position = 'right',
  size = 'md',
  className = '',
  topPosition = 'top-1/2'
}: FloatingCharacterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  const sizeClasses = {
    sm: 'w-[60px] sm:w-[100px] md:w-[120px]',
    md: 'w-[80px] sm:w-[140px] md:w-[180px]',
    lg: 'w-[100px] sm:w-[180px] md:w-[240px]',
  };

  const positionClasses = {
    left: '-left-[8%] sm:-left-[5%] md:-left-[5%]',
    right: '-right-[8%] sm:-right-[5%] md:-right-[5%]',
  };

  return (
    <div ref={ref} className="relative">
      <motion.div
        initial={{ opacity: 0, x: position === 'right' ? 30 : -30, y: 20, rotate: position === 'right' ? 5 : -5 }}
        animate={isInView 
          ? { opacity: 1, x: 0, y: 0, rotate: 0 }
          : { opacity: 0, x: position === 'right' ? 30 : -30, y: 20, rotate: position === 'right' ? 5 : -5 }
        }
        transition={{ 
          duration: 0.7, 
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ willChange: 'transform, opacity' }}
        className={`absolute ${topPosition} -translate-y-1/2 ${positionClasses[position]} ${sizeClasses[size]} z-10 pointer-events-none ${className}`}
      >
        <div className="relative">
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="relative w-full h-auto object-contain drop-shadow-md"
          />
        </div>
      </motion.div>
    </div>
  );
}
