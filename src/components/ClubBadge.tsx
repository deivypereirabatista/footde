import React from 'react';
import { Club } from '../types/brasfoot';

interface ClubBadgeProps {
  club?: Club;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_PX: Record<NonNullable<ClubBadgeProps['size']>, number> = {
  xs: 22,
  sm: 28,
  md: 38,
  lg: 54,
  xl: 72,
};

const failedLogos = new Set<string>();

export const ClubBadge: React.FC<ClubBadgeProps> = ({ club, size = 'md' }) => {
  const reactId = React.useId().replace(/:/g, '');
  const [logoFailed, setLogoFailed] = React.useState(false);
  const px = SIZE_PX[size];

  // Escudo real (baixado da Wikipedia para public/logos/)
  if (club?.logo && !logoFailed && !failedLogos.has(club.logo)) {
    const logo = club.logo;
    return (
      <img
        src={`${import.meta.env.BASE_URL}${logo}`}
        width={px}
        height={px}
        alt={club.shortName}
        title={club.shortName}
        loading="lazy"
        draggable={false}
        className="shrink-0 select-none object-contain drop-shadow-sm"
        style={{ width: px, height: px }}
        onError={() => {
          failedLogos.add(logo);
          setLogoFailed(true);
        }}
      />
    );
  }

  if (!club) {
    return (
      <div
        style={{ width: px, height: px }}
        className="inline-flex items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white"
      >
        ?
      </div>
    );
  }

  const clipId = `shield_${club.id}_${reactId}`;
  const p = club.primaryColor;
  const s = club.secondaryColor;
  const a = club.accentColor || '#FFFFFF';

  const shieldPath = 'M 50 4 L 92 18 L 88 58 C 85 78 69 91 50 97 C 31 91 15 78 12 58 L 8 18 Z';

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      className="shrink-0 drop-shadow-sm select-none"
      aria-label={club.shortName}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={shieldPath} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="100" height="100" fill={p} />

        {club.pattern === 'stripes-h' && (
          <>
            <rect x="0" y="20" width="100" height="15" fill={s} />
            <rect x="0" y="50" width="100" height="15" fill={s} />
            <rect x="0" y="80" width="100" height="15" fill={s} />
          </>
        )}

        {club.pattern === 'stripes-v' && (
          <>
            <rect x="20" y="0" width="15" height="100" fill={s} />
            <rect x="50" y="0" width="15" height="100" fill={s} />
            <rect x="80" y="0" width="15" height="100" fill={s} />
          </>
        )}

        {club.pattern === 'sash' && (
          <polygon points="-10,85 85,-10 110,15 15,110" fill={s} />
        )}

        {club.pattern === 'halves' && (
          <rect x="50" y="0" width="50" height="100" fill={s} />
        )}

        {club.pattern === 'tricolor' && (
          <>
            <rect x="0" y="0" width="34" height="100" fill={p} />
            <rect x="34" y="0" width="32" height="100" fill={a} />
            <rect x="66" y="0" width="34" height="100" fill={s} />
          </>
        )}

        {/* Faixa central para leitura nítida da sigla */}
        <rect x="0" y="34" width="100" height="30" fill="rgba(0,0,0,0.62)" />
      </g>

      <path
        d={shieldPath}
        fill="none"
        stroke={p === '#FFFFFF' ? s : '#F8FAFC'}
        strokeWidth="5"
      />

      <text
        x="50"
        y="55"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="23"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="1"
      >
        {club.abbr}
      </text>
    </svg>
  );
};
