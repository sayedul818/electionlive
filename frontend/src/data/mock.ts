export type PartyId = "A" | "B" | "C" | "IND";

export type Party = {
  id: PartyId;
  name: string;
  short: string;
  color: string;
};

export type Division = {
  id: string;
  name: string;
};

export type District = {
  id: string;
  divisionId: string;
  name: string;
};

export type Seat = {
  id: number;
  divisionId: string;
  districtId: string;
  name: string;
  totalVoters: number;
};

export type Candidate = {
  id: string;
  name: string;
  partyId: PartyId;
  seatId: number;
  symbol: string;
  votes: number;
  imageUrl?: string;
  partyLabel?: string;
  symbolLabel?: string;
};

export type Voter = {
  voterId: string;
  nid: string;
  seatId: number;
  hasVoted: boolean;
};

export const parties: Party[] = [
  { id: "A", name: "বাংলাদেশ জাতীয়তাবাদী দল - বি.এন.পি", short: "বিএনপি", color: "#2f6fed" },
  { id: "B", name: "বাংলাদেশ জামায়াতে ইসলামী", short: "জামায়াত", color: "#f97316" },
  { id: "C", name: "ইসলামী আন্দোলন বাংলাদেশ", short: "ইএবি", color: "#22c55e" },
  { id: "IND", name: "জাতীয় নাগরিক পার্টি-এনসিপি", short: "এনসিপি", color: "#94a3b8" }
];

export const divisions: Division[] = [
  { id: "dhaka", name: "Dhaka" },
  { id: "chattogram", name: "Chattogram" },
  { id: "khulna", name: "Khulna" },
  { id: "rajshahi", name: "Rajshahi" },
  { id: "rangpur", name: "Rangpur" },
  { id: "sylhet", name: "Sylhet" },
  { id: "barishal", name: "Barishal" },
  { id: "mymensingh", name: "Mymensingh" }
];

export const districts: District[] = [
  { id: "dhaka-1", divisionId: "dhaka", name: "Dhaka" },
  { id: "dhaka-2", divisionId: "dhaka", name: "Gazipur" },
  { id: "ctg-1", divisionId: "chattogram", name: "Chattogram" },
  { id: "ctg-2", divisionId: "chattogram", name: "Cox's Bazar" },
  { id: "khulna-1", divisionId: "khulna", name: "Khulna" },
  { id: "khulna-2", divisionId: "khulna", name: "Jessore" },
  { id: "raj-1", divisionId: "rajshahi", name: "Rajshahi" },
  { id: "raj-2", divisionId: "rajshahi", name: "Bogura" },
  { id: "rang-1", divisionId: "rangpur", name: "Rangpur" },
  { id: "rang-2", divisionId: "rangpur", name: "Dinajpur" },
  { id: "syl-1", divisionId: "sylhet", name: "Sylhet" },
  { id: "syl-2", divisionId: "sylhet", name: "Moulvibazar" },
  { id: "bar-1", divisionId: "barishal", name: "Barishal" },
  { id: "bar-2", divisionId: "barishal", name: "Bhola" },
  { id: "mym-1", divisionId: "mymensingh", name: "Mymensingh" },
  { id: "mym-2", divisionId: "mymensingh", name: "Jamalpur" }
];

export const seats: Seat[] = [
  { id: 1, divisionId: "dhaka", districtId: "dhaka-1", name: "Dhaka-1", totalVoters: 245000 },
  { id: 2, divisionId: "dhaka", districtId: "dhaka-1", name: "Dhaka-2", totalVoters: 231000 },
  { id: 3, divisionId: "dhaka", districtId: "dhaka-2", name: "Gazipur-1", totalVoters: 198000 },
  { id: 4, divisionId: "dhaka", districtId: "dhaka-2", name: "Gazipur-2", totalVoters: 210500 },
  { id: 5, divisionId: "chattogram", districtId: "ctg-1", name: "Chattogram-1", totalVoters: 188000 },
  { id: 6, divisionId: "chattogram", districtId: "ctg-2", name: "Cox's Bazar-1", totalVoters: 162000 },
  { id: 7, divisionId: "khulna", districtId: "khulna-1", name: "Khulna-1", totalVoters: 176000 },
  { id: 8, divisionId: "khulna", districtId: "khulna-2", name: "Jessore-1", totalVoters: 168000 },
  { id: 9, divisionId: "rajshahi", districtId: "raj-1", name: "Rajshahi-1", totalVoters: 172000 },
  { id: 10, divisionId: "rajshahi", districtId: "raj-2", name: "Bogura-1", totalVoters: 158000 },
  { id: 11, divisionId: "rangpur", districtId: "rang-1", name: "Rangpur-1", totalVoters: 149000 },
  { id: 12, divisionId: "sylhet", districtId: "syl-1", name: "Sylhet-1", totalVoters: 141000 }
];

export const candidates: Candidate[] = [
  { id: "c-1", name: "Amina Rahman", partyId: "A", seatId: 1, symbol: "🟦", votes: 12450 },
  { id: "c-2", name: "Nayeem Chowdhury", partyId: "B", seatId: 1, symbol: "🟧", votes: 11320 },
  { id: "c-3", name: "Rashed Ali", partyId: "C", seatId: 1, symbol: "🟩", votes: 10210 },

  { id: "c-4", name: "Shila Ahmed", partyId: "A", seatId: 2, symbol: "🟦", votes: 9850 },
  { id: "c-5", name: "Tanvir Islam", partyId: "B", seatId: 2, symbol: "🟧", votes: 11040 },
  { id: "c-6", name: "Mahi Noor", partyId: "C", seatId: 2, symbol: "🟩", votes: 8700 },

  { id: "c-7", name: "Arif Hasan", partyId: "A", seatId: 3, symbol: "🟦", votes: 10300 },
  { id: "c-8", name: "Sumaiya Noor", partyId: "B", seatId: 3, symbol: "🟧", votes: 9200 },
  { id: "c-9", name: "Rafiq Uddin", partyId: "C", seatId: 3, symbol: "🟩", votes: 9750 },

  { id: "c-10", name: "Nadia Karim", partyId: "A", seatId: 4, symbol: "🟦", votes: 11820 },
  { id: "c-11", name: "Sajid Hossain", partyId: "B", seatId: 4, symbol: "🟧", votes: 11550 },
  { id: "c-12", name: "Shamim Islam", partyId: "C", seatId: 4, symbol: "🟩", votes: 9050 },

  { id: "c-13", name: "Muntasir Chowdhury", partyId: "A", seatId: 5, symbol: "🟦", votes: 8500 },
  { id: "c-14", name: "Tasnim Akter", partyId: "B", seatId: 5, symbol: "🟧", votes: 9400 },
  { id: "c-15", name: "Mahbub Alam", partyId: "C", seatId: 5, symbol: "🟩", votes: 7800 },

  { id: "c-16", name: "Ishrat Nahar", partyId: "A", seatId: 6, symbol: "🟦", votes: 6100 },
  { id: "c-17", name: "Farhan Tariq", partyId: "B", seatId: 6, symbol: "🟧", votes: 7200 },
  { id: "c-18", name: "Amirul Islam", partyId: "C", seatId: 6, symbol: "🟩", votes: 6450 },

  { id: "c-19", name: "Fariha Rahman", partyId: "A", seatId: 7, symbol: "🟦", votes: 7000 },
  { id: "c-20", name: "Nazmul Islam", partyId: "B", seatId: 7, symbol: "🟧", votes: 6800 },
  { id: "c-21", name: "Mitu Akter", partyId: "C", seatId: 7, symbol: "🟩", votes: 6400 },

  { id: "c-22", name: "Zara Ahmed", partyId: "A", seatId: 8, symbol: "🟦", votes: 7400 },
  { id: "c-23", name: "Naim Khan", partyId: "B", seatId: 8, symbol: "🟧", votes: 7800 },
  { id: "c-24", name: "Asif Rahman", partyId: "C", seatId: 8, symbol: "🟩", votes: 7300 },

  { id: "c-25", name: "Sadia Rahman", partyId: "A", seatId: 9, symbol: "🟦", votes: 7200 },
  { id: "c-26", name: "Kamal Hasan", partyId: "B", seatId: 9, symbol: "🟧", votes: 7100 },
  { id: "c-27", name: "Lamia Chowdhury", partyId: "C", seatId: 9, symbol: "🟩", votes: 6900 },

  { id: "c-28", name: "Maruf Islam", partyId: "A", seatId: 10, symbol: "🟦", votes: 6800 },
  { id: "c-29", name: "Rina Ahmed", partyId: "B", seatId: 10, symbol: "🟧", votes: 7500 },
  { id: "c-30", name: "Kabir Hossain", partyId: "C", seatId: 10, symbol: "🟩", votes: 7100 },

  { id: "c-31", name: "Samiha Noor", partyId: "A", seatId: 11, symbol: "🟦", votes: 5400 },
  { id: "c-32", name: "Habib Rahman", partyId: "B", seatId: 11, symbol: "🟧", votes: 6200 },
  { id: "c-33", name: "Pavel Islam", partyId: "C", seatId: 11, symbol: "🟩", votes: 5800 },

  { id: "c-34", name: "Nusrat Jahan", partyId: "A", seatId: 12, symbol: "🟦", votes: 5900 },
  { id: "c-35", name: "Imran Khan", partyId: "B", seatId: 12, symbol: "🟧", votes: 6400 },
  { id: "c-36", name: "Farzana Akter", partyId: "C", seatId: 12, symbol: "🟩", votes: 6000 }
];

export const voters: Voter[] = [
  { voterId: "V-1001", nid: "19880001", seatId: 1, hasVoted: false },
  { voterId: "V-1002", nid: "19880002", seatId: 1, hasVoted: false },
  { voterId: "V-1003", nid: "19880003", seatId: 2, hasVoted: true },
  { voterId: "V-1004", nid: "19880004", seatId: 2, hasVoted: false },
  { voterId: "V-1005", nid: "19880005", seatId: 3, hasVoted: false },
  { voterId: "V-1006", nid: "19880006", seatId: 4, hasVoted: false },
  { voterId: "V-1007", nid: "19880007", seatId: 5, hasVoted: false },
  { voterId: "V-1008", nid: "19880008", seatId: 6, hasVoted: false },
  { voterId: "V-1009", nid: "19880009", seatId: 7, hasVoted: false },
  { voterId: "V-1010", nid: "19880010", seatId: 8, hasVoted: false },
  { voterId: "V-1011", nid: "19880011", seatId: 9, hasVoted: false },
  { voterId: "V-1012", nid: "19880012", seatId: 10, hasVoted: false },
  { voterId: "V-1013", nid: "19880013", seatId: 11, hasVoted: false },
  { voterId: "V-1014", nid: "19880014", seatId: 12, hasVoted: false }
];
