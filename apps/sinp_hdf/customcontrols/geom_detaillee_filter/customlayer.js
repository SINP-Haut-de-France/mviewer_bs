let format_layer = new ol.format.WFS();
const layer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: "http://localhost:8080/geoserver/sinp_hdf_dev/wms?service=WMS&version=1.1.0&request=GetMap&layers=sinp_hdf_dev%3Av_commune_geometry_detaillee&bbox=583916.5%2C6859783.5%2C790288.4%2C7110497.0&width=632&height=768&srs=EPSG%3A2154&styles=&format=application/openlayers",
    format: format_layer,
  }),
  weight: function (feature) {
    var name = feature.get("name");
    var magnitude = parseFloat(name.substr(2));
    return magnitude - 5;
  },
});
new CustomLayer("v_commune_geometry_detaillee", layer);
