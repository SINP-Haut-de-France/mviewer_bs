mviewer.customControls.v_commune_geometry_detaillee = (function () {
  var _data = false;

  var defaultParameters = {
    BASEURL: "http://localhost:8080/geoserver/sinp_hdf_dev/wfs",
    SERVICE: "WFS",
    VERSION: "2.0.0",
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

  var setData = function (data) {
    _data = data;
    console.log(data);
  };

  return {
    /*
     * Public
     */

    init: function () {
      if (!_data) {
        fetch("demo/cad/data/commune_simple.json").then(function (response) {
          response.json().then(function (data) {
            setData(data);
            updateIHM();
          });
        });
      } else {
        updateIHM();
      }
    },

    destroy: function () {
      if (previousParcelle) {
        previousParcelle.setStyle(mviewer.customLayers.cad.defaultStyle);
      }
    },
    editSelectedParcelle: function (value) {
      if (value) {
        previousParcelle = value;
        document.getElementById("parcelle-select").value = value.get("geo_parcelle");
      }
      return previousParcelle;
    },
  };
})();
