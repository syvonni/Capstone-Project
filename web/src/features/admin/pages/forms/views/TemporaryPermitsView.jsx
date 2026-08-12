import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid } from 'antd';
import ResponsiveSplitLayout from '@/shared/components/ResponsiveSplitLayout';
import {
  TemporaryPermitListPanel,
  FormDetailPanel,
  TemporaryPermitStatsPanel,
} from '../components';
import AddTemporaryPermitModal from '../components/modals/AddTemporaryPermitModal';

const { useBreakpoint } = Grid;

export default function TemporaryPermitsView() {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [showAddTemporaryPermitModal, setShowAddTemporaryPermitModal] = useState(false);
  const [showStats, setShowStats] = useState(!isMobile);

  // Sync showStats with breakpoint and selectedId state
  // Stats should be enabled on desktop only when no form is selected
  useEffect(() => {
    const formIdFromUrl = searchParams.get('selectedId');
    setShowStats(!isMobile && !formIdFromUrl);
  }, [isMobile, searchParams]);

  // Handle URL query param for direct form selection
  useEffect(() => {
    const formIdFromUrl = searchParams.get('selectedId');
    if (formIdFromUrl) {
      setSelectedFormId(formIdFromUrl);
    }
  }, [searchParams]);

  const handleFormSelect = (formId) => {
    console.log('handleFormSelect called with formId:', formId);
    setSelectedFormId(formId);
    setSearchParams({ selectedId: formId });
    setShowStats(false);
  };

  const handleBackToMenu = () => {
    setSelectedFormId(null);
    setSearchParams({});
  };

  const handleAddTemporaryPermit = () => {
    setShowAddTemporaryPermitModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddTemporaryPermitModal(false);
  };

  const handleAddModalSuccess = () => {
    setShowAddTemporaryPermitModal(false);
    // TODO: Refresh form list when backend integration is added
  };

  const handleStatsToggle = () => {
    setShowStats((prev) => {
      const newValue = !prev;
      if (newValue && selectedFormId) {
        setSelectedFormId(null);
        setSearchParams({});
      }
      return newValue;
    });
  };

  const handleDrawerClose = () => {
    // If closing drawer and no form was selected (viewing stats), disable stats
    if (!selectedFormId) {
      setShowStats(false);
    }
    setSelectedFormId(null);
    setSearchParams({});
  };

  return (
    <>
      <ResponsiveSplitLayout
        drawerTitle={showStats ? 'Temporary Permit Overview' : 'Temporary Permit Details'}
        listContent={
          <TemporaryPermitListPanel
            onSelect={handleFormSelect}
            selectedId={selectedFormId}
            onAddTemporaryPermit={handleAddTemporaryPermit}
            enableStats={true}
            statsActive={showStats}
            onStatsToggle={handleStatsToggle}
          />
        }
        detailContent={
          selectedFormId ? (
            <FormDetailPanel formId={selectedFormId} onBackToMenu={handleBackToMenu} />
          ) : showStats ? (
            <TemporaryPermitStatsPanel />
          ) : null
        }
        onDrawerClose={handleDrawerClose}
        drawerOpen={!!selectedFormId || showStats}
        mobileDrawerPlacement="bottom"
      />
      <AddTemporaryPermitModal
        open={showAddTemporaryPermitModal}
        onClose={handleCloseAddModal}
        onSuccess={handleAddModalSuccess}
      />
    </>
  );
}
