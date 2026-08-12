/**
 * Philippine Address Fields Component
 *
 * Cascading select fields for Philippine addresses using PSGC API
 * Province → City/Municipality → Barangay
 */

import { useState, useEffect, useCallback } from 'react';
import { Form } from 'antd';
import { Select, Input, Row, Col, theme } from 'antd';
import LottieSpinner from '@/shared/components/graphics/LottieSpinner.jsx';
import {
  fetchProvinces,
  fetchCitiesMunicipalities,
  fetchBarangays,
  findProvinceByName,
  findCityByName,
  findBarangayByName,
} from '../services/psgcService';

const { Option } = Select;
const { useToken } = theme;

/**
 * Philippine Address Fields with cascading dropdowns
 *
 * @param {Object} props
 * @param {Object} props.form - Ant Design form instance
 * @param {string} [props.namePrefix] - Optional form field prefix (e.g. 'address' for address.streetAddress)
 * @param {boolean} props.required - Whether fields are required
 * @param {boolean} props.disabled - Whether fields are disabled
 * @param {string} props.initialProvince - Initial province name (from OCR)
 * @param {string} props.initialCity - Initial city name (from OCR)
 * @param {string} props.initialBarangay - Initial barangay name (from OCR)
 * @param {string} props.initialStreet - Initial street address (from OCR)
 * @param {string} props.initialPostalCode - Initial postal code (from OCR)
 * @param {Function} props.onAddressChange - Callback when address changes
 */
export default function PhilippineAddressFields({
  form,
  namePrefix = '',
  required = false,
  disabled = false,
  initialProvince = '',
  initialCity = '',
  initialBarangay = '',
  initialStreet = '',
  initialPostalCode = '',
  onAddressChange,
  variant,
  compactLayout = false,
  label = '',
}) {
  const { token } = useToken();
  const fieldName = useCallback(
    (name) => (namePrefix ? [...[].concat(namePrefix), name] : name),
    [namePrefix]
  );

  // Data states
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // Selected values
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  const provinceCode = Form.useWatch(fieldName('province'), form);
  const cityCode = Form.useWatch(fieldName('city'), form);

  // Load provinces
  const loadProvinces = useCallback(async () => {
    setLoadingProvinces(true);
    try {
      const data = await fetchProvinces();
      setProvinces(data);
    } catch (error) {
      console.error('Failed to load provinces:', error);
    } finally {
      setLoadingProvinces(false);
    }
  }, []);

  // Load cities for a province
  const loadCities = useCallback(async (provinceCode) => {
    if (!provinceCode) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      const data = await fetchCitiesMunicipalities(provinceCode);
      setCities(data);
    } catch (error) {
      console.error('Failed to load cities:', error);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  // Load barangays for a city
  const loadBarangays = useCallback(async (cityCode) => {
    if (!cityCode) {
      setBarangays([]);
      return;
    }

    setLoadingBarangays(true);
    try {
      const data = await fetchBarangays(cityCode);
      setBarangays(data);
    } catch (error) {
      console.error('Failed to load barangays:', error);
    } finally {
      setLoadingBarangays(false);
    }
  }, []);

  // Auto-match province from OCR text
  const autoMatchProvince = useCallback(
    async (provinceName) => {
      const match = await findProvinceByName(provinceName);
      if (match) {
        console.log(`Province matched: "${provinceName}" → "${match.name}"`);
        setSelectedProvince(match.code);
        form.setFieldValue(fieldName('province'), match.code);
        form.setFieldValue(fieldName('provinceName'), match.name);
        loadCities(match.code);
      } else {
        console.log(`Province not matched: "${provinceName}" - user needs to select manually`);
      }
    },
    [form, fieldName, loadCities]
  );

  // Auto-match city from OCR text
  const autoMatchCity = useCallback(
    async (cityName) => {
      if (!selectedProvince) return;

      // Clean up city name - handle common OCR issues
      let cleanCityName = cityName
        .replace(/GITY/gi, 'CITY') // G -> C
        .replace(/ClTY/gi, 'CITY') // l -> I
        .trim();

      // Handle partial city names (e.g., "Carlos City" should match "San Carlos City")
      const match = await findCityByName(cleanCityName, selectedProvince);
      if (match) {
        console.log(`City matched: "${cityName}" → "${match.name}"`);
        setSelectedCity(match.code);
        form.setFieldValue(fieldName('city'), match.code);
        form.setFieldValue(fieldName('cityName'), match.name);
        loadBarangays(match.code);
      } else {
        console.log(`City not matched: "${cityName}" - user needs to select manually`);
      }
    },
    [selectedProvince, form, fieldName, loadBarangays]
  );

  // Auto-match barangay from OCR text
  const autoMatchBarangay = useCallback(
    async (barangayName) => {
      if (!selectedCity) return;
      const match = await findBarangayByName(barangayName, selectedCity);
      if (match) {
        console.log(`Barangay matched: "${barangayName}" → "${match.name}"`);
        form.setFieldValue(fieldName('barangay'), match.code);
        form.setFieldValue(fieldName('barangayName'), match.name);
      } else {
        console.log(`Barangay not matched: "${barangayName}" - user needs to select manually`);
      }
    },
    [selectedCity, form, fieldName]
  );

  // Sync when province/city are set externally (e.g. prefill)
  useEffect(() => {
    if (provinceCode && provinceCode !== selectedProvince) {
      setSelectedProvince(provinceCode);
      loadCities(provinceCode);
    }
  }, [provinceCode, selectedProvince, loadCities]);

  useEffect(() => {
    if (cityCode && cityCode !== selectedCity) {
      setSelectedCity(cityCode);
      loadBarangays(cityCode);
    }
  }, [cityCode, selectedCity, loadBarangays]);

  // Load provinces on mount
  useEffect(() => {
    loadProvinces();
  }, [loadProvinces]);

  // Auto-match OCR values when provinces load
  useEffect(() => {
    if (provinces.length > 0 && initialProvince) {
      autoMatchProvince(initialProvince);
    }
  }, [provinces, initialProvince, autoMatchProvince]);

  // Auto-match city when cities load
  useEffect(() => {
    if (cities.length > 0 && initialCity) {
      autoMatchCity(initialCity);
    }
  }, [cities, initialCity, autoMatchCity]);

  // Auto-match barangay when barangays load
  useEffect(() => {
    if (barangays.length > 0 && initialBarangay) {
      autoMatchBarangay(initialBarangay);
    }
  }, [barangays, initialBarangay, autoMatchBarangay]);

  // Handle province change
  const handleProvinceChange = (value, option) => {
    setSelectedProvince(value);
    setSelectedCity(null);
    setCities([]);
    setBarangays([]);

    // Clear dependent fields
    form.setFieldValue(fieldName('city'), undefined);
    form.setFieldValue(fieldName('cityName'), undefined);
    form.setFieldValue(fieldName('barangay'), undefined);
    form.setFieldValue(fieldName('barangayName'), undefined);

    // Set province name for display/storage
    if (option) {
      form.setFieldValue(fieldName('provinceName'), option.children);
    }

    // Load cities for the selected province
    if (value) {
      loadCities(value);
    }

    onAddressChange?.();
  };

  // Handle city change
  const handleCityChange = (value, option) => {
    setSelectedCity(value);
    setBarangays([]);

    // Clear dependent field
    form.setFieldValue(fieldName('barangay'), undefined);
    form.setFieldValue(fieldName('barangayName'), undefined);

    // Set city name for display/storage
    if (option) {
      form.setFieldValue(fieldName('cityName'), option.children);
    }

    // Load barangays for the selected city
    if (value) {
      loadBarangays(value);
    }

    onAddressChange?.();
  };

  // Handle barangay change
  const handleBarangayChange = (value, option) => {
    // Set barangay name for display/storage
    if (option) {
      form.setFieldValue(fieldName('barangayName'), option.children);
    }

    onAddressChange?.();
  };

  // Filter option for search
  const filterOption = (input, option) => {
    return (option?.children ?? '').toLowerCase().includes(input.toLowerCase());
  };

  // Compact layout: all fields in single column (one per row)
  if (compactLayout) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Form.Item
          style={{ marginBottom: 12 }}
          name={fieldName('province')}
          layout="vertical"
          label={
            required ? (
              <span>
                Province<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              'Province'
            )
          }
          rules={
            required
              ? [
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject(new Error('Please select province'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]
              : []
          }
        >
          <Select
            showSearch
            placeholder="Province"
            loading={loadingProvinces}
            disabled={disabled || loadingProvinces}
            onChange={handleProvinceChange}
            filterOption={filterOption}
            notFoundContent={
              loadingProvinces ? <LottieSpinner size="small" /> : 'No provinces found'
            }
            variant={variant}
          >
            {provinces.map((province) => (
              <Option key={province.code} value={province.code}>
                {province.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          style={{ marginBottom: 12 }}
          name={fieldName('provinceName')}
          layout="vertical"
          hidden
        >
          <Input />
        </Form.Item>
        <Form.Item
          style={{ marginBottom: 12 }}
          name={fieldName('city')}
          layout="vertical"
          label={
            required ? (
              <span>
                City/Municipality<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              'City/Municipality'
            )
          }
          rules={
            required
              ? [
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject(new Error('Please select city/municipality'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]
              : []
          }
        >
          <Select
            showSearch
            placeholder={selectedProvince ? 'City/Municipality' : 'Select province first'}
            loading={loadingCities}
            disabled={disabled || !selectedProvince || loadingCities}
            onChange={handleCityChange}
            filterOption={filterOption}
            notFoundContent={
              loadingCities ? (
                <LottieSpinner size="small" />
              ) : !selectedProvince ? (
                'Select province first'
              ) : (
                'No cities found'
              )
            }
            variant={variant}
          >
            {cities.map((city) => (
              <Option key={city.code} value={city.code}>
                {city.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          style={{ marginBottom: 12 }}
          name={fieldName('cityName')}
          layout="vertical"
          hidden
        >
          <Input />
        </Form.Item>
        <Form.Item
          style={{ marginBottom: 12 }}
          layout="vertical"
          name={fieldName('barangay')}
          label={
            required ? (
              <span>
                Barangay<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              'Barangay'
            )
          }
          rules={
            required
              ? [
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject(new Error('Please select barangay'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]
              : []
          }
        >
          <Select
            showSearch
            placeholder={selectedCity ? 'Barangay' : 'Select city first'}
            loading={loadingBarangays}
            disabled={disabled || !selectedCity || loadingBarangays}
            onChange={handleBarangayChange}
            filterOption={filterOption}
            notFoundContent={
              loadingBarangays ? (
                <LottieSpinner size="small" />
              ) : !selectedCity ? (
                'Select city first'
              ) : (
                'No barangays found'
              )
            }
            variant={variant}
          >
            {barangays.map((barangay) => (
              <Option key={barangay.code} value={barangay.code}>
                {barangay.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          style={{ marginBottom: 12 }}
          name={fieldName('barangayName')}
          layout="vertical"
          hidden
        >
          <Input />
        </Form.Item>
        <Form.Item
          style={{ marginBottom: 12 }}
          name={fieldName('streetAddress')}
          layout="vertical"
          label={
            required ? (
              <span>
                {label ? `${label} - ` : ''}House/Building Number & Street
                <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              (label ? `${label} - ` : '') + 'House/Bldg No. & Street'
            )
          }
          initialValue={initialStreet}
          rules={
            required
              ? [
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject(
                          new Error('Please enter house/building no. & street')
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]
              : []
          }
        >
          <Input placeholder="e.g., 133 Roxas Boulevard" disabled={disabled} variant={variant} />
        </Form.Item>
        <Form.Item
          name={fieldName('postalCode')}
          style={{ marginBottom: 12 }}
          layout="vertical"
          label={
            required ? (
              <span>
                Postal Code<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              'Postal Code'
            )
          }
          initialValue={initialPostalCode}
          rules={[
            ...(required
              ? [
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject(new Error('Please enter postal code'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]
              : []),
            { pattern: /^\d{4}$/, message: 'Postal code must be 4 digits' },
          ]}
        >
          <Input placeholder="e.g., 2420" maxLength={4} disabled={disabled} variant={variant} />
        </Form.Item>
      </div>
    );
  }

  return (
    <Row gutter={16}>
      {/* Row 1: Street (2/3), Postal Code (1/3) */}
      <Col xs={24} md={16}>
        <Form.Item
          style={{ marginBottom: 12 }}
          layout="vertical"
          name={fieldName('streetAddress')}
          label={
            required ? (
              <span>
                {label ? `${label} - ` : ''}House/Bldg No. & Street
                <span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              (label ? `${label} - ` : '') + 'House/Bldg No. & Street'
            )
          }
          initialValue={initialStreet}
          rules={
            required
              ? [
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject(
                          new Error('Please enter house/building no. & street')
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]
              : []
          }
        >
          <Input placeholder="e.g., 133 Roxas Boulevard" disabled={disabled} variant={variant} />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item
          layout="vertical"
          name={fieldName('postalCode')}
          label={
            required ? (
              <span>
                Postal Code<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              'Postal Code'
            )
          }
          initialValue={initialPostalCode}
          rules={[
            ...(required
              ? [
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject(new Error('Please enter postal code'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]
              : []),
            { pattern: /^\d{4}$/, message: 'Postal code must be 4 digits' },
          ]}
          style={{ marginBottom: 12 }}
        >
          <Input placeholder="e.g., 2420" maxLength={4} disabled={disabled} variant={variant} />
        </Form.Item>
      </Col>
      {/* Row 2: Province, City, Barangay — 3 per row */}
      <Col xs={24} sm={12} md={8}>
        <Form.Item
          style={{ marginBottom: 12 }}
          layout="vertical"
          name={fieldName('province')}
          label={
            required ? (
              <span>
                Province<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              'Province'
            )
          }
          rules={
            required
              ? [
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject(new Error('Please select province'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]
              : []
          }
        >
          <Select
            showSearch
            placeholder="Province"
            loading={loadingProvinces}
            disabled={disabled || loadingProvinces}
            onChange={handleProvinceChange}
            filterOption={filterOption}
            notFoundContent={
              loadingProvinces ? <LottieSpinner size="small" /> : 'No provinces found'
            }
            variant={variant}
          >
            {provinces.map((province) => (
              <Option key={province.code} value={province.code}>
                {province.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name={fieldName('provinceName')}
          layout="vertical"
          style={{ marginBottom: 12 }}
          hidden
        >
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Form.Item
          style={{ marginBottom: 12 }}
          layout="vertical"
          name={fieldName('city')}
          label={
            required ? (
              <span>
                City/Municipality<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              'City/Municipality'
            )
          }
          rules={
            required
              ? [
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject(new Error('Please select city/municipality'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]
              : []
          }
        >
          <Select
            showSearch
            placeholder={selectedProvince ? 'City/Municipality' : 'Select province first'}
            loading={loadingCities}
            disabled={disabled || !selectedProvince || loadingCities}
            onChange={handleCityChange}
            filterOption={filterOption}
            notFoundContent={
              loadingCities ? (
                <LottieSpinner size="small" />
              ) : !selectedProvince ? (
                'Select province first'
              ) : (
                'No cities found'
              )
            }
            variant={variant}
          >
            {cities.map((city) => (
              <Option key={city.code} value={city.code}>
                {city.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name={fieldName('cityName')} style={{ marginBottom: 12 }} hidden>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Form.Item
          style={{ marginBottom: 12 }}
          layout="vertical"
          name={fieldName('barangay')}
          label={
            required ? (
              <span>
                Barangay<span style={{ color: token.colorError, marginLeft: 4 }}>*</span>
              </span>
            ) : (
              'Barangay'
            )
          }
          rules={
            required
              ? [
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null || value === '') {
                        return Promise.reject(new Error('Please select barangay'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]
              : []
          }
        >
          <Select
            showSearch
            placeholder={selectedCity ? 'Barangay' : 'Select city first'}
            loading={loadingBarangays}
            disabled={disabled || !selectedCity || loadingBarangays}
            onChange={handleBarangayChange}
            filterOption={filterOption}
            notFoundContent={
              loadingBarangays ? (
                <LottieSpinner size="small" />
              ) : !selectedCity ? (
                'Select city first'
              ) : (
                'No barangays found'
              )
            }
            variant={variant}
          >
            {barangays.map((barangay) => (
              <Option key={barangay.code} value={barangay.code}>
                {barangay.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name={fieldName('barangayName')} style={{ marginBottom: 12 }} hidden>
          <Input />
        </Form.Item>
      </Col>
    </Row>
  );
}
