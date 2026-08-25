import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "600px",
  className = "",
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className={`modal-dialog ${className}`}
            style={{ maxWidth }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {(title || onClose) && (
              <div className="modal-header">
                {title && <h3 className="modal-title">{title}</h3>}
                {onClose && (
                  <button
                    className="modal-close-btn"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    ✖
                  </button>
                )}
              </div>
            )}
            <div className="modal-body">{children}</div>
          </motion.div>
          <style>{`
            .modal-backdrop {
              position: fixed;
              inset: 0;
              background: #000;
              z-index: 1000;
            }
            .modal-dialog {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) !important;
              background: #1b1b1b;
              color: #fff;
              width: 90%;
              max-height: 90vh;
              border-radius: 16px;
              padding: 24px;
              z-index: 1001;
              box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
              overflow-y: auto;
            }
            .modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
            }
            .modal-title {
              font-size: 1.25rem;
              font-weight: 600;
              color: #fff;
            }
            .modal-close-btn {
              background: transparent;
              border: none;
              font-size: 18px;
              color: #aaa;
              cursor: pointer;
              transition: color 0.2s;
              padding: 4px;
            }
            .modal-close-btn:hover {
              color: #fff;
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
