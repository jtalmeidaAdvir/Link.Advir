import { useMemo } from 'react';
import { getDaysInWeek } from '../../Utils/dateUtils';

export default function useProcessosFiltrados(processos, filtro, ano, mes, semana) {
  const isDateInSelectedWeek = (dateToCheck) => {
    if (!dateToCheck) return false;
    const date = new Date(dateToCheck);
    return getWeek(date) === semana && date.getFullYear() === ano;
  };

  const isDateInSelectedMonth = (dateToCheck) => {
    if (!dateToCheck) return false;
    const date = new Date(dateToCheck);
    return date.getMonth() + 1 === mes && date.getFullYear() === ano;
  };

  return useMemo(() => {
    return processos.filter((processo) => {
      const dataInicio = new Date(processo.DataHoraInicio);

      if (filtro === "semana") return isDateInSelectedWeek(dataInicio);
      if (filtro === "mes") return isDateInSelectedMonth(dataInicio);
      if (filtro === "anual") return dataInicio.getFullYear() === ano;

      return true;
    });
  }, [processos, filtro, ano, mes, semana]);
}
