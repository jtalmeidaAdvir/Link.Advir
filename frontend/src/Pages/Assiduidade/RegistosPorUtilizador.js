import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import EditarRegistoModal from './EditarRegistoModalWeb';

const RegistosPorUtilizador = () => {
    const [utilizadores, setUtilizadores] = useState([]);
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState('');
    const [utilizadorSelecionado, setUtilizadorSelecionado] = useState('');
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [dataSelecionada, setDataSelecionada] = useState('');
    const [resumoUtilizadores, setResumoUtilizadores] = useState([]);
    const [utilizadorDetalhado, setUtilizadorDetalhado] = useState(null);
    const [registosDetalhados, setRegistosDetalhados] = useState([]);
    const [agrupadoPorDia, setAgrupadoPorDia] = useState({});
    const [loading, setLoading] = useState(false);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);
    const [enderecos, setEnderecos] = useState({});
    const [filtroTipo, setFiltroTipo] = useState('');

    // New states for grid view
    const [viewMode, setViewMode] = useState('resumo'); // 'resumo', 'grade', 'detalhes'
    const [dadosGrade, setDadosGrade] = useState([]);
    const [loadingGrade, setLoadingGrade] = useState(false);
    const [diasDoMes, setDiasDoMes] = useState([]);
    const [tiposFaltas, setTiposFaltas] = useState({});

    const token = localStorage.getItem('loginToken');

    // State for loading status in grade view
    const [carregando, setCarregando] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [userToRegistar, setUserToRegistar] = useState(null);
    const [diaToRegistar, setDiaToRegistar] = useState(null);
    const [obraNoDialog, setObraNoDialog] = useState(obraSelecionada || '');

    const [selectedCells, setSelectedCells] = useState([]);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [loadingBulkDelete, setLoadingBulkDelete] = useState(false);

    // Estados para edição direta
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [registoParaEditar, setRegistoParaEditar] = useState(null);
    const [dadosEdicao, setDadosEdicao] = useState({
        userId: null,
        dia: null,
        registos: []
    });


    const [horarios, setHorarios] = useState({
        entradaManha: '09:00',
        saidaManha: '13:00',
        entradaTarde: '14:00',
        saidaTarde: '18:00'
    });

    const pad = (n) => String(n).padStart(2, '0');

    // Converte (ano, mes 1-12, dia, hh, mm) local → ISO UTC com 'Z'
    const makeUTCISO = (ano, mes, dia, hh, mm) => {
        const d = new Date(ano, mes - 1, dia, hh, mm, 0); // local
        return d.toISOString().slice(0, 19) + 'Z';        // UTC com 'Z'
    };

    const makeUTCISOFromStrings = (dataYmd, horaHm) => {
        const [y, m, d] = String(dataYmd).split('-').map(Number);
        const [hh, mm] = String(horaHm ?? '00:00').split(':').map(Number);
        return makeUTCISO(y, m, d, hh, mm);
    };





    // State for falta modal
    const [faltaDialogOpen, setFaltaDialogOpen] = useState(false);
    const [tipoFaltaSelecionado, setTipoFaltaSelecionado] = useState('');
    const [duracaoFalta, setDuracaoFalta] = useState(''); // 'd' for day, 'h' for hour

    // State for auto-fill modal
    const [autoFillDialogOpen, setAutoFillDialogOpen] = useState(false);
    const [funcionarioSelecionadoAutoFill, setFuncionarioSelecionadoAutoFill] = useState('');
    const [loadingAutoFill, setLoadingAutoFill] = useState(false);

    // State for clear points modal
    const [clearPointsDialogOpen, setClearPointsDialogOpen] = useState(false);
    const [funcionarioSelecionadoClear, setFuncionarioSelecionadoClear] = useState('');
    const [diaSelecionadoClear, setDiaSelecionadoClear] = useState('');
    const [loadingClear, setLoadingClear] = useState(false);


    const handleBulkConfirm = async () => {
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
                    // Criar timestamp sem timezone offset para evitar +1 hora
                    const [hh, mm] = horas[i].split(':').map(Number);
                    const timestamp = makeUTCISO(parseInt(anoSelecionado, 10), parseInt(mesSelecionado, 10), parseInt(diaNumber, 10), hh, mm);


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
            setSelectedCells([]);        // <-- aqui
            carregarDadosGrade();
        } catch (err) {
            alert(err.message);
        }
    };



    const obterEndereco = async (lat, lon) => {
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
    };

    useEffect(() => {
        carregarUtilizadores();
        carregarObras();
        carregarTiposFaltas();
    }, []);

    const carregarTiposFaltas = async () => {
        const painelAdminToken = localStorage.getItem('painelAdminToken');
        const urlempresa = localStorage.getItem('urlempresa');

        if (!painelAdminToken || !urlempresa) return;

        try {
            const res = await fetch('https://webapiprimavera.advir.pt/routesFaltas/GetListaTipoFaltas', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${painelAdminToken}`,
                    urlempresa: urlempresa,
                },
            });

            if (res.ok) {
                const data = await res.json();
                const tipos = data?.DataSet?.Table ?? [];
                const mapaFaltas = {};
                tipos.forEach(t => {
                    mapaFaltas[t.Falta] = t.Descricao;
                });
                setTiposFaltas(mapaFaltas);
            }
        } catch (err) {
            console.error('Erro ao carregar tipos de faltas:', err);
        }
    };

    useEffect(() => {
        if (utilizadorSelecionado) {
            carregarDetalhesUtilizador(utilizadores.find(u => u.id.toString() === utilizadorSelecionado.toString()));
        }
    }, [utilizadorSelecionado, mesSelecionado, anoSelecionado]);

    const carregarUtilizadores = async () => {
        try {
            const res = await fetch(`https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${localStorage.getItem('empresa_id')}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setUtilizadores(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erro ao carregar utilizadores:', err);
            setUtilizadores([]);
        }
    };

    const carregarObras = async () => {
        const empresaId = localStorage.getItem('empresa_id');

        if (!empresaId) {
            console.error('ID da empresa não encontrado');
            return;
        }

        try {
            const res = await fetch(`https://backend.advir.pt/api/obra/por-empresa?empresa_id=${empresaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setObras(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erro ao carregar obras:', err);
        }
    };

    const gerarDiasDoMes = (ano, mes) => {
        if (!ano || !mes) return [];

        const dataInicio = new Date(ano, mes - 1, 1);
        const dataFim = new Date(ano, mes, 0);
        const dias = [];

        for (let dia = 1; dia <= dataFim.getDate(); dia++) {
            dias.push(dia);
        }

        return dias;
    };

    const carregarDadosGrade = async () => {
        if (!anoSelecionado || !mesSelecionado) {
            alert('Por favor, selecione o ano e mês para visualização em grade.');
            return;
        }

        setLoadingGrade(true);
        setDadosGrade([]);

        try {
            const dias = gerarDiasDoMes(parseInt(anoSelecionado), parseInt(mesSelecionado));
            setDiasDoMes(dias);

            let utilizadoresParaPesquisar = utilizadores;

            // Se tiver obra selecionada, filtrar utilizadores dessa obra
            if (obraSelecionada) {
                const promises = dias.map(dia => {
                    const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                    return fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-obra-e-dia?obra_id=${obraSelecionada}&data=${dataFormatada}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(res => res.json()).catch(() => []);
                });

                const resultados = await Promise.all(promises);
                const userIdsObra = [...new Set(resultados.flat().map(reg => reg.User?.id).filter(Boolean))];
                utilizadoresParaPesquisar = utilizadores.filter(u => userIdsObra.includes(u.id));
            }

            const dadosGradeTemp = [];

            for (const user of utilizadoresParaPesquisar) {
                try {
                    // Carregar registos de ponto
                    let query = `user_id=${user.id}&ano=${anoSelecionado}&mes=${String(mesSelecionado).padStart(2, '0')}`;
                    if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

                    const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    // Carregar faltas do utilizador
                    const painelAdminToken = localStorage.getItem('painelAdminToken');
                    const urlempresa = localStorage.getItem('urlempresa');
                    const loginToken = localStorage.getItem('loginToken');

                    console.log(`[DEBUG] Carregando faltas para ${user.nome} (ID: ${user.id})`);
                    console.log(`[DEBUG] painelAdminToken:`, painelAdminToken ? 'Existe' : 'Não existe');
                    console.log(`[DEBUG] urlempresa:`, urlempresa);
                    console.log(`[DEBUG] loginToken:`, loginToken ? 'Existe' : 'Não existe');

                    let faltasUtilizador = [];
                    if (painelAdminToken && urlempresa && loginToken) {
                        try {
                            // Primeiro, obter o codFuncionario do backend
                            console.log(`[DEBUG] Obtendo codFuncionario para userId: ${user.id}`);
                            const resCodFuncionario = await fetch(`https://backend.advir.pt/api/users/getCodFuncionario/${user.id}`, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${loginToken}`,
                                    'Content-Type': 'application/json',
                                },
                            });

                            if (!resCodFuncionario.ok) {
                                const errorText = await resCodFuncionario.text();
                                console.warn(`[DEBUG] Erro ao obter codFuncionario para ${user.nome}:`, errorText);
                                throw new Error(`Erro ao obter código do funcionário: ${errorText}`);
                            }

                            const dataCodFuncionario = await resCodFuncionario.json();
                            const codFuncionario = dataCodFuncionario.codFuncionario;

                            if (!codFuncionario) {
                                console.warn(`[DEBUG] codFuncionario não encontrado para ${user.nome}`);
                                throw new Error('Código do funcionário não encontrado');
                            }

                            console.log(`[DEBUG] codFuncionario obtido para ${user.nome}:`, codFuncionario);

                            // Agora usar o codFuncionario para buscar as faltas
                            const urlFaltas = `https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionario/${codFuncionario}`;
                            console.log(`[DEBUG] URL chamada para faltas:`, urlFaltas);

                            const resFaltas = await fetch(urlFaltas, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${painelAdminToken}`,
                                    urlempresa: urlempresa,

                                },
                            });

                            console.log(`[DEBUG] Status da resposta faltas:`, resFaltas.status);

                            if (resFaltas.ok) {
                                const dataFaltas = await resFaltas.json();
                                console.log(`[DEBUG] Resposta completa das faltas para ${user.nome} (codFuncionario: ${codFuncionario}):`, dataFaltas);

                                const listaFaltas = dataFaltas?.DataSet?.Table ?? [];
                                console.log(`[DEBUG] Lista de faltas extraída:`, listaFaltas);
                                console.log(`[DEBUG] Número total de faltas encontradas:`, listaFaltas.length);

                                // Filtrar faltas do mês/ano atual
                                faltasUtilizador = listaFaltas.filter(f => {
                                    const dataFalta = new Date(f.Data);
                                    const anoFalta = dataFalta.getFullYear();
                                    const mesFalta = dataFalta.getMonth();
                                    const filtroMatch = anoFalta === parseInt(anoSelecionado) && mesFalta === parseInt(mesSelecionado) - 1;

                                    console.log(`[DEBUG] Falta: ${f.Data} - Ano: ${anoFalta}, Mês: ${mesFalta + 1}, Match: ${filtroMatch}`);

                                    return filtroMatch;
                                });

                                console.log(`[DEBUG] Faltas filtradas para ${user.nome} (${mesSelecionado}/${anoSelecionado}):`, faltasUtilizador);
                            } else {
                                const errorText = await resFaltas.text();
                                console.error(`[DEBUG] Erro na resposta das faltas (status: ${resFaltas.status}):`, errorText);
                            }
                        } catch (faltaErr) {
                            console.error(`[DEBUG] Erro completo ao carregar faltas para ${user.nome}:`, faltaErr);
                        }
                    } else {
                        console.warn(`[DEBUG] Tokens em falta - painelAdminToken: ${!!painelAdminToken}, urlempresa: ${!!urlempresa}, loginToken: ${!!loginToken}`);
                    }

                    if (res.ok) {
                        const registos = await res.json();

                        // Organizar registos por dia
                        const registosPorDia = {};
                        registos.forEach(reg => {
                            const dia = new Date(reg.timestamp).getDate();
                            if (!registosPorDia[dia]) registosPorDia[dia] = [];
                            registosPorDia[dia].push(reg);
                        });

                        // Organizar faltas por dia
                        const faltasPorDia = {};
                        faltasUtilizador.forEach(falta => {
                            const dia = new Date(falta.Data).getDate();
                            if (!faltasPorDia[dia]) faltasPorDia[dia] = [];
                            faltasPorDia[dia].push(falta);
                        });

                        // Calcular estatísticas por dia
                        const estatisticasDias = {};

                        // Processar todos os dias do mês
                        dias.forEach(dia => {
                            const regs = registosPorDia[dia] || [];
                            const faltas = faltasPorDia[dia] || [];

                            if (regs.length > 0 || faltas.length > 0) {
                                const entradas = regs.filter(r => r.tipo === 'entrada').length;
                                const saidas = regs.filter(r => r.tipo === 'saida').length;
                                const confirmados = regs.filter(r => r.is_confirmed).length;
                                const naoConfirmados = regs.length - confirmados;

                                // Calcular horas estimadas
                                let horasEstimadas = 0;
                                const eventosOrdenados = regs
                                    .filter(r => r.tipo === 'entrada' || r.tipo === 'saida')
                                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                                let ultimaEntrada = null;
                                eventosOrdenados.forEach(reg => {
                                    if (reg.tipo === 'entrada') {
                                        ultimaEntrada = new Date(reg.timestamp);
                                    } else if (reg.tipo === 'saida' && ultimaEntrada) {
                                        const saida = new Date(reg.timestamp);
                                        const diff = (saida - ultimaEntrada) / (1000 * 60 * 60);
                                        if (diff > 0 && diff < 24) {
                                            horasEstimadas += diff;
                                        }
                                        ultimaEntrada = null;
                                    }
                                });

                                estatisticasDias[dia] = {
                                    totalRegistos: regs.length,
                                    entradas,
                                    saidas,
                                    confirmados,
                                    naoConfirmados,
                                    horasEstimadas: horasEstimadas.toFixed(1),
                                    primeiroRegisto: regs.length > 0 ? new Date(Math.min(...regs.map(r => new Date(r.timestamp)))).toLocaleTimeString('pt-PT') : null,
                                    ultimoRegisto: regs.length > 0 ? new Date(Math.max(...regs.map(r => new Date(r.timestamp)))).toLocaleTimeString('pt-PT') : null,
                                    obras: [...new Set(regs.map(r => r.Obra?.nome).filter(Boolean))],
                                    faltas: faltas
                                };
                            }
                        });

                        const totalDiasComRegistos = Object.keys(registosPorDia).length;
                        const totalHorasEstimadas = Object.values(estatisticasDias).reduce((acc, dia) => acc + parseFloat(dia?.horasEstimadas || 0), 0);

                        const dadosUtilizador = {
                            utilizador: user,
                            estatisticasDias,
                            totalDias: totalDiasComRegistos,
                            totalRegistos: registos.length,
                            totalHorasEstimadas: totalHorasEstimadas.toFixed(1),
                            totalFaltas: faltasUtilizador.length
                        };

                        console.log(`[DEBUG] Dados finais para ${user.nome}:`, dadosUtilizador);
                        console.log(`[DEBUG] Estatísticas por dia para ${user.nome}:`, estatisticasDias);

                        dadosGradeTemp.push(dadosUtilizador);
                    } else {
                        // Mesmo se não houver registos, adicionar o utilizador com dados vazios
                        dadosGradeTemp.push({
                            utilizador: user,
                            estatisticasDias: {},
                            totalDias: 0,
                            totalRegistos: 0,
                            totalHorasEstimadas: '0.0',
                            totalFaltas: 0
                        });
                    }
                } catch (err) {
                    console.error(`Erro ao carregar dados do utilizador ${user.nome}:`, err);
                    // Adicionar utilizador com dados vazios em caso de erro
                    dadosGradeTemp.push({
                        utilizador: user,
                        estatisticasDias: {},
                        totalDias: 0,
                        totalRegistos: 0,
                        totalHorasEstimadas: '0.0',
                        totalFaltas: 0
                    });
                }
            }

            // Ordenar por total de horas (decrescente)
            dadosGradeTemp.sort((a, b) => parseFloat(b.totalHorasEstimadas) - parseFloat(a.totalHorasEstimadas));
            setDadosGrade(dadosGradeTemp);

            console.log('Dados carregados para a grade:', dadosGradeTemp);

        } catch (err) {
            console.error('Erro ao carregar dados da grade:', err);
        } finally {
            setLoadingGrade(false);
        }
    };

    const carregarResumoUtilizadores = async () => {
        setLoading(true);
        setResumoUtilizadores([]);
        setUtilizadorDetalhado(null);

        try {
            let utilizadoresParaPesquisar = utilizadores;

            // Se tiver utilizador específico selecionado, usar apenas esse
            if (utilizadorSelecionado) {
                const userSelecionado = utilizadores.find(u => u.id.toString() === utilizadorSelecionado.toString());
                utilizadoresParaPesquisar = userSelecionado ? [userSelecionado] : [];
            }
            // Se tiver obra selecionada, buscar apenas utilizadores dessa obra
            else if (obraSelecionada && dataSelecionada) {
                const resObraUsers = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-obra-e-dia?obra_id=${obraSelecionada}&data=${dataSelecionada}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const dataObraUsers = await resObraUsers.json();

                // Extrair utilizadores únicos desta obra
                const userIdsObra = [...new Set(dataObraUsers.map(reg => reg.User?.id).filter(Boolean))];
                utilizadoresParaPesquisar = utilizadores.filter(u => userIdsObra.includes(u.id));
            }

            const resumos = [];

            for (const user of utilizadoresParaPesquisar) {
                try {
                    let query = `user_id=${user.id}`;

                    if (dataSelecionada) {
                        query += `&data=${dataSelecionada}`;
                    } else {
                        if (anoSelecionado) query += `&ano=${anoSelecionado}`;
                        if (mesSelecionado) query += `&mes=${String(mesSelecionado).padStart(2, '0')}`;
                    }
                    if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

                    const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.ok) {
                        const registos = await res.json();

                        if (registos.length > 0) {
                            // Calcular estatísticas do utilizador
                            const diasUnicos = [...new Set(registos.map(r => new Date(r.timestamp).toISOString().split('T')[0]))];
                            const totalRegistos = registos.length;
                            const registosConfirmados = registos.filter(r => r.is_confirmed).length;

                            // Calcular horas trabalhadas (estimativa baseada em entradas/saídas)
                            const horasPorDia = {};
                            registos.forEach(reg => {
                                const dia = new Date(reg.timestamp).toISOString().split('T')[0];
                                if (!horasPorDia[dia]) horasPorDia[dia] = [];
                                horasPorDia[dia].push(reg);
                            });

                            let totalHorasEstimadas = 0;

                            Object.values(horasPorDia).forEach(registosDia => {
                                // Ordenar os registos por timestamp
                                const eventosOrdenados = registosDia
                                    .filter(r => r.tipo === 'entrada' || r.tipo === 'saida')
                                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                                let ultimaEntrada = null;
                                let horasDia = 0;

                                eventosOrdenados.forEach(reg => {
                                    if (reg.tipo === 'entrada') {
                                        ultimaEntrada = new Date(reg.timestamp);
                                    } else if (reg.tipo === 'saida' && ultimaEntrada) {
                                        const saida = new Date(reg.timestamp);
                                        const diff = (saida - ultimaEntrada) / (1000 * 60 * 60); // em horas
                                        if (diff > 0 && diff < 24) {
                                            horasDia += diff;
                                        }
                                        ultimaEntrada = null; // limpar entrada após pareamento
                                    }
                                });

                                totalHorasEstimadas += horasDia;
                            });

                            const obrasUtilizador = [...new Set(registos.map(r => r.Obra?.nome).filter(Boolean))];

                            resumos.push({
                                utilizador: user,
                                totalDias: diasUnicos.length,
                                totalRegistos,
                                registosConfirmados,
                                registosNaoConfirmados: totalRegistos - registosConfirmados,
                                percentagemConfirmados: totalRegistos > 0 ? ((registosConfirmados / totalRegistos) * 100).toFixed(1) : 0,
                                totalHorasEstimadas: totalHorasEstimadas.toFixed(1),
                                obras: obrasUtilizador,
                                periodoInicio: new Date(Math.min(...registos.map(r => new Date(r.timestamp)))).toLocaleDateString('pt-PT'),
                                periodoFim: new Date(Math.max(...registos.map(r => new Date(r.timestamp)))).toLocaleDateString('pt-PT')
                            });
                        }
                    }
                } catch (err) {
                    console.error(`Erro ao carregar dados do utilizador ${user.nome}:`, err);
                }
            }

            // Ordenar por total de horas (decrescente)
            resumos.sort((a, b) => parseFloat(b.totalHorasEstimadas) - parseFloat(a.totalHorasEstimadas));
            setResumoUtilizadores(resumos);

        } catch (err) {
            console.error('Erro ao carregar resumo:', err);
        } finally {
            setLoading(false);
        }
    };

    const carregarDetalhesUtilizador = async (user) => {
        setLoadingDetalhes(true);
        setUtilizadorDetalhado(user);

        try {
            let query = `user_id=${user.id}`;

            if (dataSelecionada) {
                query += `&data=${dataSelecionada}`;
            } else {
                if (anoSelecionado) query += `&ano=${anoSelecionado}`;
                if (mesSelecionado) query += `&mes=${String(mesSelecionado).padStart(2, '0')}`;
            }
            if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

            const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();

            const agrupados = {};
            data.forEach(reg => {
                const dia = new Date(reg.timestamp).toISOString().split('T')[0];
                if (!agrupados[dia]) agrupados[dia] = [];
                agrupados[dia].push(reg);
            });

            setRegistosDetalhados(data);
            setAgrupadoPorDia(agrupados);

        } catch (err) {
            console.error('Erro ao carregar detalhes:', err);
        } finally {
            setLoadingDetalhes(false);
        }
    };




    useEffect(() => {
        const fetchEnderecos = async () => {
            if (!utilizadorDetalhado) return;

            const promessas = [];
            Object.values(agrupadoPorDia).flat().forEach((reg) => {
                if (reg.latitude && reg.longitude) {
                    const chave = `${reg.latitude},${reg.longitude}`;
                    if (!enderecos[chave]) {
                        promessas.push(obterEndereco(reg.latitude, reg.longitude));
                    }
                }
            });
            if (promessas.length > 0) await Promise.all(promessas);
        };

        if (Object.keys(agrupadoPorDia).length > 0) {
            fetchEnderecos();
        }
    }, [agrupadoPorDia, utilizadorDetalhado]);

    const exportarResumo = () => {
        if (!resumoUtilizadores.length) {
            alert('Não há dados para exportar');
            return;
        }

        const workbook = XLSX.utils.book_new();

        const dadosExport = [];

        // Cabeçalho
        dadosExport.push([
            'Resumo de Registos por Utilizador',
            '',
            '',
            '',
            `Período: ${dataSelecionada || `${mesSelecionado}/${anoSelecionado}`}`
        ]);
        dadosExport.push([]);

        // Cabeçalhos da tabela
        dadosExport.push([
            'Utilizador',
            'Total Dias',
            'Total Registos',
            'Confirmados',
            'Não Confirmados',
            '% Confirmação',
            'Horas Estimadas',
            'Obras',
            'Período'
        ]);

        // Dados dos utilizadores
        resumoUtilizadores.forEach(resumo => {
            dadosExport.push([
                resumo.utilizador.nome,
                resumo.totalDias,
                resumo.totalRegistos,
                resumo.registosConfirmados,
                resumo.registosNaoConfirmados,
                `${resumo.percentagemConfirmados}%`,
                resumo.totalHorasEstimadas,
                resumo.obras.join(', '),
                `${resumo.periodoInicio} - ${resumo.periodoFim}`
            ]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);

        const wscols = [
            { wch: 25 }, // Utilizador
            { wch: 12 }, // Total Dias
            { wch: 15 }, // Total Registos
            { wch: 12 }, // Confirmados
            { wch: 15 }, // Não Confirmados
            { wch: 15 }, // % Confirmação
            { wch: 15 }, // Horas Estimadas
            { wch: 30 }, // Obras
            { wch: 20 }  // Período
        ];
        worksheet['!cols'] = wscols;

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo');

        const fileName = `Resumo_Utilizadores_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const exportarGrade = () => {
        if (!dadosGrade.length) {
            alert('Não há dados da grade para exportar');
            return;
        }

        const workbook = XLSX.utils.book_new();

        const dadosExport = [];

        // Cabeçalho
        dadosExport.push([
            'Grade Mensal de Registos',
            '',
            '',
            '',
            `${mesSelecionado}/${anoSelecionado}`
        ]);
        dadosExport.push([]);

        // Cabeçalhos da tabela
        const headers = ['Utilizador'];
        diasDoMes.forEach(dia => headers.push(`Dia ${dia}`));
        headers.push('Total Dias', 'Total Horas');
        dadosExport.push(headers);

        // Dados dos utilizadores
        dadosGrade.forEach(item => {
            const row = [item.utilizador.nome];

            diasDoMes.forEach(dia => {
                const estatisticas = item.estatisticasDias[dia];
                if (estatisticas) {
                    row.push(`${estatisticas.horasEstimadas}h (${estatisticas.totalRegistos}r)`);
                } else {
                    row.push('-');
                }
            });

            row.push(item.totalDias, `${item.totalHorasEstimadas}h`);
            dadosExport.push(row);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Grade');

        const fileName = `Grade_Mensal_${mesSelecionado}_${anoSelecionado}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const exportarDetalhesUtilizador = () => {
        if (!utilizadorDetalhado || !registosDetalhados.length) {
            alert('Não há detalhes para exportar');
            return;
        }

        const workbook = XLSX.utils.book_new();

        const dadosExport = [];

        // Cabeçalho
        dadosExport.push([
            `Detalhes de Registos - ${utilizadorDetalhado.nome}`,
            '',
            '',
            '',
            `Período: ${dataSelecionada || `${mesSelecionado}/${anoSelecionado}`}`
        ]);
        dadosExport.push([]);

        // Cabeçalhos da tabela
        dadosExport.push([
            'Data',
            'Hora',
            'Tipo',
            'Obra',
            'Confirmado',
            'Justificação',
            'Localização'
        ]);

        // Dados dos registos
        Object.entries(agrupadoPorDia).forEach(([dia, eventos]) => {
            eventos
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .forEach(evento => {
                    dadosExport.push([
                        new Date(dia).toLocaleDateString('pt-PT'),
                        new Date(evento.timestamp).toLocaleTimeString('pt-PT'),
                        evento.tipo.toUpperCase(),
                        evento.Obra?.nome || 'N/A',
                        evento.is_confirmed ? 'Sim' : 'Não',
                        evento.justificacao || '',
                        evento.latitude && evento.longitude
                            ? enderecos[`${evento.latitude},${evento.longitude}`] || 'A obter...'
                            : 'N/A'
                    ]);
                });
        });

        const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);

        const wscols = [
            { wch: 12 }, // Data
            { wch: 10 }, // Hora
            { wch: 12 }, // Tipo
            { wch: 25 }, // Obra
            { wch: 12 }, // Confirmado
            { wch: 30 }, // Justificação
            { wch: 40 }  // Localização
        ];
        worksheet['!cols'] = wscols;

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Detalhes');

        const fileName = `Detalhes_${utilizadorDetalhado.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const registosFiltrados = Object.entries(agrupadoPorDia).reduce((acc, [dia, eventos]) => {
        const eventosFiltrados = filtroTipo
            ? eventos.filter(e => e.tipo === filtroTipo)
            : eventos;

        if (eventosFiltrados.length > 0) {
            acc[dia] = eventosFiltrados;
        }
        return acc;
    }, {});

    const obterCorStatusDia = (estatisticas) => {
        if (!estatisticas || estatisticas.totalRegistos === 0) return '#f8f9fa';

        const percentagemConfirmados = (estatisticas.confirmados / estatisticas.totalRegistos) * 100;
        const horas = parseFloat(estatisticas.horasEstimadas);

        if (percentagemConfirmados === 100 && horas >= 7) return '#d4edda'; // Verde claro - perfeito
        if (percentagemConfirmados >= 80 && horas >= 6) return '#fff3cd'; // Amarelo - bom
        if (percentagemConfirmados >= 50 || horas >= 4) return '#f8d7da'; // Rosa - problema menor
        return '#f5c6cb'; // Vermelho claro - problema sério
    };

    // Registar ponto para um utilizador específico usando SEMPRE o endpoint de "esquecido" + confirmar
    const registarPontoParaUtilizador = async (
        userId,
        dia,
        obraId,
        tipo = 'entrada',
        horaStr = '09:00' // <- usa horaStr e tem default
    ) => {
        if (!userId || !dia || !anoSelecionado || !mesSelecionado || !obraId) {
            return alert('Faltam dados para registar ponto');
        }

        const uid = Number(userId);
        const oid = Number(obraId);
        const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        try {
            const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/registar-esquecido-por-outro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tipo, obra_id: oid, user_id: uid, timestamp })
            });
            if (!res.ok) throw new Error('Falha ao criar ponto');
            const json = await res.json();
            await fetch(`https://backend.advir.pt/api/registo-ponto-obra/confirmar/${json.id}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (viewMode === 'grade') carregarDadosGrade();
        } catch (err) {
            alert(err.message);
        }
    };


    // Function to get cell content (including absence data)
    const obterConteudoCelula = (funcionario, dia) => {
        const registosDoDia = funcionario.registos?.filter(r => {
            const dataRegisto = new Date(r.dataRegisto || r.Data);
            return dataRegisto.getDate() === dia;
        }) || [];

        // Verificar se há faltas neste dia
        const faltasDoDia = funcionario.faltas?.filter(f => {
            const dataFalta = new Date(f.Data);
            return dataFalta.getDate() === dia;
        }) || [];

        // Se há falta, mostrar F
        if (faltasDoDia.length > 0) {
            const tipoFalta = faltasDoDia[0].Falta || 'F';
            return {
                texto: tipoFalta,
                cor: '#ffebee',
                textoCor: '#d32f2f',
                title: `Falta: ${faltasDoDia[0].Falta || 'Não especificada'}`
            };
        }

        if (registosDoDia.length === 0) {
            return { texto: '-', cor: '#f5f5f5', textoCor: '#999' };
        }

        // Lógica para determinar o conteúdo baseado nos registos
        const temEntrada = registosDoDia.some(r => r.tipo === 'entrada' || r.TipoRegisto === 'Entrada');
        const temSaida = registosDoDia.some(r => r.tipo === 'saida' || r.TipoRegisto === 'Saída');

        if (temEntrada && temSaida) {
            return { texto: 'P', cor: '#e8f5e8', textoCor: '#2e7d32' }; // Presente
        } else if (temEntrada) {
            return { texto: '½', cor: '#fff3e0', textoCor: '#f57c00' }; // Meio dia
        } else {
            return { texto: '?', cor: '#ffebee', textoCor: '#d32f2f' }; // Situação indefinida
        }
    };

    const obterCodFuncionario = async (userId) => {
        try {
            const res = await fetch(`https://backend.advir.pt/api/users/${userId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                }
            });
            if (!res.ok) throw new Error('Erro ao obter codFuncionario');
            const data = await res.json();
            return data.codFuncionario;
        } catch (err) {
            console.error('Erro ao obter codFuncionario:', err);
            return null;
        }
    };

    const limparPontosDoDia = async () => {
        if (!funcionarioSelecionadoClear || !diaSelecionadoClear) {
            return alert('Por favor, selecione um funcionário e um dia.');
        }

        if (!anoSelecionado || !mesSelecionado) {
            return alert('Por favor, selecione o ano e mês.');
        }

        setLoadingClear(true);

        try {
            // 1. Obter o funcionário selecionado
            const funcionarioData = dadosGrade.find(item => item.utilizador.id.toString() === funcionarioSelecionadoClear.toString());

            if (!funcionarioData) {
                throw new Error('Funcionário não encontrado nos dados da grade');
            }

            // 2. Verificar se existem registos no dia selecionado
            const dia = parseInt(diaSelecionadoClear);
            const estatisticas = funcionarioData.estatisticasDias[dia];

            if (!estatisticas || estatisticas.totalRegistos === 0) {
                alert(`O funcionário ${funcionarioData.utilizador.nome} não tem registos no dia ${dia}.`);
                return;
            }

            // 3. Confirmar com o utilizador
            const confirmacao = confirm(`⚠️ ATENÇÃO: Esta ação irá eliminar TODOS os ${estatisticas.totalRegistos} registos de ponto do dia ${dia} para o funcionário ${funcionarioData.utilizador.nome}.\n\nEsta ação NÃO pode ser desfeita!\n\nTem certeza que pretende continuar?`);

            if (!confirmacao) {
                return;
            }

            // 4. Segunda confirmação para segurança
            const segundaConfirmacao = confirm(`🔥 ÚLTIMA CONFIRMAÇÃO:\n\nVai eliminar ${estatisticas.totalRegistos} registos de ponto do dia ${dia}/${mesSelecionado}/${anoSelecionado} para ${funcionarioData.utilizador.nome}.\n\nEscreva "CONFIRMAR" na próxima caixa de diálogo para prosseguir.`);

            if (!segundaConfirmacao) {
                return;
            }

            const textoConfirmacao = prompt('Digite "CONFIRMAR" (sem aspas) para eliminar os registos:');
            if (textoConfirmacao !== 'CONFIRMAR') {
                alert('Operação cancelada. Texto de confirmação incorreto.');
                return;
            }

            // 5. Buscar todos os registos do dia específico
            const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

            let query = `user_id=${funcionarioSelecionadoClear}&data=${dataFormatada}`;
            if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

            const resListar = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!resListar.ok) {
                throw new Error('Erro ao obter registos para eliminação');
            }

            const registosParaEliminar = await resListar.json();

            if (registosParaEliminar.length === 0) {
                alert('Não foram encontrados registos para eliminar.');
                return;
            }

            // 6. Eliminar cada registo individualmente
            let registosEliminados = 0;
            let erros = 0;

            for (const registo of registosParaEliminar) {
                try {
                    const resEliminar = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/eliminar/${registo.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (resEliminar.ok) {
                        registosEliminados++;
                        console.log(`Registo ${registo.id} eliminado com sucesso`);
                    } else {
                        console.error(`Erro ao eliminar registo ${registo.id}:`, await resEliminar.text());
                        erros++;
                    }

                    // Pequena pausa para não sobrecarregar o servidor
                    if (registosParaEliminar.length > 5) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                } catch (registoErr) {
                    console.error(`Erro ao eliminar registo ${registo.id}:`, registoErr);
                    erros++;
                }
            }

            // 7. Mostrar resultado da operação
            let mensagem = `✅ Limpeza concluída!\n\n`;
            mensagem += `• Registos eliminados: ${registosEliminados}\n`;
            if (erros > 0) {
                mensagem += `• Erros encontrados: ${erros}\n`;
                mensagem += `• Verifique o console para detalhes dos erros\n`;
            }
            mensagem += `\nTodos os registos de ponto do dia ${dia}/${mesSelecionado}/${anoSelecionado} foram eliminados para ${funcionarioData.utilizador.nome}.`;

            alert(mensagem);

            // 8. Recarregar dados da grade para mostrar as alterações
            if (viewMode === 'grade') {
                carregarDadosGrade();
            }

            // 9. Fechar modal
            setClearPointsDialogOpen(false);
            setFuncionarioSelecionadoClear('');
            setDiaSelecionadoClear('');

        } catch (err) {
            console.error('Erro ao limpar pontos do dia:', err);
            alert(`Erro ao limpar pontos: ${err.message}`);
        } finally {
            setLoadingClear(false);
        }
    };

    const preencherPontosEmFalta = async () => {
        if (!funcionarioSelecionadoAutoFill || !obraSelecionada) {
            return alert('Por favor, selecione um funcionário e uma obra.');
        }

        if (!anoSelecionado || !mesSelecionado) {
            return alert('Por favor, selecione o ano e mês.');
        }

        setLoadingAutoFill(true);

        try {
            // 1. Obter os dados atuais do funcionário para identificar dias vazios
            const funcionarioData = dadosGrade.find(item => item.utilizador.id.toString() === funcionarioSelecionadoAutoFill.toString());

            if (!funcionarioData) {
                throw new Error('Funcionário não encontrado nos dados da grade');
            }

            // 2. Identificar dias vazios (sem registos e sem faltas)
            const diasVazios = [];
            diasDoMes.forEach(dia => {
                const estatisticas = funcionarioData.estatisticasDias[dia];
                const dataObj = new Date(parseInt(anoSelecionado), parseInt(mesSelecionado) - 1, dia);
                const isWeekend = dataObj.getDay() === 0 || dataObj.getDay() === 6; // Domingo ou Sábado

                // Só adicionar dias úteis que estão completamente vazios (sem registos nem faltas)
                if (!isWeekend && (!estatisticas || (estatisticas.totalRegistos === 0 && (!estatisticas.faltas || estatisticas.faltas.length === 0)))) {
                    diasVazios.push(dia);
                }
            });

            if (diasVazios.length === 0) {
                alert('Não há dias vazios para preencher. O funcionário já tem registos ou faltas em todos os dias úteis.');
                return;
            }

            // 3. Confirmar com o utilizador
            const confirmacao = confirm(`Pretende preencher ${diasVazios.length} dias vazios (${diasVazios.join(', ')}) com pontos automáticos para ${funcionarioData.utilizador.nome}?`);

            if (!confirmacao) {
                return;
            }

            // 4. Preencher cada dia vazio com os 4 pontos (entrada manhã, saída manhã, entrada tarde, saída tarde)
            let diasPreenchidos = 0;

            for (const dia of diasVazios) {
                try {
                    const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                    const tipos = ['entrada', 'saida', 'entrada', 'saida'];
                    const horas = [
                        horarios.entradaManha,
                        horarios.saidaManha,
                        horarios.entradaTarde,
                        horarios.saidaTarde
                    ];

                    // Registar os 4 pontos para este dia
                    for (let i = 0; i < 4; i++) {
                        // Criar timestamp sem timezone offset para evitar +1 hora
                        const [hh, mm] = horas[i].split(':').map(Number);
                        const timestamp = makeUTCISO(parseInt(anoSelecionado, 10), parseInt(mesSelecionado, 10), parseInt(dia, 10), hh, mm);


                        const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/registar-esquecido-por-outro`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                tipo: tipos[i],
                                obra_id: Number(obraSelecionada),
                                user_id: Number(funcionarioSelecionadoAutoFill),
                                timestamp: timestamp
                            })
                        });

                        if (!res.ok) {
                            throw new Error(`Falha ao criar ponto ${tipos[i]} para o dia ${dia}`);
                        }

                        const json = await res.json();

                        // Confirmar cada ponto
                        const resConfirm = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/confirmar/${json.id}`, {
                            method: 'PATCH',
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        if (!resConfirm.ok) {
                            console.warn(`Aviso: Não foi possível confirmar automaticamente o ponto ${tipos[i]} do dia ${dia}`);
                        }
                    }

                    diasPreenchidos++;

                    // Pequena pausa entre dias para não sobrecarregar o servidor
                    if (diasVazios.length > 5) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                } catch (diaErr) {
                    console.error(`Erro ao preencher dia ${dia}:`, diaErr);
                    // Continuar com os outros dias mesmo se um falhar
                }
            }

            alert(`✅ Preenchimento concluído!\n\n${diasPreenchidos} de ${diasVazios.length} dias foram preenchidos com sucesso.\n\nCada dia foi preenchido com 4 pontos:\n- Entrada manhã: ${horarios.entradaManha}\n- Saída manhã: ${horarios.saidaManha}\n- Entrada tarde: ${horarios.entradaTarde}\n- Saída tarde: ${horarios.saidaTarde}`);

            // 5. Recarregar dados da grade para mostrar as alterações
            if (viewMode === 'grade') {
                carregarDadosGrade();
            }

            // 6. Fechar modal
            setAutoFillDialogOpen(false);
            setFuncionarioSelecionadoAutoFill('');

        } catch (err) {
            console.error('Erro ao preencher pontos em falta:', err);
            alert(`Erro ao preencher pontos: ${err.message}`);
        } finally {
            setLoadingAutoFill(false);
        }
    };

    const eliminarPontosEmBloco = async () => {
        if (selectedCells.length === 0) {
            return alert('Nenhuma célula selecionada.');
        }

        // Agrupar células por utilizador para mostrar um resumo melhor
        const cellsByUser = {};
        selectedCells.forEach(cellKey => {
            const [userId, dia] = cellKey.split('-');
            const userIdNumber = parseInt(userId, 10);
            if (!cellsByUser[userIdNumber]) cellsByUser[userIdNumber] = [];
            cellsByUser[userIdNumber].push(parseInt(dia, 10));
        });

        // Criar mensagem de confirmação detalhada
        let mensagemConfirmacao = `⚠️ ATENÇÃO: Esta ação irá eliminar TODOS os registos de ponto dos dias selecionados:\n\n`;

        Object.entries(cellsByUser).forEach(([userId, dias]) => {
            const funcionario = dadosGrade.find(item => item.utilizador.id === parseInt(userId, 10));
            if (funcionario) {
                mensagemConfirmacao += `• ${funcionario.utilizador.nome}: dias ${dias.join(', ')}\n`;
            }
        });

        mensagemConfirmacao += `\nTotal de ${selectedCells.length} seleções.\n\nEsta ação NÃO pode ser desfeita!\n\nTem certeza que pretende continuar?`;

        const confirmacao = confirm(mensagemConfirmacao);
        if (!confirmacao) return;

        // Segunda confirmação para segurança
        const segundaConfirmacao = confirm(`🔥 ÚLTIMA CONFIRMAÇÃO:\n\nVai eliminar registos de ${selectedCells.length} dias selecionados.\n\nEscreva "ELIMINAR" na próxima caixa de diálogo para prosseguir.`);
        if (!segundaConfirmacao) return;

        const textoConfirmacao = prompt('Digite "ELIMINAR" (sem aspas) para confirmar a eliminação:');
        if (textoConfirmacao !== 'ELIMINAR') {
            alert('Operação cancelada. Texto de confirmação incorreto.');
            return;
        }

        setLoadingBulkDelete(true);

        try {
            let totalEliminados = 0;
            let totalErros = 0;

            for (const cellKey of selectedCells) {
                try {
                    const [userId, dia] = cellKey.split('-');
                    const userIdNumber = parseInt(userId, 10);
                    const diaNumber = parseInt(dia, 10);

                    if (!userIdNumber || isNaN(userIdNumber)) {
                        console.error(`[ERROR] userId inválido para célula ${cellKey}: ${userId}`);
                        totalErros++;
                        continue;
                    }

                    const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(diaNumber).padStart(2, '0')}`;

                    // Buscar registos do dia específico usando o user_id diretamente
                    let query = `user_id=${userIdNumber}&data=${dataFormatada}`;
                    if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

                    const resListar = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (!resListar.ok) {
                        console.error(`Erro ao obter registos para eliminação do dia ${dia} do utilizador ${userId}`);
                        totalErros++;
                        continue;
                    }

                    const registosParaEliminar = await resListar.json();

                    // Eliminar cada registo individualmente
                    for (const registo of registosParaEliminar) {
                        try {
                            const resEliminar = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/eliminar/${registo.id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${token}` }
                            });

                            if (resEliminar.ok) {
                                totalEliminados++;
                            } else {
                                console.error(`Erro ao eliminar registo ${registo.id}`);
                                totalErros++;
                            }

                        } catch (registoErr) {
                            console.error(`Erro ao eliminar registo ${registo.id}:`, registoErr);
                            totalErros++;
                        }
                    }

                    // Pequena pausa para não sobrecarregar o servidor
                    if (selectedCells.length > 3) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                } catch (cellErr) {
                    console.error(`Erro ao processar célula ${cellKey}:`, cellErr);
                    totalErros++;
                }
            }

            // Mostrar resultado da operação
            let mensagemResultado = `✅ Eliminação em bloco concluída!\n\n`;
            mensagemResultado += `• Registos eliminados: ${totalEliminados}\n`;
            if (totalErros > 0) {
                mensagemResultado += `• Erros encontrados: ${totalErros}\n`;
                mensagemResultado += `• Verifique o console para detalhes dos erros\n`;
            }
            mensagemResultado += `\nTodos os registos selecionados foram processados.`;

            alert(mensagemResultado);

            // Limpar seleções e recarregar dados
            setSelectedCells([]);
            setBulkDeleteDialogOpen(false);

            if (viewMode === 'grade') {
                carregarDadosGrade();
            }

        } catch (err) {
            console.error('Erro na eliminação em bloco:', err);
            alert(`Erro na eliminação em bloco: ${err.message}`);
        } finally {
            setLoadingBulkDelete(false);
        }
    };

    // Função para abrir modal de edição direta
    const abrirEdicaoDirecta = async (userId, dia, utilizadorNome) => {
        if (!anoSelecionado || !mesSelecionado) {
            alert('Por favor, selecione o ano e mês para editar.');
            return;
        }

        try {
            const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

            // Buscar TODOS os registos existentes para este dia (sem filtro de obra)
            let query = `user_id=${userId}&data=${dataFormatada}`;

            const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const registos = await res.json();
                console.log('Registos carregados para edição (todas as obras):', registos);

                // Criar um registo "virtual" que representa o dia completo com todos os registos
                const registoVirtual = {
                    id: registos.length > 0 ? `edit_${userId}_${dia}` : `novo_${userId}_${dia}`,
                    data: dataFormatada,
                    utilizador: utilizadorNome,
                    utilizadorId: userId,
                    dia: dia,
                    registosOriginais: registos || []
                };

                console.log('Registo virtual criado:', registoVirtual);

                setRegistoParaEditar(registoVirtual);
                setDadosEdicao({
                    userId: parseInt(userId, 10),
                    dia: parseInt(dia, 10),
                    registos: registos || []
                });

                setEditModalOpen(true);
            } else {
                const errorText = await res.text();
                console.error('Erro ao carregar registos:', errorText);
                alert('Erro ao carregar registos para edição: ' + errorText);
            }
        } catch (err) {
            console.error('Erro ao abrir edição direta:', err);
            alert('Erro ao abrir edição direta: ' + err.message);
        }
    };

    // Função para salvar edição direta
    const salvarEdicaoDirecta = async (dadosEditados) => {
        try {
            const { userId, dia } = dadosEdicao;
            const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

            // Se há registos originais, eliminar todos primeiro
            if (dadosEdicao.registos.length > 0) {
                for (const registo of dadosEdicao.registos) {
                    try {
                        await fetch(`https://backend.advir.pt/api/registo-ponto-obra/eliminar/${registo.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` }
                        });
                    } catch (err) {
                        console.warn(`Erro ao eliminar registo ${registo.id}:`, err);
                    }
                }
            }

            // Processar registos editados do modal
            const registosEditados = dadosEditados.registosEditados || [];
            let registosCriados = 0;
            let erros = [];

            for (const registoEditado of registosEditados) {
                if (registoEditado.hora && registoEditado.tipo && registoEditado.obraId) {
                    const timestamp = makeUTCISOFromStrings(dataFormatada, registoEditado.hora);

                    const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/registar-esquecido-por-outro`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            tipo: registoEditado.tipo,
                            obra_id: Number(registoEditado.obraId),
                            user_id: Number(userId),
                            timestamp: timestamp
                        })
                    });

                    if (res.ok) {
                        const json = await res.json();
                        // Confirmar automaticamente
                        await fetch(`https://backend.advir.pt/api/registo-ponto-obra/confirmar/${json.id}`, {
                            method: 'PATCH',
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        registosCriados++;
                    } else {
                        const errorText = await res.text();
                        console.error(`Erro ao criar registo ${registoEditado.tipo}:`, errorText);
                        erros.push(`Erro ao criar registo ${registoEditado.tipo}: ${errorText}`);
                    }
                } else if (registoEditado.hora && registoEditado.tipo && !registoEditado.obraId) {
                    erros.push(`Registo ${registoEditado.tipo} às ${registoEditado.hora}: obra não especificada`);
                }
            }

            if (registosCriados > 0) {
                let mensagem = `${registosCriados} registos editados e integrados com sucesso!`;
                if (erros.length > 0) {
                    mensagem += `\n\nErros encontrados:\n${erros.join('\n')}`;
                }
                alert(mensagem);
            } else {
                if (erros.length > 0) {
                    alert(`Nenhum registo foi criado devido aos seguintes erros:\n${erros.join('\n')}`);
                } else {
                    alert('Nenhum registo foi criado. Verifique se preencheu as horas e obras corretamente.');
                }
            }

            setEditModalOpen(false);
            setRegistoParaEditar(null);
            setDadosEdicao({ userId: null, dia: null, registos: [] });

            // Recarregar dados da grade
            if (viewMode === 'grade') {
                carregarDadosGrade();
            }

        } catch (err) {
            console.error('Erro ao salvar edição direta:', err);
            alert(`Erro ao salvar edição: ${err.message}`);
        }
    };

    const registarFalta = async () => {
        if (!userToRegistar || !diaToRegistar || !tipoFaltaSelecionado || !duracaoFalta) {
            return alert('Por favor, preencha todos os campos para registar a falta.');
        }

        const token = localStorage.getItem('loginToken');
        const painelToken = localStorage.getItem('painelAdminToken');
        const urlempresa = localStorage.getItem('urlempresa');
        const userNome = localStorage.getItem('userNome');
        const empresaId = localStorage.getItem('empresa_id');
        const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(diaToRegistar).padStart(2, '0')}`;

        // Obter o codFuncionario através do endpoint
        const funcionarioId = await obterCodFuncionario(userToRegistar);

        if (!funcionarioId) {
            return alert('Não foi possível encontrar o código do funcionário.');
        }

        // Determinar se é por horas baseado na duração
        const isHoras = duracaoFalta && duracaoFalta.toString().includes('h');
        const tempoNumerico = parseInt(duracaoFalta) || 1;

        // Verificar se a falta selecionada desconta alimentação (assumindo que temos essa info nos tipos)
        const tipoFalta = Object.keys(tiposFaltas).find(key => key === tipoFaltaSelecionado);
        const descontaAlimentacao = false; // Pode ser configurado baseado no tipo de falta

        const dadosPrincipal = {
            tipoPedido: 'FALTA',
            funcionario: funcionarioId,
            empresaId: empresaId,
            dataPedido: dataFormatada,
            falta: tipoFaltaSelecionado,
            horas: isHoras ? 1 : 0,
            tempo: tempoNumerico,
            justificacao: 'Registado via interface de administração',
            observacoes: '',
            usuarioCriador: localStorage.getItem('codFuncionario') || funcionarioId,
            origem: 'ADMIN',
            descontaAlimentacao: descontaAlimentacao ? 1 : 0,
            descontaSubsidioTurno: 0
        };

        try {
            setCarregando(true);

            // 1. Submeter o pedido de falta
            const res = await fetch('https://backend.advir.pt/api/faltas-ferias/aprovacao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    urlempresa: empresaId
                },
                body: JSON.stringify(dadosPrincipal)
            });

            if (res.ok) {
                const pedidoData = await res.json();
                console.log('Pedido de falta criado:', pedidoData);

                // 2. Aprovar automaticamente o pedido (como administrador)
                const resAprovar = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${pedidoData.id}/aprovar`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                        urlempresa: empresaId
                    },
                    body: JSON.stringify({
                        aprovadoPor: userNome || 'Administrador',
                        observacoesResposta: 'Aprovado automaticamente via interface de administração.'
                    })
                });

                if (!resAprovar.ok) {
                    throw new Error('Erro ao aprovar pedido automaticamente');
                }

                // 3. Integrar diretamente no ERP (mesma lógica do AprovacaoFaltaFerias.js)
                if (painelToken && urlempresa) {
                    const dadosERP = {
                        Funcionario: funcionarioId,
                        Data: new Date(dataFormatada).toISOString(),
                        Falta: tipoFaltaSelecionado,
                        Horas: isHoras ? 1 : 0,
                        Tempo: tempoNumerico,
                        DescontaVenc: 0,
                        DescontaRem: 0,
                        ExcluiProc: 0,
                        ExcluiEstat: 0,
                        Observacoes: 'Registado via interface de administração',
                        CalculoFalta: 1,
                        DescontaSubsAlim: 0,
                        DataProc: null,
                        NumPeriodoProcessado: 0,
                        JaProcessado: 0,
                        InseridoBloco: 0,
                        ValorDescontado: 0,
                        AnoProcessado: 0,
                        NumProc: 0,
                        Origem: "2",
                        PlanoCurso: null,
                        IdGDOC: null,
                        CambioMBase: 0,
                        CambioMAlt: 0,
                        CotizaPeloMinimo: 0,
                        Acerto: 0,
                        MotivoAcerto: null,
                        NumLinhaDespesa: null,
                        NumRelatorioDespesa: null,
                        FuncComplementosBaixaId: null,
                        DescontaSubsTurno: 0,
                        SubTurnoProporcional: 0,
                        SubAlimProporcional: 0
                    };

                    const resERP = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/InserirFalta`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${painelToken}`,
                            urlempresa
                        },
                        body: JSON.stringify(dadosERP)
                    });

                    if (resERP.ok) {
                        console.log('Falta integrada no ERP com sucesso');
                    } else {
                        console.warn('Erro ao integrar no ERP:', await resERP.text());
                    }
                }

                // Submeter F40 automático se aplicável
                if (descontaAlimentacao) {
                    const dadosF40 = {
                        ...dadosPrincipal,
                        falta: 'F40',
                        justificacao: 'Submetida automaticamente (desconto alimentação)',
                        observacoes: '',
                    };

                    const resF40 = await fetch('https://backend.advir.pt/api/faltas-ferias/aprovacao', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                            urlempresa: empresaId
                        },
                        body: JSON.stringify(dadosF40)
                    });

                    if (resF40.ok) {
                        const f40Data = await resF40.json();

                        // Aprovar F40 automaticamente também
                        await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${f40Data.id}/aprovar`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                                urlempresa: empresaId
                            },
                            body: JSON.stringify({
                                aprovadoPor: userNome || 'Administrador',
                                observacoesResposta: 'F40 aprovado automaticamente.'
                            })
                        });

                        console.log('Falta F40 submetida e aprovada automaticamente.');
                    } else {
                        console.warn('Erro ao submeter falta F40:', await resF40.text());
                    }
                }

                alert('Falta registada e integrada automaticamente no ERP com sucesso!');

                // Resetar formulários
                setFaltaDialogOpen(false);
                setDialogOpen(false);
                setTipoFaltaSelecionado('');
                setDuracaoFalta('');

                // Atualização optimista da UI
                if (viewMode === 'grade') {
                    // Atualizar imediatamente a célula da grade
                    setDadosGrade(prevDados => {
                        return prevDados.map(item => {
                            if (item.utilizador.id === userToRegistar) {
                                const estatisticasAtualizadas = { ...item.estatisticasDias };
                                if (!estatisticasAtualizadas[diaToRegistar]) {
                                    estatisticasAtualizadas[diaToRegistar] = {
                                        totalRegistos: 0,
                                        entradas: 0,
                                        saidas: 0,
                                        confirmados: 0,
                                        naoConfirmados: 0,
                                        horasEstimadas: '0.0',
                                        primeiroRegisto: null,
                                        ultimoRegisto: null,
                                        obras: [],
                                        faltas: []
                                    };
                                }

                                // Adicionar a falta às estatísticas do dia
                                const novaFalta = {
                                    Falta: tipoFaltaSelecionado,
                                    Data: dataFormatada,
                                    Tempo: tempoNumerico,
                                    Horas: isHoras
                                };
                                estatisticasAtualizadas[diaToRegistar].faltas = [
                                    ...(estatisticasAtualizadas[diaToRegistar].faltas || []),
                                    novaFalta
                                ];

                                return {
                                    ...item,
                                    estatisticasDias: estatisticasAtualizadas,
                                    totalFaltas: (item.totalFaltas || 0) + 1
                                };
                            }
                            return item;
                        });
                    });

                    // Recarregar dados completos em background
                    setTimeout(() => {
                        carregarDadosGrade();
                    }, 500);
                }

            } else {
                const erro = await res.text();
                alert('Erro ao submeter falta: ' + erro);
            }

        } catch (err) {
            console.error('Erro ao submeter falta:', err);
            alert('Erro inesperado ao submeter falta.');
        } finally {
            setCarregando(false);
        }
    };


    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    <span style={styles.icon}>👥</span>
                    Registos de Ponto - Análise Completa
                </h1>
                <p style={styles.subtitle}>Vista compacta, grade mensal e detalhes expandíveis</p>
            </div>

            {/* Navigation Tabs */}
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
                {utilizadorDetalhado && (
                    <button
                        style={{ ...styles.navTab, ...(viewMode === 'detalhes' ? styles.navTabActive : {}) }}
                        onClick={() => setViewMode('detalhes')}
                    >
                        🔍 Detalhes
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div style={styles.filtersCard}>
                <h3 style={styles.sectionTitle}>
                    <span style={styles.sectionIcon}>🔍</span>
                    Filtros de Pesquisa
                </h3>

                <div style={styles.filtersGrid}>
                    <div style={styles.filterGroup}>
                        <label style={styles.label}>Obra</label>
                        <select
                            style={styles.select}
                            value={obraSelecionada}
                            onChange={e => setObraSelecionada(e.target.value)}
                        >
                            <option value="">-- Todas as obras --</option>
                            {obras.map(o => (
                                <option key={o.id} value={o.id}>{o.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.label}>Utilizador (Opcional)</label>
                        <select
                            style={styles.select}
                            value={utilizadorSelecionado}
                            onChange={e => setUtilizadorSelecionado(e.target.value)}
                        >
                            <option value="">-- Todos os utilizadores --</option>
                            {utilizadores.map(u => (
                                <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.label}>Data Específica</label>
                        <input
                            type="date"
                            style={styles.input}
                            value={dataSelecionada}
                            onChange={e => setDataSelecionada(e.target.value)}
                        />
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.label}>Mês</label>
                        <input
                            type="number"
                            style={styles.input}
                            min="1"
                            max="12"
                            value={mesSelecionado}
                            onChange={e => setMesSelecionado(e.target.value)}
                            placeholder="1-12"
                        />
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.label}>Ano</label>
                        <input
                            type="number"
                            style={styles.input}
                            min="2020"
                            max="2030"
                            value={anoSelecionado}
                            onChange={e => setAnoSelecionado(e.target.value)}
                            placeholder="2024"
                        />
                    </div>
                </div>

                <div style={styles.actionButtons}>
                    {viewMode === 'resumo' && (
                        <>
                            <button
                                style={styles.primaryButton}
                                onClick={carregarResumoUtilizadores}
                                disabled={loading}
                            >
                                {loading ? '🔄 A carregar...' : '🔍 Carregar Resumo'}
                            </button>

                            {resumoUtilizadores.length > 0 && (
                                <button
                                    style={styles.exportButton}
                                    onClick={exportarResumo}
                                >
                                    📊 Exportar Resumo
                                </button>
                            )}
                        </>
                    )}

                    {viewMode === 'grade' && (
                        <>
                            <button
                                style={styles.primaryButton}
                                onClick={carregarDadosGrade}
                                disabled={loadingGrade || !anoSelecionado || !mesSelecionado}
                            >
                                {loadingGrade ? '🔄 A carregar...' : '📅 Carregar Grade'}
                            </button>

                            {dadosGrade.length > 0 && (
                                <button
                                    style={styles.exportButton}
                                    onClick={exportarGrade}
                                >
                                    📊 Exportar Grade
                                </button>
                            )}

                            {viewMode === 'grade' && selectedCells.length > 0 && (
                                <>
                                    <button
                                        style={styles.primaryButton}
                                        onClick={() => setBulkDialogOpen(true)}
                                    >
                                        🗓️ Registar em bloco ({selectedCells.length} dias)
                                    </button>

                                    <button
                                        style={{ ...styles.primaryButton, backgroundColor: '#e53e3e' }}
                                        onClick={() => setBulkDeleteDialogOpen(true)}
                                    >
                                        🗑️ Eliminar pontos ({selectedCells.length} dias)
                                    </button>
                                </>
                            )}

                            {viewMode === 'grade' && dadosGrade.length > 0 && (
                                <>
                                    <button
                                        style={{ ...styles.primaryButton, backgroundColor: '#805ad5' }}
                                        onClick={() => setAutoFillDialogOpen(true)}
                                    >
                                        🤖 Preencher Pontos em Falta
                                    </button>

                                    <button
                                        style={{ ...styles.primaryButton, backgroundColor: '#e53e3e' }}
                                        onClick={() => setClearPointsDialogOpen(true)}
                                    >
                                        🗑️ Limpar Pontos de um Dia
                                    </button>
                                </>
                            )}

                            {bulkDialogOpen && (
                                <div style={styles.modalOverlay}>
                                    <div style={styles.bulkModal}>
                                        <div style={styles.bulkModalHeader}>
                                            <h3 style={styles.bulkModalTitle}>
                                                🗓️ Registar Pontos em Bloco
                                            </h3>
                                            <p style={styles.bulkModalSubtitle}>
                                                Registando para {selectedCells.length} seleções
                                            </p>
                                            <button
                                                style={styles.closeButton}
                                                onClick={() => setBulkDialogOpen(false)}
                                                aria-label="Fechar"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <div style={styles.bulkModalContent}>
                                            <div style={styles.selectedCellsContainer}>
                                                <span style={styles.selectedCellsLabel}>Células selecionadas:</span>
                                                <div style={styles.selectedCellsList}>
                                                    {selectedCells.map((cell, index) => (
                                                        <span key={index} style={styles.selectedCell}>
                                                            {cell}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div style={styles.horariosContainer}>
                                                <h4 style={styles.horariosTitle}>⏰ Configurar Horários</h4>

                                                <div style={styles.horariosGrid}>
                                                    <div style={styles.periodoContainer}>
                                                        <div style={styles.periodoHeader}>
                                                            <span style={styles.periodoIcon}>🌅</span>
                                                            <span style={styles.periodoTitle}>Manhã</span>
                                                        </div>
                                                        <div style={styles.horarioRow}>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Entrada</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.entradaManha}
                                                                    onChange={e => setHorarios(h => ({ ...h, entradaManha: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Saída</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.saidaManha}
                                                                    onChange={e => setHorarios(h => ({ ...h, saidaManha: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={styles.periodoContainer}>
                                                        <div style={styles.periodoHeader}>
                                                            <span style={styles.periodoIcon}>🌇</span>
                                                            <span style={styles.periodoTitle}>Tarde</span>
                                                        </div>
                                                        <div style={styles.horarioRow}>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Entrada</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.entradaTarde}
                                                                    onChange={e => setHorarios(h => ({ ...h, entradaTarde: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Saída</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.saidaTarde}
                                                                    onChange={e => setHorarios(h => ({ ...h, saidaTarde: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={styles.obraContainer}>
                                                <label style={styles.obraLabel}>
                                                    <span style={styles.obraIcon}>🏗️</span>
                                                    Selecionar Obra
                                                </label>
                                                <select
                                                    style={styles.obraSelect}
                                                    value={obraNoDialog}
                                                    onChange={e => setObraNoDialog(e.target.value)}
                                                >
                                                    <option value="">-- Selecione uma obra --</option>
                                                    {obras.map(o => (
                                                        <option key={o.id} value={o.id}>{o.nome}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div style={styles.bulkModalActions}>
                                            <button
                                                style={styles.cancelButton}
                                                onClick={() => setBulkDialogOpen(false)}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                style={styles.confirmButton}
                                                onClick={handleBulkConfirm}
                                                disabled={!obraNoDialog}
                                            >
                                                ✅ Confirmar Registo em Bloco
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal para eliminação em bloco */}
                            {bulkDeleteDialogOpen && (
                                <div style={styles.modalOverlay}>
                                    <div style={styles.bulkModal}>
                                        <div style={{ ...styles.bulkModalHeader, background: 'linear-gradient(135deg, #e53e3e, #c53030)' }}>
                                            <h3 style={styles.bulkModalTitle}>
                                                🗑️ Eliminar Pontos em Bloco
                                            </h3>
                                            <p style={styles.bulkModalSubtitle}>
                                                Eliminando registos de {selectedCells.length} seleções
                                            </p>
                                            <button
                                                style={styles.closeButton}
                                                onClick={() => setBulkDeleteDialogOpen(false)}
                                                aria-label="Fechar"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <div style={styles.bulkModalContent}>
                                            <div style={{
                                                ...styles.selectedCellsContainer,
                                                backgroundColor: '#fed7d7',
                                                border: '1px solid #fc8181'
                                            }}>
                                                <div style={{ fontSize: '0.9rem', color: '#742a2a' }}>
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <strong>⚠️ ATENÇÃO:</strong>
                                                    </div>
                                                    <div style={{ marginBottom: '10px' }}>
                                                        Esta operação irá <strong>eliminar permanentemente</strong> todos os registos de ponto dos dias selecionados.
                                                    </div>
                                                    <div style={{ marginBottom: '15px', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                        Esta ação <strong>NÃO pode ser desfeita</strong>!
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={styles.selectedCellsContainer}>
                                                <span style={styles.selectedCellsLabel}>Dias selecionados para eliminação:</span>

                                                {(() => {
                                                    // Agrupar por utilizador para mostrar organizadamente
                                                    const cellsByUser = {};
                                                    selectedCells.forEach(cellKey => {
                                                        const [userId, dia] = cellKey.split('-');
                                                        const userIdNumber = parseInt(userId, 10);
                                                        if (!cellsByUser[userIdNumber]) cellsByUser[userIdNumber] = [];
                                                        cellsByUser[userIdNumber].push(parseInt(dia, 10));
                                                    });

                                                    return Object.entries(cellsByUser).map(([userId, dias]) => {
                                                        const funcionario = dadosGrade.find(item => item.utilizador.id === parseInt(userId, 10));
                                                        if (!funcionario) return null;

                                                        return (
                                                            <div key={userId} style={{
                                                                marginBottom: '15px',
                                                                padding: '12px',
                                                                backgroundColor: '#f8f9fa',
                                                                borderRadius: '8px',
                                                                border: '1px solid #e2e8f0'
                                                            }}>
                                                                <div style={{
                                                                    fontWeight: '600',
                                                                    marginBottom: '8px',
                                                                    color: '#2d3748'
                                                                }}>
                                                                    👤 {funcionario.utilizador.nome}
                                                                </div>
                                                                <div style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                                                                    <strong>Dias:</strong> {dias.sort((a, b) => a - b).join(', ')}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '4px' }}>
                                                                    {dias.length} dia{dias.length !== 1 ? 's' : ''} selecionado{dias.length !== 1 ? 's' : ''}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                            <div style={styles.obraContainer}>
                                                <label style={styles.obraLabel}>
                                                    <span style={styles.obraIcon}>🏗️</span>
                                                    Obra Selecionada (Filtro Aplicado)
                                                </label>
                                                <div style={{
                                                    padding: '12px 16px',
                                                    border: '2px solid #e2e8f0',
                                                    borderRadius: '12px',
                                                    backgroundColor: '#f8f9fa',
                                                    fontSize: '1rem',
                                                    color: obraSelecionada ? '#2d3748' : '#718096'
                                                }}>
                                                    {obraSelecionada
                                                        ? `${obras.find(o => o.id.toString() === obraSelecionada.toString())?.nome || `Obra ${obraSelecionada}`} - Apenas registos desta obra serão eliminados`
                                                        : 'Todas as obras - Todos os registos dos dias serão eliminados'
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        <div style={styles.bulkModalActions}>
                                            <button
                                                style={styles.cancelButton}
                                                onClick={() => setBulkDeleteDialogOpen(false)}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                style={{ ...styles.confirmButton, backgroundColor: '#e53e3e' }}
                                                onClick={eliminarPontosEmBloco}
                                                disabled={loadingBulkDelete}
                                            >
                                                {loadingBulkDelete ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                        A eliminar...
                                                    </>
                                                ) : (
                                                    '🗑️ Confirmar Eliminação'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal para registo individual */}
                            {dialogOpen && (
                                <div style={styles.modalOverlay}>
                                    <div style={styles.individualModal}>
                                        <div style={styles.individualModalHeader}>
                                            <h3 style={styles.individualModalTitle}>
                                                📝 Registar Ponto Individual
                                            </h3>
                                            <p style={styles.individualModalSubtitle}>
                                                Dia {diaToRegistar} - {utilizadores.find(u => u.id === userToRegistar)?.nome}
                                            </p>
                                            <button
                                                style={styles.closeButton}
                                                onClick={() => setDialogOpen(false)}
                                                aria-label="Fechar"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <div style={styles.individualModalContent}>
                                            <div style={styles.horariosContainer}>
                                                <h4 style={styles.horariosTitle}>⏰ Configurar Horários</h4>

                                                <div style={styles.horariosGrid}>
                                                    <div style={styles.periodoContainer}>
                                                        <div style={styles.periodoHeader}>
                                                            <span style={styles.periodoIcon}>🌅</span>
                                                            <span style={styles.periodoTitle}>Manhã</span>
                                                        </div>
                                                        <div style={styles.horarioRow}>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Entrada</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.entradaManha}
                                                                    onChange={e => setHorarios(h => ({ ...h, entradaManha: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Saída</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.saidaManha}
                                                                    onChange={e => setHorarios(h => ({ ...h, saidaManha: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={styles.periodoContainer}>
                                                        <div style={styles.periodoHeader}>
                                                            <span style={styles.periodoIcon}>🌇</span>
                                                            <span style={styles.periodoTitle}>Tarde</span>
                                                        </div>
                                                        <div style={styles.horarioRow}>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Entrada</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.entradaTarde}
                                                                    onChange={e => setHorarios(h => ({ ...h, entradaTarde: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Saída</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.saidaTarde}
                                                                    onChange={e => setHorarios(h => ({ ...h, saidaTarde: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={styles.obraContainer}>
                                                <label style={styles.obraLabel}>
                                                    <span style={styles.obraIcon}>🏗️</span>
                                                    Selecionar Obra
                                                </label>
                                                <select
                                                    style={styles.obraSelect}
                                                    value={obraNoDialog}
                                                    onChange={e => setObraNoDialog(e.target.value)}
                                                >
                                                    <option value="">-- Selecione uma obra --</option>
                                                    {obras.map(o => (
                                                        <option key={o.id} value={o.id}>{o.nome}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div style={styles.individualModalActions}>
                                            <button
                                                style={styles.cancelButton}
                                                onClick={() => setDialogOpen(false)}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                style={styles.confirmButton}
                                                onClick={async () => {
                                                    if (!obraNoDialog) {
                                                        return alert('Escolhe uma obra para registar.');
                                                    }

                                                    try {
                                                        const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(diaToRegistar).padStart(2, '0')}`;
                                                        const tipos = ['entrada', 'saida', 'entrada', 'saida'];
                                                        const horas = [
                                                            horarios.entradaManha,
                                                            horarios.saidaManha,
                                                            horarios.entradaTarde,
                                                            horarios.saidaTarde
                                                        ];

                                                        for (let i = 0; i < 4; i++) {
                                                            // Criar timestamp com timezone correto
                                                            const timestamp = makeUTCISOFromStrings(dataFormatada, horas[i]);


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
                                                                        user_id: Number(userToRegistar),
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

                                                        alert('Quatro pontos registados e confirmados com sucesso!');
                                                        setDialogOpen(false);
                                                        if (viewMode === 'grade') carregarDadosGrade();
                                                    } catch (err) {
                                                        alert(err.message);
                                                    }
                                                }}
                                                disabled={!obraNoDialog}
                                            >
                                                ✅ Confirmar Registo
                                            </button>
                                            <button
                                                style={{ ...styles.confirmButton, backgroundColor: '#dc3545', marginTop: '10px' }}
                                                onClick={() => {
                                                    setDialogOpen(false);
                                                    setFaltaDialogOpen(true);
                                                }}
                                            >
                                                📅 Registar Falta
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal para registo de falta */}
                            {faltaDialogOpen && (
                                <div style={styles.modalOverlay}>
                                    <div style={styles.individualModal}>
                                        <div style={styles.individualModalHeader}>
                                            <h3 style={styles.individualModalTitle}>
                                                📅 Registar Falta
                                            </h3>
                                            <p style={styles.individualModalSubtitle}>
                                                Dia {diaToRegistar} - {utilizadores.find(u => u.id === userToRegistar)?.nome}
                                            </p>
                                            <button
                                                style={styles.closeButton}
                                                onClick={() => setFaltaDialogOpen(false)}
                                                aria-label="Fechar"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <div style={styles.individualModalContent}>
                                            <div style={styles.filterGroup}>
                                                <label style={styles.label}>Tipo de Falta</label>
                                                <select
                                                    style={styles.select}
                                                    value={tipoFaltaSelecionado}
                                                    onChange={e => setTipoFaltaSelecionado(e.target.value)}
                                                >
                                                    <option value="">-- Selecione o tipo de falta --</option>
                                                    {Object.entries(tiposFaltas).map(([key, value]) => (
                                                        <option key={key} value={key}>{value} ({key})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div style={styles.filterGroup}>
                                                <label style={styles.label}>Duração</label>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <input
                                                        type="number"
                                                        style={{ ...styles.input, flex: 1 }}
                                                        min="1"
                                                        value={parseInt(duracaoFalta) || ''}
                                                        onChange={e => {
                                                            const valor = e.target.value;
                                                            const unidade = duracaoFalta?.endsWith('h') ? 'h' : 'd';
                                                            setDuracaoFalta(valor ? `${valor}${unidade}` : '');
                                                        }}
                                                        placeholder="Quantidade"
                                                    />
                                                    <select
                                                        style={{ ...styles.select, flex: 0.5 }}
                                                        value={duracaoFalta === '' ? '' : duracaoFalta?.endsWith('h') ? 'h' : 'd'}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            const quantidade = parseInt(duracaoFalta) || 1;
                                                            if (value === 'd') setDuracaoFalta(`${quantidade}d`);
                                                            else if (value === 'h') setDuracaoFalta(`${quantidade}h`);
                                                        }}
                                                    >
                                                        <option value="">-- Unidade --</option>
                                                        <option value="d">Dia(s)</option>
                                                        <option value="h">Hora(s)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {tipoFaltaSelecionado && tiposFaltas[tipoFaltaSelecionado] && (
                                                <div style={{
                                                    ...styles.filterGroup,
                                                    backgroundColor: '#f8f9fa',
                                                    border: '1px solid #dee2e6',
                                                    borderRadius: '8px',
                                                    padding: '12px'
                                                }}>
                                                    <div style={{ fontSize: '0.9rem', color: '#495057' }}>
                                                        <div><strong>Tipo de Falta:</strong> {tiposFaltas[tipoFaltaSelecionado]}</div>
                                                        <div><strong>Código:</strong> {tipoFaltaSelecionado}</div>
                                                        <div><strong>Duração:</strong> {duracaoFalta || '1d'}</div>
                                                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#6c757d' }}>
                                                            Esta falta será submetida para aprovação.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div style={styles.individualModalActions}>
                                            <button
                                                style={styles.cancelButton}
                                                onClick={() => setFaltaDialogOpen(false)}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                style={styles.confirmButton}
                                                onClick={registarFalta}
                                                disabled={!tipoFaltaSelecionado || !duracaoFalta || carregando}
                                            >
                                                {carregando ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                        A registar...
                                                    </>
                                                ) : (
                                                    '📅 Confirmar Falta'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal para limpar pontos de um dia */}
                            {clearPointsDialogOpen && (
                                <div style={styles.modalOverlay}>
                                    <div style={styles.bulkModal}>
                                        <div style={styles.bulkModalHeader}>
                                            <h3 style={styles.bulkModalTitle}>
                                                🗑️ Limpar Pontos de um Dia
                                            </h3>
                                            <p style={styles.bulkModalSubtitle}>
                                                Eliminar todos os registos de ponto de um dia específico
                                            </p>
                                            <button
                                                style={styles.closeButton}
                                                onClick={() => setClearPointsDialogOpen(false)}
                                                aria-label="Fechar"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <div style={styles.bulkModalContent}>
                                            <div style={{
                                                ...styles.selectedCellsContainer,
                                                backgroundColor: '#fed7d7',
                                                border: '1px solid #fc8181'
                                            }}>
                                                <div style={{ fontSize: '0.9rem', color: '#742a2a' }}>
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <strong>⚠️ ATENÇÃO:</strong>
                                                    </div>
                                                    <div>
                                                        Esta operação irá <strong>eliminar permanentemente</strong> todos os registos de ponto do dia selecionado para o funcionário escolhido.
                                                    </div>
                                                    <div style={{ marginTop: '10px', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                        Esta ação <strong>NÃO pode ser desfeita</strong>!
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={styles.filterGroup}>
                                                <label style={styles.label}>Funcionário</label>
                                                <select
                                                    style={styles.select}
                                                    value={funcionarioSelecionadoClear}
                                                    onChange={e => setFuncionarioSelecionadoClear(e.target.value)}
                                                >
                                                    <option value="">-- Selecione um funcionário --</option>
                                                    {dadosGrade.map(item => (
                                                        <option key={item.utilizador.id} value={item.utilizador.id}>
                                                            {item.utilizador.nome} ({item.utilizador.email})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div style={styles.filterGroup}>
                                                <label style={styles.label}>Dia do Mês</label>
                                                <select
                                                    style={styles.select}
                                                    value={diaSelecionadoClear}
                                                    onChange={e => setDiaSelecionadoClear(e.target.value)}
                                                >
                                                    <option value="">-- Selecione um dia --</option>
                                                    {diasDoMes.map(dia => (
                                                        <option key={dia} value={dia}>
                                                            Dia {dia} ({mesSelecionado}/{anoSelecionado})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {funcionarioSelecionadoClear && diaSelecionadoClear && (
                                                <div style={{
                                                    ...styles.selectedCellsContainer,
                                                    backgroundColor: '#fef5e7',
                                                    border: '1px solid #f6e05e'
                                                }}>
                                                    <div style={{ fontSize: '0.9rem', color: '#744210' }}>
                                                        <div style={{ marginBottom: '10px' }}>
                                                            <strong>📊 Pré-visualização da Limpeza:</strong>
                                                        </div>
                                                        {(() => {
                                                            const funcionarioData = dadosGrade.find(item => item.utilizador.id.toString() === funcionarioSelecionadoClear.toString());
                                                            const dia = parseInt(diaSelecionadoClear);
                                                            if (funcionarioData) {
                                                                const estatisticas = funcionarioData.estatisticasDias[dia];

                                                                return (
                                                                    <div>
                                                                        <div>• <strong>Funcionário:</strong> {funcionarioData.utilizador.nome}</div>
                                                                        <div>• <strong>Dia:</strong> {dia}/{mesSelecionado}/{anoSelecionado}</div>
                                                                        <div>• <strong>Registos a eliminar:</strong> {estatisticas?.totalRegistos || 0}</div>
                                                                        <div>• <strong>Horas a perder:</strong> {estatisticas?.horasEstimadas || '0.0'}h</div>
                                                                        {estatisticas?.obras && estatisticas.obras.length > 0 && (
                                                                            <div>• <strong>Obras afetadas:</strong> {estatisticas.obras.join(', ')}</div>
                                                                        )}
                                                                        {(!estatisticas || estatisticas.totalRegistos === 0) && (
                                                                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e2e8f0', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                                                <div style={{ color: '#2d3748', fontSize: '0.85rem' }}>
                                                                                    <strong>ℹ️ Informação:</strong> Não existem registos neste dia para eliminar.
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            return <div>Selecione um funcionário e dia para ver a pré-visualização.</div>;
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={styles.obraContainer}>
                                                <label style={styles.obraLabel}>
                                                    <span style={styles.obraIcon}>🏗️</span>
                                                    Obra Selecionada (Filtro)
                                                </label>
                                                <div style={{
                                                    padding: '12px 16px',
                                                    border: '2px solid #e2e8f0',
                                                    borderRadius: '12px',
                                                    backgroundColor: '#f8f9fa',
                                                    fontSize: '1rem',
                                                    color: obraSelecionada ? '#2d3748' : '#718096'
                                                }}>
                                                    {obraSelecionada
                                                        ? `${obras.find(o => o.id.toString() === obraSelecionada.toString())?.nome || `Obra ${obraSelecionada}`} - Apenas registos desta obra serão eliminados`
                                                        : 'Todas as obras - Todos os registos do dia serão eliminados'
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        <div style={styles.bulkModalActions}>
                                            <button
                                                style={styles.cancelButton}
                                                onClick={() => setClearPointsDialogOpen(false)}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                style={{ ...styles.confirmButton, backgroundColor: '#e53e3e' }}
                                                onClick={limparPontosDoDia}
                                                disabled={!funcionarioSelecionadoClear || !diaSelecionadoClear || loadingClear}
                                            >
                                                {loadingClear ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                        A eliminar...
                                                    </>
                                                ) : (
                                                    '🗑️ Eliminar Registos'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal para preencher pontos em falta */}
                            {autoFillDialogOpen && (
                                <div style={styles.modalOverlay}>
                                    <div style={styles.bulkModal}>
                                        <div style={styles.bulkModalHeader}>
                                            <h3 style={styles.bulkModalTitle}>
                                                🤖 Preencher Pontos em Falta
                                            </h3>
                                            <p style={styles.bulkModalSubtitle}>
                                                Preencher automaticamente os dias vazios de um funcionário
                                            </p>
                                            <button
                                                style={styles.closeButton}
                                                onClick={() => setAutoFillDialogOpen(false)}
                                                aria-label="Fechar"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <div style={styles.bulkModalContent}>
                                            <div style={styles.filterGroup}>
                                                <label style={styles.label}>Funcionário</label>
                                                <select
                                                    style={styles.select}
                                                    value={funcionarioSelecionadoAutoFill}
                                                    onChange={e => setFuncionarioSelecionadoAutoFill(e.target.value)}
                                                >
                                                    <option value="">-- Selecione um funcionário --</option>
                                                    {dadosGrade.map(item => (
                                                        <option key={item.utilizador.id} value={item.utilizador.id}>
                                                            {item.utilizador.nome} ({item.utilizador.email})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {funcionarioSelecionadoAutoFill && (
                                                <div style={{
                                                    ...styles.selectedCellsContainer,
                                                    backgroundColor: '#fff3cd',
                                                    border: '1px solid #ffeaa7'
                                                }}>
                                                    <div style={{ fontSize: '0.9rem', color: '#856404' }}>
                                                        <div style={{ marginBottom: '10px' }}>
                                                            <strong>📊 Análise do Funcionário:</strong>
                                                        </div>
                                                        {(() => {
                                                            const funcionarioData = dadosGrade.find(item => item.utilizador.id.toString() === funcionarioSelecionadoAutoFill.toString());
                                                            if (funcionarioData) {
                                                                const diasVazios = diasDoMes.filter(dia => {
                                                                    const estatisticas = funcionarioData.estatisticasDias[dia];
                                                                    const dataObj = new Date(parseInt(anoSelecionado), parseInt(mesSelecionado) - 1, dia);
                                                                    const isWeekend = dataObj.getDay() === 0 || dataObj.getDay() === 6;
                                                                    return !isWeekend && (!estatisticas || (estatisticas.totalRegistos === 0 && (!estatisticas.faltas || estatisticas.faltas.length === 0)));
                                                                });

                                                                return (
                                                                    <div>
                                                                        <div>• <strong>Nome:</strong> {funcionarioData.utilizador.nome}</div>
                                                                        <div>• <strong>Total dias com registos:</strong> {funcionarioData.totalDias}</div>
                                                                        <div>• <strong>Total horas trabalhadas:</strong> {funcionarioData.totalHorasEstimadas}h</div>
                                                                        <div>• <strong>Dias vazios encontrados:</strong> {diasVazios.length} dias ({diasVazios.length > 0 ? diasVazios.join(', ') : 'nenhum'})</div>
                                                                        {diasVazios.length > 0 && (
                                                                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#d1ecf1', borderRadius: '6px', border: '1px solid #bee5eb' }}>
                                                                                <div style={{ color: '#0c5460', fontSize: '0.85rem' }}>
                                                                                    <strong>⚡ Ação a realizar:</strong> Serão criados {diasVazios.length * 4} registos de ponto
                                                                                    ({diasVazios.length} dias × 4 pontos por dia) nos dias vazios listados acima.
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            return <div>Selecione um funcionário para ver a análise.</div>;
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={styles.horariosContainer}>
                                                <h4 style={styles.horariosTitle}>⏰ Horários a Aplicar</h4>

                                                <div style={styles.horariosGrid}>
                                                    <div style={styles.periodoContainer}>
                                                        <div style={styles.periodoHeader}>
                                                            <span style={styles.periodoIcon}>🌅</span>
                                                            <span style={styles.periodoTitle}>Manhã</span>
                                                        </div>
                                                        <div style={styles.horarioRow}>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Entrada</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.entradaManha}
                                                                    onChange={e => setHorarios(h => ({ ...h, entradaManha: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Saída</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.saidaManha}
                                                                    onChange={e => setHorarios(h => ({ ...h, saidaManha: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={styles.periodoContainer}>
                                                        <div style={styles.periodoHeader}>
                                                            <span style={styles.periodoIcon}>🌇</span>
                                                            <span style={styles.periodoTitle}>Tarde</span>
                                                        </div>
                                                        <div style={styles.horarioRow}>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Entrada</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.entradaTarde}
                                                                    onChange={e => setHorarios(h => ({ ...h, entradaTarde: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Saída</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.saidaTarde}
                                                                    onChange={e => setHorarios(h => ({ ...h, saidaTarde: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={styles.obraContainer}>
                                                <label style={styles.obraLabel}>
                                                    <span style={styles.obraIcon}>🏗️</span>
                                                    Obra Selecionada
                                                </label>
                                                <div style={{
                                                    padding: '12px 16px',
                                                    border: '2px solid #e2e8f0',
                                                    borderRadius: '12px',
                                                    backgroundColor: '#f8f9fa',
                                                    fontSize: '1rem',
                                                    color: obraSelecionada ? '#2d3748' : '#718096'
                                                }}>
                                                    {obraSelecionada
                                                        ? obras.find(o => o.id.toString() === obraSelecionada.toString())?.nome || `Obra ${obraSelecionada}`
                                                        : 'Nenhuma obra selecionada - por favor, selecione uma obra nos filtros acima'
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        <div style={styles.bulkModalActions}>
                                            <button
                                                style={styles.cancelButton}
                                                onClick={() => setAutoFillDialogOpen(false)}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                style={{ ...styles.confirmButton, backgroundColor: '#805ad5' }}
                                                onClick={preencherPontosEmFalta}
                                                disabled={!funcionarioSelecionadoAutoFill || !obraSelecionada || loadingAutoFill}
                                            >
                                                {loadingAutoFill ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                        A preencher...
                                                    </>
                                                ) : (
                                                    '🤖 Preencher Automaticamente'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </>
                    )}

                    {viewMode === 'detalhes' && utilizadorDetalhado && (
                        <>
                            <button
                                style={styles.detailsButton}
                                onClick={() => {
                                    setUtilizadorDetalhado(null);
                                    setViewMode('resumo');
                                }}
                            >
                                ← Voltar ao Resumo
                            </button>

                            {registosDetalhados.length > 0 && (
                                <button
                                    style={styles.exportButton}
                                    onClick={exportarDetalhesUtilizador}
                                >
                                    📊 Exportar Detalhes
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Loading */}
            {(loading || loadingGrade) && (
                <div style={styles.loadingCard}>
                    <div style={styles.spinner}></div>
                    <p>A carregar dados...</p>
                </div>
            )}

            {/* Resumo dos Utilizadores */}
            {viewMode === 'resumo' && !loading && resumoUtilizadores.length > 0 && (
                <div style={styles.resumoSection}>
                    <h3 style={styles.sectionTitle}>
                        <span style={styles.sectionIcon}>📊</span>
                        Resumo por Utilizador ({resumoUtilizadores.length} utilizadores)
                    </h3>

                    <div style={styles.utilizadoresGrid}>
                        {resumoUtilizadores.map((resumo, index) => (
                            <div
                                key={resumo.utilizador.id}
                                style={{ ...styles.utilizadorCard, ...styles.utilizadorCardHover }}
                                onClick={() => {
                                    carregarDetalhesUtilizador(resumo.utilizador);
                                    setViewMode('detalhes');
                                }}
                            >
                                <div style={styles.utilizadorHeader}>
                                    <div style={styles.utilizadorInfo}>
                                        <h4 style={styles.utilizadorNome}>
                                            👤 {resumo.utilizador.nome}
                                        </h4>
                                        
                                       <p style={styles.utilizadorGradeNome}>{resumo.utilizador.username}</p>
                                        <p style={styles.utilizadorEmail}>{resumo.utilizador.email}</p>
                                    </div>
                                    <div style={styles.horasDestaque}>
                                        <span style={styles.horasNumero}>
                                            {(() => {
                                                const horasDecimal = parseFloat(resumo.totalHorasEstimadas);
                                                const horas = Math.floor(horasDecimal);
                                                const minutos = Math.round((horasDecimal - horas) * 60);
                                                return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
                                            })()}
                                        </span>
                                        <span style={styles.horasLabel}>total</span>
                                    </div>
                                </div>

                                <div style={styles.statsRow}>
                                    <div style={styles.statItem}>
                                        <span style={styles.statValue}>{resumo.totalDias}</span>
                                        <span style={styles.statLabel}>dias</span>
                                    </div>
                                    <div style={styles.statItem}>
                                        <span style={styles.statValue}>{resumo.totalRegistos}</span>
                                        <span style={styles.statLabel}>registos</span>
                                    </div>
                                    <div style={styles.statItem}>
                                        <span style={styles.statValue}>{resumo.percentagemConfirmados}%</span>
                                        <span style={styles.statLabel}>confirmado</span>
                                    </div>
                                </div>

                                <div style={styles.obrasInfo}>
                                    <span style={styles.obrasLabel}>Obras:</span>
                                    <span style={styles.obrasTexto}>{resumo.obras.length > 0 ? resumo.obras.join(', ') : 'N/A'}</span>
                                </div>

                                <div style={styles.periodoInfo}>
                                    <span style={styles.periodoTexto}>📅 {resumo.periodoInicio} - {resumo.periodoFim}</span>
                                </div>

                                <div style={styles.clickHint}>
                                    👆 Clique para ver detalhes completos
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Grade Mensal */}
            {viewMode === 'grade' && !loadingGrade && (anoSelecionado && mesSelecionado) && (
                <div style={styles.gradeSection}>
                    <h3 style={styles.sectionTitle}>
                        <span style={styles.sectionIcon}>📅</span>
                        Grade Mensal - {mesSelecionado}/{anoSelecionado} ({dadosGrade.length} utilizadores)
                    </h3>

                    <div style={styles.legendaContainer}>
                        <h4 style={styles.legendaTitle}>Legenda:</h4>
                        <div style={styles.legendaItems}>
                            <div style={styles.legendaItem}>
                                <div style={{ ...styles.legendaCor, backgroundColor: '#d4edda' }}></div>
                                <span>Ótimo (100% confirmado, 7+ horas)</span>
                            </div>
                            <div style={styles.legendaItem}>
                                <div style={{ ...styles.legendaCor, backgroundColor: '#fff3cd' }}></div>
                                <span>Bom (80%+ confirmado, 6+ horas)</span>
                            </div>
                            <div style={styles.legendaItem}>
                                <div style={{ ...styles.legendaCor, backgroundColor: '#f8d7da' }}></div>
                                <span>Atenção (50%+ confirmado ou 4+ horas)</span>
                            </div>
                            <div style={styles.legendaItem}>
                                <div style={{ ...styles.legendaCor, backgroundColor: '#f5c6cb' }}></div>
                                <span>Problema (menos de 50% ou menos de 4h)</span>
                            </div>
                            <div style={styles.legendaItem}>
                                <div style={{ ...styles.legendaCor, backgroundColor: '#f8f9fa' }}></div>
                                <span>Sem registos</span>
                            </div>
                        </div>
                        <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#4a5568', fontStyle: 'italic' }}>
                            <strong>💡 Instruções:</strong> Clique normal = <strong>abrir editor de pontos avançado</strong> | Ctrl + Clique = seleção múltipla
                        </div>
                    </div>

                    <div style={styles.gradeContainer}>
                        <div style={styles.gradeScrollContainer}>
                            <table style={styles.gradeTable}>
                                <thead>
                                    <tr>
                                        <th style={{ ...styles.gradeHeader, ...styles.gradeHeaderFixed }}>Nome</th>
                                        {diasDoMes.map(dia => {
                                            // certifica-te de transformar strings em números
                                            const y = parseInt(anoSelecionado, 10);
                                            const m = parseInt(mesSelecionado, 10) - 1;
                                            const dateObj = new Date(y, m, dia);
                                            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                                            return (
                                                <th
                                                    key={dia}
                                                    style={{
                                                        ...styles.gradeHeader,
                                                        ...(isWeekend ? styles.weekendHeader : {})
                                                    }}
                                                >
                                                    {dia}
                                                </th>
                                            );
                                        })}

                                        <th style={styles.gradeHeader}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dadosGrade.map((item, index) => (
                                        <tr key={item.utilizador.id} style={index % 2 === 0 ? styles.gradeRowEven : styles.gradeRowOdd}>
                                            <td
                                                style={{ ...styles.gradeCell, ...styles.gradeCellFixed }}
                                                onClick={() => {
                                                    carregarDetalhesUtilizador(item.utilizador);
                                                    setViewMode('detalhes');
                                                }}
                                            >
                                                <div style={styles.utilizadorGradeInfo}>
                                                    <div style={styles.utilizadorGradeNome}>{item.utilizador.username}</div>
                                                    <div style={styles.utilizadorGradeEmail}>{item.utilizador.email}</div>
                                                </div>
                                            </td>
                                            {diasDoMes.map(dia => {
                                                const estatisticas = item.estatisticasDias[dia];
                                                const cellKey = `${item.utilizador.id}-${dia}`;

                                                return (
                                                    <td
                                                        onClick={e => {
                                                            // Garantir que os valores são números válidos antes de criar a cellKey
                                                            const userId = parseInt(item.utilizador.id, 10);
                                                            const diaNum = parseInt(dia, 10);

                                                            if (isNaN(userId) || isNaN(diaNum)) {
                                                                console.error(`[ERROR] IDs inválidos - utilizador.id: ${item.utilizador.id}, dia: ${dia}`);
                                                                return;
                                                            }

                                                            const cellKey = `${userId}-${diaNum}`;
                                                            console.log(`[DEBUG] Clique na célula - utilizador.id: ${userId}, dia: ${diaNum}, cellKey: "${cellKey}"`);

                                                            if (e.ctrlKey) {
                                                                // Ctrl + Click = Seleção múltipla
                                                                setSelectedCells(cells => {
                                                                    const newCells = cells.includes(cellKey)
                                                                        ? cells.filter(c => c !== cellKey)
                                                                        : [...cells, cellKey];
                                                                    console.log(`[DEBUG] Células selecionadas atualizadas:`, newCells);
                                                                    return newCells;
                                                                });
                                                            } else {
                                                                // Clique normal = Sempre abrir editor (mesmo se não há registos)
                                                                abrirEdicaoDirecta(userId, diaNum, item.utilizador.nome);
                                                            }
                                                        }}
                                                        style={{
                                                            ...styles.gradeCell,
                                                            ...(new Date(parseInt(anoSelecionado, 10), parseInt(mesSelecionado, 10) - 1, dia).getDay() === 0 || new Date(parseInt(anoSelecionado, 10), parseInt(mesSelecionado, 10) - 1, dia).getDay() === 6 ? styles.weekendCell : {}),
                                                            border: selectedCells.includes(`${item.utilizador.id}-${dia}`)
                                                                ? '3px solid #3182ce'
                                                                : estatisticas
                                                                    ? '1px solid #e2e8f0'
                                                                    : '1px dashed #cbd5e1',
                                                            backgroundColor: selectedCells.includes(`${item.utilizador.id}-${dia}`)
                                                                ? '#bee3f8'
                                                                : estatisticas
                                                                    ? obterCorStatusDia(estatisticas)
                                                                    : '#fafafa',
                                                            cursor: 'pointer'
                                                        }}

                                                        title={estatisticas ?
                                                            `${estatisticas.totalRegistos} registos\n${estatisticas.horasEstimadas} horas\n${estatisticas.confirmados}/${estatisticas.totalRegistos} confirmados\nPrimeiro: ${estatisticas.primeiroRegisto}\nÚltimo: ${estatisticas.ultimoRegisto}${estatisticas.faltas && estatisticas.faltas.length > 0 ? `\n\nFaltas: ${estatisticas.faltas.map(f => `${f.Falta} - ${tiposFaltas[f.Falta] || 'Desconhecido'} (${f.Tempo}${f.Horas ? 'h' : 'd'})`).join(', ')}` : ''}\n\nClique: abrir editor de pontos\nCtrl+Click: seleção múltipla`
                                                            : 'Sem registos\n\nClique: abrir editor de pontos\nCtrl+Click: seleção múltipla'
                                                        }



                                                    >
                                                        {estatisticas ? (
                                                            <div style={styles.gradeCellContent}>
                                                                <div style={styles.gradeCellHoras}>
                                                                    {(() => {
                                                                        const horasDecimal = parseFloat(estatisticas.horasEstimadas);
                                                                        const horas = Math.floor(horasDecimal);
                                                                        const minutos = Math.round((horasDecimal - horas) * 60);
                                                                        return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
                                                                    })()}
                                                                </div>
                                                                <div style={styles.gradeCellRegistos}>{estatisticas.totalRegistos}r</div>
                                                                {estatisticas.faltas && estatisticas.faltas.length > 0 && (
                                                                    <div style={styles.gradeCellFaltas}>📅{estatisticas.faltas.length}</div>
                                                                )}
                                                                {estatisticas.naoConfirmados > 0 && (
                                                                    <div style={styles.gradeCellAlert}>⚠️{estatisticas.naoConfirmados}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div style={{ ...styles.gradeCellEmpty, cursor: 'pointer' }}>
                                                                <div style={{ fontSize: '0.7rem', color: '#a0aec0' }}>+</div>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ ...styles.gradeCell, ...styles.gradeCellTotal }}>
                                                <div style={styles.gradeTotalContent}>
                                                    <div style={styles.gradeTotalHoras}>
                                                        {(() => {
                                                            const horasDecimal = parseFloat(item.totalHorasEstimadas);
                                                            const horas = Math.floor(horasDecimal);
                                                            const minutos = Math.round((horasDecimal - horas) * 60);
                                                            return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
                                                        })()}
                                                    </div>
                                                    <div style={styles.gradeTotalDias}>{item.totalDias} dias</div>
                                                    {item.totalFaltas > 0 && (
                                                        <div style={styles.gradeTotalFaltas}>{item.totalFaltas} faltas</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Detalhes do Utilizador Selecionado */}
            {viewMode === 'detalhes' && utilizadorDetalhado && (
                <div style={styles.detalhesSection}>
                    <div style={styles.detalhesHeader}>
                        <div>
                            <h3 style={styles.sectionTitle}>
                                <span style={styles.sectionIcon}>📋</span>
                                Detalhes - {utilizadorDetalhado.nome}
                            </h3>
                            <p style={styles.detalhesSubtitle}>{utilizadorDetalhado.email}</p>
                        </div>

                        <div style={styles.detalhesActions}>
                            {registosDetalhados.length > 0 && (
                                <button
                                    style={styles.exportButton}
                                    onClick={exportarDetalhesUtilizador}
                                >
                                    📊 Exportar Detalhes
                                </button>
                            )}

                            <div style={styles.filterGroup}>
                                <select
                                    style={styles.selectSmall}
                                    value={filtroTipo}
                                    onChange={e => setFiltroTipo(e.target.value)}
                                >
                                    <option value="">-- Todos os tipos --</option>
                                    <option value="entrada">Entrada</option>
                                    <option value="saida">Saída</option>
                                    <option value="pausa">Pausa</option>
                                    <option value="retorno">Retorno</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {loadingDetalhes && (
                        <div style={styles.loadingCard}>
                            <div style={styles.spinner}></div>
                            <p>A carregar detalhes...</p>
                        </div>
                    )}

                    {!loadingDetalhes && Object.entries(registosFiltrados).length > 0 && (
                        Object.entries(registosFiltrados)
                            .sort(([a], [b]) => new Date(b) - new Date(a))
                            .map(([dia, eventos]) => (
                                <div key={dia} style={styles.dayCard}>
                                    <div style={styles.dayHeader}>
                                        <h4 style={styles.dayTitle}>
                                            📅 {new Date(dia).toLocaleDateString('pt-PT', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </h4>
                                        <span style={styles.dayBadge}>
                                            {eventos.length} registo{eventos.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    <div style={styles.eventsList}>
                                        {eventos
                                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                                            .map((evento, i) => (
                                                <div key={i} style={{ ...styles.eventCard, ...styles.eventCardHover }}>
                                                    <div style={styles.eventHeader}>
                                                        <div style={styles.eventType}>
                                                            <span style={styles.typeIcon}>
                                                                {evento.tipo === 'entrada' ? '🟢' :
                                                                    evento.tipo === 'saida' ? '🔴' :
                                                                        evento.tipo === 'pausa' ? '⏸️' : '▶️'}
                                                            </span>
                                                            <span style={styles.typeText}>{evento.tipo.toUpperCase()}</span>
                                                        </div>
                                                        <div style={styles.eventTime}>
                                                            🕐 {new Date(evento.timestamp).toLocaleTimeString('pt-PT')}
                                                        </div>
                                                    </div>

                                                    <div style={styles.eventDetails}>
                                                        <div style={styles.eventInfo}>
                                                            <span style={styles.infoLabel}>Obra:</span>
                                                            <span style={styles.infoValue}>{evento.Obra?.nome || 'N/A'}</span>
                                                        </div>

                                                        <div style={styles.eventInfo}>
                                                            <span style={styles.infoLabel}>Status:</span>
                                                            <span style={{
                                                                ...styles.statusBadge,
                                                                ...(evento.is_confirmed ? styles.confirmed : styles.unconfirmed)
                                                            }}>
                                                                {evento.is_confirmed ? '✅ Confirmado' : '⏳ Pendente'}
                                                            </span>
                                                        </div>

                                                        {evento.justificacao && (
                                                            <div style={styles.eventInfo}>
                                                                <span style={styles.infoLabel}>Justificação:</span>
                                                                <span style={styles.infoValue}>{evento.justificacao}</span>
                                                            </div>
                                                        )}

                                                        {evento.latitude && evento.longitude && (
                                                            <div style={styles.eventInfo}>
                                                                <span style={styles.infoLabel}>Localização:</span>
                                                                <span style={styles.infoValue}>
                                                                    📍 {enderecos[`${evento.latitude},${evento.longitude}`] || 'A obter localização...'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))
                    )}

                    {!loadingDetalhes && Object.entries(registosFiltrados).length === 0 && (
                        <div style={styles.emptyState}>
                            <span style={styles.emptyIcon}>📋</span>
                            <h3>Nenhum registo encontrado</h3>
                            <p>Não foram encontrados registos para os critérios selecionados.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Edição Direta */}
            {editModalOpen && registoParaEditar && (
                <EditarRegistoModal
                    registo={registoParaEditar}
                    visible={editModalOpen}
                    onClose={() => {
                        setEditModalOpen(false);
                        setRegistoParaEditar(null);
                        setDadosEdicao({ userId: null, dia: null, registos: [] });
                    }}
                    onSave={salvarEdicaoDirecta}
                />
            )}

            {/* Empty States */}
            {viewMode === 'resumo' && !loading && resumoUtilizadores.length === 0 && (
                <div style={styles.emptyState}>
                    <span style={styles.emptyIcon}>👥</span>
                    <h3>Nenhum utilizador encontrado</h3>
                    <p>Não foram encontrados registos para os critérios selecionados.</p>
                </div>
            )}

            {viewMode === 'grade' && !loadingGrade && dadosGrade.length === 0 && anoSelecionado && mesSelecionado && (
                <div style={styles.emptyState}>
                    <span style={styles.emptyIcon}>📅</span>
                    <h3>Nenhum utilizador encontrado para a grade</h3>
                    <p>Não foram encontrados utilizadores para {mesSelecionado}/{anoSelecionado} com os critérios selecionados.</p>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                        Verifique se:
                        <br />• Os utilizadores têm registos no período selecionado
                        <br />• A obra selecionada tem utilizadores associados
                        <br />• Os filtros estão corretos
                    </p>
                </div>
            )}
        </div>
    );
};

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
        marginBottom: '30px'
    },
    title: {
        fontSize: '2.5rem',
        color: '#2d3748',
        margin: '0 0 10px 0',
        fontWeight: '700'
    },
    subtitle: {
        color: '#718096',
        fontSize: '1.1rem',
        margin: 0
    },
    icon: {
        marginRight: '10px'
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
        borderColor: '#3182ce'
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
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
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
        overflowY: 'visible'
    },
    gradeTable: {
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: '1200px'
    },
    gradeHeader: {
        backgroundColor: '#f7fafc',
        padding: '12px 8px',
        textAlign: 'center',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#4a5568',
        border: '1px solid #e2e8f0',
        minWidth: '60px'
    },
    // Destacar cabeçalhos de fim-de-semana
    weekendHeader: {
        backgroundColor: '#e0f7fa'
    },
    // Destacar células de fim-de-semana
    weekendCell: {
        backgroundColor: '#f0f8ff'
    },
    gradeHeaderFixed: {
        position: 'sticky',
        left: 0,
        zIndex: 10,
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
        padding: '8px',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
        fontSize: '0.8rem',
        verticalAlign: 'middle',
        minWidth: '60px',
        maxWidth: '60px'
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
        flex: 1
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

export default RegistosPorUtilizador;