import { useState, useEffect, useMemo, useCallback } from 'react';
import { SaveOutlined, HistoryOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import DetailHeader from '@/shared/components/DetailHeader';
import AuditHistoryModal from '@/shared/audit/components/AuditHistoryModal';
import AuditEventDetails from '@/shared/audit/components/AuditEventDetails';
import InspectionItemOverview from './InspectionItemOverview';
import InspectionItemConfiguration from './InspectionItemConfiguration';
import { useInspectionItemForm } from '../hooks/useInspectionItemForm';
import { useAudit } from '@/shared/audit/hooks/useAudit';
import { AUDIT_EVENT_INFO } from '@/shared/config/auditEventTypes';
import { getChecklistsByInspectionItem } from '@/features/admin/services/checklistService';

export default function InspectionItemDetailPanel({ inspectionItemId, inspectionItem, onSave }) {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [associatedChecklists, setAssociatedChecklists] = useState([]);
  const [loadingChecklists, setLoadingChecklists] = useState(false);
  const [summaryFormatters, setSummaryFormatters] = useState({});
  const [summaryFieldLabels, setSummaryFieldLabels] = useState({});

  const isNew = inspectionItemId === 'new' || !inspectionItem;

  const { auditLogs, auditLoading, refresh } = useAudit(
    'inspection-item',
    inspectionItemId,
    !isNew
  );

  useEffect(() => {
    const fetchChecklists = async () => {
      if (!isNew && inspectionItemId) {
        try {
          setLoadingChecklists(true);
          const checklists = await getChecklistsByInspectionItem(inspectionItemId);
          setAssociatedChecklists(checklists);
        } catch (error) {
          console.error('Failed to fetch associated checklists:', error);
        } finally {
          setLoadingChecklists(false);
        }
      }
    };
    fetchChecklists();
  }, [inspectionItemId, isNew]);

  const initialValues = useMemo(
    () => ({
      name: inspectionItem?.name || '',
      question: inspectionItem?.question || '',
      notes: inspectionItem?.notes || '',
      legalBasis: (inspectionItem?.legalBasis || []).map((item) => ({
        url: item?.url || '',
        title: item?.title ?? '',
        description: item?.description ?? '',
      })),
      violationId: inspectionItem?.violationId?._id || inspectionItem?.violationId || '',
      isActive: inspectionItem?.isActive !== undefined ? inspectionItem.isActive : true,
    }),
    [inspectionItem]
  );

  const {
    form,
    saving,
    hasChanges,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleFormValuesChange,
    handleStatusChange,
    handleSave,
    handleConfirm,
    resetChangeTracking,
    stepUpModal,
    ChangesSummary,
  } = useInspectionItemForm({ inspectionItemId, inspectionItem, initialValues, onSave });

  const loading = saving || loadingChecklists;

  const handleFormattersChange = useCallback(({ formatters, fieldLabels }) => {
    setSummaryFormatters(formatters);
    setSummaryFieldLabels(fieldLabels);
  }, []);

  const handleEnterEditMode = () => {
    setIsEditMode(true);
  };

  const handleExitEditMode = () => {
    setIsEditMode(false);
    form.setFieldsValue(initialValues);
    resetChangeTracking(initialValues);
  };

  // Reset form when inspection item changes
  useEffect(() => {
    if (inspectionItem && !isNew) {
      form.setFieldsValue(initialValues);
      resetChangeTracking(initialValues);
    }
  }, [inspectionItemId, inspectionItem, initialValues, form, resetChangeTracking, isNew]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={isNew ? 'New Inspection Item' : inspectionItem?.name || 'Inspection Item'}
        primaryButton={{
          text: 'Save',
          icon: <SaveOutlined />,
          onClick: handleSave,
          loading: saving,
          type: 'primary',
          disabled: !hasChanges,
        }}
        showUndoRedo={true}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo()}
        canRedo={canRedo()}
        iconButtons={[
          { icon: <HistoryOutlined />, onClick: () => setHistoryModalOpen(true), title: 'History' },
        ]}
        actionButtons={
          isEditMode
            ? [
                {
                  text: 'Exit Edit Mode',
                  icon: <CloseOutlined />,
                  onClick: handleExitEditMode,
                  type: 'default',
                },
              ]
            : [
                {
                  text: 'Edit',
                  icon: <EditOutlined />,
                  onClick: handleEnterEditMode,
                  type: 'default',
                },
              ]
        }
        instructionSlotId="admin-inspection-items"
        selectFields={
          !isNew
            ? [
                {
                  label: 'Status',
                  value: inspectionItem?.isActive ? 'active' : 'disabled',
                  onChange: handleStatusChange,
                  width: 120,
                  options: [
                    { value: 'active', label: 'Active' },
                    { value: 'disabled', label: 'Disabled' },
                  ],
                },
              ]
            : []
        }
      />
      <AuditHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        auditLogs={auditLogs}
        loading={auditLoading}
        onRefresh={refresh}
        eventDescriptions={AUDIT_EVENT_INFO.filter((e) => e.event.startsWith('inspection_item_'))}
        DetailPanelComponent={AuditEventDetails}
      />
      {stepUpModal}
      <ChangesSummary
        onConfirm={handleConfirm}
        formatters={summaryFormatters}
        fieldLabels={summaryFieldLabels}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {isEditMode ? (
          <InspectionItemConfiguration
            form={form}
            handleFormValuesChange={handleFormValuesChange}
            onFormattersChange={handleFormattersChange}
          />
        ) : (
          <InspectionItemOverview
            inspectionItem={inspectionItem}
            initialValues={initialValues}
            violation={inspectionItem?.violationId}
            associatedChecklists={associatedChecklists}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
