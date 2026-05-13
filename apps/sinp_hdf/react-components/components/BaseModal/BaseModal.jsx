// BaseModal.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import BaseModalUI from "./BaseModalUI";

const BaseModal = forwardRef(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      onMinimize,
      headerActions = [],
      closeButton = { visible: true, enabled: true },
      contentClassName = "",
    },
    ref
  ) => {
  const [position, setPosition] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Centrer la modale lors de l'ouverture
  useEffect(() => {
    if (isOpen && !position) {
      // Calculer la position centrée
      const centerPosition = {
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      };
      setPosition(centerPosition);
      setIsMinimized(false);
    } else if (!isOpen) {
      // Réinitialiser pour la prochaine ouverture
      setPosition(null);
      setIsMinimized(false);
    }
  }, [isOpen, position]);

  // Utiliser useCallback pour éviter de recréer les fonctions à chaque render
  const handleMouseDown = useCallback(
    (e) => {
      setIsDragging(true);
      // Enregistrer l'offset initial entre la position de la souris et la position de la modale
      if (position) {
        dragOffset.current = {
          x: e.clientX - position.left,
          y: e.clientY - position.top,
        };
      }
    },
    [position]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !position) return;

      const { clientX, clientY } = e;
      const newLeft = clientX - dragOffset.current.x;
      const newTop = clientY - dragOffset.current.y;

      // Récupérer les dimensions de la modale
      const modal = document.querySelector('.base-modal-content');
      const modalWidth = modal ? modal.offsetWidth : 600;

      // Limiter le déplacement dans les limites du navigateur
      // Avec transform: translate(-50%, -50%), le top/left est au centre
      const minTop = 70; // Limite inférieure (sous le header mviewer)
      const maxTop = window.innerHeight - 50; // Limite supérieure
      const minLeft = modalWidth / 2; // Limite gauche
      const maxLeft = window.innerWidth - (modalWidth / 2); // Limite droite

      setPosition({
        top: Math.max(minTop, Math.min(newTop, maxTop)),
        left: Math.max(minLeft, Math.min(newLeft, maxLeft)),
      });
    },
    [isDragging, position]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Gérer les événements de souris au niveau du document
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleToggleMinimize = useCallback(() => {
    setIsMinimized((prev) => {
      const newState = !prev;
      // Si on restaure (newState === false), recentrer la modale
      if (!newState) {
        const centerPosition = {
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
        };
        setPosition(centerPosition);
      }
      // Appeler le callback externe si fourni, en passant le nouvel état
      if (onMinimize) {
        try {
          onMinimize(newState);
        } catch (e) {
          // éviter de casser la modale si le callback échoue
          console.error('onMinimize callback error', e);
        }
      }
      return newState;
    });
  }, [onMinimize]);

  // Exposer handleToggleMinimize via ref
  useImperativeHandle(
    ref,
    () => ({
      handleToggleMinimize,
    }),
    [handleToggleMinimize]
  );

    return (
      <BaseModalUI
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        position={position}
        onMouseDown={handleMouseDown}
        isDragging={isDragging}
        isMinimized={isMinimized}
        onToggleMinimize={handleToggleMinimize}
        headerActions={headerActions}
        contentClassName={contentClassName}
        closeButton={closeButton}>
        {children}
      </BaseModalUI>
    );
  }
);

export default BaseModal;
