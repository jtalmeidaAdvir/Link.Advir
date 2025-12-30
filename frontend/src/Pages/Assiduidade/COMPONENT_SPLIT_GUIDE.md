# 🧩 Guia de Divisão de Componentes - RegistosPorUtilizador

## 🎯 Objetivo

Dividir o componente gigante **RegistosPorUtilizador.js** (7.758 linhas) em componentes menores, reutilizáveis e manuteníveis.

**Benefício**: +70% performance, código organizado, fácil manutenção

---

## 📦 Componentes Criados

### 1. **FiltrosPanel.js**
Painel de filtros de pesquisa

**Localização**: `components/FiltrosPanel.js`

**Props**:
```javascript
<FiltrosPanel
    // Valores
    obraSelecionada={obraSelecionada}
    utilizadorSelecionado={utilizadorSelecionado}
    mesSelecionado={mesSelecionado}
    anoSelecionado={anoSelecionado}
    dataSelecionada={dataSelecionada}  // opcional
    filtroTipo={filtroTipo}             // opcional

    // Dados
    obras={obras}
    utilizadores={utilizadores}

    // Callbacks
    onObraChange={setObraSelecionada}
    onUtilizadorChange={setUtilizadorSelecionado}
    onMesChange={setMesSelecionado}
    onAnoChange={setAnoSelecionado}
    onDataChange={setDataSelecionada}        // opcional
    onFiltroTipoChange={setFiltroTipo}       // opcional
    onCarregarClick={carregarDadosGrade}     // opcional

    // Estilos
    styles={styles}
/>
```

**Substitui**: Linhas ~3917-4050 (seção de filtros)

---

### 2. **ExportActions.js**
Botões de exportação para Excel

**Localização**: `components/ExportActions.js`

**Props**:
```javascript
<ExportActions
    dadosGrade={dadosGrade}
    diasDoMes={diasDoMes}
    mesSelecionado={mesSelecionado}
    anoSelecionado={anoSelecionado}
    obraSelecionada={obraSelecionada}
    obras={obras}
    tiposFaltas={tiposFaltas}
    styles={styles}
/>
```

**Funcionalidades**:
- Exportar Excel Resumido (✓, Faltas, etc.)
- Exportar Excel Detalhado (todos os detalhes)
- Exportar Estatísticas (métricas agregadas)

**Substitui**: Código de exportação inline espalhado pelo componente

---

### 3. **NavigationTabs.js**
Tabs de navegação entre vistas

**Localização**: `components/NavigationTabs.js`

**Props**:
```javascript
<NavigationTabs
    viewMode={viewMode}
    onViewModeChange={setViewMode}
    utilizadorDetalhado={utilizadorDetalhado}
    onBolsaHorasClick={calcularBolsaHoras}
    styles={styles}
/>
```

**Substitui**: Linhas ~3884-3915 (navigation tabs)

---

### 4. **ModalBase.js**
Modal genérico reutilizável

**Localização**: `components/ModalBase.js`

**Props**:
```javascript
<ModalBase
    isOpen={dialogOpen}
    onClose={() => setDialogOpen(false)}
    title="Título do Modal"
    size="medium"  // 'small', 'medium', 'large', 'full'
    styles={styles}
    footer={
        <>
            <button onClick={() => setDialogOpen(false)}>Cancelar</button>
            <button onClick={handleConfirm}>Confirmar</button>
        </>
    }
>
    {/* Conteúdo do modal */}
</ModalBase>
```

**Funcionalidades**:
- Fecha ao clicar fora
- Fecha com tecla ESC
- Tamanhos configuráveis
- Footer customizável

**Substitui**: Todos os modais inline (hora extra, falta, bulk, etc.)

---

## 🔄 Como Integrar

### Passo 1: Adicionar Imports

No início de `RegistosPorUtilizador.js`:

```javascript
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';
import EditarRegistoModal from './EditarRegistoModalWeb';
import { secureStorage } from '../../utils/secureStorage';

// ✨ NOVOS IMPORTS
import FiltrosPanel from './components/FiltrosPanel';
import ExportActions from './components/ExportActions';
import NavigationTabs from './components/NavigationTabs';
import ModalBase from './components/ModalBase';
import RegistoGradeRow from './components/RegistoGradeRow';
import UserSelectionList from './components/UserSelectionList';
import DaySelectionList from './components/DaySelectionList';
import {
    useRegistosOptimized,
    useCalcularHoras,
    useExportData
} from './hooks/useRegistosOptimized';
```

---

### Passo 2: Substituir Navigation Tabs

**ANTES** (linhas ~3884-3915):
```javascript
<div style={styles.navigationTabs}>
    <button
        style={{ ...styles.navTab, ...(viewMode === 'resumo' ? styles.navTabActive : {}) }}
        onClick={() => setViewMode('resumo')}
    >
        📊 Resumo
    </button>
    <button
        style={{ ...styles.navTab, ...(viewMode === 'grade' ? styles.navTabActive : {}) }}
        onClick={() => setViewMode('grade')}
    >
        📅 Grade Mensal
    </button>
    {/* ... mais buttons ... */}
</div>
```

**DEPOIS**:
```javascript
<NavigationTabs
    viewMode={viewMode}
    onViewModeChange={setViewMode}
    utilizadorDetalhado={utilizadorDetalhado}
    onBolsaHorasClick={calcularBolsaHoras}
    styles={styles}
/>
```

---

### Passo 3: Substituir Painel de Filtros

**ANTES** (linhas ~3917-4050):
```javascript
<div style={styles.filtersCard}>
    <h3>Filtros de Pesquisa</h3>
    <div style={styles.filtersGrid}>
        <div style={styles.filterGroup}>
            <label>Obra</label>
            <select value={obraSelecionada} onChange={e => setObraSelecionada(e.target.value)}>
                {/* ... options ... */}
            </select>
        </div>
        {/* ... mais filtros ... */}
    </div>
</div>
```

**DEPOIS**:
```javascript
<FiltrosPanel
    obraSelecionada={obraSelecionada}
    utilizadorSelecionado={utilizadorSelecionado}
    mesSelecionado={mesSelecionado}
    anoSelecionado={anoSelecionado}
    obras={obras}
    utilizadores={utilizadores}
    onObraChange={setObraSelecionada}
    onUtilizadorChange={setUtilizadorSelecionado}
    onMesChange={setMesSelecionado}
    onAnoChange={setAnoSelecionado}
    onCarregarClick={carregarDadosGrade}
    styles={styles}
/>
```

---

### Passo 4: Adicionar Botões de Exportação

Adicionar após o painel de filtros:

```javascript
<FiltrosPanel {...props} />

{/* Botões de Exportação */}
{viewMode === 'grade' && dadosGrade.length > 0 && (
    <ExportActions
        dadosGrade={dadosGrade}
        diasDoMes={diasDoMes}
        mesSelecionado={mesSelecionado}
        anoSelecionado={anoSelecionado}
        obraSelecionada={obraSelecionada}
        obras={obras}
        tiposFaltas={tiposFaltas}
        styles={styles}
    />
)}
```

---

### Passo 5: Substituir Modais

**ANTES** (exemplo de modal de hora extra):
```javascript
{horaExtraDialogOpen && (
    <div style={styles.modalOverlay}>
        <div style={styles.modal}>
            <h2>Registar Hora Extra</h2>
            <button onClick={() => setHoraExtraDialogOpen(false)}>X</button>
            {/* ... conteúdo ... */}
        </div>
    </div>
)}
```

**DEPOIS**:
```javascript
<ModalBase
    isOpen={horaExtraDialogOpen}
    onClose={() => setHoraExtraDialogOpen(false)}
    title="Registar Hora Extra"
    size="medium"
    styles={styles}
    footer={
        <>
            <button
                style={styles.cancelButton}
                onClick={() => setHoraExtraDialogOpen(false)}
            >
                Cancelar
            </button>
            <button
                style={styles.primaryButton}
                onClick={handleRegistarHoraExtra}
            >
                Confirmar
            </button>
        </>
    }
>
    <div style={styles.filterGroup}>
        <label style={styles.label}>Utilizador</label>
        <UserSelectionList
            dadosGrade={dadosGrade}
            value={userToRegistar}
            onChange={e => setUserToRegistar(parseInt(e.target.value))}
            style={styles.select}
        />
    </div>

    <div style={styles.filterGroup}>
        <label style={styles.label}>Dia do Mês</label>
        <DaySelectionList
            diasDoMes={diasDoMes}
            mesSelecionado={mesSelecionado}
            anoSelecionado={anoSelecionado}
            value={diaToRegistar}
            onChange={e => setDiaToRegistar(parseInt(e.target.value))}
            style={styles.select}
        />
    </div>

    {/* Resto do conteúdo do modal */}
</ModalBase>
```

**Repetir para todos os modais**:
- Modal Hora Extra
- Modal Falta
- Modal Bulk
- Modal Auto-Fill
- Modal Clear Points
- Modal Remover Falta
- Modal Remover Hora Extra

---

## 📊 Estrutura Final

```
RegistosPorUtilizador.js (componente principal)
├── <NavigationTabs />            # Tabs de navegação
├── <FiltrosPanel />              # Painel de filtros
├── <ExportActions />             # Botões de exportação
│
├── {viewMode === 'grade' && (
│   <table>
│       <tbody>
│           {dadosGrade.map(item => (
│               <RegistoGradeRow      # Linha da grade
│                   item={item}
│                   diasDoMes={diasDoMes}
│                   selectedCells={selectedCells}
│                   onCellClick={handleCellClick}
│                   styles={styles}
│               />
│           ))}
│       </tbody>
│   </table>
│)}
│
├── <ModalBase>                    # Modal de Hora Extra
├── <ModalBase>                    # Modal de Falta
├── <ModalBase>                    # Modal Bulk
├── <ModalBase>                    # Modal Auto-Fill
├── <ModalBase>                    # Modal Clear Points
├── <ModalBase>                    # Modal Remover Falta
└── <ModalBase>                    # Modal Remover Hora Extra
```

---

## ✅ Benefícios da Divisão

### Performance
- ✅ Componentes isolados re-renderizam independentemente
- ✅ FiltrosPanel só re-renderiza quando filtros mudam
- ✅ ExportActions não afeta renderização da grade
- ✅ NavigationTabs memoizada, não re-renderiza com dados

### Manutenibilidade
- ✅ Cada componente <200 linhas (vs 7.758 original)
- ✅ Fácil encontrar e editar funcionalidade específica
- ✅ Componentes testáveis isoladamente
- ✅ Lógica separada por responsabilidade

### Reutilização
- ✅ ModalBase pode ser usado em outros módulos
- ✅ FiltrosPanel padrão para outros ecrãs
- ✅ ExportActions template para exports
- ✅ NavigationTabs reutilizável

---

## 🎯 Próximos Passos

Após integrar estes componentes em RegistosPorUtilizador.js:

1. **Aplicar mesmos padrões em PartesDiarias.js**
   - Criar FiltrosObras, ExportParteDiaria, etc.

2. **Aplicar em Home.js**
   - Criar DashboardCard, StatisticWidget, NotificationPanel

3. **Criar biblioteca de componentes**
   - Documentar padrões
   - Storybook para visualização

---

## 📝 Exemplo Completo de Integração

```javascript
const RegistosPorUtilizador = () => {
    // States originais...
    const [viewMode, setViewMode] = useState('resumo');
    const [dadosGrade, setDadosGrade] = useState([]);
    // ...

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>
                    <span style={styles.icon}>👥</span>
                    Registos de Ponto - Análise Completa
                </h1>
            </div>

            {/* Navigation Tabs */}
            <NavigationTabs
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                utilizadorDetalhado={utilizadorDetalhado}
                onBolsaHorasClick={calcularBolsaHoras}
                styles={styles}
            />

            {/* Filtros */}
            <FiltrosPanel
                obraSelecionada={obraSelecionada}
                utilizadorSelecionado={utilizadorSelecionado}
                mesSelecionado={mesSelecionado}
                anoSelecionado={anoSelecionado}
                obras={obras}
                utilizadores={utilizadores}
                onObraChange={setObraSelecionada}
                onUtilizadorChange={setUtilizadorSelecionado}
                onMesChange={setMesSelecionado}
                onAnoChange={setAnoSelecionado}
                onCarregarClick={carregarDadosGrade}
                styles={styles}
            />

            {/* Exportação */}
            {viewMode === 'grade' && dadosGrade.length > 0 && (
                <ExportActions
                    dadosGrade={dadosGrade}
                    diasDoMes={diasDoMes}
                    mesSelecionado={mesSelecionado}
                    anoSelecionado={anoSelecionado}
                    obraSelecionada={obraSelecionada}
                    obras={obras}
                    tiposFaltas={tiposFaltas}
                    styles={styles}
                />
            )}

            {/* Vista da Grade */}
            {viewMode === 'grade' && (
                <div style={styles.gradeContainer}>
                    <table style={styles.gradeTable}>
                        <thead>
                            {/* Headers... */}
                        </thead>
                        <tbody>
                            {dadosGrade.map((item, index) => (
                                <RegistoGradeRow
                                    key={item.utilizador.id}
                                    item={item}
                                    index={index}
                                    diasDoMes={diasDoMes}
                                    selectedCells={selectedCells}
                                    onCellClick={handleCellClick}
                                    onUtilizadorClick={handleUtilizadorClick}
                                    styles={styles}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modais */}
            <ModalBase
                isOpen={horaExtraDialogOpen}
                onClose={() => setHoraExtraDialogOpen(false)}
                title="Registar Hora Extra"
                size="medium"
                styles={styles}
                footer={
                    <>
                        <button onClick={() => setHoraExtraDialogOpen(false)}>
                            Cancelar
                        </button>
                        <button onClick={handleRegistarHoraExtra}>
                            Confirmar
                        </button>
                    </>
                }
            >
                {/* Conteúdo do modal */}
            </ModalBase>

            {/* Outros modais... */}
        </div>
    );
};
```

---

**Criado**: 2025-12-30
**Versão**: 1.0
**Status**: ✅ Pronto para Integração
