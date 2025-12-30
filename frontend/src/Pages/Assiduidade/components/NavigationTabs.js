import React from 'react';

/**
 * Tabs de navegação entre diferentes vistas
 */
const NavigationTabs = React.memo(({
    viewMode,
    onViewModeChange,
    utilizadorDetalhado,
    onBolsaHorasClick,
    styles
}) => {
    const tabs = [
        {
            id: 'resumo',
            label: '📊 Resumo',
            visible: true
        },
        {
            id: 'grade',
            label: '📅 Grade Mensal',
            visible: true
        },
        {
            id: 'bolsa',
            label: '💰 Bolsa de Horas',
            visible: true,
            onClick: onBolsaHorasClick
        },
        {
            id: 'detalhes',
            label: '🔍 Detalhes',
            visible: !!utilizadorDetalhado
        }
    ];

    return (
        <div style={styles.navigationTabs}>
            {tabs.filter(tab => tab.visible).map(tab => (
                <button
                    key={tab.id}
                    style={{
                        ...styles.navTab,
                        ...(viewMode === tab.id ? styles.navTabActive : {})
                    }}
                    onClick={() => {
                        if (tab.onClick) {
                            tab.onClick();
                        }
                        onViewModeChange(tab.id);
                    }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.viewMode === nextProps.viewMode &&
        !!prevProps.utilizadorDetalhado === !!nextProps.utilizadorDetalhado
    );
});

NavigationTabs.displayName = 'NavigationTabs';

export default NavigationTabs;
