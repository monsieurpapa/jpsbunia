-- Vues de synthèse — appliquées après le push Drizzle (drizzle-kit ne gère pas les vues).
-- Voir docs/modele-donnees.md pour l'équivalence avec les feuilles Excel remplacées.

create or replace view v_synthese_journaliere as
select
    date_mouvement,
    canal_paiement_id,
    devise,
    sum(case when sens = 'ENTREE' then montant else 0 end)  as total_entrees,
    sum(case when sens = 'SORTIE' then montant else 0 end)  as total_sorties,
    sum(case when sens = 'ENTREE' then montant else -montant end) as solde_net
from mouvements_caisse
group by date_mouvement, canal_paiement_id, devise;

create or replace view v_solde_stock_distribution as
select
    (select montant from stock_initial order by date_reference desc limit 1)
    + coalesce(sum(montant_approvisionnement), 0)
    - coalesce(sum(montant_creditation), 0) as stock_actuel
from operations_distribution;

create or replace view v_chiffre_affaires_mensuel as
select
    date_trunc('month', f.date_facture)::date as mois,
    f.devise,
    sum(lf.montant_ht * (1 - f.remise_pct)) as chiffre_affaires_ht
from factures f
join lignes_facture lf on lf.facture_id = f.id
where f.type = 'FACTURE' and f.statut <> 'ANNULEE'
group by 1, 2;

-- Solde courant (toutes dates confondues) par canal de paiement et devise —
-- la "situation caisse / banque" : ce qui reste réellement disponible sur
-- chaque canal, par opposition à v_synthese_journaliere qui ne donne que le
-- mouvement d'une journée donnée.
create or replace view v_solde_caisse_banque as
select
    c.id as canal_paiement_id,
    c.code as canal_code,
    c.libelle as canal_libelle,
    m.devise,
    sum(case when m.sens = 'ENTREE' then m.montant else -m.montant end) as solde
from mouvements_caisse m
join canaux_paiement c on c.id = m.canal_paiement_id
group by c.id, c.code, c.libelle, m.devise;

-- Dépenses réellement réalisées (décaissées), par mois et devise — le
-- personnel n'est compté que lorsqu'il est payé (statut PAYE, sur le mois de
-- date_paiement) ; le fonctionnement n'a pas de statut, chaque ligne est déjà
-- une dépense engagée (sur le mois de date_depense).
create or replace view v_depenses_mensuelles as
select
    mois,
    devise,
    sum(montant_personnel) as montant_personnel,
    sum(montant_fonctionnement) as montant_fonctionnement,
    sum(montant_personnel) + sum(montant_fonctionnement) as montant_total
from (
    select
        date_trunc('month', date_paiement)::date as mois,
        devise,
        montant as montant_personnel,
        0 as montant_fonctionnement
    from depenses_personnel
    where statut = 'PAYE' and date_paiement is not null
    union all
    select
        date_trunc('month', date_depense)::date as mois,
        devise,
        0 as montant_personnel,
        montant as montant_fonctionnement
    from depenses_fonctionnement
) t
group by mois, devise;

create or replace view v_dettes_distributeurs as
select
    d.id as distributeur_id,
    d.nom_point_vente,
    d.ville,
    d.plafond_credit,
    o.devise,
    sum(
        case when o.sens_credit = 'REMBOURSEMENT' then -1 else 1 end
        * (o.montant_creditation + o.montant_approvisionnement)
    ) as solde_du
from distributeurs d
join operations_distribution o on o.distributeur_id = d.id and o.statut = 'CREDIT'
group by d.id, d.nom_point_vente, d.ville, d.plafond_credit, o.devise;

create or replace view v_commissions_distributeurs as
select
    d.id as distributeur_id,
    d.nom_point_vente,
    d.ville,
    d.taux_commission,
    o.devise,
    sum(o.montant_creditation) as volume_vendu,
    sum(o.montant_creditation) * d.taux_commission as commission_due
from distributeurs d
join operations_distribution o on o.distributeur_id = d.id
where o.type_operation in ('VENTE_CREDIT_CGA','VENTE_MATERIELS','VENTE_ACCESSOIRES','VENTE_DECODEURS','VENTE_PARABOLES')
group by d.id, d.nom_point_vente, d.ville, d.taux_commission, o.devise;
