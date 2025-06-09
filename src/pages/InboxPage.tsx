import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Dialog,
  Fab,
  Badge,
  Container
} from '@mui/material';
import { Add as AddIcon, Lightbulb as LightbulbIcon } from '@mui/icons-material';
import { InboxCapture } from '../components/InboxCapture';
import { InboxList } from '../components/InboxList';
import { useInbox } from '../hooks/useInbox';
import { InboxItemStatus, InboxItem } from '../types/index';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inbox-tabpanel-${index}`}
      aria-labelledby={`inbox-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const InboxPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [captureDialog, setCaptureDialog] = useState(false);
  const [convertDialog, setConvertDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);

  const {
    inboxItems,
    loading,
    error,
    getCapturedItems,
    getProcessedItems,
    getArchivedItems
  } = useInbox();

  const capturedItems = getCapturedItems();
  const processedItems = getProcessedItems();
  const archivedItems = getArchivedItems();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleConvert = (item: InboxItem) => {
    setSelectedItem(item);
    setConvertDialog(true);
  };

  const getTabContent = () => {
    switch (tabValue) {
      case 0:
        return <InboxList items={capturedItems} onConvert={handleConvert} />;
      case 1:
        return <InboxList items={processedItems} />;
      case 2:
        return <InboxList items={archivedItems} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography>Loading inbox...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography color="error">Error loading inbox: {error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LightbulbIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Inbox
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCaptureDialog(true)}
        >
          Capture Idea
        </Button>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        A place to capture ideas, thoughts, and inspirations. Convert them into areas, goals, projects, or tasks when you're ready.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            label={
              <Badge badgeContent={capturedItems.length} color="primary" showZero>
                Captured
              </Badge>
            }
          />
          <Tab 
            label={
              <Badge badgeContent={processedItems.length} color="secondary" showZero>
                Processed
              </Badge>
            }
          />
          <Tab 
            label={
              <Badge badgeContent={archivedItems.length} color="default" showZero>
                Archived
              </Badge>
            }
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {capturedItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <LightbulbIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No ideas captured yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start capturing your thoughts and ideas to organize them later
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCaptureDialog(true)}
            >
              Capture Your First Idea
            </Button>
          </Box>
        ) : (
          getTabContent()
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {getTabContent()}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {getTabContent()}
      </TabPanel>

      <Fab
        color="primary"
        aria-label="capture idea"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => setCaptureDialog(true)}
      >
        <AddIcon />
      </Fab>

      <Dialog 
        open={captureDialog} 
        onClose={() => setCaptureDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <InboxCapture onClose={() => setCaptureDialog(false)} />
      </Dialog>

      <Dialog
        open={convertDialog}
        onClose={() => setConvertDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Convert Idea
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Convert "{selectedItem?.title}" into a specific type of item.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Conversion feature coming soon! You can manually create areas, goals, projects, or tasks based on this idea.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button onClick={() => setConvertDialog(false)}>
              Close
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Container>
  );
};