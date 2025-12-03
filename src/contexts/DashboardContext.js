// contexts/DashboardContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [widgets, setWidgets] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem('erm-dashboard-layout');
    if (saved) {
      setWidgets(JSON.parse(saved));
    } else {
      // Default layout
      setWidgets([
        { id: 1, type: 'stats', title: 'Total Risks', colSpan: 3, rowSpan: 1, data: { value: 156, trend: 12 } },
        { id: 2, type: 'stats', title: 'Pending Actions', colSpan: 3, rowSpan: 1, data: { value: 23, trend: -5 } },
        { id: 3, type: 'heatmap', title: 'Risk Heatmap', colSpan: 6, rowSpan: 2, data: {} },
        { id: 4, type: 'progress', title: 'Assessment Progress', colSpan: 4, rowSpan: 1, data: { progress: 65 } },
        { id: 5, type: 'activities', title: 'Recent Activities', colSpan: 4, rowSpan: 1, data: {} },
        { id: 6, type: 'kpi', title: 'Completion Rate', colSpan: 4, rowSpan: 1, data: { value: '78%' } },
      ]);
    }
  }, []);

  // Save ke localStorage
  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem('erm-dashboard-layout', JSON.stringify(widgets));
    }
  }, [widgets]);

  const addWidget = (type) => {
    const newWidget = {
      id: Date.now(),
      type,
      title: `New ${type}`,
      colSpan: 3,
      rowSpan: 1,
      data: getDefaultData(type)
    };
    setWidgets(prev => [...prev, newWidget]);
  };

  const removeWidget = (id) => {
    setWidgets(prev => prev.filter(widget => widget.id !== id));
  };

  const updateWidgetSize = (id, newColSpan, newRowSpan) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === id 
        ? { ...widget, colSpan: newColSpan, rowSpan: newRowSpan }
        : widget
    ));
  };

  const updateWidgetPosition = (fromIndex, toIndex) => {
    const newWidgets = [...widgets];
    const [movedWidget] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, movedWidget);
    setWidgets(newWidgets);
  };

  const getDefaultData = (type) => {
    const dataMap = {
      stats: { value: 0, trend: 0 },
      heatmap: {},
      progress: { progress: 0 },
      activities: { items: [] },
      kpi: { value: '0%' }
    };
    return dataMap[type] || {};
  };

  const value = {
    widgets,
    isEditMode,
    setIsEditMode,
    addWidget,
    removeWidget,
    updateWidgetSize,
    updateWidgetPosition
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};