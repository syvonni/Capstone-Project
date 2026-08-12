/**
 * Alaminos Address Fields
 *
 * Address fields for businesses within Alaminos City only: Barangay + House/Building/Street.
 * Postal code is optional. Uses PSGC API for Alaminos City barangays.
 */

import { useState, useEffect, useCallback } from 'react';
import { Form } from 'antd';
import { Select, Input, theme } from 'antd';
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx';
import { fetchBarangays } from '@/shared/services/psgcService';

const { Option } = Select;
const { useToken } = theme;

// Alaminos City, Pangasinan – PSGC code
const ALAMINOS_CITY_CODE = '015503000';

const fieldName = (namePrefix, name) => (namePrefix ? [...[].concat(namePrefix), name] : name);

export default function AlaminosAddressFields({
  form,
  namePrefix = '',
  required = false,
  disabled = false,
  initialStreet = '',
  initialPostalCode = '',
  onAddressChange,
  label = '',
}) {
  const { token } = useToken();
  const field = useCallback((name) => fieldName(namePrefix, name), [namePrefix]);

  const [barangays, setBarangays] = useState([]);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingBarangays(true);
    fetchBarangays(ALAMINOS_CITY_CODE)
      .then((data) => {
        if (!cancelled) setBarangays(data || []);
      })
      .catch((err) => {
        console.error('Failed to load Alaminos barangays:', err);
        if (!cancelled) setBarangays([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBarangays(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBarangayChange = (value, option) => {
    if (option) {
      form.setFieldValue(field('barangayName'), option.children);
    }
    onAddressChange?.();
  };

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Form.Item
          layout="vertical"
          name={field('streetAddress')}
          label={
            required ? (
              <span>
                {label ? `${label} - ` : ''}House/Building Number & Street
                <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              (label ? `${label} - ` : '') + 'House/Building Number & Street'
            )
          }
          initialValue={initialStreet}
          rules={
            required
              ? [{ required: true, message: 'Please enter house/building no. & street' }]
              : []
          }
          required={false}
          style={{ marginBottom: 0 }}
        >
          <Input placeholder="e.g., 123 Rizal Street" disabled={disabled} />
        </Form.Item>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <Form.Item
            layout="vertical"
            name={field('barangay')}
            label={
              required ? (
                <span>
                  Barangay in Alaminos
                  <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
                </span>
              ) : (
                'Barangay'
              )
            }
            rules={required ? [{ required: true, message: 'Please select barangay' }] : []}
            required={false}
            style={{ marginBottom: 0 }}
          >
            <Select
              showSearch
              placeholder="Select Barangay"
              loading={loadingBarangays}
              disabled={disabled || loadingBarangays}
              onChange={handleBarangayChange}
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={
                loadingBarangays ? <LottieSpinner size="small" /> : 'No barangays found'
              }
            >
              {barangays.map((brgy) => (
                <Option key={brgy.code} value={brgy.code}>
                  {brgy.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name={field('barangayName')}
            layout="vertical"
            style={{ marginBottom: 0 }}
            hidden
          >
            <Input />
          </Form.Item>
        </div>
        <div style={{ flex: 1 }}>
          <Form.Item
            layout="vertical"
            name={field('postalCode')}
            label="Postal Code (optional)"
            initialValue={initialPostalCode}
            rules={[
              { pattern: /^\d{4}$/, message: 'Postal code must be 4 digits', required: false },
            ]}
            style={{ marginBottom: 0 }}
          >
            <Input placeholder="e.g., 2404" maxLength={4} disabled={disabled} />
          </Form.Item>
        </div>
      </div>
    </>
  );
}
