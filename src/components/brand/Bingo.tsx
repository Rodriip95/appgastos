import { cn } from "@/lib/utils";

// Shared artwork for the app and the exported SVG assets in public/brand.
const INK = "#653324";

function Head() {
  return (
    <g stroke={INK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M165 105 C191 97 210 73 232 80 C265 86 266 126 237 141 L211 151Z" fill="#b85b35" />
      <path d="M50 204 C60 150 103 116 151 107 C184 99 205 107 219 128 C231 150 263 146 278 164 C301 195 263 223 224 230 C193 237 161 225 143 213 L110 253 L57 254Z" fill="#df8b50" />
      <path d="M173 194 C195 179 214 196 242 184 C255 179 265 181 275 185 C283 203 254 222 224 230 C202 234 181 228 167 222Z" fill="#f9d5a0" stroke="none" />
      <path d="M94 183 C113 202 130 239 117 258 C101 280 58 272 34 253 C19 241 36 225 50 204" fill="#b85b35" />
      <path d="M146 211 C163 230 195 233 220 226" fill="none" />
      <ellipse cx="145" cy="173" rx="8" ry="14" transform="rotate(-38 145 173)" fill={INK} stroke="none" />
      <ellipse cx="194" cy="137" rx="8" ry="14" transform="rotate(-38 194 137)" fill={INK} stroke="none" />
      <path d="M238 170 C249 156 264 158 268 168 C273 184 260 191 247 189 C234 188 230 181 238 170Z" fill={INK} stroke="none" />
      <ellipse cx="158" cy="199" rx="10" ry="6" transform="rotate(-20 158 199)" fill="#efaa7d" stroke="none" />
    </g>
  );
}

type DogProps = {
  variant?: "hello" | "wallet";
  className?: string;
  title?: string;
};

/** Curved, long-bodied dachshund inspired by the supplied line drawing. */
export function BingoDog({ variant = "hello", className, title = "Bingo, tu compañero salchicha" }: DogProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 590" role="img" aria-label={title} className={className}>
      <ellipse cx="332" cy="539" rx="203" ry="15" fill={INK} opacity="0.07" />
      <g stroke={INK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M268 197 C294 188 321 204 324 223 C328 243 306 251 290 239Z" fill="#b85b35" />
        <path d="M57 251 C27 316 114 396 213 451 C315 510 431 553 513 517 C569 493 599 445 575 391 C548 328 461 310 388 276 C328 249 295 224 270 202 L124 211Z" fill="#df8b50" />
        <path d="M118 223 C154 219 177 287 242 329 C302 366 410 373 451 437 C464 459 466 483 483 512 C389 524 294 481 212 435 C120 384 57 321 65 278Z" fill="#f5bd82" stroke="none" />
        <path d="M271 205 C314 255 406 313 479 335 C535 347 562 383 563 414" fill="none" />
        <path d="M120 222 C158 223 175 280 242 327 C298 367 413 375 451 437 C467 463 468 517 513 536 C524 541 535 540 542 534 C516 522 504 500 509 479" fill="#df8b50" />
        <path d="M193 267 C190 243 215 229 239 240 C261 248 277 275 269 293 C261 311 243 306 229 292 C220 283 219 275 220 270 M220 280 L213 287" fill="#f5bd82" />
        <path d="M543 398 C560 388 583 389 591 405 C600 426 576 436 554 431 C538 429 531 411 543 398Z" fill="#f9d5a0" />
        <path d="M517 453 C532 445 554 449 560 462 C566 478 551 491 530 488 C511 487 504 466 517 453Z" fill="#f9d5a0" />
      </g>
      <Head />
      {variant === "wallet" && (
        <g transform="translate(241 214) rotate(-12)" stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
          <path d="M5 2 L57 -8 L67 7 L8 20Z" fill="#fff7e9" />
          <rect y="6" width="82" height="58" rx="12" fill="#9c432c" />
          <path d="M6 19 H76" fill="none" stroke="#d88150" />
          <rect x="53" y="25" width="34" height="22" rx="7" fill="#f2ac51" />
          <circle cx="67" cy="36" r="3" fill={INK} stroke="none" />
        </g>
      )}
    </svg>
  );
}

export function BingoMark({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="13 67 282 218" role="img" aria-label="Bingo" className={className}>
      <Head />
    </svg>
  );
}

// Custom outlined lettering, not a font dependency. Counters remain transparent.
const LETTERS = [
  "M22 23 Q20 15 31 14 L52 13 C78 12 89 24 85 41 Q83 49 75 53 C97 63 92 91 72 98 Q53 104 29 101 Q20 101 21 90Z M43 32 L43 48 Q63 50 63 39 Q63 30 43 32Z M43 65 L43 83 Q68 85 68 74 Q68 63 43 65Z",
  "M105 23 Q105 17 114 17 L127 17 Q134 17 134 26 L131 93 Q131 101 123 101 L109 100 Q102 100 103 91Z",
  "M150 25 Q149 17 157 17 L168 16 Q174 16 178 24 L202 64 L200 22 Q200 15 207 15 L220 15 Q228 15 227 24 L225 93 Q225 101 218 101 L206 101 Q200 101 196 94 L173 55 L175 95 Q175 103 166 103 L155 102 Q148 102 148 94Z",
  "M284 14 C302 14 315 23 318 34 Q320 41 312 43 L301 47 Q296 49 292 42 C283 29 265 37 265 60 C265 82 277 87 289 80 L290 69 L283 69 Q277 69 277 63 L277 56 Q277 50 284 50 L312 50 Q319 50 319 58 L317 89 C302 107 270 110 253 92 C236 74 238 39 253 24 Q266 12 284 14Z",
  "M365 15 C391 13 407 30 408 57 C410 85 396 102 373 104 C346 107 329 88 328 62 C326 35 340 17 365 15Z M368 37 C356 37 352 48 353 61 C354 76 360 84 370 82 C382 81 386 71 384 57 C383 43 379 36 368 37Z",
];

export function BingoWordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 124" role="img" aria-label="Bingo"
      className={cn("inline-block h-auto shrink-0 overflow-visible", size === "sm" ? "w-24" : size === "md" ? "w-40" : "w-64 sm:w-72", className)}>
      <g fill="#fff8e9" stroke="#934329" strokeWidth="13" strokeLinejoin="round" fillRule="evenodd" paintOrder="stroke fill">
        {LETTERS.map((d, i) => <path key={i} d={d} transform={`rotate(${[-5, 3, -3, 4, -5][i]} ${[55, 118, 186, 280, 368][i]} 60)`} />)}
      </g>
    </svg>
  );
}
