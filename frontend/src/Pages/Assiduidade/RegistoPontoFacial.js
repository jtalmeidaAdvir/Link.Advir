import React, { useState, useRef, useEffect } from "react";
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
  FaUserCheck,
  FaSpinner,
} from "react-icons/fa";
import Select from "react-select";
import InvisibleFacialScanner from "../Autenticacao/components/InvisibleFacialScanner";
import VisibleFacialScanner from "../Autenticacao/components/VisibleFacialScanner";
import { useAppStateRefresh } from "../Autenticacao/utils/useAppStateRefresh";
import { useEnsureValidTokens } from "../../utils/useEnsureValidTokens";
import backgroundImage from "../../../images/ImagemFundo.png";
import { useNavigation } from "@react-navigation/native";
import { secureStorage } from "../../utils/secureStorage";
const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() =>
    clearTimeout(timer),
  );
};

const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return resolve({ coords: { latitude: null, longitude: null } });
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
        }),
      (err) =>
        resolve({
          coords: { latitude: null, longitude: null },
          error: err?.message,
        }),
      {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 15000,
      },
    );
  });

const RegistoPontoFacial = (props) => {
  const [registos, setRegistos] = useState([]);
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [resumoObra, setResumoObra] = useState({
    pessoasAConsultar: 0,
    entradasSaidas: [],
  });
  const [showResultModal, setShowResultModal] = useState(false);
  const [modalData, setModalData] = useState({
    type: "",
    message: "",
    userName: "",
    action: "",
  });

  // Estados de loading separados
  const [isObrasLoading, setIsObrasLoading] = useState(false);
  const [isResumoLoading, setIsResumoLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isPostLoading, setIsPostLoading] = useState(false);

  const [isFacialScanning, setIsFacialScanning] = useState(false);
  const [facialScanResult, setFacialScanResult] = useState(null);

  // Estados para visitantes
  const [showVisitanteModal, setShowVisitanteModal] = useState(false);
  const [visitanteStep, setVisitanteStep] = useState("buscar"); // 'buscar' ou 'criar'
  const [numeroContribuinte, setNumeroContribuinte] = useState("");
  const [visitanteData, setVisitanteData] = useState({
    primeiroNome: "",
    ultimoNome: "",
  });
  const [visitanteEncontrado, setVisitanteEncontrado] = useState(null);

  // Estados para externos (QR code)
  const [showExternoQRModal, setShowExternoQRModal] = useState(false);
  const [qrScannerActive, setQrScannerActive] = useState(false);
  const [externoNome, setExternoNome] = useState("");

  // Verificar se é empresa JPA (ID = 5)
  const empresaId = secureStorage.getItem("empresa_id") || "";
  const isEmpresaJPA = empresaId === "5";

  // Verificar se é administrador
  const tipoUser = secureStorage.getItem("tipoUser") || "";
  const isAdmin = tipoUser === "Administrador";

  // Bloqueios / locks
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const registoLockRef = useRef(false);
  const scanLockRef = useRef(false);

  // Estados para modal de definições
  const [showDefinicoesModal, setShowDefinicoesModal] = useState(false);
  const [emailVisitantes, setEmailVisitantes] = useState([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Estados para modal de detalhes de pessoal
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos"); // todos, trabalhador, visitante, externo
  const [filtroEstado, setFiltroEstado] = useState("todos"); // todos, aTrabalhador, saiu

  // Estados para pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [showPullIndicator, setShowPullIndicator] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);

  // Pré-aquecer localização quando o utilizador inicia o scan
  const locationPromiseRef = useRef(null);

  const navigation = useNavigation?.();

  const opcoesObras = obras.map((obra) => ({
    value: obra.id,
    label: obra.nome,
  }));

  // Debug + validação POS
  useEffect(() => {
    const isPOS = secureStorage.getItem("isPOS") === "true";
    const token = secureStorage.getItem("loginToken");
    const empresaId = secureStorage.getItem("empresa_id");

    if (!isPOS || !token || !empresaId) {
      console.error("Dados essenciais em falta. Redirecionando para login...");
      window.location.href = "/login-pos";
    }
  }, []);

  // Hooks auxiliares de tokens
  useAppStateRefresh();
  useEnsureValidTokens();

  // Helpers para decisões antigas (fallback)
  const dataRegisto = (r) => new Date(r.timestamp || r.createdAt);
  const temSaidaPosterior = (entrada, lista) =>
    lista.some(
      (s) =>
        s.tipo === "saida" &&
        String(s.obra_id) === String(entrada.obra_id) &&
        dataRegisto(s) > dataRegisto(entrada),
    );
  const getEntradaAtivaPorObra = (obraId, lista) =>
    lista
      .filter(
        (r) => r.tipo === "entrada" && String(r.obra_id) === String(obraId),
      )
      .sort((a, b) => dataRegisto(b) - dataRegisto(a))
      .find((e) => !temSaidaPosterior(e, lista));
  const getUltimaEntradaAtiva = (lista) =>
    lista
      .filter((r) => r.tipo === "entrada")
      .sort((a, b) => dataRegisto(b) - dataRegisto(a))
      .find((e) => !temSaidaPosterior(e, lista));

  // Carregar obras
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsObrasLoading(true);
        const token = secureStorage.getItem("loginToken");
        const empresaId = secureStorage.getItem("empresa_id");
        const obraPredefinidaId = secureStorage.getItem("obra_predefinida_id");

        const res = await fetchWithTimeout(
          "https://backend.advir.pt/api/obra",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
          8000,
        );
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          const obrasDaEmpresa = data.filter(
            (o) => String(o.empresa_id) === String(empresaId),
          );
          setObras(obrasDaEmpresa);

          // Pré-selecionar obra predefinida do POS se existir
          if (obraPredefinidaId) {
            const obraPredefinida = obrasDaEmpresa.find(
              (o) => String(o.id) === String(obraPredefinidaId),
            );
            if (obraPredefinida) {
              setObraSelecionada(obraPredefinida.id);
              console.log(
                "Obra predefinida do POS selecionada:",
                obraPredefinida.nome,
              );
            }
          } else if (obrasDaEmpresa.length === 1) {
            // Se não houver obra predefinida mas só existir uma obra, seleciona essa
            setObraSelecionada(obrasDaEmpresa[0].id);
          }
        } else {
          console.error("Falha ao carregar obras:", res.status);
        }
      } catch (e) {
        console.error("Erro ao carregar obras:", e);
      } finally {
        if (mounted) setIsObrasLoading(false);
      }
    })();
    return () => {
      mounted = false;
      setIsFacialScanning(false);
      registoLockRef.current = false;
      scanLockRef.current = false;
    };
  }, []);

  // Carregar resumo da obra ao selecionar
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!obraSelecionada || !mounted) {
        setResumoObra({ pessoasAConsultar: 0, entradasSaidas: [] });
        return;
      }
      await carregarResumoObra(obraSelecionada, mounted);
    })();
    return () => {
      mounted = false;
    };
  }, [obraSelecionada]);

  const carregarResumoObra = async (obraId, mountedCheck = true) => {
    try {
      setIsResumoLoading(true);
      const token = secureStorage.getItem("loginToken");
      const empresaId = secureStorage.getItem("empresa_id");

      // Buscar resumo de trabalhadores, visitantes e externos em paralelo
      const [resTrabalhadores, resVisitantes, resExternos] = await Promise.all([
        fetchWithTimeout(
          `https://backend.advir.pt/api/registo-ponto-obra/resumo-obra/${obraId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
          },
          8000,
        ),
        fetchWithTimeout(
          `https://backend.advir.pt/api/visitantes/resumo-obra?obra_id=${obraId}&empresa_id=${empresaId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
          },
          8000,
        ).catch(() => ({ ok: false })), // Fallback se endpoint de visitantes falhar
        fetchWithTimeout(
          `https://backend.advir.pt/api/externos-jpa/resumo-obra?obra_id=${obraId}&empresa_id=${empresaId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
          },
          8000,
        ).catch(() => ({ ok: false })), // Fallback se endpoint de externos falhar
      ]);

      if (mountedCheck) {
        let pessoasAConsultar = 0;
        let entradasSaidas = [];

        // Processar dados dos trabalhadores
        if (resTrabalhadores.ok) {
          const dataTrabalhadores = await resTrabalhadores.json();
          pessoasAConsultar += dataTrabalhadores.pessoasAConsultar ?? 0;
          entradasSaidas = Array.isArray(dataTrabalhadores.entradasSaidas)
            ? dataTrabalhadores.entradasSaidas.map((reg) => ({
                ...reg,
                tipoEntidade: "trabalhador",
              }))
            : [];
        }

        // Processar dados dos visitantes
        if (resVisitantes.ok) {
          const dataVisitantes = await resVisitantes.json();
          pessoasAConsultar += dataVisitantes.visitantesATrabalhar ?? 0;

          if (Array.isArray(dataVisitantes.entradasSaidas)) {
            const visitantesRegistos = dataVisitantes.entradasSaidas.map(
              (reg) => ({
                ...reg,
                tipoEntidade: "visitante",
                User: { nome: reg.nome },
              }),
            );
            entradasSaidas = [...entradasSaidas, ...visitantesRegistos];
          }
        }

        // Processar dados dos externos
        if (resExternos.ok) {
          const dataExternos = await resExternos.json();

          pessoasAConsultar += dataExternos.externosATrabalhar ?? 0;

          if (Array.isArray(dataExternos.entradasSaidas)) {
            const externosRegistos = dataExternos.entradasSaidas.map((reg) => ({
              ...reg,
              tipoEntidade: reg.tipoEntidade || "externo",
              User: { nome: reg.nome || "Externo Desconhecido" },
            }));
            entradasSaidas = [...entradasSaidas, ...externosRegistos];
          }
        }

        // Ordenar por timestamp (mais recentes primeiro) e limitar a 10
        entradasSaidas.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );
        entradasSaidas = entradasSaidas.slice(0, 10);

        setResumoObra({
          pessoasAConsultar,
          entradasSaidas,
        });
      }
    } catch (e) {
      console.error("Erro a carregar resumo da obra:", e);
      if (mountedCheck) {
        setResumoObra({ pessoasAConsultar: 0, entradasSaidas: [] });
      }
    } finally {
      setIsResumoLoading(false);
    }
  };

  // --- Registo com fallback ---
  const registarPontoParaUtilizador = async (
    tipo,
    obraId,
    nomeObra,
    userId,
    userName,
    loc,
  ) => {
    try {
      if (registoLockRef.current || isRegistering) return false;
      registoLockRef.current = true;
      setIsPostLoading(true);
      setIsRegistering(true);
      setStatusMessage(`A registar ${tipo}...`);

      const token = secureStorage.getItem("loginToken");
      const empresaNome = secureStorage.getItem("empresa_areacliente");
      const idemKey = `${userId}-${obraId}-${tipo}-${Date.now()}`;

      const res = await fetchWithTimeout(
        "https://backend.advir.pt/api/registo-ponto-obra",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idemKey,
          },
          body: JSON.stringify({
            tipo,
            obra_id: obraId,
            latitude: loc?.coords?.latitude ?? null,
            longitude: loc?.coords?.longitude ?? null,
            targetUserId: userId,
            empresa: empresaNome,
          }),
        },
        10000,
      );

      if (res.ok) {
        const actionText = tipo === "entrada" ? "Entrada" : "Saída";
        const mensagemBoasVindas = obterMensagemAleatoria();
        setModalData({
          type: "success",
          message: mensagemBoasVindas,
          userName,
          action: actionText,
        });
        setShowResultModal(true);
        
        // Auto-fechar o modal após 3 segundos
        setTimeout(() => {
          setShowResultModal(false);
          setModalData({ type: "", message: "", userName: "", action: "" });
          setStatusMessage("");
        }, 3000);
        
        // Atualiza apenas o resumo
        carregarResumoObra(obraId);
        return true;
      } else {
        const errorData = await res.json().catch(() => ({}));
        setModalData({
          type: "error",
          message: errorData.message || "Erro",
          userName,
          action: "Erro",
        });
        setShowResultModal(true);
        
        // Auto-fechar modal de erro após 4 segundos
        setTimeout(() => {
          setShowResultModal(false);
          setModalData({ type: "", message: "", userName: "", action: "" });
          setStatusMessage("");
        }, 4000);
        
        return false;
      }
    } catch (err) {
      console.error("Erro ao registar ponto:", err);
      setModalData({
        type: "error",
        message:
          err?.name === "AbortError"
            ? "Tempo de resposta excedido"
            : "Erro ao registar",
        userName,
        action: "Erro",
      });
      setShowResultModal(true);
      return false;
    } finally {
      setIsPostLoading(false);
      setIsRegistering(false);
      registoLockRef.current = false;
    }
  };

  const processarPontoComValidacaoParaUtilizador = async (
    obraId,
    nomeObra,
    userId,
    userName,
    registosDoUtilizador,
    loc,
  ) => {
    // 1) Se já houver entrada ativa na MESMA obra → SAÍDA
    const ativaMesmaObra = getEntradaAtivaPorObra(obraId, registosDoUtilizador);
    if (ativaMesmaObra) {
      await registarPontoParaUtilizador(
        "saida",
        obraId,
        nomeObra,
        userId,
        userName,
        loc,
      );
      return;
    }
    // 2) Se houver entrada ativa noutra obra → fechar essa e abrir ENTRADA nesta
    const ultimaAtiva = getUltimaEntradaAtiva(registosDoUtilizador);
    if (ultimaAtiva && String(ultimaAtiva.obra_id) !== String(obraId)) {
      const nomeAnterior = ultimaAtiva.Obra?.nome || "Obra anterior";
      await registarPontoParaUtilizador(
        "saida",
        ultimaAtiva.obra_id,
        nomeAnterior,
        userId,
        userName,
        loc,
      );
      await new Promise((r) => setTimeout(r, 200));
    }
    // 3) Sem ativa → ENTRADA nesta obra
    await registarPontoParaUtilizador(
      "entrada",
      obraId,
      nomeObra,
      userId,
      userName,
      loc,
    );
  };

  const autenticarERegistarPonto = async (obraId, nomeObra, facialData) => {
    if (isRegistering || isProcessingScan) return;

    try {
      setIsProcessingScan(true);
      setIsAuthLoading(true);
      setStatusMessage("A autenticar utilizador...");

      // 1) Autenticação facial com timeout
      const authRes = await fetchWithTimeout(
        "https://backend.advir.pt/api/auth/biometric/authenticate-facial",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ facialData }),
        },
        7000,
      );
      if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        throw new Error(err.message || "Falha na autenticação facial");
      }
      const authData = await authRes.json();
      const userId = authData.userId;
      const userName = authData.userNome || authData.username || "Utilizador";

      setIsAuthLoading(false);

      // 2) Localização - Verificar se é POS CASAPEDOME para pular obtenção de localização
      const posNome = secureStorage.getItem("posNome");
      let loc = null;

      if (posNome === "CASAPEDOME") {
        // Para CASAPEDOME, não obter localização (mais rápido)
        console.log("📍 POS CASAPEDOME detectado - localização desativada");
        setStatusMessage(`${userName} identificado. A registar ponto...`);
        loc = { coords: { latitude: "41.636771", longitude: "-8.433331" } };
      } else {
        // Para outros POS, obter localização normalmente
        setStatusMessage(`${userName} identificado. A obter localização...`);
        try {
          loc = locationPromiseRef.current
            ? await locationPromiseRef.current
            : await getCurrentLocation();
        } catch {
          loc = { coords: { latitude: null, longitude: null } };
        }
      }

      setStatusMessage(`${userName} — a registar ponto...`);
      setIsPostLoading(true);

      // 3) TENTAR endpoint /auto (decisão no backend)
      const token = secureStorage.getItem("loginToken");
      const idemKey = `${userId}-${obraId}-${Date.now()}`;

      let resAuto = await fetchWithTimeout(
        "https://backend.advir.pt/api/registo-ponto-obra/auto",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idemKey,
          },
          body: JSON.stringify({
            obra_id: obraId,
            latitude: loc?.coords?.latitude ?? null,
            longitude: loc?.coords?.longitude ?? null,
            targetUserId: userId,
          }),
        },
        8000,
      );

      if (resAuto.ok) {
        const data = await resAuto.json().catch(() => ({}));
        const actionText = data?.action === "saida" ? "Saída" : "Entrada";
        const mensagemBoasVindas = obterMensagemAleatoria();
        setModalData({
          type: "success",
          message: mensagemBoasVindas,
          userName,
          action: actionText,
        });
        setShowResultModal(true);
        
        // Auto-fechar o modal após 3 segundos
        setTimeout(() => {
          setShowResultModal(false);
          setModalData({ type: "", message: "", userName: "", action: "" });
          setStatusMessage("");
        }, 3000);
        
        await carregarResumoObra(obraId);
        return;
      }

      // 4) Fallback para lógica antiga (se /auto não existir ou falhar)
      if (!resAuto.ok && resAuto.status !== 404) {
        const err = await resAuto.json().catch(() => ({}));
        throw new Error(err.message || "Erro ao registar (auto)");
      }

      // Fallback: ir buscar registos do dia e decidir no frontend
      const hoje = new Date().toISOString().split("T")[0];
      const registosUrl =
        `https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo` +
        `?user_id=${userId}&ano=${new Date().getFullYear()}` +
        `&mes=${String(new Date().getMonth() + 1).padStart(2, "0")}&data=${hoje}`;

      let registosUtilizadorIdentificado = [];
      try {
        const registosRes = await fetchWithTimeout(
          registosUrl,
          { headers: { Authorization: `Bearer ${token}` } },
          7000,
        );
        if (registosRes.ok) {
          const data = await registosRes.json();
          registosUtilizadorIdentificado = data.filter
            ? data.filter((r) => r.timestamp && r.timestamp.startsWith(hoje))
            : data;
        }
      } catch {
        // Se falhar, vamos assumir ENTRADA otimista
        registosUtilizadorIdentificado = [];
      }

      const registosFormatados = registosUtilizadorIdentificado.map((reg) => ({
        ...reg,
        obra_id: reg.obra_id || reg.obraId,
        timestamp: reg.timestamp || reg.createdAt,
        tipo: reg.tipo,
        User: reg.User || { nome: userName },
        Obra: reg.Obra || { nome: nomeObra },
      }));

      await processarPontoComValidacaoParaUtilizador(
        obraId,
        nomeObra,
        userId,
        userName,
        registosFormatados,
        loc,
      );
    } catch (e) {
      console.error("Erro no processo de autenticar e registar:", e);
      setModalData({
        type: "error",
        message: e?.message || "Erro ao processar registo",
        userName: "",
        action: "Erro",
      });
      setShowResultModal(true);
      
      // Auto-fechar modal de erro após 4 segundos
      setTimeout(() => {
        setShowResultModal(false);
        setModalData({ type: "", message: "", userName: "", action: "" });
        setStatusMessage("");
      }, 4000);
    } finally {
      setIsAuthLoading(false);
      setIsPostLoading(false);
      setIsProcessingScan(false);
    }
  };

  const processarEntradaComFacial = async (facialData) => {
    if (!obraSelecionada) {
      setStatusMessage(
        "Por favor, selecione um local antes de iniciar o scan facial",
      );
      return;
    }
    const obra = obras.find((o) => String(o.id) === String(obraSelecionada));
    if (!obra) {
      setStatusMessage("Local selecionado não encontrado");
      return;
    }
    await autenticarERegistarPonto(obraSelecionada, obra.nome, facialData);
  };

  const handleStartFacialScan = () => {
    if (!obraSelecionada) {
      alert(
        "Por favor, selecione um local antes de iniciar o reconhecimento facial",
      );
      return;
    }
    if (isRegistering || isProcessingScan) {
      alert("Aguarde, ainda está a processar o registo anterior...");
      return;
    }
    // Pré-aquecer localização apenas se não for CASAPEDOME
    const posNome = secureStorage.getItem("posNome");
    if (posNome !== "CASAPEDOME") {
      locationPromiseRef.current = getCurrentLocation();
    }
    setIsFacialScanning(true);
    setStatusMessage("Iniciando reconhecimento facial...");
    setFacialScanResult(null);
  };

  const handleStopFacialScan = () => {
    setIsFacialScanning(false);
    setStatusMessage("");
    setFacialScanResult(null);
    locationPromiseRef.current = null;
  };

  // Mensagens de boas-vindas aleatórias
  const mensagensBoasVindas = [
    "Bem-vindo! Tenha um excelente dia de trabalho! 🌟",
    "Olá! Que hoje seja produtivo e positivo! 💪",
    "Bom dia! Desejamos-lhe muito sucesso! ✨",
    "Seja bem-vindo! Vamos fazer um ótimo trabalho hoje! 🚀",
    "Boa jornada! Conte connosco para um dia incrível! 🌈",
    "Bem-vindo de volta! Hoje será um grande dia! 🎯",
    "Olá! Pronto para mais um dia de conquistas? 💼",
    "Bem-vindo! A sua dedicação faz a diferença! 🌟",
    "Bom trabalho! Juntos somos mais fortes! 🤝",
    "Seja bem-vindo! Vamos alcançar novos objetivos! 🏆"
  ];

  const obterMensagemAleatoria = () => {
    const indiceAleatorio = Math.floor(Math.random() * mensagensBoasVindas.length);
    return mensagensBoasVindas[indiceAleatorio];
  };

  const handleFacialScanComplete = async (facialData) => {
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime;

    // Evitar reentradas e scans demasiado próximos
    if (
      scanLockRef.current ||
      isRegistering ||
      isProcessingScan ||
      timeSinceLastScan < 3000
    ) {
      setIsFacialScanning(false);
      return;
    }

    scanLockRef.current = true;
    setIsProcessingScan(true);
    setLastScanTime(now);
    setFacialScanResult(facialData);
    setIsFacialScanning(false);

    try {
      await processarEntradaComFacial(facialData);
    } catch (error) {
      console.error("Erro ao processar entrada com facial:", error);
      setStatusMessage("Erro ao processar reconhecimento facial");
    } finally {
      setTimeout(() => {
        scanLockRef.current = false;
        setIsProcessingScan(false);
      }, 1500);
    }
  };

  const handleAbrirDefinicoes = async () => {
    setShowDefinicoesModal(true);
    setNovoEmail("");
    // Carregar emails atuais
    try {
      const token = secureStorage.getItem("loginToken");
      const res = await fetch(
        "https://backend.advir.pt/api/configuracoes/email_visitantes",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const config = await res.json();
        // Se o valor estiver armazenado como string separada por vírgulas, converter para array
        if (config.valor) {
          const emails = config.valor.includes(',') 
            ? config.valor.split(',').map(e => e.trim()).filter(e => e)
            : [config.valor.trim()];
          setEmailVisitantes(emails);
        } else {
          setEmailVisitantes([]);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const handleAdicionarEmail = () => {
    if (!novoEmail || !novoEmail.includes("@")) {
      alert("Por favor, insira um email válido");
      return;
    }

    if (emailVisitantes.includes(novoEmail.trim())) {
      alert("Este email já foi adicionado");
      return;
    }

    setEmailVisitantes([...emailVisitantes, novoEmail.trim()]);
    setNovoEmail("");
  };

  const handleRemoverEmail = (emailToRemove) => {
    setEmailVisitantes(emailVisitantes.filter(email => email !== emailToRemove));
  };

  const handleSalvarDefinicoes = async () => {
    if (emailVisitantes.length === 0) {
      alert("Por favor, adicione pelo menos um email");
      return;
    }

    try {
      setIsSavingConfig(true);
      const token = secureStorage.getItem("loginToken");
      
      // Converter array de emails em string separada por vírgulas
      const emailsString = emailVisitantes.join(', ');
      
      const res = await fetch(
        "https://backend.advir.pt/api/configuracoes/email_visitantes",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ valor: emailsString }),
        },
      );

      if (res.ok) {
        alert("Configurações salvas com sucesso!");
        setShowDefinicoesModal(false);
      } else {
        alert("Erro ao salvar configurações");
      }
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert("Erro ao salvar configurações");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleLogoutPOS = () => {
    secureStorage.clear();
    if (navigation) {
      navigation.navigate("LoginPOS");
    } else {
      window.location.href = "/login-pos";
    }
  };

  const handleCloseModal = () => {
    setShowResultModal(false);
    setModalData({ type: "", message: "", userName: "", action: "" });
    setStatusMessage("");
    setIsRegistering(false);
    setIsProcessingScan(false);
    registoLockRef.current = false;
    scanLockRef.current = false;
    // Atualiza apenas o resumo da obra selecionada
    if (obraSelecionada) carregarResumoObra(obraSelecionada);
  };

  // Função de refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setStatusMessage("A atualizar dados...");

    try {
      if (obraSelecionada) {
        await carregarResumoObra(obraSelecionada);
      }
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
    } finally {
      setIsRefreshing(false);
      setStatusMessage("");
    }
  };

  const handleAbrirDetalhes = () => {
    setShowDetalhesModal(true);
    setFiltroTipo("todos");
    setFiltroEstado("todos");
  };

  const getRegistosFiltrados = () => {
    let registos = resumoObra.entradasSaidas || [];

    // Filtrar por tipo
    if (filtroTipo !== "todos") {
      registos = registos.filter((reg) => reg.tipoEntidade === filtroTipo);
    }

    // Filtrar por estado
    if (filtroEstado === "aTrabalhador") {
      registos = registos.filter((reg) => reg.tipo === "entrada");
    } else if (filtroEstado === "saiu") {
      registos = registos.filter((reg) => reg.tipo === "saida");
    }

    return registos;
  };

  const getTotalizadores = () => {
    const todosRegistos = resumoObra.entradasSaidas || [];
    
    const aTrabalhador = todosRegistos.filter((reg) => reg.tipo === "entrada").length;
    const saiu = todosRegistos.filter((reg) => reg.tipo === "saida").length;
    const total = todosRegistos.length;
    
    // Totalizadores por tipo
    const colaboradores = todosRegistos.filter((reg) => reg.tipoEntidade === "trabalhador").length;
    const visitantes = todosRegistos.filter((reg) => reg.tipoEntidade === "visitante").length;
    const externos = todosRegistos.filter((reg) => reg.tipoEntidade === "externo").length;

    return {
      aTrabalhador,
      saiu,
      total,
      colaboradores,
      visitantes,
      externos
    };
  };

  // Pull-to-refresh - Touch events
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      containerRef.current.startY = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (window.scrollY === 0 && containerRef.current.startY) {
      const distance = Math.max(
        0,
        e.touches[0].clientY - containerRef.current.startY,
      );
      if (distance > 10) {
        setPullDistance(distance);
        setShowPullIndicator(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh();
    }
    containerRef.current.startY = null;
    setPullDistance(0);
    setShowPullIndicator(false);
  };

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  const handleAbrirModalVisitante = () => {
    if (!obraSelecionada) {
      alert("Por favor, selecione um local antes de registar visitante");
      return;
    }
    setShowVisitanteModal(true);
    setVisitanteStep("buscar");
    setNumeroContribuinte("");
    setVisitanteData({ primeiroNome: "", ultimoNome: "" });
    setVisitanteEncontrado(null);
  };

  const handleAbrirModalExternoQR = () => {
    if (!obraSelecionada) {
      alert("Por favor, selecione um local antes de registar externo");
      return;
    }
    setShowExternoQRModal(true);
    setQrScannerActive(true);
    setExternoNome("");
  };

  const handleQRCodeScan = async (qrCodeData) => {
    if (!qrCodeData || !obraSelecionada) return;

    try {
      setQrScannerActive(false);
      setStatusMessage("A processar QR code...");

      const token = secureStorage.getItem("loginToken");
      const empresaId = secureStorage.getItem("empresa_id");

      // Buscar dados do externo na tabela ExternosJPA
      const resExterno = await fetch(
        `https://backend.advir.pt/api/externos-jpa/buscar/${qrCodeData}?empresa_id=${empresaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!resExterno.ok) {
        throw new Error("Externo não encontrado");
      }

      const externo = await resExterno.json();
      setExternoNome(externo.nome);

      // Obter localização apenas se não for CASAPEDOME
      const posNome = secureStorage.getItem("posNome");
      let loc = { coords: { latitude: null, longitude: null } };

      if (posNome !== "CASAPEDOME") {
        try {
          loc = await getCurrentLocation();
        } catch {}
      }

      // Registar ponto do externo
      const resRegisto = await fetch(
        "https://backend.advir.pt/api/externos-jpa/registar-ponto",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            externo_id: externo.id,
            obra_id: obraSelecionada,
            empresa_id: empresaId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }),
        },
      );

      if (resRegisto.ok) {
        const result = await resRegisto.json();
        setModalData({
          type: "success",
          message: `${result.action === "entrada" ? "Entrada" : "Saída"} registada!`,
          userName: externo.nome,
          action: result.action === "entrada" ? "Entrada" : "Saída",
        });
        setShowResultModal(true);
        setShowExternoQRModal(false);
        carregarResumoObra(obraSelecionada);
      } else {
        const error = await resRegisto.json();
        throw new Error(error.message || "Erro ao registar ponto");
      }
    } catch (error) {
      console.error("Erro ao processar QR code:", error);
      alert(error.message || "Erro ao processar QR code");
      setQrScannerActive(true);
    } finally {
      setStatusMessage("");
    }
  };

  const handleBuscarVisitante = async () => {
    if (!numeroContribuinte) {
      alert("Por favor, insira o número de contribuinte");
      return;
    }

    try {
      const token = secureStorage.getItem("loginToken");
      const empresaId = secureStorage.getItem("empresa_id");

      const res = await fetch(
        `https://backend.advir.pt/api/visitantes/buscar/${numeroContribuinte}?empresa_id=${empresaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const visitante = await res.json();
        setVisitanteEncontrado(visitante);
        await registarPontoVisitante(visitante.id);
      } else {
        setVisitanteStep("criar");
      }
    } catch (error) {
      console.error("Erro ao buscar visitante:", error);
      alert("Erro ao buscar visitante");
    }
  };

  const handleCriarVisitante = async () => {
    if (
      !visitanteData.primeiroNome ||
      !visitanteData.ultimoNome ||
      !numeroContribuinte ||
      !visitanteData.nomeEmpresa
    ) {
      alert("Por favor, preencha os campos obrigatórios (Nome, Apelido, NIF e Nome da Empresa)");
      return;
    }

    try {
      const token = secureStorage.getItem("loginToken");
      const empresaId = secureStorage.getItem("empresa_id");

      const res = await fetch("https://backend.advir.pt/api/visitantes/criar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primeiroNome: visitanteData.primeiroNome,
          ultimoNome: visitanteData.ultimoNome,
          numeroContribuinte,
          nomeEmpresa: visitanteData.nomeEmpresa,
          nifEmpresa: visitanteData.nifEmpresa,
          empresa_id: empresaId,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        await registarPontoVisitante(result.visitante.id);
      } else {
        const error = await res.json();
        alert(error.message || "Erro ao criar visitante");
      }
    } catch (error) {
      console.error("Erro ao criar visitante:", error);
      alert("Erro ao criar visitante");
    }
  };

  const registarPontoVisitante = async (visitanteId) => {
    try {
      const token = secureStorage.getItem("loginToken");
      const empresaId = secureStorage.getItem("empresa_id");
      const posNome = secureStorage.getItem("posNome");

      let loc = { coords: { latitude: null, longitude: null } };

      // Apenas obter localização se não for CASAPEDOME
      if (posNome !== "CASAPEDOME") {
        try {
          loc = await getCurrentLocation();
        } catch {}
      }

      const res = await fetch(
        "https://backend.advir.pt/api/visitantes/registar-ponto",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            visitante_id: visitanteId,
            obra_id: obraSelecionada,
            empresa_id: empresaId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }),
        },
      );

      if (res.ok) {
        const result = await res.json();
        const nomeCompleto = `${result.visitante.primeiroNome} ${result.visitante.ultimoNome}`;
        setModalData({
          type: "success",
          message: `${result.action === "entrada" ? "Entrada" : "Saída"} registada!`,
          userName: nomeCompleto,
          action: result.action === "entrada" ? "Entrada" : "Saída",
        });
        setShowResultModal(true);
        setShowVisitanteModal(false);
        carregarResumoObra(obraSelecionada);
      } else {
        const error = await res.json();
        alert(error.message || "Erro ao registar ponto");
      }
    } catch (error) {
      console.error("Erro ao registar ponto visitante:", error);
      alert("Erro ao registar ponto");
    }
  };

  const isPOS = secureStorage.getItem("isPOS") === "true";

  return (
    <div
      ref={containerRef}
      className="container-fluid bg-light min-vh-100 py-2 py-md-4"
      style={{
        overflowX: "hidden",
        overflowY: "auto",
        position: "relative",
        height: "100vh",
      }}
    >
      {/* Indicador de Pull-to-Refresh */}
      {showPullIndicator && (
        <div
          style={{
            position: "fixed",
            top: `${Math.min(pullDistance, 100)}px`,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "rgba(23, 146, 254, 0.95)",
            padding: "0.75rem 1.5rem",
            borderRadius: "25px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            transition: "top 0.3s ease",
          }}
        >
          <span
            style={{ color: "white", fontWeight: "600", fontSize: "0.9rem" }}
          >
            {isRefreshing
              ? "A atualizar..."
              : pullDistance > 80
                ? "Solte para atualizar"
                : "Puxe para atualizar"}
          </span>
        </div>
      )}
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
      />

      <style jsx>{`
        .card-moderno {
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          border: none;
          margin-bottom: 1rem;
        }
        .btn-facial {
          background: linear-gradient(45deg, #1792fe, #0d7efe);
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(23, 146, 254, 0.3);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .btn-facial:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(23, 146, 254, 0.4);
          color: white;
        }
        .btn-facial:disabled {
          opacity: 0.7;
          transform: none;
        }
        .btn-visitante {
          background: linear-gradient(45deg, #1792fe, #0d7efe);
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(23, 146, 254, 0.3);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .btn-visitante:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(23, 146, 254, 0.4);
          color: white;
        }
        .btn-visitante:disabled {
          opacity: 0.7;
          transform: none;
        }
        .btn-externo {
          background: linear-gradient(45deg, #1792fe, #0d7efe);
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(23, 146, 254, 0.3);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .btn-externo:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(23, 146, 254, 0.4);
          color: white;
        }
        .btn-externo:disabled {
          opacity: 0.7;
          transform: none;
        }
        .status-message {
          background: rgba(23, 146, 254, 0.1);
          border: 1px solid #1792fe;
          border-radius: 8px;
          padding: 1rem;
          color: #1792fe;
          text-align: center;
          font-weight: 500;
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
        .result-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        .result-modal {
          background: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          width: 90%;
          padding: 0;
          overflow: hidden;
          animation: modalAppear 0.3s ease-out;
        }
        .result-modal-header {
          padding: 5rem 2rem 1rem;
          text-align: center;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        }
        .result-modal-body {
          padding: 1rem 2rem 2rem;
          text-align: center;
        }
        .success-icon {
          font-size: 3rem;
          color: #28a745;
          margin-bottom: 1rem;
        }
        .error-icon {
          font-size: 3rem;
          color: #dc3545;
          margin-bottom: 1rem;
        }
        .modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .modal-subtitle {
          color: #6c757d;
          margin-bottom: 1rem;
        }
        .modal-close-btn {
          background: linear-gradient(45deg, #1792fe, #0d7efe);
          border: none;
          border-radius: 25px;
          padding: 0.75rem 2rem;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 120px;
        }
        .modal-close-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(23, 146, 254, 0.4);
        }
        @keyframes modalAppear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .auto-close-modal {
          animation: modalAppear 0.3s ease-out, modalDisappear 0.3s ease-in 2.7s forwards;
        }
        @keyframes modalDisappear {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
        }
        .detalhes-modal {
          max-width: 800px;
          width: 90%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .detalhes-modal-body {
          padding: 2rem 2rem 2rem;
          overflow-y: auto;
          flex: 1;
        }
        @media (max-width: 767px) {
          .container-fluid {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .result-modal {
            width: 95%;
            margin: 1rem;
          }
          .result-modal-header,
          .result-modal-body {
            padding: 1.5rem 1rem;
          }
          .detalhes-modal {
            width: 95%;
            max-width: 95%;
            margin: 0.5rem;
            max-height: 95vh;
          }
          .detalhes-modal-body {
            padding: 1.5rem 1rem 1rem;
          }
          .detalhes-modal .row {
            margin: 0;
          }
          .detalhes-modal .col-4,
          .detalhes-modal .col-6 {
            padding-left: 0.25rem;
            padding-right: 0.25rem;
          }
          .detalhes-modal .modal-title {
            font-size: 1.1rem;
          }
          .detalhes-modal .modal-subtitle {
            font-size: 0.85rem;
          }
        }
        @media (max-width: 576px) {
          .detalhes-modal .row.mb-3.g-2,
          .detalhes-modal .row.mb-4.g-2 {
            flex-direction: column;
          }
          .detalhes-modal .col-4 {
            width: 100%;
            margin-bottom: 0.5rem;
          }
          .detalhes-modal .row.mb-3 .col-6,
          .detalhes-modal .row.mb-4 .col-6 {
            width: 100%;
            margin-bottom: 0.5rem;
          }
          .detalhes-modal .registro-item {
            padding: 0.75rem;
          }
          .detalhes-modal .registro-item strong {
            font-size: 0.9rem;
          }
          .detalhes-modal .registro-item small {
            font-size: 0.75rem;
          }
        }
        .form-select:focus {
          border-color: #1792fe !important;
          box-shadow: 0 0 0 0.2rem rgba(23, 146, 254, 0.25) !important;
        }
        .form-select:hover {
          border-color: #1792fe !important;
        }
      `}</style>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          overflowY: "auto",
        }}
      >
        <div className="row justify-content-center">
          <div className="col-12 col-xl-10">
            {/* Header */}
            <div className="card card-moderno mb-3 mb-md-4">
              <div className="card-body py-3 py-md-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="flex-grow-1 text-center">
                    <h1 className="h4 h3-md mb-2 text-primary">
                      <FaUserCheck className="me-2" />
                      Identificação Facial e Registo de Ponto
                    </h1>
                    <p className="text-muted mb-0 small">
                      Selecione o local e use o reconhecimento facial para
                      identificar o utilizador e registar o seu ponto
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleAbrirDefinicoes}
                      style={{ minWidth: "100px" }}
                    >
                      ⚙️ Definições
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div
              className="row g-3 justify-content-center"
              style={{ marginBottom: "50px" }}
            >
              {/* Scanner Facial Section */}
              <div className="col-12 col-lg-8 col-xl-6">
                <div className="card card-moderno">
                  <div className="card-body p-3 p-md-4">
                    {/* Seleção de Obra */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        Selecionar Local
                      </label>
                      <Select
                        options={opcoesObras}
                        isLoading={isObrasLoading}
                        value={
                          opcoesObras.find(
                            (o) => String(o.value) === String(obraSelecionada),
                          ) || null
                        }
                        onChange={(opcao) =>
                          setObraSelecionada(opcao?.value || "")
                        }
                        placeholder="Escolha o local para registar o ponto..."
                        classNamePrefix="react-select"
                        isClearable
                      />
                    </div>

                    {/* Botão de Reconhecimento Facial */}
                    <div className="text-center mb-4">
                      {!isFacialScanning ? (
                        <button
                          className="btn btn-facial w-100 w-md-auto"
                          onClick={handleStartFacialScan}
                          disabled={
                            !obraSelecionada ||
                            isRegistering ||
                            isProcessingScan ||
                            isAuthLoading ||
                            isPostLoading
                          }
                        >
                          {isAuthLoading || isPostLoading ? (
                            <FaSpinner className="me-2 spin" />
                          ) : (
                            <FaCamera className="me-2" />
                          )}
                          <span className="d-none d-sm-inline">
                            {isAuthLoading
                              ? "A autenticar..."
                              : isPostLoading
                                ? "A registar..."
                                : "Identificar e Registar Ponto"}
                          </span>
                          <span className="d-sm-none">
                            {isAuthLoading
                              ? "A autenticar..."
                              : isPostLoading
                                ? "A registar..."
                                : "Identificar e Registar"}
                          </span>
                        </button>
                      ) : (
                        <button
                          className="btn btn-facial w-100 w-md-auto"
                          onClick={handleStopFacialScan}
                          disabled={
                            isRegistering ||
                            isProcessingScan ||
                            isAuthLoading ||
                            isPostLoading
                          }
                        >
                          <FaStop className="me-2" />
                          Cancelar Identificação
                        </button>
                      )}
                    </div>

                    {/* Botão de Registo de Visitantes - Apenas para JPA */}
                    {isEmpresaJPA && (
                      <div className="text-center mb-4">
                        <button
                          className="btn btn-visitante w-100 w-md-auto"
                          onClick={handleAbrirModalVisitante}
                          disabled={!obraSelecionada || isRegistering}
                        >
                          <FaUsers className="me-2" />
                          Registo de Visitantes
                        </button>
                      </div>
                    )}

                    {/* Botão de Registo de Externos via QR - Apenas para JPA */}
                    {isEmpresaJPA && (
                      <div className="text-center mb-4">
                        <button
                          className="btn btn-externo w-100 w-md-auto"
                          onClick={handleAbrirModalExternoQR}
                          disabled={!obraSelecionada || isRegistering}
                        >
                          <FaQrcode className="me-2" />
                          Registo de Externos (QR)
                        </button>
                      </div>
                    )}

                    {/* Status Message */}
                    {statusMessage && (
                      <div className="status-message mb-4">{statusMessage}</div>
                    )}

                    {/* Obra Selecionada */}
                    {obraSelecionada && (
                      <div className="alert alert-info">
                        <FaMapMarkerAlt className="me-2" />
                        <strong>Local Selecionado:</strong>{" "}
                        {obras.find(
                          (o) => String(o.id) === String(obraSelecionada),
                        )?.nome || "Desconhecida"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumo da Obra */}
              {obraSelecionada && (
                <div className="col-12 col-lg-4 col-xl-6">
                  <div className="card card-moderno h-100">
                    <div className="card-body">
                      <h5 className="card-title text-primary fw-bold mb-3">
                        <FaUsers className="me-2" /> Resumo
                        {isResumoLoading && <FaSpinner className="ms-2 spin" />}
                      </h5>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fw-semibold">
                          Pessoas a Trabalhar:
                        </span>
                        <span className="fs-4 fw-bold text-success">
                          {isResumoLoading
                            ? "..."
                            : resumoObra.pessoasAConsultar}
                        </span>
                      </div>
                      <hr className="mb-3" />
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-semibold mb-0">
                          Entradas e Saídas Recentes:
                        </h6>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={handleAbrirDetalhes}
                          disabled={isResumoLoading || !resumoObra.entradasSaidas?.length}
                        >
                          Ver Mais
                        </button>
                      </div>
                      {isResumoLoading ? (
                        <p className="text-muted fst-italic">A carregar...</p>
                      ) : resumoObra.entradasSaidas?.length > 0 ? (
                        <ul
                          className="list-unstyled mb-0"
                          style={{ maxHeight: "200px", overflowY: "auto" }}
                        >
                          {resumoObra.entradasSaidas.slice(0, 5).map((reg, index) => (
                            <li
                              key={index}
                              className={`registro-item ${reg.tipo === "saida" ? "registro-saida" : ""} d-flex justify-content-between align-items-center p-2 mb-2`}
                            >
                              <div className="flex-grow-1">
                                <strong className="d-block">
                                  {reg.User?.nome ||
                                    reg.nome ||
                                    "Utilizador Desconhecido"}
                                </strong>
                                <small className="text-muted d-block">
                                  {reg.timestamp
                                    ? new Date(reg.timestamp).toLocaleString()
                                    : "-"}
                                </small>
                                {reg.tipoEntidade === "visitante" && (
                                  <>
                                    <small className="text-info d-block">
                                      <FaUsers className="me-1" />
                                      Visitante
                                    </small>
                                    {reg.nomeEmpresa && (
                                      <small className="text-muted d-block">
                                        Empresa: {reg.nomeEmpresa}
                                      </small>
                                    )}
                                  </>
                                )}
                                {reg.tipoEntidade === "externo" && (
                                  <small className="text-warning d-block">
                                    <FaQrcode className="me-1" />
                                    Externo
                                  </small>
                                )}
                              </div>
                              <div className="d-flex flex-column align-items-end gap-1">
                                <span
                                  className={`badge rounded-pill ${reg.tipo === "entrada" ? "bg-success" : "bg-danger"}`}
                                >
                                  {reg.tipo === "entrada" ? "Entrada" : "Saída"}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted fst-italic">
                          Sem registos recentes para este local.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Facial Visível */}
      <VisibleFacialScanner
        onScanComplete={handleFacialScanComplete}
        isScanning={isFacialScanning}
        onStartScan={handleStartFacialScan}
        onStopScan={handleStopFacialScan}
        t={(key) => key}
      />

      {/* Modal de Externos - QR Scanner */}
      {showExternoQRModal && (
        <div
          className="result-modal-overlay"
          onClick={() => {
            setShowExternoQRModal(false);
            setQrScannerActive(false);
          }}
        >
          <div
            className="result-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px" }}
          >
            <div className="result-modal-header">
              <h3 className="modal-title">Registo de Externo - QR Code</h3>
            </div>
            <div className="result-modal-body">
              {qrScannerActive ? (
                <>
                  <p className="mb-3">
                    Aponte a câmera para o QR code do trabalhador externo:
                  </p>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      maxWidth: "300px",
                      margin: "0 auto",
                    }}
                  >
                    <video
                      id="qr-video"
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        border: "2px solid #6f42c1",
                      }}
                      autoPlay
                      playsInline
                      ref={(video) => {
                        if (video && qrScannerActive) {
                          import("qr-scanner").then(
                            ({ default: QrScanner }) => {
                              const qrScanner = new QrScanner(
                                video,
                                (result) => {
                                  handleQRCodeScan(result.data);
                                  qrScanner.stop();
                                },
                                {
                                  returnDetailedScanResult: true,
                                  highlightScanRegion: true,
                                },
                              );
                              qrScanner.start();
                            },
                          );
                        }
                      }}
                    />
                  </div>
                  <button
                    className="btn btn-secondary w-100 mt-3"
                    onClick={() => {
                      setShowExternoQRModal(false);
                      setQrScannerActive(false);
                    }}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-3">A processar...</p>
                  {externoNome && <p className="fw-bold">{externoNome}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visitantes */}
      {showVisitanteModal && (
        <div
          className="result-modal-overlay"
          onClick={() => setShowVisitanteModal(false)}
        >
          <div
            className="result-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px" }}
          >
            <div className="result-modal-header">
              <h3 className="modal-title">Registo de Visitante</h3>
            </div>
            <div className="result-modal-body">
              {visitanteStep === "buscar" ? (
                <>
                  <p className="mb-3">
                    Insira o número de contribuinte do visitante:
                  </p>
                  <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="Número de Contribuinte"
                    value={numeroContribuinte}
                    onChange={(e) => setNumeroContribuinte(e.target.value)}
                  />
                  <button
                    className="modal-close-btn w-100"
                    onClick={handleBuscarVisitante}
                  >
                    Buscar Visitante
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-3 text-warning">
                    Visitante não encontrado. Criar nova ficha:
                  </p>
                  <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="Primeiro Nome *"
                    value={visitanteData.primeiroNome}
                    onChange={(e) =>
                      setVisitanteData({
                        ...visitanteData,
                        primeiroNome: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="Último Nome *"
                    value={visitanteData.ultimoNome}
                    onChange={(e) =>
                      setVisitanteData({
                        ...visitanteData,
                        ultimoNome: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="Número de Contribuinte *"
                    value={numeroContribuinte}
                    onChange={(e) => setNumeroContribuinte(e.target.value)}
                    disabled
                  />
                  <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="Nome Empresa *"
                    value={visitanteData.nomeEmpresa || ""}
                    onChange={(e) =>
                      setVisitanteData({
                        ...visitanteData,
                        nomeEmpresa: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="NIF Empresa (opcional)"
                    value={visitanteData.nifEmpresa || ""}
                    onChange={(e) =>
                      setVisitanteData({
                        ...visitanteData,
                        nifEmpresa: e.target.value,
                      })
                    }
                  />
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-secondary flex-grow-1"
                      onClick={() => setVisitanteStep("buscar")}
                    >
                      Voltar
                    </button>
                    <button
                      className="modal-close-btn flex-grow-1"
                      onClick={handleCriarVisitante}
                    >
                      Criar e Registar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Definições */}
      {showDefinicoesModal && (
        <div
          className="result-modal-overlay"
          onClick={() => setShowDefinicoesModal(false)}
        >
          <div
            className="result-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <div className="result-modal-header">
              <h3 className="modal-title">⚙️ Definições de Visitantes</h3>
            </div>
            <div className="result-modal-body">
              <div className="mb-3 text-start">
                <label className="form-label fw-semibold">
                  Emails para Notificações de Visitantes:
                </label>
                
                {/* Lista de emails adicionados */}
                {emailVisitantes.length > 0 && (
                  <div className="mb-3" style={{ 
                    maxHeight: "200px", 
                    overflowY: "auto",
                    border: "1px solid #dee2e6",
                    borderRadius: "8px",
                    padding: "0.5rem"
                  }}>
                    {emailVisitantes.map((email, index) => (
                      <div 
                        key={index}
                        className="d-flex justify-content-between align-items-center p-2 mb-2"
                        style={{
                          background: "#f8f9fa",
                          borderRadius: "6px",
                          border: "1px solid #e9ecef"
                        }}
                      >
                        <span style={{ fontSize: "0.9rem" }}>{email}</span>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoverEmail(email)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.8rem"
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Adicionar novo email */}
                <div className="input-group">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="exemplo@advir.pt"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdicionarEmail();
                      }
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleAdicionarEmail}
                    style={{
                      background: "linear-gradient(45deg, #1792fe, #0d7efe)",
                      border: "none"
                    }}
                  >
                    Adicionar
                  </button>
                </div>
                <small className="text-muted">
                  Estes emails receberão notificações sempre que um visitante
                  registar entrada/saída
                </small>
              </div>
              <div className="d-flex gap-2 mt-4">
                <button
                  className="btn btn-secondary flex-grow-1"
                  onClick={() => setShowDefinicoesModal(false)}
                  disabled={isSavingConfig}
                >
                  Cancelar
                </button>
                <button
                  className="modal-close-btn flex-grow-1"
                  onClick={handleSalvarDefinicoes}
                  disabled={isSavingConfig}
                >
                  {isSavingConfig ? (
                    <>
                      <FaSpinner className="me-2 spin" />A guardar...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes de Pessoal */}
      {showDetalhesModal && (
        <div
          className="result-modal-overlay"
          onClick={() => setShowDetalhesModal(false)}
        >
          <div
            className="result-modal detalhes-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="result-modal-header">
              <h3 className="modal-title">Detalhes do Pessoal</h3>
              <p className="modal-subtitle" style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                {obras.find((o) => String(o.id) === String(obraSelecionada))?.nome}
              </p>
            </div>
            <div className="result-modal-body detalhes-modal-body">
              {/* Totalizadores Principais */}
              <div className="row mb-3 g-2">
                <div className="col-4">
                  <div className="p-3 text-center" style={{ 
                    background: "linear-gradient(135deg, #28a745, #20c997)", 
                    borderRadius: "12px", 
                    color: "white",
                    boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)"
                  }}>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
                      {getTotalizadores().aTrabalhador}
                    </div>
                    <small style={{ fontSize: "0.8rem", opacity: 0.9 }}>A Trabalhar</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-3 text-center" style={{ 
                    background: "linear-gradient(135deg, #dc3545, #e63946)", 
                    borderRadius: "12px", 
                    color: "white",
                    boxShadow: "0 4px 12px rgba(220, 53, 69, 0.3)"
                  }}>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
                      {getTotalizadores().saiu}
                    </div>
                    <small style={{ fontSize: "0.8rem", opacity: 0.9 }}>Saíram</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-3 text-center" style={{ 
                    background: "linear-gradient(135deg, #1792fe, #0d7efe)", 
                    borderRadius: "12px", 
                    color: "white",
                    boxShadow: "0 4px 12px rgba(23, 146, 254, 0.3)"
                  }}>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
                      {getTotalizadores().total}
                    </div>
                    <small style={{ fontSize: "0.8rem", opacity: 0.9 }}>Total Registos</small>
                  </div>
                </div>
              </div>

              {/* Totalizadores por Tipo */}
              <div className="row mb-4 g-2">
                <div className="col-4">
                  <div className="p-2 text-center" style={{ 
                    background: "rgba(23, 146, 254, 0.1)", 
                    border: "2px solid #1792fe",
                    borderRadius: "10px",
                    transition: "all 0.3s ease"
                  }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#1792fe", marginBottom: "0.25rem" }}>
                      {getTotalizadores().colaboradores}
                    </div>
                    <small style={{ fontSize: "0.75rem", color: "#1792fe", fontWeight: "600" }}>Colaboradores</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 text-center" style={{ 
                    background: "rgba(23, 162, 184, 0.1)", 
                    border: "2px solid #17a2b8",
                    borderRadius: "10px",
                    transition: "all 0.3s ease"
                  }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#17a2b8", marginBottom: "0.25rem" }}>
                      {getTotalizadores().visitantes}
                    </div>
                    <small style={{ fontSize: "0.75rem", color: "#17a2b8", fontWeight: "600" }}>Visitantes</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 text-center" style={{ 
                    background: "rgba(255, 193, 7, 0.1)", 
                    border: "2px solid #ffc107",
                    borderRadius: "10px",
                    transition: "all 0.3s ease"
                  }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#f59c00", marginBottom: "0.25rem" }}>
                      {getTotalizadores().externos}
                    </div>
                    <small style={{ fontSize: "0.75rem", color: "#f59c00", fontWeight: "600" }}>Externos</small>
                  </div>
                </div>
              </div>

              <hr style={{ margin: "1.5rem 0", opacity: 0.2 }} />

              {/* Filtros */}
              <div className="row mb-4 g-3">
                <div className="col-6">
                  <label className="form-label fw-semibold" style={{ fontSize: "0.9rem", marginBottom: "0.5rem", color: "#333" }}>
                    🏷️ Tipo:
                  </label>
                  <select
                    className="form-select"
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    style={{
                      borderRadius: "8px",
                      border: "2px solid #e9ecef",
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.95rem",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <option value="todos">Todos os Tipos</option>
                    <option value="trabalhador">👷 Colaboradores</option>
                    <option value="visitante">👥 Visitantes</option>
                    <option value="externo">🔧 Externos</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold" style={{ fontSize: "0.9rem", marginBottom: "0.5rem", color: "#333" }}>
                    📊 Estado:
                  </label>
                  <select
                    className="form-select"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    style={{
                      borderRadius: "8px",
                      border: "2px solid #e9ecef",
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.95rem",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <option value="todos">Todos os Estados</option>
                    <option value="aTrabalhador">✅ A Trabalhar</option>
                    <option value="saiu">❌ Saiu</option>
                  </select>
                </div>
              </div>

              {/* Lista de Registos */}
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {getRegistosFiltrados().length > 0 ? (
                  <ul className="list-unstyled mb-0">
                    {getRegistosFiltrados().map((reg, index) => (
                      <li
                        key={index}
                        className={`registro-item ${reg.tipo === "saida" ? "registro-saida" : ""} d-flex justify-content-between align-items-center p-2 mb-2`}
                      >
                        <div className="flex-grow-1">
                          <strong className="d-block">
                            {reg.User?.nome || reg.nome || "Utilizador Desconhecido"}
                          </strong>
                          <small className="text-muted d-block">
                            {reg.timestamp
                              ? new Date(reg.timestamp).toLocaleString()
                              : "-"}
                          </small>
                          {reg.tipoEntidade === "visitante" && (
                            <>
                              <small className="text-info d-block">
                                <FaUsers className="me-1" />
                                Visitante
                              </small>
                              {reg.nomeEmpresa && (
                                <small className="text-muted d-block">
                                  Empresa: {reg.nomeEmpresa}
                                </small>
                              )}
                            </>
                          )}
                          {reg.tipoEntidade === "externo" && (
                            <small className="text-warning d-block">
                              <FaQrcode className="me-1" />
                              Externo
                            </small>
                          )}
                          {reg.tipoEntidade === "trabalhador" && (
                            <small className="text-primary d-block">
                              <FaUserCheck className="me-1" />
                              Colaborador
                            </small>
                          )}
                        </div>
                        <div className="d-flex flex-column align-items-end gap-1">
                          <span
                            className={`badge rounded-pill ${reg.tipo === "entrada" ? "bg-success" : "bg-danger"}`}
                          >
                            {reg.tipo === "entrada" ? "Entrada" : "Saída"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted fst-italic text-center">
                    Sem registos para os filtros selecionados
                  </p>
                )}
              </div>

              <button
                className="modal-close-btn w-100 mt-3"
                onClick={() => setShowDetalhesModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultado */}
      {showResultModal && (
        <div className="result-modal-overlay">
          <div className="result-modal auto-close-modal" onClick={(e) => e.stopPropagation()}>
            <div className="result-modal-header">
              <div
                className={
                  modalData.type === "success" ? "success-icon" : "error-icon"
                }
              >
                {modalData.type === "success" ? (
                  <FaCheckCircle />
                ) : (
                  <FaExclamationCircle />
                )}
              </div>
              <h3 className="modal-title">
                {modalData.type === "success" ? modalData.action : "Erro!"}
              </h3>
              <p className="modal-subtitle">{modalData.userName}</p>
            </div>
            <div className="result-modal-body">
              <p
                style={{
                  fontSize: "1.1rem",
                  marginBottom: "0.5rem",
                  color: modalData.type === "success" ? "#28a745" : "#dc3545",
                  fontWeight: "500",
                }}
              >
                {modalData.message}
              </p>
              <small className="text-muted" style={{ fontSize: "0.85rem" }}>
                Esta mensagem irá fechar automaticamente...
              </small>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default RegistoPontoFacial;
