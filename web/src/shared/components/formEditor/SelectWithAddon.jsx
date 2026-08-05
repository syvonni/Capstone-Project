import { Select, Space, theme } from 'antd'

/**
 * Wrapper component to provide addonBefore functionality for Select fields.
 * Ant Design's Select component doesn't support addonBefore/addonAfter props,
 * so we use Space.Compact to group a label with the Select.
 */
export default function SelectWithAddon({ addonBefore, addonAfter, ...props }) {
  const { token } = theme.useToken()

  if (!addonBefore && !addonAfter) {
    return <Select {...props} />
  }

  const addonStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '0 11px',
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorder}`,
    color: token.colorText,
    fontSize: '14px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }

  return (
    <Space.Compact style={{ width: props.style?.width || '100%' }}>
      {addonBefore && (
        <div
          style={{
            ...addonStyle,
            borderRadius: `${token.borderRadius}px 0 0 ${token.borderRadius}px`,
            borderRight: 'none',
          }}
        >
          {addonBefore}
        </div>
      )}
      <Select
        {...props}
        style={{
          ...props.style,
          width: 'auto',
          flex: 1,
          borderRadius: addonBefore 
            ? `0 ${token.borderRadius}px ${token.borderRadius}px 0` 
            : addonAfter 
              ? `${token.borderRadius}px 0 0 ${token.borderRadius}px` 
              : `${token.borderRadius}px`,
          minWidth: 0, // Allow flex item to shrink
        }}
        dropdownStyle={{
          ...props.dropdownStyle,
          maxWidth: '500px',
        }}
        optionLabelProp="label"
      >
        {props.options?.map((option) => {
          if (option.options) {
            // Optgroup
            return (
              <Select.OptGroup key={option.label} label={option.label}>
                {option.options.map((subOption) => (
                  <Select.Option
                    key={subOption.key || subOption.value}
                    value={subOption.value}
                    title={subOption.label}
                  >
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '450px',
                      }}
                    >
                      {subOption.label}
                    </div>
                  </Select.Option>
                ))}
              </Select.OptGroup>
            )
          }
          // Regular option
          return (
            <Select.Option
              key={option.key || option.value}
              value={option.value}
              title={option.label}
            >
              <div
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '450px',
                }}
              >
                {option.label}
              </div>
            </Select.Option>
          )
        })}
      </Select>
      {addonAfter && (
        <div
          style={{
            ...addonStyle,
            borderRadius: `0 ${token.borderRadius}px ${token.borderRadius}px 0`,
            borderLeft: 'none',
          }}
        >
          {addonAfter}
        </div>
      )}
    </Space.Compact>
  )
}
