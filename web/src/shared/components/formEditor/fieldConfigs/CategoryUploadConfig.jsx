import DropdownOptionsEditor from '../DropdownOptionsEditor'

export default function CategoryUploadConfig({ field, onUpdate }) {
  return (
    <>
      <DropdownOptionsEditor field={field} onUpdate={onUpdate} showMetadataFields={true} />
    </>
  )
}
