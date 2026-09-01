import React from "react";
import ReactDOM from "react-dom/client";
import ExternalLayerObservationResultsComponent from "./ExternalLayerObservationResultsComponent";
import SearchResultsComponent from "./SearchResultsComponent";

const ELEMENT_NAMES = [
  "mv-feature-search-results",
  "mv-commune-search-results",
  "mv-grid-search-results",
  "mv-external-layer-observation-results",
];

const renderElement = (element) => {
  const featureUid = element.getAttribute("data-feature-uid") || "";
  const isExternalLayerResults =
    element.tagName.toLowerCase() === "mv-external-layer-observation-results";

  if (!element.__reactRoot) {
    element.__reactRoot = ReactDOM.createRoot(element);
  }

  if (isExternalLayerResults) {
    element.__reactRoot.render(
      <ExternalLayerObservationResultsComponent featureUid={featureUid} />
    );
    return;
  }

  const layerId = element.getAttribute("data-layer-id") || "communeSearch";
  const promptOnly = element.getAttribute("data-selection-prompt") === "true";
  const metadataInMaintenance =
    element.getAttribute("data-metadata-in-maintenance") === "true";

  element.__reactRoot.render(
    <SearchResultsComponent
      layerId={layerId}
      featureUid={featureUid}
      promptOnly={promptOnly}
      metadataInMaintenance={metadataInMaintenance}
    />
  );
};

const defineElement = () => {
  if (typeof window === "undefined") {
    return;
  }

  ELEMENT_NAMES.forEach((elementName) => {
    if (!window.customElements.get(elementName)) {
      class SearchResultsElement extends HTMLElement {
        static get observedAttributes() {
          return [
            "data-layer-id",
            "data-feature-uid",
            "data-selection-prompt",
            "data-metadata-in-maintenance",
          ];
        }

        connectedCallback() {
          renderElement(this);
        }

        attributeChangedCallback() {
          if (this.isConnected) {
            renderElement(this);
          }
        }

        disconnectedCallback() {
          if (this.__reactRoot) {
            this.__reactRoot.unmount();
            this.__reactRoot = null;
          }
        }
      }

      window.customElements.define(elementName, SearchResultsElement);
    }
  });
};

defineElement();
