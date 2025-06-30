// handlers/useEmpresas.js
import { useEffect } from 'react';
import { fetchEmpresasEPredefinida } from './empresaHandlers';

export const useEmpresas = ({
  setEmpresas,
  setEmpresaSelecionada,
  setEmpresaPredefinida,
  setErrorMessage,
  setLoading,
  handleEntrarEmpresa,
  setEmpresa,
  navigation,
  t,
  autoLogin = false, // 👈 adiciona esta flag como opcional
}) => {
  useEffect(() => {
    fetchEmpresasEPredefinida({
      setEmpresas,
      setEmpresaSelecionada,
      setEmpresaPredefinida,
      setErrorMessage,
      setLoading,
      handleEntrarEmpresa,
      setEmpresa,
      navigation,
      t,
      autoLogin, // 👈 passa a flag corretamente
    });
  }, [
    setEmpresas,
    setEmpresaSelecionada,
    setEmpresaPredefinida,
    setErrorMessage,
    setLoading,
    handleEntrarEmpresa,
    setEmpresa,
    navigation,
    t,
    autoLogin, // 👈 depende da flag
  ]);
};
