import type { Candidate, Party, Seat } from "../data/mock";

export type PartyInfo = {
  id: string;
  name: string;
  color: string;
};

type SeatCandidatesPageProps = {
  seat: Seat;
  candidates: Candidate[];
  partyLookup: Map<string, Party>;
  partyRoster: PartyInfo[];
  totalVotes: number;
  turnoutPercent: number;
  onBack: () => void;
};

const formatVotes = (value: number) => value.toLocaleString("en-BD");

const normalizeCandidateImage = (url?: string) => {
  if (!url) return undefined;
  return url.replace(/&amp;/g, "&").replace(/^http:\/\/103\.183\.38\.66/, "/api");
};

const normalizeSymbolImage = (url?: string) => {
  if (!url) return undefined;
  return url
    .replace(/&amp;/g, "&")
    .replace(/^http:\/\/103\.183\.38\.66/, "/api")
    .replace(/^https:\/\/103\.183\.38\.66/, "/api");
};

const getPartyLabel = (candidate: Candidate, partyLookup: Map<string, Party>) => {
  const fallback = partyLookup.get(candidate.partyId)?.name;
  return candidate.partyLabel ?? fallback ?? "Unknown Party";
};

const getPartyColor = (
  candidate: Candidate,
  partyLookup: Map<string, Party>,
  partyRoster: PartyInfo[]
) => {
  const byId = partyLookup.get(candidate.partyId)?.color;
  if (byId) return byId;
  const label = candidate.partyLabel;
  if (!label) return "#64748b";
  const rosterMatch = partyRoster.find((party) => party.name === label);
  return rosterMatch?.color ?? "#64748b";
};

export const normalizePartyText = (value: string) =>
  value
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[\s\-_.()]+/g, "")
    .replace(/["'’”“•:;,+/\\|]+/g, "");

const partyLogoMap = new Map<string, string>([
  [
    normalizePartyText("বাংলাদেশ জামায়াতে ইসলামী"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2025/12/14-palla.jpg",
  ],
  [
    normalizePartyText("বাংলাদেশ জাতীয়তাবাদী দল - বি.এন.পি"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/dhaner%20sis.PNG",
  ],
  [
    normalizePartyText("বাংলাদেশ খেলাফত মজলিস"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2025/12/riksha-new25.jpg",
  ],
  [
    normalizePartyText("জাতীয় নাগরিক পার্টি-এনসিপি"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2025/11/58-shapla-koli-protik.jpg",
  ],
  [
    normalizePartyText("ইসলামী আন্দোলন বাংলাদেশ"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/pakha.PNG",
  ],
  [
    normalizePartyText("গণঅধিকার পরিষদ (জিওপি)"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2024/09/trak.jpeg",
  ],
  [
    normalizePartyText("বাংলাদেশ ইসলামী ফ্রন্ট"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/mombati.PNG",
  ],
  [
    normalizePartyText("বাংলাদেশ জাতীয় পার্টি"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/gorur%20gari.PNG",
  ],
  [
    normalizePartyText("বাংলাদেশ জাতীয় পার্টি-বিজেপি"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/gorur%20gari.PNG",
  ],
  [
    normalizePartyText("বাংলাদেশ ওয়ার্কার্স পার্টি"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/haturi.PNG",
  ],
  [
    normalizePartyText("বাংলাদেশের কমিউনিস্ট পার্টি"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/kaste.PNG",
  ],
  [
    normalizePartyText("বাংলাদেশের সমাজতান্ত্রিক দল (মার্কসবাদী)"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2025/12/kasi.jpg",
  ],
  [
    normalizePartyText("বাংলাদেশ জাতীয় সমাজতান্ত্রিক দল-বাংলাদেশ জাসদ"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2023/07/47-symbol-motor-car.jpg",
  ],
  [
    normalizePartyText("বাংলাদেশ সাংস্কৃতিক মুক্তিজোট (মুক্তিজোট)"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/chori.PNG",
  ],
  [
    normalizePartyText("জাতীয় পার্টি - জেপি"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/nagol.PNG",
  ],
  [
    normalizePartyText("জাতীয় পার্টি"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/nagol.PNG",
  ],
  [
    normalizePartyText("বাংলাদেশ সুপ্রীম পার্টি (বি.এস.পি)"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2023/08/49-aktara.jpg",
  ],
  [
    normalizePartyText("জনতার দল"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2025/12/kolom.jpg",
  ],
  [
    normalizePartyText("আমজনতার দল"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2025/12/projapoti.jpeg",
  ],
  [
    normalizePartyText("বাংলাদেশ লেবার পার্টি"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2025/09/anaros.jpeg",
  ],
  [
    normalizePartyText("ন্যাশনাল পিপলস পার্টি (এনপিপি)"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/aam.PNG",
  ],
  [
    normalizePartyText("বাংলাদেশ খেলাফত আন্দোলন"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/botgach.PNG",
  ],
  [
    normalizePartyText("জমিয়তে উলামায়ে ইসলাম বাংলাদেশ"),
    "https://www.shutterstock.com/image-vector/phoenix-palm-hand-draw-vintage-600nw-2242531587.jpg",
  ],
  [
    normalizePartyText("ইনসানিয়াত বিপ্লব বাংলাদেশ"),
    "https://img.pikbest.com/png-images/apple-clipart-black-and-white-black-line-vector-clipart-apple_5940878.png!sw800",
  ],
  [
    normalizePartyText("জাতীয় সমাজতান্ত্রিক দল-জেএসডি"),
    "https://png.pngtree.com/png-clipart/20201106/ourmid/pngtree-commonly-used-free-stars-clipart-png-image_2395198.jpg",
  ],
  [
    normalizePartyText("গণসংহতি আন্দোলন"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2024/09/53-mathal-gonosonghoti.jpg",
  ],
  [
    normalizePartyText("ইসলামিক ফ্রন্ট বাংলাদেশ"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/chair.PNG",
  ],
  [
    normalizePartyText("গণফোরাম"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2018/03/surjo.PNG",
  ],
  [
    normalizePartyText("লিবারেল ডেমোক্রেটিক পার্টি - এলডিপি"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2025/11/1-umbrella-symbol.jpg",
  ],
  [
    normalizePartyText("বাংলাদেশ রিপাবলিকান পার্টি (বিআরপি)"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2025/11/57-elepant.jpg",
  ],
  [
    normalizePartyText("নাগরিক ঐক্য"),
    "https://asset.ecs.gov.bd/media/uploaded_files/package/filemanager/2024/09/52-ketly-nagorik-oikko%20copy.jpg",
  ],
]);

export const getPartyLogoForLabel = (label?: string) =>
  label ? partyLogoMap.get(normalizePartyText(label)) : undefined;

const getPartyLogoForCandidate = (candidate: Candidate, partyLookup: Map<string, Party>) => {
  const label = candidate.partyLabel ?? partyLookup.get(candidate.partyId)?.name ?? "";
  const symbolText = candidate.symbolLabel ?? candidate.symbol ?? "";
  if (/(ফুটবল|football)/i.test(symbolText)) {
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Football_%28soccer_ball%29.svg/960px-Football_%28soccer_ball%29.svg.png";
  }
  if (/(কলার\s*ছড়ি|কলারছড়ি|banana)/i.test(symbolText)) {
    return "https://img.lovepik.com/png/20231109/pair-of-banana-is-shown-in-a-black-and-white_545085_wh1200.png";
  }
  if (/(হাঁস|হাস|swan)/i.test(symbolText)) {
    return "https://www.clipartmax.com/png/middle/9-92877_free-clipart-of-a-swan-clip-art-black-and-white-swan.png";
  }
  if (/(হরিণ|harin|deer)/i.test(symbolText)) {
    return "https://img.freepik.com/free-vector/hand-drawn-deer-animal-wild-horn-nature-wildlife-mammal-reindeer-horned-antler-sketch-vector-illustration_1284-41851.jpg?semt=ais_hybrid&w=740&q=80";
  }
  if (!label) return undefined;
  return getPartyLogoForLabel(label);
};

const resolvePartyKey = (candidate: Candidate, partyLookup: Map<string, Party>) => {
  if (candidate.partyId === "A") return "bnp";
  if (candidate.partyId === "B") return "jamaat";
  if (candidate.partyId === "IND") return "ncp";
  const rawLabel = candidate.partyLabel ?? partyLookup.get(candidate.partyId)?.name ?? "";
  const label = normalizePartyText(rawLabel);
  if (/(বিএনপি|bnp|জাতীয়তাবাদী|nationalist)/i.test(label)) return "bnp";
  if (/(এনসিপি|ncp|নাগরিক|citizen)/i.test(label)) return "ncp";
  if (/(জামায়াত|জামায়াত|jamaat|jamaateislami)/i.test(label)) return "jamaat";
  if (/(ইসলামীআন্দোলনবাংলাদেশ|islamicmovementofbangladesh|iab)/i.test(label)) return "iab";
  if (/(বাংলাদেশখেলাফতমজলিস|khelafatmajlis)/i.test(label)) return "khm";
  return "other";
};

const pickTopByVotes = (items: Candidate[]) =>
  [...items].sort((a, b) => b.votes - a.votes);

export default function SeatCandidatesPage({
  seat,
  candidates,
  partyLookup,
  partyRoster,
  totalVotes,
  turnoutPercent,
  onBack,
}: SeatCandidatesPageProps) {
  const ordered = pickTopByVotes(candidates);
  const topByParty = new Map<string, Candidate>();
  ordered.forEach((candidate) => {
    const key = resolvePartyKey(candidate, partyLookup);
    if (!topByParty.has(key)) {
      topByParty.set(key, candidate);
    }
  });

  const featured: Candidate[] = (() => {
    const picked: Candidate[] = [];
    const primaryKeys = ["bnp", "jamaat"];
    const fallbackKeys = ["ncp", "iab", "khm"];

    for (const key of primaryKeys) {
      const candidate = topByParty.get(key);
      if (candidate) picked.push(candidate);
    }

    if (picked.length < 2) {
      for (const key of fallbackKeys) {
        const candidate = topByParty.get(key);
        if (candidate && !picked.includes(candidate)) {
          picked.push(candidate);
        }
        if (picked.length === 2) break;
      }
    }

    if (picked.length < 2) {
      const fallback = ordered.filter((candidate) => !picked.includes(candidate));
      picked.push(...fallback.slice(0, 2 - picked.length));
    }
    return picked;
  })();

  const featuredIds = new Set(featured.map((candidate) => candidate.id));
  const remainingCandidates = ordered.filter((candidate) => !featuredIds.has(candidate.id));

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-b from-[#f6efe4] via-[#efe2cf] to-[#e6d4b6] p-6 text-slate-900 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              জাতীয় সংসদ নির্বাচন ২০২৬
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-[#cc3a2d]">{seat.name} আসন</h2>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <span>মোট ভোট</span>
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              <span>{formatVotes(totalVotes)}</span>
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              <span>টার্নআউট {turnoutPercent}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600">
              🏛️ নির্বাচন কমিশন
            </span>
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"
            >
              Back
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {featured.map((candidate) => {
            const partyLabel = getPartyLabel(candidate, partyLookup);
            const symbolLabel = candidate.symbolLabel ?? candidate.symbol ?? "—";
            const symbolImage =
              normalizeSymbolImage(candidate.symbolImageUrl) ??
              normalizeSymbolImage(getPartyLogoForCandidate(candidate, partyLookup));
            const initials = candidate.name
              .split(" ")
              .slice(0, 2)
              .map((chunk) => chunk[0])
              .join("");
            const candidateImage = normalizeCandidateImage(candidate.imageUrl);
            const partyColor = getPartyColor(candidate, partyLookup, partyRoster);
            return (
              <div
                key={candidate.id}
                className="flex items-center justify-between gap-4 rounded-3xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {candidateImage ? (
                    <img
                      src={candidateImage}
                      alt={candidate.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-2xl text-sm font-semibold uppercase text-white"
                      style={{ backgroundColor: partyColor }}
                    >
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="text-base font-semibold text-slate-900">{candidate.name}</div>
                    <div className="text-sm text-slate-600">{partyLabel}</div>
                    <div className="mt-1 text-xs text-slate-500">ভোট {formatVotes(candidate.votes)}</div>
                  </div>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white bg-white text-xl shadow-sm ring-1 ring-slate-200">
                  {symbolImage ? (
                    <img
                      src={symbolImage}
                      alt={symbolLabel}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="h-11 w-11 object-contain"
                    />
                  ) : (
                    symbolLabel
                  )}
                </div>
              </div>
            );
          })}
          {featured.length === 0 && (
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600">
              কোনো প্রার্থী পাওয়া যায়নি।
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">All candidates</h3>
            <p className="text-xs text-slate-400">Live API data for this seat</p>
          </div>
          <span className="text-xs text-slate-400">Total {candidates.length}</span>
        </div>
        <div className="mt-4 grid gap-3">
          {remainingCandidates.map((candidate) => {
            const partyLabel = getPartyLabel(candidate, partyLookup);
            const symbolLabel = candidate.symbolLabel ?? candidate.symbol ?? "—";
            const symbolImage =
              normalizeSymbolImage(candidate.symbolImageUrl) ??
              normalizeSymbolImage(getPartyLogoForCandidate(candidate, partyLookup));
            const initials = candidate.name
              .split(" ")
              .slice(0, 2)
              .map((chunk) => chunk[0])
              .join("");
            const candidateImage = normalizeCandidateImage(candidate.imageUrl);
            const partyColor = getPartyColor(candidate, partyLookup, partyRoster);
            return (
              <div
                key={candidate.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {candidateImage ? (
                    <img
                      src={candidateImage}
                      alt={candidate.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-xs font-semibold uppercase text-white"
                      style={{ backgroundColor: partyColor }}
                    >
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{candidate.name}</div>
                    <div className="text-xs text-slate-400">{partyLabel}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">Votes</div>
                    <div className="text-sm font-semibold text-slate-100">{formatVotes(candidate.votes)}</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-lg shadow-sm ring-1 ring-slate-700">
                    {symbolImage ? (
                      <img
                        src={symbolImage}
                        alt={symbolLabel}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      symbolLabel
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {remainingCandidates.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-500">
              Select a seat to view candidates.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
