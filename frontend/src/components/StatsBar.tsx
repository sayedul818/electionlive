export type PartyStat = {
  partyId: string;
  seats: number;
  percent: number;
};

type PartyInfo = {
  id: string;
  name: string;
  color: string;
};

type StatsBarProps = {
  partyRoster: PartyInfo[];
  stats: PartyStat[];
  totalSeats: number;
};

export default function StatsBar({ partyRoster, stats, totalSeats }: StatsBarProps) {
  const maxSeats = Math.max(...stats.map((stat) => stat.seats));
  const topPartyName = stats
    .filter((stat) => stat.seats === maxSeats)
    .map((stat) => partyRoster.find((party) => party.id === stat.partyId)?.name)
    .filter((name): name is string => Boolean(name))[0] ?? "—";
  const statLookup = new Map(stats.map((stat) => [stat.partyId, stat]));
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">National Snapshot</h2>
        <div className="text-right text-xs text-slate-400">
          <div>Total Seats: {totalSeats}</div>
          <div className="text-slate-300">Top party: {topPartyName}</div>
        </div>
      </div>
      <div className="max-h-[360px] overflow-y-auto pr-2">
        <div className="grid gap-3 md:grid-cols-2">
          {partyRoster.length === 0 && (
            <div className="text-xs text-slate-400">No parties loaded yet.</div>
          )}
          {partyRoster.map((party) => {
            const stat = statLookup.get(party.id) ?? { seats: 0, percent: 0 };
          return (
            <div key={party.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: party.color }} />
                  <span className="font-semibold text-slate-100">{party.name}</span>
                </div>
                <span className="text-slate-400">{stat.seats} seats</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${stat.percent}%`, backgroundColor: party.color }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-400">{stat.percent}% of parliament</div>
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}
