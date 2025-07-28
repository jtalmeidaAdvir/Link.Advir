
import { useState, useEffect } from 'react';

export const useRegistosPendentes = (tipoUser) => {
  const [registosPendentes, setRegistosPendentes] = useState(0);

  useEffect(() => {
    if (tipoUser !== 'Administrador' && tipoUser !== 'Encarregado' && tipoUser !== 'Diretor') return;

    const fetchRegistosPendentes = async () => {
      try {
        const token = localStorage.getItem('loginToken');
        const urlempresa = localStorage.getItem('urlempresa');

        const res = await fetch('https://backend.advir.pt/api/registo-ponto-obra/pendentes', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            urlempresa
          }
        });

        if (res.ok) {
          const data = await res.json();
          setRegistosPendentes(data.length);
        }
      } catch (error) {
        console.error('Erro ao buscar registos pendentes:', error);
      }
    };

    fetchRegistosPendentes();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchRegistosPendentes, 30000);
    
    return () => clearInterval(interval);
  }, [tipoUser]);

  return registosPendentes;
};
