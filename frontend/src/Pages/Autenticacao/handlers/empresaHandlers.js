// handlers/empresaHandlers.js
import { handleEntrarEmpresa } from './handleEntrarEmpresa';
 
// empresaHandlers.js
 
export const fetchEmpresas = async ({
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
    onAutoLogin,
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
 
        if (data.length === 1) {
            const empresaUnica = data[0].empresa;
            setEmpresaSelecionada(empresaUnica);
 
            if (autoLogin) {
                onAutoLogin?.(); // marca que o autoLogin já foi feito
 
                await handleEntrarEmpresa({
                    empresa: empresaUnica,
                    setEmpresa,
                    setLoadingButton: () => { },
                    setErrorMessage,
                    navigation,
                });
            }
        }
 
    } catch (error) {
        console.error("Erro de rede:", error);
        setErrorMessage("Erro de rede, tente novamente mais tarde.");
    } finally {
        setLoading(false);
    }
};