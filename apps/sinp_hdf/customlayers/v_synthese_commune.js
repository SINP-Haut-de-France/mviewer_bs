let geojson_layer = new ol.format.GeoJSON();
const layer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: "http://localhost:8080/geoserver/sinp_hdf_dev/wms?service=WFS&version=1.0.0&request=GetFeature&typeName=sinp_test_dev%3Av_synthese_commune&outputFormat=application%2Fjson",
    format: geojson_layer,
  }),
});
/*TODO Filtrage dynamique*/
new CustomLayer("v_synthese_commune", layer);
