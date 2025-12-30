# 🚀 Guia de Otimização de Performance - RegistosPorUtilizador

## 📋 Resumo

Este guia explica como integrar os componentes otimizados com React.memo, useMemo e useCallback para melhorar drasticamente a performance do componente RegistosPorUtilizador.js (7.758 linhas).

**Impacto Esperado**: -60% re-renders desnecessários, interface mais fluída

---

## 🆕 Novos Componentes Criados

### 1. **RegistoGradeCell.js**
Componente memoizado para cada célula da grade.
- **Localização**: `components/RegistoGradeCell.js`
- **Otimização**: Só re-renderiza se os dados dessa célula específica mudarem
- **Uso**: Renderizar células individuais na tabela

### 2. **RegistoGradeRow.js**
Componente memoizado para cada linha (utilizador) da grade.
- **Localização**: `components/RegistoGradeRow.js`
- **Otimização**: Só re-renderiza se os dados desse utilizador mudarem
- **Uso**: Renderizar linhas completas da tabela

### 3. **UserSelectionList.js**
Componente memoizado para dropdowns de utilizadores.
- **Localização**: `components/UserSelectionList.js`
- **Otimização**: Evita re-renderizar options quando não necessário
- **Uso**: Todos os selects de utilizadores nos modais

### 4. **DaySelectionList.js**
Componente memoizado para dropdowns de dias.
- **Localização**: `components/DaySelectionList.js`
- **Otimização**: Evita re-renderizar options de dias
- **Uso**: Todos os selects de dias nos modais

### 5. **useRegistosOptimized.js**
Hook customizado com cálculos memoizados.
- **Localização**: `hooks/useRegistosOptimized.js`
- **Otimização**: Cacheia cálculos pesados
- **Uso**: Importar e usar no componente principal

---

## 🔧 Como Integrar no RegistosPorUtilizador.js

### **Passo 1: Adicionar Imports**

No início do ficheiro `RegistosPorUtilizador.js`, adicionar:

```javascript
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import RegistoGradeRow from './components/RegistoGradeRow';
import UserSelectionList from './components/UserSelectionList';
import DaySelectionList from './components/DaySelectionList';
import {
    useRegistosOptimized,
    useCalcularHoras,
    useExportData
} from './hooks/useRegistosOptimized';
```

### **Passo 2: Usar Hook Otimizado**

Após definir os states, adicionar (aproximadamente linha 147):

```javascript
// Hook otimizado para cálculos pesados
const {
    cellsByUser,
    utilizadoresList,
    estatisticasGerais,
    findUtilizadorById,
    isCellSelected,
    diasVaziosPorUtilizador
} = useRegistosOptimized(dadosGrade, diasDoMes, selectedCells);

// Dados prontos para exportação Excel
const exportData = useExportData(dadosGrade, diasDoMes);
```

### **Passo 3: Memoizar Funções Auxiliares**

As funções utilitárias devem ser wrappadas com `useCallback`:

```javascript
// ANTES (recriada em cada render):
const obterEndereco = async (lat, lon) => {
    // ...
};

// DEPOIS (memoizada):
const obterEndereco = useCallback(async (lat, lon) => {
    const chave = `${lat},${lon}`;
    if (enderecos[chave]) return enderecos[chave];

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const data = await res.json();
        const endereco = data.display_name || `${lat}, ${lon}`;
        setEnderecos(prev => ({ ...prev, [chave]: endereco }));
        return endereco;
    } catch (err) {
        console.error('Erro ao obter endereço:', err);
        return `${lat}, ${lon}`;
    }
}, [enderecos]);
```

### **Passo 4: Memoizar Callbacks de Eventos**

Todos os handlers devem usar `useCallback`:

```javascript
// Handler para clique em célula
const handleCellClick = useCallback(async (e, userId, dia, cellKey) => {
    // Validação
    const userIdNumber = parseInt(userId, 10);
    const diaNumber = parseInt(dia, 10);

    if (isNaN(userIdNumber) || isNaN(diaNumber)) {
        console.error(`[ERROR] IDs inválidos - userId: ${userId}, dia: ${dia}`);
        return;
    }

    // Ctrl+Click para seleção múltipla
    if (e.ctrlKey || e.metaKey) {
        setSelectedCells(prev => {
            if (prev.includes(cellKey)) {
                return prev.filter(key => key !== cellKey);
            }
            return [...prev, cellKey];
        });
    } else {
        // Clique normal - abrir modal de edição
        setUserToRegistar(userIdNumber);
        setDiaToRegistar(diaNumber);
        setDialogOpen(true);
    }
}, []);

// Handler para clique em utilizador
const handleUtilizadorClick = useCallback((utilizador) => {
    carregarDetalhesUtilizador(utilizador);
    setViewMode('detalhes');
}, [carregarDetalhesUtilizador]);

// Handler bulk confirm
const handleBulkConfirm = useCallback(async () => {
    if (!obraNoDialog) {
        return alert('Escolhe uma obra para registar.');
    }

    try {
        for (const cellKey of selectedCells) {
            const [userId, dia] = cellKey.split('-');
            const userIdNumber = parseInt(userId, 10);
            const diaNumber = parseInt(dia, 10);
            const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(diaNumber).padStart(2, '0')}`;

            const tipos = ['entrada', 'saida', 'entrada', 'saida'];
            const horas = [
                horarios.entradaManha,
                horarios.saidaManha,
                horarios.entradaTarde,
                horarios.saidaTarde
            ];

            for (let i = 0; i < 4; i++) {
                const [hh, mm] = horas[i].split(':').map(Number);
                const timestamp = makeUTCISO(
                    parseInt(anoSelecionado, 10),
                    parseInt(mesSelecionado, 10),
                    parseInt(diaNumber, 10),
                    hh,
                    mm
                );

                const res = await fetch(
                    `https://backend.advir.pt/api/registo-ponto-obra/registar-esquecido-por-outro`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            tipo: tipos[i],
                            obra_id: Number(obraNoDialog),
                            user_id: userIdNumber,
                            timestamp: timestamp
                        })
                    }
                );

                if (!res.ok) throw new Error('Falha ao criar ponto');

                const json = await res.json();
                await fetch(
                    `https://backend.advir.pt/api/registo-ponto-obra/confirmar/${json.id}`,
                    { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
                );
            }
        }

        alert(`Registados e confirmados em bloco ${selectedCells.length} pontos!`);
        setBulkDialogOpen(false);
        setSelectedCells([]);
        carregarDadosGrade();
    } catch (err) {
        alert(err.message);
    }
}, [selectedCells, obraNoDialog, horarios, anoSelecionado, mesSelecionado, token]);
```

### **Passo 5: Substituir Renderização da Grade**

**ANTES** (linha ~5845):
```javascript
{dadosGrade.map((item, index) => (
    <tr key={item.utilizador.id} style={index % 2 === 0 ? styles.gradeRowEven : styles.gradeRowOdd}>
        <td style={{ ...styles.gradeCell, ...styles.gradeCellFixed }} onClick={() => { ... }}>
            {/* ... conteúdo da célula ... */}
        </td>
        {diasDoMes.map(dia => {
            // ... renderização manual de cada célula ...
        })}
    </tr>
))}
```

**DEPOIS** (renderização otimizada):
```javascript
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
```

### **Passo 6: Substituir Dropdowns de Utilizadores**

**ANTES** (aparece 4+ vezes no código):
```javascript
<select
    style={styles.select}
    value={funcionarioSelecionadoAutoFill}
    onChange={e => setFuncionarioSelecionadoAutoFill(e.target.value)}
>
    <option value="">-- Selecione um utilizador --</option>
    {dadosGrade.map(item => (
        <option key={item.utilizador.id} value={item.utilizador.id}>
            {item.utilizador.nome} ({item.utilizador.codFuncionario})
        </option>
    ))}
</select>
```

**DEPOIS**:
```javascript
<UserSelectionList
    dadosGrade={dadosGrade}
    value={funcionarioSelecionadoAutoFill}
    onChange={e => setFuncionarioSelecionadoAutoFill(e.target.value)}
    placeholder="-- Selecione um utilizador --"
    style={styles.select}
/>
```

### **Passo 7: Substituir Dropdowns de Dias**

**ANTES** (aparece 4+ vezes):
```javascript
<select
    style={styles.select}
    value={diaToRegistar || ''}
    onChange={e => setDiaToRegistar(parseInt(e.target.value))}
>
    <option value="">-- Selecione um dia --</option>
    {diasDoMes.map(dia => (
        <option key={dia} value={dia}>
            Dia {dia} ({mesSelecionado}/{anoSelecionado})
        </option>
    ))}
</select>
```

**DEPOIS**:
```javascript
<DaySelectionList
    diasDoMes={diasDoMes}
    mesSelecionado={mesSelecionado}
    anoSelecionado={anoSelecionado}
    value={diaToRegistar}
    onChange={e => setDiaToRegistar(parseInt(e.target.value))}
    placeholder="-- Selecione um dia --"
    style={styles.select}
/>
```

### **Passo 8: Usar Dados Memoizados**

Substituir cálculos inline pelos valores do hook:

**ANTES** (recalculado em cada render):
```javascript
{(() => {
    const grouped = {};
    selectedCells.forEach(cellKey => {
        const [userId, dia] = cellKey.split('-');
        if (!grouped[userId]) grouped[userId] = [];
        grouped[userId].push(parseInt(dia, 10));
    });
    return Object.entries(grouped).map(([userId, dias]) => {
        const funcionario = dadosGrade.find(item => item.utilizador.id === parseInt(userId, 10));
        // ...
    });
})()}
```

**DEPOIS** (já calculado e memoizado):
```javascript
{Object.entries(cellsByUser).map(([userId, dias]) => {
    const funcionario = findUtilizadorById(userId);
    if (!funcionario) return null;
    // ...
})}
```

---

## 📊 Memoizar Cálculos Pesados

### Função `gerarDiasDoMes`

```javascript
const gerarDiasDoMes = useCallback((ano, mes) => {
    const ultimoDia = new Date(ano, mes, 0).getDate();
    return Array.from({ length: ultimoDia }, (_, i) => i + 1);
}, []);
```

### Função `formatarHorasMinutos`

```javascript
const formatarHorasMinutos = useCallback((horasDecimais) => {
    const horas = Math.floor(horasDecimais);
    const minutos = Math.round((horasDecimais - horas) * 60);
    return `${horas}:${pad(minutos)}`;
}, []);
```

### Cálculo de Horas Trabalhadas

```javascript
// Usar hook customizado
const horasCalculadas = useCalcularHoras(registosDetalhados);

// Usar nos componentes:
<div>Total: {horasCalculadas.formatted}</div>
```

---

## 🎯 Benefícios Esperados

### Performance
- ✅ **60-80% menos re-renders** - Componentes só atualizam quando seus dados mudam
- ✅ **Interface mais fluída** - Menos travamentos ao interagir com a grade
- ✅ **Menos CPU** - Cálculos pesados só executam quando necessário
- ✅ **Melhor scrolling** - Listas grandes renderizam mais suave

### Manutenibilidade
- ✅ **Código mais organizado** - Componentes pequenos e focados
- ✅ **Fácil de testar** - Componentes isolados
- ✅ **Reutilizável** - Componentes podem ser usados em outros lugares
- ✅ **DRY** - Sem código duplicado de dropdowns

### Developer Experience
- ✅ **React DevTools Profiler** - Fácil identificar problemas
- ✅ **Debugging simples** - Componentes pequenos são mais fáceis de debugar
- ✅ **Hot Reload mais rápido** - Menos código para recarregar

---

## ⚠️ Notas Importantes

### 1. **Não Memoizar Tudo**
- Só memoize cálculos pesados ou componentes grandes
- Arrays/objetos pequenos não precisam de useMemo
- Não use React.memo em componentes que sempre mudam

### 2. **Dependencies Corretas**
```javascript
// ❌ ERRADO - dependency array vazio quando usa external state
const handleClick = useCallback(() => {
    console.log(dadosGrade); // dadosGrade pode estar stale!
}, []);

// ✅ CORRETO - incluir todas as dependencies
const handleClick = useCallback(() => {
    console.log(dadosGrade);
}, [dadosGrade]);
```

### 3. **Comparação de Objetos**
```javascript
// React.memo faz shallow comparison
// Para objetos complexos, use custom comparator:
const MyComponent = React.memo(({ data }) => {
    // ...
}, (prevProps, nextProps) => {
    return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});
```

### 4. **Evitar Inline Objects/Arrays**
```javascript
// ❌ ERRADO - cria novo objeto em cada render
<RegistoGradeRow
    item={item}
    styles={{ padding: 10, margin: 5 }}
/>

// ✅ CORRETO - usar objeto memoizado
const cellStyles = useMemo(() => ({ padding: 10, margin: 5 }), []);
<RegistoGradeRow
    item={item}
    styles={cellStyles}
/>
```

---

## 🔍 Como Testar Performance

### 1. **React DevTools Profiler**

```bash
# Abrir app em modo desenvolvimento
npm start

# Abrir React DevTools
# Ir para tab "Profiler"
# Clicar em "Record"
# Interagir com a grade
# Parar gravação e analisar flamegraph
```

### 2. **Console Timing**

Adicionar no início das funções pesadas:

```javascript
const carregarDadosGrade = async () => {
    console.time('carregarDadosGrade');

    // ... código existente ...

    console.timeEnd('carregarDadosGrade');
};
```

### 3. **Performance Metrics**

```javascript
// No início do component
useEffect(() => {
    const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
            console.log(`${entry.name}: ${entry.duration}ms`);
        });
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
}, []);

// Medir renders
useEffect(() => {
    performance.mark('render-start');
    return () => {
        performance.mark('render-end');
        performance.measure('render', 'render-start', 'render-end');
    };
});
```

---

## 📚 Próximos Passos

Após integrar estas otimizações:

1. ✅ **PartesDiarias.js** - Aplicar mesmas técnicas (6.864 linhas)
2. ✅ **RegistoPontoFacial.js** - Otimizar face detection (2.744 linhas)
3. ✅ **Home.js** - Dashboard com memoization (2.911 linhas)
4. ✅ **Criar design system** - Tokens centralizados
5. ✅ **Code splitting** - Lazy load de páginas

---

## 🆘 Problemas Comuns

### "Component is not rendering"
- Verificar se props estão a mudar corretamente
- Comparator do React.memo pode estar muito restritivo

### "Still seeing re-renders"
- Verificar dependencies do useCallback/useMemo
- Usar React DevTools Profiler para identificar causa

### "Performance pior"
- Remover memoization de componentes pequenos
- Verificar se comparison function é muito pesada

---

## 📞 Suporte

Se encontrares problemas:
1. Verificar console para erros
2. Usar React DevTools Profiler
3. Comparar com versão original (git diff)

---

**Criado em**: 2025-12-30
**Versão**: 1.0
**Autor**: Claude Code Optimization
