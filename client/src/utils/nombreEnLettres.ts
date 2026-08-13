// Conversion d'un nombre entier en toutes lettres françaises, utilisée pour
// la ligne « En toutes lettres » des factures imprimées.

const UNITES = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
const DIX_A_DIXNEUF = [
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const DIZAINES = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante",
  "quatre-vingt",
  "quatre-vingt",
];

// Convertit un nombre de 0 à 99.
function convertirDizaine(n: number): string {
  if (n < 10) return UNITES[n];
  if (n < 20) return DIX_A_DIXNEUF[n - 10];
  const dizaine = Math.floor(n / 10);
  const unite = n % 10;
  if (dizaine === 7 || dizaine === 9) {
    const base = dizaine === 7 ? "soixante" : "quatre-vingt";
    return unite === 0 ? `${base}-dix` : `${base}-${DIX_A_DIXNEUF[unite]}`;
  }
  const mot = DIZAINES[dizaine];
  if (unite === 0) {
    return dizaine === 8 ? `${mot}s` : mot; // quatre-vingts, mais vingt/trente/... sans "s"
  }
  if (unite === 1 && dizaine !== 8) {
    return `${mot} et un`; // vingt et un, trente et un... (pas de "et" pour quatre-vingt-un)
  }
  return `${mot}-${UNITES[unite]}`;
}

// Convertit un nombre de 0 à 999.
function convertirCentaine(n: number): string {
  if (n < 100) return convertirDizaine(n);
  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  const prefixe = centaines === 1 ? "cent" : `${UNITES[centaines]} cent`;
  if (reste === 0) {
    return centaines > 1 ? `${prefixe}s` : prefixe; // "s" seulement si rien ne suit
  }
  return `${prefixe} ${convertirDizaine(reste)}`;
}

const GROUPES = [
  { valeur: 1_000_000_000, singulier: "milliard", pluriel: "milliards" },
  { valeur: 1_000_000, singulier: "million", pluriel: "millions" },
  { valeur: 1_000, singulier: "mille", pluriel: "mille" },
];

// Convertit un entier positif (ou nul) en toutes lettres, en minuscules.
function convertirEntier(n: number): string {
  if (n === 0) return "zéro";
  let reste = Math.trunc(n);
  const parties: string[] = [];
  for (const g of GROUPES) {
    const quotient = Math.floor(reste / g.valeur);
    reste %= g.valeur;
    if (quotient === 0) continue;
    if (g.valeur === 1000) {
      parties.push(quotient === 1 ? "mille" : `${convertirCentaine(quotient)} mille`);
    } else {
      const nomGroupe = quotient > 1 ? g.pluriel : g.singulier;
      parties.push(`${convertirCentaine(quotient)} ${nomGroupe}`);
    }
  }
  if (reste > 0) parties.push(convertirCentaine(reste));
  return parties.join(" ").replace(/\s+/g, " ").trim();
}

// Met en majuscule la première lettre de chaque mot (y compris après un trait
// d'union), pour reproduire le style "Quatre Millions Deux Cent..." utilisé
// sur les factures.
function mettreEnCapitales(texte: string): string {
  return texte.replace(
    /(^|[\s-])([a-zàâçéèêëîïôûùüÿñæœ])/g,
    (_match, separateur: string, lettre: string) => separateur + lettre.toUpperCase(),
  );
}

const LIBELLES_DEVISE: Record<string, string> = {
  USD: "Dollars US",
  CDF: "Francs Congolais",
};

// Retourne le montant en toutes lettres ainsi que le libellé de la devise,
// prêts à afficher dans les deux colonnes de la ligne "En toutes lettres".
export function montantEnLettres(montant: number, devise: string): { mots: string; libelleDevise: string } {
  const absolu = Math.abs(montant);
  let partieEntiere = Math.floor(absolu + 1e-9);
  let centimes = Math.round((absolu - partieEntiere) * 100);
  if (centimes >= 100) {
    // Report d'arrondi (ex. 99,999 -> 100,00) : on bascule le centime sur l'entier.
    centimes = 0;
    partieEntiere += 1;
  }

  let mots = mettreEnCapitales(convertirEntier(partieEntiere));
  if (centimes > 0) {
    mots += ` Et ${mettreEnCapitales(convertirCentaine(centimes))} Centimes`;
  }

  return {
    mots,
    libelleDevise: LIBELLES_DEVISE[devise] ?? devise,
  };
}
