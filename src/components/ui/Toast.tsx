'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  isOpen: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ isOpen, message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, duration]);

  const getStyle = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} />;
      case 'error':
        return <AlertCircle size={18} />;
      default:
        return <Info size={18} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          className={`fixed bottom-6 left-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${getStyle()}`}
        >
          {getIcon()}
          <span className="text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Toast;

