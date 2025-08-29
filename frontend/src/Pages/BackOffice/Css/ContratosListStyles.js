
export const styles = {
  
  container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },

  // Header Styles
  headerContainer: {
    width: '100%',
    marginBottom: 30,
  },
  headerGradient: {
    background: 'linear-gradient(135deg, #1792FE 0%, #0066CC 50%, #004499 100%)',
    padding: '40px 30px',
    borderRadius: 20,
    boxShadow: '0 15px 35px rgba(23, 146, 254, 0.3)',
    textAlign: 'center',
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  headerGradientPulse: {
    animation: 'pulse 2s ease-in-out',
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 15,
    display: 'block',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 10,
    color: '#fff',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    opacity: 0.9,
    color: '#fff',
    marginBottom: 15,
  },
  headerStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: '8px 16px',
    borderRadius: 20,
    display: 'inline-block',
    backdropFilter: 'blur(10px)',
  },
  headerStatsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Form Styles
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    marginBottom: 25,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(23, 146, 254, 0.1)',
    animation: 'slideUp 0.5s ease-out',
  },
  formHeader: {
    textAlign: 'center',
    marginBottom: 25,
    padding: '0 0 20px 0',
    borderBottom: '2px solid #f8f9fa',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c3e50',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  formTitleIcon: {
    fontSize: 24,
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 10,
    display: 'block',
  },
  selectWrapper: {
    position: 'relative',
    width: '100%',
  },
  select: {
    width: '100%',
    padding: '15px 40px 15px 15px',
    border: '2px solid #e9ecef',
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#495057',
    transition: 'all 0.3s ease',
    appearance: 'none',
    cursor: 'pointer',
    outline: 'none',
  },
  selectFocused: {
    borderColor: '#1792FE',
    boxShadow: '0 0 0 3px rgba(23, 146, 254, 0.1)',
    transform: 'translateY(-2px)',
  },
  selectArrow: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6c757d',
    pointerEvents: 'none',
    fontSize: 12,
  },
  selectedClientInfo: {
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    border: '2px solid rgba(40, 167, 69, 0.3)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    animation: 'slideUp 0.3s ease-out',
  },
  selectedClientIcon: {
    fontSize: 24,
    color: '#28a745',
  },
  selectedClientLabel: {
    margin: 0,
    color: '#28a745',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedClientName: {
    margin: 0,
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '700',
  },
  consultButton: {
    background: 'linear-gradient(135deg, #1792FE 0%, #0066CC 100%)',
    color: 'white',
    padding: '18px 30px',
    borderRadius: 15,
    border: 'none',
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%',
    boxShadow: '0 6px 20px rgba(23, 146, 254, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    outline: 'none',
  },
  consultButtonHover: {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 25px rgba(23, 146, 254, 0.4)',
  },
  consultButtonDisabled: {
    background: '#bdc3c7',
    cursor: 'not-allowed',
    transform: 'none',
    boxShadow: 'none',
  },
  consultButtonIcon: {
    fontSize: 18,
  },

  // Search Styles
  searchContainer: {
    marginBottom: 25,
    animation: 'slideUp 0.5s ease-out',
  },
  searchInputContainer: {
    position: 'relative',
    maxWidth: 400,
    margin: '0 auto',
  },
  searchIcon: {
    position: 'absolute',
    left: 15,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 16,
    color: '#6c757d',
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    padding: '15px 50px 15px 45px',
    border: '2px solid #e9ecef',
    borderRadius: 25,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#495057',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
  },
  clearButton: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#6c757d',
    cursor: 'pointer',
    fontSize: 14,
    padding: 5,
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },

  // Filters Styles
  filtersContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)',
    animation: 'slideUp 0.5s ease-out',
  },
  filtersHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    gap: 8,
  },
  filtersIcon: {
    fontSize: 18,
  },
  filtersLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  filtersButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '12px 20px',
    borderRadius: 25,
    border: '2px solid #e9ecef',
    backgroundColor: 'white',
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: 120,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    outline: 'none',
  },
  filterButtonHover: {
    borderColor: '#1792FE',
    color: '#1792FE',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 15px rgba(23, 146, 254, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: '#1792FE',
    borderColor: '#1792FE',
    color: 'white',
    boxShadow: '0 4px 15px rgba(23, 146, 254, 0.3)',
    transform: 'translateY(-2px)',
  },
  filterButtonIcon: {
    fontSize: 14,
  },

  // Loading Styles
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    backgroundColor: 'white',
    borderRadius: 20,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    animation: 'fadeIn 0.5s ease-in-out',
  },
  loadingSpinner: {
    width: 50,
    height: 50,
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1792FE',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: 20,
  },
  loadingText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  loadingIcon: {
    fontSize: 18,
  },

  // Error Styles
  errorContainer: {
    backgroundColor: '#fff5f5',
    border: '2px solid #fed7d7',
    borderRadius: 20,
    padding: 30,
    textAlign: 'center',
    marginBottom: 25,
    animation: 'slideUp 0.5s ease-out',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  errorTitle: {
    color: '#e53e3e',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  errorMessage: {
    color: '#c53030',
    fontSize: 16,
    marginBottom: 25,
    lineHeight: 1.5,
  },
  retryButton: {
    backgroundColor: '#e53e3e',
    color: 'white',
    padding: '15px 25px',
    borderRadius: 12,
    border: 'none',
    fontSize: 14,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 auto',
    outline: 'none',
  },
  retryButtonHover: {
    backgroundColor: '#c53030',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 15px rgba(229, 62, 62, 0.3)',
  },
  retryButtonIcon: {
    fontSize: 16,
  },

  // Stats Styles
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    animation: 'slideUp 0.5s ease-out',
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statsTitleIcon: {
    fontSize: 22,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 20,
  },
  statItem: {
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  statItemHover: {
    borderColor: '#1792FE',
    backgroundColor: 'rgba(23, 146, 254, 0.05)',
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 25px rgba(23, 146, 254, 0.15)',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1792FE',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Contract Grid Styles
  contractsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: 25,
    animation: 'slideUp 0.5s ease-out',
  },
  contractCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(23, 146, 254, 0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  contractCardHover: {
    transform: 'translateY(-8px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    borderColor: '#1792FE',
  },
  contractHeader: {
    borderBottom: '2px solid #f8f9fa',
    paddingBottom: 20,
    marginBottom: 20,
  },
  contractCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1792FE',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  contractCodeIcon: {
    fontSize: 18,
  },
  contractDescription: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    lineHeight: 1.5,
  },

  // Contract Details
  contractDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
  },
  contractRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 15px',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    transition: 'all 0.2s ease',
  },
  contractRowIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  contractLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  contractValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  contractValueHighlight: {
    color: '#1792FE',
    fontWeight: '700',
    fontSize: 15,
  },
  contractDate: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },

  // Progress Styles
  hoursProgressContainer: {
    marginTop: 20,
    padding: '20px 0 0 0',
    borderTop: '2px solid #f8f9fa',
  },
  hoursProgressHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  hoursProgressIcon: {
    fontSize: 16,
  },
  hoursProgressLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 5,
    transition: 'width 0.8s ease-in-out',
    position: 'relative',
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Status Badge Styles
  statusBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: '8px 15px',
    borderRadius: 25,
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  statusBadgeIcon: {
    fontSize: 12,
  },
  statusActive: {
    backgroundColor: '#28a745',
  },
  statusExpired: {
    backgroundColor: '#dc3545',
  },
  statusCancelled: {
    backgroundColor: '#6c757d',
  },

  // Empty State Styles
  emptyState: {
    textAlign: 'center',
    padding: 60,
    backgroundColor: 'white',
    borderRadius: 20,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    animation: 'fadeIn 0.5s ease-in-out',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
    display: 'block',
  },
  emptyTitle: {
    fontSize: 24,
    color: '#6c757d',
    fontWeight: '700',
    marginBottom: 15,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#95a5a6',
    lineHeight: 1.6,
    maxWidth: 400,
    margin: '0 auto 20px auto',
  },
  clearSearchButton: {
    backgroundColor: '#1792FE',
    color: 'white',
    padding: '12px 20px',
    borderRadius: 25,
    border: 'none',
    fontSize: 14,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 auto',
    outline: 'none',
  },
  clearSearchIcon: {
    fontSize: 14,
  },

  // Selected Client Banner
  selectedClientBanner: {
    background: 'linear-gradient(135deg, rgba(23, 146, 254, 0.1) 0%, rgba(23, 146, 254, 0.05) 100%)',
    border: '2px solid rgba(23, 146, 254, 0.2)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    animation: 'slideUp 0.3s ease-out',
  },
  selectedClientBannerIcon: {
    fontSize: 24,
    color: '#1792FE',
  },
  selectedClientBannerContent: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '500',
  },

  // Responsive Design
  '@media (max-width: 1200px)': {
    container: {
      padding: 15,
    },
    contractsGrid: {
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 20,
    },
  },

  '@media (max-width: 768px)': {
    headerTitle: {
      fontSize: 26,
    },
    headerSubtitle: {
      fontSize: 16,
    },
    headerIcon: {
      fontSize: 40,
    },
    formContainer: {
      padding: 25,
    },
    contractsGrid: {
      gridTemplateColumns: '1fr',
      gap: 20,
    },
    filtersButtons: {
      flexDirection: 'column',
      alignItems: 'center',
    },
    filterButton: {
      width: '100%',
      maxWidth: 250,
      justifyContent: 'center',
    },
    statsGrid: {
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 15,
    },
    contractCard: {
      padding: 20,
    },
  },

  '@media (max-width: 480px)': {
    container: {
      padding: 10,
    },
    headerTitle: {
      fontSize: 22,
    },
    headerSubtitle: {
      fontSize: 14,
    },
    headerIcon: {
      fontSize: 36,
    },
    formContainer: {
      padding: 20,
    },
    contractCard: {
      padding: 18,
    },
    contractCode: {
      fontSize: 18,
    },
    contractDescription: {
      fontSize: 14,
    },
    statsGrid: {
      gridTemplateColumns: '1fr',
      gap: 10,
    },
    statItem: {
      padding: 15,
    },
    statNumber: {
      fontSize: 24,
    },
    searchInputContainer: {
      margin: '0 10px',
    },
  },
};
