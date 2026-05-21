import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ToastData {
  message: string;
  type: 'success' | 'error';
}

interface ToastProps {
  toast: ToastData | null;
}

export function Toast({ toast }: ToastProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            'fixed top-6 left-1/2 z-50 px-5 py-3 rounded-xl backdrop-blur-xl flex items-center gap-3 shadow-2xl',
            toast.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400',
          )}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
