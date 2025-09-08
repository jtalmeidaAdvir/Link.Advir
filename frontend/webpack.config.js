const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync(env, argv);

    // Configurar o devServer para servir ficheiros estáticos HTML
    if (config.devServer) {
        // Configurar historyApiFallback para permitir acesso direto a ficheiros HTML
        config.devServer.historyApiFallback = {
            // Desativar fallback para ficheiros HTML específicos
            disableDotRule: true,
            rewrites: [
                // Servir ficheiros HTML diretamente
                { from: /^\/nfc\.html/, to: '/nfc.html' },
                { from: /^\/test\.html/, to: '/test.html' },
                // Todos os outros paths vão para o React app
                { from: /^\/(?!.*\.(html|css|js|png|jpg|jpeg|gif|svg|ico)$).*/, to: '/index.html' }
            ]
        };

        // Headers para ficheiros estáticos
        config.devServer.headers = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };

        // Configurar para servir ficheiros estáticos da pasta public
        config.devServer.static = [
            {
                directory: path.resolve(__dirname, 'public'),
                publicPath: '/',
                serveIndex: false
            }
        ];
    }

    // Ensure static files are copied correctly
    config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
    };

    return config;
};