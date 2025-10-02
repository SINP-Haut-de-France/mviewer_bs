mviewer.customLayers.sopc = (function () {
  let format_layer = new ol.format.WFS();

  var defaultParameters = {
    BASEURL: "http://localhost:8080/geoserver/sinp_hdf_dev/wfs",
    SERVICE: "WFS",
    VERSION: "2.0.0",
    TYPENAME: "v_synthese_observation_par_commune",
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
      url: "http://localhost:8080/geoserver/sinp_hdf_dev/wms?service=WMS&version=1.1.0&request=GetMap&layers=sinp_hdf_dev%3Av_synthese_observation_par_commune&bbox=583916.5%2C6859783.5%2C790288.4%2C7110497.0&width=632&height=768&srs=EPSG%3A2154&styles=&format=application/openlayers",
      format: format_layer,
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
      viewparams: "p_codes_insee=" + insee,
    };
    fetch(querybuilder(options)).then((response) => {
      response
        .json()
        .then((data) => {})
        .then(() => {
          fetch(querybuilder(options)).then((response) => {
            response.json().then((data) => {
              let commune = new ol.format.GeoJSON().readFeature(data.features[0]);
              mviewer.getMap().getView().fit(commune.getGeometry(), { duration: 500 });
            });
          });
        });
    });
  };
  return {
    layer: _layer,
    handle: _handle,
    update_communes: update_communes,
  };
})();
