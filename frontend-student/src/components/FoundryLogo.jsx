export default function FoundryLogo({ compact = false, showWordmark = true, className = '', label = 'Reeky Foundry' }) {
  return (
    <span className={`foundry-logo ${compact ? 'foundry-logo--compact' : ''} ${className}`.trim()} aria-label={label}>
      <svg className="foundry-logo-mark" viewBox="0 0 64 64" role="img" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="foundry-copper" x1="12" y1="8" x2="55" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f1c17f" />
            <stop offset="0.42" stopColor="#b97148" />
            <stop offset="1" stopColor="#70402f" />
          </linearGradient>
          <linearGradient id="foundry-spark" x1="25" y1="15" x2="43" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff4cf" />
            <stop offset="0.5" stopColor="#ffd477" />
            <stop offset="1" stopColor="#e8894e" />
          </linearGradient>
        </defs>
        <path d="M32 2.75 61.25 19.5v25L32 61.25 2.75 44.5v-25L32 2.75Z" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" />
        <path d="m37.2 8.4-22.3 28.5h14.7l-3.2 18.7 22.7-29.4H34.5L37.2 8.4Z" fill="url(#foundry-copper)" stroke="#f7d08d" strokeOpacity="0.7" strokeWidth="1" strokeLinejoin="round" />
        <path d="m36.4 17.5-11 15.3h9.2l-2 10.8 9.5-13.1h-8.6l2.9-13Z" fill="url(#foundry-spark)" opacity="0.94" />
      </svg>
      {showWordmark && <span className="foundry-logo-type"><strong>REEKY</strong><em>FOUNDRY</em></span>}
    </span>
  );
}
