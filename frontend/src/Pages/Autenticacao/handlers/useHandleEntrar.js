// handlers/useHandleEntrar.js
import { handleEntrarEmpresa as entrarEmpresa } from './handleEntrarEmpresa';

export const useHandleEntrar = ({
  setEmpresa,
  empresaPredefinida,
  setLoadingButton,
  setErrorMessage,
  navigation,
}) => {
  const entrar = async (empresa, handlePredefinirEmpresa = () => {}) => {
    await entrarEmpresa({
      empresa,
      setEmpresa,
      empresaPredefinida,
      handlePredefinirEmpresa,
      setLoadingButton,
      setErrorMessage,
      navigation,
    });
  };

  return entrar;
};
