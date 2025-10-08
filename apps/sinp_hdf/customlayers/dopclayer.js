mviewer.customLayers.dopc = (function () {
  let format_layer = new ol.format.WFS();

  var defaultParameters = {
    BASEURL: "http://localhost:8080/geoserver/sinp_hdf_dev/wfs",
    SERVICE: "WFS",
    VERSION: "2.0.0",
    TYPENAME: "v_obs_detaillee",
    REQUEST: "GetFeature",
    outputFormat: "application/json",
    srsName: "EPSG:2154",
  };

  var querybuilder = function (options) {
    options = Object.assign(Object.assign({}, defaultParameters), options);

    let url = "";
    Object.keys(options).forEach(function (key) {
      if (key === "BASEURL") url = options[key] + "?" + url;
      else url += "&" + key + "=" + options[key];
    });
    return encodeURI(url);
  };

  var _layer = new ol.layer.Vector({
    source: new ol.source.Vector({
      url: querybuilder(defaultParameters),
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
    let cad_control = mviewer.customControls.sopc;
    let src = _layer.getSource();
    src.getFeatures().every(function (feature) {
      return true;
    });
  };

  var update_communes = function (commune) {
    let src = _layer.getSource();
    src.clear(); // Clear existing features
    let details_options = {
      TYPENAME: "sinp_diffusion:v_obs_detaillee",
      CQL_FILTER: "code_insee='" + commune.getProperties().code_insee + "'",
    };
    fetch(querybuilder(details_options)).then((response) => {
      response.json().then((data) => {
        if (data.features && data.features.length > 0) {
          commune = Object.assign(commune, { details: data.features });
          // Mise à jour du bottom-panel
          let details = commune.details || [];
          mviewer.customLayers.sopc.config.template,
            {
              features: details,
            };
        }
      });
    });
  };

  return {
    layer: _layer,
    handle: _handle,
    update_communes: update_communes,
  };
})();
