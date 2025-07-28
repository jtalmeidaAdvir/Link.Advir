
import { useState, useEffect } from 'react';

export const useFaltasPendentes = (tipoUser) => {
  const [faltasPendentes, setFaltasPendentes] = useState(0);

  useEffect(() => {
    const fetchFaltasPendentes = async () => {
      if (tipoUser !== 'Administrador' && tipoUser !== 'Encarregado' && tipoUser !== 'Diretor') {
        setFaltasPendentes(0);
        return;
      }

      try {
        const token = localStorage.getItem('loginToken');
        const urlempresa = localStorage.getItem('urlempresa');
        
        const res = await fetch('https://backend.advir.pt/api/faltas-ferias/aprovacao/pendentes', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            urlempresa
          }
        });

        if (res.ok) {
          const data = await res.json();
          setFaltasPendentes(data.length);
        } else {
          setFaltasPendentes(0);
        }
      } catch (error) {
        console.error('Erro ao buscar faltas pendentes:', error);
        setFaltasPendentes(0);
      }
    };

    fetchFaltasPendentes();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchFaltasPendentes, 30000);
    
    return () => clearInterval(interval);
  }, [tipoUser]);

  return faltasPendentes;
};
