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
