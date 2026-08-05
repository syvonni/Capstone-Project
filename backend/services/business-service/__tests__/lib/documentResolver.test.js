/**
 * Unit tests for documentResolver
 */

const {
  resolveTemplateTexts,
  renderDocumentHtml,
  formatFieldValue,
  escapeHtml,
} = require('../../src/lib/documentResolver');

describe('documentResolver', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escapeHtml('<div>content</div>')).toBe('&lt;div&gt;content&lt;/div&gt;');
      expect(escapeHtml('&nbsp;')).toBe('&amp;nbsp;');
      expect(escapeHtml("'quote'")).toBe('&#039;quote&#039;');
      expect(escapeHtml('"quote"')).toBe('&quot;quote&quot;');
    });

    it('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should handle numbers and booleans', () => {
      expect(escapeHtml(123)).toBe('123');
      expect(escapeHtml(true)).toBe('true');
    });
  });

  describe('formatFieldValue', () => {
    it('should format address objects', () => {
      const address = {
        unitBuildingName: 'Unit 123',
        street: 'Main St',
        barangay: 'Barangay 1',
        cityMunicipality: 'City',
        province: 'Province',
        zipCode: '1234',
      };
      expect(formatFieldValue(address, 'address')).toBe('Unit 123, Main St, Barangay 1, City, Province, 1234');
    });

    it('should format dates', () => {
      const date = new Date('2024-01-15');
      const formatted = formatFieldValue(date, 'date');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
    });

    it('should format date ranges', () => {
      const range = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      const formatted = formatFieldValue(range, 'date_range');
      expect(formatted).toContain('2024');
    });

    it('should format numbers', () => {
      expect(formatFieldValue(12345.67, 'number')).toBe('12,345.67');
      expect(formatFieldValue(1000000, 'number')).toBe('1,000,000');
    });

    it('should handle null and undefined', () => {
      expect(formatFieldValue(null, 'text')).toBe('');
      expect(formatFieldValue(undefined, 'text')).toBe('');
    });
  });

  describe('resolveTemplateTexts', () => {
    const mockApplication = {
      applicationReferenceNumber: 'APP-2024-001',
      applicationStatus: 'approved',
      formData: {
        businessName: 'Test Business',
        ownerName: 'John Doe',
      },
    };

    const mockBusinessProfile = {
      businesses: [
        {
          isPrimary: true,
          registeredBusinessName: 'Test Corp',
          businessTradeName: 'Test Biz',
          businessType: 'corporation',
          primaryLineOfBusiness: 'retail',
          location: {
            street: '123 Main St',
            barangay: 'Barangay 1',
            cityMunicipality: 'City',
          },
        },
      ],
    };

    it('should resolve form_field bindings', () => {
      const templateTexts = [
        {
          attributeName: 'businessName',
          sourceType: 'form_field',
          bindings: [{ formId: 'form-1', sectionIndex: 0, fieldKey: 'businessName' }],
        },
      ];

      const { resolved, unresolved } = resolveTemplateTexts(
        templateTexts,
        mockApplication,
        mockBusinessProfile,
        null
      );

      expect(resolved.businessName).toBe('Test Business');
      expect(unresolved).toHaveLength(0);
    });

    it('should resolve system fields', () => {
      const templateTexts = [
        {
          attributeName: 'appRef',
          sourceType: 'system',
          sourceKey: 'applicationReferenceNumber',
        },
        {
          attributeName: 'appStatus',
          sourceType: 'system',
          sourceKey: 'applicationStatus',
        },
      ];

      const { resolved, unresolved } = resolveTemplateTexts(
        templateTexts,
        mockApplication,
        mockBusinessProfile,
        null
      );

      expect(resolved.appRef).toBe('APP-2024-001');
      expect(resolved.appStatus).toBe('approved');
      expect(unresolved).toHaveLength(0);
    });

    it('should resolve business_profile fields', () => {
      const templateTexts = [
        {
          attributeName: 'regName',
          sourceType: 'business_profile',
          sourceKey: 'registeredBusinessName',
        },
        {
          attributeName: 'tradeName',
          sourceType: 'business_profile',
          sourceKey: 'businessTradeName',
        },
      ];

      const { resolved, unresolved } = resolveTemplateTexts(
        templateTexts,
        mockApplication,
        mockBusinessProfile,
        null
      );

      expect(resolved.regName).toBe('Test Corp');
      expect(resolved.tradeName).toBe('Test Biz');
      expect(unresolved).toHaveLength(0);
    });

    it('should resolve static values', () => {
      const templateTexts = [
        {
          attributeName: 'cityName',
          sourceType: 'static',
          staticValue: 'Alaminos City',
        },
      ];

      const { resolved, unresolved } = resolveTemplateTexts(
        templateTexts,
        mockApplication,
        mockBusinessProfile,
        null
      );

      expect(resolved.cityName).toBe('Alaminos City');
      expect(unresolved).toHaveLength(0);
    });

    it('should track unresolved attributes', () => {
      const templateTexts = [
        {
          attributeName: 'missingField',
          sourceType: 'form_field',
          bindings: [{ formId: 'form-1', sectionIndex: 0, fieldKey: 'nonExistent' }],
        },
      ];

      const { resolved, unresolved, warnings } = resolveTemplateTexts(
        templateTexts,
        mockApplication,
        mockBusinessProfile,
        null
      );

      expect(resolved.missingField).toBe('');
      expect(unresolved).toContain('missingField');
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should handle missing templateTexts', () => {
      const { resolved, unresolved, warnings } = resolveTemplateTexts(
        null,
        mockApplication,
        mockBusinessProfile,
        null
      );

      expect(resolved).toEqual({});
      expect(unresolved).toEqual([]);
      expect(warnings).toEqual([]);
    });

    it('should handle unknown source types', () => {
      const templateTexts = [
        {
          attributeName: 'test',
          sourceType: 'unknown_type',
        },
      ];

      const { resolved, unresolved, warnings } = resolveTemplateTexts(
        templateTexts,
        mockApplication,
        mockBusinessProfile,
        null
      );

      expect(unresolved).toContain('test');
      expect(warnings.some(w => w.reason.includes('Unknown sourceType'))).toBe(true);
    });
  });

  describe('renderDocumentHtml', () => {
    it('should replace placeholders with resolved values', () => {
      const templateHtml = '<div>Business: {{businessName}}</div><div>Owner: {{ownerName}}</div>';
      const resolvedValues = {
        businessName: 'Test Business',
        ownerName: 'John Doe',
      };

      const rendered = renderDocumentHtml(templateHtml, resolvedValues);

      expect(rendered).toContain('Test Business');
      expect(rendered).toContain('John Doe');
      expect(rendered).not.toContain('{{businessName}}');
      expect(rendered).not.toContain('{{ownerName}}');
    });

    it('should escape HTML in resolved values', () => {
      const templateHtml = '<div>{{content}}</div>';
      const resolvedValues = {
        content: '<script>alert("xss")</script>',
      };

      const rendered = renderDocumentHtml(templateHtml, resolvedValues);

      expect(rendered).toContain('&lt;script&gt;');
      expect(rendered).not.toContain('<script>');
    });

    it('should handle empty template', () => {
      const rendered = renderDocumentHtml('', {});
      expect(rendered).toBe('');
    });

    it('should handle null template', () => {
      const rendered = renderDocumentHtml(null, {});
      expect(rendered).toBe('');
    });

    it('should handle missing placeholders gracefully', () => {
      const templateHtml = '<div>{{missing}}</div>';
      const resolvedValues = {};

      const rendered = renderDocumentHtml(templateHtml, resolvedValues);

      expect(rendered).toContain('{{missing}}');
    });
  });
});
