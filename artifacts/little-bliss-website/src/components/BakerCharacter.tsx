import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

export function BakerCharacter() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });

  return (
    <div ref={ref} className="relative w-full max-w-[280px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        {/* Floating animation */}
        <motion.div
          animate={{
            y: [0, -8, 0],
            rotate: [-2, 2, -2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative"
        >
          {/* Cartoon Baker SVG */}
          <svg
            viewBox="0 0 200 240"
            className="w-full h-auto"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Cartoon baker character"
          >
            {/* Background glow */}
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f5a97f" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f5a97f" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="100" cy="120" rx="80" ry="80" fill="url(#glow)" />

            {/* Body - Baker's apron */}
            <path
              d="M60 130 Q100 120 140 130 L135 200 Q100 210 65 200 Z"
              fill="#f5a97f"
              stroke="#d4845c"
              strokeWidth="2"
            />
            {/* Apron pocket */}
            <path
              d="M85 160 Q100 155 115 160 L112 180 Q100 185 88 180 Z"
              fill="#e8956a"
              stroke="#d4845c"
              strokeWidth="1.5"
            />
            {/* Apron strings */}
            <path d="M60 130 Q50 145 55 160" stroke="#d4845c" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M140 130 Q150 145 145 160" stroke="#d4845c" strokeWidth="3" fill="none" strokeLinecap="round" />

            {/* Head */}
            <ellipse cx="100" cy="85" rx="35" ry="40" fill="#8b6914" />
            {/* Hair */}
            <path d="M70 70 Q100 50 130 70 Q135 55 125 50 Q100 40 75 50 Q65 55 70 70" fill="#5c4d0f" />
            {/* Face - warm brown skin tone */}
            <ellipse cx="100" cy="90" rx="28" ry="32" fill="#c68642" />
            
            {/* Eyes */}
            <ellipse cx="88" cy="85" rx="5" ry="6" fill="#2d1810" />
            <ellipse cx="112" cy="85" rx="5" ry="6" fill="#2d1810" />
            {/* Eye highlights */}
            <circle cx="90" cy="83" r="2" fill="#fff" opacity="0.6" />
            <circle cx="114" cy="83" r="2" fill="#fff" opacity="0.6" />
            
            {/* Eyebrows */}
            <path d="M82 76 Q88 73 94 76" stroke="#5c4d0f" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M106 76 Q112 73 118 76" stroke="#5c4d0f" strokeWidth="2" fill="none" strokeLinecap="round" />
            
            {/* Nose */}
            <ellipse cx="100" cy="92" rx="3" ry="4" fill="#b07a3a" />
            
            {/* Smile */}
            <path d="M90 102 Q100 110 110 102" stroke="#8b5a2b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            
            {/* Chef's hat */}
            <ellipse cx="100" cy="45" rx="30" ry="12" fill="#fff" stroke="#e0e0e0" strokeWidth="2" />
            <rect x="75" y="45" width="50" height="25" rx="5" fill="#fff" stroke="#e0e0e0" strokeWidth="2" />
            <ellipse cx="100" cy="70" rx="25" ry="8" fill="#f5f5f5" stroke="#e0e0e0" strokeWidth="1.5" />
            {/* Hat band */}
            <rect x="75" y="62" width="50" height="6" fill="#e8e8e8" />
            
            {/* Arms */}
            <path d="M60 140 Q45 155 50 175" stroke="#c68642" strokeWidth="12" fill="none" strokeLinecap="round" />
            <path d="M140 140 Q155 155 150 175" stroke="#c68642" strokeWidth="12" fill="none" strokeLinecap="round" />
            
            {/* Hands holding a tray/cookie */}
            <ellipse cx="50" cy="180" rx="10" ry="12" fill="#c68642" />
            <ellipse cx="150" cy="180" rx="10" ry="12" fill="#c68642" />
            
            {/* Tray with cookie */}
            <rect x="70" y="175" width="60" height="8" rx="2" fill="#c0c0c0" stroke="#a0a0a0" strokeWidth="1" />
            <circle cx="100" cy="172" r="6" fill="#d4a574" stroke="#b8956a" strokeWidth="1" />
            <circle cx="100" cy="172" r="2" fill="#8b6914" opacity="0.5" />
            
            {/* Legs */}
            <path d="M80 200 L78 230" stroke="#4a4a4a" strokeWidth="14" strokeLinecap="round" />
            <path d="M120 200 L122 230" stroke="#4a4a4a" strokeWidth="14" strokeLinecap="round" />
            
            {/* Shoes */}
            <ellipse cx="78" cy="235" rx="12" ry="6" fill="#3a3a3a" />
            <ellipse cx="122" cy="235" rx="12" ry="6" fill="#3a3a3a" />
          </svg>

          {/* Floating sparkles around the baker */}
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2 w-4 h-4 bg-peach rounded-full blur-sm"
          />
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            className="absolute top-1/4 -left-3 w-3 h-3 bg-pistachio rounded-full blur-sm"
          />
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            className="absolute bottom-1/4 -right-4 w-3 h-3 bg-berry rounded-full blur-sm"
          />
        </motion.div>

        {/* Caption */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-4 text-center text-[13px] font-medium text-ink-soft"
        >
          Baked with love every morning
        </motion.p>
      </motion.div>
    </div>
  );
}
