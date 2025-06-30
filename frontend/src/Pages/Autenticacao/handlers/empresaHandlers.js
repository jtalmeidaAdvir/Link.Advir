// handlers/empresaHandlers.js
export const fetchEmpresasEPredefinida = async ({
  setEmpresas,
  setEmpresaSelecionada,
  setEmpresaPredefinida,
  setErrorMessage,
  setLoading,
  handleEntrarEmpresa,
  setEmpresa,
  navigation,
  t,
  autoLogin = false, // ⬅️ nova flag
}) => {
  try {
    const loginToken = localStorage.getItem("loginToken");
    const userId = localStorage.getItem("userId");

    const empresaPredefinidaResponse = await fetch(
      `https://backend.advir.pt/api/users/${userId}/empresa-predefinida`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${loginToken}` },
      }
    );

    let empresaPredefinidaServidor = null;
    if (empresaPredefinidaResponse.ok) {
      const data = await empresaPredefinidaResponse.json();
      empresaPredefinidaServidor = data.empresaPredefinida;
    }

    const response = await fetch("https://backend.advir.pt/api/users/empresas", {
      method: "GET",
      headers: { Authorization: `Bearer ${loginToken}` },
    });

    if (response.ok) {
      const data = await response.json();
      setEmpresas(data);

      const tentativa = (empresa) => {
        const empresaNome = typeof empresa === "string" ? empresa : empresa?.empresa;
        const existe = data.find((e) => e.empresa === empresaNome);

        if (existe) {
          setEmpresaSelecionada(empresaNome);
          setEmpresaPredefinida(true);
          localStorage.setItem("empresaPredefinida", empresaNome);

          if (autoLogin) {
            handleEntrarEmpresa({
              empresa: empresaNome,
              empresaPredefinida: true,
              setEmpresa,
              navigation,
            });
          }

          return true;
        }
        return false;
      };

      // Só tentar login automático se o `autoLogin` for true
      if (autoLogin && empresaPredefinidaServidor && tentativa(empresaPredefinidaServidor)) return;

      const localStorageEmpresa = localStorage.getItem("empresaPredefinida");
      if (autoLogin && localStorageEmpresa && tentativa(localStorageEmpresa)) return;

      // Se só houver uma empresa, mostra mas não entra automaticamente
      if (data.length === 1) {
        const empresaUnica = data[0].empresa;
        setEmpresaSelecionada(empresaUnica);
      }

    } else {
      setErrorMessage(t("SelecaoEmpresa.Error.1"));
    }
  } catch (error) {
    console.error("Erro de rede:", error);
    setErrorMessage("Erro de rede, tente novamente mais tarde.");
  } finally {
    setLoading(false);
  }
};




export const handlePredefinirEmpresa = async ({ checked, empresaSelecionada, setEmpresaPredefinida }) => {
  setEmpresaPredefinida(checked);
  const userId = localStorage.getItem("userId");
  const loginToken = localStorage.getItem("loginToken");

  try {
    const response = await fetch(
      `https://backend.advir.pt/api/users/${userId}/empresa-predefinida`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginToken}`,
        },
        body: JSON.stringify({
          empresaPredefinida: checked ? empresaSelecionada : null,
        }),
      }
    );

    if (response.ok) {
      if (checked && empresaSelecionada) {
        localStorage.setItem("empresaPredefinida", empresaSelecionada);
      } else {
        localStorage.removeItem("empresaPredefinida");
      }
    } else {
      console.error("Erro ao salvar empresa predefinida no servidor");
      setEmpresaPredefinida(!checked);
    }
  } catch (error) {
    console.error("Erro de rede ao salvar empresa predefinida:", error);
    setEmpresaPredefinida(!checked);
  }
};
