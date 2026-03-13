/**
 * TESTS - Nouveaux layers avec SinpBaseLayer
 * ===========================================
 * Tests unitaires et d'intégration pour les nouvelles layers
 * À ajouter dans: tests/customlayers.test.js
 */

describe('SinpBaseLayer - Classe abstraite', () => {

  test('SinpBaseLayer est défini', () => {
    expect(mviewer.customLayers.SinpBaseLayer).toBeDefined();
  });

  test('Peut créer une instance avec paramètres valides', () => {
    const layer = new mviewer.customLayers.SinpBaseLayer(
      'testLayer',
      'fn_get_stats_communes',
      { maxZoom: 15 }
    );
    expect(layer.layerId).toBe('testLayer');
    expect(layer.typeName).toBe('fn_get_stats_communes');
    expect(layer.maxZoom).toBe(15);
  });

  test('Retourne un layer OpenLayers', () => {
    const layer = new mviewer.customLayers.SinpBaseLayer(
      'testLayer',
      'fn_get_stats_communes'
    );
    expect(layer.getLayer()).toBeInstanceOf(ol.layer.Vector);
  });

  test('Construite une URL GeoServer correcte', () => {
    const layer = new mviewer.customLayers.SinpBaseLayer(
      'testLayer',
      'fn_get_stats_communes'
    );
    const url = layer._buildQueryURL({
      TYPENAME: 'fn_get_stats_communes',
      VIEWPARAMS: 'DATE_DEB:2020-01-01|DATE_FIN:2026-03-10'
    });

    expect(url).toContain('SERVICE=WFS');
    expect(url).toContain('VERSION=2.0.0');
    expect(url).toContain('REQUEST=GetFeature');
    expect(url).toContain('TYPENAME=fn_get_stats_communes');
    // Les pipes doivent être encodés en %7C
    expect(url).toContain('%7C');
  });

  test('Encode correctement les VIEWPARAMS', () => {
    const layer = new mviewer.customLayers.SinpBaseLayer(
      'testLayer',
      'fn_get_stats_communes'
    );
    const viewParams = 'DATE_DEB:2020-01-01;DATE_FIN:2026-03-10;CD_REF:2440,2442;GRP_IDS:13|15';
    const url = layer._buildQueryURL({
      TYPENAME: 'testLayer',
      VIEWPARAMS: viewParams
    });

    // Les deux-points et points-virgules ne doivent PAS être encodés
    expect(url).toContain('DATE_DEB:2020-01-01');
    expect(url).toContain('DATE_FIN:2026-03-10');
    // Les virgules de CD_REF ne doivent PAS être encodées
    expect(url).toContain('CD_REF:2440,2442');
    // Les pipes de GRP_IDS DOIVENT être encodés
    expect(url).toContain('GRP_IDS:13%7C15');
  });
});

describe('AdvancedSearchLayer', () => {

  test('Est défini', () => {
    expect(mviewer.customLayers.advancedSearch).toBeDefined();
  });

  test('Retourne layer, handle, get_datas', () => {
    const api = mviewer.customLayers.advancedSearch;
    expect(api.layer).toBeDefined();
    expect(api.handle).toBeDefined();
    expect(api.get_datas).toBeDefined();
    expect(api._instance).toBeDefined();
  });

  test('Layer est instance de ol.layer.Vector', () => {
    const layer = mviewer.customLayers.advancedSearch.layer;
    expect(layer).toBeInstanceOf(ol.layer.Vector);
  });

  test('Instance hérite de SinpBaseLayer', () => {
    const instance = mviewer.customLayers.advancedSearch._instance;
    expect(instance).toBeInstanceOf(mviewer.customLayers.SinpBaseLayer);
  });

  test('Instance a les bonnes propriétés', () => {
    const instance = mviewer.customLayers.advancedSearch._instance;
    expect(instance.layerId).toBe('advancedSearch');
    expect(instance.typeName).toBe('fn_get_stats_communes');
    expect(instance.maxZoom).toBe(15);
  });

  test('get_datas retourne une Promise', () => {
    const result = mviewer.customLayers.advancedSearch.get_datas({
      dateDeb: '2020-01-01',
      dateFin: '2026-03-10'
    });
    expect(result).toBeInstanceOf(Promise);
  });
});

describe('GridSearch5x5Layer', () => {

  test('Est défini', () => {
    expect(mviewer.customLayers.gridSearch5x5).toBeDefined();
  });

  test('Utilise la bonne fonction PostgreSQL', () => {
    const instance = mviewer.customLayers.gridSearch5x5._instance;
    expect(instance.typeName).toBe('fn_get_stats_grille_5x5');
  });

  test('A un maxZoom de 12', () => {
    const instance = mviewer.customLayers.gridSearch5x5._instance;
    expect(instance.maxZoom).toBe(12);
  });

  test('Utilise un style différent (orange)', () => {
    const instance = mviewer.customLayers.gridSearch5x5._instance;
    const style = instance.style;
    expect(style).toBeDefined();
    // Vérifier qu'il y a un stroke et fill
    expect(style.getStroke()).toBeDefined();
    expect(style.getFill()).toBeDefined();
  });
});

describe('GridSearch10x10Layer', () => {

  test('Est défini', () => {
    expect(mviewer.customLayers.gridSearch10x10).toBeDefined();
  });

  test('Utilise la bonne fonction PostgreSQL', () => {
    const instance = mviewer.customLayers.gridSearch10x10._instance;
    expect(instance.typeName).toBe('fn_get_stats_grille_10x10');
  });

  test('A un maxZoom de 10', () => {
    const instance = mviewer.customLayers.gridSearch10x10._instance;
    expect(instance.maxZoom).toBe(10);
  });
});

describe('sinpQueryBuilder - Configurations nouvelles', () => {

  test('Configuration fn_get_stats_communes existe', () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: '2020-01-01',
        dateFin: '2026-03-10',
        taxons: [2440, 2442],
        groupes: [13, 15]
      },
      'fn_get_stats_communes'
    );

    expect(options.TYPENAME).toBe('sinp_diffusion:fn_get_stats_communes');
    expect(options.VIEWPARAMS).toContain('DATE_DEB:2020-01-01');
    expect(options.VIEWPARAMS).toContain('DATE_FIN:2026-03-10');
    expect(options.VIEWPARAMS).toContain('CD_REF:2440,2442');
    expect(options.VIEWPARAMS).toContain('GRP_IDS:13|15');
  });

  test('Configuration fn_get_obs_detaillee_by_entities existe', () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: '2020-01-01',
        dateFin: '2026-03-10',
        taxons: [2440],
        groupes: []
      },
      'fn_get_obs_detaillee_by_entities'
    );

    expect(options.TYPENAME).toBe('sinp_diffusion:fn_get_obs_detaillee_by_entities');
    expect(options.VIEWPARAMS).toContain('CD_REF:2440');
  });

  test('Configuration fn_get_stats_grille_5x5 existe', () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: '2020-01-01',
        dateFin: '2026-03-10'
      },
      'fn_get_stats_grille_5x5'
    );

    expect(options.TYPENAME).toBe('sinp_diffusion:fn_get_stats_grille_5x5');
  });

  test('Configuration fn_get_stats_grille_10x10 existe', () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: '2020-01-01',
        dateFin: '2026-03-10'
      },
      'fn_get_stats_grille_10x10'
    );

    expect(options.TYPENAME).toBe('sinp_diffusion:fn_get_stats_grille_10x10');
  });

  test('Configuration fn_get_obs_detaillee_grille existe', () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: '2020-01-01',
        dateFin: '2026-03-10',
        groupes: [13]
      },
      'fn_get_obs_detaillee_grille'
    );

    expect(options.TYPENAME).toBe('sinp_diffusion:fn_get_obs_detaillee_grille');
    expect(options.VIEWPARAMS).toContain('GRP_IDS:13');
  });
});

describe('VIEWPARAMS - Séparation correcte des séparants', () => {

  test('CD_REF utilise des virgules', () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: '2020-01-01',
        dateFin: '2026-03-10',
        taxons: [2440, 2442, 2444]
      },
      'fn_get_stats_communes'
    );

    // CD_REF doit avoir des virgules
    expect(options.VIEWPARAMS).toMatch(/CD_REF:2440,2442,2444/);
    // Pas de pipes
    expect(options.VIEWPARAMS).not.toMatch(/CD_REF:2440\|2442/);
  });

  test('GRP_IDS utilise des pipes', () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: '2020-01-01',
        dateFin: '2026-03-10',
        groupes: [13, 15, 17]
      },
      'fn_get_stats_communes'
    );

    // GRP_IDS doit avoir des pipes
    expect(options.VIEWPARAMS).toMatch(/GRP_IDS:13\|15\|17/);
    // Pas de virgules
    expect(options.VIEWPARAMS).not.toMatch(/GRP_IDS:13,15/);
  });

  test('CD_REF vide est autorisé', () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: '2020-01-01',
        dateFin: '2026-03-10',
        taxons: []
      },
      'fn_get_stats_communes'
    );

    // CD_REF: vide
    expect(options.VIEWPARAMS).toContain('CD_REF:');
  });

  test('GRP_IDS vide est autorisé', () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: '2020-01-01',
        dateFin: '2026-03-10',
        groupes: []
      },
      'fn_get_stats_communes'
    );

    // GRP_IDS peut être vide ou absent
    expect(options.VIEWPARAMS).not.toContain('GRP_IDS:');
  });
});

describe('Intégration - Flux complet', () => {

  test('communeSearch appelle buildRequestOptions avec les bonnes fonctions', async () => {
    // Mock sinpQueryBuilder
    const buildRequestOptionsSpy = jest.spyOn(
      sinpQueryBuilder,
      'buildRequestOptions'
    );

    const params = {
      dateDeb: '2020-01-01',
      dateFin: '2026-03-10',
      taxons: [2440]
    };

    // Appeler get_datas
    const result = mviewer.customLayers.advancedSearch.get_datas(params);

    // Vérifier que buildRequestOptions a été appelé (via getData)
    // Note: peut être appelé plusieurs fois (communes + détails)
    expect(buildRequestOptionsSpy).toHaveBeenCalledWith(
      params,
      'fn_get_stats_communes'
    );

    // Cleanup
    buildRequestOptionsSpy.mockRestore();
  });

  test('Peut créer des instances pour chaque layer type', () => {
    const advSearch = mviewer.customLayers.advancedSearch._instance;
    const grid5x5 = mviewer.customLayers.gridSearch5x5._instance;
    const grid10x10 = mviewer.customLayers.gridSearch10x10._instance;

    // Chacun a ses propres paramètres
    expect(advSearch.layerId).toBe('advancedSearch');
    expect(grid5x5.layerId).toBe('gridSearch5x5');
    expect(grid10x10.layerId).toBe('gridSearch10x10');

    // Chacun utilise la bonne fonction PostgreSQL
    expect(advSearch.typeName).toBe('fn_get_stats_communes');
    expect(grid5x5.typeName).toBe('fn_get_stats_grille_5x5');
    expect(grid10x10.typeName).toBe('fn_get_stats_grille_10x10');
  });
});

