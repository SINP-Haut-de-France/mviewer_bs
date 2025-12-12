mviewer.customLayers.communeSearch = (function () {
  let format_layer = new ol.format.WFS();
  const defaultParameters = {
    BASEURL: `${mviewer.env?.[mviewer.env?.CURRENT_ENV]?.GEOSERVER_BASE_URL}/wfs`,
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    outputFormat: "application/json",
    srsName: "EPSG:2154",
  };

    /**
   * Construit une URL GeoServer à partir des paramètres donnés
   * @param {Object} options - Paramètres optionnels pour la requête WFS
   * @return {string} - URL GeoServer encodée
   */
  const _buildQueryURL = function (options = {}) {
    const finalParams = { ...defaultParameters, ...options };
    let url = finalParams.BASEURL + "?";

    Object.keys(finalParams).forEach((key) => {
      if (key !== "BASEURL" && key !== "VIEW_PARAMS") {
        url += `&${key}=${encodeURIComponent(finalParams[key])}`;
      }
    });

    if (finalParams.VIEW_PARAMS) {
      const viewParams = Object.entries(finalParams.VIEW_PARAMS)
        .map(([paramKey, paramValue]) => `${paramKey}:${paramValue}`)
        .join(";");
      url += `&VIEWPARAMS=${encodeURIComponent(viewParams)}`;
    }

    return url;
  };

  var _layer = new ol.layer.Vector({
    source: new ol.source.Vector({
      url: _buildQueryURL({ TYPENAME: "v_synthese_commune" }),
      format: format_layer,
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: "rgba(45, 64,89,255)",
          width: 1.5,
        }),
        fill: new ol.style.Fill({
          color: "rgba(0, 0, 0, 0)",
        }),
      }),
    }),
  });
  
  var _handle = function (features, views) {
    console.log("communeSearch handle called");
  };


  var _get_datas = async function (params) {
    try {
      const response = await sinpRepository.fetchGeoServerData(
        options = sinpQueryBuilder.buildRequestOptions(params,"v_synthese_commune")
      );
      const data = await response;

      if (data.features && data.features.length > 0) {
        let commune = new ol.format.GeoJSON().readFeature(data.features[0]);
        const detailsResponse = await sinpRepository.fetchGeoServerData(
          options = sinpQueryBuilder.buildRequestOptions(params,"v_obs_detaillee")
        );
        const detailsData = await detailsResponse;
        if (detailsData.features && detailsData.features.length > 0) {
          // Extract only the properties of each feature
          const propertiesList = detailsData.features.map(
            (feature) => feature.properties
          );
          commune.set("details", propertiesList);
        }

        // Update the layer with the new feature
        let src = _layer.getSource();
        src.clear(); // Clear existing features
        src.addFeature(commune); // Add the new feature

        // Zoom to the commune geometry
        mviewer
          .getMap()
          .getView()
          .fit(commune.getGeometry(), { duration: 500, maxZoom: 15 });

        // Activate the bottom-panel
        $("right-panel").addClass("active");
      } else {
        console.info("Aucune donnée trouvée avec les filtres appliqués.");
        // Vider la couche si aucun résultat
        let src = _layer.getSource();
        src.clear();
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
    }
  };
  return {
    layer: _layer,
    handle: _handle,
    get_datas: _get_datas,
  };
})();
