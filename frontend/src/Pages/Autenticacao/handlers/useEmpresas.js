
// handlers/useEmpresas.js
import { useEffect } from 'react';
import { fetchEmpresas } from './empresaHandlers';

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
  autoLogin,
}) => {
  useEffect(() => {
    fetchEmpresas({
      setEmpresas,
      setEmpresaSelecionada,
      setEmpresaPredefinida,
      setErrorMessage,
      setLoading,
      handleEntrarEmpresa,
      setEmpresa,
      navigation,
      t,
      autoLogin,
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
    autoLogin,
  ]);
};
