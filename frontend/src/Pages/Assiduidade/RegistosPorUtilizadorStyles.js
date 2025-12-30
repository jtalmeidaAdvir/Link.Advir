/**
 * Estilos para RegistosPorUtilizador
 * Separado do componente principal para melhor organização
 */

const styles = {
    container: {
        padding: '20px',
        width: '100%',
        margin: '0 auto',
        backgroundImage: 'linear-gradient(to bottom, #e3f2fd, #bbdefb, #90caf9)',
        minHeight: '100vh',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        overflowX: 'hidden'
    },
    header: {
        textAlign: 'center',
        marginBottom: '20px'
    },
    title: {
        fontSize: '1.5rem',
        color: '#2d3748',
        margin: '0 0 10px 0',
        fontWeight: '700'
    },
    subtitle: {
        color: '#718096',
        fontSize: '0.6rem',
        margin: 0
    },
    icon: {
        marginRight: '5px'
    },
    navigationTabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    navTab: {
        padding: '12px 24px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        background: '#ffffff',
        color: '#4a5568',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '150px'
    },
    navTabActive: {
        background: '#3182ce',
        color: 'white',
        border: '2px solid #3182ce'
    },
    filtersCard: {
        background: '#ffffff',
        borderRadius: '15px',
        padding: '30px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        marginBottom: '30px',
        border: 'none'
    },
    sectionTitle: {
        fontSize: '1.5rem',
        color: '#2d3748',
        marginBottom: '20px',
        fontWeight: '600'
    },
    sectionIcon: {
        marginRight: '10px'
    },
    filtersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%'
    },
    label: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#4a5568',
        marginBottom: '8px'
    },
    select: {
        padding: '12px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '1rem',
        backgroundColor: '#ffffff',
        transition: 'all 0.2s',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box'
    },
    selectSmall: {
        padding: '8px 12px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '0.9rem',
        backgroundColor: '#ffffff',
        transition: 'all 0.2s',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box'
    },
    input: {
        padding: '12px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '1rem',
        backgroundColor: '#ffffff',
        transition: 'all 0.2s',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box'
    },
    actionButtons: {
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap',
        justifyContent: 'flex-start'
    },
    primaryButton: {
        backgroundColor: '#3182ce',
        color: 'white',
        border: 'none',
        padding: '14px 28px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '200px',
        width: '100%',
        maxWidth: '300px'
    },
    exportButton: {
        backgroundColor: '#38a169',
        color: 'white',
        border: 'none',
        padding: '14px 28px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        width: '100%',
        maxWidth: '300px'
    },
    detailsButton: {
        backgroundColor: '#718096',
        color: 'white',
        border: 'none',
        padding: '14px 28px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        width: '100%',
        maxWidth: '300px'
    },
    loadingCard: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '60px',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        minHeight: '250px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #3182ce',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
    },
    loadingText: {
        fontSize: '1.1rem',
        color: '#4a5568',
        marginBottom: '20px',
        fontWeight: '500'
    },
    progressBarContainer: {
        width: '100%',
        maxWidth: '500px',
        marginTop: '20px'
    },
    progressBarBackground: {
        width: '100%',
        height: '30px',
        backgroundColor: '#e2e8f0',
        borderRadius: '15px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
    },
    progressBarFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #3182ce, #4299e1)',
        borderRadius: '15px',
        transition: 'width 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        minWidth: '30px'
    },
    progressBarText: {
        color: 'white',
        fontWeight: '700',
        fontSize: '0.9rem',
        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
    },
    resumoSection: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        marginBottom: '30px'
    },
    utilizadoresGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '25px'
    },
    utilizadorCard: {
        backgroundColor: '#f7fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '16px',
        padding: '25px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box'
    },
    utilizadorCardHover: {
        ':hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
            borderColor: '#3182ce'
        }
    },
    utilizadorHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
        flexWrap: 'wrap'
    },
    utilizadorInfo: {
        flex: 1
    },
    utilizadorNome: {
        margin: '0 0 5px 0',
        color: '#2d3748',
        fontSize: '1.3rem',
        fontWeight: '700'
    },
    utilizadorEmail: {
        margin: 0,
        color: '#718096',
        fontSize: '0.9rem'
    },
    horasDestaque: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#3182ce',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '12px',
        minWidth: '100px'
    },
    horasNumero: {
        fontSize: '2rem',
        fontWeight: '700',
        lineHeight: 1
    },
    horasLabel: {
        fontSize: '0.8rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    statsRow: {
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    statValue: {
        fontSize: '1.4rem',
        fontWeight: '700',
        color: '#2d3748'
    },
    statLabel: {
        fontSize: '0.8rem',
        color: '#718096',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    obrasInfo: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '15px'
    },
    obrasLabel: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#4a5568',
        marginBottom: '5px'
    },
    obrasTexto: {
        fontSize: '0.9rem',
        color: '#2d3748',
        lineHeight: 1.4
    },
    periodoInfo: {
        marginBottom: '15px'
    },
    periodoTexto: {
        fontSize: '0.9rem',
        color: '#718096'
    },
    clickHint: {
        position: 'absolute',
        bottom: '10px',
        right: '15px',
        fontSize: '0.8rem',
        color: '#a0aec0',
        fontStyle: 'italic'
    },
    // Grade Styles
    gradeSection: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        marginBottom: '30px'
    },
    legendaContainer: {
        marginBottom: '25px',
        padding: '20px',
        backgroundColor: '#f7fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
    },
    legendaTitle: {
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#2d3748',
        marginBottom: '15px'
    },
    legendaItems: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px'
    },
    legendaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.9rem'
    },
    legendaCor: {
        width: '16px',
        height: '16px',
        borderRadius: '4px',
        border: '1px solid #e2e8f0'
    },
    gradeContainer: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
    },
    gradeScrollContainer: {
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: '50vh'
    },
    gradeTable: {
        width: '100%',
        position: 'relative',
        borderCollapse: 'collapse',
        minWidth: '1200px'
    },
    gradeHeader: {
        backgroundColor: '#f7fafc',
        padding: '6px 4px',
        textAlign: 'center',
        fontSize: '0.8rem',
        fontWeight: '600',
        color: '#4a5568',
        border: '1px solid #e2e8f0',
        minWidth: '50px',
        height: '35px',
        position: 'sticky',
        top: 0,
        zIndex: 15
    },
    // Destacar cabeçalhos de fim-de-semana
    weekendHeader: {
        backgroundColor: '#e0f7fa'
    },
    // Destacar células de fim-de-semana
    weekendCell: {
        backgroundColor: '#e0f7fa'
    },
    gradeHeaderFixed: {
        position: 'sticky',
        left: 0,
        zIndex: 20,
        minWidth: '200px',
        maxWidth: '200px',
        backgroundColor: '#edf2f7'
    },
    gradeRowEven: {
        backgroundColor: '#ffffff'
    },
    gradeRowOdd: {
        backgroundColor: '#f9fafb'
    },
    gradeCell: {
        padding: '4px',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
        fontSize: '0.7rem',
        verticalAlign: 'middle',
        minWidth: '50px',
        maxWidth: '50px',
        height: '40px'
    },
    gradeCellFixed: {
        position: 'sticky',
        left: 0,
        zIndex: 5,
        minWidth: '200px',
        maxWidth: '200px',
        backgroundColor: 'inherit',
        cursor: 'pointer'
    },
    gradeCellTotal: {
        backgroundColor: '#edf2f7',
        fontWeight: '600',
        minWidth: '80px'
    },
    utilizadorGradeInfo: {
        textAlign: 'left',
        padding: '8px'
    },
    utilizadorGradeNome: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#2d3748',
        marginBottom: '2px'
    },
    utilizadorGradeEmail: {
        fontSize: '0.7rem',
        color: '#718096'
    },
    gradeCellContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px'
    },
    gradeCellHoras: {
        fontSize: '0.8rem',
        fontWeight: '600',
        color: '#2d3748'
    },
    gradeCellRegistos: {
        fontSize: '0.7rem',
        color: '#718096'
    },
    gradeCellAlert: {
        fontSize: '0.7rem',
        color: '#e53e3e',
        fontWeight: '600'
    },
    gradeCellFaltas: {
        fontSize: '0.7rem',
        color: '#d69e2e',
        fontWeight: '600'
    },
    gradeCellEmpty: {
        color: '#a0aec0',
        fontSize: '0.9rem'
    },
    gradeTotalContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px'
    },
    gradeTotalHoras: {
        fontSize: '0.9rem',
        fontWeight: '700',
        color: '#2d3748'
    },
    gradeTotalDias: {
        fontSize: '0.7rem',
        color: '#718096'
    },
    gradeTotalFaltas: {
        fontSize: '0.7rem',
        color: '#d69e2e',
        fontWeight: '600'
    },
    // Detalhes Styles (mantendo os existentes)
    detalhesSection: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
    },
    detalhesHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '20px'
    },
    detalhesSubtitle: {
        color: '#718096',
        fontSize: '1rem',
        margin: '5px 0 0 0'
    },
    detalhesActions: {
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        flexWrap: 'wrap'
    },
    dayCard: {
        marginBottom: '30px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden'
    },
    dayHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        backgroundColor: '#f7fafc',
        borderBottom: '1px solid #e2e8f0',
        flexWrap: 'wrap'
    },
    dayTitle: {
        margin: 0,
        color: '#2d3748',
        fontSize: '1.2rem',
        fontWeight: '600'
    },
    dayBadge: {
        backgroundColor: '#3182ce',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.9rem',
        fontWeight: '500',
        marginTop: '10px'
    },
    eventsList: {
        padding: '20px'
    },
    eventCard: {
        backgroundColor: '#f7fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '15px',
        transition: 'all 0.2s'
    },
    eventCardHover: {
        ':hover': {
            backgroundColor: '#edf2f7',
            transform: 'translateX(5px)'
        }
    },
    eventHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        flexWrap: 'wrap'
    },
    eventType: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    typeIcon: {
        fontSize: '1.2rem'
    },
    typeText: {
        fontWeight: '700',
        fontSize: '1.1rem',
        color: '#2d3748'
    },
    eventTime: {
        color: '#718096',
        fontSize: '1rem',
        fontWeight: '500'
    },
    eventDetails: {
        display: 'grid',
        gap: '10px'
    },
    eventInfo: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
    },
    infoLabel: {
        fontWeight: '600',
        color: '#4a5568',
        minWidth: '100px'
    },
    infoValue: {
        color: '#2d3748',
        flex: 1
    },
    statusBadge: {
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '0.9rem',
        fontWeight: '500'
    },
    confirmed: {
        backgroundColor: '#c6f6d5',
        color: '#22543d'
    },
    unconfirmed: {
        backgroundColor: '#fed7d7',
        color: '#742a2a'
    },
    // Bolsa de Horas Styles
    bolsaSection: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
    },
    bolsaResumo: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
    },
    bolsaResumoCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        border: '1px solid #e2e8f0'
    },
    bolsaResumoIcon: {
        width: '50px',
        height: '50px',
        borderRadius: '12px',
        backgroundColor: '#e3f2fd',
        color: '#1976d2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: '700'
    },
    bolsaResumoValor: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#2d3748',
        marginBottom: '4px'
    },
    bolsaResumoLabel: {
        fontSize: '13px',
        color: '#718096',
        fontWeight: '500'
    },
    bolsaLista: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    bolsaCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        transition: 'box-shadow 0.2s ease'
    },
    bolsaCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '15px'
    },
    bolsaNome: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#2d3748',
        margin: '0 0 5px 0'
    },
    bolsaEmail: {
        fontSize: '14px',
        color: '#718096',
        margin: '0 0 5px 0'
    },
    bolsaHorario: {
        fontSize: '13px',
        color: '#a0aec0',
        margin: 0,
        fontStyle: 'italic'
    },
    bolsaSaldo: {
        textAlign: 'right'
    },
    bolsaSaldoValor: {
        fontSize: '32px',
        fontWeight: '700',
        marginBottom: '4px'
    },
    bolsaSaldoLabel: {
        fontSize: '12px',
        color: '#718096',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    bolsaStats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        paddingTop: '15px',
        borderTop: '1px solid #e2e8f0'
    },
    bolsaStatItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    bolsaStatLabel: {
        fontSize: '12px',
        color: '#718096',
        fontWeight: '500'
    },
    bolsaStatValue: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#2d3748'
    },
    bolsaDetalhes: {
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '1px solid #e2e8f0'
    },
    bolsaDetalhesSummary: {
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        color: '#1976d2',
        padding: '8px 0',
        userSelect: 'none'
    },
    bolsaDetalhesConteudo: {
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#ffffff',
        borderRadius: '8px'
    },
    bolsaDiaItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        marginBottom: '6px',
        fontSize: '13px'
    },
    bolsaDiaData: {
        fontWeight: '500',
        color: '#2d3748',
        flex: '0 0 95px',
        fontSize: '12px'
    },
    bolsaDiaHoras: {
        color: '#718096',
        flex: '1',
        textAlign: 'center'
    },
    bolsaDiaDiff: {
        fontWeight: '600',
        flex: '0 0 70px',
        textAlign: 'right'
    },
    bolsaDetalhesMore: {
        fontSize: '12px',
        color: '#a0aec0',
        fontStyle: 'italic',
        textAlign: 'center',
        margin: '10px 0 0 0'
    },
    emptyState: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '60px',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
    },
    emptyIcon: {
        fontSize: '4rem',
        display: 'block',
        marginBottom: '20px'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(3px)'
    },
    modal: {
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        minWidth: '320px'
    },
    bulkModal: {
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '90vw',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
        animation: 'modalSlideIn 0.3s ease-out'
    },
    bulkModalHeader: {
        background: 'linear-gradient(135deg, #3182ce, #2c5aa0)',
        color: 'white',
        padding: '25px 30px',
        position: 'relative'
    },
    bulkModalTitle: {
        margin: '0 0 8px 0',
        fontSize: '1.5rem',
        fontWeight: '700'
    },
    bulkModalSubtitle: {
        margin: 0,
        fontSize: '0.95rem',
        opacity: 0.9
    },
    closeButton: {
        position: 'absolute',
        top: '20px',
        right: '25px',
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        color: 'white',
        fontSize: '24px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    },
    bulkModalContent: {
        padding: '30px',
        maxHeight: 'calc(80vh - 180px)',
        overflowY: 'auto'
    },
    selectedCellsContainer: {
        marginBottom: '25px',
        padding: '20px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
    },
    selectedCellsLabel: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#4a5568',
        marginBottom: '10px',
        display: 'block'
    },
    selectedCellsList: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
    },
    selectedCell: {
        background: '#3182ce',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '500'
    },
    horariosContainer: {
        marginBottom: '25px'
    },
    horariosTitle: {
        fontSize: '1.2rem',
        fontWeight: '600',
        color: '#2d3748',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    horariosGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
    },
    periodoContainer: {
        background: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        transition: 'all 0.2s'
    },
    periodoHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '15px'
    },
    periodoIcon: {
        fontSize: '1.2rem'
    },
    periodoTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#2d3748'
    },
    horarioRow: {
        display: 'flex',
        gap: '15px'
    },
    inputGroup: {
        flex: 0.5
    },
    timeLabel: {
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: '500',
        color: '#4a5568',
        marginBottom: '6px'
    },
    timeInput: {
        width: '100%',
        padding: '10px 12px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '0.95rem',
        transition: 'all 0.2s',
        outline: 'none',
        boxSizing: 'border-box'
    },
    obraContainer: {
        marginBottom: '20px'
    },
    obraLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#2d3748',
        marginBottom: '12px'
    },
    obraIcon: {
        fontSize: '1.1rem'
    },
    obraSelect: {
        width: '100%',
        padding: '12px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '1rem',
        background: 'white',
        transition: 'all 0.2s',
        outline: 'none',
        boxSizing: 'border-box'
    },
    bulkModalActions: {
        background: '#f8fafc',
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
        borderTop: '1px solid #e2e8f0'
    },
    cancelButton: {
        padding: '12px 24px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        background: '#ffffff',
        color: '#4a5568',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    confirmButton: {
        padding: '12px 28px',
        border: 'none',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #38a169, #2f855a)',
        color: 'white',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(56, 161, 105, 0.3)'
    },

    // Estilos para modal individual
    individualModal: {
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '90vw',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
        animation: 'modalSlideIn 0.3s ease-out'
    },
    individualModalHeader: {
        background: 'linear-gradient(135deg, #2c5aa0, #3182ce)',
        color: 'white',
        padding: '25px 30px',
        position: 'relative'
    },
    individualModalTitle: {
        margin: '0 0 8px 0',
        fontSize: '1.4rem',
        fontWeight: '700'
    },
    individualModalSubtitle: {
        margin: 0,
        fontSize: '0.95rem',
        opacity: 0.9
    },
    individualModalContent: {
        padding: '25px',
        maxHeight: 'calc(80vh - 160px)',
        overflowY: 'auto'
    },
    individualModalActions: {
        background: '#f8fafc',
        padding: '20px 25px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
        borderTop: '1px solid #e2e8f0'
    },

    // Estilos para modal de edição direta
    editModal: {
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '90vw',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
        animation: 'modalSlideIn 0.3s ease-out'
    },
    editModalHeader: {
        background: 'linear-gradient(135deg, #2c5aa0, #3182ce)',
        color: 'white',
        padding: '25px 30px',
        position: 'relative'
    },
    editModalTitle: {
        margin: '0 0 8px 0',
        fontSize: '1.4rem',
        fontWeight: '700'
    },
    editModalSubtitle: {
        margin: 0,
        fontSize: '0.95rem',
        opacity: 0.9
    },
    editModalContent: {
        padding: '25px',
        maxHeight: 'calc(80vh - 160px)',
        overflowY: 'auto'
    },
    editModalActions: {
        background: '#f8fafc',
        padding: '20px 25px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
        borderTop: '1px solid #e2e8f0'
    }

};

// CSS animations and responsive styles
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .utilizador-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 35px rgba(0,0,0,0.15) !important;
      border-color: #3182ce !important;
    }

    .event-card:hover {
      background-color: #edf2f7 !important;
      transform: translateX(5px);
    }

    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      background: #f5f7fa !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }

    /* Modal animations */
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-50px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Hover effects */
    .bulk-modal .close-button:hover {
      background: rgba(255,255,255,0.3) !important;
      transform: rotate(90deg);
    }

    .bulk-modal .cancel-button:hover {
      background: #f1f5f9 !important;
      border-color: #cbd5e1 !important;
    }

    .bulk-modal .confirm-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(56, 161, 105, 0.4) !important;
    }

    .bulk-modal .confirm-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .bulk-modal .time-input,
    .bulk-modal .obra-select {
      focus {
        border-color: #3182ce !important;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
      }
    }

    .bulk-modal .periodo-container:hover {
      border-color: #cbd5e1 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    /* Responsive modal */
    @media (max-width: 768px) {
      .bulk-modal {
        width: 95vw !important;
        margin: 20px !important;
      }

      .bulk-modal .horarios-grid {
        grid-template-columns: 1fr !important;
      }

      .bulk-modal .horario-row {
        flex-direction: column !important;
        gap: 10px !important;
      }

      .bulk-modal-actions {
        flex-direction: column !important;
      }

      .bulk-modal-actions button {
        width: 100% !important;
      }
    }
  `;
    document.head.appendChild(style);
}

export default styles;
