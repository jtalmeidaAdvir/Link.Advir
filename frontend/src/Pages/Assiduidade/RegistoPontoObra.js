import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    FaQrcode,
    FaClock,
    FaMapMarkerAlt,
    FaPlay,
    FaStop,
    FaCheckCircle,
    FaExclamationCircle,
    FaCamera,
    FaUsers,
} from "react-icons/fa";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import NotificacaoCombinada from "./components/NotificacaoCombinada";
import Select from "react-select";
import { useAppStateRefresh } from "../Autenticacao/utils/useAppStateRefresh";
import { useEnsureValidTokens } from "../../utils/useEnsureValidTokens";
import backgroundImage from "../../../images/ImagemFundo.png";
import { secureStorage } from "../../utils/secureStorage";
import OfflineBanner from "../../components/OfflineBanner";
import { tentarReconectar } from "../../utils/syncOfflineData";

const RegistoPontoObra = (props) => {
        const collator = new Intl.Collator('pt-PT', { numeric: true, sensitivity: 'base' });

    const scannerRef = useRef(null);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [registos, setRegistos] = useState([]);
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState("");
    const [loading, setLoading] = useState(false);
    const [registosEquipa, setRegistosEquipa] = useState([]);
    const opcoesObras = [...obras]
  .sort((a, b) => collator.compare(a?.codigo ?? '', b?.codigo ?? ''))
  .map((obra) => ({
    value: obra.id,
    label: `${obra.codigo} - ${obra.nome}`,
  }));


    const tipoUser =
        secureStorage.getItem("tipoUser") ||
        secureStorage.getItem("tipo") ||
        secureStorage.getItem("userType");
    const tipoUserNormalizado = (tipoUser || "").trim();

    // Normalizar para capitalização consistente
    const tipoUserCapitalizado =
        tipoUserNormalizado.charAt(0).toUpperCase() +
        tipoUserNormalizado.slice(1).toLowerCase();
    // Estado para equipas e membros
    const [minhasEquipas, setMinhasEquipas] = useState([]);
    const [membrosSelecionados, setMembrosSelecionados] = useState([]);
    const [horasEquipa, setHorasEquipa] = useState({});
    const [dataRegistoEquipa, setDataRegistoEquipa] = useState(new Date().toISOString().split('T')[0]);

    const [mostrarManual, setMostrarManual] = useState(false);
    const [mostrarEquipa, setMostrarEquipa] = useState(false);
    const [modoOffline, setModoOffline] = useState(false);
    const [picagensExpandidas, setPicagensExpandidas] = useState(false);

    // Função para formatar data para exibição dd/MM/yyyy
    const formatarDataParaExibicao = (dataISO) => {
        if (!dataISO) return '';
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    // Função para converter dd/MM/yyyy para yyyy-MM-dd
    const converterDataParaISO = (dataFormatada) => {
        if (!dataFormatada) return '';
        const [dia, mes, ano] = dataFormatada.split('/');
        return `${ano}-${mes}-${dia}`;
    };

    const [cameras, setCameras] = useState([]);
    const [currentCamIdx, setCurrentCamIdx] = useState(0);

    // Estados para modal de mudança de obra
    const [showMudancaObraModal, setShowMudancaObraModal] = useState(false);
    const [mudancaObraData, setMudancaObraData] = useState({
        obraAtualId: null,
        obraAtualNome: "",
        novaObraId: null,
        novaObraNome: "",
        onConfirm: null,
    });


    const startScannerWith = async (cameraId) => {
        // garante que não existem instâncias anteriores
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch (_) {}
            scannerRef.current = null;
        }

        scannerRef.current = new Html5Qrcode("reader");
        await scannerRef.current.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            },
            async (decodedText) => {
                if (isProcessing) return;
                setIsProcessing(true);
                try {
                    await scannerRef.current.stop();
                } catch (_) {}
                scannerRef.current = null;
                setScannerVisible(false);
                await onScanSuccess(decodedText);
                setIsProcessing(false);
            },
        );
    };

    // Hook para renovar tokens automaticamente quando o app volta ao primeiro plano
    useAppStateRefresh();

    // Garantir que os tokens estão válidos quando a página carrega
    useEnsureValidTokens();

    // Usa timestamp || createdAt para ser robusto
    const dataRegisto = (r) => new Date(r.timestamp || r.createdAt);

    const temSaidaPosterior = (entrada, lista) =>
        lista.some(
            (s) =>
                s.tipo === "saida" &&
                String(s.obra_id) == String(entrada.obra_id) &&
                dataRegisto(s) > dataRegisto(entrada),
        );

    const getEntradaAtivaPorObra = (obraId, lista) =>
        lista
            .filter(
                (r) =>
                    r.tipo === "entrada" && String(r.obra_id) == String(obraId),
            )
            .sort((a, b) => dataRegisto(b) - dataRegisto(a))
            .find((e) => !temSaidaPosterior(e, lista));

    const getUltimaEntradaAtiva = (lista) =>
        lista
            .filter((r) => r.tipo === "entrada")
            .sort((a, b) => dataRegisto(b) - dataRegisto(a))
            .find((e) => !temSaidaPosterior(e, lista));

    const processarPorQR = async (obraId, nomeObra) => {
        // 1) Se já houver entrada ativa na MESMA obra → fazer SAÍDA (sem confirmação)
        const ativaMesmaObra = getEntradaAtivaPorObra(obraId, registos);
        if (ativaMesmaObra) {
            await registarPonto("saida", obraId, nomeObra);
            return;
        }

        // 2) Se houver entrada ativa noutra obra → MOSTRAR MODAL PERSONALIZADO
        const ultimaAtiva = getUltimaEntradaAtiva(registos);
        if (ultimaAtiva && String(ultimaAtiva.obra_id) != String(obraId)) {
            const nomeAnterior = ultimaAtiva.Obra?.nome || "Obra anterior";

            // Mostrar modal personalizado com Promise para aguardar escolha do utilizador
            return new Promise((resolve) => {
                setMudancaObraData({
                    obraAtualId: ultimaAtiva.obra_id,
                    obraAtualNome: nomeAnterior,
                    novaObraId: obraId,
                    novaObraNome: nomeObra,
                    onConfirm: async (opcao) => {
                        setShowMudancaObraModal(false);

                        if (opcao === "sair") {
                            // Apenas sair da obra atual
                            await registarPonto("saida", ultimaAtiva.obra_id, nomeAnterior);
                        } else if (opcao === "mudar") {
                            // Sair da atual e entrar na nova
                            await registarPonto("saida", ultimaAtiva.obra_id, nomeAnterior);
                            await registarPonto("entrada", obraId, nomeObra);
                        }
                        resolve();
                    },
                });
                setShowMudancaObraModal(true);
            });
        }

        // 3) Sem ativa → ENTRADA nesta obra (sem confirmação)
        await registarPonto("entrada", obraId, nomeObra);
    };

    // Função para navegar para aprovação de registos
    const handleNavigateToApproval = () => {
        // Use navigation.navigate para navegar para a página de aprovação
        if (props.navigation) {
            props.navigation.navigate("AprovacaoPontoPendentes");
        }
    };

    // Função para navegar para aprovação de faltas
    const handleNavigateToFaltasApproval = () => {
        // Use navigation.navigate para navegar para a página de aprovação de faltas
        if (props.navigation) {
            props.navigation.navigate("AprovacaoFaltaFerias");
        }
    };

    //
    useEffect(() => {
        const fetchEquipas = async () => {
            const token = secureStorage.getItem("loginToken");
            const res = await fetch(
                "https://backend.advir.pt/api/equipa-obra/minhas-agrupadas",
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            if (res.ok) {
                const data = await res.json();
                // Filter out external members from each team
                const equipasFiltered = data.map(equipa => ({
                    ...equipa,
                    membros: equipa.membros.filter(m => m.tipo !== 'externo')
                }));
                setMinhasEquipas(equipasFiltered);
            }
        };
        fetchEquipas();
    }, []);

    const getEstadoMembro = (userId, obraSelecionada, registosEquipa) => {
        const entradas = registosEquipa.filter(
            (r) => r.user_id === userId && r.tipo === "entrada",
        );
        const saidas = registosEquipa.filter(
            (r) => r.user_id === userId && r.tipo === "saida",
        );
        const ultimaEntrada = entradas.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        )[0];
        const temSaidaPosterior =
            ultimaEntrada &&
            saidas.some(
                (s) =>
                    new Date(s.timestamp) > new Date(ultimaEntrada.timestamp),
            );

        let estado = "Ausente";
        let corEstado = "text-muted";

        if (ultimaEntrada && !temSaidaPosterior) {
            if (obraSelecionada && ultimaEntrada.obra_id == obraSelecionada) {
                estado = "A Trabalhar";
                corEstado = "text-success";
            } else {
                estado = "Ocupado";
                corEstado = "text-warning";
            }
        }
        return { estado, corEstado };
    };

    // Calcular horas trabalhadas de um membro para a data selecionada
    const calcularHorasTrabalhadas = (userId, registosEquipa) => {
        // Filtrar registos do utilizador
        const registosUser = registosEquipa.filter(r => r.user_id === userId);

        if (registosUser.length === 0) {
            return '0h 00m';
        }

        // Ordenar por timestamp
        const registosOrdenados = registosUser.sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        let totalMinutos = 0;
        let ultimaEntrada = null;

        for (const registo of registosOrdenados) {
            if (registo.tipo === 'entrada') {
                ultimaEntrada = new Date(registo.timestamp);
            } else if (registo.tipo === 'saida' && ultimaEntrada) {
                const saida = new Date(registo.timestamp);
                const diffMs = saida - ultimaEntrada;
                const diffMinutos = Math.floor(diffMs / (1000 * 60));
                totalMinutos += diffMinutos;
                ultimaEntrada = null;
            }
        }

        // Se ainda houver entrada sem saída, não contar (pode estar a trabalhar)
        // Para dias anteriores, não adicionar tempo extra

        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;

        return `${horas}h ${String(minutos).padStart(2, '0')}m`;
    };

    // IDs (inclui sempre o utilizador atual)
    const getIdsEquipa = (eq) => {
        const userId = parseInt(secureStorage.getItem("user_id"));
        const ids = eq.membros.map((m) => m.id);
        if (userId && !ids.includes(userId)) ids.push(userId);
        return ids;
    };

    // Selecionar/Desselecionar todos os membros da equipa (inclui "Eu")
    const toggleSelecionarTodosEquipa = (eq) => {
        const userId = parseInt(secureStorage.getItem("user_id"));
        const ids = getIdsEquipa(eq);
        
        setMembrosSelecionados((prev) => {
            const prevSet = new Set(prev);
            const allSelected = ids.every((id) => prevSet.has(id));
            
            if (allSelected) {
                // Desseleciona todos os membros da equipa incluindo o userId
                ids.forEach((id) => prevSet.delete(id));
            } else {
                // Seleciona todos os membros da equipa incluindo o userId
                ids.forEach((id) => prevSet.add(id));
            }
            
            return Array.from(prevSet);
        });
    };

    // Carregar obras disponíveis
    useEffect(() => {
        const fetchObras = async () => {
            try {
                setLoading(true);
                const token = secureStorage.getItem("loginToken");
                const empresaId = secureStorage.getItem("empresa_id");

                // SEMPRE tentar buscar do backend (funciona mesmo em modo offline)
                const res = await fetch("https://backend.advir.pt/api/obra", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    const obrasDaEmpresa = data
                        .filter((o) => o.empresa_id == empresaId)
                        .sort((a, b) => collator.compare(a?.codigo ?? '', b?.codigo ?? ''));

                    setObras(obrasDaEmpresa);

                    if (obrasDaEmpresa.length === 1) {
                        setObraSelecionada(obrasDaEmpresa[0].id);
                    }
                } else {
                    console.error("Erro ao carregar obras do backend - Status:", res.status);
                }

            } catch (err) {
                console.error("Erro ao carregar obras:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchObras();
    }, []);

    // Carregar registos do dia
    useEffect(() => {
        const carregarRegistosHoje = async () => {
            try {
                setLoading(true);
                const token = secureStorage.getItem("loginToken");
                const hoje = new Date().toISOString().split("T")[0];

                const res = await fetch(
                    `https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${hoje}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );

                if (res.ok) {
                    const dados = await res.json();
                    // Inicializa com morada por carregar
                    const registosIniciais = dados.map((r) => ({
                        ...r,
                        morada: "A carregar localização...",
                    }));
                    setRegistos(registosIniciais);

                    // Vai buscar as moradas individualmente depois
                    dados.forEach(async (r) => {
                        const morada = await obterMoradaPorCoordenadas(
                            r.latitude,
                            r.longitude,
                        );
                        setRegistos((prev) =>
                            prev.map((item) =>
                                item.id === r.id ? { ...item, morada } : item,
                            ),
                        );
                    });
                }
            } catch (err) {
                console.error("Erro ao carregar registos de hoje:", err);
            } finally {
                setLoading(false);
            }
        };

        carregarRegistosHoje();
    }, []);

    // Verificar modo offline e tentar reconectar automaticamente
    useEffect(() => {
        const offlineMode = secureStorage.getItem("modoOffline") === "true";
        setModoOffline(offlineMode);

        if (offlineMode) {
            // Tentar reconectar automaticamente a cada 30 segundos
            const intervaloReconexao = setInterval(async () => {
                console.log("⏰ Verificando conexão...");
                const resultado = await tentarReconectar();

                if (resultado.reconnected && resultado.synced) {
                    alert("✓ Conexão restaurada! Seus dados foram sincronizados.");
                    setModoOffline(false);

                    // Recarregar registos após sincronização
                    const token = secureStorage.getItem("loginToken");
                    const hoje = new Date().toISOString().split("T")[0];
                    const res = await fetch(
                        `https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${hoje}`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        },
                    );
                    if (res.ok) {
                        const dados = await res.json();
                        const registosIniciais = dados.map((r) => ({
                            ...r,
                            morada: "A carregar localização...",
                        }));
                        setRegistos(registosIniciais);
                    }
                    clearInterval(intervaloReconexao);
                }
            }, 30000); // 30 segundos

            return () => clearInterval(intervaloReconexao);
        }
    }, []);

    useEffect(() => {
        const fetchRegistosEquipa = async () => {
            const token = secureStorage.getItem("loginToken");
            const todosMembros = minhasEquipas.flatMap((eq) =>
                eq.membros.map((m) => m.id),
            );
            if (!todosMembros.length) {
                setRegistosEquipa([]);
                return;
            }

            const ids = todosMembros.join(",");
            const dataParam = dataRegistoEquipa || new Date().toISOString().split('T')[0];

            console.log('🔄 Carregando picagens da equipa para:', formatarDataParaExibicao(dataParam));
            console.log('🔍 URL completa:', `https://backend.advir.pt/api/registo-ponto-obra/listar-dia-equipa?membros=${ids}&data=${dataParam}`);

            // Limpar registos antes de carregar novos
            setRegistosEquipa([]);

            const res = await fetch(
                `https://backend.advir.pt/api/registo-ponto-obra/listar-dia-equipa?membros=${ids}&data=${dataParam}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            if (res.ok) {
                const data = await res.json();
                console.log(`✅ ${data.length} picagens encontradas para ${formatarDataParaExibicao(dataParam)}`);
                console.log('📋 Detalhes:', data);
                setRegistosEquipa(data);
            } else {
                console.error('❌ Erro ao carregar picagens:', res.status);
                setRegistosEquipa([]);
            }
        };

        if (minhasEquipas.length > 0) {
            fetchRegistosEquipa();
        }
    }, [minhasEquipas, dataRegistoEquipa]);

    const obterMoradaPorCoordenadas = async (lat, lon) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            );
            const data = await res.json();
            return data.display_name || `${lat}, ${lon}`;
        } catch (err) {
            //    console.error('Erro ao obter morada:', err);
            return `${lat}, ${lon}`;
        }
    };

    const getCurrentLocation = () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            // API não disponível
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    coords: {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    },
                });
            },
            (err) => {
                console.warn("Permissão de localização negada ou erro:", err);
                resolve(null); // devolve null para continuar o registo
            },
            { timeout: 5000 } // evita ficar pendurado
        );
    });
};


   const registarPonto = async (tipo, obraId, nomeObra) => {
    try {
        setLoading(true);
        const loc = await getCurrentLocation();
        const token = secureStorage.getItem("loginToken");

        const latitude = loc?.coords?.latitude ?? null;
        const longitude = loc?.coords?.longitude ?? null;

        // MODO OFFLINE: Salvar localmente
        if (modoOffline) {
            const novoRegisto = {
                id: `offline-${Date.now()}`,
                tipo,
                obra_id: obraId,
                latitude,
                longitude,
                timestamp: new Date().toISOString(),
                user_id: parseInt(secureStorage.getItem("user_id")),
                Obra: { nome: nomeObra },
                morada: "Offline - Será atualizado"
            };

            // Salvar no localStorage
            let registosOffline = secureStorage.getItem("registosObraOffline");
            let registos = registosOffline ? JSON.parse(registosOffline) : [];
            registos.push(novoRegisto);
            secureStorage.setItem("registosObraOffline", JSON.stringify(registos));

            // Adicionar à fila de sincronização
            let filaSincronizacao = secureStorage.getItem("filaSincronizacao");
            let fila = filaSincronizacao ? JSON.parse(filaSincronizacao) : [];
            fila.push({
                ...novoRegisto,
                sincronizado: false
            });
            secureStorage.setItem("filaSincronizacao", JSON.stringify(fila));

            // Atualizar UI
            setRegistos((prev) => [...prev, novoRegisto]);
            alert(`✓ ${tipo.toUpperCase()} registada offline na obra "${nomeObra}"!\nSerá sincronizada quando houver conexão.`);
            return;
        }

        // MODO ONLINE: Enviar para backend
        const res = await fetch(
            "https://backend.advir.pt/api/registo-ponto-obra",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tipo,
                    obra_id: obraId,
                    latitude,
                    longitude,
                }),
            }
        );

        if (res.ok) {
            const data = await res.json();
            let morada = null;
            if (latitude && longitude) {
                morada = await obterMoradaPorCoordenadas(latitude, longitude);
            } else {
                morada = "Localização não disponível";
            }

            setRegistos((prev) => [
                ...prev,
                { ...data, Obra: { nome: nomeObra }, morada },
            ]);
        } else {
            alert("Erro ao registar ponto");
        }
    } catch (err) {
        console.error(err);

        // Se falhar online, tentar salvar offline
        if (!modoOffline) {
            alert('Erro de comunicação. Salvando offline...');
            setModoOffline(true);
            secureStorage.setItem("modoOffline", "true");
            // Tentar novamente em modo offline
            await registarPonto(tipo, obraId, nomeObra);
        }
    } finally {
        setLoading(false);
    }
};


    const processarEntradaComValidacao = async (novaObraId, nomeObraNova) => {
        // Verificar se já há entrada na mesma obra sem saída
        const entradasMesmaObra = registos
            .filter((r) => r.tipo === "entrada" && r.obra_id === novaObraId)
            .filter((entrada) => {
                const saida = registos.find(
                    (saida) =>
                        saida.tipo === "saida" &&
                        saida.obra_id === novaObraId &&
                        new Date(saida.timestamp) > new Date(entrada.timestamp),
                );
                return !saida;
            });

        if (entradasMesmaObra.length > 0) {
            return alert(
                `Já tens uma entrada ativa na obra "${nomeObraNova}". Dá saída antes de entrares novamente.`,
            );
        }

        // Auto-fecho da última obra se for diferente
        const entradasSemSaida = registos
            .filter((r) => r.tipo === "entrada")
            .filter((entrada) => {
                const saida = registos.find(
                    (saida) =>
                        saida.tipo === "saida" &&
                        saida.obra_id === entrada.obra_id &&
                        new Date(saida.timestamp) > new Date(entrada.timestamp),
                );
                return !saida;
            });

        const ultimaEntradaSemSaida = entradasSemSaida.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        )[0];

        if (
            ultimaEntradaSemSaida &&
            ultimaEntradaSemSaida.obra_id !== novaObraId
        ) {
            const nomeObraAnterior =
                ultimaEntradaSemSaida.Obra?.nome || "Obra anterior";

            // Mostrar modal personalizado com Promise para aguardar escolha do utilizador
            return new Promise((resolve) => {
                setMudancaObraData({
                    obraAtualId: ultimaEntradaSemSaida.obra_id,
                    obraAtualNome: nomeObraAnterior,
                    novaObraId: novaObraId,
                    novaObraNome: nomeObraNova,
                    onConfirm: async (opcao) => {
                        setShowMudancaObraModal(false);

                        if (opcao === "sair") {
                            // Apenas sair da obra atual
                            await registarPonto("saida", ultimaEntradaSemSaida.obra_id, nomeObraAnterior);
                        } else if (opcao === "mudar") {
                            // Sair da atual e entrar na nova
                            await registarPonto("saida", ultimaEntradaSemSaida.obra_id, nomeObraAnterior);
                            await registarPonto("entrada", novaObraId, nomeObraNova);
                        }
                        resolve();
                    },
                });
                setShowMudancaObraModal(true);
            });
        }

        // Sem entrada ativa → registar entrada (sem confirmação)
        await registarPonto("entrada", novaObraId, nomeObraNova);
    };

    const onScanSuccess = async (data) => {
        try {
            const qrData = JSON.parse(data);
            if (qrData.tipo !== "obra" || !qrData.obraId) {
                alert("QR Code inválido");
                return;
            }

            const novaObraId = qrData.obraId;
            const nomeObraNova = qrData.nome;

            // Se tiver membros selecionados, processar registo de equipa
            if (membrosSelecionados.length > 0) {
                await processarRegistoEquipaComQR(novaObraId, nomeObraNova);
            } else {
                // Senão, processar registo individual normal
                await processarPorQR(novaObraId, nomeObraNova);
            }
        } catch (err) {
            console.error("Erro ao processar o QR Code:", err);
            alert("Erro ao processar o QR Code");
        }
    };

    const toggleScanner = () => setScannerVisible(!scannerVisible);

    useEffect(() => {
        if (!scannerVisible) return;

        const init = async () => {
            try {
                // obter lista de câmaras
                const found = await Html5Qrcode.getCameras();
                if (!found?.length) {
                    alert("Não foram encontradas câmaras.");
                    setScannerVisible(false);
                    return;
                }

                setCameras(found);

                // escolher por defeito: traseira/environment se existir
                const preferida =
                    found.find((c) =>
                        /back|rear|environment|trás/i.test(c.label),
                    ) || found[0];

                const idx = found.findIndex((c) => c.id === preferida.id);
                setCurrentCamIdx(idx >= 0 ? idx : 0);

                await startScannerWith(preferida.id);
            } catch (err) {
                console.error("Erro ao iniciar scanner:", err);
                alert("Erro ao iniciar câmera");
                setScannerVisible(false);
            }
        };

        init();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
        };
    }, [scannerVisible]); // <— remove 'isProcessing' daqui

    // Substituir a handleManualAction por:
    const handlePicagemManual = async () => {
        const obra = obras.find((o) => o.id == obraSelecionada);
        if (!obraSelecionada || !obra) {
            alert("Selecione uma obra válida");
            return;
        }
        // Usa a tua lógica que já fecha/abre automaticamente
        await processarPorQR(obra.id, obra.nome);
    };

    const handleSwitchCamera = async () => {
        if (!scannerVisible || !cameras.length) return;
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const nextIdx = (currentCamIdx + 1) % cameras.length;
            // parar a atual
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                } catch (_) {}
                scannerRef.current = null;
            }
            // iniciar com a próxima
            await startScannerWith(cameras[nextIdx].id);
            setCurrentCamIdx(nextIdx);
        } catch (e) {
            console.error("Erro ao trocar câmara:", e);
            alert("Não foi possível trocar de câmara.");
        } finally {
            setIsProcessing(false);
        }
    };

    const processarRegistoEquipaComQR = async (obraId, nomeObra) => {
        try {
            setLoading(true);
            const token = secureStorage.getItem("loginToken");
            const loc = await getCurrentLocation();
const latitude = loc?.coords?.latitude ?? null;
const longitude = loc?.coords?.longitude ?? null;


            // Determinar o tipo de registo (entrada/saída) baseado no estado atual da equipa
            // Para simplificar, vamos fazer entrada/saída alternada
            const registosHoje = registos.filter(r => 
                membrosSelecionados.includes(r.user_id) && 
                String(r.obra_id) === String(obraId)
            );
            
            // Verificar se há alguma entrada ativa
            const temEntradaAtiva = registosHoje.some(entrada => {
                if (entrada.tipo !== 'entrada') return false;
                const temSaidaPosterior = registosHoje.some(saida => 
                    saida.tipo === 'saida' && 
                    saida.user_id === entrada.user_id &&
                    new Date(saida.timestamp) > new Date(entrada.timestamp)
                );
                return !temSaidaPosterior;
            });

            const tipo = temEntradaAtiva ? 'saida' : 'entrada';

            const res = await fetch(
                "https://backend.advir.pt/api/registo-ponto-obra/registar-ponto-equipa",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        tipo,
                        obra_id: obraId,
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        membros: membrosSelecionados,
                    }),
                },
            );

            if (res.ok) {
                alert(
                    `QR Code lido!\n\n${tipo.toUpperCase()} registada na obra "${nomeObra}" para ${membrosSelecionados.length} membro(s).`,
                );
                
                // Recarregar registos
                const hoje = new Date().toISOString().split("T")[0];
                const resRegistos = await fetch(
                    `https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${hoje}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );

                if (resRegistos.ok) {
                    const dados = await resRegistos.json();
                    const registosIniciais = dados.map((r) => ({
                        ...r,
                        morada: "A carregar localização...",
                    }));
                    setRegistos(registosIniciais);

                    dados.forEach(async (r) => {
                        const morada = await obterMoradaPorCoordenadas(
                            r.latitude,
                            r.longitude,
                        );
                        setRegistos((prev) =>
                            prev.map((item) =>
                                item.id === r.id ? { ...item, morada } : item,
                            ),
                        );
                    });
                }
            } else {
                alert("Erro ao registar ponto para equipa.");
            }
        } catch (err) {
            console.error("Erro registo equipa com QR:", err);
            alert("Erro interno ao registar ponto da equipa.");
        } finally {
            setLoading(false);
        }
    };

   const handleRegistoEquipa = async (tipo) => {
  try {
    setLoading(true);
    const token = secureStorage.getItem("loginToken");
    const loc = await getCurrentLocation();
    const latitude = loc?.coords?.latitude ?? null;
    const longitude = loc?.coords?.longitude ?? null;

    const dataParaRegisto = dataRegistoEquipa || new Date().toISOString().split('T')[0];
    const hoje = new Date().toISOString().split('T')[0];
    const isDiaAnterior = dataParaRegisto !== hoje;
    const erros = [];
    const sucessos = [];

    // Se for dia anterior, todos os membros precisam de hora definida
    if (isDiaAnterior && membrosSelecionados.some(id => !horasEquipa[id])) {
      alert('Para registar pontos em dias anteriores, é necessário definir a hora para todos os membros selecionados.');
      setLoading(false);
      return;
    }

    // Separar membros com e sem hora definida
    const membrosComHora = membrosSelecionados.filter(id => horasEquipa[id]);
    const membrosSemHora = membrosSelecionados.filter(id => !horasEquipa[id]);

    // Registar ponto esquecido para membros com hora definida
    for (const userId of membrosComHora) {
      const horaDefinida = horasEquipa[userId];
      const timestamp = new Date(`${dataParaRegisto}T${horaDefinida}:00`);

      try {
        const res = await fetch(
          "https://backend.advir.pt/api/registo-ponto-obra/registar-esquecido-por-outro",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: userId,
              obra_id: obraSelecionada,
              tipo,
              timestamp: timestamp.toISOString(),
              justificacao: `Registo de equipa - ${tipo} às ${horaDefinida} (Data: ${dataParaRegisto})`,
              skipValidation: true
            }),
          },
        );

        if (res.ok) {
          const membro = minhasEquipas.flatMap(eq => eq.membros).find(m => m.id === userId);
          sucessos.push(membro?.nome || `Membro ${userId}`);
        } else {
          const data = await res.json();
          const membro = minhasEquipas.flatMap(eq => eq.membros).find(m => m.id === userId);
          erros.push(`${membro?.nome || `Membro ${userId}`}: ${data.message || 'Erro desconhecido'}`);
        }
      } catch (err) {
        const membro = minhasEquipas.flatMap(eq => eq.membros).find(m => m.id === userId);
        erros.push(`${membro?.nome || `Membro ${userId}`}: Erro de comunicação`);
      }
    }

    // Registar ponto em tempo real para membros sem hora definida
    if (membrosSemHora.length > 0) {
      try {
        const res = await fetch(
          "https://backend.advir.pt/api/registo-ponto-obra/registar-ponto-equipa",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tipo,
              obra_id: obraSelecionada,
              latitude,
              longitude,
              membros: membrosSemHora,
            }),
          },
        );

        if (res.ok) {
          membrosSemHora.forEach(userId => {
            const membro = minhasEquipas.flatMap(eq => eq.membros).find(m => m.id === userId);
            sucessos.push(membro?.nome || `Membro ${userId}`);
          });
        } else {
          const data = await res.json();
          if (data.erros && Array.isArray(data.erros)) {
            erros.push(...data.erros);
          } else {
            membrosSemHora.forEach(userId => {
              const membro = minhasEquipas.flatMap(eq => eq.membros).find(m => m.id === userId);
              erros.push(`${membro?.nome || `Membro ${userId}`}: ${data.message || 'Erro desconhecido'}`);
            });
          }
        }
      } catch (err) {
        membrosSemHora.forEach(userId => {
          const membro = minhasEquipas.flatMap(eq => eq.membros).find(m => m.id === userId);
          erros.push(`${membro?.nome || `Membro ${userId}`}: Erro de comunicação`);
        });
      }
    }

    // Mostrar resultado
    let mensagem = '';
    if (sucessos.length > 0) {
      mensagem += `✅ Registos criados com sucesso:\n${sucessos.join(', ')}\n\n`;
    }
    if (erros.length > 0) {
      mensagem += `⚠️ Erros:\n${erros.join('\n')}`;
    }
    
    alert(mensagem || 'Nenhum registo foi efetuado.');

    // Recarregar registos
    const resRegistos = await fetch(
      `https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${dataParaRegisto}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (resRegistos.ok) {
      const dados = await resRegistos.json();
      const registosIniciais = dados.map((r) => ({
        ...r,
        morada: "A carregar localização...",
      }));
      setRegistos(registosIniciais);

      dados.forEach(async (r) => {
        const morada = await obterMoradaPorCoordenadas(
          r.latitude,
          r.longitude,
        );
        setRegistos((prev) =>
          prev.map((item) =>
            item.id === r.id ? { ...item, morada } : item,
          ),
        );
      });
    }

    // Recarregar registos da equipa para atualizar estados
    const todosMembros = minhasEquipas.flatMap((eq) =>
      eq.membros.map((m) => m.id),
    );
    if (todosMembros.length > 0) {
      const ids = todosMembros.join(",");
      const resEquipa = await fetch(
        `https://backend.advir.pt/api/registo-ponto-obra/listar-dia-equipa?membros=${ids}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (resEquipa.ok) {
        const dataEquipa = await resEquipa.json();
        setRegistosEquipa(dataEquipa);
      }
    }

    // Limpar seleções
    setMembrosSelecionados([]);
    setHorasEquipa({});
    // Resetar data para hoje após registo bem sucedido
    setDataRegistoEquipa(new Date().toISOString().split('T')[0]);

  } catch (err) {
    console.error("Erro registo equipa:", err);
    alert("Erro interno ao registar ponto da equipa.");
  } finally {
    setLoading(false);
  }
};


    return (
        <div
            className="container-fluid bg-light min-vh-100 py-2 py-md-4"
            style={{
                overflowX: "hidden",
            }}
        >
            {/* Banner de Modo Offline */}
            <OfflineBanner isOffline={modoOffline} />
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                        "linear-gradient(to bottom, rgba(227, 242, 253, 0.8), rgba(187, 222, 251, 0.8), rgba(144, 202, 249, 0.8))",
                    zIndex: 0,
                }}
            ></div>

            <style jsx>{`
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-30px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                .scanner-container {
                    border-radius: 15px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }
                .card-moderno {
                    border-radius: 15px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    border: none;
                    margin-bottom: 1rem;
                }
                .btn-scanner {
                    background: linear-gradient(45deg, #04befe, #4481eb);
                    border: none;
                    border-radius: 12px;
                    padding: 0.75rem 1.5rem;
                    color: white;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(68, 129, 235, 0.3);
                }
                .btn-scanner:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(68, 129, 235, 0.4);
                    color: white;
                }
                .btn-action {
                    border-radius: 8px;
                    font-weight: 600;
                    padding: 0.75rem 1.5rem;
                    transition: all 0.3s ease;
                    min-width: 120px;
                }
                .btn-action:hover {
                    transform: translateY(-1px);
                }
                .registro-item {
                    background: white;
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 0.75rem;
                    border-left: 4px solid #28a745;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                    transition: all 0.3s ease;
                }
                .registro-item:hover {
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
                }
                .registro-saida {
                    border-left-color: #dc3545;
                }
                .form-control-custom {
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                    padding: 0.75rem;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }
                .form-control-custom:focus {
                    border-color: #4481eb;
                    box-shadow: 0 0 0 0.2rem rgba(68, 129, 235, 0.25);
                }
                @media (max-width: 767px) {
                    .container-fluid {
                        padding-left: 0.75rem;
                        padding-right: 0.75rem;
                    }
                    .btn-action {
                        min-width: 100px;
                        padding: 0.6rem 1rem;
                        font-size: 0.85rem;
                    }
                }
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
            `}</style>

            {loading && (
                <div className="loading-overlay">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                </div>
            )}

            <div style={{ position: "relative", zIndex: 1 }}>
                <div className="row justify-content-center">
                    <div className="col-12 col-xl-10">
                        {/* Header */}
                        <div className="card card-moderno mb-3 mb-md-4">
                            <div className="card-body py-3 py-md-4">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="text-center flex-grow-1">
                                        <h1 className="h4 h3-md mb-2 text-primary"></h1>
                                        <h1 className="h4 h3-md mb-2 text-primary">
                                            Ponto
                                        </h1>
                                        <p className="text-muted mb-0 small">
                                            Digitaliza QR Code ou regista
                                            manualmente
                                        </p>
                                    </div>

                                    {/* Notification Bell - Always show for admin users */}
                                    <div className="d-flex align-items-center">
                                        <NotificacaoCombinada
                                            tipoUser={tipoUserCapitalizado}
                                            onNavigateRegistos={
                                                handleNavigateToApproval
                                            }
                                            onNavigateFaltas={
                                                handleNavigateToFaltasApproval
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            className="row g-3"
                            style={{ marginBottom: "50px" }}
                        >
                            {/* Scanner Section */}
                            <div className="col-12 col-lg-8">
                                <div className="card card-moderno">
                                    <div className="card-body p-3 p-md-4">
                                        {/* Scanner Button */}
                                        <div className="text-center mb-4">
                                            <button
                                                className="btn btn-scanner w-100 w-md-auto"
                                                onClick={toggleScanner}
                                                disabled={isProcessing}
                                            >
                                                <FaCamera className="me-2" />
                                                <span className="d-none d-sm-inline">
                                                    {scannerVisible
                                                        ? "Fechar Scanner"
                                                        : "Abrir Scanner QR Code"}
                                                </span>

                                                <span className="d-sm-none">
                                                    {scannerVisible
                                                        ? "Fechar"
                                                        : "Scanner"}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Scanner Container */}
                                        {scannerVisible && (
                                            <div className="scanner-container mb-4">
                                                <div
                                                    id="reader"
                                                    style={{
                                                        width: "100%",
                                                        minHeight: "300px",
                                                    }}
                                                ></div>
                                            </div>
                                        )}
                                        {scannerVisible &&
                                            cameras.length > 1 && (
                                                <div className="d-flex justify-content-end mb-2">
                                                    <button
                                                        className="btn btn-outline-primary btn-sm"
                                                        onClick={
                                                            handleSwitchCamera
                                                        }
                                                        disabled={isProcessing}
                                                        title="Alternar entre câmaras"
                                                    >
                                                        Rodar câmara
                                                    </button>
                                                </div>
                                            )}

                                        {/* Manual Registration */}
                                        <div className="border border-primary rounded mb-3">
                                            <div
                                                className="bg-primary text-white px-3 py-2 d-flex justify-content-between align-items-center rounded-top"
                                                style={{ cursor: "pointer" }}
                                                onClick={() =>
                                                    setMostrarManual(
                                                        (prev) => !prev,
                                                    )
                                                }
                                            >
                                                <h5 className="mb-0">
                                                    <FaClock className="me-2" />
                                                    Registo Manual
                                                </h5>
                                                <span>
                                                    {mostrarManual ? "−" : "+"}
                                                </span>
                                            </div>

                                            {mostrarManual && (
                                                <div
                                                    className="p-3 p-md-4"
                                                    style={{
                                                        backgroundColor:
                                                            "#f8f9ff",
                                                    }}
                                                >
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold small">
                                                            Selecionar Local
                                                        </label>
                                                        <Select
                                                            options={
                                                                opcoesObras
                                                            }
                                                            value={opcoesObras.find(
                                                                (o) =>
                                                                    o.value ==
                                                                    obraSelecionada,
                                                            )}
                                                            onChange={(opcao) =>
                                                                setObraSelecionada(
                                                                    opcao.value,
                                                                )
                                                            }
                                                            placeholder="Escolha o local..."
                                                            classNamePrefix="react-select"
                                                            isClearable
                                                        />
                                                    </div>

                                                    <div className="row g-2">
                                                        <div className="col-13">
                                                            <button
                                                                className="btn btn-success btn-action w-100"
                                                                onClick={
                                                                    handlePicagemManual
                                                                }
                                                                disabled={
                                                                    !obraSelecionada ||
                                                                    loading ||
                                                                    isProcessing
                                                                }
                                                            >
                                                                <FaCheckCircle className="me-2" />
                                                                Picar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Team Registration */}
                                        {tipoUserCapitalizado !==
                                            "Trabalhador" && (
                                            <div className="mt-4 border border-info rounded bg-white mb-3">
                                                <div
                                                    className="bg-info text-white px-3 py-2 d-flex justify-content-between align-items-center rounded-top"
                                                    style={{
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() =>
                                                        setMostrarEquipa(
                                                            (prev) => !prev,
                                                        )
                                                    }
                                                >
                                                    <h5 className="mb-0">
                                                        <FaUsers className="me-2" />
                                                        Registo por Equipa
                                                    </h5>
                                                    <span>
                                                        {mostrarEquipa
                                                            ? "−"
                                                            : "+"}
                                                    </span>
                                                </div>

                                                {mostrarEquipa && (
                                                    <div className="p-3 p-md-4">
                                                        {/* Obra */}
                                                        <div className="mb-3">
                                                            <label className="form-label fw-semibold small">
                                                                Local
                                                            </label>
                                                            <Select
                                                                options={
                                                                    opcoesObras
                                                                }
                                                                value={opcoesObras.find(
                                                                    (o) =>
                                                                        o.value ==
                                                                        obraSelecionada,
                                                                )}
                                                                onChange={(
                                                                    opcao,
                                                                ) =>
                                                                    setObraSelecionada(
                                                                        opcao.value,
                                                                    )
                                                                }
                                                                placeholder="Escolha a obra..."
                                                                classNamePrefix="react-select"
                                                                isClearable
                                                            />
                                                        </div>

                                                        {/* Data do Registo */}
                                                        <div className="mb-3">
                                                            <label className="form-label fw-semibold small">
                                                                Data do Registo:
                                                            </label>
                                                            <input
                                                                type="date"
                                                                className="form-control form-control-custom"
                                                                value={dataRegistoEquipa}
                                                                onChange={(e) => setDataRegistoEquipa(e.target.value)}
                                                                max={new Date().toISOString().split('T')[0]}
                                                            />
                                                            <small className="text-muted">
                                                                Selecione a data para registar pontos (hoje ou dias anteriores)
                                                            </small>
                                                        </div>

                                                        {/* Lista de Picagens do Membro Selecionado */}
                                                        {membrosSelecionados.length > 0 && (() => {
                                                            // Filtrar registos apenas dos membros selecionados
                                                            const registosFiltrados = registosEquipa.filter(reg =>
                                                                membrosSelecionados.includes(reg.user_id)
                                                            );

                                                            if (registosFiltrados.length === 0) {
                                                                return null;
                                                            }

                                                            return (
                                                                <div className="mb-3">
                                                                    <div className="card border-info">
                                                                        <div
                                                                            className="card-header bg-info text-white py-2"
                                                                            style={{ cursor: 'pointer' }}
                                                                            onClick={() => setPicagensExpandidas(!picagensExpandidas)}
                                                                        >
                                                                            <div className="d-flex justify-content-between align-items-center">
                                                                                <small className="fw-bold">
                                                                                    📋 Picagens de {formatarDataParaExibicao(dataRegistoEquipa)} ({registosFiltrados.length})
                                                                                </small>
                                                                                <span>{picagensExpandidas ? '▲' : '▼'}</span>
                                                                            </div>
                                                                        </div>
                                                                        {picagensExpandidas && (
                                                                            <div className="card-body p-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                                                {registosFiltrados.map((registo, idx) => (
                                                                                    <div key={idx} className="d-flex justify-content-between align-items-center border-bottom py-2 px-1">
                                                                                        <div className="flex-grow-1">
                                                                                            <small className="fw-bold">{registo.User?.nome || 'N/A'}</small>
                                                                                            <br />
                                                                                            <small className="text-muted">{registo.Obra?.nome || 'N/A'}</small>
                                                                                        </div>
                                                                                        <div className="text-end">
                                                                                            <span className={`badge ${registo.tipo === 'entrada' ? 'bg-success' : 'bg-danger'}`}>
                                                                                                {registo.tipo === 'entrada' ? '🟢 ENTRADA' : '🔴 SAÍDA'}
                                                                                            </span>
                                                                                            <br />
                                                                                            <small className="text-muted">
                                                                                                {new Date(registo.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                                                                            </small>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Membros da equipa com estado atual */}
                                                        <div className="mb-3">
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <label className="form-label fw-semibold small mb-0">
                                                                    Membros da
                                                                    Equipa
                                                                </label>
                                                            </div>

                                                            {(() => {
                                                                const userId =
                                                                    parseInt(
                                                                        secureStorage.getItem(
                                                                            "user_id",
                                                                        ),
                                                                    );
                                                                const userName =
                                                                    secureStorage.getItem(
                                                                        "nome",
                                                                    ) ||
                                                                    secureStorage.getItem(
                                                                        "username",
                                                                    ) ||
                                                                    "Eu";

                                                                const {
                                                                    estado,
                                                                    corEstado,
                                                                } =
                                                                    getEstadoMembro(
                                                                        userId,
                                                                        obraSelecionada,
                                                                        registosEquipa,
                                                                    );

                                                                const checked =
                                                                    membrosSelecionados.includes(
                                                                        userId,
                                                                    );

                                                                
                                                            })()}

                                                            {minhasEquipas.length ===
                                                            0 ? (
                                                                <p className="text-muted">
                                                                    Sem equipas
                                                                    associadas.
                                                                </p>
                                                            ) : (
                                                                minhasEquipas.map(
                                                                    (eq) => {
                                                                        const userId =
                                                                            parseInt(
                                                                                secureStorage.getItem(
                                                                                    "user_id",
                                                                                ),
                                                                            );
                                                                        const userName =
                                                                            secureStorage.getItem(
                                                                                "nome",
                                                                            ) ||
                                                                            secureStorage.getItem(
                                                                                "username",
                                                                            ) ||
                                                                            "Eu";

                                                                        // Filtrar membros para não incluir o utilizador logado
                                                                        const membrosRender =
                                                                            eq.membros.filter(
                                                                                (
                                                                                    m,
                                                                                ) =>
                                                                                    m.id !==
                                                                                    userId,
                                                                            );

                                                                        // Calcular estado do toggle da equipa (inclui "Eu")
                                                                        const idsEquipa =
                                                                            getIdsEquipa(
                                                                                eq,
                                                                            );
                                                                        const todosSelecionados =
                                                                            idsEquipa.every(
                                                                                (
                                                                                    id,
                                                                                ) =>
                                                                                    membrosSelecionados.includes(
                                                                                        id,
                                                                                    ),
                                                                            );

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    eq.id ??
                                                                                    eq.nome
                                                                                }
                                                                                className="mb-3"
                                                                            >
                                                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                                                    <h6 className="fw-bold text-primary mb-0">
                                                                                        {
                                                                                            eq.nome
                                                                                        }
                                                                                    </h6>
                                                                                    <button
                                                                                        type="button"
                                                                                        className={`btn btn-sm ${todosSelecionados ? "btn-outline-secondary" : "btn-outline-primary"}`}
                                                                                        onClick={() =>
                                                                                            toggleSelecionarTodosEquipa(
                                                                                                eq,
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {todosSelecionados
                                                                                            ? "Desselecionar equipa"
                                                                                            : "Selecionar equipa"}
                                                                                    </button>
                                                                                </div>

                                                                                {membrosRender.map(
                                                                                    (
                                                                                        m,
                                                                                    ) => {
                                                                                        const {
                                                                                            estado,
                                                                                            corEstado,
                                                                                        } =
                                                                                            getEstadoMembro(
                                                                                                m.id,
                                                                                                obraSelecionada,
                                                                                                registosEquipa,
                                                                                            );
                                                                                        const horasTrabalhadas = calcularHorasTrabalhadas(m.id, registosEquipa);
                                                                                        const checked =
                                                                                            membrosSelecionados.includes(
                                                                                                m.id,
                                                                                            );
                                                                                        return (
                                                                                            <div
                                                                                                key={
                                                                                                    m.id
                                                                                                }
                                                                                                className="border-bottom py-2"
                                                                                            >
                                                                                                <div className="d-flex justify-content-between align-items-center mb-2 ps-3">
                                                                                                    <div className="d-flex align-items-center">
                                                                                                        <input
                                                                                                            className="form-check-input me-2"
                                                                                                            type="checkbox"
                                                                                                            id={`membro-${m.id}`}
                                                                                                            checked={checked}
                                                                                                            onChange={(e) => {
                                                                                                                const isChecked = e.target.checked;
                                                                                                                setMembrosSelecionados(prev =>
                                                                                                                    isChecked
                                                                                                                        ? [...prev, m.id]
                                                                                                                        : prev.filter(id => id !== m.id)
                                                                                                                );
                                                                                                            }}
                                                                                                        />
                                                                                                        <label
                                                                                                            className="form-check-label mb-0"
                                                                                                            htmlFor={`membro-${m.id}`}
                                                                                                        >
                                                                                                            <span className="fw-semibold">{m.nome || `Membro ${m.id}`}</span>
                                                                                                            {' '}
                                                                                                            <small className="text-muted">({horasTrabalhadas})</small>
                                                                                                        </label>
                                                                                                    </div>
                                                                                                    <span className={`fw-semibold ${corEstado}`}>
                                                                                                        {estado}
                                                                                                    </span>
                                                                                                </div>
                                                                                                {checked && (
                                                                                                    <div className="ps-5 pe-3">
                                                                                                        <input
                                                                                                            type="time"
                                                                                                            className="form-control form-control-sm"
                                                                                                            value={horasEquipa[m.id] || ''}
                                                                                                            onChange={(e) => {
                                                                                                                setHorasEquipa(prev => ({
                                                                                                                    ...prev,
                                                                                                                    [m.id]: e.target.value
                                                                                                                }));
                                                                                                            }}
                                                                                                            placeholder="HH:MM"
                                                                                                        />
                                                                                                        <small className="text-muted">Hora do registo (opcional - se vazio usa hora atual)</small>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    },
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    },
                                                                )
                                                            )}
                                                        </div>

                                                        {/* Botões Entrada/Saída */}
                                                        <div className="row g-2">
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-success btn-action w-100"
                                                                    onClick={() =>
                                                                        handleRegistoEquipa(
                                                                            "entrada",
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !obraSelecionada ||
                                                                        membrosSelecionados.length ===
                                                                            0 ||
                                                                        loading
                                                                    }
                                                                >
                                                                    <FaPlay className="me-1" />{" "}
                                                                    ENTRADA
                                                                </button>
                                                            </div>
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-danger btn-action w-100"
                                                                    onClick={() =>
                                                                        handleRegistoEquipa(
                                                                            "saida",
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !obraSelecionada ||
                                                                        membrosSelecionados.length ===
                                                                            0 ||
                                                                        loading
                                                                    }
                                                                >
                                                                    <FaStop className="me-1" />{" "}
                                                                    SAÍDA
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <small className="text-muted d-block mt-2">
                                                            <strong>Nota:</strong> Selecione a data desejada para registar pontos (incluindo dias anteriores). Membros com hora definida: registo retroativo | Membros sem hora: registo em tempo real
                                                        </small>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Today's Records */}
                            <div
                                className="col-12 col-lg-4"
                                style={{ marginBottom: "50px" }}
                            >
                                <div className="card card-moderno">
                                    <div className="card-body p-3 p-md-4">
                                        <h5
                                            className="card-title d-flex align-items-center mb-3 mb-md-4"
                                            style={{
                                                fontSize:
                                                    "clamp(1rem, 3vw, 1.25rem)",
                                            }}
                                        >
                                            <FaClock className="text-primary me-2 flex-shrink-0" />
                                            <span className="d-none d-sm-inline">
                                                Registos de Hoje
                                            </span>
                                            <span className="d-sm-none">
                                                Hoje
                                            </span>
                                        </h5>

                                        <div
                                            style={{
                                                maxHeight: "400px",
                                                overflowY: "auto",
                                            }}
                                            className="custom-scroll"
                                        >
                                            {registos.length === 0 ? (
                                                <div className="text-center py-4">
                                                    <FaExclamationCircle
                                                        className="text-muted mb-3"
                                                        size={32}
                                                    />
                                                    <p className="text-muted mb-0">
                                                        Nenhum registo
                                                        encontrado para hoje
                                                    </p>
                                                </div>
                                            ) : (
                                                [...registos]
                                                    .sort(
                                                        (a, b) =>
                                                            new Date(
                                                                b.timestamp ||
                                                                    b.createdAt,
                                                            ) -
                                                            new Date(
                                                                a.timestamp ||
                                                                    a.createdAt,
                                                            ),
                                                    )
                                                    .map((r, i) => (
                                                        <div
                                                            key={i}
                                                            className={`registro-item ${r.tipo === "saida" ? "registro-saida" : ""}`}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <div className="flex-grow-1">
                                                                    <div className="d-flex align-items-center mb-1">
                                                                        {r.tipo ===
                                                                        "entrada" ? (
                                                                            <FaPlay className="text-success me-2" />
                                                                        ) : (
                                                                            <FaStop className="text-danger me-2" />
                                                                        )}
                                                                        <span className="fw-bold text-uppercase small">
                                                                            {
                                                                                r.tipo
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <small className="text-muted d-block">
                                                                        {new Date(
                                                                            r.timestamp ||
                                                                                r.createdAt,
                                                                        ).toLocaleString(
                                                                            "pt-PT",
                                                                            {
                                                                                hour: "2-digit",
                                                                                minute: "2-digit",
                                                                                day: "2-digit",
                                                                                month: "2-digit",
                                                                            },
                                                                        )}
                                                                    </small>
                                                                </div>
                                                                <FaCheckCircle className="text-success" />
                                                            </div>

                                                            <div className="mb-2">
                                                                <span className="fw-semibold text-primary">
                                                                    {
                                                                        r.Obra
                                                                            ?.nome
                                                                    }
                                                                </span>
                                                            </div>

                                                            {r.morada && (
                                                                <div className="d-flex align-items-start">
                                                                    <FaMapMarkerAlt
                                                                        className="text-muted me-2 mt-1 flex-shrink-0"
                                                                        size={
                                                                            12
                                                                        }
                                                                    />
                                                                    <small className="text-muted text-truncate">
                                                                        {
                                                                            r.morada
                                                                        }
                                                                    </small>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Mudança de Obra */}
            {showMudancaObraModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10000,
                        padding: "1rem",
                    }}
                    onClick={() => {
                        setShowMudancaObraModal(false);
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "white",
                            borderRadius: "8px",
                            maxWidth: "450px",
                            width: "100%",
                            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                            animation: "modalSlideIn 0.3s ease-out",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div
                            style={{
                                borderBottom: "1px solid #e9ecef",
                                padding: "1.25rem 1.5rem",
                            }}
                        >
                            <h3
                                style={{
                                    color: "#212529",
                                    fontSize: "1.125rem",
                                    fontWeight: "500",
                                    margin: 0,
                                }}
                            >
                                Mudança de Obra
                            </h3>
                        </div>

                        {/* Body */}
                        <div style={{ padding: "1.5rem" }}>
                            <p
                                style={{
                                    fontSize: "0.9rem",
                                    color: "#6c757d",
                                    marginBottom: "0.5rem",
                                }}
                            >
                                Entrada ativa em: <strong>{mudancaObraData.obraAtualNome}</strong>
                            </p>
                            <p
                                style={{
                                    fontSize: "0.9rem",
                                    color: "#6c757d",
                                    marginBottom: "1.25rem",
                                }}
                            >
                                Pretende entrar em: <strong>{mudancaObraData.novaObraNome}</strong>
                            </p>

                            {/* Botões de Ação */}
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.625rem",
                                }}
                            >
                                <button
                                    className="btn"
                                    style={{
                                        backgroundColor: "#28a745",
                                        border: "none",
                                        borderRadius: "4px",
                                        padding: "0.75rem 1rem",
                                        color: "white",
                                        fontSize: "0.875rem",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                        transition: "background-color 0.2s",
                                    }}
                                    onClick={() => mudancaObraData.onConfirm("mudar")}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#218838";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#28a745";
                                    }}
                                >
                                    Mudar de Obra
                                </button>

                                <button
                                    className="btn"
                                    style={{
                                        backgroundColor: "#ffc107",
                                        border: "none",
                                        borderRadius: "4px",
                                        padding: "0.75rem 1rem",
                                        color: "#212529",
                                        fontSize: "0.875rem",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                        transition: "background-color 0.2s",
                                    }}
                                    onClick={() => mudancaObraData.onConfirm("sair")}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#e0a800";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#ffc107";
                                    }}
                                >
                                    Apenas Sair
                                </button>

                                <button
                                    className="btn"
                                    style={{
                                        backgroundColor: "#f8f9fa",
                                        border: "1px solid #dee2e6",
                                        borderRadius: "4px",
                                        padding: "0.75rem 1rem",
                                        color: "#6c757d",
                                        fontSize: "0.875rem",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                        transition: "background-color 0.2s",
                                    }}
                                    onClick={() => {
                                        setShowMudancaObraModal(false);
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#e9ecef";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                                    }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistoPontoObra;
