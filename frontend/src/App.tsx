import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, type User } from "firebase/auth";
import { scaleLinear } from "d3";
import { auth, googleProvider } from "./firebase";
import SeatGrid, { type SeatLeader } from "./components/SeatGrid";
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
  const seatGrid = useMemo(() => buildSeatGrid(seats), [seats]);
  const leaders = useMemo(() => buildSeatLeaders(candidates), [candidates]);

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

  const stats = useMemo(() => {
    const counts = new Map<string, number>();
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
  }, [leaders, partyRoster]);
  const snapshotRoster = partyRoster.length > 0 ? partyRoster : parties;

  const isLiveData = districtsLive.length > 0;
  const seatSourceForDetails = isLiveData ? uiSeats : seats;
  const selectedSeat = seatSourceForDetails.find((seat) => seat.id === selectedSeatId) ?? null;
  const hoveredSeat = seats.find((seat) => seat.id === hoveredSeatId) ?? null;
  const candidatesInSeat = useMemo(() => {
    if (!selectedSeatId) return [];
    return candidates
      .filter((candidate) => candidate.seatId === selectedSeatId)
      .sort((a, b) => b.votes - a.votes);
  }, [candidates, selectedSeatId]);

  const hoveredLeader = hoveredSeatId ? leaders.get(hoveredSeatId) : undefined;
  const hoveredParty = hoveredLeader?.partyId && hoveredLeader.partyId !== "NEUTRAL"
    ? partyLookup.get(hoveredLeader.partyId)
    : undefined;

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
    if (!selectedSeatId || !selectedDistrictId || !isLiveData) return;
    const controller = new AbortController();
    const loadCandidates = async () => {
      try {
        const response = await fetch(
          `/api/get/candidate/data?zilla_id=${selectedDistrictId}&candidate_type=1&election_id=478&constituency_id=${selectedSeatId}&ward_id=&status_id=11`,
          { signal: controller.signal, credentials: "include" }
        );
        const text = await response.text();
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
        const parsed: Candidate[] = rows
          .map((row, index) => {
            const cells = row.querySelectorAll("td");
            const name = cells[0]?.textContent?.trim();
            if (!name) return null;
            const imageUrl = cells[1]?.querySelector("img")?.getAttribute("src") ?? undefined;
            const partyLabel = cells[2]?.textContent?.trim() ?? "Independent";
            const symbolLabel = cells[3]?.textContent?.trim() ?? "";
            return {
              id: `live-${selectedSeatId}-${index}`,
              name,
              partyId: "IND",
              seatId: Number(selectedSeatId),
              symbol: symbolLabel || "—",
              votes: 0,
              imageUrl,
              partyLabel,
              symbolLabel,
            } as Candidate;
          })
          .filter((item): item is Candidate => Boolean(item));
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

  const handleSelectDivision = (divisionId: string) => {
    setSelectedDivisionId(divisionId);
    setSelectedDistrictId(null);
    setSelectedSeatId(null);
  };

  const handleSelectDistrict = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setSelectedSeatId(null);
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
  const filteredDistricts = selectedDivisionId
    ? isLiveData
      ? (() => {
          const mapKey = divisionSvgIdMap[selectedDivisionId] ?? selectedDivisionId;
          const labelKeys = divisionLabelKeys;
          const fallbackKeys = (divisionDistrictKeys[mapKey] ?? []).map((name) =>
            normalizeDistrictKey(name)
          );
          const allowedKeys = Array.from(new Set([...labelKeys, ...fallbackKeys]));
          return districtsSource.filter((district) =>
            allowedKeys.includes(normalizeDistrictKey(district.name))
          );
        })()
      : districtsSource.filter((district) => district.divisionId === selectedDivisionId)
    : [];
  const filteredSeats = selectedDistrictId
    ? (isLiveData ? uiSeats : seats).filter((seat) => seat.districtId === selectedDistrictId)
    : [];
  const selectedSeatLeader = selectedSeatId ? leaders.get(selectedSeatId) : undefined;
  const selectedSeatPartyColor =
    selectedSeatLeader?.partyId && selectedSeatLeader.partyId !== "NEUTRAL"
      ? partyLookup.get(selectedSeatLeader.partyId)?.color
      : undefined;
  const liveMapActiveFill = selectedSeatPartyColor ?? "#22c55e";
  const isConfirmDisabled = !authUser || hasVotedWithGoogle || isSigningIn;


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
            selectedPathId={selectedLiveMapPathId}
            onSelectPath={(pathId) => {
              setSelectedLiveMapPathId(pathId);
              setLiveUpdate("Live map selection updated.");
            }}
            hoverFill="#38bdf8"
            activeFill={liveMapActiveFill}
            className="h-[520px] w-full"
          />
          <div className="absolute left-4 top-4 rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs text-slate-300">
            <div className="text-[10px] uppercase text-slate-500">Hovered Seat</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              {hoveredSeat?.name ?? "Hover a seat"}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: hoveredParty?.color ?? "#64748b" }}
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
        leaders={leaders}
        partyLookup={partyLookup}
        selectedSeatId={selectedSeatId}
        onSelect={(seatId) => setSelectedSeatId(seatId)}
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
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <InteractiveSvgMap
            src="/all_img/Proposed_Divisions_of_Bangladesh_(English).svg"
            idMap={divisionSvgIdMap}
            selectedId={selectedDivisionId}
            onSelect={handleSelectDivision}
            hoverFill="#38bdf8"
            activeFill="#22c55e"
            className="h-[380px] w-full"
          />
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
                  onClick={() => setSelectedSeatId(seat.id)}
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

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Seat Details</h3>
            <p className="text-xs text-slate-400">Candidates and vote action</p>
          </div>
          {selectedSeat && (
            <div className="text-xs text-slate-400">
              Turnout {turnoutPercent}% • {formatVotes(totalVotesInSeat)} votes
            </div>
          )}
        </div>
        {!selectedSeat && <p className="mt-4 text-xs text-slate-500">Select a seat to view candidates.</p>}
        {selectedSeat && (
          <>
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${turnoutScale(turnoutPercent)}%` }}
              />
            </div>
            <div className="mt-4 grid gap-3">
              {candidatesInSeat.map((candidate) => {
                const party = parties.find((item) => item.id === candidate.partyId);
                const partyLabel = candidate.partyLabel ?? party?.name ?? "Unknown Party";
                const symbolLabel = candidate.symbolLabel ?? candidate.symbol;
                const initials = candidate.name
                  .split(" ")
                  .slice(0, 2)
                  .map((chunk) => chunk[0])
                  .join("");
                const candidateImage = normalizeCandidateImage(candidate.imageUrl);
                return (
                  <div
                    key={candidate.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3"
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
                          style={{ backgroundColor: party?.color ?? "#64748b" }}
                        >
                          {initials}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{candidate.name}</div>
                        <div className="text-xs text-slate-400">{partyLabel}</div>
                        <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">
                          Symbol {symbolLabel}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Votes</div>
                      <div className="text-sm font-semibold text-slate-100">{formatVotes(candidate.votes)}</div>
                      <button
                        type="button"
                        onClick={() => handleOpenVote(candidate.id)}
                        className="mt-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-500/30"
                      >
                        Vote
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
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

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6">
        {mobileView === "results" ? resultsSection : votingSection}
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
    </div>
  );
}

export default App;
