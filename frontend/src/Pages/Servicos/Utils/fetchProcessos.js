// src/Utils/fetchProcessos.js
import { fetchWithRetry } from "./fetchUtils";
import { getWeeksInMonth } from "./dateUtils";
import { secureStorage } from '../../../utils/secureStorage';
export const fetchProcessosByTecnico = async (tecnicoID, ano, mes, semana, setSemanaAtual, setLoading) => {
  const token = secureStorage.getItem("painelAdminToken");
  const urlempresa = secureStorage.getItem("urlempresa");

  if (!token || !urlempresa) {
    throw new Error("Token ou URL da empresa não encontrados.");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    urlempresa,
  };

  setLoading?.(true); // permite opcionalmente setar loading

  try {
    const res = await fetchWithRetry(
      `https://webapiprimavera.advir.pt/routePedidos_STP/ListaProcessosTecnico/${tecnicoID}`,
      { method: "GET", headers }
    );
    const data = await res.json();

    const processosMap = (data?.DataSet?.Table || []).reduce((acc, processo) => {
      acc[processo.ID] = processo;
      return acc;
    }, {});

    const todosProcessos = {};

    (data?.DataSet?.Table || []).forEach((processo) => {
      todosProcessos[processo.ID] = {
        processoID: processo.ID,
        detalhesProcesso: processo,
        intervencoes: [{
          TipoInterv: processo.TipoInterv,
          DataHoraInicio: processo.DataHoraInicio,
          Duracao: processo.Duracao,
          Observacoes: processo.DescricaoResp,
        }],
      };
    });

    // Ajuste de semana se necessário
    const semanasDoMes = getWeeksInMonth(mes, ano);
    if (!semanasDoMes.includes(semana)) {
      setSemanaAtual?.(
        semanasDoMes.includes(getWeek(new Date())) ? getWeek(new Date()) : semanasDoMes[0]
      );
    }

    return {
      processos: data?.DataSet?.Table || [],
      intervencoesDetalhadas: Object.values(todosProcessos),
    };

  } catch (error) {
    throw error;
  } finally {
    setLoading?.(false);
  }
};
