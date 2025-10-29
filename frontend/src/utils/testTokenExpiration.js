import { secureStorage } from '../utils/secureStorage';
// Função para testar se a verificação de token expirado está a funcionar
export const testTokenExpiration = () => {
    console.log('Testando verificação de token expirado...');

    // Simular resposta com token expirado
    const mockExpiredResponse = {
        message: 'painelAdminToken expirado'
    };

    // Importar as funções de verificação
    import('./authUtils.js').then(({ checkTokenExpired }) => {
        const result = checkTokenExpired(mockExpiredResponse);
        if (result) {
            console.log('✅ Teste passou: Token expirado foi detectado');
        } else {
            console.log('❌ Teste falhou: Token expirado não foi detectado');
        }
    });
};

// Função para simular um fetch que retorna erro 500 (como o seu caso atual)
export const testServer500Error = () => {
    console.log('Testando erro 500 do servidor...');

    // Este tipo de erro NÃO deve disparar o logout de token expirado
    const mock500Response = {
        status: 500,
        statusText: 'Internal Server Error'
    };

    import('./authUtils.js').then(({ checkTokenExpired }) => {
        const result = checkTokenExpired(mock500Response);
        console.log(`Erro 500: ${result ? '❌ Incorrectamente detectou token expirado' : '✅ Correctamente NÃO detectou token expirado'}`);
    });
};

// Função para forçar um token expirado no secureStorage e testar uma chamada real
export const forceTokenExpiryTest = () => {
    console.log('Forçando expiração de token para teste...');

    // Guardar token atual
    const originalToken = secureStorage.getItem('painelAdminToken');

    // Definir um token obviamente inválido
    secureStorage.setItem('painelAdminToken', 'token_expirado_teste');

    console.log('Token foi alterado para "token_expirado_teste"');
    console.log('Agora tente fazer uma operação que use a WebApi...');
    console.log('Para restaurar o token original, execute: restoreOriginalToken()');

    // Disponibilizar função para restaurar
    window.restoreOriginalToken = () => {
        if (originalToken) {
            secureStorage.setItem('painelAdminToken', originalToken);
            console.log('Token original restaurado');
        } else {
            secureStorage.removeItem('painelAdminToken');
            console.log('Token removido (não havia token original)');
        }
    };
};

// Função para testar com diferentes tipos de mensagens de erro
export const testAllTokenExpirationMessages = () => {
    const testCases = [
        { message: 'Token expirado' },
        { error: 'Token expirado' },
        { message: 'painelAdminToken expirado' },
        { error: 'painelAdminToken expirado' },
        { message: 'Unauthorized' },
        { error: 'Unauthorized' },
        'Token expirado'
    ];

    import('./authUtils.js').then(({ checkTokenExpired }) => {
        testCases.forEach((testCase, index) => {
            const result = checkTokenExpired(testCase);
            console.log(`Teste ${index + 1}: ${result ? '✅ Passou' : '❌ Falhou'}`, testCase);
        });
    });
};
