import React, { useEffect, useState, useCallback, useMemo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaCalendarCheck, FaClock, FaPlus, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { secureStorage } from '../../utils/secureStorage';
const CalendarioHorasTrabalho = () => {
    // NOVO: feriados (array de 'YYYY-MM-DD')
    const [feriados, setFeriados] = useState([]);
    const feriadosSet = useMemo(() => new Set(feriados), [feriados]);

    const [mesAtual, setMesAtual] = useState(new Date());
    const [resumo, setResumo] = useState({});
    const [diaSelecionado, setDiaSelecionado] = useState(null);
    const [detalhes, setDetalhes] = useState([]);
    const [obras, setObras] = useState([]);
    const [novaEntrada, setNovaEntrada] = useState({
        tipo: 'entrada',
        obra_id: '',
        hora: '08:00',
        justificacao: ''
    });
    const [registosBrutos, setRegistosBrutos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [registoEmEdicao, setRegistoEmEdicao] = useState(null);
    const [novaHoraEdicao, setNovaHoraEdicao] = useState('');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [mostrarFormularioFalta, setMostrarFormularioFalta] = useState(false);
    const [MostrarFormularioFerias, setMostrarFormularioFerias] = useState(false);
    const [faltas, setFaltas] = useState([]);
    const [faltasDoDia, setFaltasDoDia] = useState([]);
    const [tiposFalta, setTiposFalta] = useState([]);
    const [mapaFaltas, setMapaFaltas] = useState({});
    const [horarioFuncionario, setHorarioFuncionario] = useState(null);
    const [horariosTrabalho, setHorariosTrabalho] = useState([]);
    const [detalhesHorario, setDetalhesHorario] = useState(null);
    const [pedidosPendentesDoDia, setPedidosPendentesDoDia] = useState([]);
    const [novaFalta, setNovaFalta] = useState({
        Falta: '',
        Horas: false,
        Tempo: 1,
        Observacoes: '',
        DescontaAlimentacao: false,
        DescontaSubsidioTurno: false
    });
    const [anexosFalta, setAnexosFalta] = useState([]);
    const [uploadingAnexo, setUploadingAnexo] = useState(false);
    const [novaFaltaFerias, setNovaFaltaFerias] = useState({
        dataInicio: '',
        dataFim: '',
        Horas: false,
        Tempo: 1,
        Observacoes: ''
    });
    const [modoEdicaoFalta, setModoEdicaoFalta] = useState(false);
    const [modoEdicaoFerias, setModoEdicaoFerias] = useState(false);
    const [faltaOriginal, setFaltaOriginal] = useState(null);
    const [feriasTotalizador, setFeriasTotalizador] = useState(null);
    const [justificacaoAlteracao, setJustificacaoAlteracao] = useState('');
    const [feriasOriginal, setFeriasOriginal] = useState(null);
    const [diasPendentes, setDiasPendentes] = useState([]);
    const [faltasPendentes, setFaltasPendentes] = useState([]);

    // State para o modal de dividir horas
    const [mostrarModalDividirHoras, setMostrarModalDividirHoras] = useState(false);
    const [obraSelecionadaParaDividir, setObraSelecionadaParaDividir] = useState(null);
    const [horasParaDividir, setHorasParaDividir] = useState(0);
    const [minutosParaDividir, setMinutosParaDividir] = useState(0);
    const [obrasDestino, setObrasDestino] = useState([]);
    const [divisoes, setDivisoes] = useState([]);

    // Verificar permissões do utilizador para dividir horas
    const podeAcessarDivisaoHoras = useMemo(() => {
        const tipoUser = secureStorage.getItem('tipoUser');
        return ['diretor', 'administrador', 'encarregado'].includes(tipoUser?.toLowerCase());
    }, []);

    const isBeforeToday = (dateLike) => {
        if (!dateLike) return false;
        const d = new Date(dateLike);
        d.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d < today;
    };

    const fetchJSON = async (url, options = {}) => {
        const res = await fetch(url, options);
        const txt = await res.text();
        if (!res.ok) throw new Error(`${res.status} ${txt || res.statusText}`);
        return txt ? JSON.parse(txt) : null;
    };

    const safeJson = (p) =>
        p.then((v) => ({ ok: true, v })).catch((e) => ({ ok: false, e }));

    const formatISO = (d) => toLocalISODate(d);

    const toLocalISODate = (value) => {
        const d = new Date(value);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const fetchJSONWithRetry = async (url, {
        method = 'GET',
        headers = {},
        body,
        maxAttempts = 4,
        timeoutMs = 12000,
        backoffBaseMs = 600,
        retryOn = [429, 500, 502, 503, 504]
    } = {}) => {
        let attempt = 0;
        let lastErr;
        while (attempt < maxAttempts) {
            attempt++;
            const ac = new AbortController();
            const t = setTimeout(() => ac.abort(), timeoutMs);
            try {
                const res = await fetch(url, { method, headers, body, signal: ac.signal });
                const txt = await res.text();
                clearTimeout(t);
                if (!res.ok) {
                    if (!retryOn.includes(res.status)) {
                        throw new Error(`${res.status} ${txt || res.statusText}`);
                    }
                    lastErr = new Error(`${res.status} ${txt || res.statusText}`);
                } else {
                    return txt ? JSON.parse(txt) : null;
                }
            } catch (e) {
                clearTimeout(t);
                lastErr = e.name === 'AbortError' ? new Error('Timeout') : e;
            }
            const wait = Math.round(backoffBaseMs * (2 ** (attempt - 1)) * (0.75 + Math.random() * 0.5));
            await sleep(wait);
        }
        throw lastErr || new Error('Falha ao obter recurso');
    };

    const carregarFaltasPendentes = async () => {
        const token = secureStorage.getItem('loginToken');
        try {
            const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/pendentes`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    urlempresa: secureStorage.getItem('empresa_id'),
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                setFaltasPendentes(data || []);
            } else {
                console.warn("Erro ao buscar pendentes:", await res.text());
            }
        } catch (err) {
            console.error("Erro ao carregar faltas pendentes:", err);
        }
    };

    // NOVO: normalizador de feriados (aceita vários formatos do endpoint)
    // Substituir completamente:
    const normalizarFeriados = (payload) => {
        try {
            const out = new Set();

            // Função melhorada para extrair data ISO (YYYY-MM-DD) de strings datetime
            const extractDateISO = (v) => {
                if (typeof v !== 'string') return null;
                // Se a string contém 'T' (formato ISO datetime), pega apenas a parte da data
                if (v.includes('T')) {
                    return v.split('T')[0];
                }
                // Senão, assume que já está no formato YYYY-MM-DD e pega os primeiros 10 caracteres
                return v.slice(0, 10);
            };

            const toLocalDate = (isoYYYYMMDD) => {
                const [y, m, d] = isoYYYYMMDD.split('-').map(Number);
                return new Date(y, m - 1, d); // local time, evita desvios por fuso/DST
            };

            const addISO = (s) => { if (s && s.match(/^\d{4}-\d{2}-\d{2}$/)) out.add(s); };

            const handleRow = (row) => {
                if (!row) return;

                // Procura por diferentes propriedades de data
                const dStr =
                    extractDateISO(row.Feriado) ||
                    extractDateISO(row.feriado) ||
                    extractDateISO(row.Data) ||
                    extractDateISO(row.data) ||
                    extractDateISO(row.Date) ||
                    extractDateISO(row.date) ||
                    extractDateISO(row.DataFeriado) ||
                    extractDateISO(row.dataFeriado) ||
                    extractDateISO(row.DataDia) ||
                    extractDateISO(row.dataDia) ||
                    extractDateISO(row.DataInicio) ||
                    extractDateISO(row.dataInicio);

                const fStrRaw =
                    row.DataFim || row.dataFim || row.Fim || row.fim;

                if (dStr && fStrRaw) {
                    // intervalo [dStr..fStr]
                    const fStr = extractDateISO(typeof fStrRaw === 'string' ? fStrRaw : String(fStrRaw));
                    if (!fStr) { addISO(dStr); return; }
                    let cur = toLocalDate(dStr);
                    const end = toLocalDate(fStr);
                    while (cur <= end) {
                        addISO(
                            `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
                        );
                        cur.setDate(cur.getDate() + 1);
                    }
                } else if (dStr) {
                    addISO(dStr);
                }
            };

            if (Array.isArray(payload)) {
                payload.forEach((item) => {
                    if (typeof item === 'string') addISO(extractDateISO(item));
                    else handleRow(item);
                });
            } else if (payload?.DataSet?.Table) {
                payload.DataSet.Table.forEach(handleRow);
            } else {
                handleRow(payload);
            }

            //console.log(`Feriados normalizados: ${out.size} datas encontradas`, Array.from(out));
            return out;

        } catch (error) {
            console.error('Erro na normalização de feriados:', error);
            console.error('Payload que causou o erro:', payload);
            return new Set(); // Retorna conjunto vazio em caso de erro
        }
    };


    // NOVO: carregar feriados da WebAPI
    const carregarFeriados = async (tentativa = 1, maxTentativas = 3) => {
        const painelAdminToken = secureStorage.getItem('painelAdminToken');
        const urlempresa = secureStorage.getItem('urlempresa');
        const ano = mesAtual.getFullYear();

        if (!painelAdminToken || !urlempresa) {
            console.warn('Token ou URL da empresa não encontrados para carregar feriados');
            return;
        }

        try {
            //console.log(`Carregando feriados para o ano ${ano}... (tentativa ${tentativa}/${maxTentativas})`);

            const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/Feriados`, {
                headers: {
                    'Authorization': `Bearer ${painelAdminToken}`,
                    'urlempresa': urlempresa,
                    'Content-Type': 'application/json'
                }
            });

            //console.log(`Resposta da API feriados: Status ${res.status}`);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Erro na resposta da API feriados:', errorText);

                // Se for erro 409 e ainda temos tentativas, aguardar e tentar novamente
                if (res.status === 409 && tentativa < maxTentativas) {
                    //console.log(`Erro 409 detectado. Aguardando 2s antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return carregarFeriados(tentativa + 1, maxTentativas);
                }

                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const data = await res.json();
            //console.log('Dados feriados recebidos:', data);
            const listaISO = normalizarFeriados(data);
            //console.log('Feriados normalizados:', listaISO);
            setFeriados(listaISO);

        } catch (err) {
            console.error(`Erro ao carregar feriados (tentativa ${tentativa}):`, err);

            // Se ainda temos tentativas e não foi um erro de rede crítico
            if (tentativa < maxTentativas && !err.message.includes('TypeError: Failed to fetch')) {
                //console.log(`Tentando novamente em 3s...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                return carregarFeriados(tentativa + 1, maxTentativas);
            }

            console.warn('Usando conjunto vazio de feriados como fallback');
            setFeriados(new Set()); // fallback para conjunto vazio
        }
    };


    useEffect(() => {
        const boot = async () => {
            setLoading(true);
            try {
                const hojeISO = formatarData(new Date());
                await carregarFeriados();             // <- carrega feriados primeiro
                await carregarTudoEmParalelo(hojeISO);
            } catch (e) {
                console.error('Erro no bootstrap:', e);
                alert('Erro ao carregar dados iniciais.');
            } finally {
                setLoading(false);
            }
        };
        boot();
    }, [mesAtual]);


    const carregarDiasPendentes = async () => {
        const token = secureStorage.getItem('loginToken');
        const funcionarioId = secureStorage.getItem('codFuncionario');

        try {
            const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/pendentes`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    urlempresa: secureStorage.getItem('empresa_id'),
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                const apenasDoFuncionario = data.filter(p => p.funcionario === funcionarioId);
                const diasPendentesSet = new Set();

                apenasDoFuncionario.forEach(p => {
                    if (p.tipoPedido === 'FERIAS' && p.dataInicio && p.dataFim) {
                        const inicio = new Date(p.dataInicio);
                        const fim = new Date(p.dataFim);
                        let dataAtual = new Date(inicio);

                        while (dataAtual <= fim) {
                            const iso = dataAtual.toISOString().split('T')[0];
                            diasPendentesSet.add(iso);
                            dataAtual.setDate(dataAtual.getDate() + 1);
                        }
                    } else if (p.dataPedido) {
                        const data = new Date(p.dataPedido).toISOString().split('T')[0];
                        diasPendentesSet.add(data);
                    }
                });

                setDiasPendentes(Array.from(diasPendentesSet));
            } else {
                console.warn("Erro ao carregar pendentes:", await res.text());
            }
        } catch (err) {
            console.error("Erro ao carregar pendentes:", err);
        }
    };

    const handleAnexoFaltaChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('Ficheiro demasiado grande. Máximo 10MB.');
            e.target.value = '';
            return;
        }

        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            alert('Tipo de ficheiro não permitido. Use: JPG, PNG, GIF, PDF, DOC, DOCX ou TXT.');
            e.target.value = '';
            return;
        }

        const token = secureStorage.getItem('loginToken');
        const formData = new FormData();
        formData.append('arquivo', file); // ✅ nome certo

        try {
            setUploadingAnexo(true);

            const res = await fetch('https://backend.advir.pt/api/anexo-falta/upload-temp', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}` // ✅ sem Content-Type
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setAnexosFalta(prev => [...prev, data.arquivo_temp]);
                alert('Anexo adicionado com sucesso!');
            } else {
                const erro = await res.text();
                console.error('Erro do servidor:', erro);
                alert('Erro ao fazer upload: ' + erro);
            }
        } catch (err) {
            console.error('Erro no upload:', err);
            alert('Erro ao fazer upload do anexo: ' + err.message);
        } finally {
            setUploadingAnexo(false);
            e.target.value = '';
        }
    };


    const removerAnexoFalta = (index) => {
        setAnexosFalta(prev => prev.filter((_, i) => i !== index));
    };

    const submeterFalta = async (e) => {
        e.preventDefault();

        const token = secureStorage.getItem('loginToken');
        const funcionarioId = secureStorage.getItem('codFuncionario');
        const empresaId = secureStorage.getItem('empresa_id');
        const dataFalta = diaSelecionado;

        const dadosPrincipal = {
            tipoPedido: 'FALTA',
            funcionario: funcionarioId,
            empresaId: empresaId,
            dataPedido: dataFalta,
            falta: novaFalta.Falta,
            horas: novaFalta.Horas ? 1 : 0,
            tempo: novaFalta.Tempo,
            justificacao: novaFalta.Observacoes,
            observacoes: '',
            usuarioCriador: funcionarioId,
            origem: 'LINK',
            descontaAlimentacao: novaFalta.DescontaAlimentacao ? 1 : 0,
            descontaSubsidioTurno: novaFalta.DescontaSubsidioTurno ? 1 : 0
        };

        if (!funcionarioId || !dataFalta || !novaFalta.Falta) {
            alert('Preenche todos os campos obrigatórios.');
            return;
        }

        try {
            const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    urlempresa: secureStorage.getItem('empresa_id')
                },
                body: JSON.stringify(dadosPrincipal)
            });

            if (res.ok) {
                const pedidoCriado = await res.json();

                // Associar anexos ao pedido se existirem
                if (anexosFalta.length > 0 && pedidoCriado.id) {
                    try {
                        const resAnexos = await fetch('https://backend.advir.pt/api/anexo-falta/associar-temp', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                                'urlempresa': secureStorage.getItem('empresa_id')
                            },
                            body: JSON.stringify({
                                pedido_falta_id: pedidoCriado.id.toString(),
                                anexos_temp: anexosFalta
                            })
                        });

                        if (!resAnexos.ok) {
                            const erroTexto = await resAnexos.text();
                            console.warn('Erro ao associar anexos:', erroTexto);
                        } else {
                            const resultAnexos = await resAnexos.json();
                            console.log('Anexos associados com sucesso:', resultAnexos);
                        }
                    } catch (errAnexo) {
                        console.error('Erro ao associar anexos:', errAnexo);
                    }
                }

                alert('Pedido de falta submetido com sucesso para aprovação.');

                if (novaFalta.DescontaAlimentacao) {
                    const dadosF40 = {
                        ...dadosPrincipal,
                        falta: 'F40',
                        justificacao: 'Submetida automaticamente (desconto alimentação)',
                        observacoes: '',
                    };

                    const resF40 = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                            urlempresa: secureStorage.getItem('empresa_id')
                        },
                        body: JSON.stringify(dadosF40)
                    });

                    if (resF40.ok) {
                        //console.log('Falta F40 submetida automaticamente.');
                    } else {
                        console.warn('Erro ao submeter falta F40:', await resF40.text());
                    }
                }

                const novosPedidosPendentes = [...faltasPendentes, {
                    id: Date.now(),
                    tipoPedido: 'FALTA',
                    funcionario: funcionarioId,
                    dataPedido: dataFalta,
                    falta: novaFalta.Falta,
                    horas: novaFalta.Horas ? 1 : 0,
                    tempo: novaFalta.Tempo,
                    justificacao: novaFalta.Observacoes,
                    estadoAprovacao: 'Pendente'
                }];

                if (novaFalta.DescontaAlimentacao) {
                    novosPedidosPendentes.push({
                        id: Date.now() + 1,
                        tipoPedido: 'FALTA',
                        funcionario: funcionarioId,
                        dataPedido: dataFalta,
                        falta: 'F40',
                        horas: 0,
                        tempo: 1,
                        justificacao: 'Submetida automaticamente (desconto alimentação)',
                        estadoAprovacao: 'Pendente'
                    });
                }

                setFaltasPendentes(novosPedidosPendentes);

                const novosDiasPendentes = [...diasPendentes];
                if (!novosDiasPendentes.includes(dataFalta)) {
                    novosDiasPendentes.push(dataFalta);
                    setDiasPendentes(novosDiasPendentes);
                }

                const pedidosDoDia = novosPedidosPendentes.filter(p => {
                    const dataSelecionada = new Date(dataFalta);
                    dataSelecionada.setHours(0, 0, 0, 0);

                    if (p.tipoPedido === 'FALTA' && p.dataPedido) {
                        const dataPedido = new Date(p.dataPedido);
                        dataPedido.setHours(0, 0, 0, 0);
                        return p.funcionario === funcionarioId &&
                            p.estadoAprovacao === 'Pendente' &&
                            dataPedido.getTime() === dataSelecionada.getTime();
                    }
                    return false;
                });
                setPedidosPendentesDoDia(pedidosDoDia);

                setMostrarFormularioFalta(false);
                setNovaFalta({ Falta: '', Horas: false, Tempo: 1, Observacoes: '', DescontaAlimentacao: false, DescontaSubsidioTurno: false });
                setAnexosFalta([]);

                setDiaSelecionado(null);
                setDetalhes([]);
                setFaltasDoDia([]);
                setPedidosPendentesDoDia([]);
                setRegistosBrutos([]);

                await Promise.all([
                    carregarFaltasFuncionario(),
                    carregarDiasPendentes(),
                    carregarResumo()
                ]);

                setMesAtual(new Date(mesAtual));

            } else {
                const erro = await res.text();
                alert('Erro ao submeter falta: ' + erro);
            }
        } catch (err) {
            console.error('Erro ao submeter falta:', err);
            alert('Erro inesperado.');
        }
    };

    const carregarFaltasFuncionario = async () => {
        const token = secureStorage.getItem("painelAdminToken");
        const funcionarioId = secureStorage.getItem('codFuncionario');
        const urlempresa = secureStorage.getItem('urlempresa');

        try {
            const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionario/${funcionarioId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    urlempresa: urlempresa,
                },
            });

            if (res.ok) {
                const data = await res.json();
                const listaFaltas = data?.DataSet?.Table ?? [];
                setFaltas(listaFaltas);

                if (diaSelecionado) {
                    const faltasNoDia = listaFaltas.filter(f => {
                        const dataFalta = new Date(f.Data);
                        return (
                            dataFalta.getFullYear() === new Date(diaSelecionado).getFullYear() &&
                            dataFalta.getMonth() === new Date(diaSelecionado).getMonth() &&
                            dataFalta.getDate() === new Date(diaSelecionado).getDate()
                        );
                    });
                    setFaltasDoDia(faltasNoDia);
                }

                //console.log('Faltas carregadas:', listaFaltas);
            } else {
                const msg = await res.text();
                console.error('Erro ao carregar faltas:', res.status, msg);
            }
        } catch (err) {
            console.error('Erro ao buscar faltas:', err);
        }
    };

    const carregarTiposFalta = async () => {
        const token = secureStorage.getItem("painelAdminToken");
        const urlempresa = secureStorage.getItem("urlempresa");

        try {
            const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetListaTipoFaltas`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    urlempresa: urlempresa,
                },
            });

            if (res.ok) {
                const data = await res.json();
                const lista = data?.DataSet?.Table ?? [];
                setTiposFalta(lista);
                const mapa = Object.fromEntries(lista.map(f => [f.Falta, f.Descricao]));
                setMapaFaltas(mapa);

                //console.log('Tipos de falta carregados:', lista);
            } else {
                const msg = await res.text();
                console.error('Erro ao carregar tipos de falta:', res.status, msg);
            }
        } catch (err) {
            console.error('Erro ao buscar tipos de falta:', err);
        }
    };

    const carregarHorarioFuncionario = async () => {
        const token = secureStorage.getItem("painelAdminToken");
        const funcionarioId = "codFuncionario";
        const urlempresa = secureStorage.getItem("urlempresa");

        try {
            const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetHorarioFuncionario/${funcionarioId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    urlempresa: urlempresa,
                },
            });

            if (res.ok) {
                const data = await res.json();
                const horario = data?.DataSet?.Table?.[0] ?? null;
                setHorarioFuncionario(horario);
            } else {
                console.error("Erro ao carregar horário do funcionário:", res.status, await res.text());
            }
        } catch (err) {
            console.error("Erro ao buscar horário do funcionário:", err);
        }
    };

    const carregarHorariosTrabalho = async () => {
        const token = secureStorage.getItem("painelAdminToken");
        const urlempresa = secureStorage.getItem("urlempresa");

        try {
            const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetHorariosTrabalho`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    urlempresa: urlempresa,
                },
            });

            if (res.ok) {
                const data = await res.json();
                const lista = data?.DataSet?.Table ?? [];
                setHorariosTrabalho(lista);
            } else {
                console.error("Erro ao carregar horários de trabalho:", res.status, await res.text());
            }
        } catch (err) {
            console.error("Erro ao buscar horários de trabalho:", err);
        }
    };

    const carregarTotalizadorFerias = async () => {
        const token = secureStorage.getItem("painelAdminToken");
        const urlempresa = secureStorage.getItem("urlempresa");
        const funcionarioId = secureStorage.getItem("codFuncionario");

        try {
            const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetTotalizadorFeriasFuncionario/${funcionarioId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    urlempresa,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                setFeriasTotalizador(data?.DataSet?.Table?.[0] || null);
            } else {
                console.warn("Erro ao carregar totalizador de férias", await res.text());
            }
        } catch (err) {
            console.error("Erro ao buscar totalizador de férias:", err);
        }
    };

    const submeterFerias = async (e) => {
        e.preventDefault();

        const token = secureStorage.getItem("loginToken");
        const funcionarioId = secureStorage.getItem("codFuncionario");
        const empresaId = secureStorage.getItem('empresa_id');

        const { dataInicio, dataFim, Horas, Tempo, Observacoes } = novaFaltaFerias;

        if (!funcionarioId || !dataInicio || !dataFim) {
            alert("Preenche todos os campos obrigatórios.");
            return;
        }

        const operacao = modoEdicaoFerias ? 'EDITAR' : 'CRIAR';

        // Converter datas para formato ISO completo
        const dataInicioISO = new Date(dataInicio + 'T00:00:00.000Z').toISOString();
        const dataFimISO = new Date(dataFim + 'T00:00:00.000Z').toISOString();
        const dataPedidoISO = new Date(dataInicio + 'T00:00:00.000Z').toISOString();

        const dados = {
            tipoPedido: 'FERIAS',
            operacao,
            funcionario: funcionarioId,
            empresaId: empresaId,
            dataInicio: dataInicioISO,
            dataFim: dataFimISO,
            dataPedido: dataPedidoISO,
            horas: Horas ? 1 : 0,
            tempo: Tempo,
            justificacao: Observacoes,
            observacoes: '',
            usuarioCriador: funcionarioId,
            origem: 'LINK',
            ...(modoEdicaoFerias && feriasOriginal ? {
                dataInicioOriginal: feriasOriginal.dataInicio || feriasOriginal.DataInicio || feriasOriginal.dataPedido,
                dataFimOriginal: feriasOriginal.dataFim || feriasOriginal.DataFim || feriasOriginal.dataPedido
            } : {})
        };

        try {
            if (modoEdicaoFerias && feriasOriginal?.id) {
                const resDelete = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${feriasOriginal.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                        urlempresa: secureStorage.getItem('empresa_id')
                    }
                });

                if (!resDelete.ok) {
                    const erro = await resDelete.text();
                    alert("Erro ao eliminar pedido anterior: " + erro);
                    return;
                }
            }

            const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    urlempresa: secureStorage.getItem('empresa_id')
                },
                body: JSON.stringify(dados)
            });

            if (res.ok) {
                alert(`Pedido de férias ${modoEdicaoFerias ? "editado" : "submetido"} com sucesso para aprovação.`);
                setMostrarFormularioFerias(false);
                setNovaFaltaFerias({
                    dataInicio: '',
                    dataFim: '',
                    Horas: false,
                    Tempo: 1,
                    Observacoes: ''
                });
                setModoEdicaoFerias(false);
                setFeriasOriginal(null);

                setDiaSelecionado(null);
                setDetalhes([]);
                setFaltasDoDia([]);
                setPedidosPendentesDoDia([]);
                setRegistosBrutos([]);

                await Promise.all([
                    carregarFaltasFuncionario(),
                    carregarDiasPendentes(),
                    carregarResumo()
                ]);
            } else {
                const erro = await res.text();
                alert("Erro ao submeter férias: " + erro);
            }
        } catch (err) {
            console.error("Erro ao submeter férias:", err);
            alert("Erro inesperado.");
        }
    };

    const solicitarCancelamentoFalta = async (faltaObj) => {
        const token = secureStorage.getItem('loginToken');
        const funcionario = secureStorage.getItem('codFuncionario');
        const empresaId = secureStorage.getItem('empresa_id');

        const dataISO = toLocalISODate(faltaObj.Data);
        const codigoFalta = faltaObj.Falta;

        const justificacao = window.prompt(
            `Justificação para cancelar a falta ${codigoFalta} em ${dataISO}:`,
            ''
        ) || '';

        try {
            const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    urlempresa: secureStorage.getItem('empresa_id')
                },
                body: JSON.stringify({
                    tipoPedido: 'FALTA',
                    operacao: 'CANCELAR',
                    funcionario,
                    empresaId: empresaId,
                    dataPedido: dataISO,
                    falta: codigoFalta,
                    horas: Number(faltaObj.Horas) ? 1 : 0,
                    tempo: Number(faltaObj.Tempo) || 1,
                    justificacao,
                    observacoes: '',
                    usuarioCriador: funcionario,
                    origem: 'LINK'
                })
            });

            if (!res.ok) {
                const msg = await res.text();
                alert('Erro ao submeter cancelamento: ' + msg);
                return;
            }

            alert('Pedido de cancelamento de falta submetido para aprovação.');

            const novoPedidoCancelamento = {
                id: Date.now(),
                tipoPedido: 'FALTA',
                operacao: 'CANCELAR',
                funcionario,
                dataPedido: dataISO,
                falta: codigoFalta,
                horas: Number(faltaObj.Horas) ? 1 : 0,
                tempo: Number(faltaObj.Tempo) || 1,
                justificacao,
                estadoAprovacao: 'Pendente'
            };

            setFaltasPendentes(prev => [...prev, novoPedidoCancelamento]);

            const novasFaltas = faltas.filter(f => {
                const dataFalta = toLocalISODate(f.Data);
                return !(dataFalta === dataISO && f.Falta === codigoFalta);
            });
            setFaltas(novasFaltas);

            const novasFaltasDoDia = faltasDoDia.filter(f => f.Falta !== codigoFalta);
            setFaltasDoDia(novasFaltasDoDia);

            const novosDiasPendentes = [...diasPendentes];
            if (!novosDiasPendentes.includes(dataISO)) {
                novosDiasPendentes.push(dataISO);
                setDiasPendentes(novosDiasPendentes);
            }

            if (diaSelecionado === dataISO) {
                setPedidosPendentesDoDia(prev => [...prev, novoPedidoCancelamento]);
            }

            setMesAtual(new Date(mesAtual));

            await Promise.all([
                carregarFaltasFuncionario(),
                carregarFaltasPendentes(),
                carregarDiasPendentes(),
                carregarDetalhes(diaSelecionado),
                carregarResumo()
            ]);

        } catch (err) {
            console.error('Erro ao pedir cancelamento de falta:', err);
            alert('Erro inesperado ao pedir cancelamento.');
        }
    };

    const cancelarPedido = async (pedido) => {
        let mensagemConfirmacao = 'Tens a certeza que queres cancelar este pedido?';

        if (pedido.tipoPedido === 'FERIAS' && pedido.dataInicio && pedido.dataFim) {
            mensagemConfirmacao = `Vais eliminar um pedido de férias de ${pedido.dataInicio} até ${pedido.dataFim}. Confirmas?`;
        }

        const confirmar = window.confirm(mensagemConfirmacao);
        if (!confirmar) return;

        const token = secureStorage.getItem('loginToken');

        try {
            const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${pedido.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    urlempresa: secureStorage.getItem('empresa_id')
                }
            });

            if (res.ok) {
                alert('Pedido cancelado com sucesso.');

                setDiaSelecionado(null);
                setDetalhes([]);
                setFaltasDoDia([]);
                setPedidosPendentesDoDia([]);
                setRegistosBrutos([]);

                setFaltasPendentes(prev => prev.filter(p => p.id !== pedido.id));

                setDiasPendentes(prev => {
                    const diasPendentesSet = new Set(prev);
                    if (pedido.tipoPedido === 'FERIAS' && pedido.dataInicio && pedido.dataFim) {
                        const inicio = new Date(pedido.dataInicio);
                        const fim = new Date(pedido.dataFim);
                        let dataAtual = new Date(inicio);
                        while (dataAtual <= fim) {
                            const iso = dataAtual.toISOString().split('T')[0];
                            diasPendentesSet.delete(iso);
                            dataAtual.setDate(dataAtual.getDate() + 1);
                        }
                    } else if (pedido.dataPedido) {
                        const data = new Date(pedido.dataPedido).toISOString().split('T')[0];
                        diasPendentesSet.delete(data);
                    }
                    return Array.from(diasPendentesSet);
                });

                await Promise.all([
                    carregarFaltasFuncionario(),
                    carregarFaltasPendentes(),
                    carregarDiasPendentes(),
                    carregarResumo()
                ]);
            } else {
                const erro = await res.text();
                alert('Erro ao cancelar pedido: ' + erro);
            }
        } catch (err) {
            console.error('Erro ao cancelar pedido:', err);
            alert('Erro inesperado ao cancelar pedido.');
        }
    };

    const cancelarPonto = async (registoId) => {
        const confirmar = window.confirm('Tens a certeza que queres cancelar este ponto pendente?');

        if (!confirmar) return;

        const token = secureStorage.getItem('loginToken');

        try {
            const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/cancelar/${registoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    urlempresa: secureStorage.getItem('empresa_id')
                }
            });

            if (res.ok) {
                alert('Registo de ponto cancelado com sucesso.');

                setRegistosBrutos(prev => prev.filter(r => r.id !== registoId));

                const registosAtualizados = registosBrutos.filter(r => r.id !== registoId);
                const ordenado = registosAtualizados.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                const temposPorObra = {};
                const estadoAtual = {};

                ordenado.forEach((r) => {
                    const obraId = r.obra_id;
                    const nomeObra = r.Obra?.nome || 'Sem nome';
                    const ts = new Date(r.timestamp);
                    if (!temposPorObra[obraId]) temposPorObra[obraId] = { nome: nomeObra, totalMinutos: 0 };
                    if (r.tipo === 'entrada') estadoAtual[obraId] = ts;
                    if (r.tipo === 'saida' && estadoAtual[obraId]) {
                        const minutos = Math.max(0, (ts - estadoAtual[obraId]) / 60000);
                        temposPorObra[obraId].totalMinutos += minutos;
                        estadoAtual[obraId] = null;
                    }
                });

                const hoje = formatarData(new Date());
                if (diaSelecionado === hoje) {
                    Object.entries(estadoAtual).forEach(([obraId, entradaTS]) => {
                        if (entradaTS) {
                            const minutos = Math.max(0, (new Date() - entradaTS) / 60000);
                            temposPorObra[obraId].totalMinutos += minutos;
                        }
                    });
                }

                const detalhesPorObra = Object.values(temposPorObra).map(o => ({
                    nome: o.nome,
                    horas: Math.floor(o.totalMinutos / 60),
                    minutos: Math.round(o.totalMinutos % 60),
                }));

                setDetalhes(detalhesPorObra);

                await Promise.all([
                    carregarResumo(),
                    carregarDetalhes(diaSelecionado)
                ]);
            } else {
                const erro = await res.text();
                alert('Erro ao cancelar registo: ' + erro);
            }
        } catch (err) {
            console.error('Erro ao cancelar registo:', err);
            alert('Erro inesperado ao cancelar registo.');
        }
    };

    const carregarTudoEmParalelo = async (diaISO) => {
        const loginToken = secureStorage.getItem('loginToken');
        const painelAdminToken = secureStorage.getItem('painelAdminToken');
        const urlempresa = secureStorage.getItem('urlempresa');
        const funcionarioId = secureStorage.getItem('codFuncionario');

        const ano = mesAtual.getFullYear();
        const mes = String(mesAtual.getMonth() + 1).padStart(2, '0');

        const results = await Promise.allSettled([
            safeJson(fetchJSONWithRetry(`https://backend.advir.pt/api/registo-ponto-obra/resumo-mensal?ano=${ano}&mes=${mes}`, {
                headers: { Authorization: `Bearer ${loginToken}` },
            })),
            safeJson(fetchJSONWithRetry(`https://backend.advir.pt/api/obra/por-empresa?empresa_id=${secureStorage.getItem('empresa_id')}`, {
                headers: { Authorization: `Bearer ${loginToken}` },
            })),
            safeJson(fetchJSONWithRetry(`https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionario/${funcionarioId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${painelAdminToken}`, urlempresa },
            })),
            safeJson(fetchJSONWithRetry(`https://webapiprimavera.advir.pt/routesFaltas/GetListaTipoFaltas`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${painelAdminToken}`, urlempresa },
            })),
            safeJson(fetchJSONWithRetry(`https://webapiprimavera.advir.pt/routesFaltas/GetHorarioFuncionario/${funcionarioId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${painelAdminToken}`, urlempresa },
            })),
            safeJson(fetchJSONWithRetry(`https://webapiprimavera.advir.pt/routesFaltas/GetHorariosTrabalho`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${painelAdminToken}`, urlempresa },
            })),
            safeJson(fetchJSONWithRetry(`https://webapiprimavera.advir.pt/routesFaltas/GetTotalizadorFeriasFuncionario/${funcionarioId}`, {
                headers: { Authorization: `Bearer ${painelAdminToken}`, urlempresa, 'Content-Type': 'application/json' },
            })),
            safeJson(fetchJSONWithRetry(`https://backend.advir.pt/api/faltas-ferias/aprovacao/pendentes`, {
                headers: { Authorization: `Bearer ${loginToken}`, urlempresa: secureStorage.getItem('empresa_id'), 'Content-Type': 'application/json' },
            })),
            safeJson(fetchJSONWithRetry(`https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${diaISO}`, {
                headers: { Authorization: `Bearer ${loginToken}` },
            })),
        ]);

        const get = (idx, def = null) => {
            const r = results[idx];
            if (r.status !== 'fulfilled' || !r.value?.ok) return def;
            return r.value.v ?? def;
        };

        const resumoMensal = get(0, []);
        const listaObras = get(1, []);
        const faltasFuncData = get(2, null);
        const tiposFaltaData = get(3, null);
        const horarioFuncData = get(4, null);
        const horariosData = get(5, null);
        const totalizadorFeriasData = get(6, null);
        const pendentesAprovacao = get(7, []);
        const registosDia = get(8, []);

        results.forEach((r, i) => {
            if (r.status !== 'fulfilled' || !r.value?.ok) {
                console.warn('Falha no bootstrap item', i, r);
            }
        });

        const faltasLista = faltasFuncData?.DataSet?.Table ?? [];
        const tiposFaltaLista = tiposFaltaData?.DataSet?.Table ?? [];
        const horarioFunc = horarioFuncData?.DataSet?.Table?.[0] ?? null;
        const horariosLista = horariosData?.DataSet?.Table ?? [];
        const totalFerias = totalizadorFeriasData?.DataSet?.Table?.[0] ?? null;

        const mapa = Object.fromEntries(tiposFaltaLista.map(f => [f.Falta, f.Descricao]));

        const faltasNoDiaBootstrap = faltasLista.filter(f => {
            const d = new Date(f.Data);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return iso === diaISO;
        });

        const pendDoFuncionario = (pendentesAprovacao || []).filter(p => p.funcionario === funcionarioId);
        const diasPendSet = new Set();
        pendDoFuncionario.forEach(p => {
            if (p.tipoPedido === 'FERIAS' && p.dataInicio && p.dataFim) {
                const inicio = new Date(p.dataInicio), fim = new Date(p.dataFim);
                const d = new Date(inicio);
                while (d <= fim) {
                    diasPendSet.add(formatISO(d));
                    d.setDate(d.getDate() + 1);
                }
            } else if (p.dataPedido) {
                diasPendSet.add(formatISO(p.dataPedido));
            }
        });
        const diasPendArr = Array.from(diasPendSet);

        const hojeISO = formatISO(new Date());
        const registosHoje = diaISO === hojeISO ? registosDia : [];
        const resumoMap = {};
        resumoMensal.forEach((dia) => {
            let minutosTotais = dia.horas * 60 + dia.minutos;
            if (dia.dia === hojeISO && registosHoje.length) {
                const entradasAtivas = registosHoje
                    .filter(r => r.tipo === 'entrada')
                    .filter(e => {
                        const entradaTS = new Date(e.timestamp);
                        const temSaida = registosHoje.some(s =>
                            s.tipo === 'saida' &&
                            s.obra_id === e.obra_id &&
                            new Date(s.timestamp) > entradaTS
                        );
                        return !temSaida;
                    });
                entradasAtivas.forEach(e => {
                    const entradaTS = new Date(e.timestamp);
                    minutosTotais += Math.floor((Date.now() - entradaTS.getTime()) / 60000);
                });
            }
            const h = Math.floor(minutosTotais / 60);
            const m = minutosTotais % 60;
            resumoMap[dia.dia] = `${h}h${m > 0 ? ` ${m}min` : ''}`;
        });

        const ordenado = [...registosDia].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const temposPorObra = {};
        const estadoAtual = {};
        ordenado.forEach((r) => {
            const obraId = r.obra_id;
            const nomeObra = r.Obra?.nome || 'Sem nome';
            const ts = new Date(r.timestamp);
            if (!temposPorObra[obraId]) temposPorObra[obraId] = { nome: nomeObra, totalMinutos: 0 };
            if (r.tipo === 'entrada') estadoAtual[obraId] = ts;
            if (r.tipo === 'saida' && estadoAtual[obraId]) {
                const minutos = Math.max(0, (ts - estadoAtual[obraId]) / 60000);
                temposPorObra[obraId].totalMinutos += minutos;
                estadoAtual[obraId] = null;
            }
        });

        if (diaISO === hojeISO) {
            Object.entries(estadoAtual).forEach(([obraId, entradaTS]) => {
                if (entradaTS) {
                    const minutos = Math.max(0, (new Date() - entradaTS) / 60000);
                    temposPorObra[obraId].totalMinutos += minutos;
                }
            });
        }
        const detalhesPorObra = Object.values(temposPorObra).map(o => ({
            nome: o.nome,
            horas: Math.floor(o.totalMinutos / 60),
            minutos: Math.round(o.totalMinutos % 60),
        }));

        const pendentesDoDia = pendDoFuncionario.filter(p => {
            const dataSel = new Date(diaISO); dataSel.setHours(0, 0, 0, 0);
            if (p.tipoPedido === 'FALTA' && p.dataPedido) {
                const d = new Date(p.dataPedido); d.setHours(0, 0, 0, 0);
                return p.estadoAprovacao === 'Pendente' && d.getTime() === dataSel.getTime();
            }
            if (p.tipoPedido === 'FERIAS' && p.dataInicio && p.dataFim) {
                const i = new Date(p.dataInicio), f = new Date(p.dataFim);
                i.setHours(0, 0, 0, 0); f.setHours(0, 0, 0, 0);
                return p.estadoAprovacao === 'Pendente' && dataSel >= i && dataSel <= f;
            }
            return false;
        });

        setResumo(resumoMap);
        setObras(listaObras);
        setFaltas(faltasLista);
        setTiposFalta(tiposFaltaLista);
        setMapaFaltas(mapa);
        setHorarioFuncionario(horarioFunc);
        setHorariosTrabalho(horariosLista);
        setFeriasTotalizador(totalFerias);
        setFaltasPendentes(pendentesAprovacao || []);
        setDiasPendentes(diasPendArr);
        setDiaSelecionado(diaISO);
        setRegistosBrutos(registosDia);
        setDetalhes(detalhesPorObra);
        setPedidosPendentesDoDia(pendentesDoDia);
        setFaltasDoDia(faltasNoDiaBootstrap);
    };

    const solicitarCancelamentoFeria = async (dataFeria) => {
        const token = secureStorage.getItem('loginToken');
        const funcionario = secureStorage.getItem('codFuncionario');
        const empresaId = secureStorage.getItem('empresa_id');

        const dataISO = toLocalISODate(dataFeria);
        const dataCompleta = new Date(dataISO + 'T00:00:00.000Z').toISOString();

        const justificacao = window.prompt(`Justificação para cancelar a férias de ${dataISO}:`, '') || '';

        try {
            const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    urlempresa: secureStorage.getItem('empresa_id')
                },
                body: JSON.stringify({
                    tipoPedido: 'FERIAS',
                    operacao: 'CANCELAR',
                    funcionario,
                    empresaId: empresaId,
                    dataPedido: dataCompleta,
                    dataInicio: dataCompleta,
                    dataFim: dataCompleta,
                    horas: 0,
                    tempo: 1,
                    justificacao,
                    observacoes: '',
                    usuarioCriador: funcionario,
                    origem: 'LINK'
                })
            });

            if (!res.ok) {
                const msg = await res.text();
                alert('Erro ao submeter cancelamento: ' + msg);
                return;
            }

            alert('Pedido de cancelamento de férias submetido para aprovação.');

            const novoPedidoCancelamento = {
                id: Date.now(),
                tipoPedido: 'FERIAS',
                operacao: 'CANCELAR',
                funcionario,
                dataPedido: dataISO,
                dataInicio: dataISO,
                dataFim: dataISO,
                horas: 0,
                tempo: 1,
                justificacao,
                estadoAprovacao: 'Pendente'
            };

            setFaltasPendentes(prev => [...prev, novoPedidoCancelamento]);

            const novosDiasPendentes = [...diasPendentes];
            if (!novosDiasPendentes.includes(dataISO)) {
                novosDiasPendentes.push(dataISO);
                setDiasPendentes(novosDiasPendentes);
            }

            if (diaSelecionado === dataISO) {
                setPedidosPendentesDoDia(prev => [...prev, novoPedidoCancelamento]);
            }

            await Promise.all([
                carregarFaltasFuncionario(),
                carregarFaltasPendentes(),
                carregarDiasPendentes(),
                carregarDetalhes(diaSelecionado),
                carregarResumo()
            ]);

            setMesAtual(new Date(mesAtual));

        } catch (err) {
            console.error('Erro ao pedir cancelamento de férias:', err);
            alert('Erro inesperado ao pedir cancelamento.');
        }
    };

    const atualizar = async () => {
        const hoje = formatarData(new Date());
        if (diaSelecionado === hoje) {
            await carregarResumo();
            await carregarDetalhes(hoje);
        }
    };

    useEffect(() => {
        const intervalo = setInterval(atualizar, 60 * 1000);
        return () => clearInterval(intervalo);
    }, [diaSelecionado]);

    useEffect(() => {
        if (horarioFuncionario && horariosTrabalho.length > 0) {
            const detalhes = horariosTrabalho.find(h => h.Horario === horarioFuncionario.Horario);
            setDetalhesHorario(detalhes);
        }
    }, [horarioFuncionario, horariosTrabalho]);

    const formatarData = (date) => {
        const ano = date.getFullYear();
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const dia = String(date.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    };

    const carregarResumo = async () => {
        const token = secureStorage.getItem('loginToken');
        const ano = mesAtual.getFullYear();
        const mes = String(mesAtual.getMonth() + 1).padStart(2, '0');

        try {
            setLoading(true);
            const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/resumo-mensal?ano=${ano}&mes=${mes}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const dados = await res.json();
            const mapeado = {};
            const hoje = formatarData(new Date());

            dados.forEach(dia => {
                let minutosTotais = dia.horas * 60 + dia.minutos;

                if (dia.dia === hoje) {
                    const entradaSemSaida = registosBrutos
                        .filter(r => r.tipo === 'entrada' && formatarData(new Date(r.timestamp)) === hoje)
                        .some(e => {
                            const entradaTS = new Date(e.timestamp);
                            const temSaida = registosBrutos.some(s =>
                                s.tipo === 'saida' &&
                                s.obra_id === e.obra_id &&
                                new Date(s.timestamp) > entradaTS
                            );
                            return !temSaida;
                        });

                    if (entradaSemSaida) {
                        const entradasAtivas = registosBrutos
                            .filter(r => r.tipo === 'entrada' && formatarData(new Date(r.timestamp)) === hoje)
                            .filter(e => {
                                const entradaTS = new Date(e.timestamp);
                                const temSaida = registosBrutos.some(s =>
                                    s.tipo === 'saida' &&
                                    s.obra_id === e.obra_id &&
                                    new Date(s.timestamp) > entradaTS
                                );
                                return !temSaida;
                            });

                        entradasAtivas.forEach(entrada => {
                            const entradaTS = new Date(entrada.timestamp);
                            const minutosDesdeEntrada = Math.floor((Date.now() - entradaTS.getTime()) / 60000);
                            minutosTotais += minutosDesdeEntrada;
                        });
                    }
                }

                const horas = Math.floor(minutosTotais / 60);
                const minutos = minutosTotais % 60;
                mapeado[dia.dia] = `${horas}h${minutos > 0 ? ` ${minutos}min` : ''}`;
            });

            setResumo(mapeado);

        } catch (err) {
            console.error('Erro ao carregar resumo mensal:', err);
            alert('Erro ao carregar resumo mensal');
        } finally {
            setLoading(false);
        }
    };

    const carregarObras = async () => {
        const token = secureStorage.getItem('loginToken');
        const empresaId = secureStorage.getItem('empresa_id');

        if (!empresaId) {
            console.error('ID da empresa não encontrado');
            return;
        }

        try {
            const res = await fetch(`https://backend.advir.pt/api/obra/por-empresa?empresa_id=${empresaId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dados = await res.json();
            setObras(dados);
        } catch (err) {
            console.error('Erro ao carregar obras:', err);
        }
    };

    // Função para abrir o modal e definir a obra selecionada
    const abrirModalDividirHoras = (obra) => {
        setObraSelecionadaParaDividir(obra);
        const totalMinutos = obra.horas * 60 + obra.minutos;
        setHorasParaDividir(obra.horas);
        setMinutosParaDividir(obra.minutos);
        setDivisoes([]); // Limpa divisões anteriores
        setObrasDestino(obras); // Todas as obras disponíveis, incluindo a original
        setMostrarModalDividirHoras(true);
    };

    // Função para fechar o modal
    const fecharModalDividirHoras = () => {
        setMostrarModalDividirHoras(false);
        setObraSelecionadaParaDividir(null);
        setHorasParaDividir(0);
        setMinutosParaDividir(0);
        setDivisoes([]);
        setObrasDestino([]);
    };

    // Função para adicionar uma nova divisão
    const adicionarDivisao = () => {
        setDivisoes([...divisoes, { obra_id: '', horas: 0, minutos: 0 }]);
    };

    // Função para remover uma divisão
    const removerDivisao = (index) => {
        setDivisoes(divisoes.filter((_, i) => i !== index));
    };

    // Função para atualizar uma divisão
    const atualizarDivisao = (index, campo, valor) => {
        const novasDivisoes = [...divisoes];
        novasDivisoes[index][campo] = valor;
        setDivisoes(novasDivisoes);
    };

    // Lógica para reconstruir as picagens
    const reconstruirPicagens = async () => {
        if (!obraSelecionadaParaDividir || !diaSelecionado) {
            alert('Erro: Obra ou dia não selecionado.');
            return;
        }

        // Validar se todas as divisões têm obra selecionada
        const divisoesInvalidas = divisoes.filter(d => !d.obra_id);
        if (divisoesInvalidas.length > 0) {
            alert('Por favor, selecione uma obra para todas as divisões.');
            return;
        }

        const horasTotaisParaDividir = horasParaDividir * 60 + minutosParaDividir;
        const totalMinutosDivididos = divisoes.reduce((acc, div) => acc + (div.horas * 60 + div.minutos), 0);

        // Verificar se a soma corresponde (com tolerância de 1 minuto para arredondamentos)
        if (Math.abs(horasTotaisParaDividir - totalMinutosDivididos) > 1) {
            alert(`A soma das horas divididas (${Math.floor(totalMinutosDivididos / 60)}h ${totalMinutosDivididos % 60}min) deve ser igual às horas totais da obra selecionada (${horasParaDividir}h ${minutosParaDividir}min).`);
            return;
        }

        const token = secureStorage.getItem('loginToken');

        try {
            setLoading(true);

            const res = await fetch('https://backend.advir.pt/api/dividir-horas-obra/dividir', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    urlempresa: secureStorage.getItem('empresa_id')
                },
                body: JSON.stringify({
                    dia: diaSelecionado,
                    obraOrigemId: obraSelecionadaParaDividir.id,
                    divisoes: divisoes.map(d => ({
                        obra_id: parseInt(d.obra_id),
                        horas: parseInt(d.horas),
                        minutos: parseInt(d.minutos)
                    }))
                })
            });

            if (res.ok) {
                const resultado = await res.json();
                alert(`Horas divididas com sucesso!\n\n${resultado.totalRegistosOrigemEliminados} registos eliminados.\n${resultado.totalNovasEntradas} novos registos criados.`);
                
                fecharModalDividirHoras();
                
                // Recarregar dados
                await Promise.all([
                    carregarResumo(),
                    carregarDetalhes(diaSelecionado)
                ]);
            } else {
                const error = await res.json();
                alert('Erro ao dividir horas: ' + (error.message || 'Erro desconhecido'));
            }
        } catch (err) {
            console.error('Erro ao dividir horas:', err);
            alert('Erro inesperado ao dividir horas: ' + err.message);
        } finally {
            setLoading(false);
        }
    };


    const carregarDetalhes = useCallback(async (data) => {
        setDiaSelecionado(data);
        const faltasNoDia = faltas.filter(f => {
            const dataFalta = new Date(f.Data);
            return (
                dataFalta.getFullYear() === new Date(data).getFullYear() &&
                dataFalta.getMonth() === new Date(data).getMonth() &&
                dataFalta.getDate() === new Date(data).getDate()
            );
        });
        setFaltasDoDia(faltasNoDia);

        const funcionarioId = secureStorage.getItem('codFuncionario');

        const pedidosPendentesDoDia = faltasPendentes.filter(p => {
            const dataSelecionada = new Date(data);
            dataSelecionada.setHours(0, 0, 0, 0);

            const isDoFuncionario = p.funcionario === funcionarioId;
            const isFalta = p.tipoPedido === 'FALTA' && p.dataPedido;
            const isFerias = p.tipoPedido === 'FERIAS' && p.dataInicio && p.dataFim;

            let coincide = false;

            if (isFalta) {
                const dataPedido = new Date(p.dataPedido);
                dataPedido.setHours(0, 0, 0, 0);
                coincide = dataPedido.getTime() === dataSelecionada.getTime();
            }

            if (isFerias) {
                const inicio = new Date(p.dataInicio);
                const fim = new Date(p.dataFim);
                inicio.setHours(0, 0, 0, 0);
                fim.setHours(0, 0, 0, 0);
                coincide = dataSelecionada >= inicio && dataSelecionada <= fim;
            }

            return isDoFuncionario && p.estadoAprovacao === 'Pendente' && coincide;
        });

        setPedidosPendentesDoDia(pedidosPendentesDoDia);
        //console.log('Pedidos pendentes do dia:', pedidosPendentesDoDia);

        const token = secureStorage.getItem('loginToken');
        try {
            setLoading(true);
            const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${data}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const dados = await res.json();
                setRegistosBrutos(dados);
                const ordenado = dados.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                const temposPorObra = {};
                const estadoAtualPorObra = {};

                for (const registo of ordenado) {
                    const obraId = registo.obra_id;
                    const nomeObra = registo.Obra?.nome || 'Sem nome';
                    const ts = new Date(registo.timestamp);

                    if (!temposPorObra[obraId]) {
                        temposPorObra[obraId] = { nome: nomeObra, totalMinutos: 0, id: obraId }; // Adiciona o ID da obra
                    }

                    if (registo.tipo === 'entrada') {
                        estadoAtualPorObra[obraId] = ts;
                    }

                    if (registo.tipo === 'saida' && estadoAtualPorObra[obraId]) {
                        const entradaTS = estadoAtualPorObra[obraId];
                        const minutos = Math.max(0, (ts - entradaTS) / 60000);
                        temposPorObra[obraId].totalMinutos += minutos;
                        estadoAtualPorObra[obraId] = null;
                    }

                    // Considera o tempo ativo se ainda houver uma entrada e for hoje
                    if (estadoAtualPorObra[obraId] && formatarData(ts) === formatarData(new Date())) {
                        const agora = new Date();
                        const minutos = Math.max(0, (agora - estadoAtualPorObra[obraId]) / 60000);
                        temposPorObra[obraId].totalMinutos += minutos;
                    }
                }

                const detalhesPorObra = Object.values(temposPorObra).map(o => ({
                    nome: o.nome,
                    horas: Math.floor(o.totalMinutos / 60),
                    minutos: Math.round(o.totalMinutos % 60),
                    id: o.id // Passa o ID da obra para o estado
                }));

                setDetalhes(detalhesPorObra);
            }
        } catch (err) {
            console.error('Erro ao carregar detalhes do dia:', err);
        } finally {
            setLoading(false);
        }
    }, [faltas, faltasPendentes]);

    const submeterPontoEsquecido = async (e) => {
        e.preventDefault();
        if (!novaEntrada.obra_id || !diaSelecionado) {
            alert('Selecione um local antes de submeter');
            return;
        }
        const [ano, mes, dia] = diaSelecionado.split('-');
        const [hora, minuto] = novaEntrada.hora.split(':');
        const dataLocal = new Date(ano, mes - 1, dia, hora, minuto);
        const token = secureStorage.getItem('loginToken');
        try {
            setLoading(true);
            const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/registar-esquecido`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...novaEntrada,
                    timestamp: dataLocal.toISOString()
                })
            });

            if (res.ok) {
                alert('Ponto registado para aprovação');
                carregarResumo();
                carregarDetalhes(diaSelecionado);
                setNovaEntrada({ tipo: 'entrada', obra_id: '', hora: '08:00', justificacao: '' });
            } else {
                alert('Erro ao registar ponto');
            }
        } catch (err) {
            console.error('Erro ao submeter ponto esquecido:', err);
            alert('Erro ao submeter ponto esquecido');
        } finally {
            setLoading(false);
        }
    };

    const gerarCalendario = () => {
        const ano = mesAtual.getFullYear();
        const mes = mesAtual.getMonth();
        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);
        const diasDoMes = [];

        const diaSemanaInicio = primeiroDia.getDay();
        for (let i = 0; i < diaSemanaInicio; i++) {
            diasDoMes.push(null);
        }

        for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
            diasDoMes.push(new Date(ano, mes, dia));
        }

        return diasDoMes;
    };

    const iniciarEdicaoRegisto = (registo) => {
        const data = new Date(registo.timestamp);
        setNovaHoraEdicao(data.toTimeString().slice(0, 5));
        setJustificacaoAlteracao(registo.justificacao || '');
        setRegistoEmEdicao(registo);
    };

    const submeterAlteracaoHora = async () => {
        if (!registoEmEdicao || !novaHoraEdicao) return;
        if (!justificacaoAlteracao.trim()) {
            alert('Indica uma justificação para a alteração.');
            return;
        }

        const [ano, mes, dia] = registoEmEdicao.timestamp.split('T')[0].split('-');
        const [hora, minuto] = novaHoraEdicao.split(':');
        const novaData = new Date(ano, mes - 1, dia, hora, minuto);

        const token = secureStorage.getItem('loginToken');

        try {
            const resDel = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/cancelar/${registoEmEdicao.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                }
            });

            if (!resDel.ok) {
                const erro = await resDel.text();
                alert("Erro ao eliminar o registo anterior: " + erro);
                return;
            }

            const body = {
                tipo: registoEmEdicao.tipo,
                obra_id: registoEmEdicao.obra_id,
                timestamp: novaData.toISOString(),
                justificacao: justificacaoAlteracao.trim(),
            };

            const resAdd = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/registar-esquecido`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (resAdd.ok) {
                alert('Alteração de ponto submetida com sucesso.');
                setRegistoEmEdicao(null);
                await carregarResumo();
                await carregarDetalhes(diaSelecionado);
            } else {
                const erro = await resAdd.text();
                alert('Erro ao submeter novo ponto: ' + erro);
            }

        } catch (err) {
            console.error('Erro na alteração de ponto:', err);
            alert('Erro inesperado na alteração de ponto.');
        }
    };

    const obterClasseDia = (date) => {
        if (!date) return '';

        const hoje = new Date();
        const dataFormatada = formatarData(date);
        const isHoje = formatarData(hoje) === dataFormatada;
        const isPassado = date < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const temRegisto = resumo[dataFormatada];
        const diaSemana = date.getDay();
        const isDiaUtil = diaSemana !== 0 && diaSemana !== 6;
        const isSelecionado = diaSelecionado === dataFormatada;
        const isPendente = diasPendentes.includes(dataFormatada);

        // NOVO: feriado
        const isFeriado = feriadosSet.has(dataFormatada);

        const existeFalta = Array.isArray(faltas) && faltas.some(f => {
            const dataFalta = new Date(f.Data);
            return (
                dataFalta.getFullYear() === date.getFullYear() &&
                dataFalta.getMonth() === date.getMonth() &&
                dataFalta.getDate() === date.getDate()
            );
        });

        let classes = 'calendario-dia btn';

        // NOVO: prioridade ao feriado (fica laranja)
        if (isFeriado) {
            classes += ' dia-feriado';
            // se também estiver selecionado, mantém o realce visual subtil
            if (isSelecionado) classes += ' border-2';
            return classes;
        }

        if (isSelecionado) classes += ' btn-primary';
        else if (existeFalta) classes += ' dia-falta';
        else if (isHoje) classes += ' btn-outline-primary';
        else if (isPendente) classes += ' dia-pendente';
        else if (temRegisto) {
            const horasStr = resumo[dataFormatada]?.split('h')[0];
            const horasTrabalhadas = parseInt(horasStr, 10);
            if (horasTrabalhadas >= 8) {
                classes += ' btn-success';
            } else {
                classes += ' btn-menor-8h';
            }
        } else classes += ' btn-outline-secondary';

        return classes;
    };


    useEffect(() => {
        const boot = async () => {
            setLoading(true);
            try {
                const hojeISO = formatarData(new Date());
                await carregarTudoEmParalelo(hojeISO);
            } catch (e) {
                console.error('Erro no bootstrap:', e);
                alert('Erro ao carregar dados iniciais.');
            } finally {
                setLoading(false);
            }
        };
        boot();
    }, [mesAtual]);

    const diasDoMes = gerarCalendario();

    return (
        <div className="container-fluid bg-light min-vh-100 py-2 py-md-4" style={{ overflowX: 'hidden', background: 'linear-gradient(to bottom, #e3f2fd, #bbdefb, #90caf9)' }}>
            <style jsx>{`
                body {
                    overflow-x: hidden;
                }
                .calendario-dia {
                    width: 100%;
                    height: 60px;
                    margin: 1px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                    border-radius: 8px !important;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }
                    /* NOVO: feriado a laranja */
                .dia-feriado {
                    background-color: #ffcc80 !important;   /* laranja suave */
                    border: 1px solid #ffa726 !important;   /* laranja mais forte */
                    color: #5d4037 !important;              /* castanho suave para legibilidade */
                    position: relative;
                }

                .dia-falta {
                    position: relative;
                    background-image: repeating-linear-gradient(
                        45deg,
                        #dee2e6 0,
                        #dee2e6 4px,
                        #f8f9fa 4px,
                        #f8f9fa 8px
                    );
                    color: #6c757d !important;
                    border: 1px solid #ced4da;
                }
                .btn-menor-8h {
                    background-color: #fff3cd !important;
                    border: 1px solid #ffeeba;
                    color: #856404;
                }
                .dia-pendente {
                    background-color: #ffe0b2 !important;
                    color: #8d6e63 !important;
                    border: 1px solid #ffb74d;
                    position: relative;
                }
                @media (min-width: 768px) {
                    .calendario-dia {
                        height: 80px;
                        margin: 2px;
                        font-size: 0.9rem;
                    }
                }
                .calendario-dia:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                }
                .calendario-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 2px;
                    margin-top: 1rem;
                }
                @media (min-width: 768px) {
                    .calendario-grid {
                        gap: 4px;
                    }
                }
                .horas-dia {
                    font-size: 0.65rem;
                    font-weight: bold;
                    margin-top: 2px;
                }
                @media (min-width: 768px) {
                    .horas-dia {
                        font-size: 0.75rem;
                    }
                }
                .card-moderno {
                    border-radius: 15px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    border: none;
                    margin-bottom: 1rem;
                }
                .form-moderno {
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }
                .form-moderno:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
                }
                .btn-responsive {
                    font-size: 0.8rem;
                    padding: 0.4rem 0.8rem;
                }
                @media (min-width: 768px) {
                    .btn-responsive {
                        font-size: 0.875rem;
                        padding: 0.5rem 1rem;
                    }
                }
                .legend-mobile {
                    font-size: 0.75rem;
                }
                @media (min-width: 768px) {
                    .legend-mobile {
                        font-size: 0.875rem;
                    }
                }
                .sidebar-sticky {
                    position: sticky;
                    top: 1rem;
                    max-height: calc(100vh - 2rem);
                    overflow-y: auto;
                }
                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255,255,255,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 15px;
                    z-index: 10;
                }
                .scroll-container {
                    max-height: 100vh;
                    overflow-y: auto;
                    padding-right: 0;
                }
                @media (max-width: 991px) {
                    .sidebar-sticky {
                        position: static;
                        max-height: none;
                        overflow-y: visible;
                    }
                }
                .sidebar-sticky::-webkit-scrollbar {
                    width: 6px;
                }
                .sidebar-sticky::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .sidebar-sticky::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 10px;
                }
                .sidebar-sticky::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
                .custom-scroll::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 10px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
                html {
                    scroll-behavior: smooth;
                }
                @media (max-width: 767px) {
                    .container-fluid {
                        padding-left: 0.75rem;
                        padding-right: 0.75rem;
                    }
                }
            `}</style>

            {/* Modal de Divisão de Horas */}
            {mostrarModalDividirHoras && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog" aria-modal="true">
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '95%', margin: '1rem auto' }}>
                        <div className="modal-content" style={{ borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                            <div className="modal-header bg-primary text-white" style={{ borderRadius: '12px 12px 0 0', padding: '1rem' }}>
                                <h6 className="modal-title mb-0" style={{ fontSize: 'clamp(0.95rem, 3vw, 1.1rem)', fontWeight: '600' }}>
                                    Dividir Horas
                                </h6>
                                <button type="button" className="btn-close btn-close-white" onClick={fecharModalDividirHoras}></button>
                            </div>
                            <div className="modal-body" style={{ padding: 'clamp(0.75rem, 3vw, 1.5rem)' }}>
                                <div className="mb-3 p-2 bg-light rounded" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)' }}>
                                    <div className="fw-bold text-muted mb-1" style={{ fontSize: '0.75rem' }}>Obra Original:</div>
                                    <div className="text-truncate mb-2" style={{ fontSize: '0.85rem' }}>
                                        {obraSelecionadaParaDividir?.nome}
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Total a dividir:</span>
                                        <span className="badge bg-primary" style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                                            {horasParaDividir}h {minutosParaDividir}min
                                        </span>
                                    </div>
                                </div>
                                
                                {divisoes.length > 0 && (() => {
                                    const totalDividido = divisoes.reduce((acc, div) => acc + (div.horas * 60 + div.minutos), 0);
                                    const totalOrigem = horasParaDividir * 60 + minutosParaDividir;
                                    const restante = totalOrigem - totalDividido;
                                    const restanteHoras = Math.floor(Math.abs(restante) / 60);
                                    const restanteMinutos = Math.abs(restante) % 60;
                                    
                                    return (
                                        <div className={`alert ${restante === 0 ? 'alert-success' : restante > 0 ? 'alert-warning' : 'alert-danger'} mb-3`} 
                                             style={{ padding: '0.6rem', fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)', borderRadius: '8px' }}>
                                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <span>
                                                    <strong>Dividido:</strong> {Math.floor(totalDividido / 60)}h {totalDividido % 60}min
                                                </span>
                                                {restante !== 0 ? (
                                                    <span className="badge bg-dark">
                                                        {restante > 0 ? 'Falta' : 'Excede'}: {restanteHoras}h {restanteMinutos}min
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-success">✓ Completo</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="mb-3">
                                    <label className="form-label fw-semibold mb-2" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)' }}>
                                        Divisões por obra:
                                    </label>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                        {divisoes.map((div, index) => (
                                            <div key={index} className="card mb-2" style={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                                                <div className="card-body p-2">
                                                    <div className="mb-2">
                                                        <label className="form-label mb-1" style={{ fontSize: '0.75rem', color: '#666' }}>
                                                            Obra de destino
                                                        </label>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={div.obra_id}
                                                            onChange={(e) => atualizarDivisao(index, 'obra_id', e.target.value)}
                                                            style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', borderRadius: '6px' }}
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {obrasDestino.map(obra => (
                                                                <option key={obra.id} value={obra.id}>
                                                                    {obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="d-flex gap-2 align-items-end">
                                                        <div className="flex-fill">
                                                            <label className="form-label mb-1" style={{ fontSize: '0.7rem', color: '#666' }}>
                                                                Horas
                                                            </label>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                className="form-control form-control-sm text-center"
                                                                placeholder="0"
                                                                value={div.horas || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/\D/g, '');
                                                                    atualizarDivisao(index, 'horas', val === '' ? 0 : parseInt(val));
                                                                }}
                                                                style={{ fontSize: '1rem', fontWeight: '500', borderRadius: '6px', padding: '0.5rem' }}
                                                            />
                                                        </div>
                                                        <div className="flex-fill">
                                                            <label className="form-label mb-1" style={{ fontSize: '0.7rem', color: '#666' }}>
                                                                Minutos
                                                            </label>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                className="form-control form-control-sm text-center"
                                                                placeholder="0"
                                                                value={div.minutos || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/\D/g, '');
                                                                    const num = val === '' ? 0 : parseInt(val);
                                                                    atualizarDivisao(index, 'minutos', Math.min(59, num));
                                                                }}
                                                                style={{ fontSize: '1rem', fontWeight: '500', borderRadius: '6px', padding: '0.5rem' }}
                                                            />
                                                        </div>
                                                        <button 
                                                            className="btn btn-sm btn-outline-danger" 
                                                            onClick={() => removerDivisao(index)}
                                                            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px' }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    className="btn btn-outline-primary w-100 btn-sm" 
                                    onClick={adicionarDivisao}
                                    style={{ borderRadius: '8px', padding: '0.6rem', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)' }}
                                >
                                    <FaPlus size={14} className="me-2" /> Adicionar Divisão
                                </button>
                            </div>
                            <div className="modal-footer" style={{ padding: '0.75rem 1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary flex-fill" 
                                    onClick={fecharModalDividirHoras}
                                    style={{ borderRadius: '8px', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', minWidth: '100px' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary flex-fill" 
                                    onClick={reconstruirPicagens}
                                    style={{ borderRadius: '8px', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', minWidth: '100px' }}
                                >
                                    Reconstruir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="row justify-content-center">
                <div className="col-12 col-xl-11">
                    <div className="card card-moderno mb-3 mb-md-4">
                        <div className="card-body text-center py-3 py-md-4">
                            <h1 className="h4 h3-md mb-2 text-primary">
                                <span className="d-none d-sm-inline">Agenda</span>
                                <span className="d-sm-none">Horas Trabalhadas</span>
                            </h1>
                            <p className="text-muted mb-0 small">Gerencie e visualize suas horas de trabalho</p>
                        </div>
                    </div>

                    <div className="row g-3" style={{ marginBottom: '50px' }} >
                        <div className="col-12 col-lg-8">
                            <div className="card card-moderno position-relative">
                                {loading && (
                                    <div className="loading-overlay">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Carregando...</span>
                                        </div>
                                    </div>
                                )}
                                <div className="card-body p-3 p-md-4">
                                    <div className="d-flex justify-content-between align-items-center mb-3 mb-md-4">
                                        <button
                                            className="btn btn-outline-primary btn-responsive rounded-pill"
                                            onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1))}
                                            disabled={loading}
                                        >
                                            <span className="d-none d-sm-inline">&#8592; Anterior</span>
                                            <span className="d-sm-none">&#8592;</span>
                                        </button>
                                        <h4 className="mb-0 fw-bold text-center px-2" style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
                                            <span className="d-none d-md-inline">
                                                {mesAtual.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                                            </span>
                                            <span className="d-md-none">
                                                {mesAtual.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}
                                            </span>
                                        </h4>
                                        <button
                                            className="btn btn-outline-primary btn-responsive rounded-pill"
                                            onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1))}
                                            disabled={loading}
                                        >
                                            <span className="d-none d-sm-inline">Próximo &#8594;</span>
                                            <span className="d-sm-none">&#8594;</span>
                                        </button>
                                    </div>

                                    <div className="calendario-grid mb-2">
                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
                                            <div key={dia} className="text-center fw-bold text-muted py-1 py-md-2" style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)' }}>
                                                <span className="d-none d-sm-inline">{dia}</span>
                                                <span className="d-sm-none">{dia.substr(0, 1)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="calendario-grid">
                                        {diasDoMes.map((date, index) => {
                                            if (!date) return <button key={index} className="invisible" disabled></button>;

                                            const dataFormatada = formatarData(date);
                                            const isPendente = diasPendentes.includes(dataFormatada);

                                            const isFeriado = feriadosSet.has(dataFormatada);

                                            const existeFaltaF50 = Array.isArray(faltas) && faltas.some(f => {
                                                const dataFalta = new Date(f.Data);
                                                return (
                                                    f.Falta === 'F50' &&
                                                    dataFalta.getFullYear() === date.getFullYear() &&
                                                    dataFalta.getMonth() === date.getMonth() &&
                                                    dataFalta.getDate() === date.getDate()
                                                );
                                            });

                                            return (
                                                <button
                                                    key={index}
                                                    className={obterClasseDia(date)}
                                                    onClick={() => carregarDetalhes(dataFormatada)}
                                                >
                                                    <span>{date.getDate()}</span>

                                                    {isFeriado && (
                                                        <span className="horas-dia" style={{ fontSize: '0.65rem', color: '#5d4037' }}>
                                                            Fe
                                                        </span>
                                                    )}

                                                    {existeFaltaF50 && (
                                                        <span
                                                            style={{
                                                                position: 'absolute',
                                                                top: '4px',
                                                                right: '6px',
                                                                fontSize: '0.8rem'
                                                            }}
                                                            title="Férias"
                                                        >
                                                            🌴
                                                        </span>
                                                    )}
                                                    {isPendente && (
                                                        <span
                                                            style={{
                                                                position: 'absolute',
                                                                bottom: '4px',
                                                                right: '6px',
                                                                fontSize: '0.85rem',
                                                                color: '#f0ad4e'
                                                            }}
                                                            title="Pendente de aprovação"
                                                        >
                                                            ⏳
                                                        </span>
                                                    )}

                                                    {resumo[dataFormatada] && !isFeriado && (
                                                        <span className="horas-dia">
                                                            {resumo[dataFormatada].split('h')[0]}h
                                                        </span>
                                                    )}

                                                    {!resumo[dataFormatada] &&
                                                        !isFeriado &&
                                                        date < new Date() &&
                                                        date.getDay() !== 0 &&
                                                        date.getDay() !== 6 && (
                                                            <FaExclamationTriangle className="text-warning mt-1" size={12} />
                                                        )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-3 mt-md-4">
                                        <div className="row g-1 g-md-2 text-center legend-mobile">
                                            <div className="col-12 col-sm-4">
                                                <small className="text-muted d-flex align-items-center justify-content-center">
                                                    <span className="badge bg-success me-1 me-md-2">●</span>
                                                    <span className="d-none d-sm-inline">Horas registadas</span>
                                                    <span className="d-sm-none">Registado</span>
                                                </small>
                                            </div>
                                            <div className="col-6 col-sm-4">
                                                <small className="text-muted d-flex align-items-center justify-content-center">
                                                    <span className="badge bg-warning me-1 me-md-2">⚠</span>
                                                    <span className="d-none d-sm-inline">Sem registo</span>
                                                    <span className="d-sm-none">Falta</span>
                                                </small>
                                            </div>
                                            <div className="col-6 col-sm-4">
                                                <small className="text-muted d-flex align-items-center justify-content-center">
                                                    <span className="badge bg-primary me-1 me-md-2">●</span>
                                                    <span>Hoje</span>
                                                </small>
                                            </div>
                                            <div className="col-6 col-sm-3">
                                                <small className="text-muted d-flex align-items-center justify-content-center">
                                                    <span className="badge" style={{ backgroundColor: '#ffcc80', color: '#5d4037' }}>■</span>
                                                    <span className="ms-1">Feriado</span>
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-lg-4">
                            {diaSelecionado ? (
                                <div className="card card-moderno sidebar-sticky" style={{ marginBottom: '100px' }}>
                                    <div className="card-body p-3 p-md-4">
                                        {detalhesHorario && feriasTotalizador && (<div></div>
                                            /*
                                             <div className="mb-3">
                                                  <h6 className="fw-bold text-muted mb-2">Horário Contratual & Férias</h6>
                                                  <div className="row g-2">
                                                      <div className="col-12 col-md-6">
                                                          <div className="border-start border-info border-3 ps-3 small">
                                                              <div><strong>Descrição:</strong> {detalhesHorario.Descricao}</div>
                                                              <div><strong>Horas por dia:</strong> {detalhesHorario.Horas1}</div>
                                                              <div><strong>Total Horas Semanais:</strong> {detalhesHorario.TotalHoras}</div>
                                                          </div>
                                                      </div>
                                                      <div className="col-12 col-md-6">
                                                          <div className="border-start border-success border-3 ps-3 small">
                                                              <div><strong>Dias Direito:</strong> {feriasTotalizador.DiasDireito} dias</div>
                                                              <div><strong>Dias Ano Anterior:</strong> {feriasTotalizador.DiasAnoAnterior} dias</div>
                                                              <div><strong>Total Dias:</strong> {feriasTotalizador.TotalDias} dias</div>
                                                              <div><strong>Dias Já Gozados:</strong> {feriasTotalizador.DiasJaGozados} dias</div>
                                                              <div><strong>Total Por Gozar:</strong> {feriasTotalizador.DiasPorGozar} dias</div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>
                                              */
                                        )}

                                        <h5 className="card-title d-flex align-items-center mb-3 mb-md-4" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                                            <FaClock className="text-primary me-2 flex-shrink-0" />
                                            <span className="text-truncate">
                                                <span className="d-none d-md-inline">
                                                    {new Date(diaSelecionado).toLocaleDateString('pt-PT', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                                <span className="d-md-none">
                                                    {new Date(diaSelecionado).toLocaleDateString('pt-PT', {
                                                        day: 'numeric',
                                                        month: 'short'
                                                    })}
                                                </span>
                                            </span>
                                        </h5>

                                        {detalhes.length > 0 && (
                                            <div className="mb-4">
                                                <h6 className="fw-bold text-muted mb-3">Resumo do Dia</h6>

                                                {detalhes.map((entry, index) => (
                                                    <div
                                                        key={index}
                                                        className="border-start border-success border-3 ps-3 mb-3"
                                                        style={{ cursor: podeAcessarDivisaoHoras ? 'pointer' : 'default' }}
                                                        onClick={() => podeAcessarDivisaoHoras && abrirModalDividirHoras(entry)}
                                                        title={podeAcessarDivisaoHoras ? "Clique para dividir horas entre obras" : "Sem permissão para dividir horas"}
                                                    >
                                                        <div className="d-flex justify-content-between">
                                                            <span className="fw-semibold">🛠 {entry.nome}</span>
                                                            <span className="text-success fw-bold">
                                                                {entry.horas}h {entry.minutos > 0 ? `${entry.minutos}min` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                <hr />
                                                <div className="d-flex justify-content-between">
                                                    <span className="fw-bold">Total:</span>
                                                    {(() => {
                                                        const totalMinutos = detalhes.reduce((acc, entry) => acc + (entry.horas * 60 + entry.minutos), 0);
                                                        const totalHoras = Math.floor(totalMinutos / 60);
                                                        const minutosRestantes = totalMinutos % 60;
                                                        return (
                                                            <span className="fw-bold text-primary">
                                                                {totalHoras}h {minutosRestantes > 0 ? `${minutosRestantes}min` : ''}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}

                                        {faltasDoDia.length > 0 && (
                                            <div className="mb-4">
                                                <h6 className="fw-bold text-danger mb-3">Faltas neste dia</h6>
                                                {faltasDoDia.map((f, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`border rounded p-3 mb-3 ${f.Estado === 'pendente' ? 'border-warning bg-warning-subtle' : 'border-danger bg-danger-subtle'
                                                            }`}
                                                    >
                                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                                            <div className="flex-grow-1">
                                                                <div className="fw-bold text-danger mb-1">
                                                                    📌 {f.Falta} – {mapaFaltas[f.Falta] || 'Desconhecido'}
                                                                </div>
                                                                <div className="small text-muted">
                                                                    <span className="me-3">
                                                                        <strong>Tipo:</strong> {f.Horas ? 'Por horas' : 'Dia inteiro'}
                                                                    </span>
                                                                    <span>
                                                                        <strong>Duração:</strong> {f.Tempo} {f.Horas ? 'h' : 'dia(s)'}
                                                                    </span>
                                                                </div>
                                                                {f.Observacoes && (
                                                                    <div className="small text-muted mt-1">
                                                                        <strong>Obs.:</strong> {f.Observacoes}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {(() => {
                                                                const dataISO = toLocalISODate(f.Data);
                                                                const podeCancelar = !isBeforeToday(dataISO);
                                                                if (!podeCancelar) return null;

                                                                const onClick = () => {
                                                                    const msg = f.Falta === 'F50'
                                                                        ? `Queres pedir o cancelamento das férias de ${dataISO}?`
                                                                        : `Queres pedir o cancelamento da falta ${f.Falta} de ${dataISO}?`;

                                                                    if (!window.confirm(msg)) return;

                                                                    if (f.Falta === 'F50') {
                                                                        solicitarCancelamentoFeria(dataISO);
                                                                    } else {
                                                                        solicitarCancelamentoFalta(f);
                                                                    }
                                                                };

                                                                return (
                                                                    <button
                                                                        className="btn btn-sm btn-outline-danger rounded-pill"
                                                                        onClick={onClick}
                                                                        style={{ minWidth: '80px' }}
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {pedidosPendentesDoDia.length > 0 && (
                                            <div className="mb-4">
                                                <h6 className="fw-bold text-warning mb-3">Pedidos Pendentes</h6>
                                                {pedidosPendentesDoDia.map((p, idx) => (
                                                    <div key={idx} className="border-start border-warning border-3 ps-3 mb-2">
                                                        {(() => {
                                                            if (p.estadoAprovacao !== 'Pendente') return null;
                                                            let podeCancelar = true;
                                                            if (p.tipoPedido === 'FALTA' && p.dataPedido) {
                                                                podeCancelar = !isBeforeToday(p.dataPedido);
                                                            } else if (p.tipoPedido === 'FERIAS' && p.dataFim) {
                                                                podeCancelar = !isBeforeToday(p.dataFim);
                                                            }
                                                            if (!podeCancelar) return null;
                                                            return (
                                                                <div className="mt-1 text-end">
                                                                    <button
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        onClick={() => cancelarPedido(p)}
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}

                                                        <div className="d-flex justify-content-between small">
                                                            <span className="fw-semibold">📌 Código:</span>
                                                            <span>
                                                                {p.tipoPedido === 'FERIAS' ? 'FERIAS' : p.falta} – {p.tipoPedido === 'FERIAS'
                                                                    ? 'Férias'
                                                                    : mapaFaltas[p.falta?.toUpperCase()] || 'Desconhecido'}
                                                            </span>
                                                        </div>

                                                        <div className="d-flex justify-content-between small">
                                                            <span>Tipo:</span>
                                                            <span>{p.horas ? 'Por horas' : 'Dia inteiro'}</span>
                                                        </div>

                                                        <div className="d-flex justify-content-between small">
                                                            <span>Duração:</span>
                                                            <span>{p.tempo} {p.horas ? 'h' : 'dia(s)'}</span>
                                                        </div>

                                                        {p.justificacao && (
                                                            <div className="small">
                                                                <strong>Obs.:</strong> {p.justificacao}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div>
                                            <button
                                                className="btn btn-outline-primary w-100 rounded-pill btn-responsive mb-2"
                                                onClick={() => setMostrarFormulario(prev => !prev)}
                                                type="button"
                                            >
                                                {mostrarFormulario ? '- Recolher Registo' : '+ Registar Ponto Esquecido'}
                                            </button>

                                            {mostrarFormulario && (
                                                <div className="border border-primary rounded p-3 mt-2" style={{ backgroundColor: '#f8f9ff' }}>
                                                    <h6 className="text-primary fw-bold mb-3" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
                                                        <FaPlus className="me-2" />
                                                        <span className="d-none d-sm-inline">Novo Registo Manual</span>
                                                        <span className="d-sm-none">Novo Registo</span>
                                                    </h6>

                                                    <form onSubmit={submeterPontoEsquecido}>
                                                        <div className="mb-3">
                                                            <label className="form-label fw-semibold small">Local</label>
                                                            <select
                                                                className="form-select form-moderno"
                                                                value={novaEntrada.obra_id}
                                                                onChange={(e) => setNovaEntrada({ ...novaEntrada, obra_id: e.target.value })}
                                                                required
                                                            >
                                                                <option value="">Selecione um Local...</option>
                                                                {obras.map(obra => (
                                                                    <option key={obra.id} value={obra.id}>
                                                                        {obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="row g-2 mb-3">
                                                            <div className="col-6">
                                                                <label className="form-label fw-semibold small">Tipo</label>
                                                                <select
                                                                    className="form-select form-moderno"
                                                                    value={novaEntrada.tipo}
                                                                    onChange={(e) => setNovaEntrada({ ...novaEntrada, tipo: e.target.value })}
                                                                >
                                                                    <option value="entrada">Entrada</option>
                                                                    <option value="saida">Saída</option>
                                                                </select>
                                                            </div>
                                                            <div className="col-6">
                                                                <label className="form-label fw-semibold small">Hora</label>
                                                                <input
                                                                    type="time"
                                                                    className="form-control form-moderno"
                                                                    value={novaEntrada.hora}
                                                                    onChange={(e) => setNovaEntrada({ ...novaEntrada, hora: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="mb-3">
                                                            <label className="form-label fw-semibold small">Justificação</label>
                                                            <textarea
                                                                className="form-control form-moderno"
                                                                rows="2"
                                                                placeholder="Motivo do registo manual..."
                                                                value={novaEntrada.justificacao}
                                                                onChange={(e) => setNovaEntrada({ ...novaEntrada, justificacao: e.target.value })}
                                                            />
                                                        </div>

                                                        <button
                                                            type="submit"
                                                            className="btn btn-primary w-100 rounded-pill btn-responsive"
                                                            disabled={loading}
                                                        >
                                                            {loading ? (
                                                                <>
                                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                                    Registando...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FaCheckCircle className="me-2" />
                                                                    <span className="d-none d-sm-inline">Submeter Registo</span>
                                                                    <span className="d-sm-none">Submeter</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </form>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            className="btn btn-outline-primary w-100 rounded-pill btn-responsive mb-2"
                                            onClick={() => setMostrarFormularioFalta(prev => !prev)}
                                            type="button"
                                        >
                                            {mostrarFormularioFalta ? '- Recolher Falta' : '+ Registar Falta'}
                                        </button>

                                        {mostrarFormularioFalta && (
                                            <div className="border border-danger rounded p-3 mt-4" style={{ backgroundColor: '#fff5f5' }}>
                                                <h6 className="text-danger fw-bold mb-3">
                                                    <FaPlus className="me-2" />
                                                    <span className="d-none d-sm-inline">Registar Falta</span>
                                                    <span className="d-sm-none">Falta</span>
                                                </h6>

                                                <form onSubmit={submeterFalta}>
                                                    <div className="mb-3">
                                                        <label className="form-label small fw-semibold">Tipo de Falta</label>
                                                        <select
                                                            className="form-select form-moderno"
                                                            value={novaFalta.Falta}
                                                            onChange={(e) => {
                                                                const codigo = e.target.value;
                                                                const faltaSelecionada = tiposFalta.find(f => f.Falta === codigo);
                                                                if (faltaSelecionada) {
                                                                    setNovaFalta({
                                                                        Falta: codigo,
                                                                        Horas: Number(faltaSelecionada.Horas) === 1,
                                                                        Tempo: 1,
                                                                        Observacoes: '',
                                                                        DescontaAlimentacao: Number(faltaSelecionada.DescontaSubsAlim) === 1,
                                                                        DescontaSubsidioTurno: Number(faltaSelecionada.DescontaSubsTurno) === 1
                                                                    });
                                                                } else {
                                                                    setNovaFalta({
                                                                        Falta: '',
                                                                        Horas: false,
                                                                        Tempo: 1,
                                                                        Observacoes: '',
                                                                        DescontaAlimentacao: false,
                                                                        DescontaSubsidioTurno: false
                                                                    });
                                                                }
                                                            }}
                                                            required
                                                        >
                                                            <option value="">Selecione o tipo...</option>
                                                            {tiposFalta.map((t, i) => (
                                                                <option key={i} value={t.Falta}>
                                                                    {t.Falta} – {t.Descricao}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="row g-2 mb-3">
                                                        <div className="col-6">
                                                            <label className="form-label small fw-semibold">Duração</label>
                                                            <input
                                                                type="number"
                                                                className="form-control form-moderno"
                                                                min="1"
                                                                value={novaFalta.Tempo}
                                                                onChange={(e) => setNovaFalta({ ...novaFalta, Tempo: parseInt(e.target.value) })}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="form-label small fw-semibold">Tipo</label>
                                                            <input
                                                                type="text"
                                                                className="form-control form-moderno bg-light"
                                                                readOnly
                                                                value={novaFalta.Horas ? 'Por horas' : 'Dia completo'}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <label className="form-label small fw-semibold">Observações</label>
                                                        <textarea
                                                            className="form-control form-moderno"
                                                            rows="2"
                                                            value={novaFalta.Observacoes}
                                                            onChange={(e) => setNovaFalta({ ...novaFalta, Observacoes: e.target.value })}
                                                        />
                                                    </div>

                                                    <div className="mb-3">
                                                        <label className="form-label small fw-semibold">Anexos (opcional)</label>
                                                        <input
                                                            type="file"
                                                            className="form-control form-moderno"
                                                            onChange={handleAnexoFaltaChange}
                                                            disabled={uploadingAnexo}
                                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                        />
                                                        {uploadingAnexo && (
                                                            <div className="text-primary small mt-1">
                                                                <span className="spinner-border spinner-border-sm me-1"></span>
                                                                A enviar...
                                                            </div>
                                                        )}
                                                        {anexosFalta.length > 0 && (
                                                            <div className="mt-2">
                                                                <small className="text-muted">Anexos adicionados:</small>
                                                                {anexosFalta.map((anexo, idx) => (
                                                                    <div key={idx} className="d-flex align-items-center justify-content-between border rounded p-2 mt-1">
                                                                        <span className="small text-truncate">{anexo.nome_arquivo}</span>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-outline-danger"
                                                                            onClick={() => removerAnexoFalta(idx)}
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {novaFalta.Falta && (
                                                        <div className="alert alert-light border small">
                                                            <div><strong>Tipo:</strong> {novaFalta.Horas ? 'Por horas' : 'Dia completo'}</div>
                                                            <div><strong>Desconta Subsídio Alimentação:</strong> {novaFalta.DescontaAlimentacao ? 'Sim' : 'Não'}</div>
                                                            <div><strong>Desconta Subsídio Turno:</strong> {novaFalta.DescontaSubsidioTurno ? 'Sim' : 'Não'}</div>
                                                        </div>
                                                    )}

                                                    <button
                                                        type="submit"
                                                        className={`btn ${modoEdicaoFalta ? "btn-warning" : "btn-danger"} w-100 rounded-pill btn-responsive`}
                                                        disabled={loading}
                                                    >
                                                        {loading
                                                            ? modoEdicaoFalta ? "A editar..." : "A registar..."
                                                            : modoEdicaoFalta ? "Guardar Alterações" : "Registar Falta"}
                                                    </button>

                                                    {modoEdicaoFalta && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary w-100 rounded-pill btn-responsive mt-2"
                                                            onClick={() => {
                                                                setNovaFalta({ Falta: '', Horas: false, Tempo: 1, Observacoes: '' });
                                                                setModoEdicaoFalta(false);
                                                                setFaltaOriginal(null);
                                                            }}
                                                        >
                                                            Cancelar Edição
                                                        </button>
                                                    )}
                                                </form>
                                            </div>
                                        )}

                                        <button
                                            className="btn btn-outline-primary w-100 rounded-pill btn-responsive mb-2"
                                            onClick={() => setMostrarFormularioFerias(prev => !prev)}
                                            type="button"
                                        >
                                            {MostrarFormularioFerias ? '- Recolher Férias' : '+ Registar Férias'}
                                        </button>

                                        {MostrarFormularioFerias && (
                                            <div className="border border-danger rounded p-3 mt-4" style={{ backgroundColor: '#fff5f5' }}>
                                                <h6 className="text-danger fw-bold mb-3">
                                                    <FaPlus className="me-2" />
                                                    <span className="d-none d-sm-inline">Registar Férias</span>
                                                    <span className="d-sm-none">Férias</span>
                                                </h6>

                                                <form onSubmit={submeterFerias}>
                                                    <div className="row g-2 mb-3">
                                                        <div className="col-6">
                                                            <label className="form-label small fw-semibold">Data Início</label>
                                                            <input
                                                                type="date"
                                                                className="form-control form-moderno"
                                                                value={novaFaltaFerias.dataInicio}
                                                                onChange={(e) => setNovaFaltaFerias({ ...novaFaltaFerias, dataInicio: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="form-label small fw-semibold">Data Fim</label>
                                                            <input
                                                                type="date"
                                                                className="form-control form-moderno"
                                                                value={novaFaltaFerias.dataFim}
                                                                onChange={(e) => setNovaFaltaFerias({ ...novaFaltaFerias, dataFim: e.target.value })}
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <label className="form-label small fw-semibold">Observações</label>
                                                        <textarea
                                                            className="form-control form-moderno"
                                                            rows="2"
                                                            value={novaFaltaFerias.Observacoes}
                                                            onChange={(e) => setNovaFaltaFerias({ ...novaFaltaFerias, Observacoes: e.target.value })}
                                                        />
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        className={`btn ${modoEdicaoFerias ? "btn-warning" : "btn-danger"} w-100 rounded-pill btn-responsive`}
                                                        disabled={loading}
                                                    >
                                                        {loading
                                                            ? modoEdicaoFerias ? "A editar..." : "A registar..."
                                                            : modoEdicaoFerias ? "Guardar Alterações" : "Registar Férias"}
                                                    </button>

                                                    {modoEdicaoFerias && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary w-100 rounded-pill btn-responsive mt-2"
                                                            onClick={() => {
                                                                setNovaFalta({ Falta: '', Horas: false, Tempo: 1, Observacoes: '' });
                                                                setModoEdicaoFerias(false);
                                                                setFaltaOriginal(null);
                                                            }}
                                                        >
                                                            Cancelar Edição
                                                        </button>
                                                    )}
                                                </form>
                                            </div>
                                        )}

                                        {registoEmEdicao && (
                                            <div className="mt-3 border rounded p-3 bg-light">
                                                <h6 className="fw-bold mb-2">Editar Registo</h6>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Hora</label>
                                                    <input
                                                        type="time"
                                                        className="form-control"
                                                        value={novaHoraEdicao}
                                                        onChange={(e) => setNovaHoraEdicao(e.target.value)}
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Justificação da alteração</label>
                                                    <textarea
                                                        className="form-control"
                                                        rows="2"
                                                        value={justificacaoAlteracao}
                                                        onChange={(e) => setJustificacaoAlteracao(e.target.value)}
                                                        required
                                                    />
                                                </div>

                                                <button
                                                    className="btn btn-sm btn-primary me-2"
                                                    onClick={submeterAlteracaoHora}
                                                >
                                                    Submeter Alteração
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => setRegistoEmEdicao(null)}
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        )}

                                        {registosBrutos.length > 0 && (
                                            <div>
                                                <h6 className="fw-bold text-muted mb-3" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
                                                    <span className="d-none d-sm-inline">Histórico de Submissões</span>
                                                    <span className="d-sm-none">Histórico</span>
                                                </h6>
                                                <div style={{ maxHeight: '250px', overflowY: 'auto' }} className="custom-scroll">
                                                    {registosBrutos.map((submission) => (
                                                        <div key={submission.id} className="border rounded p-3 mb-3 bg-light">
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <div className="flex-grow-1 me-2">
                                                                    <div className="d-flex align-items-center mb-1">
                                                                        <span className="fw-semibold me-2">{submission.tipo}</span>
                                                                        <span className={`badge ${submission.is_confirmed ? 'bg-success' : 'bg-warning'
                                                                            }`} style={{ fontSize: '0.7rem' }}>
                                                                            {submission.is_confirmed ? 'Confirmado' : 'Pendente'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="small text-muted mb-1">
                                                                        <div>🕒 {new Date(submission.timestamp).toLocaleTimeString('pt-PT', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}</div>
                                                                        <div className="text-truncate">🏗️ {submission.Obra?.nome || submission.obra_id}</div>
                                                                        {submission.justificacao && (
                                                                            <div className="text-truncate">💬 {submission.justificacao}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="d-flex gap-2 justify-content-end">
                                                                <button
                                                                    className="btn btn-sm btn-outline-secondary rounded-pill"
                                                                    title="Editar ponto"
                                                                    onClick={() => iniciarEdicaoRegisto(submission)}
                                                                    style={{ minWidth: '60px' }}
                                                                >
                                                                    Editar
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-outline-danger rounded-pill"
                                                                    title="Cancelar ponto"
                                                                    onClick={() => cancelarPonto(submission.id)}
                                                                    style={{ minWidth: '70px' }}
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="card card-moderno">
                                    <div className="card-body text-center py-5">
                                        <FaCalendarCheck className="text-muted mb-3" size={48} />
                                        <h6 className="text-muted">Selecione um dia no calendário</h6>
                                        <p className="text-muted small mb-0">Clique em qualquer dia para ver detalhes e registar pontos</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarioHorasTrabalho;