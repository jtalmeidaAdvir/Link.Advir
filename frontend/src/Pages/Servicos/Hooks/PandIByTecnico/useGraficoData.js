const useGraficoData = (processosFiltrados) => {
  const getInterventionTypeData = () => {
    const tiposCounts = {};
    processosFiltrados.forEach(({ TipoInterv }) => {
      const tipo = TipoInterv || "Outro";
      tiposCounts[tipo] = (tiposCounts[tipo] || 0) + 1;
    });
    return Object.entries(tiposCounts).map(([name, value]) => ({ name, value }));
  };

  const getAssistanceTypeData = () => {
    const tiposCounts = {};
    processosFiltrados.forEach(({ TipoDoc1 }) => {
      const tipo = TipoDoc1 || "Outro";
      tiposCounts[tipo] = (tiposCounts[tipo] || 0) + 1;
    });
    return Object.entries(tiposCounts).map(([name, value]) => ({ name, value }));
  };

  const getHoursPerDayData = () => {
    const horasPorDia = {};
    processosFiltrados.forEach(({ DataHoraInicio, Duracao }) => {
      if (DataHoraInicio && Duracao) {
        const dataStr = new Date(DataHoraInicio).toISOString().split('T')[0];
        horasPorDia[dataStr] = (horasPorDia[dataStr] || 0) + Duracao / 60;
      }
    });
    return Object.entries(horasPorDia).map(([date, hours]) => ({
      day: new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
      hours: parseFloat(hours.toFixed(1))
    }));
  };

  return {
    getInterventionTypeData,
    getAssistanceTypeData,
    getHoursPerDayData
  };
};

export default useGraficoData;
