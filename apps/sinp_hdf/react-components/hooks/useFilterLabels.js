import { useEffect, useState } from "react";

const DATA_BASE_URL = "apps/sinp_hdf/data";

// Les filtres ne conservent que des codes/identifiants : on charge les
// référentiels statiques (une seule fois) pour afficher des libellés lisibles.
const LABEL_SOURCES = {
  departments: {
    url: `${DATA_BASE_URL}/departements_hdf.json`,
    toEntries: (rows) =>
      rows.map((row) => [String(row.code_dpt), `${row.code_dpt} - ${row.libelle}`]),
  },
  communes: {
    url: `${DATA_BASE_URL}/communes_hdf.json`,
    toEntries: (rows) =>
      rows.map((row) => [
        String(row.code_insee),
        `${row.code_insee} - ${row.libelle_commune}`,
      ]),
  },
  epcis: {
    url: `${DATA_BASE_URL}/epci_hdf.json`,
    toEntries: (rows) => rows.map((row) => [String(row.code_epci), row.nom_epci]),
  },
  groupes: {
    url: `${DATA_BASE_URL}/taxonomie_tree.json`,
    toEntries: (rows) => {
      const entries = [];
      const walk = (nodes) =>
        (nodes || []).forEach((node) => {
          entries.push([String(node.id), node.name]);
          walk(node.children);
        });
      walk(rows);
      return entries;
    },
  },
};

const labelPromises = new Map();

const loadLabels = (kind) => {
  if (!labelPromises.has(kind)) {
    const { url, toEntries } = LABEL_SOURCES[kind];
    const promise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((rows) => new Map(toEntries(rows)))
      .catch((error) => {
        console.warn(`Libellés "${kind}" indisponibles:`, error);
        labelPromises.delete(kind);
        return new Map();
      });
    labelPromises.set(kind, promise);
  }
  return labelPromises.get(kind);
};

/**
 * Retourne, pour chaque type de filtre demandé (`needed`), une Map code → libellé.
 * Un référentiel n'est chargé que lorsqu'il est réellement utilisé.
 *
 * @param {Object<string, boolean>} needed - ex. { communes: true, epcis: false }
 */
const useFilterLabels = (needed) => {
  const [labels, setLabels] = useState({});
  const neededKey = Object.keys(LABEL_SOURCES)
    .filter((kind) => needed[kind])
    .join("|");

  useEffect(() => {
    let cancelled = false;

    neededKey
      .split("|")
      .filter(Boolean)
      .forEach((kind) => {
        loadLabels(kind).then((map) => {
          if (!cancelled) {
            setLabels((previous) =>
              previous[kind] === map ? previous : { ...previous, [kind]: map }
            );
          }
        });
      });

    return () => {
      cancelled = true;
    };
  }, [neededKey]);

  return labels;
};

export default useFilterLabels;
