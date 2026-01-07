// MODIFICAÇÕES PARA A FUNÇÃO calcularBolsaHoras
// Aplicar estas mudanças no ficheiro RegistosPorUtilizador.js

// ===== 1. ADICIONAR NO INÍCIO DA FUNÇÃO (após linha 497) =====
// Substituir:
//     const empresaId = secureStorage.getItem('empresa_id');
//
// Por:
    const empresaId = secureStorage.getItem('empresa_id');
    const anoAtual = anoAtualBolsa || new Date().getFullYear();

    // Carregar bolsas guardadas da BD
    let bolsasGuardadas = {};
    try {
        const response = await API.obterBolsasHorasPorAno(token, empresaId, anoAtual);
        if (response.success) {
            response.data.forEach(bolsa => {
                bolsasGuardadas[bolsa.user_id] = {
                    horas_iniciais: parseFloat(bolsa.horas_iniciais) || 0,
                    horas_calculadas: parseFloat(bolsa.horas_calculadas) || 0,
                    ultima_atualizacao: bolsa.ultima_atualizacao
                };
            });
        }
    } catch (error) {
        console.warn('⚠️ [BOLSA] Erro ao carregar bolsas guardadas:', error);
    }

// ===== 2. MODIFICAR CÁLCULO DO SALDO (linha 775) =====
// Substituir:
//     const saldoBolsa = totalHorasTrabalhadas - totalHorasDescontadasFBH;
//
// Por:
                // Obter horas iniciais da BD (transitadas do ano anterior)
                const bolsaGuardada = bolsasGuardadas[user.id] || { horas_iniciais: 0, horas_calculadas: 0 };
                const horasIniciais = parseFloat(bolsaGuardada.horas_iniciais) || 0;

                // Calcular saldo: horas iniciais + horas trabalhadas - descontos
                const saldoBolsa = horasIniciais + totalHorasTrabalhadas - totalHorasDescontadasFBH;

// ===== 3. ADICIONAR CAMPOS NO OBJETO (após linha 789) =====
// Adicionar ao objeto bolsaCalculada.push({...}):
                bolsaCalculada.push({
                    utilizador: user,
                    horario: horarioUser || { descricao: 'Horário Padrão', horasPorDia: 8 },
                    horasPorDia,
                    totalHorasTrabalhadas,
                    totalHorasEsperadas,
                    totalHorasDescontadasFBH,
                    saldoBolsa,
                    diasTrabalhados: totalDiasTrabalhados,
                    dataInicio: dataInicioHorario,
                    detalhes: diasTrabalhadosDetalhes.sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 30),
                    // NOVOS CAMPOS:
                    horasIniciais,
                    bolsaGuardadaBD: !!bolsaGuardada.horas_calculadas,
                    ultimaAtualizacaoBD: bolsaGuardada.ultima_atualizacao
                });

// ===== 4. ADICIONAR AO FINAL DA FUNÇÃO (após setBolsaHoras, linha 796) =====
// Adicionar após:
//     setBolsaHoras(bolsaCalculada);
//
            setBolsaHoras(bolsaCalculada);

            // Se modo recálculo está ativo, guardar valores na BD
            if (modoRecalculo) {
                try {
                    const bolsasParaAtualizar = bolsaCalculada.map(b => ({
                        userId: b.utilizador.id,
                        ano: anoAtual,
                        horas_calculadas: b.saldoBolsa
                    }));

                    await API.atualizarMultiplasBolsas(token, bolsasParaAtualizar);
                    console.log('✅ Bolsas de horas atualizadas na BD');

                    // Desativar modo recálculo
                    setModoRecalculo(false);
                    alert('✅ Bolsa de horas recalculada e guardada com sucesso!');
                } catch (error) {
                    console.error('Erro ao atualizar bolsas na BD:', error);
                    alert('❌ Erro ao guardar bolsas de horas na base de dados');
                }
            }

// ===== 5. MODIFICAR O USEEFFECT QUE CHAMA calcularBolsaHoras =====
// Procurar por:
//     useEffect(() => {
//         if (viewMode === 'bolsa') {
//             calcularBolsaHoras();
//         }
//     }, [viewMode]);
//
// E substituir por:
    useEffect(() => {
        if (viewMode === 'bolsa' && modoRecalculo) {
            calcularBolsaHoras();
        }
    }, [viewMode, modoRecalculo]);

