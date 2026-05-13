/**
 * LAYER GRILLE 10x10: GridSearch 10x10
 * ======================================
 * Recherche avancée par grille 10x10 avec détails d'observations
 * Hérite de SinpBaseLayer (classe abstraite)
 *
 * Configuration GeoServer:
 * - Fonction PostgreSQL: fn_get_stats
 * - Détails: fn_get_obs_detaillee
 */

mviewer.customLayers.grid10x10search = (function () {
  /**
   * Classe spécialisée pour recherche par grille 10x10
   */
  class GridSearch10x10Layer extends mviewer.customLayers.SinpBaseLayer {
    constructor() {
      super("grid10x10search", "fn_get_stats", {
        maxZoom: 10, // Zoom moins agressif pour grilles larges
        serverStyle: {
          enabled: true,
        },
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "rgba(0, 0, 0, 0.001)",
            width: 1,
          }),
          fill: new ol.style.Fill({
            color: "rgba(0, 0, 0, 0.001)",
          }),
        }),
      });
    }
  }

  const instance = new GridSearch10x10Layer();

  const api = {
    layer: instance.getLayer(),
    handle: false,
    get_datas: function (params) {
      return mviewer.customControls.grid10x10search.submit(params);
    },
    _instance: instance,
  };

  return api;
})();

// Alias temporaire pour compatibilite avec les references existantes/tests.
mviewer.customLayers.gridSearch10x10 = mviewer.customLayers.grid10x10search;
