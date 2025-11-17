import { StyleSheet } from 'react-native';


export const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    overflowY: 'auto', 
   
  },
  
  headerContainer: {
    width: '100%',
    marginBottom: '20px',
  },
  
  headerGradient: {
    background: 'linear-gradient(135deg, #1792FE 0%, #0B5ED7 100%)',
    padding: '30px 20px',
    borderRadius: '0 0 20px 20px',
    boxShadow: '0 4px 20px rgba(23, 146, 254, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  
  headerContent: {
    textAlign: 'center',
    color: 'white',
    position: 'relative',
    zIndex: 1,
    transition: 'transform 0.3s ease',
  },
  
  headerContentPulse: {
    transform: 'scale(1.02)',
  },
  
  headerIcon: {
    fontSize: '32px',
    marginBottom: '10px',
    display: 'block',
  },
  
  headerTitle: {
    fontSize: 'clamp(1.5rem, 2vw, 2rem)', // entre 24px e 32px
    fontWeight: '700',
    margin: '0 0 8px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },

  
  headerSubtitle: {
    fontSize: '18px',
    margin: '0 0 5px 0',
    opacity: 0.9,
    fontWeight: '500',
  },
  
  headerCount: {
    fontSize: '14px',
    margin: 0,
    opacity: 0.8,
  },
  
  datePickerContainer: {
    background: 'white',
    margin: '20px',
    borderRadius: '15px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '1px solid rgba(23, 146, 254, 0.1)',
  },
  
  datePickerHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
  },
  
  dateIcon: {
    color: '#1792FE',
    fontSize: '20px',
    marginRight: '10px',
  },
  
  datePickerTitle: {
    margin: 0,
    color: '#333',
    fontSize: '18px',
    fontWeight: '600',
  },
  
  datePickerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  
  dateInput: {
    padding: '12px 15px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  
  dateInputFocus: {
    borderColor: '#1792FE',
    boxShadow: '0 0 0 3px rgba(23, 146, 254, 0.1)',
  },
  
  selectedDate: {
    color: '#666',
    fontSize: '14px',
    margin: 0,
    fontStyle: 'italic',
  },
  
  filterButtonsContainer: {
    display: 'flex',
    gap: '10px',
    margin: '0 20px 15px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  filterButton: {
    padding: '10px 20px',
    border: '2px solid #e9ecef',
    borderRadius: '25px',
    background: 'white',
    color: '#666',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
  },

  filterButtonActive: {
    background: 'linear-gradient(135deg, #1792FE 0%, #0B5ED7 100%)',
    color: 'white',
    borderColor: '#1792FE',
    boxShadow: '0 4px 15px rgba(23, 146, 254, 0.3)',
  },

  exportButton: {
    backgroundColor: '#28a745',
    color: 'white',
    borderColor: '#28a745',
  },

  searchContainer: {
    margin: '0 20px 20px',
    borderRadius: '15px',
    padding: '5px 15px',
    background: 'rgba(255,255,255,0.9)',
    transition: 'background 0.3s ease',
  },
  
  searchContainerActive: {
    background: 'rgba(23,146,254,0.1)',
  },
  
  searchInputContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    borderRadius: '10px',
    padding: '10px 15px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  
  searchIcon: {
    color: '#1792FE',
    marginRight: '10px',
    fontSize: '18px',
  },
  
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    color: '#333',
    background: 'transparent',
    minHeight: '40px',
  },

  
  clearButton: {
    padding: '5px 10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#999',
    fontSize: '18px',
    fontWeight: 'bold',
    transition: 'color 0.3s ease',
  },
  
  employeesContainer: {
    padding: '0 20px 20px',
    marginBottom: '80px'
  },
  
  employeeCard: {
    background: 'white',
    borderRadius: '15px',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    border: '1px solid rgba(23, 146, 254, 0.1)',
    cursor: 'pointer',
  },
  
  employeeCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
  },
  
  employeeCardHeader: {
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 0.3s ease',
  },
  
  employeeCardHeaderHover: {
    backgroundColor: 'rgba(23, 146, 254, 0.05)',
  },
  
  employeeInfo: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: '10px',
  },
  

  
  employeeDetails: {
    flex: 1,
  },
  
  employeeName: {
    margin: '0 0 5px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
  },
  
  employeeTotal: {
    margin: 0,
    color: '#666',
    fontSize: '14px',
  },
  
  employeeStatusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  
  expandIcon: {
    color: '#999',
    fontSize: '16px',
    transition: 'transform 0.3s ease',
  },
  
  progressContainer: {
    padding: '0 20px 15px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.6s ease',
  },
  
  progressText: {
    fontSize: '12px',
    color: '#666',
    minWidth: '60px',
    textAlign: 'right',
  },
  
  employeeObservations: {
    padding: '0 20px 20px',
    margin: 0,
    color: '#666',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  
  employeeTimeline: {
    padding: '20px',
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa',
  },
  
  timelineTitle: {
    margin: '0 0 20px 0',
    color: '#333',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  timelineContainer: {
    position: 'relative',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  
  timelineItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    position: 'relative',
  },
  
  timelineMarker: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '14px',
    marginRight: '15px',
    position: 'relative',
  },
  
  timelineMarkerEntrada: {
    background: 'linear-gradient(135deg, #28a745, #20c997)',
  },
  
  timelineMarkerSaida: {
    background: 'linear-gradient(135deg, #dc3545, #e83e8c)',
  },
  
  timelineMarkerPausa: {
    background: 'linear-gradient(135deg, #ffc107, #fd7e14)',
  },
  
  timelineContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  
  timelineType: {
    fontWeight: '600',
    color: '#333',
    fontSize: '14px',
  },
  
  timelineTime: {
    color: '#666',
    fontSize: '12px',
  },
  
  loadingContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
  },
  
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e9ecef',
    borderTop: '4px solid #1792FE',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  
  loadingText: {
    color: '#666',
    fontSize: '16px',
    margin: 0,
  },
  
  errorContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    margin: '20px',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  
  errorIcon: {
    fontSize: '48px',
    color: '#dc3545',
    marginBottom: '20px',
  },
  
  errorTitle: {
    color: '#333',
    margin: '0 0 10px 0',
    fontSize: '20px',
  },
  
  errorMessage: {
    color: '#666',
    margin: '0 0 30px 0',
  },
  
  retryButton: {
    background: 'linear-gradient(135deg, #1792FE, #0B5ED7)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  retryButtonHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 15px rgba(23, 146, 254, 0.3)',
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    margin: '20px',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  
  emptyIcon: {
    fontSize: '48px',
    color: '#6c757d',
    marginBottom: '20px',
  },
  
  emptyTitle: {
    color: '#333',
    margin: '0 0 10px 0',
    fontSize: '20px',
  },
  
  emptyMessage: {
    color: '#666',
    margin: 0,
  },
};
