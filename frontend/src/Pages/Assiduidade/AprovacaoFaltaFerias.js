import React, { useEffect, useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    FaCheckCircle,
    FaTimesCircle,
    FaClock,
    FaUser,
    FaCalendarAlt,
    FaFilter,
    FaSync,
    FaPlus,
    FaCalendarPlus,
    FaTrashAlt,
    FaEdit,
} from "react-icons/fa";

const AprovacaoFaltaFerias = () => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [estadoFiltro, setEstadoFiltro] = useState("pendentes");

    const token = localStorage.getItem("loginToken");
    const painelToken = localStorage.getItem("painelAdminToken");
    const urlempresa = localStorage.getItem("urlempresa");
    const userNome = localStorage.getItem("userNome");
    const empresaId = localStorage.getItem("empresa_id");

    const [todosPedidos, setTodosPedidos] = useState([]);
    const [colaboradorFiltro, setColaboradorFiltro] = useState("");
    const tipoUser = localStorage.getItem("tipoUser");
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    const [colaboradoresEquipa, setColaboradoresEquipa] = useState([]);
    const [tiposFalta, setTiposFalta] = useState([]);
    const [mapaFaltas, setMapaFaltas] = useState({});
    const [minhasEquipas, setMinhasEquipas] = useState([]);

    const [operacaoFiltro, setOperacaoFiltro] = useState("");

    const getOperacaoInfo = (op) => {
        const o = (op || "CRIAR").toUpperCase();
        if (o === "CANCELAR")
            return {
                key: "cancelar",
                label: "Cancelar",
                className: "badge-op-cancelar",
                Icon: FaTrashAlt,
            };
        if (o === "EDITAR")
            return {
                key: "editar",
                label: "Editar",
                className: "badge-op-editar",
                Icon: FaEdit,
            };
        return {
            key: "agendar",
            label: "Agendar",
            className: "badge-op-agendar",
            Icon: FaCalendarPlus,
        };
    };

    const [novaFaltaEquipa, setNovaFaltaEquipa] = useState({
        funcionario: "",
        Falta: "",
        Data: "",
        Horas: false,
        Tempo: 1,
        Observacoes: "",
        DescontaAlimentacao: false,
        DescontaSubsidioTurno: false,
    });

    // ✅ NOVO: estado para controlar quando os nomes estão prontos
    const [nomesProntos, setNomesProntos] = useState(false);

    // ✅ NOVO: cache de nomes persistente entre renders
    const cacheNomesRef = useRef({});

    // Helper para obter descrição de uma falta
    const getDescricaoFalta = (cod) => mapaFaltas?.[cod] ?? "";

    useEffect(() => {
        carregarColaboradoresEquipa();
        carregarTiposFaltaEquipa();
    }, []);

    const rangeDatas = (iniISO, fimISO) => {
        const res = [];
        if (!iniISO || !fimISO) return res;
        let d = new Date(iniISO);
        const f = new Date(fimISO);
        while (d <= f) {
            res.push(d.toISOString().split("T")[0]);
            d.setDate(d.getDate() + 1);
        }
        return res;
    };

    const eliminarFeriasEFaltasDoDia = async (funcionario, dataISO) => {
        const urlFeria = `https://webapiprimavera.advir.pt/routesFaltas/EliminarFeriasFuncionario/${funcionario}/${dataISO}`;
        const urlF50 = `https://webapiprimavera.advir.pt/routesFaltas/EliminarFalta/${funcionario}/${dataISO}/F50`;
        const urlF40 = `https://webapiprimavera.advir.pt/routesFaltas/EliminarFalta/${funcionario}/${dataISO}/F40`;

        // tenta apagar todos; ignora erros individuais
        for (const url of [urlFeria, urlF50, urlF40]) {
            try {
                await fetch(url, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${painelToken}`,
                        urlempresa,
                        "Content-Type": "application/json",
                    },
                });
            } catch (e) {
                console.warn("Ignorado ao eliminar:", url, e);
            }
        }
    };

    const toISODate = (d) => {
        const x = new Date(d);
        const y = x.getFullYear();
        const m = String(x.getMonth() + 1).padStart(2, "0");
        const day = String(x.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`; // formato que o endpoint espera
    };

    const eliminarFaltaDoDia = async (funcionario, dataISO, codigoFalta) => {
        const url = `https://webapiprimavera.advir.pt/routesFaltas/EliminarFalta/${funcionario}/${dataISO}/${codigoFalta}`;
        try {
            const r = await fetch(url, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${painelToken}`,
                    urlempresa,
                    "Content-Type": "application/json",
                },
            });
            if (!r.ok) {
                console.warn(
                    "Falha ao eliminar falta:",
                    codigoFalta,
                    dataISO,
                    await r.text(),
                );
            }
        } catch (e) {
            console.error("Erro ao eliminar falta", codigoFalta, dataISO, e);
        }
    };

    const inserirFeriasEFaltasDoDia = async (
        funcionario,
        dataISO,
        horasFlag,
        tempo,
        observ,
    ) => {
        // Faltas associadas às férias: F50 (gozo) e F40 (subs.alim) salvo se for por horas
        const faltas = horasFlag ? ["F40"] : ["F50", "F40"];

        for (const faltaCod of faltas) {
            const dadosFalta = {
                Funcionario: funcionario,
                Data: `${dataISO} 00:00:00`,
                Falta: faltaCod,
                Horas: horasFlag ? 1 : 0,
                Tempo: tempo,
                DescontaVenc: 0,
                DescontaRem: 0,
                ExcluiProc: 0,
                ExcluiEstat: 0,
                Observacoes: observ || "",
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
                SubAlimProporcional: 0,
            };

            try {
                await fetch(
                    "https://webapiprimavera.advir.pt/routesFaltas/InserirFalta",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${painelToken}`,
                            urlempresa,
                        },
                        body: JSON.stringify(dadosFalta),
                    },
                );
            } catch (e) {
                console.warn("Ignorado ao inserir falta", faltaCod, dataISO, e);
            }
        }

        // Marcações de férias
        const dadosFerias = {
            Funcionario: funcionario,
            DataFeria: dataISO,
            EstadoGozo: 0,
            OriginouFalta: 1,
            TipoMarcacao: 1,
            OriginouFaltaSubAlim: 1,
            Duracao: tempo,
            Acerto: 0,
            NumProc: null,
            Origem: 0,
        };

        try {
            await fetch(
                "https://webapiprimavera.advir.pt/routesFaltas/InserirFeriasFuncionario",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${painelToken}`,
                        urlempresa,
                    },
                    body: JSON.stringify(dadosFerias),
                },
            );
        } catch (e) {
            console.warn("Ignorado ao inserir férias", dataISO, e);
        }
    };

    const aprovarPedido = async (pedido) => {
        try {
            //console.log('Iniciando aprovação do pedido:', pedido.id);

            // 1) marca como aprovado no backend
            const res = await fetch(
                `https://backend.advir.pt/api/faltas-ferias/aprovacao/${pedido.id}/aprovar`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        urlempresa: empresaId,
                    },
                    body: JSON.stringify({
                        aprovadoPor: userNome,
                        observacoesResposta: "Aprovado.",
                    }),
                },
            );

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Erro na resposta do servidor:", errorText);
                alert("Erro ao aprovar: " + errorText);
                return;
            }

            //console.log('Pedido marcado como aprovado no backend');

            // 2) executa ação no ERP conforme tipo/operacao
            if (pedido.tipoPedido === "FERIAS") {
                const horasFlag = !!pedido.horas;
                const tempo = pedido.tempo || 1;
                const observ = pedido.justificacao || "";

                if (pedido.operacao === "CRIAR") {
                    for (const dia of rangeDatas(
                        pedido.dataInicio,
                        pedido.dataFim,
                    )) {
                        await inserirFeriasEFaltasDoDia(
                            pedido.funcionario,
                            dia,
                            horasFlag,
                            tempo,
                            observ,
                        );
                    }
                }

                if (pedido.operacao === "CANCELAR") {
                    for (const dia of rangeDatas(
                        pedido.dataInicio,
                        pedido.dataFim,
                    )) {
                        await eliminarFeriasEFaltasDoDia(
                            pedido.funcionario,
                            dia,
                        );
                    }
                }

                if (pedido.operacao === "EDITAR") {
                    // 2.1 remove intervalo original
                    for (const dia of rangeDatas(
                        pedido.dataInicioOriginal,
                        pedido.dataFimOriginal,
                    )) {
                        await eliminarFeriasEFaltasDoDia(
                            pedido.funcionario,
                            dia,
                        );
                    }
                    // 2.2 insere novo intervalo
                    for (const dia of rangeDatas(
                        pedido.dataInicio,
                        pedido.dataFim,
                    )) {
                        await inserirFeriasEFaltasDoDia(
                            pedido.funcionario,
                            dia,
                            horasFlag,
                            tempo,
                            observ,
                        );
                    }
                }
            }

            // FALTA (sem alterações): já tens o fluxo de inserção
            if (pedido.tipoPedido === "FALTA") {
                const dataISO = toISODate(pedido.dataPedido);

                if (!pedido.operacao || pedido.operacao === "CRIAR") {
                    // Inserção (igual tinhas)
                    const dadosFalta = {
                        Funcionario: pedido.funcionario,
                        Data: `${toISODate(pedido.dataPedido)} 00:00:00`,
                        Falta: pedido.falta,
                        Horas: pedido.horas,
                        Tempo: pedido.tempo,
                        DescontaVenc: 0,
                        DescontaRem: 0,
                        ExcluiProc: 0,
                        ExcluiEstat: 0,
                        Observacoes: pedido.justificacao,
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
                        SubAlimProporcional: 0,
                    };
                    await fetch(
                        `https://webapiprimavera.advir.pt/routesFaltas/InserirFalta`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${painelToken}`,
                                urlempresa,
                            },
                            body: JSON.stringify(dadosFalta),
                        },
                    );
                }

                if (pedido.operacao === "CANCELAR") {
                    // Apaga exatamente a falta pedida (ex.: F01, F10, F40, …)
                    await eliminarFaltaDoDia(
                        pedido.funcionario,
                        dataISO,
                        pedido.falta,
                    );
                }

                if (pedido.operacao === "EDITAR") {
                    // Opcional: remove a original e volta a inserir com os novos dados
                    const dataOrigISO = toISODate(
                        pedido.dataPedidoOriginal || pedido.dataPedido,
                    );
                    await eliminarFaltaDoDia(
                        pedido.funcionario,
                        dataOrigISO,
                        pedido.faltaOriginal || pedido.falta,
                    );
                    // …depois chama a mesma lógica de CRIAR com os novos campos do pedido
                    const dadosFalta = {
                        Funcionario: pedido.funcionario,
                        Data: new Date(pedido.dataPedido).toISOString(),
                        Falta: pedido.falta,
                        Horas: pedido.horas,
                        Tempo: pedido.tempo,
                        DescontaVenc: 0,
                        DescontaRem: 0,
                        ExcluiProc: 0,
                        ExcluiEstat: 0,
                        Observacoes: pedido.justificacao,
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
                        SubAlimProporcional: 0,
                    };
                    await fetch(
                        `https://webapiprimavera.advir.pt/routesFaltas/InserirFalta`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${painelToken}`,
                                urlempresa,
                            },
                            body: JSON.stringify(dadosFalta),
                        },
                    );
                }
            }

            //console.log('Ações no ERP executadas com sucesso');
            alert("Pedido aprovado e registado com sucesso.");
            await carregarTodosPedidos();
        } catch (err) {
            console.error("Erro detalhado ao aprovar:", err);
            alert(
                "Erro inesperado ao aprovar: " +
                    (err.message || "Erro desconhecido"),
            );
        }
    };

    const carregarColaboradoresEquipa = async () => {
        try {
            let membros = [];

            if (tipoUser === "Administrador") {
                const res = await fetch(
                    `https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${empresaId}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );
                if (!res.ok) throw new Error("Erro ao obter utilizadores");
                const data = await res.json();
                membros = data.map((u) => ({
                    codigo: u.id,
                    nome: u.nome             }));
            } else {
                const res = await fetch(
                    "https://backend.advir.pt/api/equipa-obra/minhas-agrupadas",
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );
                const data = await res.json();
                membros = data.flatMap((equipa) =>
                    equipa.membros.map((m) => ({
                        codigo: m.id,
                        nome: m.nome,
                    })),
                );
            }

            setColaboradoresEquipa(membros);
        } catch (err) {
            console.error("Erro ao carregar colaboradores:", err);
            setColaboradoresEquipa([]);
        }
    };

    const obterCodFuncionario = async (userId) => {
        try {
            const res = await fetch(
                `https://backend.advir.pt/api/users/${userId}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        urlempresa,
                    },
                },
            );
            if (!res.ok) throw new Error("Erro ao obter codFuncionario");
            const data = await res.json();
            return data.codFuncionario;
        } catch (err) {
            console.error("Erro ao obter codFuncionario:", err);
            return null;
        }
    };

    const carregarTiposFaltaEquipa = async () => {
        try {
            const res = await fetch(
                `https://webapiprimavera.advir.pt/routesFaltas/GetListaTipoFaltas`,
                {
                    headers: {
                        Authorization: `Bearer ${painelToken}`,
                        urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );

            const data = await res.json();
            const lista = data?.DataSet?.Table ?? [];
            setTiposFalta(lista);

            // Mapa código -> descrição
            const mapa = Object.fromEntries(
                lista.map((f) => [f.Falta, f.Descricao]),
            );
            setMapaFaltas(mapa);
        } catch (err) {
            console.error("Erro ao carregar tipos de falta:", err);
        }
    };

    const submeterFaltaEquipa = async (e) => {
        e.preventDefault();

        if (
            !novaFaltaEquipa.funcionario ||
            !novaFaltaEquipa.Falta ||
            !novaFaltaEquipa.Data
        ) {
            alert("Seleciona colaborador, tipo de falta e data.");
            return;
        }

        // obter codFuncionario
        const codFuncionario = await obterCodFuncionario(
            novaFaltaEquipa.funcionario,
        );
        if (!codFuncionario) {
            alert("Erro ao obter funcionário associado.");
            return;
        }

        try {
            // 1. Inserir falta diretamente no ERP
            const dadosERP = {
                Funcionario: codFuncionario,
                Data: `${novaFaltaEquipa.Data} 00:00:00`,
                Falta: novaFaltaEquipa.Falta,
                Horas: novaFaltaEquipa.Horas ? 1 : 0,
                Tempo: novaFaltaEquipa.Tempo,
                DescontaVenc: 0,
                DescontaRem: 0,
                ExcluiProc: 0,
                ExcluiEstat: 0,
                Observacoes: novaFaltaEquipa.Observacoes,
                CalculoFalta: 1,
                DescontaSubsAlim: novaFaltaEquipa.DescontaAlimentacao ? 1 : 0,
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
                DescontaSubsTurno: novaFaltaEquipa.DescontaSubsidioTurno ? 1 : 0,
                SubTurnoProporcional: 0,
                SubAlimProporcional: 0,
            };

            console.log("📤 Inserindo falta no ERP:", dadosERP);

            const resERP = await fetch(
                `https://webapiprimavera.advir.pt/routesFaltas/InserirFalta`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${painelToken}`,
                        urlempresa,
                    },
                    body: JSON.stringify(dadosERP),
                }
            );

            if (!resERP.ok) {
                const errorText = await resERP.text();
                console.error("❌ Erro ao inserir no ERP:", errorText);
                alert("Erro ao registar falta no ERP: " + errorText);
                return;
            }

            console.log("✅ Falta inserida no ERP com sucesso");

            // 2. Criar pedido de aprovação no backend (para histórico)
            const dataPedidoISO = `${novaFaltaEquipa.Data} 00:00:00`;
            const dados = {
                tipoPedido: "FALTA",
                operacao: "CRIAR",
                funcionario: codFuncionario,
                empresaId: localStorage.getItem("empresa_id"),
                dataPedido: dataPedidoISO,
                falta: novaFaltaEquipa.Falta,
                horas: novaFaltaEquipa.Horas ? 1 : 0,
                tempo: novaFaltaEquipa.Tempo,
                justificacao: novaFaltaEquipa.Observacoes,
                observacoes: "",
                usuarioCriador: localStorage.getItem("codFuncionario"),
                origem: "ENCARREGADO",
                descontaAlimentacao: novaFaltaEquipa.DescontaAlimentacao ? 1 : 0,
                descontaSubsidioTurno: novaFaltaEquipa.DescontaSubsidioTurno ? 1 : 0,
            };

            const res = await fetch(
                `https://backend.advir.pt/api/faltas-ferias/aprovacao`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        urlempresa,
                    },
                    body: JSON.stringify(dados),
                }
            );

            if (res.ok) {
                const resposta = await res.json();
                console.log("✅ Pedido criado no backend:", resposta);
                
                // 3. Aprovar automaticamente o pedido
                await fetch(
                    `https://backend.advir.pt/api/faltas-ferias/aprovacao/${resposta.id}/aprovar`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                            urlempresa: empresaId,
                        },
                        body: JSON.stringify({
                            aprovadoPor: userNome,
                            observacoesResposta: "Aprovado automaticamente (inserção direta)",
                        }),
                    }
                );

                alert("Falta registada com sucesso no ERP!");
                setNovaFaltaEquipa({
                    funcionario: "",
                    Falta: "",
                    Data: "",
                    Horas: false,
                    Tempo: 1,
                    Observacoes: "",
                    DescontaAlimentacao: false,
                    DescontaSubsidioTurno: false,
                });
                await carregarTodosPedidos();
            } else {
                const errorText = await res.text();
                console.warn("⚠️ Falta inserida no ERP mas erro ao criar pedido:", errorText);
                alert("Falta inserida no ERP com sucesso!");
                setNovaFaltaEquipa({
                    funcionario: "",
                    Falta: "",
                    Data: "",
                    Horas: false,
                    Tempo: 1,
                    Observacoes: "",
                    DescontaAlimentacao: false,
                    DescontaSubsidioTurno: false,
                });
            }
        } catch (err) {
            console.error("❌ Erro ao submeter falta:", err);
            alert("Erro inesperado: " + err.message);
        }
    };

    // ✅ NOVO: função para obter nome com cache persistente
    const obterNomeFuncionario = async (codFuncionario) => {
        const cache = cacheNomesRef.current;
        if (cache[codFuncionario]) {
            return cache[codFuncionario];
        }

        try {
            const res = await fetch(
                `https://webapiprimavera.advir.pt/routesFaltas/GetNomeFuncionario/${codFuncionario}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${painelToken}`,
                        urlempresa,
                    },
                },
            );

            if (res.ok) {
                const data = await res.json();
                const nome = data?.DataSet?.Table?.[0]?.Nome || codFuncionario;
                cache[codFuncionario] = nome;
                return nome;
            } else {
                console.warn(
                    `Erro ao obter nome do funcionário ${codFuncionario}`,
                );
                cache[codFuncionario] = codFuncionario;
                return codFuncionario;
            }
        } catch (err) {
            console.error("Erro ao obter nome do funcionário:", err);
            cache[codFuncionario] = codFuncionario;
            return codFuncionario;
        }
    };

    // ✅ NOVO: enriquecer listas com nomes, antes de setar estado
    const enriquecerComNomes = async (lista) => {
        if (!lista || lista.length === 0) return lista;

        const funcionariosUnicos = [
            ...new Set(lista.map((p) => p.funcionario)),
        ];
        //console.log('Carregando nomes para funcionários:', funcionariosUnicos);

        // Carregar todos os nomes sequencialmente para garantir consistência
        const mapaNomes = {};
        for (const cod of funcionariosUnicos) {
            const nome = await obterNomeFuncionario(cod);
            mapaNomes[cod] = nome;
            //console.log(`Nome carregado para ${cod}: ${nome}`);
        }

        const listaEnriquecida = lista.map((p) => ({
            ...p,
            nomeFuncionario: mapaNomes[p.funcionario] || p.funcionario,
        }));

        //console.log('Lista enriquecida com nomes:', listaEnriquecida.map(p => ({ id: p.id, funcionario: p.funcionario, nomeFuncionario: p.nomeFuncionario })));
        return listaEnriquecida;
    };

    const carregarTodosPedidos = async () => {
        try {
            setLoading(true);
            setNomesProntos(false); // <- bloqueia render até terminar todo o fluxo
            //console.log('Iniciando carregamento de todos os pedidos...');

            const [resPendentes, resAprovados, resRejeitados] =
                await Promise.all([
                    fetch(
                        `https://backend.advir.pt/api/faltas-ferias/aprovacao/pendentes`,
                        {
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                                urlempresa: empresaId,
                            },
                        },
                    ),
                    fetch(
                        `https://backend.advir.pt/api/faltas-ferias/aprovacao/aprovados`,
                        {
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                                urlempresa: empresaId,
                            },
                        },
                    ),
                    fetch(
                        `https://backend.advir.pt/api/faltas-ferias/aprovacao/rejeitados`,
                        {
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                                urlempresa: empresaId,
                            },
                        },
                    ),
                ]);

            const [pendentes, aprovados, rejeitados] = await Promise.all([
                resPendentes.ok ? resPendentes.json() : [],
                resAprovados.ok ? resAprovados.json() : [],
                resRejeitados.ok ? resRejeitados.json() : [],
            ]);

            //console.log('Dados recebidos:', { pendentes: pendentes.length, aprovados: aprovados.length, rejeitados: rejeitados.length });

            // Enriquecer com nomes ANTES de definir qualquer estado
            const todos = await enriquecerComNomes([
                ...pendentes,
                ...aprovados,
                ...rejeitados,
            ]);
            //console.log('Todos os pedidos enriquecidos:', todos.length);

            // Apenas após ter todos os nomes carregados, definir os estados
            setTodosPedidos(todos);

            const pedidosFiltrados = todos.filter((p) => {
                if (estadoFiltro === "pendentes")
                    return p.estadoAprovacao === "Pendente";
                if (estadoFiltro === "aprovados")
                    return p.estadoAprovacao === "Aprovado";
                if (estadoFiltro === "rejeitados")
                    return p.estadoAprovacao === "Rejeitado";
                return true;
            });

            setPedidos(pedidosFiltrados);

            // Só liberar o render depois que tudo estiver pronto
            setNomesProntos(true);
            //console.log('✅ Nomes carregados e estados definidos. Liberando render...');
        } catch (err) {
            console.error("Erro ao carregar todos os pedidos:", err);
            setNomesProntos(true); // Liberar render mesmo com erro para não ficar bloqueado
        } finally {
            setLoading(false);
        }
    };

    const carregarPedidos = async (estado = "pendentes") => {
        if (todosPedidos.length > 0) {
            const pedidosFiltrados = todosPedidos.filter((p) => {
                if (estado === "pendentes")
                    return p.estadoAprovacao === "Pendente";
                if (estado === "aprovados")
                    return p.estadoAprovacao === "Aprovado";
                if (estado === "rejeitados")
                    return p.estadoAprovacao === "Rejeitado";
                return true;
            });
            setPedidos(pedidosFiltrados);
            return;
        }

        setLoading(true);
        setNomesProntos(false); // Bloquear render até nomes serem carregados

        let endpoint = "pendentes";
        if (estado === "aprovados") endpoint = "aprovados";
        if (estado === "rejeitados") endpoint = "rejeitados";

        try {
            //console.log(`Carregando pedidos para estado: ${estado}`);

            const res = await fetch(
                `https://backend.advir.pt/api/faltas-ferias/aprovacao/${endpoint}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        urlempresa,
                    },
                },
            );

            if (res.ok) {
                const data = await res.json();
                //console.log(`Dados recebidos para ${estado}:`, data.length);

                // Enriquecer com nomes ANTES de definir estados
                const pedidosComNome = await enriquecerComNomes(data);

                setPedidos(pedidosComNome);
                setTodosPedidos(pedidosComNome);

                // Só liberar render após nomes carregados
                setNomesProntos(true);
                //console.log(`✅ Pedidos ${estado} carregados com nomes`);
            } else {
                console.error("Erro ao carregar pedidos");
                setNomesProntos(true); // Liberar render mesmo com erro
            }
        } catch (err) {
            console.error("Erro:", err);
            setNomesProntos(true); // Liberar render mesmo com erro
        } finally {
            setLoading(false);
        }
    };

    const formatarData = (data) => {
        if (!data) return "-";
        return new Date(data).toLocaleDateString("pt-PT");
    };

    useEffect(() => {
        carregarTodosPedidos();
    }, []);

    useEffect(() => {
        if (todosPedidos.length > 0) {
            carregarPedidos(estadoFiltro);
        }
    }, [estadoFiltro, todosPedidos]);

    const confirmarPedido = async (pedido) => {
        const tipoUser = localStorage.getItem("tipoUser");

        if (!confirm("Tem certeza que deseja aprovar este pedido?")) {
            return;
        }

        setLoading(true);

        try {
            if (tipoUser === "Encarregado") {
                const confirmarN1 = await fetch(
                    `https://backend.advir.pt/api/faltas-ferias/aprovacao/${pedido.id}/confirmar-nivel1`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                            urlempresa: empresaId,
                        },
                        body: JSON.stringify({ confirmadoPor1: userNome }),
                    },
                );

                if (confirmarN1.ok) {
                    alert(
                        "Confirmação enviada com sucesso. Aguarda validação da administração.",
                    );
                    await carregarTodosPedidos();
                } else {
                    const errorText = await confirmarN1.text();
                    alert("Erro ao confirmar como encarregado: " + errorText);
                }
                return;
            }

            if (tipoUser === "Administrador" || tipoUser === "Diretor") {
                // Para administradores e diretores, aprovar diretamente
                await aprovarPedido(pedido);
            }
        } catch (err) {
            console.error("Erro ao confirmar:", err);
            alert("Erro inesperado ao confirmar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const rejeitarPedido = async (id) => {
        if (!confirm("Tem certeza que deseja rejeitar este pedido?")) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(
                `https://backend.advir.pt/api/faltas-ferias/aprovacao/${id}/rejeitar`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        urlempresa: empresaId,
                    },
                    body: JSON.stringify({
                        observacoesResposta: "Rejeitado por " + userNome + ".",
                    }),
                },
            );

            if (res.ok) {
                alert("Pedido rejeitado com sucesso.");
                await carregarTodosPedidos();
            } else {
                const errorText = await res.text();
                alert("Erro ao rejeitar: " + errorText);
            }
        } catch (err) {
            console.error("Erro ao rejeitar:", err);
            alert("Erro inesperado ao rejeitar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const contarPorEstado = (estado) => {
        switch (estado) {
            case "Pendente":
                return todosPedidos.filter(
                    (p) => p.estadoAprovacao === "Pendente",
                ).length;
            case "Aprovado":
                return todosPedidos.filter(
                    (p) => p.estadoAprovacao === "Aprovado",
                ).length;
            case "Rejeitado":
                return todosPedidos.filter(
                    (p) => p.estadoAprovacao === "Rejeitado",
                ).length;
            default:
                return todosPedidos.length;
        }
    };

    // ✅ NOVO: bloquear renderização total até os nomes estarem prontos
    if (!nomesProntos) {
        return (
            <div
                className="loading-overlay"
                style={{ backgroundColor: "#d4e4ff" }}
            >
                <div
                    className="spinner-border text-primary"
                    role="status"
                    style={{ width: "3rem", height: "3rem" }}
                >
                    <span className="visually-hidden">Carregando...</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="container-fluid bg-light min-vh-100 py-2 py-md-4"
            style={{
                overflowX: "hidden",
                background:
                    "linear-gradient(to bottom, #e3f2fd, #bbdefb, #90caf9)",
            }}
        >
            <style jsx>{`
                body {
                    overflow-x: hidden;
                }
                .card-moderno {
                    border-radius: 15px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    border: none;
                    margin-bottom: 1rem;
                    transition: all 0.3s ease;
                }
                .card-moderno:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }
                .form-moderno {
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }
                .form-moderno:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
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
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    backgroundcolor: "#d4e4ff";
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .pedido-card {
                    transition: all 0.3s ease;
                    height: 100%;
                }
                .pedido-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }
                .status-badge {
                    font-size: 0.75rem;
                    padding: 0.4rem 0.8rem;
                    border-radius: 20px;
                    font-weight: 600;
                }
                .kpi-card {
                    background: white;
                    border-radius: 12px;
                    padding: 1.5rem;
                    text-align: center;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
                    border: none;
                    transition: all 0.3s ease;
                }
                .kpi-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
                }
                .kpi-icon {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                }
                .kpi-number {
                    font-size: 2rem;
                    font-weight: bold;
                    margin: 0;
                    line-height: 1;
                }
                .kpi-label {
                    color: #6c757d;
                    font-size: 0.875rem;
                    margin: 0;
                    margin-top: 0.25rem;
                }
                @media (max-width: 767px) {
                    .kpi-card {
                        padding: 1rem;
                    }
                    .kpi-icon {
                        font-size: 1.5rem;
                    }
                    .kpi-number {
                        font-size: 1.5rem;
                    }
                }
                /* Op badges e destaque do card por operação */
                .badge-op-agendar {
                    background: #0dcaf0;
                    color: #052c3b;
                }
                .badge-op-cancelar {
                    background: #6c757d;
                }
                .badge-op-editar {
                    background: #6610f2;
                }
                .card-op-agendar {
                    border-top: 4px solid #0dcaf0;
                }
                .card-op-cancelar {
                    border-top: 4px solid #6c757d;
                }
                .card-op-editar {
                    border-top: 4px solid #6610f2;
                }
            `}</style>

            {loading && (
                <div className="loading-overlay">
                    <div
                        className="spinner-border text-primary"
                        role="status"
                        style={{
                            width: "3rem",
                            height: "3rem",
                            backgroundColor: "#d4e4ff",
                        }}
                    >
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                </div>
            )}

            <div className="row justify-content-center">
                <div className="col-12 col-xl-11">
                    {/* Header */}
                    <div className="card card-moderno mb-3 mb-md-4">
                        <div className="card-body text-center py-3 py-md-4">
                            <h1 className="h4 h3-md mb-2 text-primary">
                                <FaCheckCircle className="me-2 me-md-3" />
                                <span className="d-none d-sm-inline">
                                    Aprovação de Faltas e Férias
                                </span>
                                <span className="d-sm-none">Aprovações</span>
                            </h1>
                            <p className="text-muted mb-0 small">
                                Gerencie pedidos de faltas e férias dos
                                colaboradores
                            </p>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="row g-3 mb-4">
                        <div className="col-6 col-md-3">
                            <div className="kpi-card">
                                <div className="kpi-icon text-primary">
                                    <FaClock />
                                </div>
                                <h3 className="kpi-number text-primary">
                                    {contarPorEstado("Pendente")}
                                </h3>
                                <p className="kpi-label">Pendentes</p>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="kpi-card">
                                <div className="kpi-icon text-primary">
                                    <FaCheckCircle />
                                </div>
                                <h3 className="kpi-number text-primary">
                                    {contarPorEstado("Aprovado")}
                                </h3>
                                <p className="kpi-label">Aprovados</p>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="kpi-card">
                                <div className="kpi-icon text-primary">
                                    <FaTimesCircle />
                                </div>
                                <h3 className="kpi-number text-primary">
                                    {contarPorEstado("Rejeitado")}
                                </h3>
                                <p className="kpi-label">Rejeitados</p>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="kpi-card">
                                <div className="kpi-icon text-primary">
                                    <FaCalendarAlt />
                                </div>
                                <h3 className="kpi-number text-primary">
                                    {todosPedidos.length}
                                </h3>
                                <p className="kpi-label">Total</p>
                            </div>
                        </div>
                    </div>

                    {["Encarregado", "Diretor", "Administrador"].includes(
                        tipoUser,
                    ) && (
                        <>
                            <div className="card card-moderno mb-4">
                                <div className="card-body">
                                    <h5 className="text-primary fw-bold mb-3">
                                        Registar Falta de um Colaborador
                                    </h5>

                                    <button
                                        className="btn btn-outline-secondary btn-sm mb-3"
                                        type="button"
                                        onClick={() =>
                                            setMostrarFormulario(
                                                !mostrarFormulario,
                                            )
                                        }
                                    >
                                        {mostrarFormulario
                                            ? "Esconder"
                                            : "Mostrar"}{" "}
                                        Formulário
                                    </button>

                                    {mostrarFormulario && (
                                        <form
                                            onSubmit={submeterFaltaEquipa}
                                            className="row g-2"
                                        >
                                            <div className="col-md-4">
                                                <label className="form-label small fw-semibold">
                                                    Colaborador
                                                </label>
                                                <select
                                                    className="form-select form-moderno"
                                                    value={
                                                        novaFaltaEquipa.funcionario
                                                    }
                                                    onChange={(e) =>
                                                        setNovaFaltaEquipa({
                                                            ...novaFaltaEquipa,
                                                            funcionario:
                                                                e.target.value,
                                                        })
                                                    }
                                                    required
                                                >
                                                    <option value="">
                                                        Seleciona...
                                                    </option>
                                                    {colaboradoresEquipa.map(
                                                        (c, i) => (
                                                            <option
                                                                key={i}
                                                                value={c.codigo}
                                                            >
                                                                {c.nome}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>

                                            <div className="col-md-2">
                                                <label className="form-label small fw-semibold">
                                                    Data da Falta
                                                </label>
                                                <input
                                                    type="date"
                                                    className="form-control form-moderno"
                                                    value={novaFaltaEquipa.Data}
                                                    onChange={(e) =>
                                                        setNovaFaltaEquipa({
                                                            ...novaFaltaEquipa,
                                                            Data: e.target
                                                                .value,
                                                        })
                                                    }
                                                    required
                                                />
                                            </div>

                                            <div className="col-md-4">
                                                <label className="form-label small fw-semibold">
                                                    Tipo de Falta
                                                </label>
                                                <select
                                                    className="form-select form-moderno"
                                                    value={
                                                        novaFaltaEquipa.Falta
                                                    }
                                                    onChange={(e) => {
                                                        const falta =
                                                            tiposFalta.find(
                                                                (f) =>
                                                                    f.Falta ===
                                                                    e.target
                                                                        .value,
                                                            );
                                                        setNovaFaltaEquipa({
                                                            ...novaFaltaEquipa,
                                                            Falta: falta.Falta,
                                                            Horas: !!falta.Horas,
                                                            Tempo: 1,
                                                            DescontaAlimentacao:
                                                                !!falta.DescontaSubsAlim,
                                                            DescontaSubsidioTurno:
                                                                !!falta.DescontaSubsTurno,
                                                        });
                                                    }}
                                                    required
                                                >
                                                    <option value="">
                                                        Seleciona tipo...
                                                    </option>
                                                    {tiposFalta.map((f, i) => (
                                                        <option
                                                            key={i}
                                                            value={f.Falta}
                                                        >
                                                            {f.Falta} –{" "}
                                                            {f.Descricao}
                                                        </option>
                                                    ))}
                                                </select>
                                                {/* preview da descrição da falta selecionada */}
                                                {novaFaltaEquipa.Falta && (
                                                    <div className="form-text">
                                                        {novaFaltaEquipa.Falta}{" "}
                                                        —{" "}
                                                        {getDescricaoFalta(
                                                            novaFaltaEquipa.Falta,
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-md-2">
                                                <label className="form-label small fw-semibold">
                                                    Tempo
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-control form-moderno"
                                                    value={
                                                        novaFaltaEquipa.Tempo
                                                    }
                                                    min={1}
                                                    onChange={(e) =>
                                                        setNovaFaltaEquipa({
                                                            ...novaFaltaEquipa,
                                                            Tempo: parseInt(
                                                                e.target
                                                                    .value ||
                                                                    "1",
                                                                10,
                                                            ),
                                                        })
                                                    }
                                                />
                                            </div>

                                            <div className="col-md-12">
                                                <label className="form-label small fw-semibold">
                                                    Observações
                                                </label>
                                                <textarea
                                                    className="form-control form-moderno"
                                                    rows="2"
                                                    value={
                                                        novaFaltaEquipa.Observacoes
                                                    }
                                                    onChange={(e) =>
                                                        setNovaFaltaEquipa({
                                                            ...novaFaltaEquipa,
                                                            Observacoes:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>

                                            <div className="col-12">
                                                <button
                                                    type="submit"
                                                    className="btn btn-danger w-100 rounded-pill"
                                                >
                                                    Registar Falta
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Filtros e Controles */}
                    <div className="card card-moderno mb-4">
                        <div className="card-body">
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                                <div className="mb-3 mb-md-0">
                                    <h5 className="fw-bold mb-1">
                                        <FaFilter className="me-2 text-primary" />
                                        Filtros
                                    </h5>
                                    <p className="text-muted mb-0 small">
                                        Selecione o estado dos pedidos
                                    </p>
                                </div>

                                <div className="d-flex gap-2 w-100 w-md-auto">
                                    <select
                                        className="form-select form-moderno flex-grow-1"
                                        value={estadoFiltro}
                                        onChange={(e) =>
                                            setEstadoFiltro(e.target.value)
                                        }
                                        disabled={loading}
                                    >
                                        <option value="pendentes">
                                            {" "}
                                            Pendentes
                                        </option>
                                        <option value="aprovados">
                                            {" "}
                                            Aprovados
                                        </option>
                                        <option value="rejeitados">
                                            {" "}
                                            Rejeitados
                                        </option>
                                    </select>
                                    <select
                                        className="form-select form-moderno"
                                        value={colaboradorFiltro}
                                        onChange={(e) =>
                                            setColaboradorFiltro(e.target.value)
                                        }
                                        disabled={loading}
                                    >
                                        <option value="">
                                            Todos os colaboradores
                                        </option>
                                        {[
                                            ...new Map(
                                                todosPedidos.map((p) => [
                                                    p.funcionario,
                                                    `${p.nomeFuncionario || p.funcionario} (${p.funcionario})`,
                                                ]),
                                            ).entries(),
                                        ].map(([codigo, label]) => (
                                            <option key={codigo} value={codigo}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="form-select form-moderno"
                                        value={operacaoFiltro}
                                        onChange={(e) =>
                                            setOperacaoFiltro(e.target.value)
                                        }
                                        disabled={loading}
                                    >
                                        <option value="">
                                            Todas as operações
                                        </option>
                                        <option value="CRIAR">Agendar</option>
                                        <option value="CANCELAR">
                                            Cancelar
                                        </option>
                                        <option value="EDITAR">Editar</option>
                                    </select>

                                    <button
                                        onClick={() =>
                                            carregarPedidos(estadoFiltro)
                                        }
                                        className="btn btn-outline-primary btn-responsive rounded-pill"
                                        disabled={loading}
                                    >
                                        <FaSync
                                            className={loading ? "fa-spin" : ""}
                                        />
                                        <span className="d-none d-md-inline ms-2">
                                            Atualizar
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Pedidos */}
                    <div className="row g-3" style={{ marginBottom: "50px" }}>
                        {pedidos.length === 0 ? (
                            <div className="col-12">
                                <div className="card card-moderno">
                                    <div className="card-body text-center py-5">
                                        <FaUser
                                            className="text-muted mb-3"
                                            size={48}
                                        />
                                        <h6 className="text-muted">
                                            Nenhum pedido encontrado
                                        </h6>
                                        <p className="text-muted small mb-0">
                                            {estadoFiltro === "pendentes"
                                                ? "Não há pedidos pendentes de aprovação."
                                                : estadoFiltro === "aprovados"
                                                  ? "Não há pedidos aprovados."
                                                  : "Não há pedidos rejeitados."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            pedidos
                                .filter(
                                    (p) =>
                                        colaboradorFiltro === "" ||
                                        p.funcionario === colaboradorFiltro,
                                )
                                .filter(
                                    (p) =>
                                        !operacaoFiltro ||
                                        (
                                            p.operacao || "CRIAR"
                                        ).toUpperCase() === operacaoFiltro,
                                )
                                .map((pedido) => {
                                    const aprovado =
                                        pedido.estadoAprovacao === "Aprovado";
                                    const rejeitado =
                                        pedido.estadoAprovacao === "Rejeitado";
                                    const pendente =
                                        pedido.estadoAprovacao === "Pendente";
                                    const opInfo = getOperacaoInfo(
                                        pedido.operacao,
                                    );
                                    const cardOpClass =
                                        opInfo.key === "cancelar"
                                            ? "card-op-cancelar"
                                            : opInfo.key === "editar"
                                              ? "card-op-editar"
                                              : "card-op-agendar";

                                    const descFalta =
                                        pedido.tipoPedido === "FALTA"
                                            ? getDescricaoFalta(pedido.falta)
                                            : "";

                                    return (
                                        <div
                                            key={pedido.id}
                                            className="col-12 col-lg-6 col-xl-4"
                                        >
                                            <div
                                                className={`card pedido-card card-moderno h-100 ${cardOpClass}`}
                                            >
                                                <div className="card-body d-flex flex-column">
                                                    {/* Header do Card */}
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div>
                                                            <span className="badge bg-secondary fw-bold">
                                                                #{pedido.id}
                                                            </span>
                                                            <h6 className="mb-1 mt-2">{`${pedido.nomeFuncionario || pedido.funcionario} (${pedido.funcionario})`}</h6>
                                                        </div>
                                                        <div className="text-end">
                                                            <span
                                                                className={`badge ${pedido.tipoPedido === "FALTA" ? "bg-danger" : "bg-primary"} status-badge`}
                                                                title={
                                                                    pedido.tipoPedido ===
                                                                        "FALTA" &&
                                                                    descFalta
                                                                        ? `${pedido.falta} — ${descFalta}`
                                                                        : undefined
                                                                }
                                                            >
                                                                {pedido.tipoPedido ===
                                                                "FALTA"
                                                                    ? "🚫 FALTA"
                                                                    : "🌴 FÉRIAS"}
                                                            </span>
                                                            {/* operação (Agendar/Cancelar/Editar) */}
                                                            <div className="mt-2">
                                                                <span
                                                                    className={`badge status-badge ${opInfo.className}`}
                                                                >
                                                                    <opInfo.Icon className="me-1" />
                                                                    {
                                                                        opInfo.label
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="mt-2">
                                                                {pendente && (
                                                                    <span className="badge bg-warning status-badge">
                                                                        {" "}
                                                                        Pendente
                                                                    </span>
                                                                )}
                                                                {aprovado && (
                                                                    <span className="badge bg-success status-badge">
                                                                        {" "}
                                                                        Aprovado
                                                                    </span>
                                                                )}
                                                                {rejeitado && (
                                                                    <span className="badge bg-danger status-badge">
                                                                        {" "}
                                                                        Rejeitado
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Detalhes do Pedido */}
                                                    <div className="mb-3 flex-grow-1">
                                                        <div className="border-start border-primary border-3 ps-3">
                                                            {pedido.tipoPedido ===
                                                            "FALTA" ? (
                                                                <>
                                                                    <div className="d-flex justify-content-between mb-1">
                                                                        <small className="text-muted">
                                                                            Data:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {formatarData(
                                                                                pedido.dataPedido,
                                                                            )}
                                                                        </small>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between mb-1">
                                                                        <small className="text-muted">
                                                                            Tipo:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {
                                                                                pedido.falta
                                                                            }
                                                                            {descFalta
                                                                                ? ` — ${descFalta}`
                                                                                : ""}
                                                                        </small>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between mb-1">
                                                                        <small className="text-muted">
                                                                            Por
                                                                            horas:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {pedido.horas
                                                                                ? "Sim"
                                                                                : "Não"}
                                                                        </small>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between">
                                                                        <small className="text-muted">
                                                                            Duração:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {pedido.tempo ||
                                                                                0}
                                                                            {pedido.horas
                                                                                ? "h"
                                                                                : " dia(s)"}
                                                                        </small>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between">
                                                                        <small className="text-muted">
                                                                            Confirmação
                                                                            Encarregado:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {
                                                                                pedido.confirmadoPor1
                                                                            }
                                                                        </small>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between">
                                                                        <small className="text-muted">
                                                                            Confirmação
                                                                            RH:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {
                                                                                pedido.confirmadoPor2
                                                                            }
                                                                        </small>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="d-flex justify-content-between mb-1">
                                                                        <small className="text-muted">
                                                                            Início:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {formatarData(
                                                                                pedido.dataInicio,
                                                                            )}
                                                                        </small>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between mb-1">
                                                                        <small className="text-muted">
                                                                            Fim:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {formatarData(
                                                                                pedido.dataFim,
                                                                            )}
                                                                        </small>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between">
                                                                        <small className="text-muted">
                                                                            Duração:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {pedido.duracao ||
                                                                                "-"}{" "}
                                                                            dias
                                                                        </small>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between">
                                                                        <small className="text-muted">
                                                                            Confirmação
                                                                            Encarregado:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {
                                                                                pedido.confirmadoPor1
                                                                            }
                                                                        </small>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between">
                                                                        <small className="text-muted">
                                                                            Confirmação
                                                                            RH:
                                                                        </small>
                                                                        <small className="fw-semibold">
                                                                            {
                                                                                pedido.confirmadoPor2
                                                                            }
                                                                        </small>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {pedido.justificacao && (
                                                            <div className="mt-3">
                                                                <small className="text-muted fw-semibold">
                                                                    Justificação:
                                                                </small>
                                                                <div className="bg-light rounded p-2 mt-1 small">
                                                                    {
                                                                        pedido.justificacao
                                                                    }
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Ações */}
                                                    <div className="mt-auto">
                                                        {aprovado ? (
                                                            <div className="alert alert-success p-2 small mb-0">
                                                                <div className="d-flex align-items-center">
                                                                    <FaCheckCircle className="me-2" />
                                                                    <div>
                                                                        <strong>
                                                                            Aprovado
                                                                        </strong>
                                                                        <br />
                                                                        Por:{" "}
                                                                        {pedido.aprovadoPor ||
                                                                            "Admin"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : rejeitado ? (
                                                            <div className="alert alert-danger p-2 small mb-0">
                                                                <div className="d-flex align-items-center">
                                                                    <FaTimesCircle className="me-2" />
                                                                    <div>
                                                                        <strong>
                                                                            Rejeitado
                                                                        </strong>
                                                                        <br />
                                                                        Por:{" "}
                                                                        {pedido.aprovadoPor ||
                                                                            "Admin"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="d-flex gap-2">
                                                                <button
                                                                    className="btn btn-primary btn-responsive rounded-pill flex-fill"
                                                                    onClick={() =>
                                                                        confirmarPedido(
                                                                            pedido,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        loading
                                                                    }
                                                                >
                                                                    <FaCheckCircle className="me-1" />
                                                                    <span className="d-none d-sm-inline">
                                                                        Aprovar
                                                                    </span>
                                                                    <span className="d-sm-none">
                                                                        ✔
                                                                    </span>
                                                                </button>
                                                                <button
                                                                    className="btn btn-primary btn-responsive rounded-pill flex-fill"
                                                                    onClick={() =>
                                                                        rejeitarPedido(
                                                                            pedido.id,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        loading
                                                                    }
                                                                >
                                                                    <FaTimesCircle className="me-1" />
                                                                    <span className="d-none d-sm-inline">
                                                                        Rejeitar
                                                                    </span>
                                                                    <span className="d-sm-none">
                                                                        ✖
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AprovacaoFaltaFerias;
