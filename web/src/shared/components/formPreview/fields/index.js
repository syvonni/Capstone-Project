import TextField from './TextField'
import TextAreaField from './TextAreaField'
import NumberField from './NumberField'
import EmailField from './EmailField'
import PhoneField from './PhoneField'
import DateField from './DateField'
import DateRangeField from './DateRangeField'
import SelectField from './SelectField'
import RadioField from './RadioField'
import CheckboxField from './CheckboxField'
import SwitchField from './SwitchField'
import SliderField from './SliderField'
import TimeField from './TimeField'
import AddressField from './AddressField'
import AlaminosAddressField from './AlaminosAddressField'
import FileField from './FileField'
import CategoryUploadField from './CategoryUploadField'
import DownloadField from './DownloadField'
import RepeatableGroupField from './RepeatableGroupField'
import LobSectionField from './LobSectionField'
import DefaultField from './DefaultField'

export const fieldRenderers = {
  text: TextField,
  textarea: TextAreaField,
  number: NumberField,
  email: EmailField,
  phone: PhoneField,
  date: DateField,
  date_range: DateRangeField,
  select: SelectField,
  multiselect: SelectField,
  radio: RadioField,
  checkbox: CheckboxField,
  switch: SwitchField,
  slider: SliderField,
  time: TimeField,
  address: AddressField,
  address_alaminos: AlaminosAddressField,
  file: FileField,
  category_upload: CategoryUploadField,
  download: DownloadField,
  repeatable_group: RepeatableGroupField,
  lob_section: LobSectionField,
  default: DefaultField,
}

export { FieldContext, useFieldContext } from './FieldContext'
export { default as DocumentUpload } from './shared/DocumentUpload'
export { default as MetadataFields } from './shared/MetadataFields'
export { FieldLabel } from './shared/FieldLabel'
export { useRequestChangeStyle, getRequestChangeReason } from './shared/useRequestChangeStyle'
