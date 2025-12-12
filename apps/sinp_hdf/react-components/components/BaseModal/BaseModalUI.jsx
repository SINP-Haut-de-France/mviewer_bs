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
  isDragging,
  isMinimized,
  onToggleMinimize,
}) => {
  const modalRef = useRef(null);

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
      className="base-modal-content"
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
          <button
            className="minimize-button"
            onClick={handleToggleMinimize}
            title={isMinimized ? "Agrandir" : "Réduire"}>
            {isMinimized ? "🗖" : "🗕"}
          </button>
          <button className="close-button" onClick={onClose} title="Fermer">
            ✕
          </button>
        </div>
      </div>
      {!isMinimized && <div className="base-modal-body">{children}</div>}
    </Modal>
  );
};

export default BaseModalUI;
