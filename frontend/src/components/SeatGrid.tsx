import type { Party, Seat } from "../data/mock";

export type SeatLeader = {
  seatId: number;
  partyId: Party["id"] | "NEUTRAL";
  leaderName: string;
  votes: number;
  margin: number;
};

type SeatGridProps = {
  seats: Seat[];
  leaders: Map<number, SeatLeader>;
  partyLookup: Map<string, Party>;
  onSelect?: (seatId: number) => void;
  selectedSeatId?: number | null;
  onHover?: (seatId: number | null) => void;
};

const neutralColor = "#334155";

export default function SeatGrid({
  seats,
  leaders,
  partyLookup,
  onSelect,
  selectedSeatId,
  onHover,
}: SeatGridProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">300 Seat Overview</h3>
        <span className="text-xs text-slate-400">Hover a seat for details</span>
      </div>
      <div className="mt-4 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 overflow-hidden">
        {seats.map((seat) => {
          const leader = leaders.get(seat.id);
          const party = leader?.partyId && leader.partyId !== "NEUTRAL" ? partyLookup.get(leader.partyId) : undefined;
          const isSelected = selectedSeatId === seat.id;
          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => onSelect?.(seat.id)}
              onMouseEnter={() => onHover?.(seat.id)}
              onMouseLeave={() => onHover?.(null)}
              title={`${seat.name} • ${leader?.leaderName ?? "No votes"} • ${leader?.votes ?? 0} votes • Margin ${leader?.margin ?? 0}`}
              className={`h-3 w-full rounded-sm border ${
                isSelected ? "border-white" : "border-transparent"
              } transition hover:brightness-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/70 focus-visible:ring-inset`}
              style={{ backgroundColor: party?.color ?? neutralColor }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
        {Array.from(partyLookup.values()).map((party) => (
          <div key={party.id} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: party.color }} />
            <span>{party.short}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: neutralColor }} />
          <span>Neutral</span>
        </div>
      </div>
    </div>
  );
}
