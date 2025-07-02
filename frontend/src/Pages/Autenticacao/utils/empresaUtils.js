export const entrarEmpresaPredefinida = async (empresa, navigation) => {
  const loginToken = localStorage.getItem("loginToken");
  try {
    const credenciaisResponse = await fetch(
      `https://backend.advir.pt/api/empresas/nome/${encodeURIComponent(empresa)}`,
      { method: "GET", headers: { Authorization: `Bearer ${loginToken}` } }
    );

    if (!credenciaisResponse.ok) throw new Error();

    const credenciais = await credenciaisResponse.json();
    localStorage.setItem("urlempresa", credenciais.urlempresa);

    console.log("Credenciais recebidas:", credenciais); // 👈
    localStorage.setItem("empresaId", String(credenciais.id));


    const response = await fetch("https://webapiprimavera.advir.pt/connect-database/token", {
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
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("painelAdminToken", data.token);
      localStorage.setItem("empresaSelecionada", empresa);
      navigation.navigate("Home");
    } else {
      navigation.navigate("SelecaoEmpresa");
    }
  } catch (err) {
    navigation.navigate("SelecaoEmpresa");
  }
};
