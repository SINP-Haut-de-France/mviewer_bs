mviewer.customLayers.advancedSearch = (function () {
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
      if (key !== "BASEURL" && key !== "VIEWPARAMS") {
        url += `&${key}=${encodeURIComponent(finalParams[key])}`;
      }
    });

    if (finalParams.VIEWPARAMS) {
      // GeoServer EXIGE: uniquement le pipe (|) encodé en %7C
      // Les deux-points (:) et points-virgules (;) doivent rester non-encodés!
      const encodedViewParams = finalParams.VIEWPARAMS.replace(/\|/g, '%7C');
      url += `&VIEWPARAMS=${encodedViewParams}`;
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
    var _renderHTML = function (features) {
      var l = mviewer.getLayer("advancedSearch");
      var html;
      if (l.template) {
        html = info.templateHTMLContent(features, l);
      } else {
        html = info.formatHTMLContent(features, l);
      }
      var panel = "";
      if (configuration.getConfiguration().mobile) {
        panel = "modal-panel";
      } else {
        panel = l.infopanel;
      }
      var view = views[panel];
      view.layers.push({
        id: view.layers.length + 1,
        firstlayer: false,
        manyfeatures: features.length > 1,
        nbfeatures: features.length,
        name: l.name,
        layerid: "advancedSearch",
        theme_icon: l.icon,
        html: html,
      });
    };
    let cad_control = mviewer.customControls.advancedSearch;
    let src = _layer.getSource();
    src.getFeatures().every(function (feature) {
      return true;
    });
    if (features) {
      _renderHTML(features);
    }
  };

  var _get_datas = async function (params) {
    try {
      // Clear previous selection and reset panels
      console.log("🔍 Starting advanced search with params:", params);

      // Hide location markers from previous searches
      if (window.mviewer && typeof window.mviewer.hideLocation === "function") {
        try {
          mviewer.hideLocation();
        } catch (e) {
          console.warn("hideLocation failed", e);
        }
      }

      // Close both panels to reset previous content
      // This ensures old results don't remain visible while new search loads
      try {
        $("#bottom-panel").removeClass("active");
        $("#right-panel").removeClass("active");
        // Clear any previous content
        $("#bottom-panel .panel-content").empty();
        $("#right-panel .panel-content").empty();
      } catch (e) {
        console.warn("Panel reset failed:", e);
      }

      const options = sinpQueryBuilder.buildRequestOptions(params, "v_synthese_commune");
      console.log("🔧 advancedSearch - built options (v_synthese_commune):", options);
      try {
        console.log(
          "🔧 advancedSearch - final request URL (v_synthese_commune):",
          _buildQueryURL(options)
        );
      } catch (e) {
        console.warn("Unable to build final URL for debugging:", e);
      }

      const response = await sinpRepository.fetchGeoServerData(options);
      const data = await response;

      if (data.features && data.features.length > 0) {
        let commune = new ol.format.GeoJSON().readFeature(data.features[0]);
        const detailsOptions = sinpQueryBuilder.buildRequestOptions(
          params,
          "v_obs_detaillee"
        );
        console.log(
          "🔧 advancedSearch - built options (v_obs_detaillee):",
          detailsOptions
        );
        try {
          console.log(
            "🔧 advancedSearch - final request URL (v_obs_detaillee):",
            _buildQueryURL(detailsOptions)
          );
        } catch (e) {
          console.warn("Unable to build final URL for debugging (details):", e);
        }

        const detailsResponse = await sinpRepository.fetchGeoServerData(detailsOptions);
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

        // Re-open the appropriate panel based on which one was previously active
        // Determine which panel to show (favor bottom-panel, fallback to right-panel)
        let activePanel = "#bottom-panel";
        if (!$("#bottom-panel").length) {
          activePanel = "#right-panel";
        }

        try {
          $(activePanel).addClass("active");
          console.log(`✅ Search results shown in ${activePanel}`);
        } catch (e) {
          console.warn("Unable to show results panel", e);
        }
      } else {
        console.info("ℹ️ No data found with applied filters.");
        // Clear layer if no results
        let src = _layer.getSource();
        src.clear();
      }
    } catch (error) {
      console.error("❌ Error during advanced search:", error);
    }
  };
  return {
    layer: _layer,
    handle: _handle,
    get_datas: _get_datas,
  };
})();
