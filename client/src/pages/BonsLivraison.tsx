import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X, Search, Printer, Trash2, Pencil } from "lucide-react";
import { apiCreate, apiDelete, apiGet, apiList, apiUpdate } from "../api";
import { Badge } from "../components/Badge";
import { useAuth } from "../auth/AuthContext";
import { canWrite } from "../config/permissions";

const STATUT_OPTIONS = [
  { value: "EN_COURS", label: "En cours" },
  { value: "LIVRE", label: "Livré" },
  { value: "ANNULE", label: "Annulé" },
];

interface Client {
  id: string;
  nom: string;
}
interface Vehicule {
  id: string;
  immatriculation: string | null;
}
interface Employe {
  id: string;
  nom: string;
}
interface LigneForm {
  reference: string;
  description: string;
  quantiteCommandee: string;
  quantiteLivree: string;
  observation: string;
}
interface BonLivraison {
  id: string;
  numero: string;
  dateExpedition: string;
  villeDepart: string;
  villeArrivee: string;
  vehiculeId: string | null;
  chauffeurId: string | null;
  clientId: string | null;
  statut: string;
  nomSignataire: string | null;
  dateLivraison: string | null;
  signe: boolean;
  observation: string | null;
}

const LIGNE_VIDE: LigneForm = {
  reference: "",
  description: "",
  quantiteCommandee: "1",
  quantiteLivree: "",
  observation: "",
};

const BON_VIDE = {
  dateExpedition: "",
  villeDepart: "BUNIA",
  villeArrivee: "",
  clientId: "",
  vehiculeId: "",
  chauffeurId: "",
  statut: "EN_COURS",
  nomSignataire: "",
  dateLivraison: "",
  signe: false,
  observation: "",
};

export function BonsLivraison() {
  const { user } = useAuth();
  const canEdit = !!user && canWrite(user.role, "transport");
  const [bons, setBons] = useState<BonLivraison[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");

  const [bon, setBon] = useState(BON_VIDE);
  const [lignes, setLignes] = useState<LigneForm[]>([{ ...LIGNE_VIDE }]);

  async function reload() {
    setBons(await apiList("bons-livraison"));
  }

  useEffect(() => {
    reload();
    apiList("clients").then(setClients).catch(() => {});
    apiList("vehicules").then(setVehicules).catch(() => {});
    apiList("employes").then(setEmployes).catch(() => {});
  }, []);

  function updateLigne(index: number, patch: Partial<LigneForm>) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function ajouterLigne() {
    setLignes((prev) => [...prev, { ...LIGNE_VIDE }]);
  }

  function supprimerLigne(index: number) {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  }

  function ouvrirNouveau() {
    setEditingId(null);
    setBon(BON_VIDE);
    setLignes([{ ...LIGNE_VIDE }]);
    setError(null);
    setShowForm(true);
  }

  async function ouvrirEdition(id: string) {
    setError(null);
    try {
      const full = await apiGet("bons-livraison", id);
      setEditingId(id);
      setBon({
        dateExpedition: full.dateExpedition?.slice(0, 10) ?? "",
        villeDepart: full.villeDepart ?? "BUNIA",
        villeArrivee: full.villeArrivee ?? "",
        clientId: full.clientId ?? "",
        vehiculeId: full.vehiculeId ?? "",
        chauffeurId: full.chauffeurId ?? "",
        statut: full.statut ?? "EN_COURS",
        nomSignataire: full.nomSignataire ?? "",
        dateLivraison: full.dateLivraison?.slice(0, 10) ?? "",
        signe: !!full.signe,
        observation: full.observation ?? "",
      });
      setLignes(
        full.lignes?.length
          ? full.lignes.map((l: any) => ({
              reference: l.reference ?? "",
              description: l.description ?? "",
              quantiteCommandee: l.quantiteCommandee ?? "1",
              quantiteLivree: l.quantiteLivree ?? "",
              observation: l.observation ?? "",
            }))
          : [{ ...LIGNE_VIDE }],
      );
      setShowForm(true);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...bon,
      clientId: bon.clientId || null,
      vehiculeId: bon.vehiculeId || null,
      chauffeurId: bon.chauffeurId || null,
      dateLivraison: bon.dateLivraison || null,
      nomSignataire: bon.nomSignataire || null,
      observation: bon.observation || null,
      lignes: lignes
        .filter((l) => l.description)
        .map((l) => ({
          reference: l.reference || null,
          description: l.description,
          quantiteCommandee: l.quantiteCommandee || "1",
          quantiteLivree: l.quantiteLivree || null,
          observation: l.observation || null,
        })),
    };
    try {
      if (editingId) {
        await apiUpdate("bons-livraison", editingId, payload);
      } else {
        await apiCreate("bons-livraison", payload);
      }
      setShowForm(false);
      await reload();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce bon de livraison ?")) return;
    await apiDelete("bons-livraison", id);
    await reload();
  }

  function nomClient(id: string | null) {
    if (!id) return "—";
    return clients.find((c) => c.id === id)?.nom ?? id;
  }

  const filteredBons = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bons.filter((b) => {
      if (statutFilter && b.statut !== statutFilter) return false;
      if (!term) return true;
      const haystack = `${b.numero} ${nomClient(b.clientId)} ${b.villeDepart} ${b.villeArrivee}`.toLowerCase();
      return haystack.includes(term);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bons, search, statutFilter, clients]);

  const hasActiveFilters = search.trim() !== "" || statutFilter !== "";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-header-eyebrow">Transport</div>
          <h1>Bons de livraison</h1>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={ouvrirNouveau}>
            <Plus size={16} /> Nouveau bon
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-toolbar">
        <div className="search-field">
          <Search size={15} />
          <input
            type="text"
            placeholder="Rechercher (numéro, client, ville)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="search-clear" onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          )}
        </div>
        <select className="filter-select" value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
          <option value="">Statut : tous</option>
          {STATUT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setSearch("");
              setStatutFilter("");
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Client</th>
              <th>Date d'expédition</th>
              <th>Trajet</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredBons.map((b) => (
              <tr key={b.id}>
                <td>{b.numero}</td>
                <td>{nomClient(b.clientId)}</td>
                <td>{new Date(b.dateExpedition).toLocaleDateString("fr-FR")}</td>
                <td>{b.villeDepart} → {b.villeArrivee}</td>
                <td><Badge value={b.statut} /></td>
                <td className="actions-cell">
                  <Link to={`/bons-livraison/${b.id}/imprimer`} target="_blank" rel="noopener noreferrer">
                    <Printer size={13} /> Imprimer
                  </Link>
                  {canEdit && (
                    <>
                      <button onClick={() => ouvrirEdition(b.id)}>
                        <Pencil size={13} /> Modifier
                      </button>
                      <button className="btn-danger" onClick={() => handleDelete(b.id)}>
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filteredBons.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  {bons.length === 0
                    ? "Aucun bon de livraison pour l'instant."
                    : "Aucun résultat pour cette recherche."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal modal-wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? "Modifier le bon de livraison" : "Nouveau bon de livraison"}</h2>

            {!editingId && (
              <p className="stat-helper">Le numéro de bon est généré automatiquement à l'enregistrement.</p>
            )}

            <div className="form-grid">
              <label className="form-field">
                <span>Client</span>
                <select value={bon.clientId} onChange={(e) => setBon({ ...bon, clientId: e.target.value })}>
                  <option value="">—</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Date d'expédition</span>
                <input
                  type="date"
                  required
                  value={bon.dateExpedition}
                  onChange={(e) => setBon({ ...bon, dateExpedition: e.target.value })}
                />
              </label>
              <label className="form-field">
                <span>Ville de départ</span>
                <input
                  required
                  value={bon.villeDepart}
                  onChange={(e) => setBon({ ...bon, villeDepart: e.target.value })}
                />
              </label>
              <label className="form-field">
                <span>Ville d'arrivée</span>
                <input
                  required
                  value={bon.villeArrivee}
                  onChange={(e) => setBon({ ...bon, villeArrivee: e.target.value })}
                />
              </label>
              <label className="form-field">
                <span>Véhicule</span>
                <select value={bon.vehiculeId} onChange={(e) => setBon({ ...bon, vehiculeId: e.target.value })}>
                  <option value="">—</option>
                  {vehicules.map((v) => (
                    <option key={v.id} value={v.id}>{v.immatriculation}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Chauffeur</span>
                <select value={bon.chauffeurId} onChange={(e) => setBon({ ...bon, chauffeurId: e.target.value })}>
                  <option value="">—</option>
                  {employes.map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Statut</span>
                <select value={bon.statut} onChange={(e) => setBon({ ...bon, statut: e.target.value })}>
                  {STATUT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Reçu par (nom du signataire)</span>
                <input
                  value={bon.nomSignataire}
                  onChange={(e) => setBon({ ...bon, nomSignataire: e.target.value })}
                />
              </label>
              <label className="form-field">
                <span>Date de livraison</span>
                <input
                  type="date"
                  value={bon.dateLivraison}
                  onChange={(e) => setBon({ ...bon, dateLivraison: e.target.value })}
                />
              </label>
              <label className="form-field">
                <span>Signé à la réception</span>
                <input
                  type="checkbox"
                  checked={bon.signe}
                  onChange={(e) => setBon({ ...bon, signe: e.target.checked })}
                />
              </label>
            </div>

            <label className="form-field">
              <span>Observation générale</span>
              <textarea
                value={bon.observation}
                onChange={(e) => setBon({ ...bon, observation: e.target.value })}
              />
            </label>

            <h3>Votre commande</h3>
            <div className="lignes-table-scroll">
              <table className="data-table lignes-table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Description</th>
                    <th>Qté commandée</th>
                    <th>Qté livrée</th>
                    <th>Observation</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          value={l.reference}
                          onChange={(e) => updateLigne(i, { reference: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={l.description}
                          onChange={(e) => updateLigne(i, { description: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={l.quantiteCommandee}
                          onChange={(e) => updateLigne(i, { quantiteCommandee: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={l.quantiteLivree}
                          onChange={(e) => updateLigne(i, { quantiteLivree: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={l.observation}
                          onChange={(e) => updateLigne(i, { observation: e.target.value })}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn-danger" onClick={() => supprimerLigne(i)}>
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn-ghost" onClick={ajouterLigne}>
              <Plus size={14} /> Ajouter une ligne
            </button>

            <div className="modal-actions">
              <button type="button" onClick={() => setShowForm(false)}>
                Annuler
              </button>
              <button type="submit" className="btn-primary">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
