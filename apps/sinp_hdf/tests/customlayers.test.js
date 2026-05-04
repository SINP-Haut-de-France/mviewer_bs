/**
 * TESTS - Nouveaux layers avec SinpBaseLayer
 * ===========================================
 * Tests unitaires et d'intégration pour les nouvelles layers
 * À ajouter dans: tests/customlayers.test.js
 */

describe("SinpBaseLayer - Classe abstraite", () => {
  test("SinpBaseLayer est défini", () => {
    expect(mviewer.customLayers.SinpBaseLayer).toBeDefined();
  });

  test("Peut créer une instance avec paramètres valides", () => {
    const layer = new mviewer.customLayers.SinpBaseLayer("testLayer", "fn_get_stats", {
      maxZoom: 15,
    });
    expect(layer.layerId).toBe("testLayer");
    expect(layer.typeName).toBe("fn_get_stats");
    expect(layer.maxZoom).toBe(15);
  });

  test("Retourne un layer OpenLayers", () => {
    const layer = new mviewer.customLayers.SinpBaseLayer("testLayer", "fn_get_stats");
    expect(layer.getLayer()).toBeInstanceOf(ol.layer.Vector);
  });

  test("Construite une URL GeoServer correcte", () => {
    const layer = new mviewer.customLayers.SinpBaseLayer("testLayer", "fn_get_stats");
    const url = layer._buildQueryURL({
      TYPENAME: "fn_get_stats",
      VIEWPARAMS: "DATE_DEB:2020-01-01|DATE_FIN:2026-03-10",
    });

    expect(url).toContain("SERVICE=WFS");
    expect(url).toContain("VERSION=2.0.0");
    expect(url).toContain("REQUEST=GetFeature");
    expect(url).toContain("TYPENAME=fn_get_stats");
    // Les pipes doivent être encodés en %7C
    expect(url).toContain("%7C");
  });

  test("Encode correctement les VIEWPARAMS", () => {
    const layer = new mviewer.customLayers.SinpBaseLayer("testLayer", "fn_get_stats");
    const viewParams =
      "DATE_DEB:2020-01-01;DATE_FIN:2026-03-10;CD_REF:2440|2442;GRP_IDS:13|15";
    const url = layer._buildQueryURL({
      TYPENAME: "testLayer",
      VIEWPARAMS: viewParams,
    });

    // Les deux-points et points-virgules ne doivent PAS être encodés
    expect(url).toContain("DATE_DEB:2020-01-01");
    expect(url).toContain("DATE_FIN:2026-03-10");
    // Les pipes des listes doivent être encodés
    expect(url).toContain("CD_REF:2440%7C2442");
    // Les pipes de GRP_IDS DOIVENT être encodés
    expect(url).toContain("GRP_IDS:13%7C15");
  });

  test("Expose une config de légende legacy pour le rendu GeoServer", () => {
    const previousEnv = mviewer.env;
    const previousGetLegendUrl = mviewer.getLegendUrl;

    mviewer.env = {
      CURRENT_ENV: "TEST",
      TEST: {
        GEOSERVER_BASE_URL: "https://example.test/geoserver/sinp",
      },
    };
    mviewer.getLegendUrl = jest.fn(() => "https://example.test/legend.png");

    const layer = new mviewer.customLayers.SinpBaseLayer("testLayer", "fn_get_stats", {
      serverStyle: {
        enabled: true,
        workspace: "sinp_diffusion",
        styleName: "sinp_stats",
      },
    });
    const config = {
      id: "testLayer",
      type: "customlayer",
      url: "apps/sinp_hdf/customlayers/testLayer.js",
    };

    layer.attachLegacyConfig(config);

    expect(config.layername).toBe("sinp_diffusion:fn_get_stats");
    expect(config.style).toBe("sinp_stats");
    expect(config.legendurl).toBe("https://example.test/legend.png");
    expect(mviewer.getLegendUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.test/geoserver/sinp/wms",
        layername: "sinp_diffusion:fn_get_stats",
        style: "sinp_stats",
      })
    );

    mviewer.env = previousEnv;
    mviewer.getLegendUrl = previousGetLegendUrl;
  });
});

describe("SinpBaseCustom - Scopage des détails", () => {
  test("Cible communale: le rattachement se fait sur les codes INSEE", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      mainTypeName: "fn_get_stats",
      detailsTypeName: "fn_get_obs_detaillee",
      metadataTypeName: "fn_get_metadatas",
      targetLocCode: "2",
    });

    const result = control._getResultJoinConfig({
      communes: ["62225"],
      departements: ["62"],
      targetLocCode: "2",
    });

    expect(result.featureKey).toContain("code_insee");
    expect(result.detailKey).toContain("code_insee");
  });

  test("Cible grille: le rattachement se fait sur les clés de maille", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      mainTypeName: "fn_get_stats",
      detailsTypeName: "fn_get_obs_detaillee",
      metadataTypeName: "fn_get_metadatas",
      targetLocCode: "7",
    });

    const result = control._getResultJoinConfig({
      communes: ["62225"],
      departements: ["62"],
      targetLocCode: "7",
    });

    expect(result.featureKey).toContain("code_maille");
    expect(result.detailKey).toContain("code_maille");
  });
});

describe("AdvancedSearchLayer", () => {
  test("Est défini", () => {
    expect(mviewer.customLayers.advancedSearch).toBeDefined();
  });

  test("Retourne layer, handle, get_datas", () => {
    const api = mviewer.customLayers.advancedSearch;
    expect(api.layer).toBeDefined();
    expect(api.handle).toBeDefined();
    expect(api.get_datas).toBeDefined();
    expect(api._instance).toBeDefined();
  });

  test("Layer est instance de ol.layer.Vector", () => {
    const layer = mviewer.customLayers.advancedSearch.layer;
    expect(layer).toBeInstanceOf(ol.layer.Vector);
  });

  test("Instance hérite de SinpBaseLayer", () => {
    const instance = mviewer.customLayers.advancedSearch._instance;
    expect(instance).toBeInstanceOf(mviewer.customLayers.SinpBaseLayer);
  });

  test("Instance a les bonnes propriétés", () => {
    const instance = mviewer.customLayers.advancedSearch._instance;
    expect(instance.layerId).toBe("advancedSearch");
    expect(instance.typeName).toBe("fn_get_stats");
    expect(instance.maxZoom).toBe(15);
  });

  test("get_datas retourne une Promise", () => {
    const result = mviewer.customLayers.advancedSearch.get_datas({
      dateDeb: "2020-01-01",
      dateFin: "2026-03-10",
    });
    expect(result).toBeInstanceOf(Promise);
  });
});

describe("GridSearch5x5Layer", () => {
  test("Est défini", () => {
    expect(mviewer.customLayers.gridSearch5x5).toBeDefined();
  });

  test("Utilise la bonne fonction PostgreSQL", () => {
    const instance = mviewer.customLayers.gridSearch5x5._instance;
    expect(instance.typeName).toBe("fn_get_stats");
  });

  test("A un maxZoom de 12", () => {
    const instance = mviewer.customLayers.gridSearch5x5._instance;
    expect(instance.maxZoom).toBe(12);
  });

  test("Utilise le rendu GeoServer pour la grille 5x5", () => {
    const instance = mviewer.customLayers.gridSearch5x5._instance;
    expect(instance.serverStyle?.enabled).toBe(true);
    expect(instance._serverRenderLayer).toBeDefined();
  });
});

describe("GridSearch10x10Layer", () => {
  test("Est défini", () => {
    expect(mviewer.customLayers.gridSearch10x10).toBeDefined();
  });

  test("Utilise la bonne fonction PostgreSQL", () => {
    const instance = mviewer.customLayers.gridSearch10x10._instance;
    expect(instance.typeName).toBe("fn_get_stats");
  });

  test("A un maxZoom de 10", () => {
    const instance = mviewer.customLayers.gridSearch10x10._instance;
    expect(instance.maxZoom).toBe(10);
  });

  test("Utilise le rendu GeoServer pour la grille 10x10", () => {
    const instance = mviewer.customLayers.gridSearch10x10._instance;
    expect(instance.serverStyle?.enabled).toBe(true);
    expect(instance._serverRenderLayer).toBeDefined();
  });
});

describe("sinpQueryBuilder - Configurations nouvelles", () => {
  test("Configuration fn_get_stats existe", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        taxons: [2440, 2442],
        groupes: [13, 15],
        targetLocCode: "2",
      },
      "fn_get_stats"
    );

    expect(options.TYPENAME).toBe("sinp_diffusion:fn_get_stats");
    expect(options.VIEWPARAMS).toContain("DATE_DEB:2020-01-01");
    expect(options.VIEWPARAMS).toContain("DATE_FIN:2026-03-10");
    expect(options.VIEWPARAMS).toContain("CD_REF:2440|2442");
    expect(options.VIEWPARAMS).toContain("GRP_IDS:13|15");
    expect(options.VIEWPARAMS).toContain("TARGET_LOC_CODE:2");
  });

  test("Configuration fn_get_obs_detaillee existe", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        taxons: [2440],
        groupes: [],
        targetLocCode: "2",
      },
      "fn_get_obs_detaillee"
    );

    expect(options.TYPENAME).toBe("sinp_diffusion:fn_get_obs_detaillee");
    expect(options.VIEWPARAMS).toContain("CD_REF:2440");
    expect(options.VIEWPARAMS).toContain("TARGET_LOC_CODE:2");
  });

  test("Configuration fn_get_stats existe pour la grille 5x5", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        targetLocCode: "7",
      },
      "fn_get_stats"
    );

    expect(options.TYPENAME).toBe("sinp_diffusion:fn_get_stats");
    expect(options.VIEWPARAMS).toContain("TARGET_LOC_CODE:7");
  });

  test("Configuration fn_get_stats existe pour la grille 10x10", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        targetLocCode: "6",
      },
      "fn_get_stats"
    );

    expect(options.TYPENAME).toBe("sinp_diffusion:fn_get_stats");
    expect(options.VIEWPARAMS).toContain("TARGET_LOC_CODE:6");
  });

  test("Configuration fn_get_obs_detaillee existe pour les grilles", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        groupes: [13],
        targetLocCode: "7",
      },
      "fn_get_obs_detaillee"
    );

    expect(options.TYPENAME).toBe("sinp_diffusion:fn_get_obs_detaillee");
    expect(options.VIEWPARAMS).toContain("GRP_IDS:13");
    expect(options.VIEWPARAMS).toContain("TARGET_LOC_CODE:7");
  });

  test("Configuration fn_get_metadatas existe", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        taxons: [2440],
        targetLocCode: "2",
      },
      "fn_get_metadatas"
    );

    expect(options.TYPENAME).toBe("sinp_diffusion:fn_get_metadatas");
    expect(options.VIEWPARAMS).toContain("CD_REF:2440");
    expect(options.VIEWPARAMS).toContain("TARGET_LOC_CODE:2");
  });
});

describe("VIEWPARAMS - Séparation correcte des séparants", () => {
  test("CD_REF utilise des pipes", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        taxons: [2440, 2442, 2444],
      },
      "fn_get_stats"
    );

    expect(options.VIEWPARAMS).toMatch(/CD_REF:2440\|2442\|2444/);
    expect(options.VIEWPARAMS).not.toMatch(/CD_REF:2440,2442/);
  });

  test("GRP_IDS utilise des pipes", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        groupes: [13, 15, 17],
      },
      "fn_get_stats"
    );

    // GRP_IDS doit avoir des pipes
    expect(options.VIEWPARAMS).toMatch(/GRP_IDS:13\|15\|17/);
    // Pas de virgules
    expect(options.VIEWPARAMS).not.toMatch(/GRP_IDS:13,15/);
  });

  test("CD_REF vide est omis", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        taxons: [],
      },
      "fn_get_stats"
    );

    expect(options.VIEWPARAMS).not.toContain("CD_REF:");
  });

  test("GRP_IDS vide est autorisé", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        groupes: [],
      },
      "fn_get_stats"
    );

    // GRP_IDS peut être vide ou absent
    expect(options.VIEWPARAMS).not.toContain("GRP_IDS:");
  });
});

describe("Intégration - Flux complet", () => {
  test("communeSearch appelle buildRequestOptions avec les bonnes fonctions", async () => {
    // Mock sinpQueryBuilder
    const buildRequestOptionsSpy = jest.spyOn(sinpQueryBuilder, "buildRequestOptions");

    const params = {
      dateDeb: "2020-01-01",
      dateFin: "2026-03-10",
      taxons: [2440],
    };

    // Appeler get_datas
    const result = mviewer.customLayers.advancedSearch.get_datas(params);

    // Vérifier que buildRequestOptions a été appelé (via getData)
    // Note: peut être appelé plusieurs fois (communes + détails)
    expect(buildRequestOptionsSpy).toHaveBeenCalledWith(params, "fn_get_stats");

    // Cleanup
    buildRequestOptionsSpy.mockRestore();
  });

  test("Peut créer des instances pour chaque layer type", () => {
    const advSearch = mviewer.customLayers.advancedSearch._instance;
    const grid5x5 = mviewer.customLayers.gridSearch5x5._instance;
    const grid10x10 = mviewer.customLayers.gridSearch10x10._instance;

    // Chacun a ses propres paramètres
    expect(advSearch.layerId).toBe("advancedSearch");
    expect(grid5x5.layerId).toBe("gridSearch5x5");
    expect(grid10x10.layerId).toBe("gridSearch10x10");

    // Chacun utilise la bonne fonction PostgreSQL
    expect(advSearch.typeName).toBe("fn_get_stats");
    expect(grid5x5.typeName).toBe("fn_get_stats");
    expect(grid10x10.typeName).toBe("fn_get_stats");
  });
});
