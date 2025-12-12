import React from "react";
import Datasource from "../../components/Datasource/Datasource";
import MultiSelectSearchComponent from "../../components/MultiSelectSearch/MultiSelectSearchComponent";

/**
 * UI du composant de recherche d'espèce
 * Présentation pure sans logique métier
 */
const EspeceSearchFilterUI = ({
  selectedValues,
  buildSearchUrl,
  onEspeceChange,
  onSubmit,
  onReset,
  canSubmit,
  multiselect,
  title,
  minCharacters,
  maxResults,
}) => {
  return (
    <div className="espece-search-filter-container">
      {/* Champ de recherche */}
      <div className="espece-search-input">
        <Datasource
          name="especeSearchDatasource"
          datatype="wfs"
          lazyloading={true}
          minCharacters={minCharacters}
          queryParams={{ maxFeatures: maxResults }}
          searchUrlBuilder={buildSearchUrl}>
          {({ data: taxons, loading, error, setQuery }) => (
            <MultiSelectSearchComponent
              datasource={taxons || []}
              selectedValues={selectedValues}
              returnValueKey="cd_ref"
              title={title}
              label={(item) => `${item.nom_vern || "N/A"} - ${item.nom_complet}`}
              minCharacters={minCharacters}
              maxResults={maxResults}
              multiselect={multiselect}
              onChange={onEspeceChange}
              onSearch={setQuery}
              loading={loading}
              error={error}
            />
          )}
        </Datasource>
      </div>

      {/* Actions */}
      <div className="espece-search-actions">
        <button className="btn btn-reset" onClick={onReset} type="button">
          <i className="fas fa-undo"></i> Réinitialiser
        </button>
        <button
          className="btn btn-submit"
          onClick={onSubmit}
          disabled={!canSubmit}
          type="button">
          <i className="fas fa-search"></i> Rechercher
        </button>
      </div>
    </div>
  );
};

export default EspeceSearchFilterUI;
