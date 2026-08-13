import { useState, useEffect, useRef } from 'react'
import { Button, Form, Select, Typography } from 'antd'
import ResponsiveModal from '@/shared/components/ResponsiveModal'
import TemporaryPermitConfiguration from '../TemporaryPermitConfiguration'
import { INDUSTRY_SECTIONS } from '../../constants/industrySectionTemplates.constants'

const { Text } = Typography

const INDUSTRY_OPTIONS = [
  { value: 'a', label: 'A - Agriculture, Forestry and Fishing' },
  { value: 'b', label: 'B - Mining and Quarrying' },
  { value: 'c', label: 'C - Manufacturing' },
  { value: 'd', label: 'D - Electricity, Gas, Steam' },
  { value: 'e', label: 'E - Water Supply, Sewerage, Waste Management' },
  { value: 'f', label: 'F - Construction' },
  { value: 'g', label: 'G - Wholesale and Retail Trade' },
  { value: 'h', label: 'H - Transportation and Storage' },
  { value: 'i', label: 'I - Accommodation and Food Service' },
  { value: 'j', label: 'J - Information and Communication' },
  { value: 'k', label: 'K - Financial and Insurance' },
  { value: 'l', label: 'L - Real Estate' },
  { value: 'm', label: 'M - Professional, Scientific and Technical' },
  { value: 'n', label: 'N - Administrative and Support' },
  { value: 'o', label: 'O - Public Administration and Defense' },
  { value: 'p', label: 'P - Education' },
  { value: 'q', label: 'Q - Human Health and Social Work' },
  { value: 'r', label: 'R - Arts, Entertainment and Recreation' },
  { value: 's', label: 'S - Other Services' },
  { value: 't', label: 'T - Households' },
  { value: 'u', label: 'U - Extraterritorial' },
]

export default function AddTemporaryPermitModal({ open, onClose, onSuccess }) {
  const [form] = Form.useForm()
  const [selectedIndustry, setSelectedIndustry] = useState(null)
  const configurationRef = useRef(null)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields()
      setSelectedIndustry(null)
    }
  }, [open, form])

  const handleDebugFill = () => {
    if (!selectedIndustry) {
      return
    }

    const industrySections = INDUSTRY_SECTIONS[selectedIndustry]
    if (!industrySections || industrySections.length === 0) {
      return
    }

    const firstSection = industrySections[0]
    
    // Set form fields
    form.setFieldsValue({
      name: firstSection.sectionName,
      description: firstSection.description,
    })

    // Transform industry section to match FormContentEditor format
    const transformedSection = {
      id: `section-${Date.now()}`,
      sectionName: firstSection.sectionName,
      type: '',
      description: firstSection.description,
      notes: firstSection.notes,
      showWhen: null,
      items: firstSection.items.map(item => ({
        id: `item-${Date.now()}-${Math.random()}`,
        label: item.label,
        type: item.type,
        key: item.key,
        required: item.required,
        helpText: item.helpText,
        placeholder: item.placeholder,
        validation: item.validation,
        dropdownSource: item.dropdownSource,
        dropdownOptions: item.dropdownOptions,
        span: item.span,
        metadataFields: item.metadataFields || [],
        ...(item.type === 'download' ? {
          downloadFileName: item.downloadFileName,
          downloadFileSize: item.downloadFileSize,
          downloadFileType: item.downloadFileType,
          downloadFileUrl: item.downloadFileUrl,
        } : {}),
      })),
    }

    // Set sections in the configuration editor
    if (configurationRef.current && configurationRef.current.setSections) {
      configurationRef.current.setSections([transformedSection])
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // For now, just log the values (frontend-only)
      console.log('Temporary permit form data:', values)

      // Get sections from configuration editor
      const sections = configurationRef.current?.getSections?.() || []

      console.log('Form sections:', sections)
      console.log('Application fee amount:', values.applicationFeeAmount)

      onClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('Failed to create temporary permit form:', error)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onCancel={onClose}
      title="Add Temporary Permit Form"
      footer={[
        <Select
          key="debug"
          placeholder="Select industry section for debug fill"
          style={{ width: 300, marginRight: 8 }}
          value={selectedIndustry}
          onChange={setSelectedIndustry}
          options={INDUSTRY_OPTIONS}
        />,
        <Button key="debug-fill" onClick={handleDebugFill} disabled={!selectedIndustry}>
          Debug Fill
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          Create Form
        </Button>,
      ]}
      width={800}
      destroyOnHidden
    >
      <Text style={{ display: 'block', marginBottom: 16 }}>
        Configure the temporary permit form below. Use the debug fill to populate with industry-specific sections.
        </Text>
        <TemporaryPermitConfiguration
          ref={configurationRef}
          form={form}
          handleFormValuesChange={() => {}}
          title=""
          description=""
          _fees={[]}
          _globalFees={[]}
          sections={[]}
          definitionId={null}
          onSave={() => {}}
        />
    </ResponsiveModal>
  )
}
