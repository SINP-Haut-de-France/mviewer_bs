// BaseModalUI.jsx
import React, { useRef } from "react";
import Modal from "react-modal";
import "./BaseModal.css"; // Styles associés à la modal

const BaseModalUI = ({
  isOpen,
  onClose,
  title,
  children,
  position,
  onMouseDown,
  isMinimized,
  onToggleMinimize,
  headerActions = [],
  closeButton = { visible: true, enabled: true },
  contentClassName = "",
}) => {
  const modalRef = useRef(null);
  const isCloseButtonVisible = closeButton?.visible !== false;
  const isCloseButtonEnabled = closeButton?.enabled !== false;

  // Toggle minimize/restore
  const handleToggleMinimize = () => {
    if (onToggleMinimize) {
      onToggleMinimize();
    }
  };

  // Si pas de position, ne pas afficher
  if (!position) return null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName={isMinimized ? "base-modal-overlay-hidden" : "base-modal-overlay"}
      className={`base-modal-content ${contentClassName || ""}`.trim()}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      ariaHideApp={false}
      style={{
        content: {
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: "translate(-50%, -50%)",
          position: "fixed",
          right: "auto",
          bottom: "auto",
        },
      }}>
      <div className="base-modal-header" ref={modalRef}>
        <div className="base-modal-drag-handle" onMouseDown={onMouseDown}>
          <h2>{title}</h2>
        </div>
        <div className="base-modal-buttons">
          {headerActions.map((action) => (
            <button
              key={action.key || action.title}
              className={`base-modal-header-button ${action.className || ""}`.trim()}
              onClick={action.onClick}
              title={action.title}
              type="button">
              {action.icon ? <i className={action.icon} aria-hidden="true"></i> : action.label}
            </button>
          ))}
          <button
            className="base-modal-header-button minimize-button"
            onClick={handleToggleMinimize}
            title={isMinimized ? "Agrandir" : "Réduire"}
            type="button">
            <i
              className={isMinimized ? "fa fa-window-maximize" : "fa fa-window-minimize"}
              aria-hidden="true"></i>
          </button>
          {isCloseButtonVisible && (
            <button
              className="base-modal-header-button close-button"
              onClick={isCloseButtonEnabled ? onClose : undefined}
              title={isCloseButtonEnabled ? "Fermer" : "Fermeture désactivée"}
              aria-disabled={!isCloseButtonEnabled}
              disabled={!isCloseButtonEnabled}
              type="button">
              <i className="fa fa-times" aria-hidden="true"></i>
            </button>
          )}
        </div>
      </div>
      {!isMinimized && <div className="base-modal-body">{children}</div>}
    </Modal>
  );
};

export default BaseModalUI;
