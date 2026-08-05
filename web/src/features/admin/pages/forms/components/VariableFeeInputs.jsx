import { Typography, Select, InputNumber } from 'antd'
import { getVariablesForLOB } from './utils/lobUtils'

const { Text } = Typography

export default function VariableFeeInputs({
  lobs,
  modalSelectedLOB,
  allVariables,
  variableInputs,
  onVariableInputChange,
}) {
  const variables = getVariablesForLOB(lobs, modalSelectedLOB, allVariables)

  return variables.map(variable => (
    <div key={variable._id} style={{ marginBottom: 12 }}>
      <Text style={{ display: 'block', marginBottom: 4 }}>
        {variable.question}
      </Text>
      {variable.calculationMethod === 'classification' && variable.classifications ? (
        <Select
          placeholder="Select classification"
          style={{ width: '100%' }}
          value={variableInputs[variable._id] || undefined}
          onChange={(value) => onVariableInputChange(variable._id, value)}
          options={variable.classifications.map(c => ({
            label: `${c.name} - ₱${c.fee?.toLocaleString() || 0}`,
            value: c.name
          }))}
        />
      ) : (
        <InputNumber
          placeholder={`Enter value (${variable.unit})`}
          style={{ width: '100%' }}
          value={variableInputs[variable._id] || null}
          onChange={(value) => onVariableInputChange(variable._id, value)}
          formatter={(value) => value ? value.toLocaleString() : ''}
          parser={(value) => value ? Number(value.replace(/,/g, '')) : ''}
        />
      )}
    </div>
  ))
}
