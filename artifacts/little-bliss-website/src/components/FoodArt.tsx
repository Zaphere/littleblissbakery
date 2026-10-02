import { useId, type ReactNode } from 'react';

/* --------------------------------------------------------------------------
   Illustrated product art.

   The demo ships with no stock photography, so every product, gallery tile and
   hero card is drawn here as a layered SVG scene in the brand palette. Each
   scene gets its own gradient ids so any number can sit on the page at once.
-------------------------------------------------------------------------- */

export type ArtKind =
  | 'chocchip'
  | 'oatraisin'
  | 'oatmeal'
  | 'tart'
  | 'berrytart'
  | 'pie'
  | 'cake'
  | 'cupcake'
  | 'croissant'
  | 'brownie'
  | 'donut'
  | 'macaron'
  | 'loaf'
  | 'cinnamon'
  | 'scone';

type SceneProps = { from: string; to: string; blob: string; children: ReactNode };

function Scene({ from, to, blob, children }: SceneProps) {
  const uid = useId().replace(/:/g, '');
  const g = `bg-${uid}`;
  const s = `sh-${uid}`;
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={g} cx="32%" cy="22%" r="95%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </radialGradient>
        <radialGradient id={s} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(338 40% 18% / .38)" />
          <stop offset="100%" stopColor="hsl(338 40% 18% / 0)" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#${g})`} />
      <circle cx="70" cy="58" r="78" fill={blob} opacity="0.5" />
      <circle cx="345" cy="330" r="96" fill={blob} opacity="0.38" />
      <circle cx="330" cy="70" r="46" fill="#fff" opacity="0.22" />
      <ellipse cx="200" cy="308" rx="132" ry="30" fill={`url(#${s})`} />
      {children}
    </svg>
  );
}

const crumbs = (pts: [number, number, number][], fill: string) =>
  pts.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={fill} opacity="0.75" />);

const specks = (pts: [number, number][], fill: string, r = 2.4) =>
  pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r} fill={fill} />);

/** A soft round cookie with chips or fruit inclusions. */
function cookie(cx: number, cy: number, r: number, base: string, edge: string, bits: { x: number; y: number; rx?: number; ry?: number; fill: string; rot?: number }[]) {
  return (
    <g>
      <circle cx={cx} cy={cy + 3} r={r} fill={edge} opacity="0.55" />
      <circle cx={cx} cy={cy} r={r} fill={base} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={edge} strokeWidth="3" opacity="0.55" />
      <ellipse cx={cx - r * 0.32} cy={cy - r * 0.42} rx={r * 0.42} ry={r * 0.3} fill="#fff" opacity="0.28" />
      {bits.map((b, i) => (
        <ellipse key={i} cx={b.x} cy={b.y} rx={b.rx ?? 8} ry={b.ry ?? 7} fill={b.fill} transform={`rotate(${b.rot ?? 0} ${b.x} ${b.y})`} />
      ))}
    </g>
  );
}

const painters: Record<ArtKind, (u: string) => ReactNode> = {
  chocchip: () => (
    <g>
      {cookie(200, 196, 118, 'hsl(36 55% 70%)', 'hsl(28 45% 55%)', [
        { x: 152, y: 158, fill: 'hsl(24 35% 26%)', rot: 20 },
        { x: 232, y: 146, rx: 10, ry: 8, fill: 'hsl(24 35% 24%)', rot: -15 },
        { x: 196, y: 214, fill: 'hsl(24 38% 28%)', rot: 40 },
        { x: 268, y: 216, rx: 9, ry: 7, fill: 'hsl(24 35% 25%)' },
        { x: 144, y: 236, rx: 8, ry: 6, fill: 'hsl(24 35% 26%)', rot: 30 },
        { x: 244, y: 262, fill: 'hsl(24 35% 24%)', rot: -20 },
        { x: 186, y: 118, rx: 9, ry: 7, fill: 'hsl(24 38% 27%)', rot: 12 },
      ])}
      {crumbs([[86, 300, 5], [318, 288, 4], [110, 322, 3.5], [300, 316, 5]], 'hsl(32 50% 62%)')}
    </g>
  ),

  oatmeal: () => (
    <g>
      {cookie(200, 198, 116, 'hsl(40 48% 66%)', 'hsl(32 42% 52%)', [
        { x: 158, y: 156, rx: 12, ry: 9, fill: 'hsl(20 55% 48%)', rot: 25 },
        { x: 238, y: 168, rx: 11, ry: 8, fill: 'hsl(20 55% 45%)', rot: -30 },
        { x: 204, y: 244, rx: 12, ry: 9, fill: 'hsl(20 55% 47%)', rot: 15 },
        { x: 152, y: 232, rx: 9, ry: 7, fill: 'hsl(20 50% 42%)' },
        { x: 254, y: 226, rx: 10, ry: 8, fill: 'hsl(20 55% 46%)', rot: 40 },
      ])}
      {specks([[176, 130], [226, 210], [164, 200], [246, 140], [214, 274]], 'hsl(34 45% 45%)', 3)}
      {crumbs([[92, 306, 4], [312, 300, 5]], 'hsl(38 45% 58%)')}
    </g>
  ),

  oatraisin: () => (
    <g>
      {cookie(200, 196, 118, 'hsl(42 52% 72%)', 'hsl(34 44% 56%)', [
        { x: 156, y: 158, rx: 13, ry: 10, fill: 'hsl(348 45% 30%)', rot: 18 },
        { x: 240, y: 150, rx: 12, ry: 9, fill: 'hsl(348 45% 28%)', rot: -25 },
        { x: 198, y: 226, rx: 14, ry: 11, fill: 'hsl(348 45% 31%)', rot: 40 },
        { x: 266, y: 232, rx: 11, ry: 9, fill: 'hsl(348 45% 29%)' },
        { x: 146, y: 244, rx: 12, ry: 9, fill: 'hsl(348 45% 30%)', rot: 30 },
        { x: 216, y: 126, rx: 10, ry: 8, fill: 'hsl(348 45% 28%)', rot: -12 },
      ])}
      {specks([[180, 186], [232, 200], [172, 264], [254, 178], [206, 172]], 'hsl(36 45% 48%)', 2.6)}
    </g>
  ),

  tart: () => (
    <g>
      <ellipse cx="200" cy="262" rx="132" ry="34" fill="hsl(30 50% 60%)" />
      <path d="M70 210 q130 -34 260 0 l-10 44 q-120 30 -240 0 z" fill="hsl(34 55% 68%)" />
      <path d="M70 210 q130 -34 260 0" fill="none" stroke="hsl(28 48% 54%)" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="200" cy="204" rx="130" ry="30" fill="hsl(350 55% 72%)" />
      <ellipse cx="200" cy="200" rx="118" ry="24" fill="hsl(24 75% 78%)" />
      {[140, 175, 210, 245, 278].map((x, i) => (
        <path key={i} d={`M${x} 176 q14 -18 28 0 q-14 20 -28 0`} fill="hsl(350 65% 58%)" />
      ))}
      <ellipse cx="200" cy="196" rx="96" ry="16" fill="#fff" opacity="0.25" />
      <g transform="translate(268 168)">
        <path d="M0 0 q16 -22 34 -8 q-6 24 -34 8" fill="hsl(78 40% 52%)" />
      </g>
      {specks([[166, 244], [214, 250], [190, 258]], 'hsl(40 70% 96%)', 3)}
    </g>
  ),

  berrytart: () => (
    <g>
      <ellipse cx="200" cy="266" rx="128" ry="32" fill="hsl(30 50% 60%)" />
      <path d="M76 216 q124 -32 248 0 l-9 42 q-115 28 -230 0 z" fill="hsl(36 58% 70%)" />
      <path d="M76 216 q124 -32 248 0" fill="none" stroke="hsl(28 48% 54%)" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="200" cy="212" rx="124" ry="28" fill="hsl(44 70% 84%)" />
      {[
        [152, 200], [188, 192], [224, 196], [256, 206],
        [168, 224], [204, 220], [240, 226],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="17" fill="hsl(352 62% 48%)" />
          <circle cx={x - 5} cy={y - 6} r="5" fill="#fff" opacity="0.4" />
        </g>
      ))}
      {[[176, 176], [236, 178]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="13" fill="hsl(268 45% 55%)" />
          <circle cx={x - 4} cy={y - 4} r="4" fill="#fff" opacity="0.35" />
        </g>
      ))}
      <g transform="translate(258 168)">
        <path d="M0 0 q18 -24 38 -9 q-7 26 -38 9" fill="hsl(78 40% 50%)" />
      </g>
    </g>
  ),

  pie: () => (
    <g>
      <ellipse cx="200" cy="270" rx="146" ry="36" fill="hsl(30 50% 58%)" />
      <path d="M56 190 q144 -40 288 0 l-14 62 q-130 34 -260 0 z" fill="hsl(40 60% 74%)" />
      <ellipse cx="200" cy="188" rx="144" ry="36" fill="hsl(44 66% 82%)" />
      <ellipse cx="200" cy="186" rx="122" ry="27" fill="hsl(350 58% 44%)" />
      {[-70, -35, 0, 35, 70].map((d, i) => (
        <path key={i} d={`M${200 + d - 16} 178 q16 14 32 0`} fill="none" stroke="hsl(44 66% 86%)" strokeWidth="9" strokeLinecap="round" />
      ))}
      {[-70, -35, 0, 35, 70].map((d, i) => (
        <path key={`v${i}`} d={`M${200 + d} 160 v46`} stroke="hsl(40 55% 64%)" strokeWidth="6" strokeLinecap="round" opacity="0.65" />
      ))}
      <path d="M56 190 q144 -40 288 0" fill="none" stroke="hsl(32 46% 52%)" strokeWidth="8" strokeLinecap="round" />
      <path d="M64 218 q136 32 272 0" fill="none" stroke="hsl(32 46% 56%)" strokeWidth="5" opacity="0.6" />
      {specks([[150, 172], [214, 166], [262, 180], [186, 194]], 'hsl(40 80% 98%)', 3)}
    </g>
  ),

  cake: () => (
    <g>
      <ellipse cx="200" cy="296" rx="140" ry="26" fill="hsl(348 45% 82%)" />
      <path d="M84 154 h232 v112 q-116 30 -232 0 z" fill="hsl(36 62% 76%)" />
      <path d="M84 154 h232 v34 q-116 26 -232 0 z" fill="hsl(350 55% 92%)" />
      <path d="M84 176 q28 26 58 6 q30 24 60 2 q30 22 58 0 q30 20 56 -4 v16 q-116 26 -232 0 z" fill="hsl(350 55% 94%)" />
      <path d="M84 214 q116 26 232 0" fill="none" stroke="hsl(350 50% 88%)" strokeWidth="4" opacity="0.7" />
      {[132, 200, 268].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="142" r="18" fill="hsl(352 62% 50%)" />
          <circle cx={x - 6} cy={x === 200 ? 136 : 136} r="5" fill="#fff" opacity="0.42" />
          <path d={`M${x} 128 q6 -18 22 -22`} fill="none" stroke="hsl(78 40% 48%)" strokeWidth="5" strokeLinecap="round" />
        </g>
      ))}
      <path d="M84 154 h232" stroke="hsl(32 44% 58%)" strokeWidth="4" opacity="0.45" />
      {specks([[158, 236], [244, 244], [200, 258]], 'hsl(40 80% 100%)', 3)}
    </g>
  ),

  cupcake: () => (
    <g>
      <ellipse cx="200" cy="312" rx="96" ry="22" fill="hsl(338 40% 40% / .25)" />
      <path d="M136 214 h128 l-16 92 q-48 16 -96 0 z" fill="hsl(34 55% 72%)" />
      {[-44, -22, 0, 22, 44].map((d, i) => (
        <path key={i} d={`M${200 + d} 218 l${d * -0.06} 86`} stroke="hsl(30 46% 60%)" strokeWidth="5" opacity="0.6" strokeLinecap="round" />
      ))}
      <path d="M134 212 q66 -20 132 0 q-66 24 -132 0" fill="hsl(40 62% 80%)" />
      <path d="M144 206 q24 -34 54 -30 q10 -30 44 -26 q32 4 30 40 q22 12 8 34 q-68 22 -136 0 q-14 -12 0 -18 z" fill="hsl(350 58% 92%)" />
      <path d="M156 200 q30 -26 58 -20" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.6" />
      <circle cx="200" cy="140" r="15" fill="hsl(352 65% 46%)" />
      <path d="M200 126 q7 -16 22 -19" fill="none" stroke="hsl(78 40% 46%)" strokeWidth="5" strokeLinecap="round" />
      {specks([[178, 178], [220, 186], [204, 168], [190, 196]], 'hsl(203 60% 70%)', 3)}
    </g>
  ),

  croissant: () => (
    <g>
      <ellipse cx="200" cy="286" rx="140" ry="30" fill="hsl(30 50% 58% / .5)" />
      <path d="M64 252 q20 -84 84 -104 q44 -14 52 30 q6 34 -34 44 q-40 10 -44 44 q-2 26 -24 26 q-24 0 -34 -40 z" fill="hsl(38 66% 70%)" />
      <path d="M336 252 q-20 -84 -84 -104 q-44 -14 -52 30 q-6 34 34 44 q40 10 44 44 q2 26 24 26 q24 0 34 -40 z" fill="hsl(38 66% 70%)" />
      <path d="M116 250 q-4 -58 40 -76" fill="none" stroke="hsl(32 52% 56%)" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      <path d="M160 244 q-6 -50 34 -66" fill="none" stroke="hsl(32 52% 56%)" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      <path d="M200 178 q40 16 34 66" fill="none" stroke="hsl(32 52% 56%)" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      <path d="M240 174 q44 18 40 76" fill="none" stroke="hsl(32 52% 56%)" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      <path d="M148 148 q52 -30 104 0" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity="0.42" />
      {crumbs([[92, 306, 5], [306, 300, 4], [200, 320, 4]], 'hsl(36 55% 62%)')}
    </g>
  ),

  brownie: () => (
    <g>
      <ellipse cx="200" cy="292" rx="132" ry="28" fill="hsl(338 40% 30% / .3)" />
      <path d="M96 176 h208 l-18 96 q-86 24 -172 0 z" fill="hsl(24 42% 30%)" />
      <path d="M96 176 h208 l-6 30 q-98 24 -196 0 z" fill="hsl(26 38% 42%)" />
      <path d="M100 206 q100 26 200 0" fill="none" stroke="hsl(24 35% 55%)" strokeWidth="5" opacity="0.55" />
      <ellipse cx="200" cy="176" rx="104" ry="24" fill="hsl(26 40% 48%)" />
      <ellipse cx="200" cy="172" rx="88" ry="18" fill="hsl(24 45% 34%)" />
      {[[166, 170], [206, 164], [240, 174], [186, 182], [224, 184]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="11" ry="8" fill="hsl(24 30% 22%)" transform={`rotate(${i * 24} ${x} ${y})`} />
      ))}
      <ellipse cx="200" cy="168" rx="66" ry="12" fill="#fff" opacity="0.16" />
      {specks([[134, 236], [266, 244], [200, 252]], 'hsl(40 70% 92%)', 3)}
    </g>
  ),

  donut: () => (
    <g>
      <ellipse cx="200" cy="292" rx="118" ry="26" fill="hsl(338 40% 35% / .25)" />
      <circle cx="200" cy="204" r="112" fill="hsl(38 62% 72%)" />
      <circle cx="200" cy="204" r="112" fill="none" stroke="hsl(32 50% 56%)" strokeWidth="7" opacity="0.5" />
      <path d="M200 92 a112 112 0 0 1 0 224 a112 112 0 0 1 0 -224 M200 156 a48 48 0 0 0 0 96 a48 48 0 0 0 0 -96" fillRule="evenodd" fill="hsl(38 62% 74%)" />
      <path d="M104 172 q34 -58 96 -66 q64 -8 100 44 q24 34 6 74 q-16 -32 -46 -22 q-30 10 -40 -20 q-10 -30 -44 -22 q-34 8 -40 -20 q-20 4 -32 32 z" fill="hsl(350 58% 92%)" />
      <path d="M112 168 q36 -54 94 -62" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" opacity="0.55" />
      {[
        [148, 148, 0], [196, 126, 25], [248, 152, -20], [270, 196, 40],
        [132, 196, -35], [176, 176, 60], [224, 168, 15], [164, 224, -50],
        [244, 232, 30], [206, 244, -15],
      ].map(([x, y, r], i) => (
        <rect key={i} x={x - 9} y={y - 3.5} width="18" height="7" rx="3.5"
          fill={['hsl(203 70% 62%)', 'hsl(78 50% 58%)', 'hsl(43 80% 60%)', 'hsl(338 60% 58%)'][i % 4]}
          transform={`rotate(${r} ${x} ${y})`} />
      ))}
    </g>
  ),

  macaron: () => (
    <g>
      <ellipse cx="200" cy="296" rx="104" ry="24" fill="hsl(338 40% 35% / .22)" />
      <g transform="rotate(-8 200 210)">
        <ellipse cx="200" cy="248" rx="98" ry="34" fill="hsl(348 50% 74%)" />
        <ellipse cx="200" cy="224" rx="96" ry="24" fill="hsl(44 75% 92%)" />
        <ellipse cx="200" cy="196" rx="98" ry="36" fill="hsl(348 52% 78%)" />
        <ellipse cx="200" cy="184" rx="86" ry="24" fill="#fff" opacity="0.35" />
        <ellipse cx="200" cy="170" rx="70" ry="16" fill="hsl(348 55% 84%)" />
        {[110, 140, 170, 200, 230, 260, 290].map((x, i) => (
          <circle key={i} cx={x} cy={i % 2 ? 252 : 258} r="5" fill="hsl(348 45% 68%)" />
        ))}
      </g>
      {specks([[130, 300], [276, 296]], 'hsl(348 50% 78%)', 4)}
    </g>
  ),

  loaf: () => (
    <g>
      <ellipse cx="200" cy="290" rx="150" ry="32" fill="hsl(30 50% 55% / .45)" />
      <path d="M56 236 q0 -74 74 -92 q70 -18 140 0 q74 18 74 92 q0 30 -74 36 q-70 8 -140 0 q-74 -6 -74 -36 z" fill="hsl(38 60% 66%)" />
      <path d="M76 216 q16 -50 84 -64" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" opacity="0.4" />
      <path d="M112 156 q88 -32 176 0" fill="none" stroke="hsl(30 46% 50%)" strokeWidth="9" strokeLinecap="round" opacity="0.75" />
      <path d="M108 184 q92 -34 184 0" fill="none" stroke="hsl(30 46% 50%)" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
      {specks([[140, 232], [196, 244], [252, 232], [168, 258], [232, 258]], 'hsl(44 60% 96%)', 3.5)}
      {crumbs([[84, 300, 5], [318, 294, 4]], 'hsl(36 50% 60%)')}
    </g>
  ),

  cinnamon: () => (
    <g>
      <ellipse cx="200" cy="294" rx="140" ry="28" fill="hsl(30 50% 55% / .4)" />
      <path d="M70 244 q6 -76 78 -96 q72 -20 144 0 q72 20 78 96 q-78 34 -150 26 q-72 -8 -150 -26 z" fill="hsl(40 62% 74%)" />
      <path d="M96 220 q104 -66 208 0" fill="none" stroke="hsl(28 48% 56%)" strokeWidth="8" strokeLinecap="round" opacity="0.75" />
      <path d="M120 196 q80 -48 160 0" fill="none" stroke="hsl(28 48% 58%)" strokeWidth="7" strokeLinecap="round" opacity="0.6" />
      <path d="M148 176 q52 -30 104 0" fill="none" stroke="hsl(28 48% 60%)" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
      <path d="M70 244 q78 34 150 26 q72 8 150 -26 l-6 24 q-74 32 -144 24 q-70 -8 -144 -24 z" fill="hsl(34 52% 64%)" />
      <path d="M88 224 q96 -58 192 -4" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity="0.38" />
      <path d="M104 250 q96 34 192 0" fill="none" stroke="hsl(40 75% 96%)" strokeWidth="10" strokeLinecap="round" opacity="0.85" />
    </g>
  ),

  scone: () => (
    <g>
      <ellipse cx="200" cy="292" rx="124" ry="28" fill="hsl(30 50% 55% / .4)" />
      <path d="M112 268 q-14 -66 34 -104 q44 -34 96 -14 q62 24 60 92 q-1 34 -96 42 q-88 8 -94 -16 z" fill="hsl(42 58% 78%)" />
      <path d="M146 168 q54 -34 100 -12" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" opacity="0.5" />
      <path d="M126 234 q78 30 154 -6" fill="none" stroke="hsl(34 46% 62%)" strokeWidth="7" strokeLinecap="round" opacity="0.6" />
      {[[164, 200], [214, 188], [244, 224], [186, 236]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill="hsl(348 58% 52%)" />
      ))}
      {specks([[146, 264], [222, 268], [268, 252]], 'hsl(44 70% 98%)', 3)}
    </g>
  ),
};

const backgrounds: Record<ArtKind, { from: string; to: string; blob: string }> = {
  chocchip: { from: 'hsl(34 62% 88%)', to: 'hsl(24 56% 76%)', blob: 'hsl(40 70% 70%)' },
  oatmeal: { from: 'hsl(40 58% 90%)', to: 'hsl(30 48% 78%)', blob: 'hsl(44 66% 74%)' },
  oatraisin: { from: 'hsl(42 62% 91%)', to: 'hsl(32 52% 80%)', blob: 'hsl(46 70% 76%)' },
  tart: { from: 'hsl(30 74% 92%)', to: 'hsl(20 64% 82%)', blob: 'hsl(36 80% 78%)' },
  berrytart: { from: 'hsl(350 62% 92%)', to: 'hsl(340 52% 82%)', blob: 'hsl(348 70% 82%)' },
  pie: { from: 'hsl(42 70% 90%)', to: 'hsl(30 60% 78%)', blob: 'hsl(46 76% 74%)' },
  cake: { from: 'hsl(350 66% 94%)', to: 'hsl(340 56% 86%)', blob: 'hsl(348 72% 88%)' },
  cupcake: { from: 'hsl(203 55% 92%)', to: 'hsl(210 48% 82%)', blob: 'hsl(200 60% 82%)' },
  croissant: { from: 'hsl(38 70% 90%)', to: 'hsl(26 60% 78%)', blob: 'hsl(44 78% 74%)' },
  brownie: { from: 'hsl(26 46% 84%)', to: 'hsl(22 40% 70%)', blob: 'hsl(30 52% 74%)' },
  donut: { from: 'hsl(350 66% 93%)', to: 'hsl(340 56% 84%)', blob: 'hsl(348 74% 86%)' },
  macaron: { from: 'hsl(348 60% 93%)', to: 'hsl(200 52% 88%)', blob: 'hsl(348 70% 86%)' },
  loaf: { from: 'hsl(40 64% 90%)', to: 'hsl(28 54% 78%)', blob: 'hsl(46 72% 76%)' },
  cinnamon: { from: 'hsl(44 70% 91%)', to: 'hsl(32 60% 80%)', blob: 'hsl(48 78% 76%)' },
  scone: { from: 'hsl(46 66% 92%)', to: 'hsl(34 56% 82%)', blob: 'hsl(50 74% 78%)' },
};

export function FoodArt({ kind, className = '' }: { kind: ArtKind; className?: string }) {
  const bg = backgrounds[kind];
  return (
    <div className={`ph grain ${className}`}>
      <Scene from={bg.from} to={bg.to} blob={bg.blob}>
        {painters[kind]('')}
      </Scene>
    </div>
  );
}

export const artKinds = Object.keys(backgrounds) as ArtKind[];
