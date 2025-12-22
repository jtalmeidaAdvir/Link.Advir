
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
    secureStorage.setItem("empresa_id", credenciais.id);
    secureStorage.setItem("modoOffline", "false"); // Modo online

    setEmpresa(empresaStr);
    navigation.navigate("Home");
  } catch (err) {
    console.error("Erro:", err);

    // MODO OFFLINE: Avançar mesmo sem token da WebAPI
    console.warn("⚠️ WebAPI falhou - Entrando em MODO OFFLINE");

    try {
      // Tentar buscar empresa_id do backend (que funciona)
      const loginToken = secureStorage.getItem("loginToken");
      const credenciaisResponse = await fetch(
        `https://backend.advir.pt/api/empresas/nome/${encodeURIComponent(empresaStr)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${loginToken}` },
        }
      );

      if (credenciaisResponse.ok) {
        const credenciais = await credenciaisResponse.json();
        secureStorage.setItem("empresa_id", credenciais.id);
        console.log("✓ empresa_id obtido do backend:", credenciais.id);
      }
    } catch (backendErr) {
      console.error("Erro ao buscar empresa_id do backend:", backendErr);
    }

    // Armazena informações básicas para trabalhar offline
    secureStorage.setItem("empresaSelecionada", empresaStr);
    secureStorage.setItem("modoOffline", "true");
    secureStorage.removeItem("painelAdminToken"); // Remove token antigo se existir

    // Avisar o usuário
    setErrorMessage("⚠️ Modo Offline: Não foi possível conectar à empresa. Seus registos serão salvos localmente.");

    setEmpresa(empresaStr);

    // Avançar para Home em modo offline após 2 segundos
    setTimeout(() => {
      navigation.navigate("Home");
    }, 2000);
  } finally {
    if (typeof setLoadingButton === 'function') setLoadingButton(false);
  }
};