
import { useState, useEffect } from 'react';

export const useFaltasPendentes = (tipoUser) => {
  const [faltasPendentes, setFaltasPendentes] = useState(0);

  useEffect(() => {
    const fetchFaltasPendentes = async () => {
      // Normalizar tipoUser para garantir comparação correta
      const tipoUserNormalizado = (tipoUser || '').trim();
      const tipoUserCapitalizado = tipoUserNormalizado.charAt(0).toUpperCase() + tipoUserNormalizado.slice(1).toLowerCase();
      
      if (tipoUserCapitalizado !== 'Administrador' && tipoUserCapitalizado !== 'Encarregado' && tipoUserCapitalizado !== 'Diretor') {
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

          // Se for Administrador, mostrar todas as faltas da empresa
          if (tipoUserCapitalizado === 'Administrador') {
            setFaltasPendentes(data.length);
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
              
              // Obter códigos de funcionário para cada membro da equipa
              const codigosPromises = memberIDs.map(async (userId) => {
                try {
                  const userRes = await fetch(`https://backend.advir.pt/api/users/getCodFuncionario/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (userRes.ok) {
                    const userData = await userRes.json();
                    return { userId, codFuncionario: userData.codFuncionario };
                  }
                } catch (err) {
                  console.warn(`Erro ao obter código do funcionário para userId ${userId}:`, err);
                }
                return { userId, codFuncionario: null };
              });
              
              const codigosData = await Promise.all(codigosPromises);
              const codigosFuncionarios = codigosData
                .filter(item => item.codFuncionario)
                .map(item => item.codFuncionario);
              
              console.log('Códigos funcionários da equipa:', codigosFuncionarios);
              
              // Filtrar faltas pendentes pelos códigos de funcionário
              const faltasFiltradas = data.filter(f => {
                return codigosFuncionarios.includes(f.funcionario);
              });
              
              console.log('Faltas pendentes filtradas:', faltasFiltradas.length, 'de', data.length);
              console.log('Códigos funcionários:', codigosFuncionarios);
              console.log('Faltas data sample:', data.slice(0, 2));
              setFaltasPendentes(faltasFiltradas.length);
            } else {
              setFaltasPendentes(0);
            }
          } catch (equipaError) {
            console.error('Erro ao buscar equipas:', equipaError);
            setFaltasPendentes(0);
          }
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
