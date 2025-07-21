// useEmpresas.js
import { useEffect, useRef } from 'react';
import { fetchEmpresas } from './empresaHandlers';

export const useEmpresas = ({
    setEmpresas,
    setEmpresaSelecionada,
    setEmpresaPredefinida,
    setErrorMessage,
    setLoading,
    handleEntrarEmpresa,
    setEmpresa,
    navigation,
    t,
    autoLogin,
}) => {
    const fetchedRef = useRef(false); // flag para evitar múltiplas execuções

    useEffect(() => {
        if (fetchedRef.current) return; // se já executou, não executa de novo
        fetchedRef.current = true; // marca como executado

        fetchEmpresas({
            setEmpresas,
            setEmpresaSelecionada,
            setEmpresaPredefinida,
            setErrorMessage,
            setLoading,
            handleEntrarEmpresa,
            setEmpresa,
            navigation,
            t,
            autoLogin,
        });
    }, []);
};