/**
 * Expressions régulières et fonctions de validation pour les VIEWPARAMS
 * Format attendu par GeoServer: DATE_DEB:YYYY-MM-DD;DATE_FIN:YYYY-MM-DD;CD_REF:id1,id2,id3;GRP_IDS:id1|id2|id3
 */

const VIEWPARAMS_VALIDATION = {
  /**
   * Format complet des VIEWPARAMS
   * @regex ^(DATE_DEB:\d{4}-\d{2}-\d{2};)?((DATE_FIN:\d{4}-\d{2}-\d{2};)?)?((CD_REF:(\d+,?)*);?)?((GRP_IDS:(\d+\|?)*))?$
   */
  FULL_VIEWPARAMS: /^(DATE_DEB:\d{4}-\d{2}-\d{2};)?(DATE_FIN:\d{4}-\d{2}-\d{2};)?(CD_REF:(\d+,?)*;)?(GRP_IDS:(\d+\|?)*)$/,

  /**
   * Validation DATE_DEB et DATE_FIN
   * Format: DATE_DEB:YYYY-MM-DD
   * Exemple: DATE_DEB:1900-03-09
   * @regex ^\d{4}-\d{2}-\d{2}$
   */
  DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,

  /**
   * Validation CD_REF - IDs entiers séparés par des virgules
   * Format: CD_REF:id1,id2,id3 ou CD_REF: (vide)
   * Exemple: CD_REF:2440,2442,2444
   * @regex ^CD_REF:(\d+,)*\d*$
   */
  CD_REF: /^CD_REF:(\d+,)*\d*$/,

  /**
   * Validation CD_REF (valeurs uniquement)
   * Format: id1,id2,id3 ou vide
   * Exemple: 2440,2442,2444
   * @regex ^(\d+,)*\d*$
   */
  CD_REF_VALUES: /^(\d+,)*\d*$/,

  /**
   * Validation GRP_IDS - IDs entiers séparés par des pipes
   * Format: GRP_IDS:id1|id2|id3 ou GRP_IDS: (vide - ne doit pas apparaître)
   * Exemple: GRP_IDS:13|15
   * @regex ^GRP_IDS:(\d+\|)*\d*$
   */
  GRP_IDS: /^GRP_IDS:(\d+\|)*\d*$/,

  /**
   * Validation GRP_IDS (valeurs uniquement)
   * Format: id1|id2|id3 ou vide
   * Exemple: 13|15
   * @regex ^(\d+\|)*\d*$
   */
  GRP_IDS_VALUES: /^(\d+\|)*\d*$/,

  /**
   * Validation séquence de paramètres
   * Format: PARAM:value;PARAM:value;PARAM:value
   * @regex ^[A-Z_]+:\S+;$
   */
  PARAM_PAIR: /^[A-Z_]+:\S+;?$/,
};

/**
 * Fonction utilitaire pour valider les VIEWPARAMS complets
 * @param {string} viewparams - Les VIEWPARAMS à valider
 * @return {Object} - { isValid: boolean, errors: string[] }
 */
function validateVIEWPARAMS(viewparams) {
  const errors = [];

  if (!viewparams || typeof viewparams !== "string") {
    errors.push("VIEWPARAMS doit être une chaîne non vide");
    return { isValid: false, errors };
  }

  // Vérifier le format global
  if (!VIEWPARAMS_VALIDATION.FULL_VIEWPARAMS.test(viewparams)) {
    errors.push(
      `Format global invalide. Attendu: DATE_DEB:YYYY-MM-DD;DATE_FIN:YYYY-MM-DD;CD_REF:id1,id2;GRP_IDS:id1|id2`
    );
  }

  // Vérifier DATE_DEB et DATE_FIN
  const dateParts = viewparams.match(/DATE_(DEB|FIN):(\d{4}-\d{2}-\d{2})/g);
  if (dateParts) {
    dateParts.forEach((part) => {
      const [key, value] = part.split(":");
      if (!VIEWPARAMS_VALIDATION.DATE_FORMAT.test(value)) {
        errors.push(`${key} a un format de date invalide: ${value}`);
      }
      // Vérifier que la date est valide (not too far in future, etc.)
      const dateObj = new Date(value);
      if (isNaN(dateObj.getTime())) {
        errors.push(`${key} n'est pas une date valide: ${value}`);
      }
    });
  }

  // Vérifier CD_REF
  const cdRefMatch = viewparams.match(/CD_REF:([^;]*)/);
  if (cdRefMatch) {
    const cdRefValues = cdRefMatch[1];
    if (cdRefValues && !VIEWPARAMS_VALIDATION.CD_REF_VALUES.test(cdRefValues)) {
      errors.push(`CD_REF contient des valeurs invalides: ${cdRefValues}`);
    }
    if (cdRefValues && cdRefValues.endsWith(",")) {
      errors.push(`CD_REF ne doit pas se terminer par une virgule: ${cdRefValues}`);
    }
  }

  // Vérifier GRP_IDS
  const grpIdsMatch = viewparams.match(/GRP_IDS:([^;]*)/);
  if (grpIdsMatch) {
    const grpIdsValues = grpIdsMatch[1];
    if (grpIdsValues && !VIEWPARAMS_VALIDATION.GRP_IDS_VALUES.test(grpIdsValues)) {
      errors.push(`GRP_IDS contient des valeurs invalides: ${grpIdsValues}`);
    }
    if (grpIdsValues && grpIdsValues.endsWith("|")) {
      errors.push(`GRP_IDS ne doit pas se terminer par un pipe: ${grpIdsValues}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Fonction pour construire les VIEWPARAMS au format attendu
 * @param {Object} params - { dateDeb, dateFin, cd_ref: [], grp_ids: [] }
 * @return {string} - VIEWPARAMS formatés
 */
function buildVIEWPARAMS(params) {
  const parts = [];

  if (params.dateDeb) {
    parts.push(`DATE_DEB:${params.dateDeb}`);
  }
  if (params.dateFin) {
    parts.push(`DATE_FIN:${params.dateFin}`);
  }
  if (params.cd_ref && params.cd_ref.length > 0) {
    parts.push(`CD_REF:${params.cd_ref.join(",")}`);
  }
  if (params.grp_ids && params.grp_ids.length > 0) {
    parts.push(`GRP_IDS:${params.grp_ids.join("|")}`);
  }

  return parts.join(";");
}

// ==================== TESTS DE VALIDATION ====================

describe("VIEWPARAMS Validation", () => {
  test("Format valide complet", () => {
    const viewparams = "DATE_DEB:1900-03-09;DATE_FIN:2026-03-09;CD_REF:2440,2442;GRP_IDS:13|15";
    const result = validateVIEWPARAMS(viewparams);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Format valide avec dates seulement", () => {
    const viewparams = "DATE_DEB:1900-03-09;DATE_FIN:2026-03-09";
    const result = validateVIEWPARAMS(viewparams);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Format valide avec CD_REF et GRP_IDS", () => {
    const viewparams = "CD_REF:2440,2442;GRP_IDS:13|15";
    const result = validateVIEWPARAMS(viewparams);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Détecte DATE invalide", () => {
    const viewparams = "DATE_DEB:2026-13-45;DATE_FIN:2026-03-09";
    const result = validateVIEWPARAMS(viewparams);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("Détecte CD_REF avec virgule finale", () => {
    const viewparams = "CD_REF:2440,2442,";
    const result = validateVIEWPARAMS(viewparams);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("virgule"))).toBe(true);
  });

  test("Détecte GRP_IDS avec pipe final", () => {
    const viewparams = "GRP_IDS:13|15|";
    const result = validateVIEWPARAMS(viewparams);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("pipe"))).toBe(true);
  });

  test("Construit VIEWPARAMS correctement", () => {
    const params = {
      dateDeb: "1900-03-09",
      dateFin: "2026-03-09",
      cd_ref: [2440, 2442],
      grp_ids: [13, 15],
    };
    const viewparams = buildVIEWPARAMS(params);
    expect(viewparams).toBe(
      "DATE_DEB:1900-03-09;DATE_FIN:2026-03-09;CD_REF:2440,2442;GRP_IDS:13|15"
    );
  });

  test("Construit VIEWPARAMS avec groupes seulement", () => {
    const params = {
      grp_ids: [13, 15],
    };
    const viewparams = buildVIEWPARAMS(params);
    expect(viewparams).toBe("GRP_IDS:13|15");
  });
});

// Export pour utilisation en Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VIEWPARAMS_VALIDATION,
    validateVIEWPARAMS,
    buildVIEWPARAMS,
  };
}

