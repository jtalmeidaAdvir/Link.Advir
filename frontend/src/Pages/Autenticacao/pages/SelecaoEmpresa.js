import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useRoute } from '@react-navigation/native';
import backgroundImage from '../../../../images/ImagemFundo.png';

import { styles } from '../styles/SelecaoEmpresaStyles';
import EmpresaButtons from '../components/EmpresaButtons';
import EmpresaCheckbox from '../components/EmpresaCheckbox';
import { useEmpresas } from '../handlers/useEmpresas';
import { useHandleEntrar } from '../handlers/useHandleEntrar';
import { handlePredefinirEmpresa, fetchEmpresas } from '../handlers/empresaHandlers';

const SelecaoEmpresa = ({ setEmpresa }) => {
    const [empresas, setEmpresas] = useState([]);
    const [empresaSelecionada, setEmpresaSelecionada] = useState('');
    const [empresaPredefinida, setEmpresaPredefinida] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigation = useNavigation();
    const { t } = useTranslation();
    const route = useRoute();
    const autoLogin = route.params?.autoLogin ?? true;

    // Reset component state when it receives focus (when navigating back)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // Force complete reinitialize by resetting states and calling fetch again
            setEmpresas([]);
            setEmpresaSelecionada('');
            setEmpresaPredefinida(false);
            setLoading(true);
            setLoadingButton(false);
            setErrorMessage('');

            // Trigger fetch empresas again
            setTimeout(() => {
                fetchEmpresas({
                    setEmpresas,
                    setEmpresaSelecionada,
                    setEmpresaPredefinida,
                    setErrorMessage,
                    setLoading,
                    handleEntrarEmpresa: entrar,
                    setEmpresa,
                    navigation,
                    t,
                    autoLogin,
                });
            }, 100);
        });

        return unsubscribe;
    }, [navigation]);

    const entrar = useHandleEntrar({
        setEmpresa,
        empresaPredefinida,
        setLoadingButton,
        setErrorMessage,
        navigation,
    });

    useEmpresas({
        setEmpresas,
        setEmpresaSelecionada,
        setEmpresaPredefinida,
        setErrorMessage,
        setLoading,
        handleEntrarEmpresa: entrar,
        setEmpresa,
        navigation,
        t,
        autoLogin, // ✅ isto é o que permite controlar se entra automaticamente
    });


    // acrescenta perto dos outros handlers
    const onEmpresaPress = (empresa) => {
        if (loadingButton) return; // evita duplo clique
        setEmpresaSelecionada(empresa);
        entrar(empresa, onTogglePredefinir); // entra logo na empresa clicada
    };



    const onTogglePredefinir = () => {
        handlePredefinirEmpresa({
            checked: !empresaPredefinida,
            empresaSelecionada,
            setEmpresaPredefinida,
        });
    };

    return (
        <View style={[styles.container, {
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            position: 'relative'
        }]}>
            <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                zIndex: 0
            }}></View>
            <View style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <View style={styles.card}>
                    <Text style={styles.title}>{t('SelecaoEmpresa.Title')}</Text>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#1792FE" />
                            <Text style={styles.loadingText}>Carregando empresas...</Text>
                        </View>
                    ) : (
                        <View style={styles.contentContainer}>
                            <EmpresaButtons
                                empresas={empresas}
                                empresaSelecionada={empresaSelecionada}
                                setEmpresaSelecionada={onEmpresaPress}
                                loadingButton={loadingButton}
                                handleEntrarEmpresa={(empresa) => entrar(empresa, onTogglePredefinir)}
                                setEmpresaPredefinida={setEmpresaPredefinida}
                            />



                            {empresaSelecionada && (
                                <EmpresaCheckbox
                                    empresaPredefinida={empresaPredefinida}
                                    onToggle={onTogglePredefinir}
                                />
                            )}

                            {errorMessage && (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{errorMessage}</Text>
                                </View>
                            )}


                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

export default SelecaoEmpresa;
