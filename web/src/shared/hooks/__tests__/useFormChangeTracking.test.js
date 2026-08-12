import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormChangeTracking } from '../useFormChangeTracking';

describe('useFormChangeTracking', () => {
  const initialValues = {
    name: 'Original Name',
    description: 'Original Description',
    notes: 'Original Notes',
    postRequirementId: 'req-1',
  };

  it('shows only the field that actually changed', () => {
    const { result } = renderHook(() => useFormChangeTracking(initialValues));

    act(() => {
      result.current.handleValuesChange(
        { name: 'New Name' },
        { ...initialValues, name: 'New Name' }
      );
    });

    expect(result.current.hasChanges).toBe(true);
    expect(result.current.changedFields).toHaveLength(1);
    expect(result.current.changedFields[0].field).toBe('Name');
  });

  it('keeps a full snapshot when allValues is partial', () => {
    const { result } = renderHook(() => useFormChangeTracking(initialValues));

    act(() => {
      // onValuesChange sometimes passes only the changed values
      result.current.handleValuesChange({ name: 'New Name' }, { name: 'New Name' });
    });

    expect(result.current.hasChanges).toBe(true);
    expect(result.current.changedFields).toHaveLength(1);
    expect(result.current.changedFields[0].field).toBe('Name');

    // Now make another single-field change with a partial allValues
    act(() => {
      result.current.handleValuesChange(
        { description: 'New Description' },
        { description: 'New Description' }
      );
    });

    expect(result.current.hasChanges).toBe(true);
    expect(result.current.changedFields).toHaveLength(2);
    expect(result.current.changedFields.map((f) => f.field).sort()).toEqual([
      'Description',
      'Name',
    ]);
  });

  it('does not report non-form baseline keys as changes', () => {
    const { result } = renderHook(() =>
      useFormChangeTracking({
        ...initialValues,
        isActive: true,
        _id: 'abc123',
      })
    );

    act(() => {
      result.current.handleValuesChange(
        { name: 'New Name' },
        { ...initialValues, name: 'New Name' }
      );
    });

    expect(result.current.changedFields).toHaveLength(1);
    expect(result.current.changedFields[0].field).toBe('Name');
  });

  it('resets tracking and baseline when reset is called', () => {
    const { result } = renderHook(() => useFormChangeTracking(initialValues));

    act(() => {
      result.current.handleValuesChange(
        { name: 'New Name' },
        { ...initialValues, name: 'New Name' }
      );
    });

    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.resetChangeTracking({
        ...initialValues,
        name: 'New Name',
      });
    });

    expect(result.current.hasChanges).toBe(false);
    expect(result.current.changedFields).toHaveLength(0);
  });
});
