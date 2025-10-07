mviewer.customControls.sopc = (function () {
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
  };

  /// Mise à jour de l'interface de recherche (IHM)
  ///
  var updateIHM = function () {
    appendSelect("dep-select", _data.departements, "label", "value");
    document.getElementById("dep-select").addEventListener("change", onDptChange);
    document.getElementById("com-select").addEventListener("change", onComChange);
  };

  ///Gestion des changements de sélection
  // select : control select HTML
  // data : liste des données à insérer dans le select
  // text : champ de l'objet JSON à afficher dans le select
  // value : champ de l'objet JSON à utiliser comme valeur
  // numbers : si true, trie les options par ordre numérique (au lieu de alphabétique)
  ///
  var appendSelect = function (select, data, text, value, numbers) {
    let element = document.getElementById(select);
    let tempOptions = [];
    emptySelect(select);
    data.forEach(function (item) {
      let option = document.createElement("option");
      option.text = item.properties[value] + " - " + item.properties[text];
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

  ///Vider un select HTML
  ///
  var emptySelect = function (select) {
    let element = document.getElementById(select);
    let defaultoption = element.options[0];
    element.innerHTML = "";
    element.prepend(defaultoption);
    element.selectedIndex = "0";
  };

  var onDptChange = function (e) {
    let selectedDpt = e.target.value;
    let options = {
      TYPENAME: "sinp_hdf_dev:v_synthese_commune",
      PROPERTYNAME: "code_insee,libelle_commune",
      CQL_FILTER: "code_dpt='" + selectedDpt + "'",
    };
    let communes = _data.communes.filter(function (com) {
      return com.properties.code_insee.startsWith(selectedDpt);
    });
    appendSelect("com-select", communes, "libelle_commune", "code_insee");
  };

  var onComChange = function (e) {
    let insee = e.target.value;
    mviewer.customLayers.sopc.update_communes(insee);
  };

  return {
    /*
     * Public
     */

    init: function () {
      if (!_data) {
        fetch("apps/sinp_hdf/data/departements_hdf.json")
          .then(function (response) {
            return response.json();
          })
          .then(function (data) {
            setData(data);
            return fetch("apps/sinp_hdf/data/commune_simple.geojson");
          })
          .then(function (response) {
            return response.json();
          })
          .then(function (data) {
            setData(Object.assign(Object.assign({}, _data), { communes: data.features }));
          })
          .finally(function () {
            updateIHM();
          });
      } else {
        updateIHM();
      }
    },

    destroy: function () {
      //Any cleanup when changing control
      document.getElementById("dep-select").removeEventListener("change", onDptChange);
      document.getElementById("com-select").removeEventListener("change", onComChange);
    },
  };
})();
