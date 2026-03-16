import { useState, useCallback } from 'react';

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
}

interface ConfirmDialogOptions {
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'default';
}

const INITIAL: ConfirmDialogState = {
  open: false,
  title: '',
  message: '',
  variant: 'default',
  onConfirm: () => {},
};

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>(INITIAL);

  const confirm = useCallback((options: ConfirmDialogOptions, onConfirm: () => void) => {
    setState({
      open: true,
      title: options.title,
      message: options.message,
      variant: options.variant || 'danger',
      onConfirm,
    });
  }, []);

  const close = useCallback(() => {
    setState(INITIAL);
  }, []);

  const handleConfirm = useCallback(() => {
    state.onConfirm();
    close();
  }, [state, close]);

  return {
    dialogProps: {
      open: state.open,
      title: state.title,
      message: state.message,
      variant: state.variant,
      onConfirm: handleConfirm,
      onCancel: close,
    },
    confirm,
  };
}
