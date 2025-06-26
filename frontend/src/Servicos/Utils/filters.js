export const filterProcessosByTecnico = (processos, tecnicoID) =>
  processos.filter(p => p.Tecnico1 === tecnicoID);

export const countProcessosByTecnico = (processos, tecnicoID) =>
  filterProcessosByTecnico(processos, tecnicoID).length;
