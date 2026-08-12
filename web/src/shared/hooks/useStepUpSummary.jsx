import { useCallback, useRef, useState } from 'react';
import { useStepUp } from './useStepUp';
import { useFormChangeTracking } from './useFormChangeTracking';
import ChangesSummaryModal from '@/shared/components/ChangesSummaryModal';

/**
 * Hook that wraps useStepUp and useFormChangeTracking to give admin edit flows a
 * two-stage save: open a ChangesSummaryModal, then run the save through
 * runWithStepUp(..., { directPasskey: true }) so passkey users skip the StepUpModal.
 */
export function useStepUpSummary({
  initialValues,
  title = 'Confirm Changes',
  confirmText = 'Use Passkey To Confirm',
  cancelText = 'Cancel',
}) {
  const { runWithStepUp, stepUpModal } = useStepUp();
  const { hasChanges, changedFields, resetChangeTracking, handleValuesChange } =
    useFormChangeTracking(initialValues);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const summaryOpenRef = useRef(summaryOpen);
  const confirmLoadingRef = useRef(confirmLoading);
  const changedFieldsRef = useRef(changedFields);

  summaryOpenRef.current = summaryOpen;
  confirmLoadingRef.current = confirmLoading;
  changedFieldsRef.current = changedFields;

  const openSummary = useCallback(() => setSummaryOpen(true), []);
  const closeSummary = useCallback(() => setSummaryOpen(false), []);

  const confirmWithStepUp = useCallback(
    async (saveOperation) => {
      setConfirmLoading(true);
      try {
        await runWithStepUp(saveOperation, { directPasskey: true });
        setSummaryOpen(false);
      } catch (error) {
        if (
          error?.name === 'NotAllowedError' ||
          error?.name === 'AbortError' ||
          error?.message === 'Step-up cancelled'
        ) {
          return;
        }
        throw error;
      } finally {
        setConfirmLoading(false);
      }
    },
    [runWithStepUp]
  );

  const ChangesSummary = useCallback(
    ({ onConfirm, formatters, fieldLabels }) => (
      <ChangesSummaryModal
        open={summaryOpenRef.current}
        onClose={closeSummary}
        onConfirm={onConfirm}
        changedFields={changedFieldsRef.current}
        formatters={formatters}
        fieldLabels={fieldLabels}
        confirmLoading={confirmLoadingRef.current}
        title={title}
        confirmText={confirmText}
        cancelText={cancelText}
      />
    ),
    [closeSummary, title, confirmText, cancelText]
  );

  return {
    hasChanges,
    changedFields,
    resetChangeTracking,
    handleValuesChange,
    summaryOpen,
    openSummary,
    closeSummary,
    confirmWithStepUp,
    runWithStepUp,
    stepUpModal,
    ChangesSummary,
  };
}
