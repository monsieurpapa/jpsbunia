import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { apiList } from "../api";

interface DetteRow {
  distributeur_id: string;
  nom_point_vente: string;
  ville: string | null;
  plafond_credit: string;
  devise: string;
  solde_du: string;
  depasse_plafond: boolean;
}

interface CommissionRow {
  distributeur_id: string;
  nom_point_vente: string;
  ville: string | null;
  taux_commission: string;
  devise: string;
  volume_vendu: string;
  commission_due: string;
}

export function DettesDistributeurs() {
  const [dettes, setDettes] = useState<DetteRow[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiList("dashboard/dettes-distributeurs"),
      apiList("dashboard/commissions-distributeurs"),
    ])
      .then(([d, c]) => {
        setDettes(d);
        setCommissions(c);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-header-eyebrow">Distribution / Abonnements</div>
          <h1>Dettes &amp; commissions des distributeurs</h1>
        </div>
      </div>

      <section>
        <h2>Solde de dette par distributeur</h2>
        <p className="stat-helper">
          Octrois de crédit moins remboursements reçus, comparé au plafond autorisé (négocié en
          USD — le dépassement n'est signalé que pour les soldes en USD).
        </p>
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Distributeur</th>
                <th>Ville</th>
                <th>Devise</th>
                <th>Solde dû</th>
                <th>Plafond autorisé (USD)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dettes.map((row, i) => (
                <tr key={i}>
                  <td>{row.nom_point_vente}</td>
                  <td>{row.ville ?? "—"}</td>
                  <td>{row.devise}</td>
                  <td>{Number(row.solde_du).toLocaleString("fr-FR")}</td>
                  <td>{Number(row.plafond_credit).toLocaleString("fr-FR")}</td>
                  <td>
                    {row.depasse_plafond && (
                      <span className="badge" style={{ ["--tone" as string]: "#be123c", ["--tone-soft" as string]: "#fff1f2" }}>
                        <AlertTriangle size={12} style={{ verticalAlign: "text-bottom" }} /> Plafond dépassé
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && dettes.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-row">Aucune dette en cours.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Commission JPS due par distributeur</h2>
        <p className="stat-helper">
          Volume des ventes (crédits CGA, matériels, accessoires, décodeurs, paraboles) multiplié
          par le taux de commission négocié avec chaque distributeur agréé.
        </p>
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Distributeur</th>
                <th>Ville</th>
                <th>Devise</th>
                <th>Volume vendu</th>
                <th>Taux</th>
                <th>Commission due</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((row, i) => (
                <tr key={i}>
                  <td>{row.nom_point_vente}</td>
                  <td>{row.ville ?? "—"}</td>
                  <td>{row.devise}</td>
                  <td>{Number(row.volume_vendu).toLocaleString("fr-FR")}</td>
                  <td>{(Number(row.taux_commission) * 100).toLocaleString("fr-FR")} %</td>
                  <td>{Number(row.commission_due).toLocaleString("fr-FR")}</td>
                </tr>
              ))}
              {!loading && commissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-row">Aucune vente enregistrée pour l'instant.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
