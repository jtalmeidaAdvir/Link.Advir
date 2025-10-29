
import { secureStorage } from '../../../utils/secureStorage';
//handlers/handleEntrarEmpresa.js
export const handleEntrarEmpresa = async ({
  empresa,
  setEmpresa,
  setLoadingButton,
  setErrorMessage,
  navigation,
}) => {
  const empresaStr = typeof empresa === "string" ? empresa : empresa?.empresa;

  if (!empresaStr) {
    setErrorMessage("Nome da empresa inválido.");
    return;
  }

  if (typeof setLoadingButton === 'function') setLoadingButton(true);

  try {
    const loginToken = secureStorage.getItem("loginToken");

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

    secureStorage.setItem("urlempresa", credenciais.urlempresa);

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

    secureStorage.setItem("painelAdminToken", data.token);
    secureStorage.setItem("empresaSelecionada", empresaStr);
    secureStorage.setItem("empresa_id", credenciais.id); // 👈 esta faltava aqui

    setEmpresa(empresaStr);
    navigation.navigate("Home");
  } catch (err) {
    console.error("Erro:", err);
    setErrorMessage(err.message);
  } finally {
    if (typeof setLoadingButton === 'function') setLoadingButton(false);
  }
};