/** The same mark as public/icons/icon.svg, rendered inline for a sharp UI logo. */
export default function Logo() {
  return (
    <svg viewBox="0 0 512 512" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs><linearGradient id="ppicola-logo-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#4acaa4"/></linearGradient></defs>
      <rect width="512" height="512" rx="204.8" fill="url(#ppicola-logo-gradient)" />
      <path d="M195 367V145h78c52 0 81 28 81 72s-29 72-81 72h-78" fill="none" stroke="#fff" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
