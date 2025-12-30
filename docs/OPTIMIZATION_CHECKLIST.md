# ✅ Checklist de Otimização de Performance

## 📋 Tarefas de Integração

### Fase 1: Preparação
- [ ] Ler `README_PERFORMANCE_OPTIMIZATION.md`
- [ ] Ler `PERFORMANCE_OPTIMIZATION_SUMMARY.md`
- [ ] Ler `PERFORMANCE_OPTIMIZATION_GUIDE.md`
- [ ] Estudar `RegistosPorUtilizador.EXAMPLE.js`
- [ ] Fazer backup do ficheiro original
- [ ] Criar branch git: `git checkout -b feature/performance-optimization`

---

### Fase 2: RegistosPorUtilizador.js

#### Imports
- [ ] Adicionar `useMemo, useCallback` aos imports do React
- [ ] Importar `RegistoGradeRow` de `./components/RegistoGradeRow`
- [ ] Importar `UserSelectionList` de `./components/UserSelectionList`
- [ ] Importar `DaySelectionList` de `./components/DaySelectionList`
- [ ] Importar hooks de `./hooks/useRegistosOptimized`

#### Hook Otimizado
- [ ] Adicionar `useRegistosOptimized` após definição dos states
- [ ] Verificar que `dadosGrade`, `diasDoMes`, `selectedCells` existem

#### Callbacks Principais
- [ ] Converter `obterEndereco` para `useCallback`
- [ ] Criar `handleCellClick` com `useCallback`
- [ ] Criar `handleUtilizadorClick` com `useCallback`
- [ ] Converter `handleBulkConfirm` para `useCallback`

#### Renderização da Grade
- [ ] Localizar renderização da tabela (linha ~5845)
- [ ] Substituir `<tr>` inline por `<RegistoGradeRow>`
- [ ] Passar props corretas: `item`, `index`, `diasDoMes`, `selectedCells`, etc.
- [ ] Verificar que handlers estão corretos

#### Dropdowns de Utilizadores
- [ ] Encontrar primeiro select de utilizadores
- [ ] Substituir por `<UserSelectionList>`
- [ ] Repetir para todos os selects de utilizadores (~4 instâncias)
- [ ] Verificar que `value` e `onChange` funcionam

#### Dropdowns de Dias
- [ ] Encontrar primeiro select de dias
- [ ] Substituir por `<DaySelectionList>`
- [ ] Repetir para todos os selects de dias (~4 instâncias)
- [ ] Verificar props: `diasDoMes`, `mesSelecionado`, `anoSelecionado`

#### Usar Dados Memoizados
- [ ] Substituir cálculo inline de `cellsByUser`
- [ ] Usar `findUtilizadorById` em vez de `.find()`
- [ ] Usar `estatisticasGerais` para stats
- [ ] Usar `exportData` para Excel

---

### Fase 3: PartesDiarias.js

#### Imports
- [ ] Importar `TrabalhadorRow` de `./components/TrabalhadorRow`
- [ ] Importar `DiasHeaderRow` de `./components/DiaHeader`

#### Renderização
- [ ] Substituir header da tabela por `<DiasHeaderRow>`
- [ ] Substituir linhas de trabalhadores por `<TrabalhadorRow>`
- [ ] Verificar callbacks de clique

---

### Fase 4: Testes

#### Testes Funcionais
- [ ] App compila sem erros
- [ ] Grade renderiza corretamente
- [ ] Clique em células funciona
- [ ] Seleção múltipla (Ctrl+Click) funciona
- [ ] Modais abrem corretamente
- [ ] Dropdowns mostram opções
- [ ] Botões de ação funcionam
- [ ] Exportar Excel funciona

#### Testes Visuais
- [ ] Estilos mantidos (cores, tamanhos)
- [ ] Células têm backgrounds corretos
- [ ] Hover effects funcionam
- [ ] Loading states aparecem
- [ ] Modais estão centrados

#### Testes de Performance
- [ ] Abrir React DevTools Profiler
- [ ] Gravar interação com a grade
- [ ] Verificar número de re-renders
- [ ] Componentes memoizados não re-renderizam desnecessariamente
- [ ] Flamegraph mostra melhorias

---

### Fase 5: Validação

#### Métricas (Antes vs Depois)
- [ ] Registar tempo de render inicial
- [ ] Registar FPS durante scroll
- [ ] Registar tempo de resposta a cliques
- [ ] Contar re-renders numa operação típica
- [ ] Medir uso de memória

#### Code Review
- [ ] Todos os `useCallback` têm dependencies corretas
- [ ] Todos os `useMemo` têm dependencies corretas
- [ ] Sem inline objects/arrays em props
- [ ] Keys únicas em todas as listas
- [ ] Console.logs removidos

---

### Fase 6: Documentação

- [ ] Atualizar comentários no código
- [ ] Documentar métricas de melhoria
- [ ] Criar pull request com descrição detalhada
- [ ] Adicionar screenshots de performance (antes/depois)

---

## 🎯 Critérios de Sucesso

### Performance
- [ ] ≥60% redução em re-renders
- [ ] ≥50% redução em tempo de render
- [ ] FPS constante durante scroll (≥50fps)
- [ ] Resposta a cliques <100ms

### Código
- [ ] Sem warnings no console
- [ ] Sem erros no console
- [ ] Código segue padrões estabelecidos
- [ ] Componentes reutilizáveis criados

### Funcionalidade
- [ ] Todas as features funcionam
- [ ] Sem regressões visuais
- [ ] Sem bugs introduzidos

---

## 🐛 Troubleshooting

### Problema: Componente não renderiza
- [ ] Verificar imports estão corretos
- [ ] Verificar props passadas existem
- [ ] Verificar comparator do React.memo
- [ ] Console mostra erros?

### Problema: Muitos re-renders ainda
- [ ] Dependencies do useCallback/useMemo corretas?
- [ ] Está a passar inline objects/arrays?
- [ ] Verificar com React DevTools Profiler
- [ ] Componentes parent estão otimizados?

### Problema: Performance piorou
- [ ] Remover memoization de componentes pequenos
- [ ] Comparison function é muito pesada?
- [ ] Verificar se dependencies estão corretas
- [ ] Bundle size aumentou muito?

### Problema: Estilos quebrados
- [ ] Verificar props `styles` passadas
- [ ] Verificar nomes de classes CSS
- [ ] Comparar com versão original

---

## 📊 Template de Métricas

### Antes da Otimização
```
Data: ___________
Componente: RegistosPorUtilizador.js

Tempo render inicial: ______ ms
FPS durante scroll: ______ fps
Re-renders por ação: ______
Tempo resposta clique: ______ ms
Uso memória: ______ MB
```

### Depois da Otimização
```
Data: ___________
Componente: RegistosPorUtilizador.js

Tempo render inicial: ______ ms (___% melhoria)
FPS durante scroll: ______ fps (___% melhoria)
Re-renders por ação: ______ (___% redução)
Tempo resposta clique: ______ ms (___% melhoria)
Uso memória: ______ MB (___% mudança)
```

---

## 📝 Notas de Implementação

### Data: ___________
**Implementador**: ___________

#### Desafios Encontrados:
```
1.
2.
3.
```

#### Soluções Aplicadas:
```
1.
2.
3.
```

#### Observações:
```
1.
2.
3.
```

---

## ✨ Próximos Passos

Após completar este checklist:

- [ ] Aplicar em outros componentes grandes (Home.js, RegistoPontoFacial.js)
- [ ] Implementar code splitting (lazy loading)
- [ ] Criar design system centralizado
- [ ] Adicionar error boundaries
- [ ] Implementar testing automatizado
- [ ] Documentar padrões para novos componentes

---

**Boa sorte! 🚀**

_Este checklist deve ser guardado e preenchido durante a implementação._
