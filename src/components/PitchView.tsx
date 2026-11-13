import React from 'react';
import { FORMATIONS, getCompatibilityMultiplier } from '../data/formations';
import { Club, Player } from '../types/brasfoot';

interface PitchViewProps {
  club: Club;
  starters: Player[];
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
}

export const PitchView: React.FC<PitchViewProps> = ({
  club,
  starters,
  selectedPlayerId,
  onSelectPlayer,
}) => {
  const slots = FORMATIONS[club.tactics.formation];

  // Mapeia cada slot para o titular atribuído
  const usedIds = new Set<string>();
  const slotPlayers = slots.map((slot) => {
    let found = starters.find((p) => p.slotIndex === slot.index && !usedIds.has(p.id));
    if (!found) {
      found = starters.find((p) => !usedIds.has(p.id));
    }
    if (found) usedIds.add(found.id);
    return { slot, player: found };
  });

  return (
    <div className="relative w-full h-[330px] sm:h-[360px] rounded-xl overflow-hidden border-2 border-emerald-400/40 shadow-inner select-none bg-gradient-to-b from-emerald-700 via-emerald-600 to-emerald-700">
      {/* Faixas de grama */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 28px, transparent 28px, transparent 56px)',
        }}
      />

      {/* Linhas do campo */}
      <div className="absolute inset-3 border-2 border-white/55 rounded-sm pointer-events-none">
        {/* Linha do meio */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/55" />
        {/* Círculo central */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/55" />
        {/* Grande área superior (ataque) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-12 border-b-2 border-x-2 border-white/55" />
        {/* Grande área inferior (defesa) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-12 border-t-2 border-x-2 border-white/55" />
      </div>

      {/* Jogadores posicionados */}
      {slotPlayers.map(({ slot, player }) => {
        if (!player) {
          return (
            <div
              key={slot.index}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            >
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/70 bg-black/40 flex items-center justify-center text-[10px] font-bold text-white">
                {slot.reqPos}
              </div>
              <span className="text-[10px] font-bold text-red-200 bg-black/60 px-1.5 rounded mt-0.5">
                Vazio
              </span>
            </div>
          );
        }

        const compat = getCompatibilityMultiplier(player.pos, slot.reqPos);
        const isImprovised = compat < 1.0;
        const isSelected = selectedPlayerId === player.id;
        const unavailable = player.suspended > 0 || player.injured > 0;
        const shortLabel =
          player.name.length > 12 ? player.name.split(' ').slice(-1)[0] : player.name;

        return (
          <button
            key={slot.index}
            type="button"
            onClick={() => onSelectPlayer(player.id)}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            title={`${player.name} (${player.pos} - Força ${player.ovr})`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-transform ${
              isSelected ? 'scale-115 z-20' : 'hover:scale-108 z-10'
            }`}
          >
            <div
              style={{
                backgroundColor:
                  slot.reqPos === 'G' ? '#F59E0B' : club.primaryColor,
                borderColor: isSelected ? '#FACC15' : '#FFFFFF',
                color: slot.reqPos === 'G' ? '#111827' : '#FFFFFF',
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 shadow-lg flex items-center justify-center font-black text-xs relative ${
                isSelected ? 'ring-4 ring-amber-300' : ''
              } ${unavailable ? 'opacity-50 grayscale' : ''}`}
            >
              {player.ovr}
              {isImprovised && (
                <span className="absolute -top-1.5 -right-2 bg-amber-400 text-slate-950 text-[9px] font-black px-1 rounded">
                  IMP
                </span>
              )}
              {unavailable && (
                <span className="absolute -top-1.5 -left-2 bg-red-600 text-white text-[9px] font-black px-1 rounded">
                  FORA
                </span>
              )}
            </div>
            <div className="mt-0.5 bg-slate-950/85 text-white text-[10px] font-bold px-1.5 py-0.2 rounded shadow whitespace-nowrap max-w-[82px] truncate">
              {shortLabel}
            </div>
            {/* Mini barra de energia */}
            <div className="w-9 h-1 bg-black/60 rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full ${
                  player.energy >= 75
                    ? 'bg-emerald-400'
                    : player.energy >= 50
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${player.energy}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};
