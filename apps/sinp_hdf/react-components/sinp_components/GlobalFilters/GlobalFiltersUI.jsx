import React from "react";
import CollapsibleFilterSection from "../../components/CollapsibleFilterSection/CollapsibleFilterSection";
import DateFilter from "../../components/DateFilter/DateFilter";
import MultiSelectSearchComponent from "../../components/MultiSelectSearch/MultiSelectSearchComponent";
import CheckBoxTreeView from "../../components/CheckBoxTreeView/CheckBoxTreeView";
import Datasource from "../../components/Datasource/Datasource";

const GlobalFiltersUI = ({
  filters,
  filterVisibility,
  activeProfile,
  handleDateChange,
  handleTaxChange,
  handleDptChange,
  handleComChange,
  handleGrpChange,
  onSubmit,
  onReset,
  showActions,
  actionLabels,
  isLoading = false,
  hasActiveFilters = true,
}) => {
  return (
    <div className="global-filters-container">
      {/*/!* Indicateur du profil actif *!/*/}
      {/*{activeProfile && (*/}
      {/*  <div className="filter-profile-indicator">*/}
      {/*    <small className="text-muted">*/}
      {/*      <i className="fas fa-layer-group"></i> {activeProfile.name}*/}
      {/*    </small>*/}
      {/*  </div>*/}
      {/*)}*/}
      {/* Section Groupes taxonomiques */}
      {filterVisibility.showTaxonomicGroup && (
        <CollapsibleFilterSection
          title="Classification des espèces"
          icon="fa-sitemap"
          defaultExpanded={false}
          badge={filters.filteredGroupes?.length || null}>
          <Datasource
            name="groupesDatasource"
            datatype="json"
            datasource="apps/sinp_hdf/data/taxonomie_tree.json">
            {({ data: groupes, loading, error }) => {
              if (loading) return <p className="loading-message">Chargement...</p>;
              if (error) return <p className="error-message">Erreur</p>;

              return (
                <CheckBoxTreeView
                  datasource={groupes || []}
                  selectedValues={filters.filteredGroupes || []}
                  idKey="id"
                  returnKey="id"
                  label={(node) => node.name}
                  childrenKey="children"
                  title=""
                  onSelectionChange={handleGrpChange}
                />
              );
            }}
          </Datasource>
        </CollapsibleFilterSection>
      )}
      {/* Section Taxonomie */}
      {filterVisibility.showTaxon && (
        <CollapsibleFilterSection
          title="Recherche d'espèce"
          icon="fa-leaf"
          defaultExpanded={true}>
          <Datasource
            name="taxonsDatasource"
            datatype="wfs"
            lazyloading={true}
            minCharacters={2}
            queryParams={{ maxFeatures: 10 }}
            searchUrlBuilder={(query, params) => {
              const baseURL = `${
                mviewer.env?.[mviewer.env?.CURRENT_ENV]?.GEOSERVER_BASE_URL
              }/wfs`;
              const typeName = "sinp_diffusion:vm_taxref_search";
              const encodedFilter = encodeURIComponent(`search_field ILIKE '%${query}%'`);
              return `${baseURL}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=${typeName}&CQL_FILTER=${encodedFilter}&outputFormat=json&${new URLSearchParams(
                params
              ).toString()}`;
            }}>
            {({ data: taxons, loading, error, setQuery }) => (
              <MultiSelectSearchComponent
                datasource={taxons || []}
                selectedValues={filters.filteredTaxons || []}
                returnValueKey="cd_ref"
                cacheKey="taxons_selected"
                title="Nom scientifique ou vernaculaire"
                label={(item) => (
                  <div className="taxon-label">
                    <div className="taxon-vernacular">{item.nom_vern || "N/A"}</div>
                    <div className="taxon-scientific">{item.nom_complet || "N/A"}</div>
                  </div>
                )}
                minCharacters={3}
                maxResults={15}
                multiselect={true}
                onChange={handleTaxChange}
                onSearch={setQuery}
                loading={loading}
                error={error}
              />
            )}
          </Datasource>
        </CollapsibleFilterSection>
      )}

      {/* Section Période */}
      {filterVisibility.showDate && (
        <CollapsibleFilterSection
          title="Période d'observation"
          icon="fa-calendar"
          defaultExpanded={true}>
          <DateFilter
            dateDeb={filters.dateDeb}
            dateFin={filters.dateFin}
            defaultNbYears={20}
            title="Dates"
            onChange={handleDateChange}
          />
        </CollapsibleFilterSection>
      )}

      {/* Section Géographique */}
      {(filterVisibility.showDepartment || filterVisibility.showCommune) && (
        <CollapsibleFilterSection
          title="Localisation géographique"
          icon="fa-map-marker-alt"
          defaultExpanded={true}
          badge={
            filters.filteredCommunes?.length ||
            filters.filteredDepartments?.length ||
            null
          }>
          <Datasource
            name="departmentsDatasource"
            datatype="json"
            datasource="apps/sinp_hdf/data/departements_hdf.json">
            {({ data: departments, loading, error }) => {
              if (loading) return <p className="loading-message">Chargement...</p>;
              if (error) return <p className="error-message">Erreur de chargement</p>;

              return (
                <>
                  {filterVisibility.showDepartment && (
                    <MultiSelectSearchComponent
                      datasource={departments || []}
                      selectedValues={filters.filteredDepartments || []}
                      returnValueKey="code_dpt"
                      title="Département"
                      label={(item) => `${item.code_dpt} - ${item.libelle}`}
                      minCharacters={1}
                      maxResults={10}
                      multiselect={false}
                      onChange={handleDptChange}
                    />
                  )}

                  {filterVisibility.showCommune && (
                    <Datasource
                      name="communesDatasource"
                      datatype="json"
                      datasource="apps/sinp_hdf/data/communes_hdf.json">
                      {({
                        data: communes,
                        loading: loadingCommunes,
                        error: errorCommunes,
                      }) => {
                        if (loadingCommunes)
                          return <p className="loading-message">Chargement...</p>;
                        if (errorCommunes) return <p className="error-message">Erreur</p>;

                        return (
                          <MultiSelectSearchComponent
                            datasource={communes || []}
                            selectedValues={filters.filteredCommunes || []}
                            parentDatasource={filters.filteredDepartments}
                            parentDatasourceKey="code_dpt"
                            searchKey="code_dpt"
                            returnValueKey="code_insee"
                            minCharacters={1}
                            maxResults={10}
                            maxSelections={5}
                            title="Commune (5 max.)"
                            label={(item) =>
                              `${item.code_insee} - ${item.libelle_commune}`
                            }
                            multiselect={true}
                            onChange={handleComChange}
                          />
                        );
                      }}
                    </Datasource>
                  )}
                </>
              );
            }}
          </Datasource>
        </CollapsibleFilterSection>
      )}

      {/* Actions */}
      {showActions && (
        <div className="filter-actions">
          <button className="btn btn-reset" onClick={onReset} disabled={isLoading}>
            <i className="fas fa-undo"></i> {actionLabels.reset}
          </button>
          <button
            className="btn btn-apply"
            onClick={onSubmit}
            disabled={isLoading || !hasActiveFilters}
            title={!hasActiveFilters ? "Veuillez sélectionner au moins un filtre" : ""}>
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Chargement...
              </>
            ) : (
              <>
                <i className="fas fa-check"></i> {actionLabels.submit}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default GlobalFiltersUI;
