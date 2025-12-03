import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DocumentTitle = ({ title }) => {
  const location = useLocation();
  
  useEffect(() => {
    const pageTitles = {
      '/dashboard': 'Dashboard',
      '/users': 'Manajemen User',
      '/risks': 'Manajemen Risiko',
      '/reports': 'Laporan',
      '/settings': 'Pengaturan'
    };
    
    const pageTitle = pageTitles[location.pathname] || 'Sistem Manajemen Risiko';
    document.title = `${pageTitle} - Risk Management System`;
    
    // Reset ke default saat komponen unmount
    return () => {
      document.title = 'Risk Management System';
    };
  }, [location, title]);
  
  return null; // Komponen ini tidak render apa-apa
};

export default DocumentTitle;