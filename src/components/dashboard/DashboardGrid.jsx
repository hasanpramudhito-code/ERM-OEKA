// components/dashboard/DashboardGrid.jsx
import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  IconButton,
  Chip
} from '@mui/material';
import {
  Edit,
  Save,
  Add,
  Delete,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { useDashboard } from '../../contexts/DashboardContext';

const DashboardGrid = () => {
  const { 
    widgets, 
    isEditMode, 
    setIsEditMode, 
    addWidget, 
    removeWidget, 
    updateWidgetSize 
  } = useDashboard();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Executive Dashboard
        </Typography>
        
        <Button
          variant={isEditMode ? "contained" : "outlined"}
          onClick={() => setIsEditMode(!isEditMode)}
          startIcon={isEditMode ? <Save /> : <Edit />}
          color={isEditMode ? "success" : "primary"}
        >
          {isEditMode ? 'Save Layout' : 'Customize Dashboard'}
        </Button>
      </Box>

      {/* Dashboard Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 2,
          alignItems: 'start'
        }}
      >
        {widgets.map((widget) => (
          <Box
            key={widget.id}
            sx={{
              gridColumn: `span ${widget.colSpan}`,
              gridRow: `span ${widget.rowSpan}`,
              minHeight: widget.rowSpan * 100
            }}
          >
            <Card 
              sx={{ 
                height: '100%',
                border: isEditMode ? '2px dashed' : '1px solid',
                borderColor: isEditMode ? 'primary.main' : 'divider',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Edit Controls */}
              {isEditMode && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8, 
                  display: 'flex', 
                  gap: 1,
                  zIndex: 10 
                }}>
                  <IconButton 
                    size="small" 
                    onClick={() => removeWidget(widget.id)}
                    color="error"
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              )}

              <CardContent sx={{ height: '100%' }}>
                <WidgetRenderer widget={widget} />
                
                {/* Size Controls */}
                {isEditMode && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center' }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => updateWidgetSize(widget.id, Math.max(2, widget.colSpan - 1), widget.rowSpan)}
                    >
                      Width -
                    </Button>
                    <Chip 
                      label={`${widget.colSpan}×${widget.rowSpan}`} 
                      size="small" 
                      variant="outlined" 
                    />
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => updateWidgetSize(widget.id, Math.min(6, widget.colSpan + 1), widget.rowSpan)}
                    >
                      Width +
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Add Widget Panel */}
      {isEditMode && (
        <Card sx={{ mt: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            📦 Add Widgets
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              onClick={() => addWidget('stats')}
              startIcon={<Add />}
            >
              Statistics Card
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => addWidget('heatmap')}
              startIcon={<Add />}
            >
              Risk Heatmap
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => addWidget('progress')}
              startIcon={<Add />}
            >
              Progress Chart
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => addWidget('kpi')}
              startIcon={<Add />}
            >
              KPI Metric
            </Button>
          </Box>
        </Card>
      )}
    </Box>
  );
};

// Widget Components
const WidgetRenderer = ({ widget }) => {
  switch (widget.type) {
    case 'stats':
      return <StatsWidget widget={widget} />;
    case 'heatmap':
      return <HeatmapWidget widget={widget} />;
    case 'progress':
      return <ProgressWidget widget={widget} />;
    case 'kpi':
      return <KPIWidget widget={widget} />;
    default:
      return <DefaultWidget widget={widget} />;
  }
};

const StatsWidget = ({ widget }) => {
  const { value, trend } = widget.data;
  const isPositive = trend > 0;

  return (
    <Box sx={{ textAlign: 'center', py: 1 }}>
      <Typography variant="h3" component="div" fontWeight="bold" gutterBottom>
        {value}
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {widget.title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        {isPositive ? 
          <TrendingUp sx={{ color: 'success.main' }} /> : 
          <TrendingDown sx={{ color: 'error.main' }} />
        }
        <Chip 
          label={`${isPositive ? '+' : ''}${trend}%`}
          size="small"
          color={isPositive ? 'success' : 'error'}
          variant="outlined"
        />
      </Box>
    </Box>
  );
};

const HeatmapWidget = ({ widget }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {widget.title}
      </Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: 1,
        mt: 2 
      }}>
        {Array.from({ length: 25 }).map((_, index) => (
          <Box
            key={index}
            sx={{
              height: 30,
              backgroundColor: index % 6 === 0 ? '#ff6b6b' : 
                            index % 4 === 0 ? '#4ecdc4' : 
                            index % 3 === 0 ? '#45b7d1' : '#96ceb4',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            {index % 5 === 0 ? 'H' : 'M'}
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Risk Distribution Matrix
      </Typography>
    </Box>
  );
};

const ProgressWidget = ({ widget }) => {
  const progress = widget.data.progress || 0;
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {widget.title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {progress}%
            </Typography>
          </Box>
          <Box 
            sx={{ 
              width: '100%', 
              height: 8, 
              backgroundColor: 'grey.300', 
              borderRadius: 4 
            }}
          >
            <Box 
              sx={{ 
                width: `${progress}%`, 
                height: '100%', 
                backgroundColor: 'primary.main',
                borderRadius: 4
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const KPIWidget = ({ widget }) => {
  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Typography variant="h4" component="div" fontWeight="bold" gutterBottom>
        {widget.data.value}
      </Typography>
      <Typography variant="h6" color="text.secondary">
        {widget.title}
      </Typography>
    </Box>
  );
};

const DefaultWidget = ({ widget }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {widget.title}
      </Typography>
      <Typography color="text.secondary">
        Widget content coming soon...
      </Typography>
    </Box>
  );
};

export default DashboardGrid;