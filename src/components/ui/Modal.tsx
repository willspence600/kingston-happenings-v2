'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'confirm' | 'alert' | 'success' | 'warning';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = 'alert',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
}: ModalProps) {
  const handleConfirm = useCallback(() => {
    onConfirm?.();
    onClose();
  }, [onConfirm, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={24} className="text-amber-500" />;
      case 'success':
        return <CheckCircle size={24} className="text-green-500" />;
      case 'confirm':
        return <Info size={24} className="text-primary" />;
      default:
        return <AlertCircle size={24} className="text-blue-500" />;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'warning':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      default:
        return 'bg-primary hover:opacity-90 text-primary-foreground';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-start gap-4 p-6 pb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg text-foreground">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{message}</p>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
                >
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 pt-4 border-t border-border bg-muted/30">
                {type === 'confirm' || type === 'warning' ? (
                  <>
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 border border-border rounded-xl font-medium text-sm hover:bg-muted transition-colors"
                    >
                      {cancelText}
                    </button>
                    <button
                      onClick={handleConfirm}
                      className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${getConfirmButtonStyle()}`}
                    >
                      {confirmText}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${getConfirmButtonStyle()}`}
                  >
                    {confirmText}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

