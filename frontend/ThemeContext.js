import React, { createContext, useContext, useState } from 'react';

// Cria o contexto
const ThemeContext = createContext();

// Provedor de tema
export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleTheme = () => {
        setIsDarkMode(prevMode => !prevMode);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Hook para usar o contexto do tema
export const useTheme = () => useContext(ThemeContext);
