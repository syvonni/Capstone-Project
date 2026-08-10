import { useState } from 'react'
import { Button, Select, Form, Space, Grid, theme, Tooltip, Modal } from 'antd'
import { BookOutlined, InfoCircleOutlined, UndoOutlined, RedoOutlined, RollbackOutlined } from '@ant-design/icons'
import DynamicPageContent from './DynamicPageContent'
import DynamicInfoModal from './DynamicInfoModal'

const { useBreakpoint } = Grid

export default function DetailHeader({
  primaryButton,
  iconButtons = [],
  undoRedoButtons = [],
  selectFields = [],
  actionButtons = [],
  manualSlotId,
  instructionSlotId,
  showUndoRedo = false,
  onUndo,
  onRedo,
  onRevert,
  canUndo = true,
  canRedo = true,
  canRevert = true,
}) {
  const screens = useBreakpoint()
  const { token } = theme.useToken()
  const [manualOpen, setManualOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <>
      <div style={{ padding: '12px', borderBottom: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', width: screens.md ? 'auto' : '100%' }}>
            {primaryButton && (
              <Button
                type={primaryButton.type || 'primary'}
                onClick={primaryButton.onClick}
                loading={primaryButton.loading}
                disabled={primaryButton.disabled}
                style={{ flex: screens.xs ? 1 : 'auto' }}
              >
                {primaryButton.icon} {primaryButton.text}
              </Button>
            )}
            <Space.Compact>
              {iconButtons.map((btn, idx) => (
                <Button
                  key={idx}
                  icon={btn.icon}
                  onClick={btn.onClick}
                  title={btn.title}
                  disabled={btn.disabled}
                />
              ))}
              {manualSlotId && (
                <Button
                  icon={<BookOutlined />}
                  onClick={() => setManualOpen(true)}
                  title="Manual"
                />
              )}
              {instructionSlotId && (
                <Button
                  icon={<InfoCircleOutlined />}
                  onClick={() => setInfoOpen(true)}
                  title="Info"
                />
              )}
            </Space.Compact>
            {showUndoRedo && (
              <Space.Compact>
                <Button
                  icon={<UndoOutlined />}
                  onClick={onUndo}
                  title="Undo"
                  disabled={!canUndo}
                />
                <Button
                  icon={<RedoOutlined />}
                  onClick={onRedo}
                  title="Redo"
                  disabled={!canRedo}
                />
                {onRevert && (
                  <Button
                    icon={<RollbackOutlined />}
                    onClick={onRevert}
                    title="Revert"
                    disabled={!canRevert}
                  />
                )}
              </Space.Compact>
            )}
            {undoRedoButtons.length > 0 && (
              <Space.Compact>
                {undoRedoButtons.map((btn, idx) => (
                  <Button
                    key={`undo-${idx}`}
                    icon={btn.icon}
                    onClick={btn.onClick}
                    title={btn.title}
                    disabled={btn.disabled}
                  />
                ))}
              </Space.Compact>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', width: screens.md ? 'auto' : '100%' }}>
            {selectFields.length > 0 && selectFields.map((field, idx) => (
              <Form.Item
                key={idx}
                label={field.label}
                labelCol={{ style: { paddingBottom: 0 } }}
                style={{ marginBottom: 0, flex: screens.md ? 'none' : 1 }}
              >
                {field.disabled && field.tooltip ? (
                  <Tooltip title={field.tooltip}>
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      loading={field.loading}
                      style={{ width: screens.md ? field.width || 160 : '100%' }}
                      disabled={field.disabled}
                      options={field.options}
                    />
                  </Tooltip>
                ) : (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    loading={field.loading}
                    style={{ width: screens.md ? field.width || 160 : '100%' }}
                    disabled={field.disabled}
                    options={field.options}
                  />
                )}
              </Form.Item>
            ))}
            {actionButtons.length > 0 && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', width: screens.md ? 'auto' : '100%' }}>
                {actionButtons.map((btn, idx) => {
                  if (btn.fullWidthOnMobile && !screens.md) {
                    return (
                      <Tooltip key={idx} title={btn.tooltip}>
                        <Button
                          type={btn.type || 'default'}
                          onClick={btn.disabled && btn.onDisabledClick ? btn.onDisabledClick : btn.onClick}
                          loading={btn.loading}
                          disabled={btn.disabled && !btn.onDisabledClick}
                          danger={btn.danger}
                          icon={btn.icon}
                          style={{
                            width: '100%',
                            color: btn.disabled ? token.colorTextDisabled : undefined,
                          }}
                        >
                          {btn.text}
                        </Button>
                      </Tooltip>
                    )
                  }
                  if (btn.fullWidthOnMobile && !screens.md) return null
                  return (
                    <Tooltip key={idx} title={btn.tooltip}>
                      <Button
                        type={btn.type || 'default'}
                        onClick={btn.disabled && btn.onDisabledClick ? btn.onDisabledClick : btn.onClick}
                        loading={btn.loading}
                        disabled={btn.disabled && !btn.onDisabledClick}
                        danger={btn.danger}
                        icon={btn.icon}
                        style={{
                          flex: screens.xs ? 1 : 'auto',
                          color: btn.disabled ? token.colorTextDisabled : undefined,
                        }}
                      >
                        {btn.text}
                      </Button>
                    </Tooltip>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Modal */}
      {manualSlotId && (
        <Modal
          title="BizClear Manual"
          open={manualOpen}
          onCancel={() => setManualOpen(false)}
          footer={null}
          width={800}
          style={{ top: 20 }}
        >
          <DynamicPageContent slotId={manualSlotId} embedded compact />
        </Modal>
      )}

      {/* Info Modal */}
      {instructionSlotId && (
        <DynamicInfoModal
          slotId={instructionSlotId}
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          title="Instructions"
        />
      )}
    </>
  )
}
