
import { useState, useEffect } from 'react';
import { secureStorage } from '../../../utils/secureStorage';
export const useRegistosPendentes = (tipoUser) => {
  const [registosPendentes, setRegistosPendentes] = useState(0);

  useEffect(() => {
    // Normalizar tipoUser para garantir comparação correta
    const tipoUserNormalizado = (tipoUser || '').trim();
    const tipoUserCapitalizado = tipoUserNormalizado.charAt(0).toUpperCase() + tipoUserNormalizado.slice(1).toLowerCase();
    
    if (tipoUserCapitalizado !== 'Administrador' && tipoUserCapitalizado !== 'Encarregado' && tipoUserCapitalizado !== 'Diretor') {
      setRegistosPendentes(0);
      return;
    }

    const fetchRegistosPendentes = async () => {
      try {
        const token = secureStorage.getItem('loginToken');
        const urlempresa = secureStorage.getItem('urlempresa');

        // Buscar registos pendentes com filtro de empresa
        const empresaId = secureStorage.getItem('empresa_id');
        const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/pendentes?empresa_id=${empresaId}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            urlempresa
          }
        });

        if (res.ok) {
          const data = await res.json();

          // Se for Administrador, mostrar todos os registos da empresa
          if (tipoUserCapitalizado === 'Administrador') {
            setRegistosPendentes(data.length);
            return;
          }

          // Para Encarregado e Diretor, filtrar apenas pelos membros das suas equipas
          try {
            const equipasRes = await fetch('https://backend.advir.pt/api/equipa-obra/minhas-agrupadas', {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (equipasRes.ok) {
              const equipasData = await equipasRes.json();
              console.log('Equipas data:', equipasData);
              const memberIDs = equipasData.flatMap(eq => eq.membros.map(m => m.id));
              console.log('Member IDs extraídos:', memberIDs);
              
              // Filtrar registos pendentes apenas dos membros da equipa
              // Verificar tanto User.id como user_id para compatibilidade
              const registosFiltrados = data.filter(r => {
                const userId = r.User?.id || r.user_id;
                return memberIDs.includes(userId);
              });
              console.log('Registos pendentes filtrados:', registosFiltrados.length, 'de', data.length);
              console.log('Member IDs:', memberIDs);
              console.log('Registos data sample:', data.slice(0, 2));
              setRegistosPendentes(registosFiltrados.length);
            } else {
              setRegistosPendentes(0);
            }
          } catch (equipaError) {
            console.error('Erro ao buscar equipas:', equipaError);
            setRegistosPendentes(0);
          }
        } else {
          setRegistosPendentes(0);
        }
      } catch (error) {
        console.error('Erro ao buscar registos pendentes:', error);
        setRegistosPendentes(0);
      }
    };

    fetchRegistosPendentes();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchRegistosPendentes, 30000);
    
    return () => clearInterval(interval);
  }, [tipoUser]);

  return registosPendentes;
};
