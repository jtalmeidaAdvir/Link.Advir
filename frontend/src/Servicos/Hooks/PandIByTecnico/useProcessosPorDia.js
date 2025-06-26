import { useMemo } from 'react';
import { getDaysInWeek } from '../utils/dateUtils';

export default function useProcessosPorDia(intervencoesDetalhadas, filtro, ano, mes, semana) {
  return useMemo(() => {
    let diasParaExibir = [];

    if (filtro === 'semana') {
      diasParaExibir = getDaysInWeek(semana, ano);
    } else if (filtro === 'mes') {
      const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
      for (let i = 1; i <= ultimoDiaDoMes; i++) {
        diasParaExibir.push(new Date(ano, mes - 1, i));
      }
    } else if (filtro === 'anual') {
      for (let i = 1; i <= 365; i++) {
        diasParaExibir.push(new Date(ano, 0, i));
      }
    } else {
      diasParaExibir = [new Date()];
    }

    const processosPorDia = {};
    diasParaExibir.forEach((dia) => {
      const dataString = dia.toISOString().split('T')[0];
      processosPorDia[dataString] = {
        data: new Date(dia),
        processos: [],
      };
    });

    const getDiaProcesso = (processo) => {
      if (processo.intervencoes.length > 0) {
        return new Date(processo.intervencoes[0].DataHoraInicio)
          .toISOString()
          .split('T')[0];
      }
      if (processo.detalhesProcesso?.DataHoraInicio) {
        return new Date(processo.detalhesProcesso.DataHoraInicio)
          .toISOString()
          .split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    };

    intervencoesDetalhadas.forEach((processo) => {
      const dataDentroDoFiltro = (data) => {
        const d = new Date(data);
        if (filtro === 'semana') return getDaysInWeek(semana, ano).some(day => day.toDateString() === d.toDateString());
        if (filtro === 'mes') return d.getMonth() + 1 === mes && d.getFullYear() === ano;
        if (filtro === 'anual') return d.getFullYear() === ano;
        return true;
      };

      const deveMostrar = processo.intervencoes.some((intv) =>
        dataDentroDoFiltro(intv.DataHoraInicio)
      ) || (processo.detalhesProcesso?.DataHoraInicio &&
        dataDentroDoFiltro(processo.detalhesProcesso.DataHoraInicio));

      if (deveMostrar) {
        const dia = getDiaProcesso(processo);
        if (processosPorDia[dia]) {
          const intervFiltradas = processo.intervencoes.filter((intv) =>
            dataDentroDoFiltro(intv.DataHoraInicio)
          );

          const processoFiltrado = {
            ...processo,
            intervencoes: intervFiltradas,
          };

          processosPorDia[dia].processos.push(processoFiltrado);
        }
      }
    });

    return Object.values(processosPorDia)
      .filter((dia) => dia.processos.length > 0)
      .sort((a, b) => a.data - b.data);
  }, [intervencoesDetalhadas, filtro, ano, mes, semana]);
}
