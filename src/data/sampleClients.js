// Sample clients based on user's real sheet data for instant local demo & testing
export const INITIAL_CLIENTS = [
  {
    id: "c1",
    user: "Edo-pll",
    contactName: "Edoardo Ricca",
    phone: "+393401234567",
    expirationDate: "2026-11-15", // Scade oggi!
    monthlyCost: 10,
    isActive: true,
    totalCreditsUsed: 6,
    notes: "Rinnovo trimestrale",
    lastRenewal: null
  },
  {
    id: "c2",
    user: "Aless-pll",
    contactName: "Alessandro IPTV",
    phone: "+393478901234",
    expirationDate: "2026-11-16", // Scade domani
    monthlyCost: 10,
    isActive: true,
    totalCreditsUsed: 12,
    notes: "",
    lastRenewal: null
  },
  {
    id: "c3",
    user: "StefanoG-pll",
    contactName: "StefanoG IPTV",
    phone: "+393334567890",
    expirationDate: "2026-11-17", // Scade tra 2 gg
    monthlyCost: 10,
    isActive: true,
    totalCreditsUsed: 1,
    notes: "Scrittura Whatsapp abituale",
    lastRenewal: null
  },
  {
    id: "c4",
    user: "Alex-ale",
    contactName: "Talmon",
    phone: "+393456789012",
    expirationDate: "2026-11-16",
    monthlyCost: 5,
    isActive: true,
    totalCreditsUsed: 34,
    notes: "Prezzo speciale convenzionato",
    lastRenewal: null
  },
  {
    id: "c5",
    user: "Fabio-pll",
    contactName: "Fabio IPTV",
    phone: "+393391234888",
    expirationDate: "2026-11-18",
    monthlyCost: 10,
    isActive: true,
    totalCreditsUsed: 27,
    notes: "",
    lastRenewal: null
  },
  {
    id: "c6",
    user: "Mass-pll",
    contactName: "Mass IPTV",
    phone: "+393281122334",
    expirationDate: "2027-02-14",
    monthlyCost: 10,
    isActive: true,
    totalCreditsUsed: 18,
    notes: "Annuale pagato",
    lastRenewal: null
  },
  {
    id: "c7",
    user: "Sergio-pll",
    contactName: "Sergio Richaud",
    phone: "+393498765432",
    expirationDate: "2026-10-05", // Già scaduto
    monthlyCost: 10,
    isActive: false,
    totalCreditsUsed: 8,
    notes: "Non ha rinnovato",
    lastRenewal: null
  }
];

// Historical purchases parsed directly from formula in cell I1 of Google Sheet:
// =150+150+300+300+300+300+300+300+300+300+300+600+600+600+600+300+300+300+600+600+600+600+600+600+600+600+600+600+600
const rawHistoricalPurchases = [
  150, 150, 
  300, 300, 300, 300, 300, 300, 300, 300, 300, 
  600, 600, 600, 600, 
  300, 300, 300, 
  600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600
];

export const INITIAL_CREDIT_STATE = {
  creditsBalance: 78,
  creditCostUnit: 3.0,
  history: rawHistoricalPurchases.map((cost, idx) => ({
    id: `tx-hist-${idx + 1}`,
    type: 'purchase',
    amount: Math.round(cost / 3),
    cost: cost,
    description: `Acquisto storico #${idx + 1} (${Math.round(cost / 3)} crediti a ${cost}€)`,
    timestamp: null
  }))
};
