import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils/renderWithProviders';
import InspectionItemConfiguration from '../InspectionItemConfiguration';
import { Form } from 'antd';

// Mock the services
vi.mock('@/features/admin/services/violationService', () => ({
  getViolations: vi.fn(() =>
    Promise.resolve([
      { _id: '1', name: 'Fire Safety Violation', isActive: true },
      { _id: '2', name: 'Health Code Violation', isActive: true },
    ])
  ),
}));

describe('InspectionItemConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const TestWrapper = () => {
        const [form] = Form.useForm();
        return (
          <InspectionItemConfiguration
            form={form}
            handleFormValuesChange={vi.fn()}
            initialValues={{}}
          />
        );
      };
      const { container } = renderWithProviders(<TestWrapper />);
      expect(container).toBeInTheDocument();
    });

    it('renders name input field', () => {
      const TestWrapper = () => {
        const [form] = Form.useForm();
        return (
          <InspectionItemConfiguration
            form={form}
            handleFormValuesChange={vi.fn()}
            initialValues={{}}
          />
        );
      };
      renderWithProviders(<TestWrapper />);
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('renders question textarea', () => {
      const TestWrapper = () => {
        const [form] = Form.useForm();
        return (
          <InspectionItemConfiguration
            form={form}
            handleFormValuesChange={vi.fn()}
            initialValues={{}}
          />
        );
      };
      renderWithProviders(<TestWrapper />);
      expect(screen.getByText('Question')).toBeInTheDocument();
    });

    it('renders notes textarea', () => {
      const TestWrapper = () => {
        const [form] = Form.useForm();
        return (
          <InspectionItemConfiguration
            form={form}
            handleFormValuesChange={vi.fn()}
            initialValues={{}}
          />
        );
      };
      renderWithProviders(<TestWrapper />);
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('renders violation select', () => {
      const TestWrapper = () => {
        const [form] = Form.useForm();
        return (
          <InspectionItemConfiguration
            form={form}
            handleFormValuesChange={vi.fn()}
            initialValues={{}}
          />
        );
      };
      renderWithProviders(<TestWrapper />);
      expect(screen.getByText('Violation')).toBeInTheDocument();
    });

    it('renders legal basis section', () => {
      const TestWrapper = () => {
        const [form] = Form.useForm();
        return (
          <InspectionItemConfiguration
            form={form}
            handleFormValuesChange={vi.fn()}
            initialValues={{}}
          />
        );
      };
      renderWithProviders(<TestWrapper />);
      expect(screen.getByText('Legal Basis')).toBeInTheDocument();
    });

    it('renders add legal basis button', () => {
      const TestWrapper = () => {
        const [form] = Form.useForm();
        return (
          <InspectionItemConfiguration
            form={form}
            handleFormValuesChange={vi.fn()}
            initialValues={{}}
          />
        );
      };
      renderWithProviders(<TestWrapper />);
      expect(screen.getByText('Add Legal Basis')).toBeInTheDocument();
    });
  });
});
