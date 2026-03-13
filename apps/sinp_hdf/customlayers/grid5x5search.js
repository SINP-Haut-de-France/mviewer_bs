/**
 * LAYER GRILLE 5x5: GridSearch 5x5
 * ==================================
 * Recherche avancée par grille 5x5 avec détails d'observations
 * Hérite de SinpBaseLayer (classe abstraite)
 *
 * Configuration GeoServer:
 * - Fonction PostgreSQL: fn_get_stats_grille_5x5 (à créer en BDD)
 * - Détails: fn_get_obs_detaillee_grille (à créer en BDD)
 */

mviewer.customLayers.gridSearch5x5 = (function () {
  /**
   * Classe spécialisée pour recherche par grille 5x5
   */
  class GridSearch5x5Layer extends mviewer.customLayers.SinpBaseLayer {
    constructor() {
      super(
        "gridSearch5x5",
        "fn_get_stats_grille_5x5", // Fonction PostgreSQL (grille 5x5)
        {
          maxZoom: 12, // Zoom moins agressif pour les grilles
          style: new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: "rgba(220, 130, 75, 255)", // Orange pour différencier
              width: 2,
            }),
            fill: new ol.style.Fill({
              color: "rgba(220, 130, 75, 0.1)",
            }),
          }),
        }
      );
    }
  }

  const instance = new GridSearch5x5Layer();

  return {
    layer: instance.getLayer(),
    handle: false,
    get_datas: function (params) {
      return mviewer.customControls.gridSearch5x5.submit(params);
    },
    _instance: instance,
  };
})();
