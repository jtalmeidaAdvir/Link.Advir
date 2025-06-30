//handlers/handleEntrarEmpresa.js
// This file handles the logic for entering a selected company in the application.
export const handleEntrarEmpresa = async ({
  empresa,
  setEmpresa,
  empresaPredefinida,
  handlePredefinirEmpresa,
  setLoadingButton,
  setErrorMessage,
  navigation,
}) => {
  // 🔒 Garantir que empresa é uma string válida
  const empresaStr = typeof empresa === "string" ? empresa : empresa?.empresa;

  if (!empresaStr) {
    setErrorMessage("Nome da empresa inválido.");
    return;
  }

  if (empresaPredefinida && typeof handlePredefinirEmpresa === 'function') {
    await handlePredefinirEmpresa(true);
  }

  if (typeof setLoadingButton === 'function') setLoadingButton(true);

  try {
    const loginToken = localStorage.getItem("loginToken");

    const credenciaisResponse = await fetch(
      `https://backend.advir.pt/api/empresas/nome/${encodeURIComponent(empresaStr)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${loginToken}` },
      }
    );

    if (!credenciaisResponse.ok)
      throw new Error("Credenciais não encontradas.");

    const credenciais = await credenciaisResponse.json();

    localStorage.setItem("urlempresa", credenciais.urlempresa);

    const response = await fetch(
      "https://webapiprimavera.advir.pt/connect-database/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginToken}`,
        },
        body: JSON.stringify({
          username: credenciais.username,
          password: credenciais.password,
          company: credenciais.empresa,
          line: credenciais.linha,
          instance: "DEFAULT",
          urlempresa: credenciais.urlempresa,
          forceRefresh: true,
        }),
      }
    );

    if (!response.ok) throw new Error("Erro ao obter token da empresa");
    const data = await response.json();

    localStorage.setItem("painelAdminToken", data.token);
    localStorage.setItem("empresaSelecionada", empresaStr);
    setEmpresa(empresaStr);
    navigation.navigate("Home");
  } catch (err) {
    console.error("Erro:", err);
    setErrorMessage(err.message);
  } finally {
    if (typeof setLoadingButton === 'function') setLoadingButton(false);
  }
};
