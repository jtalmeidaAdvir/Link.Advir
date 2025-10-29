// handlers/useHandleEntrar.js
import { handleEntrarEmpresa } from "./handleEntrarEmpresa";
import { secureStorage } from '../../../utils/secureStorage';
export const useHandleEntrar = ({
    setEmpresa,
    empresaPredefinida,
    setLoadingButton,
    setErrorMessage,
    navigation,
}) => {
    return async (empresaSelecionada, onTogglePredefinir) => {
        if (!empresaSelecionada) {
            setErrorMessage("Por favor, selecione uma empresa.");
            return;
        }

        setLoadingButton(true);
        setErrorMessage("");

        try {
            await handleEntrarEmpresa({
                empresa: empresaSelecionada,
                setEmpresa,
                setLoadingButton,
                setErrorMessage,
                navigation,
            });

            if (empresaPredefinida) {
                onTogglePredefinir();
            }

            // Verificar se tem tipoUser e submódulo Ponto para redirecionar para RegistoPontoObra
            const tipoUser = secureStorage.getItem("tipoUser");

            // Fazer uma nova chamada à API para obter os módulos e submódulos atualizados
            const userId = secureStorage.getItem("userId");
            const empresaId = secureStorage.getItem("empresa_id");
            const loginToken = secureStorage.getItem("loginToken");

            let hasPointSubmodule = false;

            if (userId && empresaId && loginToken) {
                try {
                    const response = await fetch(
                        `https://backend.advir.pt/api/users/${userId}/modulos-e-submodulos?empresa_id=${empresaId}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${loginToken}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        const userModules = data.modulos || [];

                        // Procurar especificamente pelo submódulo "Ponto"
                        for (const module of userModules) {
                            if (module.submodulos && Array.isArray(module.submodulos)) {
                                for (const sub of module.submodulos) {
                                    if (sub.nome === "Ponto") {
                                        hasPointSubmodule = true;
                                        break;
                                    }
                                }
                                if (hasPointSubmodule) break;
                            }
                        }
                    }
                } catch (error) {
                    console.error("Erro ao buscar módulos:", error);
                }
            }

            if (tipoUser && hasPointSubmodule) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: "RegistoPontoObra" }],
                });
            } else {
                navigation.reset({
                    index: 0,
                    routes: [{ name: "Home" }],
                });
            }

            // Forçar refresh da página após selecionar empresa
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error("Erro ao entrar na empresa:", error);
            setErrorMessage("Erro de conexão. Tente novamente.");
        } finally {
            setLoadingButton(false);
        }
    };
};
