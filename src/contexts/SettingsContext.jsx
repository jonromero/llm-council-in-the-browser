import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

const DEFAULT_COUNCIL_MODELS = [
    "tngtech/deepseek-r1t2-chimera:free",
    "kwaipilot/kat-coder-pro:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "z-ai/glm-4.5-air:free",
];

const DEFAULT_CHAIRMAN_MODEL = "amazon/nova-2-lite-v1:free";

export const SettingsProvider = ({ children }) => {
    const [openRouterApiKey, setOpenRouterApiKey] = useState(() => {
        return localStorage.getItem('openRouterApiKey') || '';
    });

    const [councilModels, setCouncilModels] = useState(() => {
        const stored = localStorage.getItem('councilModels');
        return stored ? JSON.parse(stored) : DEFAULT_COUNCIL_MODELS;
    });

    const [chairmanModel, setChairmanModel] = useState(() => {
        return localStorage.getItem('chairmanModel') || DEFAULT_CHAIRMAN_MODEL;
    });

    useEffect(() => {
        if (openRouterApiKey) {
            localStorage.setItem('openRouterApiKey', openRouterApiKey);
        } else {
            localStorage.removeItem('openRouterApiKey');
        }
    }, [openRouterApiKey]);

    useEffect(() => {
        localStorage.setItem('councilModels', JSON.stringify(councilModels));
    }, [councilModels]);

    useEffect(() => {
        localStorage.setItem('chairmanModel', chairmanModel);
    }, [chairmanModel]);

    const value = {
        openRouterApiKey,
        setOpenRouterApiKey,
        councilModels,
        setCouncilModels,
        chairmanModel,
        setChairmanModel,
        isConfigured: !!openRouterApiKey,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
