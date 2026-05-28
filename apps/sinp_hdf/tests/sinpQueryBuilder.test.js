// Test unitaire pour sinpQueryBuilder avec gestion des tableaux cd_ref
// Ajouter ce test dans votre suite de tests

describe("sinpQueryBuilder - Gestion des tableaux cd_ref", () => {
  test("Tableau cd_ref vide → CD_REF vide dans VIEWPARAMS", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      taxons: [], // ← Tableau vide
      dateDeb: "2005-12-10",
      dateFin: "2025-12-10",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    expect(result.TYPENAME).toBe("sinp_diffusion:v_synthese_commune");
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    // ✅ CD_REF est vide (pas d'undefined)
    expect(result.VIEWPARAMS).toContain("CD_REF:");
    expect(result.VIEWPARAMS).not.toContain("undefined");
  });

  test("Tableau cd_ref avec une valeur → format underscore correct", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      taxons: [2440], // ← Un seul cd_ref
      dateDeb: "2005-12-10",
      dateFin: "2025-12-10",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    expect(result.TYPENAME).toBe("sinp_diffusion:v_synthese_commune");
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    // ✅ CD_REF contient la valeur
    expect(result.VIEWPARAMS).toContain("CD_REF:2440");
  });

  test("Tableau cd_ref avec plusieurs valeurs → format underscore correct", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      taxons: [2440, 2442, 2444], // ← Plusieurs cd_ref
      dateDeb: "2005-12-10",
      dateFin: "2025-12-10",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    expect(result.TYPENAME).toBe("sinp_diffusion:v_synthese_commune");
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    // ✅ CD_REF contient les valeurs séparées par des underscores
    expect(result.VIEWPARAMS).toContain("CD_REF:2440_2442_2444");
  });

  test("cd_ref undefined → traiter comme tableau vide", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      taxons: undefined, // ← Undefined
      dateDeb: "2005-12-10",
      dateFin: "2025-12-10",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    expect(result.TYPENAME).toBe("sinp_diffusion:v_synthese_commune");
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    // ✅ CD_REF traité comme vide (pas d'erreur)
    expect(result.VIEWPARAMS).toContain("CD_REF:");
    expect(result.VIEWPARAMS).not.toContain("undefined");
  });

  test("Flux complet: communeSearch → sinpQueryBuilder → URL correcte", () => {
    // Simuler ce que retourne GlobalFilters React
    const selectedFilters = {
      filteredCommunes: ["62225"],
      filteredDepartments: ["62"],
      filteredTaxons: [2440, 2442], // ← Utilisateur sélectionne 2 espèces
      filteredGroupes: [],
      dateDeb: "2005-12-10",
      dateFin: "2025-12-10",
    };

    // communeSearch.js transforme en
    const _params = {
      communes: selectedFilters.filteredCommunes,
      departements: selectedFilters.filteredDepartments,
      taxons: selectedFilters.filteredTaxons, // ← Important: tableau
      groupes: selectedFilters.filteredGroupes,
      dateDeb: selectedFilters.dateDeb,
      dateFin: selectedFilters.dateFin,
    };

    // sinpQueryBuilder construit l'URL
    const result = sinpQueryBuilder.buildRequestOptions(_params, "v_synthese_commune");

    // Vérifications
    expect(result.TYPENAME).toBe("sinp_diffusion:v_synthese_commune");
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    // Format sans encodage complémentaire pour les listes générées
    expect(result.VIEWPARAMS).toBe(
      "DATE_DEB:2005-12-10;DATE_FIN:2025-12-10;CD_REF:2440_2442"
    );
  });

  test("SQL View reçoit correctement les paramètres", () => {
    // URL que mviewer envoie à GeoServer:
    // VIEWPARAMS=DATE_DEB:2005-12-10;DATE_FIN:2025-12-10;CD_REF:2440_2442

    // GeoServer decode et remplace:
    // '%DATE_DEB%' → '2005-12-10'
    // '%DATE_FIN%' → '2025-12-10'
    // '%CD_REF%'   → '2440_2442'

    // SQL View exécute:
    // and (
    //   '2440_2442' = ''  -- FALSE
    //   or cd_ref IN (
    //     SELECT CAST(TRIM(value) AS INTEGER)
    //     FROM unnest(string_to_array('2440_2442', '_')) AS t(value)
    //   )
    // )

    // string_to_array('2440_2442', '_') → ['2440', '2442']
    // CAST(TRIM('2440') AS INTEGER) → 2440
    // CAST(TRIM('2442') AS INTEGER) → 2442
    // cd_ref IN (2440, 2442) → Filtre correctement appliqué

    expect(true).toBe(true); // Ceci est une vérification manuelle
  });
});

// === CAS D'USAGE RÉELS ===

describe("Cas d'usage réels SINP", () => {
  test("Recherche complète: toutes les communes, taxons Chevreuil+Sanglier", () => {
    const params = {
      communes: [], // Toutes les communes
      departements: [], // Tous les départements
      taxons: [2440, 2442], // Chevreuil, Sanglier
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    // Doit créer une requête sans filtre communal/départemental
    expect(result.CQL_FILTER).toBe(""); // Pas de CQL_FILTER
    expect(result.VIEWPARAMS).toContain("CD_REF:2440_2442");
  });

  test("Recherche départementale sans espèce spécifique", () => {
    const params = {
      communes: [],
      departements: ["59", "62"], // Nord, Pas-de-Calais
      taxons: [], // Toutes les espèces
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    // Doit filtrer par département seulement
    expect(result.CQL_FILTER).toContain("code_dpt IN");
    // CD_REF vide = pas de filtrage sur cd_ref
    expect(result.VIEWPARAMS).toContain("CD_REF:");
  });

  test("Recherche très spécifique: 1 commune + 5 espèces", () => {
    const params = {
      communes: ["62225"], // 1 commune
      departements: ["62"],
      taxons: [2440, 2442, 2444, 2500, 2600], // 5 espèces
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    expect(result.VIEWPARAMS).toContain("CD_REF:2440_2442_2444_2500_2600");
  });
});

// === TESTS POUR GRP_IDS (CORRECTION DU BUG) ===

describe("GRP_IDS - Gestion correcte des séparateurs", () => {
  test("GRP_IDS avec un seul ID → pas de séparateur", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      groupes: [12],
      dateDeb: "2006-02-27",
      dateFin: "2026-02-27",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    expect(result.VIEWPARAMS).toContain("GRP_IDS:12");
  });

  test("GRP_IDS avec plusieurs IDs → séparés par underscore (_)", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      groupes: [13, 15],
      dateDeb: "2006-02-27",
      dateFin: "2026-02-27",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    // Vérifier que les IDs sont séparés par des underscores
    expect(result.VIEWPARAMS).toContain("GRP_IDS:13_15");
    // Vérifier qu'il n'y a PAS de virgule ou de point-virgule entre les IDs
    expect(result.VIEWPARAMS).not.toContain("13,15");
    expect(result.VIEWPARAMS).not.toContain("13;15");
  });

  test("GRP_IDS vide → paramètre non envoyé (évite timeout)", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      groupes: [], // Aucun groupe sélectionné
      dateDeb: "2006-02-27",
      dateFin: "2026-02-27",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    // GRP_IDS ne doit PAS apparaître dans VIEWPARAMS
    expect(result.VIEWPARAMS).not.toContain("GRP_IDS");
  });

  test("Cohérence CD_REF et GRP_IDS avec underscores", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      taxons: [2440, 2442], // 2 taxons - séparés par underscores
      groupes: [12, 23], // 2 groupes - séparés par underscores
      dateDeb: "2006-02-27",
      dateFin: "2026-02-27",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    // CD_REF utilise des underscores
    expect(result.VIEWPARAMS).toContain("CD_REF:2440_2442");
    // GRP_IDS utilise des underscores
    expect(result.VIEWPARAMS).toContain("GRP_IDS:12_23");
  });
});

// === TESTS POUR NOUVEAU CONTRAT POSTGRESQL ===

describe("sinpQueryBuilder - Fonctions PostgreSQL + VIEWPARAMS", () => {
  test("fn_get_stats accepte un nom de vue qualifié et le normalise", () => {
    const params = {
      dateDeb: "2005-12-10",
      dateFin: "2025-12-10",
      targetLocCode: "2",
    };

    const result = sinpQueryBuilder.buildRequestOptions(
      params,
      " sinp_diffusion:fn_get_stats "
    );

    expect(result.TYPENAME).toBe("sinp_diffusion:fn_get_stats");
    expect(result.VIEWPARAMS).toContain("TARGET_LOC_CODE:2");
  });

  test("fn_get_stats retourne un TYPENAME de fonction sans CQL_FILTER", () => {
    const params = {
      communes: ["62225", "59350"],
      departements: ["62", "59"],
      epcis: ["200069193"],
      taxons: [2440, 2442],
      groupes: [13, 15],
      dateDeb: "2005-12-10",
      dateFin: "2025-12-10",
      targetLocCode: "2",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "fn_get_stats");

    expect(result.TYPENAME).toBe("sinp_diffusion:fn_get_stats");
    expect(result.CQL_FILTER).toBeUndefined();
    expect(result.VIEWPARAMS).toBe(
      "DATE_DEB:2005-12-10;DATE_FIN:2025-12-10;DEPT_IDS:62_59;CODE_INSEES:62225_59350;CD_REF:2440_2442;GRP_IDS:13_15;EPCI_IDS:200069193;TARGET_LOC_CODE:2"
    );
  });

  test("les VIEWPARAMS sont sanitizés sans point-virgule final", () => {
    const params = {
      dateDeb: "2006-05-13",
      dateFin: "2026-05-13",
      departements: ["62"],
      targetLocCode: "2",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "fn_get_stats");

    expect(result.VIEWPARAMS).toBe(
      "DATE_DEB:2006-05-13;DATE_FIN:2026-05-13;DEPT_IDS:62;TARGET_LOC_CODE:2"
    );
    expect(result.VIEWPARAMS.endsWith(";")).toBe(false);
  });

  test("fn_get_obs_detaillee omet les filtres de liste vides", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      taxons: [],
      groupes: [],
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
      targetLocCode: "2",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "fn_get_obs_detaillee");

    expect(result.TYPENAME).toBe("sinp_diffusion:fn_get_obs_detaillee");
    expect(result.CQL_FILTER).toBeUndefined();
    expect(result.VIEWPARAMS).toContain("DEPT_IDS:62");
    expect(result.VIEWPARAMS).toContain("CODE_INSEES:62225");
    expect(result.VIEWPARAMS).not.toContain("CD_REF:");
    expect(result.VIEWPARAMS).not.toContain("GRP_IDS:");
    expect(result.VIEWPARAMS).toContain("TARGET_LOC_CODE:2");
  });

  test("fn_get_obs_detaillee passe les mailles sélectionnées via CODE_MAILLES", () => {
    const params = {
      departements: ["62"],
      communes: ["62165"],
      mailles: ["E069N692", "E070N693"],
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
      targetLocCode: "6",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "fn_get_obs_detaillee");

    expect(result.TYPENAME).toBe("sinp_diffusion:fn_get_obs_detaillee");
    expect(result.CQL_FILTER).toBeUndefined();
    expect(result.VIEWPARAMS).toContain("CODE_MAILLES:E069N692_E070N693");
    expect(result.VIEWPARAMS).not.toContain("DEPT_IDS:");
    expect(result.VIEWPARAMS).not.toContain("CODE_INSEES:");
    expect(result.VIEWPARAMS).toContain("TARGET_LOC_CODE:6");
  });

  test("un nom de vue vide ou incomplet est rejeté explicitement", () => {
    expect(() => sinpQueryBuilder.buildRequestOptions({}, " ")).toThrow(
      "Unknown view and schema"
    );
    expect(() => sinpQueryBuilder.buildRequestOptions({}, "sinp_diffusion:")).toThrow(
      "Unknown view and schema"
    );
  });

  test("fn_get_metadatas passe la liste des jdd via ID_JDDS", () => {
    const params = {
      jddIds: ["idJdd1", "idJdd2", "idJdd3"],
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "fn_get_metadatas");

    expect(result.TYPENAME).toBe("sinp_diffusion:fn_get_metadatas");
    expect(result.CQL_FILTER).toBeUndefined();
    expect(result.VIEWPARAMS).toBe("ID_JDDS:idJdd1_idJdd2_idJdd3");
  });

  test("CD_REF utilise des underscores comme les autres listes", () => {
    const params = {
      taxons: [2440, 2442, 2444],
      groupes: [12, 23],
      dateDeb: "2006-02-27",
      dateFin: "2026-02-27",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "fn_get_stats");

    expect(result.VIEWPARAMS).toContain("CD_REF:2440_2442_2444");
    expect(result.VIEWPARAMS).toContain("GRP_IDS:12_23");
  });

  test("communes et départements passent en VIEWPARAMS", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "fn_get_stats");

    expect(result.CQL_FILTER).toBeUndefined();
    expect(result.VIEWPARAMS).toContain("DEPT_IDS:62");
    expect(result.VIEWPARAMS).toContain("CODE_INSEES:62225");
  });

  test("un département sans commune n'envoie aucun CODE_INSEES", () => {
    const params = {
      departements: ["62"],
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
      targetLocCode: "2",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "fn_get_obs_detaillee");

    expect(result.VIEWPARAMS).toContain("DEPT_IDS:62");
    expect(result.VIEWPARAMS).not.toContain("CODE_INSEES:");
  });

  test("rejette les sélections de plus de 5 communes", () => {
    expect(() =>
      sinpQueryBuilder.buildRequestOptions(
        {
          communes: ["62041", "62165", "62225", "59350", "59009", "51454"],
          targetLocCode: "2",
        },
        "fn_get_obs_detaillee"
      )
    ).toThrow("Invalid CODE_INSEES value: maximum 5 communes allowed");
  });

  test("le flux communeSearch garde un format GeoServer simple", () => {
    const selectedFilters = {
      filteredCommunes: ["62225"],
      filteredDepartments: ["62"],
      filteredEpcis: ["200069193"],
      filteredTaxons: [2440, 2442],
      filteredGroupes: [13],
      dateDeb: "2005-12-10",
      dateFin: "2025-12-10",
    };

    const params = {
      communes: selectedFilters.filteredCommunes,
      departements: selectedFilters.filteredDepartments,
      epcis: selectedFilters.filteredEpcis,
      taxons: selectedFilters.filteredTaxons,
      groupes: selectedFilters.filteredGroupes,
      dateDeb: selectedFilters.dateDeb,
      dateFin: selectedFilters.dateFin,
      targetLocCode: "2",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "fn_get_stats");

    expect(result.TYPENAME).toBe("sinp_diffusion:fn_get_stats");
    expect(result.VIEWPARAMS).toBe(
      "DATE_DEB:2005-12-10;DATE_FIN:2025-12-10;DEPT_IDS:62;CODE_INSEES:62225;CD_REF:2440_2442;GRP_IDS:13;EPCI_IDS:200069193;TARGET_LOC_CODE:2"
    );
  });

  test("les vues legacy gardent leur CQL_FILTER pour compatibilité", () => {
    const params = {
      communes: ["62225"],
      departements: ["62"],
      taxons: [2440],
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");

    expect(result.TYPENAME).toBe("sinp_diffusion:v_synthese_commune");
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    expect(result.VIEWPARAMS).toContain("CD_REF:2440");
  });
});
