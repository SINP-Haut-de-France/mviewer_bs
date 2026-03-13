/**
 * LAYER GRILLE 10x10: GridSearch 10x10
 * ======================================
 * Recherche avancée par grille 10x10 avec détails d'observations
 * Hérite de SinpBaseLayer (classe abstraite)
 *
 * Configuration GeoServer:
 * - Fonction PostgreSQL: fn_get_stats_grille_10x10 (à créer en BDD)
 * - Détails: fn_get_obs_detaillee_grille (à créer en BDD)
 */

mviewer.customLayers.grid10x10search = (function () {
  /**
   * Classe spécialisée pour recherche par grille 10x10
   */
  class GridSearch10x10Layer extends mviewer.customLayers.SinpBaseLayer {
    constructor() {
      super("grid10x10search", "fn_get_stats_grille_10x10", {
        maxZoom: 10, // Zoom moins agressif pour grilles larges
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "rgba(52, 152, 219, 255)", // Bleu pour différencier
            width: 2,
          }),
          fill: new ol.style.Fill({
            color: "rgba(52, 152, 219, 0.1)",
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
