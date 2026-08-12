import { Form, Input, Select } from 'antd';
import { INDUSTRY_CATEGORIES } from '@/shared/constants/industryCategories';

const { TextArea } = Input;

const CATEGORY_OPTIONS = INDUSTRY_CATEGORIES.map((category) => ({
  value: category.taxCode,
  label: category.name,
}));

export default function LobConfiguration({
  form,
  handleFormValuesChange,
  variables,
  documents,
  postRequirements,
}) {
  const variableFeeOptions = variables.map((rule) => ({
    value: rule._id,
    label:
      rule.calculationMethod === 'classification'
        ? `${rule.name} (classification-based)`
        : rule.calculationMethod === 'bracketed'
          ? `${rule.name} - ${rule.unit} (bracketed)`
          : rule.calculationMethod === 'yes_no'
            ? `${rule.name} - ₱${rule.fixedAmount?.toLocaleString() || 0}`
            : `${rule.name} - ₱${rule.baseRate?.toLocaleString() || 0} ${rule.unit}`,
  }));

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onValuesChange={handleFormValuesChange}
      >
        <Form.Item name="category" label="Category">
          <Select
            placeholder="Select category"
            options={CATEGORY_OPTIONS}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item name="notes" label="Notes" initialValue="">
          <TextArea
            placeholder="Add administrative notes for this LOB"
            rows={3}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item name="variables" label="Variables" initialValue={[]}>
          <Select
            mode="multiple"
            placeholder="Select variable fee rules"
            options={variableFeeOptions}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item name="documents" label="Claimable Documents" initialValue={[]}>
          <Select
            mode="multiple"
            placeholder="Select claimable documents"
            options={documents.map((doc) => ({ value: doc._id, label: doc.name }))}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name={['postRequirements', 'required']}
          label="Post Requirements"
          initialValue={[]}
        >
          <Select
            mode="multiple"
            placeholder="Select required post requirements"
            options={postRequirements.map((req) => ({ value: req._id, label: req.name }))}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name={['postRequirements', 'conditional']}
          label="Conditional Post Requirements"
          initialValue={[]}
        >
          <Select
            mode="multiple"
            placeholder="Select conditional post requirements"
            options={postRequirements.map((req) => ({
              value: req._id,
              label: req.name,
              question: req.question,
            }))}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </div>
  );
}
