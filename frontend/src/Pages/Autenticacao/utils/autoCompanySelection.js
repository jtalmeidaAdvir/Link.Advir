// utils/autoCompanySelection.js

export const handleAutoCompanySelection = async (navigation) => {
    try {
        const loginToken = localStorage.getItem("loginToken");
        const empresaPredefinida = localStorage.getItem("empresaPredefinida");

        if (!loginToken) {
            console.log('Token de login não encontrado');
            return false;
        }

        // Verificar e renovar tokens antes de tentar seleção automática
        const { refreshTokensOnAppFocus } = await import('../../../utils/authUtils');
        await refreshTokensOnAppFocus();

        // Se há uma empresa predefinida, entrar automaticamente
        if (empresaPredefinida) {
            console.log('Empresa predefinida encontrada:', empresaPredefinida);

            try {
                const { entrarEmpresaPredefinida } = await import('./empresaUtils');
                await entrarEmpresaPredefinida(empresaPredefinida, navigation);
                return true;
            } catch (error) {
                console.error('Erro ao entrar na empresa predefinida:', error);
                // Continue para buscar empresas disponíveis
            }
        }

        // Buscar empresas disponíveis
        const response = await fetch("https://backend.advir.pt/api/users/empresas", {
            method: "GET",
            headers: { Authorization: `Bearer ${loginToken}` },
        });

        if (!response.ok) {
            console.log('Erro ao buscar empresas do usuário');
            return false;
        }

        const empresas = await response.json();

        // Se há apenas uma empresa, entrar automaticamente
        if (empresas.length === 1) {
            const empresaUnica = empresas[0].empresa;
            console.log('Apenas uma empresa disponível, entrando automaticamente:', empresaUnica);

            try {
                const { handleEntrarEmpresa } = await import('../handlers/handleEntrarEmpresa');

                await handleEntrarEmpresa({
                    empresa: empresaUnica,
                    setEmpresa: () => { }, // função vazia pois não precisamos atualizar estado
                    setLoadingButton: () => { },
                    setErrorMessage: () => { },
                    navigation,
                });

                return true;
            } catch (error) {
                console.error('Erro ao entrar automaticamente na empresa única:', error);
                return false;
            }
        }

        // Se há múltiplas empresas, verificar se existe uma última empresa selecionada
        const ultimaEmpresaSelecionada = localStorage.getItem("empresaSelecionada");
        if (ultimaEmpresaSelecionada) {
            const empresaEncontrada = empresas.find(emp => emp.empresa === ultimaEmpresaSelecionada);

            if (empresaEncontrada) {
                console.log('Última empresa selecionada encontrada, entrando automaticamente:', ultimaEmpresaSelecionada);

                try {
                    const { handleEntrarEmpresa } = await import('../handlers/handleEntrarEmpresa');

                    await handleEntrarEmpresa({
                        empresa: ultimaEmpresaSelecionada,
                        setEmpresa: () => { },
                        setLoadingButton: () => { },
                        setErrorMessage: () => { },
                        navigation,
                    });

                    return true;
                } catch (error) {
                    console.error('Erro ao entrar automaticamente na última empresa selecionada:', error);
                    return false;
                }
            }
        }

        console.log('Múltiplas empresas disponíveis, redirecionando para seleção manual');
        return false;

    } catch (error) {
        console.error('Erro na seleção automática de empresa:', error);
        return false;
    }
};