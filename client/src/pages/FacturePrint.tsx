import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { apiGet, apiList } from "../api";
import { montantEnLettres } from "../utils/nombreEnLettres";

interface Entreprise {
  nom: string;
  adresse: string | null;
  telephone: string | null;
  nImpot: string | null;
  idNational: string | null;
  rccm: string | null;
  coordonneesBancaires: string | null;
}
interface Client {
  nom: string;
  type: string | null;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  code: string | null;
  nImpot: string | null;
  idNational: string | null;
  rccm: string | null;
}
interface Ligne {
  id: string;
  reference: string | null;
  description: string;
  quantite: string;
  prixUnitaire: string;
  tauxTva: string;
  montantHt: string;
}
interface Facture {
  id: string;
  numero: string;
  type: string;
  dateFacture: string;
  dateEcheance: string | null;
  moyenReglementId: number | null;
  remisePct: string;
  devise: string;
  statut: string;
  client: Client;
  lignes: Ligne[];
}
interface CanalPaiement {
  id: number;
  libelle: string;
}

// Formate un montant façon facture JPS : "$1 225 000,00" pour l'USD,
// "1 225 000,00 FC" pour le franc congolais.
function formatMontant(n: number, devise: string) {
  const formatted = n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return devise === "USD" ? `$${formatted}` : `${formatted} FC`;
}

function formatPourcentage(n: number, decimales = 2) {
  return `${(n * 100).toLocaleString("fr-FR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}%`;
}

function formatQuantite(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 3 });
}

// Format j/m/aaaa sans zéro de tête, comme sur le modèle papier ("27/5/2026").
// Utilise les accesseurs UTC : les colonnes "date" en base n'ont pas d'heure,
// et new Date("2026-05-27") est interprété en UTC par JS.
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

export function FacturePrint() {
  const { id } = useParams<{ id: string }>();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [canaux, setCanaux] = useState<CanalPaiement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet("factures", id).then(setFacture).catch((err) => setError(err.message));
    apiList("entreprise").then(setEntreprise);
    apiList("canaux-paiement").then(setCanaux);
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <div className="error-banner">{error}</div>
      </div>
    );
  }
  if (!facture) {
    return (
      <div className="page">
        <p className="stat-helper">Chargement…</p>
      </div>
    );
  }

  const moyenLibelle = canaux.find((c) => c.id === facture.moyenReglementId)?.libelle;
  const remisePct = Number(facture.remisePct);

  // Calcul ligne par ligne : montant HT, remise, TVA nette de remise.
  const lignesCalc = facture.lignes.map((l) => {
    const montantHt = Number(l.montantHt);
    const remise = montantHt * remisePct;
    const netHt = montantHt - remise;
    const tva = netHt * Number(l.tauxTva);
    return { ...l, montantHt, remise, netHt, tva, tauxTvaNum: Number(l.tauxTva) };
  });

  const totalHt = lignesCalc.reduce((s, l) => s + l.montantHt, 0);
  const totalRemise = lignesCalc.reduce((s, l) => s + l.remise, 0);
  const netHtApresRemise = totalHt - totalRemise;

  // Ventilation de la TVA par taux (une facture peut mélanger des lignes à
  // taux différents), puis total général de TVA — reproduit la structure du
  // modèle papier ("TVA à 16% :" ... "Total TVA :").
  const tvaParTaux = new Map<number, number>();
  for (const l of lignesCalc) {
    if (l.tauxTvaNum > 0) {
      tvaParTaux.set(l.tauxTvaNum, (tvaParTaux.get(l.tauxTvaNum) ?? 0) + l.tva);
    }
  }
  const totalTva = lignesCalc.reduce((s, l) => s + l.tva, 0);
  const totalTtc = netHtApresRemise + totalTva;

  const { mots, libelleDevise } = montantEnLettres(totalTtc, facture.devise);

  return (
    <div className="facture-print-screen">
      <div className="facture-toolbar no-print">
        <Link to="/factures">
          <ArrowLeft size={15} /> Retour aux factures
        </Link>
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Imprimer / Enregistrer en PDF
        </button>
      </div>

      <div className="facture-page">
        <div className="facture-topbox">
          <div className="facture-logo-cell">
            <img src="/logo-jps.png" alt="" className="facture-logo" />
          </div>
          <div className="facture-title-cell">
            <div className="facture-title-bar">
              {facture.type === "PROFORMA" ? "PROFORMA" : "FACTURE"} N° {facture.numero}
            </div>
            <div className="facture-date-row">
              <span className="facture-date-label">Date :</span>
              <span className="facture-date-value">{formatDate(facture.dateFacture)}</span>
            </div>
          </div>
        </div>

        <div className="facture-parties">
          <div className="facture-partie">
            <div className="facture-partie-titre">{entreprise?.nom ?? "—"}</div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Adresse</span>
              <span>{entreprise?.adresse ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Telephone</span>
              <span>{entreprise?.telephone ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">N° IMPOT</span>
              <span>{entreprise?.nImpot ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">ID NAT</span>
              <span>{entreprise?.idNational ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">RCCM</span>
              <span>{entreprise?.rccm ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Coord Bank</span>
              <span>{entreprise?.coordonneesBancaires ?? "—"}</span>
            </div>
          </div>

          <div className="facture-partie">
            <div className="facture-partie-ligne facture-partie-titre-ligne">
              <span className="facture-label">A :</span>
              <span className="facture-partie-titre">{facture.client.nom}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Adresse :</span>
              <span>{facture.client.adresse ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Ville</span>
              <span>{facture.client.ville ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">N° IMPOT</span>
              <span>{facture.client.nImpot ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">ID NAT</span>
              <span>{facture.client.idNational ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">RCCM</span>
              <span>{facture.client.rccm ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Code client :</span>
              <span>{facture.client.code ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Telephone</span>
              <span>{facture.client.telephone ?? "—"}</span>
            </div>
          </div>
        </div>

        <table className="facture-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Description</th>
              <th className="num">Quantité</th>
              <th className="num">PU HT</th>
              <th className="num">Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {lignesCalc.map((l) => (
              <tr key={l.id}>
                <td>{l.reference ?? ""}</td>
                <td>{l.description}</td>
                <td className="num">{formatQuantite(Number(l.quantite))}</td>
                <td className="num">{formatMontant(Number(l.prixUnitaire), facture.devise)}</td>
                <td className="num">{formatMontant(l.montantHt, facture.devise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="facture-bottom">
          <div className="facture-bas-gauche">
            <div className="facture-bas-ligne">
              <span>Échéance :</span>
              <span>{facture.dateEcheance ? formatDate(facture.dateEcheance) : ""}</span>
            </div>
            <div className="facture-bas-ligne">
              <span>Règlement :</span>
              <span className="facture-reglement-valeur">{moyenLibelle ?? ""}</span>
            </div>
          </div>

          <div className="facture-totaux-bloc">
            <table className="facture-totaux">
              <tbody>
                <tr>
                  <td>TOTAL HT</td>
                  <td className="num">{formatMontant(totalHt, facture.devise)}</td>
                </tr>
                <tr>
                  <td>REMISE :</td>
                  <td className="num">{formatPourcentage(remisePct)}</td>
                </tr>
                <tr>
                  <td></td>
                  <td className="num">{formatMontant(netHtApresRemise, facture.devise)}</td>
                </tr>
                {[...tvaParTaux.entries()]
                  .sort((a, b) => b[0] - a[0])
                  .map(([taux, montant]) => (
                    <tr key={taux}>
                      <td className="facture-totaux-tva-label">TVA à {formatPourcentage(taux, 0)} :</td>
                      <td className="num">{formatMontant(montant, facture.devise)}</td>
                    </tr>
                  ))}
                <tr>
                  <td className="facture-totaux-tva-label">Total TVA :</td>
                  <td className="num">{formatMontant(totalTva, facture.devise)}</td>
                </tr>
              </tbody>
            </table>

            <div className="facture-total-ttc">
              <span>TOTAL TTC</span>
              <span>{formatMontant(totalTtc, facture.devise)}</span>
            </div>
          </div>
        </div>

        <div className="facture-lettres">
          <div>
            <div className="facture-lettres-label">En toutes lettres:</div>
            <div className="facture-lettres-mots">{mots}</div>
          </div>
          <div className="facture-lettres-devise">{libelleDevise}</div>
        </div>
      </div>
    </div>
  );
}
