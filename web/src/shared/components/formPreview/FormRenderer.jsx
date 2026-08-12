import { Fragment, useState, useEffect } from 'react';
import { Form } from 'antd';
import { Typography, Row, Col, Card, Divider, Tag, theme, Grid, App } from 'antd';
import {
  filterSectionsByFormValues,
  buildValidationRules,
} from '@/features/business-owner/utils/formUtils';
import LOBSection from './LOBSection';
import { fieldRenderers, FieldContext, FieldLabel, useRequestChangeStyle } from './fields';

const { Text } = Typography;

function getFieldLockState(fieldName, field, revisionFieldKeys) {
  if (!revisionFieldKeys) return { isFieldLocked: false, hasAddressSubFieldLocked: false };

  const keys = Array.from(revisionFieldKeys);
  const isFieldLocked = keys.some((key) => key.endsWith(`.${fieldName}`) || key === fieldName);

  const isAddressField = field.type === 'address' || field.type === 'address_alaminos';
  const hasAddressSubFieldLocked =
    isAddressField &&
    keys.some((key) => key.startsWith(fieldName) || key.endsWith(`.${fieldName}`));

  return { isFieldLocked, hasAddressSubFieldLocked };
}

function DynamicField({
  field,
  form,
  token,
  readOnly,
  applicationId,
  onDocumentCid,
  onSaveDraft,
  documents,
  revisionFieldKeys,
  fieldReviewDecisions,
  mode,
  lobSectionRef,
  onLobChange,
  formValues,
  sectionIndex,
  fieldIndex,
  renderFieldActions,
  onViewDocument,
}) {
  const { message } = App.useApp();
  const fieldName = field.key;
  const [previewModal, setPreviewModal] = useState({
    open: false,
    url: null,
    label: '',
    type: 'other',
    isBlob: false,
  });

  const rules = buildValidationRules(field);
  const { isFieldLocked, hasAddressSubFieldLocked } = getFieldLockState(
    fieldName,
    field,
    revisionFieldKeys
  );
  const effectiveReadOnly =
    readOnly || (revisionFieldKeys && (isFieldLocked || hasAddressSubFieldLocked));

  const {
    showRequestChange,
    reason,
    requestChangeStyle,
    requestChangeBorder,
    textareaStyle,
    metadataBoxStyle,
  } = useRequestChangeStyle({ field, fieldName, fieldReviewDecisions, token });

  const label = <FieldLabel field={field} token={token} reason={reason} />;

  const Renderer = fieldRenderers[field.type] || fieldRenderers.default;

  const fieldContextValue = {
    field,
    fieldName,
    form,
    token,
    mode,
    readOnly: effectiveReadOnly,
    effectiveReadOnly,
    applicationId,
    onDocumentCid,
    onSaveDraft,
    documents,
    revisionFieldKeys,
    fieldReviewDecisions,
    showRequestChange,
    requestChangeStyle,
    requestChangeBorder,
    textareaStyle,
    metadataBoxStyle,
    label,
    previewModal,
    setPreviewModal,
    message,
    rules,
    lobSectionRef,
    onLobChange,
    formValues,
    sectionIndex,
    fieldIndex,
    renderFieldActions,
    onViewDocument,
  };

  const fieldActions = renderFieldActions?.(fieldContextValue);

  return (
    <FieldContext.Provider value={fieldContextValue}>
      <div>
        <Renderer />
        {fieldActions && (
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            {fieldActions}
          </div>
        )}
      </div>
    </FieldContext.Provider>
  );
}

function renderSectionContent(
  section,
  sIdx,
  {
    form,
    token,
    isMobile,
    readOnly,
    applicationId,
    onDocumentCid,
    onSaveDraft,
    documents,
    revisionFieldKeys,
    fieldReviewDecisions,
    renderedFieldKeys,
    showAdminNotes,
    lobSectionRef,
    formValues,
    onLobChange,
    mode,
    renderFieldActions,
    onViewDocument,
    renderLineActions,
    baseSectionIndex,
  }
) {
  if (section.type === 'lob_section') {
    return (
      <LOBSection
        ref={lobSectionRef}
        key={sIdx}
        isEditMode={!readOnly}
        reviewMode={readOnly}
        onLobChange={onLobChange}
        form={form}
        businessActivities={formValues?.businessActivities}
        renderLineActions={renderLineActions}
      />
    );
  }

  const seenKeys = new Set();
  const uniqueItems = (section.items || []).filter((item) => {
    const fieldKey = item.key || item.label;
    if (!fieldKey) return true;
    if (renderedFieldKeys && renderedFieldKeys.has(fieldKey)) return false;
    if (seenKeys.has(fieldKey)) return false;
    seenKeys.add(fieldKey);
    if (renderedFieldKeys) renderedFieldKeys.add(fieldKey);
    return true;
  });

  return (
    <Fragment key={sIdx}>
      {section.source && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          Source: {section.source}
        </Text>
      )}
      {section.notes && showAdminNotes && (
        <>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            Notes
          </Text>
          <Text style={{ display: 'block', marginBottom: 12, color: token.colorTextSecondary }}>
            {section.notes}
          </Text>
        </>
      )}
      {section.showWhen && (
        <div style={{ marginBottom: 12 }}>
          <Tag color="orange">Conditional</Tag>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
            Shows when: {JSON.stringify(section.showWhen)}
          </Text>
        </div>
      )}
      <Divider style={{ margin: '0 0 16px 0' }} />
      <Row gutter={[8, 16]}>
        {uniqueItems.map((item, fIdx) => {
          const colSpan = isMobile ? 24 : Math.min(Math.max(Number(item.span || 24), 1), 24);
          const fieldKey = item.key || item.label || `field-${fIdx}`;

          const dynamicFieldProps = {
            field: item,
            form,
            token,
            readOnly,
            applicationId,
            onDocumentCid,
            onSaveDraft,
            documents,
            revisionFieldKeys,
            fieldReviewDecisions,
            mode,
            lobSectionRef,
            onLobChange,
            formValues,
            sectionIndex: baseSectionIndex + sIdx,
            fieldIndex: fIdx,
            renderFieldActions,
            onViewDocument,
          };

          if (item.type === 'address' || item.type === 'address_alaminos') {
            return (
              <Col key={`${sIdx}-${fieldKey}`} span={24}>
                <DynamicField {...dynamicFieldProps} />
              </Col>
            );
          }
          return (
            <Col key={`${sIdx}-${fieldKey}`} xs={24} sm={24} md={colSpan} lg={colSpan} xl={colSpan}>
              <DynamicField {...dynamicFieldProps} />
            </Col>
          );
        })}
      </Row>
    </Fragment>
  );
}

export default function FormRenderer({
  definition,
  section,
  form,
  formValues = {},
  isMobile = false,
  activeSectionIndex,
  readOnly = false,
  applicationId = null,
  businessId = null,
  onDocumentCid = null,
  onSaveDraft = null,
  documents = {},
  revisionFieldKeys,
  fieldReviewDecisions,
  containerVariant = undefined,
  customPadding = undefined,
  mode = 'application',
  showAdminNotes = false,
  lobSectionRef = null,
  onLobChange = null,
  disabled = false,
  editable = false,
  _businessId = null,
  _onDocumentCid = null,
  _onSaveDraft = null,
  _formDataKey = null,
  renderFieldActions = null,
  onViewDocument = null,
  renderLineActions = null,
  baseSectionIndex = 0,
}) {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const [localForm] = Form.useForm();
  const activeForm = form || localForm;

  // When FormRenderer owns its own form, populate it from formValues
  // so read-only/preview modes can display values without a parent form.
  useEffect(() => {
    if (!form && formValues && Object.keys(formValues).length > 0) {
      activeForm.setFieldsValue(formValues);
    }
  }, [form, formValues, activeForm]);

  const isPreview = mode === 'preview';
  const effectiveApplicationId = isPreview ? null : applicationId || businessId || _businessId;
  const effectiveOnDocumentCid = isPreview ? null : onDocumentCid;
  const effectiveOnSaveDraft = isPreview ? null : onSaveDraft;
  const effectiveRevisionFieldKeys = isPreview ? null : revisionFieldKeys;
  const effectiveFieldReviewDecisions = isPreview ? undefined : fieldReviewDecisions;
  const effectiveDocuments = isPreview ? {} : documents;
  const effectiveReadOnly = readOnly || (isPreview ? disabled || !editable : false);
  const effectiveShowAdminNotes = showAdminNotes || isPreview;

  if (!definition && !section) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">No form definition loaded.</Text>
      </div>
    );
  }

  const sections = definition?.sections || (section ? [section] : []);
  const visibleSections = filterSectionsByFormValues(sections, formValues);

  if (!visibleSections.length) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">
          {formValues && sections?.length > 0
            ? 'No sections match the current form values.'
            : 'No form content available.'}
        </Text>
      </div>
    );
  }

  const sharedSectionProps = {
    form: activeForm,
    token,
    isMobile,
    readOnly: effectiveReadOnly,
    applicationId: effectiveApplicationId,
    onDocumentCid: effectiveOnDocumentCid,
    onSaveDraft: effectiveOnSaveDraft,
    documents: effectiveDocuments,
    revisionFieldKeys: effectiveRevisionFieldKeys,
    fieldReviewDecisions: effectiveFieldReviewDecisions,
    showAdminNotes: effectiveShowAdminNotes,
    lobSectionRef,
    formValues,
    onLobChange,
    mode,
    renderFieldActions,
    onViewDocument,
    renderLineActions,
    baseSectionIndex,
  };

  const renderedFieldKeys = new Set();

  const renderSections = () => {
    if (typeof activeSectionIndex === 'number' && activeSectionIndex >= 0) {
      const idx = Math.min(activeSectionIndex, visibleSections.length - 1);
      const section = visibleSections[idx];
      return (
        <div>
          {section.description ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 500, color: token.colorTextSecondary }}>
                Section Description
              </div>
              <div style={{ marginBottom: 16, color: token.colorText }}>{section.description}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, marginBottom: 4, color: token.colorTextSecondary }}>
              Section description
            </div>
          )}
          {visibleSections.map((sec, sIdx) => (
            <div
              key={sIdx}
              data-section-index={sIdx}
              style={{ display: sIdx === idx ? 'block' : 'none' }}
              aria-hidden={sIdx !== idx}
            >
              {renderSectionContent(sec, sIdx, { ...sharedSectionProps, renderedFieldKeys })}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div>
        {visibleSections.map((sec, sIdx) => (
          <Card
            key={sIdx}
            size={containerVariant}
            style={{ marginBottom: 16 }}
            styles={customPadding ? { body: { padding: screens.md ? '16px' : '24px' } } : undefined}
          >
            {sec.description ? (
              <>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    marginBottom: 4,
                    color: token.colorTextSecondary,
                  }}
                >
                  Section description
                </div>
                <div style={{ marginBottom: 16 }}>{sec.description}</div>
              </>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  marginBottom: 16,
                  color: token.colorTextSecondary,
                }}
              >
                Section description
              </div>
            )}
            {renderSectionContent(sec, sIdx, { ...sharedSectionProps, renderedFieldKeys })}
          </Card>
        ))}
      </div>
    );
  };

  const content = renderSections();

  if (!form) {
    return (
      <Form validateTrigger="onBlur" form={localForm} layout="vertical" requiredMark={false}>
        {content}
      </Form>
    );
  }

  return content;
}
