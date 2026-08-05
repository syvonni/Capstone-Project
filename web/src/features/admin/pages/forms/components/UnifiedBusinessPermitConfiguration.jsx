import { Form, Input, Select, theme, Typography } from 'antd'
import { useState, useEffect, useRef } from 'react'
import { getDocuments } from '@/features/admin/services/documentService'
import FormContentEditor from '@/shared/components/FormContentEditor'
import { UNIFIED_BUSINESS_PERMIT_SECTIONS } from '../constants/formDefinitions.constants'

const { Text } = Typography

export default function ConfigurationPanel({ form, handleFormValuesChange, title, description, notes, sections, onSave: _onSave }) {
  const { token } = theme.useToken()
  const [documents, setDocuments] = useState([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const editorRef = useRef(null)

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoadingDocuments(true)
      try {
        const docs = await getDocuments({ isActive: true })
        setDocuments(docs || [])
      } catch (error) {
        console.error('Failed to fetch documents:', error)
      } finally {
        setLoadingDocuments(false)
      }
    }
    fetchDocuments()
  }, [])

  useEffect(() => {
    form.setFieldsValue({
      name: title || '',
      description: description || '',
      notes: notes || '',
      sections: sections || UNIFIED_BUSINESS_PERMIT_SECTIONS,
    })
  }, [title, description, notes, sections, form])

  return (
    <div>
      <Form form={form} layout="vertical" requiredMark={false} onValuesChange={handleFormValuesChange}>
        <Form.Item
          name="name"
          label={<span>Form Name<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
          rules={[
            {
              validator: (_, value) => {
                if (!value || value.trim() === '') {
                  return Promise.reject('Form Name is required')
                }
                return Promise.resolve()
              }
            }
          ]}
        >
          <Input placeholder="Enter form name" />
        </Form.Item>
        <Form.Item
          name="description"
          label={<span>Description<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
          rules={[
            {
              validator: (_, value) => {
                if (!value || value.trim() === '') {
                  return Promise.reject('Description is required')
                }
                return Promise.resolve()
              }
            }
          ]}
        >
          <Input.TextArea rows={4} placeholder="Enter form description" />
        </Form.Item>
        <Form.Item
          name="claimableDocuments"
          label={<span>Claimable Documents<span style={{ color: token.colorError, marginLeft: 4 }}>*</span></span>}
          rules={[
            {
              validator: (_, value) => {
                if (!value || value.length === 0) {
                  return Promise.reject('At least one claimable document is required')
                }
                return Promise.resolve()
              }
            }
          ]}
        >
          <Select
            mode="multiple"
            placeholder="Select claimable documents associated with this form"
            loading={loadingDocuments}
            allowClear
            options={documents.map(doc => ({
              label: doc.name,
              value: doc._id,
            }))}
          />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={4} placeholder="Admin notes (hidden from applicants)" />
        </Form.Item>
        <Form.Item name="sections" hidden>
          <Input />
        </Form.Item>
      </Form>

      <div>
        <Text style={{ marginBottom: 8, display: 'block' }}>Form Sections</Text>
        <FormContentEditor
          ref={editorRef}
          initialSections={sections || UNIFIED_BUSINESS_PERMIT_SECTIONS}
          definitionId="unified-business-permit"
          onChange={() => {
            const newSections = editorRef.current?.getSections()
            if (newSections) {
              const currentValues = form.getFieldsValue()
              const allValues = { ...currentValues, sections: newSections }
              form.setFieldsValue({ sections: newSections })
              handleFormValuesChange({ sections: newSections }, allValues)
            }
          }}
        />
      </div>
    </div>
  )
}
