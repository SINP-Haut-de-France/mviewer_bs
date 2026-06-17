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
      VIEWPARAMS: "DATE_DEB:2020-01-01;DATE_FIN:2026-03-10;GRP_IDS:13,15",
    });

    expect(url).toContain("SERVICE=WFS");
    expect(url).toContain("VERSION=2.0.0");
    expect(url).toContain("REQUEST=GetFeature");
    expect(url).toContain("TYPENAME=fn_get_stats");
    expect(url).toContain("GRP_IDS:13,15");
    expect(url).not.toContain("%7C");
  });

  test("Conserve la compatibilité avec les VIEWPARAMS legacy", () => {
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
    expect(url).toContain("CD_REF:2440%7C2442");
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
  test("retombe sur le type du layer quand mainTypeName est vide", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      mainTypeName: "   ",
    });

    expect(control._resolveRequestTypeName(control.mainTypeName, "fn_get_stats")).toBe(
      "fn_get_stats"
    );
  });

  test("Construit des paramètres détaillés ciblés pour les communes cliquées", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      targetLocCode: "2",
    });
    const params = {
      departements: ["62"],
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
      targetLocCode: "2",
    };
    const features = [
      {
        get(key) {
          return { code_insee: "62225" }[key];
        },
      },
      {
        get(key) {
          return { code_insee: "59350" }[key];
        },
      },
    ];

    expect(control._buildDetailRequestParams(features, params)).toEqual({
      ...params,
      communes: ["62225", "59350"],
    });
  });

  test("Conserve la commune explicitement filtrée pour les détails initiaux", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      targetLocCode: "2",
    });
    const params = {
      departements: ["62"],
      communes: ["62225"],
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
      targetLocCode: "2",
    };
    const features = [
      {
        get(key) {
          return { code_insee: "62225" }[key];
        },
      },
      {
        get(key) {
          return { code_insee: "59350" }[key];
        },
      },
    ];

    expect(control._buildDetailRequestParams(features, params)).toEqual(params);
  });

  test("normalise les filtres géographiques et limite les communes à 5", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      targetLocCode: "2",
    });

    expect(() =>
      control._normalizeStandardFilters({
        filteredDepartments: ["59", "62"],
      })
    ).toThrow("Un seul département peut être sélectionné.");

    expect(() =>
      control._normalizeStandardFilters({
        filteredDepartments: [{ code_dpt: "62" }],
        filteredCommunes: ["62041", "62165", "62225", "59350", "59009", "51454"],
      })
    ).toThrow("Vous pouvez sélectionner au maximum 5 communes.");

    expect(
      control._normalizeStandardFilters({
        filteredDepartments: [{ code_dpt: "62" }],
        filteredCommunes: [{ code_insee: "62041" }, "62041", "62165", "62225"],
      })
    ).toEqual({
      communes: ["62041", "62165", "62225"],
      departements: ["62"],
      epcis: [],
      groupes: [],
      taxons: [],
      dateDeb: null,
      dateFin: null,
      targetLocCode: "2",
    });
  });

  test("Ignore les UUID quand il construit CODE_INSEES", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      targetLocCode: "2",
    });
    const params = {
      departements: ["62"],
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
      targetLocCode: "2",
    };
    const feature = {
      get(key) {
        return {
          code_insee: "62165",
          code: "62165",
          adm_id: "02fd4b0f-54ee-5657-b494-9889486c5a21",
          commune_id: "02fd4b0f-54ee-5657-b494-9889486c5a21",
        }[key];
      },
    };

    expect(control._buildDetailRequestParams([feature], params)).toEqual({
      ...params,
      communes: ["62165"],
    });
  });

  test("Construit des paramètres détaillés ciblés pour les mailles cliquées", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      targetLocCode: "6",
    });
    const params = {
      departements: ["62"],
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
      targetLocCode: "6",
    };
    const features = [
      {
        get(key) {
          return { code: "E069N692" }[key];
        },
      },
      {
        get(key) {
          return { codeLocali: "10kmL93E070N693" }[key];
        },
      },
    ];

    expect(control._buildDetailRequestParams(features, params)).toEqual({
      ...params,
      departements: [],
      communes: [],
      mailles: ["E069N692", "E070N693"],
    });
  });

  test("Conserve la maille explicitement filtrée pour les détails", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      targetLocCode: "6",
    });
    const params = {
      departements: ["62"],
      communes: ["62165"],
      mailles: ["E069N692"],
      dateDeb: "2020-01-01",
      dateFin: "2025-12-10",
      targetLocCode: "6",
    };
    const features = [
      {
        get(key) {
          return { code: "E069N692" }[key];
        },
      },
      {
        get(key) {
          return { codeLocali: "10kmL93E070N693" }[key];
        },
      },
    ];

    expect(control._buildDetailRequestParams(features, params)).toEqual({
      ...params,
      departements: [],
      communes: [],
      mailles: ["E069N692"],
    });
  });

  test("Charge immédiatement les détails seulement si une commune est explicitement filtrée", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      targetLocCode: "2",
    });

    expect(
      control._shouldLoadEntityDataImmediately({
        departements: ["62"],
        communes: ["62225"],
        targetLocCode: "2",
      })
    ).toBe(true);

    expect(
      control._shouldLoadEntityDataImmediately({
        departements: ["62"],
        targetLocCode: "2",
      })
    ).toBe(false);

    expect(
      control._shouldLoadEntityDataImmediately({
        communes: ["62225", "59350"],
        targetLocCode: "2",
      })
    ).toBe(false);
  });

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
    expect(result.featureKey).toContain("codeLocali");
    expect(result.detailKey).toContain("cd_sig");
  });

  test("Les variantes de clés de maille reconnaissent le suffixe cd_sig", () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      targetLocCode: "6",
    });

    expect(
      control._expandEntityKeyVariants("10kmL93E069N692", { targetLocCode: "6" })
    ).toEqual(expect.arrayContaining(["10kmL93E069N692"]));
  });
});

describe("sinpRepository - GET/POST GeoServer", () => {
  test("construit un body POST x-www-form-urlencoded pour les fonctions PostgreSQL", () => {
    const request = sinpRepository.buildPostRequest({
      TYPENAME: "sinp_diffusion:fn_get_stats",
      VIEWPARAMS:
        "DATE_DEB:2006-05-28;DATE_FIN:2026-05-28;DEPT_IDS:62;CODE_INSEES:62225,62040;TARGET_LOC_CODE:2",
    });

    expect(request.url).toContain("/wfs");
    expect(request.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(request.body.toString()).toContain("SERVICE=WFS");
    expect(request.body.toString()).toContain("REQUEST=GetFeature");
    expect(request.body.toString()).toContain("TYPENAME=sinp_diffusion%3Afn_get_stats");
    expect(request.body.toString()).toContain(
      "VIEWPARAMS=DATE_DEB%3A2006-05-28%3BDATE_FIN%3A2026-05-28%3BDEPT_IDS%3A62%3BCODE_INSEES%3A62225%2C62040%3BTARGET_LOC_CODE%3A2"
    );
  });

  test("bascule automatiquement en POST pour les types fn_* avec VIEWPARAMS", async () => {
    const previousFetch = global.fetch;
    const previousGetProxy = mviewer.getProxy;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    });
    mviewer.getProxy = jest.fn(() => "");

    await sinpRepository.fetchGeoServerData({
      TYPENAME: "sinp_diffusion:fn_get_stats",
      VIEWPARAMS: "DATE_DEB:2006-05-28;DATE_FIN:2026-05-28;CODE_INSEES:62225,62040",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/wfs"),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: expect.any(URLSearchParams),
      })
    );

    global.fetch = previousFetch;
    mviewer.getProxy = previousGetProxy;
  });

  test("garde GET pour les couches legacy", async () => {
    const previousFetch = global.fetch;
    const previousGetProxy = mviewer.getProxy;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    });
    mviewer.getProxy = jest.fn(() => "");

    await sinpRepository.fetchGeoServerData({
      TYPENAME: "sinp_diffusion:v_synthese_commune",
      VIEWPARAMS: "DATE_DEB:2006-05-28;DATE_FIN:2026-05-28;CD_REF:2440,2442",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("TYPENAME=sinp_diffusion%3Av_synthese_commune"),
      expect.objectContaining({})
    );

    const [, requestOptions] = global.fetch.mock.calls[0];
    expect(requestOptions?.method).toBeUndefined();

    global.fetch = previousFetch;
    mviewer.getProxy = previousGetProxy;
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
    expect(options.VIEWPARAMS).toContain("CD_REF:2440,2442");
    expect(options.VIEWPARAMS).toContain("GRP_IDS:13,15");
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
        jddIds: ["123", "456"],
      },
      "fn_get_metadatas"
    );

    expect(options.TYPENAME).toBe("sinp_diffusion:fn_get_metadatas");
    expect(options.VIEWPARAMS).toBe("ID_JDDS:123,456");
  });
});

describe("VIEWPARAMS - Séparation correcte des séparants", () => {
  test("CD_REF utilise des virgules", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        taxons: [2440, 2442, 2444],
      },
      "fn_get_stats"
    );

    expect(options.VIEWPARAMS).toMatch(/CD_REF:2440,2442,2444/);
    expect(options.VIEWPARAMS).not.toMatch(/CD_REF:2440_2442/);
  });

  test("GRP_IDS utilise des virgules", () => {
    const options = sinpQueryBuilder.buildRequestOptions(
      {
        dateDeb: "2020-01-01",
        dateFin: "2026-03-10",
        groupes: [13, 15, 17],
      },
      "fn_get_stats"
    );

    // GRP_IDS doit avoir des virgules
    expect(options.VIEWPARAMS).toMatch(/GRP_IDS:13,15,17/);
    // Pas d'underscores
    expect(options.VIEWPARAMS).not.toMatch(/GRP_IDS:13_15/);
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

  test("ensureMetadataForFeatures charge les métadonnées à partir de jdd_ids", async () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      metadataTypeName: "fn_get_metadatas",
    });
    const feature = {
      properties: {
        jdd_ids: "11|22|11",
      },
      get(key) {
        return this.properties[key];
      },
      set(key, value) {
        this.properties[key] = value;
      },
    };

    const loadMetadataSpy = jest
      .spyOn(control, "_loadMetadataProperties")
      .mockResolvedValue([
        { idJdd: 11, libelJdd: "Jeu 11" },
        { idJdd: 22, libelJdd: "Jeu 22" },
        { idJdd: 99, libelJdd: "Jeu 99" },
      ]);

    await control.ensureMetadataForFeatures([feature]);

    expect(loadMetadataSpy).toHaveBeenCalledWith(
      { jddIds: ["11", "22"] },
      "fn_get_metadatas"
    );
    expect(feature.properties.jdd_details).toEqual([
      { idJdd: 11, libelJdd: "Jeu 11" },
      { idJdd: 22, libelJdd: "Jeu 22" },
    ]);
    expect(feature.properties.jdd_data_loaded).toBe(true);
    expect(feature.properties.jdd_data_loading).toBe(false);
    expect(feature.properties.jdd_data_error).toBeNull();
  });

  test("ensureMetadataForFeatures accepte aussi les jdd_ids séparés par underscore", async () => {
    const control = new SinpBaseCustom({
      layerId: "testControl",
      metadataTypeName: "fn_get_metadatas",
    });
    const feature = {
      properties: {
        jdd_ids: "11_22_11",
      },
      get(key) {
        return this.properties[key];
      },
      set(key, value) {
        this.properties[key] = value;
      },
    };

    const loadMetadataSpy = jest
      .spyOn(control, "_loadMetadataProperties")
      .mockResolvedValue([
        { idJdd: 11, libelJdd: "Jeu 11" },
        { idJdd: 22, libelJdd: "Jeu 22" },
      ]);

    await control.ensureMetadataForFeatures([feature]);

    expect(loadMetadataSpy).toHaveBeenCalledWith(
      { jddIds: ["11", "22"] },
      "fn_get_metadatas"
    );
    expect(feature.properties.jdd_details).toEqual([
      { idJdd: 11, libelJdd: "Jeu 11" },
      { idJdd: 22, libelJdd: "Jeu 22" },
    ]);
  });
});
