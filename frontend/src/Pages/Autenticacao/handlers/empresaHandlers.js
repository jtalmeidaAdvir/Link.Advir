// handlers/empresaHandlers.js

export const fetchEmpresas = async ({
  setEmpresas,
  setEmpresaSelecionada,
  setErrorMessage,
  setLoading,
  handleEntrarEmpresa,
  setEmpresa,
  navigation,
  t,
}) => {
  try {
    const loginToken = localStorage.getItem("loginToken");

    const response = await fetch("https://backend.advir.pt/api/users/empresas", {
      method: "GET",
      headers: { Authorization: `Bearer ${loginToken}` },
    });

    if (!response.ok) {
      setErrorMessage(t("SelecaoEmpresa.Error.1"));
      return;
    }

    const data = await response.json();
    setEmpresas(data);

    // Apenas seleciona automaticamente se existir só uma empresa
    if (data.length === 1) {
      const empresaUnica = data[0].empresa;
      setEmpresaSelecionada(empresaUnica);
    }

  } catch (error) {
    console.error("Erro de rede:", error);
    setErrorMessage("Erro de rede, tente novamente mais tarde.");
  } finally {
    setLoading(false);
  }
};


