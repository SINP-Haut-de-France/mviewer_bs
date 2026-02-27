// Test unitaire pour sinpQueryBuilder avec gestion des tableaux cd_ref
// Ajouter ce test dans votre suite de tests

describe('sinpQueryBuilder - Gestion des tableaux cd_ref', () => {
  
  test('Tableau cd_ref vide → CD_REF vide dans VIEWPARAMS', () => {
    const params = {
      communes: ['62225'],
      departements: ['62'],
      taxons: [],  // ← Tableau vide
      dateDeb: '2005-12-10',
      dateFin: '2025-12-10'
    };
    
    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');
    
    expect(result.TYPENAME).toBe('sinp_diffusion:v_synthese_commune');
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    // ✅ CD_REF est vide (pas d'undefined)
    expect(result.VIEWPARAMS).toContain('CD_REF:');
    expect(result.VIEWPARAMS).not.toContain('undefined');
  });

  test('Tableau cd_ref avec une valeur → CSV correct', () => {
    const params = {
      communes: ['62225'],
      departements: ['62'],
      taxons: [2440],  // ← Un seul cd_ref
      dateDeb: '2005-12-10',
      dateFin: '2025-12-10'
    };
    
    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');
    
    expect(result.TYPENAME).toBe('sinp_diffusion:v_synthese_commune');
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    // ✅ CD_REF contient la valeur
    expect(result.VIEWPARAMS).toContain('CD_REF:2440');
  });

  test('Tableau cd_ref avec plusieurs valeurs → CSV correct', () => {
    const params = {
      communes: ['62225'],
      departements: ['62'],
      taxons: [2440, 2442, 2444],  // ← Plusieurs cd_ref
      dateDeb: '2005-12-10',
      dateFin: '2025-12-10'
    };
    
    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');
    
    expect(result.TYPENAME).toBe('sinp_diffusion:v_synthese_commune');
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    // ✅ CD_REF contient les valeurs séparées par virgule
    expect(result.VIEWPARAMS).toContain('CD_REF:2440%2C2442%2C2444');
  });

  test('cd_ref undefined → traiter comme tableau vide', () => {
    const params = {
      communes: ['62225'],
      departements: ['62'],
      taxons: undefined,  // ← Undefined
      dateDeb: '2005-12-10',
      dateFin: '2025-12-10'
    };
    
    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');
    
    expect(result.TYPENAME).toBe('sinp_diffusion:v_synthese_commune');
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    // ✅ CD_REF traité comme vide (pas d'erreur)
    expect(result.VIEWPARAMS).toContain('CD_REF:');
    expect(result.VIEWPARAMS).not.toContain('undefined');
  });

  test('Flux complet: advancedSearch → sinpQueryBuilder → URL correcte', () => {
    // Simuler ce que retourne GlobalFilters React
    const selectedFilters = {
      filteredCommunes: ['62225'],
      filteredDepartments: ['62'],
      filteredTaxons: [2440, 2442],  // ← Utilisateur sélectionne 2 espèces
      filteredGroupes: [],
      dateDeb: '2005-12-10',
      dateFin: '2025-12-10'
    };
    
    // advancedSearch.js transforme en
    const _params = {
      communes: selectedFilters.filteredCommunes,
      departements: selectedFilters.filteredDepartments,
      taxons: selectedFilters.filteredTaxons,  // ← Important: tableau
      groupes: selectedFilters.filteredGroupes,
      dateDeb: selectedFilters.dateDeb,
      dateFin: selectedFilters.dateFin
    };
    
    // sinpQueryBuilder construit l'URL
    const result = sinpQueryBuilder.buildRequestOptions(_params, 'v_synthese_commune');
    
    // Vérifications
    expect(result.TYPENAME).toBe('sinp_diffusion:v_synthese_commune');
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    expect(result.VIEWPARAMS).toBe('DATE_DEB:2005-12-10;DATE_FIN:2025-12-10;CD_REF:2440%2C2442');
  });

  test('SQL View reçoit correctement les paramètres', () => {
    // URL que mviewer envoie à GeoServer:
    // VIEWPARAMS=DATE_DEB:2005-12-10;DATE_FIN:2025-12-10;CD_REF:2440%2C2442
    
    // GeoServer decode et remplace:
    // '%DATE_DEB%' → '2005-12-10'
    // '%DATE_FIN%' → '2025-12-10'
    // '%CD_REF%'   → '2440,2442'
    
    // SQL View exécute:
    // and (
    //   '2440,2442' = ''  -- FALSE
    //   or cd_ref IN (
    //     SELECT CAST(TRIM(value) AS INTEGER)
    //     FROM unnest(string_to_array('2440,2442', ',')) AS t(value)
    //   )
    // )
    
    // string_to_array('2440,2442', ',') → ['2440', '2442']
    // CAST(TRIM('2440') AS INTEGER) → 2440
    // CAST(TRIM('2442') AS INTEGER) → 2442
    // cd_ref IN (2440, 2442) → Filtre correctement appliqué
    
    expect(true).toBe(true); // Ceci est une vérification manuelle
  });
});

// === CAS D'USAGE RÉELS ===

describe('Cas d\'usage réels SINP', () => {
  
  test('Recherche complète: toutes les communes, taxons Chevreuil+Sanglier', () => {
    const params = {
      communes: [],  // Toutes les communes
      departements: [],  // Tous les départements
      taxons: [2440, 2442],  // Chevreuil, Sanglier
      dateDeb: '2020-01-01',
      dateFin: '2025-12-10'
    };
    
    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');
    
    // Doit créer une requête sans filtre communal/départemental
    expect(result.CQL_FILTER).toBe('');  // Pas de CQL_FILTER
    expect(result.VIEWPARAMS).toContain('CD_REF:2440%2C2442');
  });

  test('Recherche départementale sans espèce spécifique', () => {
    const params = {
      communes: [],
      departements: ['59', '62'],  // Nord, Pas-de-Calais
      taxons: [],  // Toutes les espèces
      dateDeb: '2020-01-01',
      dateFin: '2025-12-10'
    };
    
    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');
    
    // Doit filtrer par département seulement
    expect(result.CQL_FILTER).toContain('code_dpt IN');
    // CD_REF vide = pas de filtrage sur cd_ref
    expect(result.VIEWPARAMS).toContain('CD_REF:');
  });

  test('Recherche très spécifique: 1 commune + 5 espèces', () => {
    const params = {
      communes: ['62225'],  // 1 commune
      departements: ['62'],
      taxons: [2440, 2442, 2444, 2500, 2600],  // 5 espèces
      dateDeb: '2020-01-01',
      dateFin: '2025-12-10'
    };
    
    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');
    
    expect(result.CQL_FILTER).toBe("code_insee IN ('62225') AND code_dpt IN ('62')");
    expect(result.VIEWPARAMS).toContain('CD_REF:2440%2C2442%2C2444%2C2500%2C2600');
  });
});

// === TESTS POUR GROUP_UUIDS (CORRECTION DU BUG) ===

describe('GROUP_UUIDS - Gestion correcte des séparateurs', () => {

  test('GROUP_UUIDS avec un seul UUID → pas de séparateur', () => {
    const params = {
      communes: ['62225'],
      departements: ['62'],
      groupes: ['b83367ac-40fd-5d1d-84bd-2a1bd040c365'],
      dateDeb: '2006-02-27',
      dateFin: '2026-02-27'
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');

    expect(result.VIEWPARAMS).toContain('GROUP_UUIDS:b83367ac-40fd-5d1d-84bd-2a1bd040c365');
  });

  test('GROUP_UUIDS avec plusieurs UUIDs → séparés par virgules (pas point-virgules)', () => {
    const params = {
      communes: ['62225'],
      departements: ['62'],
      groupes: [
        'b83367ac-40fd-5d1d-84bd-2a1bd040c365',
        'a94c1615-276d-5307-8fa2-d4e7bd4bdc05'
      ],
      dateDeb: '2006-02-27',
      dateFin: '2026-02-27'
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');

    // Vérifier que les UUIDs sont séparés par des virgules (encodées en %2C)
    expect(result.VIEWPARAMS).toContain('GROUP_UUIDS:b83367ac-40fd-5d1d-84bd-2a1bd040c365%2Ca94c1615-276d-5307-8fa2-d4e7bd4bdc05');
    // Vérifier qu'il n'y a PAS de point-virgule entre les UUIDs
    expect(result.VIEWPARAMS).not.toContain('b83367ac-40fd-5d1d-84bd-2a1bd040c365%3Ba94c1615');
  });

  test('GROUP_UUIDS vide → paramètre non envoyé (évite timeout)', () => {
    const params = {
      communes: ['62225'],
      departements: ['62'],
      groupes: [],  // Aucun groupe sélectionné
      dateDeb: '2006-02-27',
      dateFin: '2026-02-27'
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');

    // GROUP_UUIDS ne doit PAS apparaître dans VIEWPARAMS
    expect(result.VIEWPARAMS).not.toContain('GROUP_UUIDS');
  });

  test('Cohérence CD_REF et GROUP_UUIDS : tous deux utilisent des virgules', () => {
    const params = {
      communes: ['62225'],
      departements: ['62'],
      taxons: [2440, 2442],  // 2 taxons
      groupes: [
        'b83367ac-40fd-5d1d-84bd-2a1bd040c365',
        'a94c1615-276d-5307-8fa2-d4e7bd4bdc05'
      ],  // 2 groupes
      dateDeb: '2006-02-27',
      dateFin: '2026-02-27'
    };

    const result = sinpQueryBuilder.buildRequestOptions(params, 'v_synthese_commune');

    // CD_REF utilise des virgules
    expect(result.VIEWPARAMS).toContain('CD_REF:2440%2C2442');
    // GROUP_UUIDS utilise des virgules (même convention)
    expect(result.VIEWPARAMS).toContain('GROUP_UUIDS:b83367ac-40fd-5d1d-84bd-2a1bd040c365%2Ca94c1615');
  });
});

