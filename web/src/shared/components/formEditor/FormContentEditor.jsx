import { useState, useImperativeHandle, forwardRef, useEffect, useCallback, useRef } from 'react'
import { Button, theme } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createId } from './utils'
import SectionPanel from './SectionPanel'

// ─── Helpers: convert API sections ↔ editor sections ───────────────
/** Ensure each section/item has a local id for React keys */
function hydrateFromApi(apiSections) {
  if (!apiSections || !Array.isArray(apiSections) || apiSections.length === 0) {
    return []
  }
  return apiSections.map((s) => ({
    id: createId(),
    sectionName: s.sectionName || s.category || '',
    type: s.type || '',
    description: s.description || '',
    source: s.source || '',
    notes: s.notes || '',
    showWhen: s.showWhen && typeof s.showWhen === 'object' && s.showWhen.field ? { ...s.showWhen } : null,
    items: (s.items || []).map((item) => ({
      id: createId(),
      label: item.label || '',
      type: item.type || 'file',
      key: item.key || '',
      required: item.required ?? true,
      helpText: item.helpText || item.notes || '',
      placeholder: item.placeholder || '',
      validation: item.validation || {},
      dropdownSource: item.dropdownSource || 'static',
      dropdownOptions: item.dropdownOptions || [],
      span: item.span ?? 24,
      metadataFields: item.metadataFields || [],
      ...(item.type === 'download' ? {
        downloadFileName: item.downloadFileName || '',
        downloadFileSize: item.downloadFileSize || 0,
        downloadFileType: item.downloadFileType || '',
        downloadFileUrl: item.downloadFileUrl || '',
      } : {}),
      ...(item.type === 'repeatable_group' ? {
        groupFields: (item.groupFields || []).map((gf) => ({
          id: createId(),
          label: gf.label || '',
          type: gf.type || 'text',
          key: gf.key || '',
          required: gf.required ?? true,
          placeholder: gf.placeholder || '',
          helpText: gf.helpText || '',
          span: gf.span ?? 8,
          validation: gf.validation || {},
          dropdownSource: gf.dropdownSource || 'static',
          dropdownOptions: gf.dropdownOptions || [],
        })),
        minRows: item.minRows ?? 1,
        maxRows: item.maxRows ?? 20,
      } : {}),
    })),
  }))
}

/** Strip local ids and produce clean API-ready sections */
function dehydrateForApi(editorSections) {
  return editorSections.map((s) => {
    const out = {
      sectionName: s.sectionName,
      type: s.type,
      description: s.description,
      source: s.source,
      notes: s.notes,
      items: s.items.map((item) => {
        const base = {
          label: item.label,
          type: item.type || 'file',
          key: item.key || '',
          required: item.required,
          notes: item.helpText || '',
          helpText: item.helpText || '',
          placeholder: item.placeholder || '',
          validation: item.validation || {},
          dropdownSource: item.dropdownSource || 'static',
          dropdownOptions: item.dropdownOptions || [],
          span: item.span ?? 24,
          metadataFields: item.metadataFields || [],
        }
        if (item.type === 'download') {
          base.downloadFileName = item.downloadFileName || ''
          base.downloadFileSize = item.downloadFileSize || 0
          base.downloadFileType = item.downloadFileType || ''
          base.downloadFileUrl = item.downloadFileUrl || ''
        }
        if (item.type === 'repeatable_group') {
          base.groupFields = (item.groupFields || []).map((gf) => ({
            label: gf.label || '',
            type: gf.type || 'text',
            key: gf.key || '',
            required: gf.required ?? true,
            placeholder: gf.placeholder || '',
            helpText: gf.helpText || '',
            span: gf.span ?? 8,
            validation: gf.validation || {},
            dropdownSource: gf.dropdownSource || 'static',
            dropdownOptions: gf.dropdownOptions || [],
          }))
          base.minRows = item.minRows ?? 1
          base.maxRows = item.maxRows ?? 20
        }
        return base
      }),
    }
    if (s.showWhen && typeof s.showWhen === 'object' && s.showWhen.field) {
      out.showWhen = s.showWhen.values !== undefined
        ? { field: s.showWhen.field, values: Array.isArray(s.showWhen.values) ? s.showWhen.values : [] }
        : { field: s.showWhen.field, value: s.showWhen.value }
    }
    return out
  })
}

// ─── Main editor ───────────────────────────────────────────────────
/**
 * Props:
 *   initialSections – array from API (or undefined for mock data)
 *   onChange        – called when content is modified (dirty tracking)
 *   isMobile        – responsive flag
 *
 * Ref handle:
 *   getSections()  – returns clean API-ready sections array
 *   getPendingFiles() – returns { sectionIdx, itemIdx, file } for download fields needing upload
 */
const FormContentEditor = forwardRef(function FormContentEditor({ initialSections, onChange, isMobile = false, definitionId, readOnly = false }, ref) {
  const { token } = theme.useToken()
  const isHydratingRef = useRef(false)
  const onChangeRef = useRef(onChange)

  const [sections, setSections] = useState(() => {
    if (initialSections !== undefined) {
      return hydrateFromApi(initialSections)
    }
    return []
  })

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Re-hydrate when initialSections prop changes (e.g. loading a different definition)
  useEffect(() => {
    if (initialSections !== undefined) {
      isHydratingRef.current = true
      setSections(hydrateFromApi(initialSections))
    }
  }, [initialSections])

  // Fire onChange after sections state is committed (not during hydration)
  useEffect(() => {
    if (isHydratingRef.current) {
      isHydratingRef.current = false
      return
    }
    onChangeRef.current?.()
  }, [sections])

  // Expose data extraction to parent via ref
  useImperativeHandle(ref, () => ({
    getSections: () => dehydrateForApi(sections),
    getRawSections: () => sections,
    setSections: (newSections) => {
      setSections(newSections)
    },
  }), [sections])

  const updateSection = useCallback((idx, updated) => {
    setSections((prev) => {
      const next = [...prev]
      next[idx] = updated
      return next
    })
  }, [])

  const deleteSection = useCallback((idx) => {
    setSections((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const moveSection = useCallback((idx, dir) => {
    setSections((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }, [])

  const addSection = useCallback(() => {
    setSections((prev) => [
      ...prev,
      {
        id: createId(),
        sectionName: '',
        source: '',
        notes: '',
        showWhen: null,
        items: [],
      },
    ])
  }, [])

  return (
    <div>
      {sections.map((section, idx) => (
        <SectionPanel
          key={section.id}
          section={section}
          sectionIndex={idx}
          onUpdate={(updated) => updateSection(idx, updated)}
          onDelete={() => deleteSection(idx)}
          onMoveUp={() => moveSection(idx, -1)}
          onMoveDown={() => moveSection(idx, 1)}
          isFirst={idx === 0}
          isLast={idx === sections.length - 1}
          token={token}
          isMobile={isMobile}
          definitionId={definitionId}
          readOnly={readOnly}
        />
      ))}
      {!readOnly && sections.every(s => s.type !== 'lob_section') && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={addSection}
          style={{ width: '100%' }}
        >
          Add section
        </Button>
      )}
    </div>
  )
})

export default FormContentEditor
