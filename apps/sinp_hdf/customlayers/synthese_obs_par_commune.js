let geojson_layer = new ol.format.GeoJSON();

const layer =  new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'http://localhost:8080/geoserver/sinp_test_dev/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=sinp_test_dev%3Amat_synthese_obs_par_commune_full_tooltip&outputFormat=application%2Fjson',
        format: geojson_layer
    }),

});
new CustomLayer('mat_synthese_obs_par_commune_full_tooltip', layer);