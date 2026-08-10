import { Grid, Modal, Drawer, theme } from 'antd'

const { useBreakpoint } = Grid

/**
 * ResponsiveModal - A wrapper component that renders as a Drawer on mobile and Modal on desktop
 * 
 * Mobile (< 768px): Bottom drawer with size="large"
 * Desktop (≥ 768px): Centered modal
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal/drawer is open
 * @param {Function} props.onCancel - Callback when modal/drawer is closed
 * @param {string} props.title - Title for the modal/drawer
 * @param {React.ReactNode} props.footer - Footer content (for Modal) or custom footer (for Drawer)
 * @param {React.ReactNode} props.children - Content to render
 * @param {number} props.width - Width for Modal (desktop only)
 * @param {boolean} props.destroyOnHidden - Whether to destroy component when hidden
 * @param {Object} props.styles - Custom styles for Modal/Drawer
 * @param {Object} props.extra - Extra content for Drawer header
 */
export default function ResponsiveModal({
  open,
  onCancel,
  title,
  footer,
  children,
  width,
  destroyOnHidden,
  styles,
  extra,
  ...restProps
}) {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const { token } = theme.useToken()

  // Mobile: Bottom drawer
  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onCancel}
        title={title}
        placement="bottom"
        size="100%"
        styles={{
          body: { padding: 0, display: 'flex', flexDirection: 'column', background: token.colorBgContainer },
          header: { background: token.colorBgContainer },
          ...styles?.body,
        }}
        destroyOnHidden={destroyOnHidden}
        extra={extra}
        {...restProps}
      >
        <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0 }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: 16, borderTop: `1px solid ${token.colorBorder}`, display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </Drawer>
    )
  }

  // Desktop: Modal
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={title}
      footer={footer}
      width={width}
      destroyOnHidden={destroyOnHidden}
      styles={{
        header: { background: token.colorBgContainer },
        content: { background: token.colorBgContainer },
        body: { background: token.colorBgContainer },
        container: { background: token.colorBgContainer },
        ...styles,
      }}
      {...restProps}
    >
      {children}
    </Modal>
  )
}
