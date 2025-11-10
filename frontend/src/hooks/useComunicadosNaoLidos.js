
import { useState, useEffect } from 'react';
import { secureStorage } from '../utils/secureStorage';

export const useComunicadosNaoLidos = () => {
    const [naoLidos, setNaoLidos] = useState(0);

    useEffect(() => {
        const fetchNaoLidos = async () => {
            try {
                const token = secureStorage.getItem('loginToken');
                const userId = secureStorage.getItem('userId');
                const empresaId = secureStorage.getItem('empresaId') || secureStorage.getItem('empresa_id');

                if (!token || !userId || !empresaId) {
                    return;
                }

                const response = await fetch(
                    `https://backend.advir.pt/api/comunicados/usuario/${userId}/nao-lidos?empresaId=${empresaId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setNaoLidos(data.data.count);
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar comunicados não lidos:', error);
            }
        };

        fetchNaoLidos();

        // Atualizar a cada 30 segundos
        const interval = setInterval(fetchNaoLidos, 30000);

        return () => clearInterval(interval);
    }, []);

    return naoLidos;
};
