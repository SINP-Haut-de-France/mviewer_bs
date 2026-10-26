import React, { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./InfoTooltip.css";

const MARGIN = 8;
const GAP = 6;

/**
 * Petit point d'interrogation qui affiche une bulle d'aide au survol ou au
 * focus clavier. Sans `text`, rien n'est rendu : le tooltip s'active donc
 * composant par composant en renseignant simplement la prop d'aide.
 */
const InfoTooltip = ({ text, label = "Plus d'informations" }) => {
  const triggerRef = useRef(null);
  const tooltipId = useId();
  const [position, setPosition] = useState(null);

  const show = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(260, window.innerWidth - 2 * MARGIN);
    const left = Math.min(
      Math.max(MARGIN, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - MARGIN,
    );
    setPosition({ top: rect.bottom + GAP, left, width });
  }, []);

  const hide = useCallback(() => setPosition(null), []);

  if (!text) return null;

  return (
    <>
      <span
        ref={triggerRef}
        className="info-tooltip__trigger"
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-describedby={position ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(event) => event.key === "Escape" && hide()}
        // Évite de plier/déplier la section ou de cocher la case parente
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}>
        ?
      </span>
      {position &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className="info-tooltip__bubble"
            style={{ top: position.top, left: position.left, width: position.width }}>
            {text}
          </div>,
          document.body,
        )}
    </>
  );
};

export default InfoTooltip;
