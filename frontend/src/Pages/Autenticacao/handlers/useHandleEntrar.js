// handlers/useHandleEntrar.js
import { handleEntrarEmpresa } from './handleEntrarEmpresa';

export const useHandleEntrar = ({
    setEmpresa,
    empresaPredefinida,
    setLoadingButton,
    setErrorMessage,
    navigation,
}) => {
    return async (empresaSelecionada, onTogglePredefinir) => {
        if (!empresaSelecionada) {
            setErrorMessage('Por favor, selecione uma empresa.');
            return;
        }

        setLoadingButton(true);
        setErrorMessage('');

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

            // Verificar se tem tipoUser para redirecionar para RegistoPontoObra
            const tipoUser = localStorage.getItem('tipoUser');

            // Forçar refresh da página após selecionar empresa
            setTimeout(() => {
                window.location.reload();
            }, 500);

            if (tipoUser) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'RegistoPontoObra' }],
                });
            } else {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                });
            }
        } catch (error) {
            console.error('Erro ao entrar na empresa:', error);
            setErrorMessage('Erro de conexão. Tente novamente.');
        } finally {
            setLoadingButton(false);
        }
    };
};