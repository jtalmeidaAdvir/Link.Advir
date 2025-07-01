
// handlers/useEmpresas.js
import { useEffect } from 'react';
import { fetchEmpresas } from './empresaHandlers';

export const useEmpresas = ({
  setEmpresas,
  setEmpresaSelecionada,
  setErrorMessage,
  setLoading,
  handleEntrarEmpresa,
  setEmpresa,
  navigation,
  t,
}) => {
  useEffect(() => {
    fetchEmpresas({
      setEmpresas,
      setEmpresaSelecionada,
      setErrorMessage,
      setLoading,
      handleEntrarEmpresa,
      setEmpresa,
      navigation,
      t,
    });
  }, [
    setEmpresas,
    setEmpresaSelecionada,
    setErrorMessage,
    setLoading,
    handleEntrarEmpresa,
    setEmpresa,
    navigation,
    t,
  ]);
};
