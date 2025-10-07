mviewer.customLayers.sopc = (function () {
  let format_layer = new ol.format.WFS();

  var defaultParameters = {
    BASEURL: "http://localhost:8080/geoserver/sinp_hdf_dev/wfs",
    SERVICE: "WFS",
    VERSION: "2.0.0",
    TYPENAME: "v_synthese_commune",
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

  var _handle = function (features) {
    let cad_control = mviewer.customControls.sopc;
    let src = _layer.getSource();
    src.getFeatures().every(function (feature) {
      console.log(feature);
      return true;
    });
  };
  var update_communes = function (insee) {
    let options = {
      TYPENAME: "sinp_diffusion:v_synthese_commune",
      CQL_FILTER: "code_insee='" + insee + "'",
    };
    fetch(querybuilder(options)).then((response) => {
      response.json().then((data) => {
        if (data.features && data.features.length > 0) {
          let commune = new ol.format.GeoJSON().readFeature(data.features[0]);
          let details_options = {
            TYPENAME: "sinp_diffusion:v_obs_detaillee",
            CQL_FILTER: "code_insee='" + insee + "'",
          };
          fetch(querybuilder(details_options)).then((response) => {
            response.json().then((data) => {
              if (data.features && data.features.length > 0) {
                commune.details = data.features;
              }
            });
          });
          let src = _layer.getSource();
          src.clear(); // Clear existing features
          src.addFeature(commune); // Add the new feature
          mviewer
            .getMap()
            .getView()
            .fit(commune.getGeometry(), { duration: 500, maxZoom: 15 });
        }
        $("#bottom-panel").show();
      });
    });
  };
  return {
    layer: _layer,
    handle: _handle,
    update_communes: update_communes,
  };
})();
