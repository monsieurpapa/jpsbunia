import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { apiGet, apiList } from "../api";

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
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  code: string | null;
  nImpot: string | null;
  idNational: string | null;
  rccm: string | null;
}
interface Ligne {
  id: string;
  reference: string | null;
  description: string;
  quantiteCommandee: string;
  quantiteLivree: string | null;
  observation: string | null;
}
interface BonLivraison {
  id: string;
  numero: string | null;
  dateExpedition: string;
  client: Client | null;
  lignes: Ligne[];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

function formatQuantite(v: string | null) {
  if (v == null) return "";
  return Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 3 });
}

export function BonLivraisonPrint() {
  const { id } = useParams<{ id: string }>();
  const [bon, setBon] = useState<BonLivraison | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet("bons-livraison", id).then(setBon).catch((err) => setError(err.message));
    apiList("entreprise").then(setEntreprise);
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <div className="error-banner">{error}</div>
      </div>
    );
  }
  if (!bon) {
    return (
      <div className="page">
        <p className="stat-helper">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="bl-print-screen">
      <div className="bl-toolbar no-print">
        <Link to="/bons-livraison">
          <ArrowLeft size={15} /> Retour aux bons de livraison
        </Link>
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Imprimer / Enregistrer en PDF
        </button>
      </div>

      <div className="bl-page">
        <div className="bl-topbox">
          <div className="bl-logo-cell">
            <img src="/logo-jps.png" alt="" className="bl-logo" />
          </div>
          <div className="bl-title-cell">
            <div className="bl-title-row">
              <span>BON DE LIVRAISON N°</span>
              <span className="bl-numero-badge">{bon.numero ?? "—"}</span>
            </div>
            <div className="bl-date-row-plain">
              <span className="bl-label">Date :</span> {formatDate(bon.dateExpedition)}
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
              <span className="facture-partie-titre">{bon.client?.nom ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Adresse :</span>
              <span>{bon.client?.adresse ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Ville</span>
              <span>{bon.client?.ville ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">N° IMPOT</span>
              <span>{bon.client?.nImpot ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">ID NAT</span>
              <span>{bon.client?.idNational ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">RCCM</span>
              <span>{bon.client?.rccm ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Code client :</span>
              <span>{bon.client?.code ?? "—"}</span>
            </div>
            <div className="facture-partie-ligne">
              <span className="facture-label">Telephone</span>
              <span>{bon.client?.telephone ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className="bl-commande-label">Votre commande du : {formatDate(bon.dateExpedition)}</div>

        <table className="bl-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Description</th>
              <th className="num">Quantités commandées</th>
              <th className="num">Quantités livrées</th>
              <th>Observations</th>
            </tr>
          </thead>
          <tbody>
            {bon.lignes.map((l) => (
              <tr key={l.id}>
                <td>{l.reference ?? ""}</td>
                <td>{l.description}</td>
                <td className="num">{formatQuantite(l.quantiteCommandee)}</td>
                <td className="num">{formatQuantite(l.quantiteLivree)}</td>
                <td>{l.observation ?? ""}</td>
              </tr>
            ))}
            {bon.lignes.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">Aucune ligne.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="bl-visa">
          <div className="bl-visa-bloc">
            <span className="bl-label">Date de réception et visa :</span>
            <div className="bl-visa-espace" />
          </div>
          <div className="bl-visa-bloc">
            <span className="bl-label">Date de livraison et visa :</span>
            <div className="bl-visa-espace" />
          </div>
        </div>
      </div>
    </div>
  );
}
