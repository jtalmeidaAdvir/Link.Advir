import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useRoute } from '@react-navigation/native';

import { styles } from '../styles/SelecaoEmpresaStyles';
import EmpresaButtons from '../components/EmpresaButtons';
import EmpresaCheckbox from '../components/EmpresaCheckbox';
import { useEmpresas } from '../handlers/useEmpresas';
import { useHandleEntrar } from '../handlers/useHandleEntrar';
import { handlePredefinirEmpresa } from '../handlers/empresaHandlers';

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


  const onTogglePredefinir = () => {
    handlePredefinirEmpresa({
      checked: !empresaPredefinida,
      empresaSelecionada,
      setEmpresaPredefinida,
    });
  };

  return (
    <View style={styles.container}>
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
              setEmpresaSelecionada={setEmpresaSelecionada}
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

            <TouchableOpacity
              onPress={() => entrar(empresaSelecionada, onTogglePredefinir)}
              disabled={loadingButton || !empresaSelecionada}
              style={[
                styles.entrarButton,
                !empresaSelecionada && styles.entrarButtonDisabled,
              ]}
            >
              <Text style={styles.entrarButtonText}>
                {empresaPredefinida
                  ? t('SelecaoEmpresa.BtEntrar')
                  : t('Entrar na Empresa')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default SelecaoEmpresa;
