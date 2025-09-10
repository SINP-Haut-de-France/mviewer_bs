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

  var updateIHM = function () {
    appendSelect("com-select", _data.features, "libelle_commune", "code_insee");
    console.log("com-select updated");
    let comSelectElement = document.getElementById("com-select");
    if (comSelectElement) {
      comSelectElement.addEventListener("change", onComChange);
    } else {
      console.error("Element with ID 'com-select' not found in the DOM.");
    }
  };

  var appendSelect = function (select, data, text, value, numbers) {
    let element = document.getElementById(select);
    let tempOptions = [];
    emptySelect(select);
    data.forEach(function (item) {
      let option = document.createElement("option");
      option.text = item.properties[text];
      option.value = item.properties[value];
      tempOptions.push(option);
    });
    if (!numbers) {
      tempOptions.sort(function (a, b) {
        return a.innerHTML.localeCompare(b.innerHTML);
      });
    } else {
      tempOptions.sort(function (a, b) {
        return parseInt(a.innerHTML) - parseInt(b.innerHTML);
      });
    }
    tempOptions.forEach(function (option) {
      element.add(option);
    });
  };

  var emptySelect = function (select) {
    let element = document.getElementById(select);
    let defaultoption = element.options[0];
    element.innerHTML = "";
    element.prepend(defaultoption);
    element.selectedIndex = "0";
  };
  var setLayerSource = function (data) {
    let cad_layer = mviewer.getLayer("v_commune_geometry_detaillee");
    let src = cad_layer.layer.getSource();
    src.clear();
    src.addFeatures(new ol.format.GeoJSON().readFeatures(data));
    let res = mviewer.getMap().getView().getResolutionForExtent(src.getExtent());
    let zoom = mviewer.getMap().getView().getZoomForResolution(res);
    mviewer
      .getMap()
      .getView()
      .fit(src.getExtent(), { maxZoom: zoom - 1 });
  };

  var onComChange = function (e) {
    let insee = e.target.value;
    let options = {
      TYPENAME: "CP.CadastralZoning",
      CQL_FILTER: "code_insee='" + insee + "'",
    };
    mviewer.customLayers.mviewer.v_commune_geometry_detaillee.update_commune(insee);
    document.getElementById("loading-cad").style.display = "block";
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
    /*
     * Public
     */

    init: function () {
      if (!_data) {
        fetch("apps/sinp_hdf/data/commune_simple.geojson").then(function (response) {
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
