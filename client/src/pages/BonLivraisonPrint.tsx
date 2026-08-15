import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { apiGet, apiList } from "../api";

interface Entreprise {
  nom: string;
  adresse: string | null;
  telephone: string | null;
}
interface Client {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
}
interface Vehicule {
  id: string;
  immatriculation: string | null;
  typeVehicule: string | null;
}
interface Employe {
  id: string;
  nom: string;
  telephone: string | null;
}
interface BonLivraison {
  id: string;
  numero: string | null;
  dateExpedition: string;
  villeDepart: string;
  villeArrivee: string;
  vehiculeId: string | null;
  chauffeurId: string | null;
  clientId: string | null;
  descriptionMarchandise: string | null;
  poidsKg: string | null;
  statut: string;
  nomSignataire: string | null;
  dateLivraison: string | null;
  signe: boolean;
  observation: string | null;
}

const STATUT_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  LIVRE: "Livré",
  ANNULE: "Annulé",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

export function BonLivraisonPrint() {
  const { id } = useParams<{ id: string }>();
  const [bon, setBon] = useState<BonLivraison | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet("bons-livraison", id).then(setBon).catch((err) => setError(err.message));
    apiList("entreprise").then(setEntreprise);
    apiList("clients").then(setClients).catch(() => {});
    apiList("vehicules").then(setVehicules).catch(() => {});
    apiList("employes").then(setEmployes).catch(() => {});
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

  const client = clients.find((c) => c.id === bon.clientId) ?? null;
  const vehicule = vehicules.find((v) => v.id === bon.vehiculeId) ?? null;
  const chauffeur = employes.find((e) => e.id === bon.chauffeurId) ?? null;

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
            <div className="bl-title-bar">BON DE LIVRAISON {bon.numero ? `N° ${bon.numero}` : ""}</div>
            <div className="bl-date-row">
              <span className="bl-date-item">
                <span className="bl-label">Date d'expédition :</span> {formatDate(bon.dateExpedition)}
              </span>
              <span className="bl-date-item">
                <span className="bl-label">Statut :</span> {STATUT_LABELS[bon.statut] ?? bon.statut}
              </span>
            </div>
          </div>
        </div>

        <div className="bl-parties">
          <div className="bl-partie">
            <div className="bl-partie-titre">Expéditeur</div>
            <div className="bl-partie-nom">{entreprise?.nom ?? "—"}</div>
            {entreprise?.adresse && <div>{entreprise.adresse}</div>}
            {entreprise?.telephone && <div>Tél : {entreprise.telephone}</div>}
          </div>
          <div className="bl-partie">
            <div className="bl-partie-titre">Destinataire</div>
            {client ? (
              <>
                <div className="bl-partie-nom">{client.nom}</div>
                {client.adresse && <div>{client.adresse}</div>}
                {client.ville && <div>{client.ville}</div>}
                {client.telephone && <div>Tél : {client.telephone}</div>}
              </>
            ) : (
              <div className="bl-partie-nom">—</div>
            )}
          </div>
        </div>

        <div className="bl-trajet">
          <div className="bl-trajet-item">
            <span className="bl-label">Trajet</span>
            <span>{bon.villeDepart} → {bon.villeArrivee}</span>
          </div>
          <div className="bl-trajet-item">
            <span className="bl-label">Véhicule</span>
            <span>
              {vehicule
                ? [vehicule.immatriculation, vehicule.typeVehicule].filter(Boolean).join(" — ") || "—"
                : "—"}
            </span>
          </div>
          <div className="bl-trajet-item">
            <span className="bl-label">Chauffeur</span>
            <span>
              {chauffeur ? [chauffeur.nom, chauffeur.telephone].filter(Boolean).join(" — ") : "—"}
            </span>
          </div>
        </div>

        <table className="bl-table">
          <thead>
            <tr>
              <th>Description de la marchandise</th>
              <th className="num">Poids (kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{bon.descriptionMarchandise || "—"}</td>
              <td className="num">
                {bon.poidsKg != null ? Number(bon.poidsKg).toLocaleString("fr-FR") : "—"}
              </td>
            </tr>
          </tbody>
        </table>

        {bon.observation && (
          <div className="bl-observation">
            <span className="bl-label">Observation :</span> {bon.observation}
          </div>
        )}

        <div className="bl-signature">
          <div className="bl-signature-bloc">
            <div className="bl-label">Reçu par (nom du signataire)</div>
            <div className="bl-signature-valeur">{bon.nomSignataire || " "}</div>
          </div>
          <div className="bl-signature-bloc">
            <div className="bl-label">Date de livraison</div>
            <div className="bl-signature-valeur">
              {bon.dateLivraison ? formatDate(bon.dateLivraison) : " "}
            </div>
          </div>
          <div className="bl-signature-bloc">
            <div className="bl-label">Signature</div>
            <div className="bl-signature-case">{bon.signe ? "Signé" : ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
