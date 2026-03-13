window.sinpQueryBuilder = (function () {
  /**
   * Échappe les valeurs pour CQL (protection contre l'injection)
   * @param {*} value - Valeur à échapper
   * @return {*} - Valeur échappée
   */
  const _escapeValue = function (value) {
    if (typeof value === "string") {
      return value.replaceAll("'", "''");
    }
    return value;
  };

  /**
   * Valide un nom de champ (liste blanche)
   * @param {string} field - Nom du champ à valider
   * @return {string} - Nom du champ validé
   * @throws {Error} Si le champ n'est pas autorisé
   */
  const _validateField = function (field) {
    const allowedFields = [
      "code_insee",
      "code_dpt",
      "last_date_obs",
      "group1_inpn",
      "group2_inpn",
      "group3_inpn",
      "classe",
      "ordre",
      "famille",
      "cd_ref",
      "regne",
      "cd_nom",
      "nom_complet",
      "nom_vernaculaire",
      "date_obs",
      "id_group",
    ];

    if (!allowedFields.includes(field)) {
      throw new Error(`Champ non autorisé: ${field}`);
    }
    return field;
  };

  /**
   * Constructeur de conditions CQL typées (Query Builder)
   * Permet de construire des requêtes CQL de manière sécurisée sans injection
   */
  const CqlBuilder = {
    /**
     * Condition d'égalité: field = 'value'
     * @param {string} field - Nom du champ
     * @param {string|number} value - Valeur à comparer
     * @return {Object} - Objet condition
     */
    equals: function (field, value) {
      if (value === null || value === undefined) {
        return null;
      }
      return {
        type: "EQUALS",
        field: _validateField(field),
        value: _escapeValue(value),
      };
    },

    /**
     * Condition de non-égalité: field != 'value'
     * @param {string} field - Nom du champ
     * @param {string|number} value - Valeur à comparer
     * @return {Object} - Objet condition
     */
    notEquals: function (field, value) {
      if (value === null || value === undefined) {
        return null;
      }
      return {
        type: "NOT_EQUALS",
        field: _validateField(field),
        value: _escapeValue(value),
      };
    },

    /**
     * Condition IN: field IN ('val1', 'val2', ...)
     * @param {string} field - Nom du champ
     * @param {Array} values - Tableau de valeurs
     * @return {Object} - Objet condition
     */
    in: function (field, values) {
      if (!Array.isArray(values) || values.length === 0) {
        return null;
      }
      return {
        type: "IN",
        field: _validateField(field),
        values: values.map((v) => _escapeValue(v)),
      };
    },

    /**
     * Condition NOT IN: field NOT IN ('val1', 'val2', ...)
     * @param {string} field - Nom du champ
     * @param {Array} values - Tableau de valeurs
     * @return {Object} - Objet condition
     */
    notIn: function (field, values) {
      if (!Array.isArray(values) || values.length === 0) {
        return null;
      }
      return {
        type: "NOT_IN",
        field: _validateField(field),
        values: values.map((v) => _escapeValue(v)),
      };
    },

    /**
     * Condition de comparaison: field >= value
     * @param {string} field - Nom du champ
     * @param {string|number} value - Valeur à comparer
     * @return {Object} - Objet condition
     */
    greaterThanOrEqual: function (field, value) {
      if (value === null || value === undefined) {
        return null;
      }
      return {
        type: "GTE",
        field: _validateField(field),
        value: _escapeValue(value),
      };
    },

    /**
     * Condition de comparaison: field <= value
     * @param {string} field - Nom du champ
     * @param {string|number} value - Valeur à comparer
     * @return {Object} - Objet condition
     */
    lessThanOrEqual: function (field, value) {
      if (value === null || value === undefined) {
        return null;
      }
      return {
        type: "LTE",
        field: _validateField(field),
        value: _escapeValue(value),
      };
    },

    /**
     * Condition de comparaison: field > value
     * @param {string} field - Nom du champ
     * @param {string|number} value - Valeur à comparer
     * @return {Object} - Objet condition
     */
    greaterThan: function (field, value) {
      if (value === null || value === undefined) {
        return null;
      }
      return {
        type: "GT",
        field: _validateField(field),
        value: _escapeValue(value),
      };
    },

    /**
     * Condition de comparaison: field < value
     * @param {string} field - Nom du champ
     * @param {string|number} value - Valeur à comparer
     * @return {Object} - Objet condition
     */
    lessThan: function (field, value) {
      if (value === null || value === undefined) {
        return null;
      }
      return {
        type: "LT",
        field: _validateField(field),
        value: _escapeValue(value),
      };
    },

    /**
     * Condition LIKE: field LIKE '%value%'
     * @param {string} field - Nom du champ
     * @param {string} value - Valeur à rechercher
     * @return {Object} - Objet condition
     */
    like: function (field, value) {
      if (value === null || value === undefined) {
        return null;
      }
      return {
        type: "LIKE",
        field: _validateField(field),
        value: _escapeValue(value),
      };
    },

    /**
     * Combinaison AND: (cond1 AND cond2 AND ...)
     * @param {...Object} conditions - Conditions à combiner
     * @return {Object} - Objet condition
     */
    and: function (...conditions) {
      return {
        type: "AND",
        conditions: conditions.filter((c) => c !== null && c !== undefined),
      };
    },

    /**
     * Combinaison OR: (cond1 OR cond2 OR ...)
     * @param {...Object} conditions - Conditions à combiner
     * @return {Object} - Objet condition
     */
    or: function (...conditions) {
      return {
        type: "OR",
        conditions: conditions.filter((c) => c !== null && c !== undefined),
      };
    },
  };

  /**
   * Compile un objet condition en string CQL
   * @param {Object} condition - Objet condition à compiler
   * @return {string} - Expression CQL
   */
  const _compileCqlCondition = function (condition) {
    if (!condition) return "";

    switch (condition.type) {
      case "EQUALS":
        return `${condition.field} = '${condition.value}'`;

      case "NOT_EQUALS":
        return `${condition.field} != '${condition.value}'`;

      case "IN":
        return `${condition.field} IN (${condition.values
          .map((v) => `'${v}'`)
          .join(",")})`;

      case "NOT_IN":
        return `${condition.field} NOT IN (${condition.values
          .map((v) => `'${v}'`)
          .join(",")})`;

      case "GTE":
        return `${condition.field} >= '${condition.value}'`;

      case "LTE":
        return `${condition.field} <= '${condition.value}'`;

      case "GT":
        return `${condition.field} > '${condition.value}'`;

      case "LT":
        return `${condition.field} < '${condition.value}'`;

      case "LIKE":
        return `${condition.field} LIKE '%${condition.value}%'`;

      case "AND":
        if (condition.conditions.length === 0) return "";
        if (condition.conditions.length === 1)
          return _compileCqlCondition(condition.conditions[0]);
        return (
          "(" +
          condition.conditions.map((c) => _compileCqlCondition(c)).join(" AND ") +
          ")"
        );

      case "OR":
        if (condition.conditions.length === 0) return "";
        if (condition.conditions.length === 1)
          return _compileCqlCondition(condition.conditions[0]);
        return (
          "(" +
          condition.conditions.map((c) => _compileCqlCondition(c)).join(" OR ") +
          ")"
        );

      default:
        throw new Error(`Type de condition inconnu: ${condition.type}`);
    }
  };

  // UUIDs des groupes de niveau 1 (par défaut si aucun groupe sélectionné)
  const DEFAULT_LEVEL1_UUIDS = [
    "7f65fd5a-5b38-5374-adab-2906ee808ad6", // FAUNE
    "a94c1615-276d-5307-8fa2-d4e7bd4bdc05", // FLORE
    "40a1febf-5e53-5942-a2a9-317b11c15356", // FONGE
    "1ee0a3f1-0732-5b34-bf23-7820e30c8a77", // AUTRES
  ];

  const _serializeViewParam = function (paramKey, value) {
    const pipeSeparatedParams = ["GRP_IDS", "DEPT_IDS", "CODE_INSEES"];

    if (paramKey === "GRP_IDS") {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return null;
      }
      return Array.isArray(value) ? value.join("|") : String(value);
    }

    if (paramKey === "CD_REF") {
      if (value === undefined || value === null) {
        return "";
      }
      return Array.isArray(value) ? value.join(",") : String(value);
    }

    if (pipeSeparatedParams.includes(paramKey)) {
      if (value === undefined || value === null) {
        return "";
      }
      return Array.isArray(value) ? value.join("|") : String(value);
    }

    if (value === undefined || value === null) {
      return "";
    }

    return Array.isArray(value) ? value.join(",") : String(value);
  };

  const _viewConfig = {
    // ========================================================================
    // Anciennes vues SQL (compatibilité, déprécié)
    // ========================================================================
    v_synthese_commune: {
      cql_filters: {
        communes: {
          param: "communes",
          apply: (p) => CqlBuilder.in("code_insee", p),
          condition: (params) => !!params.communes?.length,
        },
        departements: {
          param: "departements",
          apply: (p) => CqlBuilder.in("code_dpt", p),
          condition: (params) => !!params.departements?.length,
        },
      },
      view_params: {
        DATE_DEB: "dateDeb",
        DATE_FIN: "dateFin",
        CD_REF: "taxons",
        GRP_IDS: "groupes",
      },
    },

    v_obs_detaillee: {
      cql_filters: {
        communes: {
          param: "communes",
          apply: (p) => CqlBuilder.in("code_insee", p),
          condition: (params) => !!params.communes?.length,
        },
        departements: {
          param: "departements",
          condition: (params) => !!params.departements?.length,
          apply: (p) => CqlBuilder.in("code_dpt", p),
        },
      },
      view_params: {
        DATE_DEB: "dateDeb",
        DATE_FIN: "dateFin",
        CD_REF: "taxons",
        GRP_IDS: "groupes",
      },
    },

    vm_synthese_observations_maille_5x5_hdf: {
      cql_filters: {
        taxons: {
          param: "taxons",
          apply: (p) => CqlBuilder.in("cd_ref", p),
          condition: (params) => !!params.taxons?.length,
        },
      },
    },

    // ========================================================================
    // NOUVELLES FONCTIONS POSTGRESQL (VIEWPARAMS uniquement)
    // ========================================================================

    /**
     * Fonction 1: Statistiques communes
     * Utilise UNIQUEMENT VIEWPARAMS (pas de CQL_FILTER pour filtres métier)
     * Les filtres communes/depts sont ignorés (c'est une agrégation globale)
     */
    fn_get_stats_communes: {
      cql_filters: {},
      view_params: {
        DATE_DEB: "dateDeb",
        DATE_FIN: "dateFin",
        DEPT_IDS: "departements",
        CODE_INSEES: "communes",
        CD_REF: "taxons",
        GRP_IDS: "groupes",
      },
    },

    /**
     * Fonction 2: Détails par entité (commune + taxon)
     * Même signature que fn_get_stats_communes
     */
    fn_get_obs_detaillee_by_entities: {
      cql_filters: {},
      view_params: {
        DATE_DEB: "dateDeb",
        DATE_FIN: "dateFin",
        DEPT_IDS: "departements",
        CODE_INSEES: "communes",
        CD_REF: "taxons",
        GRP_IDS: "groupes",
      },
    },

    /**
     * Fonction 3: Statistiques grille 5x5
     * Agrégation au niveau maille 5x5 (future)
     */
    fn_get_stats_grille_5x5: {
      cql_filters: {},
      view_params: {
        DATE_DEB: "dateDeb",
        DATE_FIN: "dateFin",
        DEPT_IDS: "departements",
        CODE_INSEES: "communes",
        CD_REF: "taxons",
        GRP_IDS: "groupes",
      },
    },

    /**
     * Fonction 4: Statistiques grille 10x10
     * Agrégation au niveau maille 10x10 (future)
     */
    fn_get_stats_grille_10x10: {
      cql_filters: {},
      view_params: {
        DATE_DEB: "dateDeb",
        DATE_FIN: "dateFin",
        DEPT_IDS: "departements",
        CODE_INSEES: "communes",
        CD_REF: "taxons",
        GRP_IDS: "groupes",
      },
    },

    /**
     * Fonction 5: Détails pour grilles (5x5 et 10x10)
     * Agrégation au niveau maille + taxon
     */
    fn_get_obs_detaillee_grille: {
      cql_filters: {},
      view_params: {
        DATE_DEB: "dateDeb",
        DATE_FIN: "dateFin",
        DEPT_IDS: "departements",
        CODE_INSEES: "communes",
        CD_REF: "taxons",
        GRP_IDS: "groupes",
      },
    },
  };

  /**
   * Construit les options de requête GeoServer à partir des paramètres.
   * @param {Object} params - Paramètres de filtrage
   * @param {string} view - Nom de la vue ou fonction GeoServer
   * @return {Object} - Objet options avec TYPENAME, VIEWPARAMS et éventuellement CQL_FILTER
   */
  const _buildRequestOptions = function (params = {}, view) {
    if (!view) throw new Error(`Unknown view and schema : ${view}`);

    const conditions = [];
    const typename = `sinp_diffusion:${view}`;
    const cfg = _viewConfig[view];

    if (!cfg) throw new Error(`Unknown view: ${typename}`);

    for (const [, rule] of Object.entries(cfg.cql_filters || {})) {
      if (Array.isArray(rule.params)) {
        const values = rule.params.map((p) => params[p]);
        if (rule.condition && !rule.condition(params)) continue;
        if (values.every((v) => v === undefined || v === null)) continue;
        const cond = rule.apply(...values);
        if (cond) conditions.push(cond);
        continue;
      }

      const value = params[rule.param];
      if (value === undefined || value === null) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (rule.condition && !rule.condition(params)) continue;

      const cond = rule.apply(value);
      if (cond) conditions.push(cond);
    }

    const result = {
      TYPENAME: typename,
    };

    const cqlString = conditions
      .map((c) => _compileCqlCondition(c))
      .filter(Boolean)
      .join(" AND ");

    if (cqlString) {
      result.CQL_FILTER = cqlString;
    }

    if (cfg.view_params && Object.keys(cfg.view_params).length !== 0) {
      const viewParamsArray = Object.entries(cfg.view_params)
        .map(([paramKey, paramValue]) => {
          const serializedValue = _serializeViewParam(paramKey, params[paramValue]);
          if (serializedValue === null) {
            return null;
          }
          return `${paramKey}:${serializedValue}`;
        })
        .filter(Boolean);

      if (viewParamsArray.length > 0) {
        result.VIEWPARAMS = viewParamsArray.join(";");
      }
    }

    return result;
  };

  return {
    buildRequestOptions: _buildRequestOptions,
  };
})();
