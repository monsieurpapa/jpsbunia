// Palette élargie : le vert/ambre/rouge restent réservés au sens (positif /
// en attente / négatif) ; les autres teintes servent uniquement à distinguer
// visuellement des catégories qui n'ont pas de valeur "bonne" ou "mauvaise"
// (type d'opération, catégorie de dépense, devise...).
const PALETTE = {
  green: { tone: "#059669", soft: "#ecfdf5" },
  amber: { tone: "#b45309", soft: "#fffbeb" },
  red: { tone: "#be123c", soft: "#fff1f2" },
  gray: { tone: "#64748b", soft: "#f1f5f9" },
  blue: { tone: "#2563eb", soft: "#eff6ff" },
  violet: { tone: "#7c3aed", soft: "#f5f3ff" },
  teal: { tone: "#0d9488", soft: "#f0fdfa" },
  indigo: { tone: "#4f46e5", soft: "#eef2ff" },
  pink: { tone: "#db2777", soft: "#fdf2f8" },
  orange: { tone: "#ea580c", soft: "#fff7ed" },
  cyan: { tone: "#0891b2", soft: "#ecfeff" },
  fuchsia: { tone: "#a21caf", soft: "#fdf4ff" },
} as const;

const TONES: Record<string, { tone: string; soft: string }> = {
  // Positif / actif / réglé / reçu
  ACTIF: PALETTE.green,
  PAYE: PALETTE.green,
  PAYEE: PALETTE.green,
  EMISE: PALETTE.green,
  COMPTANT: PALETTE.green,
  ENTREE: PALETTE.green,
  LIVRE: PALETTE.green,
  REMBOURSEMENT: PALETTE.green,
  PRIME: PALETTE.green,
  // Attention / en cours / temporaire
  BROUILLON: PALETTE.amber,
  ATTENTE_BDC: PALETTE.amber,
  A_COMPTABILISER: PALETTE.amber,
  PARTIELLEMENT_PAYEE: PALETTE.amber,
  CREDIT: PALETTE.amber,
  EN_COURS: PALETTE.amber,
  AVANCE: PALETTE.amber,
  TIERS: PALETTE.amber,
  // Négatif / arrêté / non réglé / sortie
  NON_PAYE: PALETTE.red,
  ANNULEE: PALETTE.red,
  ANNULE: PALETTE.red,
  RESILIE: PALETTE.red,
  SORTIE: PALETTE.red,
  RETENUE: PALETTE.red,
  // Neutre
  TERMINE: PALETTE.gray,
  FORFAIT_UNIQUE: PALETTE.gray,

  // Catégories (journal des opérations de distribution)
  VENTE_CREDIT_CGA: PALETTE.blue,
  VENTE_MATERIELS: PALETTE.violet,
  VENTE_ACCESSOIRES: PALETTE.cyan,
  VENTE_DECODEURS: PALETTE.indigo,
  VENTE_PARABOLES: PALETTE.fuchsia,
  CREDITATION: PALETTE.orange,
  APPROVISIONNEMENT: PALETTE.teal,
  OCTROI: PALETTE.teal,

  // Dépenses personnel
  SALAIRE: PALETTE.blue,

  // Dépenses de fonctionnement
  LOYER_BUREAU: PALETTE.indigo,
  ELECTRICITE: PALETTE.orange,
  INTERNET: PALETTE.cyan,
  FOURNITURES: PALETTE.violet,
  CARBURANT: PALETTE.pink,
  ENTRETIEN: PALETTE.teal,

  // Origine des mouvements de caisse
  FACTURE: PALETTE.blue,
  OPERATION_DISTRIBUTION: PALETTE.teal,
  DEPENSE_PERSONNEL: PALETTE.pink,
  DEPENSE_FONCTIONNEMENT: PALETTE.orange,

  // Locations
  ENTREPOT: PALETTE.indigo,
  VEHICULE: PALETTE.violet,
  JPS: PALETTE.blue,
  MENSUEL: PALETTE.blue,
  TRIMESTRIEL: PALETTE.teal,
  ANNUEL: PALETTE.violet,

  // Devises
  CDF: PALETTE.indigo,
  USD: PALETTE.teal,
};

const DEFAULT_TONE = PALETTE.gray;

export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span>—</span>;
  const { tone, soft } = TONES[value] ?? DEFAULT_TONE;
  const label = value.replaceAll("_", " ");
  return (
    <span className="badge" style={{ ["--tone" as string]: tone, ["--tone-soft" as string]: soft }}>
      {label}
    </span>
  );
}
