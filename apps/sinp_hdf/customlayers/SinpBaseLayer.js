/**
 * CLASSE ABSTRAITE: SinpBaseLayer
 * ================================
 * Classe de base réutilisable pour tous les layers SINP.
 *
 * Contrat:
 * - entrée: un objet de filtres déjà normalisé côté client
 * - sortie: une requête GeoServer WFS avec TYPENAME + VIEWPARAMS (+ CQL_FILTER si besoin legacy)
 * - rendu: mise à jour du layer OL + injection du HTML du template dans le panneau mviewer
 */
class SinpBaseLayer {

  constructor(layerId, typeName, config = {}) {
    this.layerId = layerId;
    this.typeName = typeName;
    this.maxZoom = config.maxZoom || 15;
    this.style = config.style || this._getDefaultStyle();
    this.format = new ol.format.GeoJSON();

    this.layer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: this.style,
    });
  }

  _getDefaultStyle() {
    return new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "rgba(45, 64, 89, 255)",
        width: 1.5,
      }),
      fill: new ol.style.Fill({
        color: "rgba(0, 0, 0, 0)",
      }),
    });
  }

  _resetPanels() {
    try {
      ["bottom-panel", "right-panel", "modal-panel"].forEach((panelId) => {
        const panel = $("#" + panelId);
        panel.removeClass("active");
        panel.find(".popup-content").empty();
      });
    } catch (e) {
      console.warn("Panel reset failed:", e);
    }
  }

  _hideLocationMarkers() {
    try {
      if (window.mviewer && typeof window.mviewer.hideLocation === "function") {
        mviewer.hideLocation();
      }
    } catch (e) {
      console.warn("hideLocation failed:", e);
    }
  }

  _renderHTML(features) {
    const layer = mviewer.getLayer(this.layerId);
    const htmlContent = layer?.template
      ? info.templateHTMLContent(features, layer)
      : info.formatHTMLContent(features, layer);

    return {
      html: Array.isArray(htmlContent) ? htmlContent.join("") : htmlContent || "",
      panelType: configuration.getConfiguration().mobile
        ? "modal-panel"
        : layer?.infospanel || "right-panel",
    };
  }

  _displayResults(features, viewData) {
    const source = this.layer.getSource();
    source.clear();
    source.addFeatures(features);

    if (features.length > 0) {
      const geometry = features[0].getGeometry();
      if (geometry) {
        mviewer.getMap().getView().fit(geometry, {
          duration: 500,
          maxZoom: this.maxZoom,
        });
      }

      this._showResultsPanel(viewData);
    }
  }

  _showResultsPanel(viewData) {
    try {
      const panelSelector = `#${viewData.panelType}`;
      const panel = $(panelSelector);
      if (!panel.length) {
        console.warn(`Panel ${panelSelector} introuvable`);
        return;
      }

      const panelContent = panel.find(".popup-content");
      if (panelContent.length) {
        panelContent.html(viewData.html);
      } else {
        panel.html(viewData.html);
      }

      if (!panel.hasClass("active")) {
        panel.addClass("active");
      }
    } catch (e) {
      console.warn("Unable to show results panel:", e);
    }
  }

  async _processFeatures(features, rawData) {
    // Hook de surcharge
  }

  beforeLoad() {
    this._hideLocationMarkers();
    this._resetPanels();
    this.clear();
  }

  renderFeatures(features) {
    const normalizedFeatures = Array.isArray(features) ? features : [];

    if (normalizedFeatures.length === 0) {
      this.clear();
      return;
    }

    const viewData = this._renderHTML(normalizedFeatures);
    this._displayResults(normalizedFeatures, viewData);
  }

  clear() {
    this.layer?.getSource()?.clear();
  }

  getLayer() {
    return this.layer;
  }

  destroy() {
    this.clear();
    this.layer = null;
  }
}

mviewer.customLayers.SinpBaseLayer = SinpBaseLayer;
