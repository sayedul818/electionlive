import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup, type User } from "firebase/auth";
import { scaleLinear } from "d3";
import { auth, googleProvider } from "./firebase";
import SeatGrid, { type SeatLeader } from "./components/SeatGrid";
import SeatCandidatesPage, { getPartyLogoForLabel, normalizePartyText } from "./components/SeatCandidatesPage";
import StatsBar from "./components/StatsBar";
import InteractiveSvgMap from "./components/InteractiveSvgMap";
import {
  candidates as seedCandidates,
  divisions,
  districts,
  parties,
  seats as seedSeats,
  voters as seedVoters,
  type Candidate,
  type Party,
  type Seat,
  type Voter,
  type District,
} from "./data/mock";

type VoteModalState = {
  open: boolean;
  candidateId: string | null;
};

type PartyModalState = {
  open: boolean;
};

type PartyInfo = {
  id: string;
  name: string;
  color: string;
};

const totalSeats = 300;
const turnoutScale = scaleLinear().domain([0, 100]).range([0, 100]).clamp(true);
const partyPalette = ["#2f6fed", "#f97316", "#22c55e", "#94a3b8", "#a855f7", "#0ea5e9", "#f59e0b", "#14b8a6"];
const normalizePartyId = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildSeatLeaders = (candidateList: Candidate[]): Map<number, SeatLeader> => {
  const group = new Map<number, Candidate[]>();
  candidateList.forEach((candidate) => {
    const existing = group.get(candidate.seatId) ?? [];
    existing.push(candidate);
    group.set(candidate.seatId, existing);
  });

  const leaders = new Map<number, SeatLeader>();
  group.forEach((list, seatId) => {
    const sorted = [...list].sort((a, b) => b.votes - a.votes);
    const top = sorted[0];
    const runner = sorted[1];
    if (!top) {
      leaders.set(seatId, { seatId, partyId: "NEUTRAL", leaderName: "No votes", votes: 0, margin: 0 });
      return;
    }
    if (runner && runner.votes === top.votes) {
      leaders.set(seatId, {
        seatId,
        partyId: "NEUTRAL",
        leaderName: "Tied",
        votes: top.votes,
        margin: 0,
      });
      return;
    }
    leaders.set(seatId, {
      seatId,
      partyId: top.partyId,
      leaderName: top.name,
      votes: top.votes,
      margin: runner ? top.votes - runner.votes : top.votes,
    });
  });
  return leaders;
};

const buildSeatGrid = (seatList: Seat[]): Seat[] => {
  const seatMap = new Map<number, Seat>(seatList.map((seat) => [seat.id, seat]));
  return Array.from({ length: totalSeats }, (_, index) => {
    const id = index + 1;
    return (
      seatMap.get(id) ?? {
        id,
        name: `Seat ${id}`,
        divisionId: "",
        districtId: "",
        totalVoters: 150000,
      }
    );
  });
};

const formatVotes = (value: number) => value.toLocaleString("en-BD");
const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/&apos;|’/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, "");
const districtAliases: Record<string, string> = {
  chittagong: "chattogram",
  comilla: "cumilla",
  jessore: "jashore",
  bogra: "bogura",
  barisal: "barishal",
  maulvibazar: "moulvibazar",
};
const normalizeDistrictKey = (value: string) => {
  const base = normalizeText(value);
  return districtAliases[base] ?? base;
};
const normalizeCandidateImage = (url?: string) => {
  if (!url) return undefined;
  return url
    .replace(/&amp;/g, "&")
    .replace(/^http:\/\/103\.183\.38\.66/, "/api");
};
const normalizeSymbolImage = (url?: string) => {
  if (!url) return undefined;
  return url
    .replace(/&amp;/g, "&")
    .replace(/^http:\/\/103\.183\.38\.66/, "/api")
    .replace(/^https:\/\/103\.183\.38\.66/, "/api");
};

const votedGoogleUidsKey = "votedGoogleUids";
const readVotedGoogleUids = () => {
  try {
    const raw = localStorage.getItem(votedGoogleUidsKey);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((value) => typeof value === "string"));
    }
  } catch {
    return new Set<string>();
  }
  return new Set<string>();
};
const writeVotedGoogleUids = (uids: Set<string>) => {
  localStorage.setItem(votedGoogleUidsKey, JSON.stringify(Array.from(uids)));
};

const divisionSvgIdMap: Record<string, string> = {
  Dhaka: "dhaka",
  Chittagong: "chattogram",
  Khulna: "khulna",
  Rajshahi: "rajshahi",
  Rangpur: "rangpur",
  Sylhet: "sylhet",
  Barisal: "barishal",
  Mymensingh: "mymensingh",
};

const divisionMapSrc: Record<string, string> = {
  dhaka: "/all_img/Dhaka Map Chart.svg",
  chattogram: "/all_img/Chittagong Map Chart.svg",
  khulna: "/all_img/Khulna Map Chart.svg",
  rajshahi: "/all_img/Rajshahi Map Chart.svg",
  rangpur: "/all_img/Rangpur Map Chart.svg",
  sylhet: "/all_img/Sylhet Map Chart.svg",
  barishal: "/all_img/Barisal Map Chart.svg",
  mymensingh: "/all_img/Mymensingh Map Chart.svg",
};

const divisionDistrictKeys: Record<string, string[]> = {
  dhaka: [
    "ঢাকা",
    "গাজীপুর",
    "নারায়ণগঞ্জ",
    "নারায়ণগঞ্জ",
    "নরসিংদী",
    "মুন্সীগঞ্জ",
    "মানিকগঞ্জ",
    "টাঙ্গাইল",
    "কিশোরগঞ্জ",
    "মাদারীপুর",
    "শরীয়তপুর",
    "শরিয়তপুর",
    "রাজবাড়ী",
    "রাজবাড়ী",
    "ফরিদপুর",
    "গোপালগঞ্জ",
  ],
  mymensingh: ["ময়মনসিংহ", "ময়মনসিংহ", "জামালপুর", "শেরপুর", "নেত্রকোনা"],
  chattogram: [
    "চট্টগ্রাম",
    "চাটগ্রাম",
    "কুমিল্লা",
    "ফেনী",
    "ব্রাহ্মণবাড়িয়া",
    "ব্রাহ্মণবাড়িয়া",
    "রাঙ্গামাটি",
    "নোয়াখালী",
    "নোয়াখালী",
    "চাঁদপুর",
    "চাঁদপুর",
    "লক্ষ্মীপুর",
    "কক্সবাজার",
    "খাগড়াছড়ি",
    "খাগড়াছড়ি",
    "বান্দরবান",
  ],
  rajshahi: [
    "রাজশাহী",
    "বগুড়া",
    "বগুরা",
    "পাবনা",
    "সিরাজগঞ্জ",
    "নওগাঁ",
    "জয়পুরহাট",
    "জয়পুরহাট",
    "নাটোর",
    "চাঁপাইনবাবগঞ্জ",
  ],
  rangpur: [
    "রংপুর",
    "দিনাজপুর",
    "কুড়িগ্রাম",
    "কুড়িগ্রাম",
    "গাইবান্ধা",
    "লালমনিরহাট",
    "নীলফামারী",
    "পঞ্চগড়",
    "পঞ্চগড়",
    "ঠাকুরগাঁও",
  ],
  khulna: [
    "খুলনা",
    "বাগেরহাট",
    "সাতক্ষীরা",
    "যশোর",
    "যশোরে",
    "জাশোর",
    "নড়াইল",
    "নড়াইল",
    "ঝিনাইদহ",
    "মাগুরা",
    "কুষ্টিয়া",
    "কুষ্টিয়া",
    "চুয়াডাঙ্গা",
    "চুয়াডাঙ্গা",
    "মেহেরপুর",
  ],
  barishal: ["বরিশাল", "ভোলা", "পটুয়াখালী", "পটুয়াখালী", "পিরোজপুর", "ঝালকাঠি", "বরগুনা"],
  sylhet: ["সিলেট", "সুনামগঞ্জ", "মৌলভীবাজার", "মৌলভীবাজার", "হবিগঞ্জ"],
};

function App() {
  const [candidates, setCandidates] = useState<Candidate[]>(
    seedCandidates.map((candidate) => ({ ...candidate, votes: 0 }))
  );
  const [voters, setVoters] = useState<Voter[]>(seedVoters);
  const [seats] = useState<Seat[]>(seedSeats);
  const [uiSeats, setUiSeats] = useState<Seat[]>(seedSeats);
  const [districtsLive, setDistrictsLive] = useState<District[]>([]);
  const [dataNote, setDataNote] = useState<string | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);
  const [hoveredSeatId, setHoveredSeatId] = useState<number | null>(null);
  const [divisionLabelKeys, setDivisionLabelKeys] = useState<string[]>([]);
  const [partyRoster, setPartyRoster] = useState<PartyInfo[]>(parties);
  const [partyModal, setPartyModal] = useState<PartyModalState>({ open: false });
  const [mobileView, setMobileView] = useState<"results" | "vote">("results");
  const [activePage, setActivePage] = useState<"dashboard" | "seat" | "admin">("dashboard");
  const [adminDivisionId, setAdminDivisionId] = useState<string | null>(null);
  const [adminDistrictId, setAdminDistrictId] = useState<string | null>(null);
  const [adminSeatId, setAdminSeatId] = useState<number | null>(null);
  const [adminCandidates, setAdminCandidates] = useState<Candidate[]>([]);
  const [adminUiSeats, setAdminUiSeats] = useState<Seat[]>(seedSeats);
  const [adminVoteInputs, setAdminVoteInputs] = useState<Record<string, number>>({});
  const [adminVoteModal, setAdminVoteModal] = useState<{ open: boolean; candidateId: string | null; value: number }>(
    { open: false, candidateId: null, value: 0 }
  );
  const [adminVoteSaving, setAdminVoteSaving] = useState(false);
  const [seatWinners, setSeatWinners] = useState<Array<{
    seatId: number;
    candidateName: string | null;
    partyLabel?: string | null;
    votes: number;
  }>>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedLiveMapPathId, setSelectedLiveMapPathId] = useState<string | null>(null);
  const [voteModal, setVoteModal] = useState<VoteModalState>({ open: false, candidateId: null });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [hasVotedWithGoogle, setHasVotedWithGoogle] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState("Waiting for votes...");

  const partyLookup = useMemo(() => new Map<string, Party>(parties.map((party) => [party.id, party])), []);
  const apiBase = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE ?? "http://localhost:5000/api";
  const seatGrid = useMemo(() => buildSeatGrid(seats), [seats]);
  const leaders = useMemo(() => buildSeatLeaders(candidates), [candidates]);
  const partyRosterLookup = useMemo(
    () => new Map(partyRoster.map((party) => [party.name, party.color])),
    [partyRoster]
  );
  const getWinnerColor = useCallback(
    (label?: string | null) => {
      if (!label) return undefined;
      const exact = partyRosterLookup.get(label);
      if (exact) return exact;
      const normalized = label.toLowerCase();
      const hash = Array.from(normalized).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return partyPalette[hash % partyPalette.length];
    },
    [partyRosterLookup]
  );
  const leadersForMap = useMemo(() => {
    if (seatWinners.length === 0) return leaders;
    const next = new Map(leaders);
    seatWinners.forEach((winner) => {
      const partyColor = getWinnerColor(winner.partyLabel);
      next.set(winner.seatId, {
        seatId: winner.seatId,
        partyId: winner.partyLabel ?? "NEUTRAL",
        leaderName: winner.candidateName ?? "No winner",
        votes: winner.votes ?? 0,
        margin: 0,
        ...(partyColor ? { partyColor } : {}),
      } as SeatLeader & { partyColor?: string });
    });
    return next;
  }, [leaders, seatWinners, partyRosterLookup]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthError(null);
      if (user) {
        const voted = readVotedGoogleUids();
        setHasVotedWithGoogle(voted.has(user.uid));
      } else {
        setHasVotedWithGoogle(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const isAdminPath = location.pathname.startsWith("/admin");
    if (isAdminPath) {
      setActivePage("admin");
      return;
    }
    if (activePage === "admin") {
      setActivePage("dashboard");
    }
  }, [location.pathname, activePage]);

  useEffect(() => {
    const controller = new AbortController();
    const loadSeatWinners = async () => {
      try {
        const response = await fetch(`${apiBase}/seats/winners`, { signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as Array<{
          seatId: number;
          candidateName: string | null;
          partyLabel?: string | null;
          votes: number;
        }>;
        setSeatWinners(data);
      } catch {
        // ignore
      }
    };
    loadSeatWinners();
    const interval = setInterval(loadSeatWinners, 8000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [apiBase]);

  const stats = useMemo(() => {
    const counts = new Map<string, number>();
    if (seatWinners.length > 0) {
      seatWinners.forEach((winner) => {
        if (!winner.partyLabel) return;
        counts.set(winner.partyLabel, (counts.get(winner.partyLabel) ?? 0) + 1);
      });
      return partyRoster.map((party) => {
        const seatsWon = counts.get(party.name) ?? 0;
        return {
          partyId: party.id,
          seats: seatsWon,
          percent: Math.round((seatsWon / totalSeats) * 100),
        };
      });
    }
    leaders.forEach((leader) => {
      if (leader.partyId === "NEUTRAL") return;
      counts.set(leader.partyId, (counts.get(leader.partyId) ?? 0) + 1);
    });
    return partyRoster.map((party) => {
      const seatsWon = counts.get(party.id) ?? 0;
      return {
        partyId: party.id,
        seats: seatsWon,
        percent: Math.round((seatsWon / totalSeats) * 100),
      };
    });
  }, [leaders, partyRoster, seatWinners]);
  const snapshotRoster = partyRoster.length > 0 ? partyRoster : parties;

  const mapLabelFill = useMemo(() => {
    const next: Record<string, string> = {};
    leadersForMap.forEach((leader, seatId) => {
      const color = (leader as SeatLeader & { partyColor?: string }).partyColor ?? getWinnerColor(leader.partyId);
      if (color) next[String(seatId)] = color;
    });
    return next;
  }, [leadersForMap, getWinnerColor]);

  const topPartyLegend = useMemo(() => {
    const rosterById = new Map(snapshotRoster.map((party) => [party.id, party]));
    const preferredGroups = [
      { key: "ncp", variants: ["ncp", "এনসিপি", "জাতীয়নাগরিকপার্টি", "জাতীয়নাগরিকপার্টি"] },
      { key: "jamaat", variants: ["jamaat", "জামায়াত", "জামায়াত", "জামাতে", "জামায়াতে"] },
      { key: "bnp", variants: ["bnp", "বিএনপি", "বাংলাদেশজাতীয়তাবাদীদল", "বাংলাদেশজাতীয়তাবাদীদল"] },
      { key: "iab", variants: ["iab", "ইসলামিআন্দোলনবাংলাদেশ", "ইসলামিআন্দোলন"] },
    ];

    const normalizedRoster = snapshotRoster.map((party) => ({
      party,
      normalized: normalizePartyText(party.name),
    }));

    const preferred = preferredGroups
      .map((group) => {
        const match = normalizedRoster.find((entry) =>
          group.variants.some((variant) => {
            const normalizedVariant = normalizePartyText(variant);
            return entry.normalized.includes(normalizedVariant) || normalizedVariant.includes(entry.normalized);
          })
        );
        return match?.party ?? null;
      })
      .filter((party): party is PartyInfo => Boolean(party));

    if (preferred.length > 0) {
      return preferred.map((party) => ({
        partyId: party.id,
        seats: stats.find((stat) => stat.partyId === party.id)?.seats ?? 0,
        percent: stats.find((stat) => stat.partyId === party.id)?.percent ?? 0,
        party,
      }));
    }

    return stats
      .map((stat) => ({
        ...stat,
        party: rosterById.get(stat.partyId),
      }))
      .filter((item): item is { partyId: string; seats: number; percent: number; party: PartyInfo } => Boolean(item.party))
      .sort((a, b) => b.seats - a.seats)
      .slice(0, 5);
  }, [stats, snapshotRoster]);

  const isLiveData = districtsLive.length > 0;
  const seatSourceForDetails = isLiveData ? uiSeats : seats;
  const selectedSeat = seatSourceForDetails.find((seat) => seat.id === selectedSeatId) ?? null;
  const hoveredSeat = seatGrid.find((seat) => seat.id === hoveredSeatId) ?? null;
  const candidatesInSeat = useMemo(() => {
    if (!selectedSeatId) return [];
    return candidates
      .filter((candidate) => candidate.seatId === selectedSeatId)
      .sort((a, b) => b.votes - a.votes);
  }, [candidates, selectedSeatId]);

  const hoveredLeader = hoveredSeatId ? leadersForMap.get(hoveredSeatId) : undefined;
  const hoveredPartyLabel =
    hoveredLeader?.partyId && hoveredLeader.partyId !== "NEUTRAL"
      ? String(hoveredLeader.partyId)
      : undefined;
  const hoveredPartyColor = hoveredLeader?.partyColor
    ?? (hoveredPartyLabel ? partyRosterLookup.get(hoveredPartyLabel) : undefined)
    ?? (hoveredLeader?.partyId ? partyLookup.get(hoveredLeader.partyId)?.color : undefined);

  const totalVotesInSeat = candidatesInSeat.reduce((acc, candidate) => acc + candidate.votes, 0);
  const turnoutPercent = selectedSeat
    ? Math.round((totalVotesInSeat / selectedSeat.totalVoters) * 100)
    : 0;

  useEffect(() => {
    if (isLiveData) return undefined;
    const interval = setInterval(() => {
      setCandidates((current) => {
        const target = current[Math.floor(Math.random() * current.length)];
        if (!target) return current;
        const updated = current.map((candidate) =>
          candidate.id === target.id ? { ...candidate, votes: candidate.votes + 1 } : candidate
        );
        setLiveUpdate(`Live update: ${target.name} gained 1 vote in seat ${target.seatId}.`);
        return updated;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [isLiveData]);

  useEffect(() => {
    const controller = new AbortController();
    const loadDistricts = async () => {
      try {
        const response = await fetch(
          "/api/election-settings/get-election-zilla?electionID=478",
          { signal: controller.signal }
        );
        const json = await response.json();
        if (!json?.zillas) return;
        const mapped: District[] = json.zillas.map((zilla: { zilla_name: string; zillaID: string }) => ({
          id: zilla.zillaID,
          divisionId: "all",
          name: zilla.zilla_name,
        }));
        setDistrictsLive(mapped);
        setDataNote("Live district data loaded.");
      } catch (error) {
        setDataNote("Using mock data (live API not reachable).");
      }
    };
    loadDistricts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedDivisionId) {
      setDivisionLabelKeys([]);
      return;
    }
    const mapKey = divisionSvgIdMap[selectedDivisionId] ?? selectedDivisionId;
    const mapSrc = divisionMapSrc[mapKey];
    if (!mapSrc) {
      setDivisionLabelKeys([]);
      return;
    }
    const controller = new AbortController();
    const loadDivisionLabels = async () => {
      try {
        const response = await fetch(mapSrc, { signal: controller.signal });
        if (!response.ok) {
          setDivisionLabelKeys([]);
          return;
        }
        const svgText = await response.text();
        const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const labels = Array.from(doc.querySelectorAll(".maplabels1"));
        const keys = labels
          .map((label) => label.textContent?.trim())
          .filter((text): text is string => Boolean(text))
          .map((text) => normalizeDistrictKey(text));
        setDivisionLabelKeys(keys);
      } catch {
        setDivisionLabelKeys([]);
      }
    };
    loadDivisionLabels();
    return () => controller.abort();
  }, [selectedDivisionId]);

  useEffect(() => {
    if (!isLiveData) {
      setPartyRoster(parties);
      return;
    }
    const controller = new AbortController();
    const parsePartyNamesFromHtml = (text: string): string[] => {
      const rawHtml = text.trim().startsWith("\"") ? JSON.parse(text) : text;
      const sanitizedHtml = rawHtml.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
      const decodedHtml = sanitizedHtml.includes("\\u003c")
        ? sanitizedHtml
            .replace(/\\u003c/g, "<")
            .replace(/\\u003e/g, ">")
            .replace(/\\u0026amp;/g, "&amp;")
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
        : sanitizedHtml;
      const wrappedHtml = `<table>${decodedHtml}</table>`;
      const doc = new DOMParser().parseFromString(wrappedHtml, "text/html");
      const rows = Array.from(doc.querySelectorAll("tr"));
      return rows
        .map((row) => row.querySelectorAll("td")[2]?.textContent?.trim())
        .filter((name): name is string => Boolean(name));
    };
    const extractPartyNames = (payload: unknown): string[] => {
      const json = payload as Record<string, unknown> | unknown[] | null;
      const list =
        (json as { parties?: unknown[] })?.parties ??
        (json as { party_list?: unknown[] })?.party_list ??
        (json as { partyList?: unknown[] })?.partyList ??
        (json as { data?: unknown[] })?.data ??
        (Array.isArray(json) ? json : null);
      if (!Array.isArray(list)) return [];
      return list
        .map((item) => (item as { party_name?: string; partyName?: string; name?: string; title?: string })?.party_name
          ?? (item as { partyName?: string })?.partyName
          ?? (item as { name?: string })?.name
          ?? (item as { title?: string })?.title)
        .filter((name): name is string => Boolean(name));
    };
    const buildRoster = (names: string[]) =>
      names.map((name, index) => ({
        id: normalizePartyId(name),
        name,
        color: partyPalette[index % partyPalette.length],
      }));
    const loadParties = async () => {
      const urls = [
        "/api/election-settings/get-election-party?electionID=478",
        "/api/election-settings/get-party?electionID=478",
        "/api/election/get-party?electionID=478",
      ];
      for (const url of urls) {
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) continue;
          const json = await response.json();
          const names = extractPartyNames(json);
          if (names.length > 0) {
            setPartyRoster(buildRoster(names));
            return;
          }
        } catch {
          continue;
        }
      }
      const zillaId = selectedDistrictId ?? districtsLive[0]?.id ?? "";
      if (zillaId) {
        try {
          const response = await fetch(
            `/api/get/candidate/data?zilla_id=${zillaId}&candidate_type=1&election_id=478&constituency_id=&ward_id=&status_id=11`,
            { signal: controller.signal, credentials: "include" }
          );
          if (response.ok) {
            const text = await response.text();
            const names = parsePartyNamesFromHtml(text);
            const uniqueNames = Array.from(new Set(names));
            if (uniqueNames.length > 0) {
              setPartyRoster(buildRoster(uniqueNames));
              return;
            }
          }
        } catch {
          // ignore
        }
      }
      const fallbackNames = Array.from(
        new Set(candidates.map((candidate) => candidate.partyLabel).filter((name): name is string => Boolean(name)))
      );
      if (fallbackNames.length > 0) {
        setPartyRoster(buildRoster(fallbackNames));
      }
    };
    loadParties();
    return () => controller.abort();
  }, [isLiveData, candidates, selectedDistrictId, districtsLive]);

  useEffect(() => {
    if (!selectedDistrictId || !isLiveData) return;
    const controller = new AbortController();
    const loadConstituencies = async () => {
      try {
        const response = await fetch(
          `/api/election/get-setting-constituency?zillaID=${selectedDistrictId}&electionID=478`,
          { signal: controller.signal }
        );
        const json = await response.json();
        if (!json?.constituencies) return;
        const mapped: Seat[] = json.constituencies.map(
          (constituency: { constituencyID: string; constituency_name: string }) => ({
            id: Number(constituency.constituencyID),
            divisionId: selectedDivisionId ?? "all",
            districtId: selectedDistrictId,
            name: constituency.constituency_name,
            totalVoters: 150000,
          })
        );
        setUiSeats(mapped);
      } catch (error) {
        setUiSeats(seedSeats);
      }
    };
    loadConstituencies();
    return () => controller.abort();
  }, [selectedDistrictId, isLiveData, selectedDivisionId]);

  useEffect(() => {
    if (!adminDistrictId || !isLiveData) {
      setAdminUiSeats(seedSeats);
      return;
    }
    const controller = new AbortController();
    const loadAdminConstituencies = async () => {
      try {
        const response = await fetch(
          `/api/election/get-setting-constituency?zillaID=${adminDistrictId}&electionID=478`,
          { signal: controller.signal }
        );
        const json = await response.json();
        if (!json?.constituencies) return;
        const mapped: Seat[] = json.constituencies.map(
          (constituency: { constituencyID: string; constituency_name: string }) => ({
            id: Number(constituency.constituencyID),
            divisionId: adminDivisionId ?? "all",
            districtId: adminDistrictId,
            name: constituency.constituency_name,
            totalVoters: 150000,
          })
        );
        setAdminUiSeats(mapped);
      } catch {
        setAdminUiSeats(seedSeats);
      }
    };
    loadAdminConstituencies();
    return () => controller.abort();
  }, [adminDistrictId, adminDivisionId, isLiveData]);

  useEffect(() => {
    if (!selectedSeatId || !selectedDistrictId || !isLiveData) return;
    const controller = new AbortController();
    const parseCandidatesFromHtml = (text: string, seatId: number): Candidate[] => {
      const rawHtml = text.trim().startsWith("\"") ? JSON.parse(text) : text;
      const sanitizedHtml = rawHtml.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
      const decodedHtml = sanitizedHtml.includes("\\u003c")
        ? sanitizedHtml
            .replace(/\\u003c/g, "<")
            .replace(/\\u003e/g, ">")
            .replace(/\\u0026amp;/g, "&amp;")
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
        : sanitizedHtml;
      const wrappedHtml = `<table>${decodedHtml}</table>`;
      const doc = new DOMParser().parseFromString(wrappedHtml, "text/html");
      const rows = Array.from(doc.querySelectorAll("tr"));
      return rows
        .map((row, index) => {
          const cells = row.querySelectorAll("td");
          const name = cells[0]?.textContent?.trim();
          if (!name) return null;
          const imageUrl = cells[1]?.querySelector("img")?.getAttribute("src") ?? undefined;
          const partyLabel = cells[2]?.textContent?.trim() ?? "Independent";
          const symbolCell = cells[3];
          const symbolLabel = symbolCell?.textContent?.trim() ?? "";
          const symbolImageUrl = symbolCell?.querySelector("img")?.getAttribute("src") ?? undefined;
          return {
            id: `live-${seatId}-${index}`,
            name,
            partyId: "IND",
            seatId: Number(seatId),
            symbol: symbolLabel || "—",
            votes: 0,
            imageUrl,
            partyLabel,
            symbolLabel,
            symbolImageUrl,
          } as Candidate;
        })
        .filter((item): item is Candidate => Boolean(item));
    };
    const loadCandidates = async () => {
      try {
        const response = await fetch(
          `/api/get/candidate/data?zilla_id=${selectedDistrictId}&candidate_type=1&election_id=478&constituency_id=${selectedSeatId}&ward_id=&status_id=11`,
          { signal: controller.signal, credentials: "include" }
        );
        const text = await response.text();
        const parsed = parseCandidatesFromHtml(text, selectedSeatId);
        if (parsed.length > 0) {
          setCandidates(parsed);
          setLiveUpdate(`Live candidate list loaded (${parsed.length}).`);
          setDataNote(`Live candidates for seat ${selectedSeatId} loaded.`);
        } else {
          setDataNote("No candidates returned for this seat.");
        }
      } catch (error) {
        setCandidates(seedCandidates.filter((candidate) => candidate.seatId === selectedSeatId));
        setDataNote("Using mock candidates (live candidate API failed)." );
      }
    };
    loadCandidates();
    return () => controller.abort();
  }, [selectedSeatId, selectedDistrictId, isLiveData]);

  useEffect(() => {
    if (!adminSeatId || !adminDistrictId) {
      setAdminCandidates([]);
      setAdminVoteInputs({});
      return;
    }
    const controller = new AbortController();
    const loadAdminCandidates = async () => {
      try {
        const response = await fetch(`${apiBase}/seats/${adminSeatId}/candidates`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to load candidates");
        const parsed = (await response.json()) as Candidate[];
        const normalized = parsed.map((candidate) => ({
          ...candidate,
          id: (candidate as { _id?: string })._id ?? candidate.id,
        }));
        if (normalized.length === 0) {
          await fetch(`${apiBase}/seats/${adminSeatId}/candidates/sync?zillaId=${adminDistrictId}`, {
            method: "POST",
            signal: controller.signal,
          });
          const retry = await fetch(`${apiBase}/seats/${adminSeatId}/candidates`, {
            signal: controller.signal,
          });
          const retryParsed = (await retry.json()) as Candidate[];
          const retryNormalized = retryParsed.map((candidate) => ({
            ...candidate,
            id: (candidate as { _id?: string })._id ?? candidate.id,
          }));
          setAdminCandidates(retryNormalized);
          setAdminVoteInputs(Object.fromEntries(retryNormalized.map((candidate) => [candidate.id, candidate.votes])));
          return;
        }
        setAdminCandidates(normalized);
        setAdminVoteInputs(Object.fromEntries(normalized.map((candidate) => [candidate.id, candidate.votes])));
      } catch {
        const localCandidates = seedCandidates.filter((candidate) => candidate.seatId === adminSeatId);
        setAdminCandidates(localCandidates);
        setAdminVoteInputs(
          Object.fromEntries(localCandidates.map((candidate) => [candidate.id, candidate.votes]))
        );
      }
    };
    loadAdminCandidates();
    return () => controller.abort();
  }, [adminSeatId, adminDistrictId, apiBase]);

  const handleSelectDivision = (divisionId: string) => {
    setSelectedDivisionId(divisionId);
    setSelectedDistrictId(null);
    setSelectedSeatId(null);
    setActivePage("dashboard");
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const handleSelectDistrict = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setSelectedSeatId(null);
    setActivePage("dashboard");
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const handleOpenSeat = (seatId: number) => {
    setSelectedSeatId(seatId);
    setActivePage("seat");
    if (!location.pathname.startsWith("/admin")) {
      navigate("/seat");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setAuthError("Google sign-in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const markGoogleVote = (uid: string) => {
    const voted = readVotedGoogleUids();
    voted.add(uid);
    writeVotedGoogleUids(voted);
    setHasVotedWithGoogle(true);
  };

  const handleOpenVote = (candidateId: string) => {
    setVoteModal({ open: true, candidateId });
    setFormError(null);
    setFormSuccess(null);
    setAuthError(null);
  };

  const handleConfirmVote = () => {
    setFormError(null);
    setFormSuccess(null);

    if (!voteModal.candidateId || !selectedSeatId) {
      setFormError("Select a seat and candidate first.");
      return;
    }

    if (!authUser) {
      setFormError("Please continue with Google to verify your vote.");
      return;
    }

    const votedUids = readVotedGoogleUids();
    if (votedUids.has(authUser.uid)) {
      setFormError("This Google account has already voted.");
      setHasVotedWithGoogle(true);
      return;
    }

    if (isLiveData) {
      setCandidates((current) =>
        current.map((candidate) =>
          candidate.id === voteModal.candidateId
            ? { ...candidate, votes: candidate.votes + 1 }
            : candidate
        )
      );
      setFormSuccess("Vote recorded (demo mode for live data).");
      setLiveUpdate(`Manual vote recorded in seat ${selectedSeatId}.`);
      markGoogleVote(authUser.uid);
      return;
    }

    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === voteModal.candidateId
          ? { ...candidate, votes: candidate.votes + 1 }
          : candidate
      )
    );
    setFormSuccess("Vote recorded successfully.");
    setLiveUpdate(`Manual vote recorded in seat ${selectedSeatId}.`);
    markGoogleVote(authUser.uid);
    setMobileView("results");
  };

  const districtsSource = isLiveData ? districtsLive : districts;
  const filterDistrictsByDivision = (divisionId: string | null) => {
    if (!divisionId) return [] as District[];
    if (isLiveData) {
      const mapKey = divisionSvgIdMap[divisionId] ?? divisionId;
      const labelKeys = divisionLabelKeys;
      const fallbackKeys = (divisionDistrictKeys[mapKey] ?? []).map((name) =>
        normalizeDistrictKey(name)
      );
      const allowedKeys = Array.from(new Set([...labelKeys, ...fallbackKeys]));
      return districtsSource.filter((district) =>
        allowedKeys.includes(normalizeDistrictKey(district.name))
      );
    }
    return districtsSource.filter((district) => district.divisionId === divisionId);
  };
  const filterAdminDistrictsByDivision = (divisionId: string | null) => {
    if (!divisionId) return [] as District[];
    if (!isLiveData) return districtsSource.filter((district) => district.divisionId === divisionId);
    const mapKey = divisionSvgIdMap[divisionId] ?? divisionId;
    const fallbackKeys = (divisionDistrictKeys[mapKey] ?? []).map((name) =>
      normalizeDistrictKey(name)
    );
    if (fallbackKeys.length === 0) return districtsSource;
    const allowedKeys = Array.from(new Set(fallbackKeys));
    return districtsSource.filter((district) =>
      allowedKeys.includes(normalizeDistrictKey(district.name))
    );
  };
  const filterSeatsByDistrict = (districtId: string | null) =>
    districtId
      ? (isLiveData ? uiSeats : seats).filter((seat) => seat.districtId === districtId)
      : [];

  const filteredDistricts = filterDistrictsByDivision(selectedDivisionId);
  const filteredSeats = filterSeatsByDistrict(selectedDistrictId);
  const adminFilteredDistricts = filterAdminDistrictsByDivision(adminDivisionId);
  const adminFilteredSeats = adminDistrictId
    ? (isLiveData ? adminUiSeats : seats).filter((seat) => seat.districtId === adminDistrictId)
    : [];
  const selectedSeatLeader = selectedSeatId ? leadersForMap.get(selectedSeatId) : undefined;
  const selectedSeatPartyColor =
    selectedSeatLeader?.partyId && selectedSeatLeader.partyId !== "NEUTRAL"
      ? getWinnerColor(String(selectedSeatLeader.partyId)) ?? partyLookup.get(selectedSeatLeader.partyId)?.color
      : undefined;
  const liveMapActiveFill = selectedSeatPartyColor ?? "#22c55e";
  const isConfirmDisabled = !authUser || hasVotedWithGoogle || isSigningIn;

  const adminTotalVotes = adminCandidates.reduce((acc, candidate) => acc + candidate.votes, 0);
  const adminWinner = adminCandidates
    .slice()
    .sort((a, b) => b.votes - a.votes)[0];
  const adminTotalVoters = adminFilteredSeats.find((seat) => seat.id === adminSeatId)?.totalVoters ?? 0;
  const adminWinnerPercent = adminTotalVoters > 0
    ? Math.round(((adminWinner?.votes ?? 0) / adminTotalVoters) * 100)
    : 0;

  const adminSection = (
    <section className="grid gap-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Admin Panel</h2>
            <p className="text-xs text-slate-400">Division → District → Seat → Candidate</p>
          </div>
          <button
            type="button"
            onClick={() => setActivePage("dashboard")}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
          >
            Back to dashboard
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-xs text-slate-400">
            Division
            <select
              value={adminDivisionId ?? ""}
              onChange={(event) => {
                const value = event.target.value || null;
                setAdminDivisionId(value);
                setAdminDistrictId(null);
                setAdminSeatId(null);
                setAdminCandidates([]);
              }}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Select division</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-xs text-slate-400">
            District
            <select
              value={adminDistrictId ?? ""}
              onChange={(event) => {
                const value = event.target.value || null;
                setAdminDistrictId(value);
                setAdminSeatId(null);
                setAdminCandidates([]);
              }}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              disabled={!adminDivisionId}
            >
              <option value="">Select district</option>
              {adminFilteredDistricts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-xs text-slate-400">
            Seat
            <select
              value={adminSeatId ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);
                setAdminSeatId(Number.isNaN(value) ? null : value);
              }}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              disabled={!adminDistrictId}
            >
              <option value="">Select seat</option>
              {adminFilteredSeats.map((seat) => (
                <option key={seat.id} value={seat.id}>
                  {seat.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {adminDistrictId && adminFilteredSeats.length === 0 && (
          <p className="mt-3 text-xs text-slate-500">No seats found for this district.</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Candidates</h3>
            <p className="text-xs text-slate-400">Add votes for a specific seat</p>
          </div>
          {adminSeatId && (
            <div className="text-right text-xs text-slate-400">
              <div>Total votes: {formatVotes(adminTotalVotes)}</div>
            </div>
          )}
        </div>
        {adminSeatId && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-5">
            <div className="text-center text-xs uppercase tracking-wide text-slate-500">Winner</div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-3">
                {adminWinner?.imageUrl ? (
                  <img
                    src={normalizeCandidateImage(adminWinner.imageUrl)}
                    alt={adminWinner.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-sm font-semibold text-slate-200">
                    {adminWinner?.name
                      ?.split(" ")
                      .slice(0, 2)
                      .map((chunk) => chunk[0])
                      .join("") ?? "—"}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-slate-100">
                  {adminWinner?.name ?? "—"}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {adminWinner?.partyLabel ?? (adminWinner ? partyLookup.get(adminWinner.partyId)?.name : "") ?? ""}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Total votes: {formatVotes(adminWinner?.votes ?? 0)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Winner share: {adminWinnerPercent}% of {formatVotes(adminTotalVoters)} voters
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white bg-white text-lg shadow-sm ring-1 ring-slate-200">
                  {adminWinner &&
                  normalizeSymbolImage(
                    adminWinner.symbolImageUrl ??
                      getPartyLogoForLabel(
                        adminWinner.partyLabel ?? partyLookup.get(adminWinner.partyId)?.name ?? ""
                      )
                  ) ? (
                    <img
                      src={normalizeSymbolImage(
                        adminWinner.symbolImageUrl ??
                          getPartyLogoForLabel(
                            adminWinner.partyLabel ?? partyLookup.get(adminWinner.partyId)?.name ?? ""
                          )
                      )}
                      alt={adminWinner.symbolLabel ?? adminWinner.symbol ?? "symbol"}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    adminWinner?.symbolLabel ?? adminWinner?.symbol ?? "—"
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!adminSeatId && (
          <p className="mt-4 text-xs text-slate-500">Select a seat to manage candidates.</p>
        )}

        {adminSeatId && (
          <div className="mt-4 grid gap-3">
            {adminCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-100">{candidate.name}</div>
                  <div className="text-xs text-slate-400">
                    {candidate.partyLabel ?? partyLookup.get(candidate.partyId)?.name ?? "Unknown Party"}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">Symbol: {candidate.symbolLabel ?? candidate.symbol}</div>
                </div>
                <div className="flex flex-1 flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 text-center">
                    <div className="text-[10px] text-slate-500">Votes</div>
                    <div className="text-lg font-semibold text-slate-100">{formatVotes(candidate.votes)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAdminVoteModal({
                        open: true,
                        candidateId: candidate.id,
                        value: adminVoteInputs[candidate.id] ?? candidate.votes,
                      })
                    }
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                  >
                    Edit votes
                  </button>
                </div>
              </div>
            ))}
            {adminCandidates.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-500">
                No candidates found for this seat.
              </div>
            )}
          </div>
        )}
      </div>

    </section>
  );


  const resultsSection = (
    <section className="grid gap-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Live Result Map</h2>
            <p className="text-xs text-slate-400">300-seat Bangladesh overview (SVG)</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setPartyModal({ open: true })}
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 transition hover:border-slate-500"
            >
              All party
            </button>
            <span className="rounded-full border border-slate-700 px-3 py-1">Auto updates</span>
            <span className="rounded-full border border-slate-700 px-3 py-1">Hover for details</span>
          </div>
        </div>
        <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <InteractiveSvgMap
            src="/all_img/Bangladesh_election_2024.svg"
            interactivePaths
            baseFill="#ffffff"
            labelFillMap={mapLabelFill}
            selectedPathId={selectedLiveMapPathId}
            onSelectPath={(pathId) => {
              setSelectedLiveMapPathId(pathId);
              setLiveUpdate("Live map selection updated.");
            }}
            onHoverLabel={(label) => {
              if (!label) {
                setHoveredSeatId(null);
                return;
              }
              const parsed = Number(label);
              setHoveredSeatId(Number.isNaN(parsed) ? null : parsed);
            }}
            hoverFill="#38bdf8"
            activeFill={liveMapActiveFill}
            className="h-[520px] w-full"
          />
          <div className="absolute right-4 top-4 rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs text-slate-200">
            <div className="text-[10px] uppercase text-slate-500">Top 5 parties</div>
            <div className="mt-2 space-y-1">
              {topPartyLegend.map((item) => (
                <div key={item.partyId} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.party.color }} />
                    <span className="text-[11px] text-slate-100">{item.party.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{item.seats}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute left-4 top-4 rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs text-slate-300">
            <div className="text-[10px] uppercase text-slate-500">Hovered Seat</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              {hoveredSeat?.name ?? "Hover a seat"}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Party: {hoveredPartyLabel ?? "—"}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: hoveredPartyColor ?? "#64748b" }}
              />
              <span>{hoveredLeader?.leaderName ?? "No leader yet"}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Votes: {hoveredLeader?.votes ?? 0} • Margin: {hoveredLeader?.margin ?? 0}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Each seat is colored by the current leading party. Ties appear neutral.
        </p>
      </div>
      <StatsBar partyRoster={snapshotRoster} stats={stats} totalSeats={totalSeats} />
      <SeatGrid
        seats={seatGrid}
        leaders={leadersForMap}
        partyLookup={partyLookup}
        selectedSeatId={selectedSeatId}
        onSelect={handleOpenSeat}
        onHover={setHoveredSeatId}
      />
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
        <span className="text-emerald-300">{liveUpdate}</span>
        {dataNote && <span className="mt-1 block text-[11px] text-slate-400">{dataNote}</span>}
      </div>
    </section>
  );

  const votingSection = (
    <section className="grid gap-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Interactive Voting Map</h2>
            <p className="text-xs text-slate-400">Division → District → Seat → Candidate</p>
          </div>
          <div className="text-xs text-slate-400">
            Step {selectedSeatId ? 4 : selectedDistrictId ? 3 : selectedDivisionId ? 2 : 1}
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-300">Step 1: Choose Division</h3>
            <p className="text-[11px] text-slate-500">Tip: Click a division on the map above.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {divisions.map((division) => (
                <button
                  key={division.id}
                  type="button"
                  onClick={() => handleSelectDivision(division.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    selectedDivisionId === division.id
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {division.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-300">Step 2: Choose District</h3>
            <p className="text-[11px] text-slate-500">Click any district to reveal seats.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!selectedDivisionId && (
                <span className="text-xs text-slate-500">Select a division first.</span>
              )}
              {selectedDivisionId && filteredDistricts.length === 0 && (
                <span className="text-xs text-slate-500">No districts found for this division.</span>
              )}
              {filteredDistricts.map((district) => (
                <button
                  key={district.id}
                  type="button"
                  onClick={() => handleSelectDistrict(district.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    selectedDistrictId === district.id
                      ? "border-sky-400 bg-sky-500/20 text-sky-200"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {district.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-300">Step 3: Choose Seat</h3>
            <p className="text-[11px] text-slate-500">Seats appear after you pick a district.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredSeats.length === 0 && (
                <span className="text-xs text-slate-500">Select a district to view seats.</span>
              )}
              {filteredSeats.map((seat) => (
                <button
                  key={seat.id}
                  type="button"
                  onClick={() => handleOpenSeat(seat.id)}
                  className={`rounded-xl border px-3 py-2 text-xs transition ${
                    selectedSeatId === seat.id
                      ? "border-violet-400 bg-violet-500/20 text-violet-200"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <div className="font-semibold">{seat.name}</div>
                  <div className="text-[10px] text-slate-400">Voters: {formatVotes(seat.totalVoters)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Mini Election Commission</h1>
            <p className="text-xs text-slate-400">Vote on the right, watch national impact on the left.</p>
          </div>
          <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            Live updates active
          </div>
        </div>
      </header>
      {activePage === "dashboard" && (
        <div className="mx-auto w-full max-w-7xl px-6 pt-4">
          <div className="flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 p-1">
            <button
              type="button"
              onClick={() => setMobileView("results")}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                mobileView === "results"
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              Live result
            </button>
            <button
              type="button"
              onClick={() => setMobileView("vote")}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                mobileView === "vote"
                  ? "bg-sky-500/20 text-sky-200"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              Live voting
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6">
        {activePage === "seat" ? (
          selectedSeat ? (
            <SeatCandidatesPage
              seat={selectedSeat}
              candidates={candidatesInSeat}
              partyLookup={partyLookup}
              partyRoster={snapshotRoster}
              totalVotes={totalVotesInSeat}
              turnoutPercent={turnoutPercent}
              onBack={() => {
                setActivePage("dashboard");
                navigate("/");
              }}
            />
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
              Select a seat to view candidates.
            </div>
          )
        ) : activePage === "admin" ? (
          adminSection
        ) : mobileView === "results" ? (
          resultsSection
        ) : (
          votingSection
        )}
      </main>

      {partyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">All party</h3>
              <button
                type="button"
                onClick={() => setPartyModal({ open: false })}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {snapshotRoster.map((party) => (
                <div
                  key={party.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: party.color }} />
                    <div className="text-xs font-semibold text-slate-200">{party.name}</div>
                  </div>
                  <div className="text-[10px] uppercase text-slate-500">{party.id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {voteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-slate-100">Confirm Vote</h3>
            <p className="mt-1 text-xs text-slate-400">
              Verify with Google, then enter voter ID and OTP (optional).
            </p>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100">Google verification</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    authUser ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {authUser ? "Verified" : "Required"}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">One vote per Google account.</p>
              {authUser && (
                <div className="mt-2 text-[11px] text-slate-300">
                  Signed in as{" "}
                  <span className="font-semibold text-slate-100">
                    {authUser.email ?? authUser.displayName ?? "Google user"}
                  </span>
                </div>
              )}
              {hasVotedWithGoogle && authUser && (
                <p className="mt-2 text-[11px] text-rose-400">This Google account has already voted.</p>
              )}
              {authError && <p className="mt-2 text-[11px] text-rose-400">{authError}</p>}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningIn ? "Signing in..." : "Continue with Google"}
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {formError && <p className="text-xs text-rose-400">{formError}</p>}
              {formSuccess && <p className="text-xs text-emerald-300">{formSuccess}</p>}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setVoteModal({ open: false, candidateId: null })}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVote}
                disabled={isConfirmDisabled}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  isConfirmDisabled
                    ? "cursor-not-allowed bg-slate-700 text-slate-400"
                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                }`}
              >
                Confirm Vote
              </button>
            </div>
          </div>
        </div>
      )}
      {adminVoteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-slate-100">Edit votes</h3>
            <p className="mt-1 text-xs text-slate-400">Set the total votes for this candidate.</p>
            <div className="mt-4 grid gap-2">
              <label className="text-xs text-slate-400">Votes</label>
              <input
                type="number"
                min={0}
                value={adminVoteModal.value}
                onChange={(event) =>
                  setAdminVoteModal((current) => ({
                    ...current,
                    value: Math.max(0, Number(event.target.value || 0)),
                  }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAdminVoteModal({ open: false, candidateId: null, value: 0 })}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!adminVoteModal.candidateId) return;
                  const nextValue = Math.max(0, adminVoteModal.value);
                  const seatId = adminSeatId;
                  if (!seatId) return;
                  setAdminVoteSaving(true);
                  fetch(`${apiBase}/seats/${seatId}/candidates/${adminVoteModal.candidateId}/votes`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ votes: nextValue }),
                  })
                    .then(async (response) => {
                      if (!response.ok) throw new Error("Failed to update votes");
                      const payload = (await response.json()) as { candidate: Candidate };
                      setAdminVoteInputs((current) => ({
                        ...current,
                        [adminVoteModal.candidateId as string]: payload.candidate.votes,
                      }));
                      setAdminCandidates((current) =>
                        current.map((item) =>
                          item.id === adminVoteModal.candidateId ? { ...item, votes: payload.candidate.votes } : item
                        )
                      );
                      setCandidates((current) =>
                        current.map((item) =>
                          item.id === adminVoteModal.candidateId ? { ...item, votes: payload.candidate.votes } : item
                        )
                      );
                      setAdminVoteModal({ open: false, candidateId: null, value: 0 });
                    })
                    .catch(() => {
                      setAdminVoteModal({ open: false, candidateId: null, value: 0 });
                    })
                    .finally(() => setAdminVoteSaving(false));
                }}
                disabled={adminVoteSaving}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  adminVoteSaving
                    ? "cursor-not-allowed bg-slate-700 text-slate-400"
                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                }`}
              >
                {adminVoteSaving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
