
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const PrivacySettings = () => {
    const [consents, setConsents] = useState({
        biometric_facial: false,
        biometric_fingerprint: false,
        gps_tracking: false,
        data_processing: true, // Essencial
        marketing: false,
        third_party_sharing: false
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchConsents();
    }, []);

    const fetchConsents = async () => {
        try {
            const token = localStorage.getItem('loginToken');
            const response = await fetch('https://backend.advir.pt/api/gdpr/consents', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                const consentObj = {};
                data.consents.forEach(c => {
                    consentObj[c.consent_type] = c.consent_given;
                });
                setConsents({ ...consents, ...consentObj });
            }
        } catch (error) {
            console.error('Erro ao carregar consentimentos:', error);
        }
    };

    const toggleConsent = async (consentType) => {
        if (consentType === 'data_processing') {
            Alert.alert(
                'Consentimento Essencial',
                'O processamento de dados é essencial para o funcionamento da aplicação.'
            );
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('loginToken');
            const newValue = !consents[consentType];

            const response = await fetch('https://backend.advir.pt/api/gdpr/consent', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    consent_type: consentType,
                    consent_given: newValue,
                    consent_text: `Utilizador ${newValue ? 'autorizou' : 'revogou'} ${consentType}`
                })
            });

            const data = await response.json();
            if (data.success) {
                setConsents({ ...consents, [consentType]: newValue });
                Alert.alert('Sucesso', data.message);
            }
        } catch (error) {
            console.error('Erro ao atualizar consentimento:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o consentimento');
        } finally {
            setLoading(false);
        }
    };

    const exportData = async () => {
        try {
            const token = localStorage.getItem('loginToken');
            const response = await fetch('https://backend.advir.pt/api/gdpr/export-data', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                const dataStr = JSON.stringify(data.data, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `meus_dados_${new Date().toISOString()}.json`;
                link.click();
                Alert.alert('Sucesso', 'Dados exportados com sucesso');
            }
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            Alert.alert('Erro', 'Não foi possível exportar os dados');
        }
    };

    const consentLabels = {
        biometric_facial: 'Reconhecimento Facial',
        biometric_fingerprint: 'Impressão Digital',
        gps_tracking: 'Localização GPS',
        data_processing: 'Processamento de Dados (Essencial)',
        marketing: 'Comunicações de Marketing',
        third_party_sharing: 'Partilha com Terceiros'
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🔒 Privacidade e Proteção de Dados</Text>
                <Text style={styles.subtitle}>Conforme Regulamento Geral de Proteção de Dados (RGPD)</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Consentimentos</Text>
                {Object.keys(consents).map(key => (
                    <View key={key} style={styles.consentRow}>
                        <Text style={styles.consentLabel}>{consentLabels[key]}</Text>
                        <Switch
                            value={consents[key]}
                            onValueChange={() => toggleConsent(key)}
                            disabled={loading || key === 'data_processing'}
                        />
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Os Seus Direitos RGPD</Text>
                
                <TouchableOpacity style={styles.button} onPress={exportData}>
                    <Text style={styles.buttonText}>📥 Exportar Os Meus Dados</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, styles.dangerButton]}
                    onPress={() => Alert.alert(
                        'Eliminar Dados',
                        'Esta ação irá eliminar permanentemente todos os seus dados. Confirma?',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Confirmar', onPress: () => {
                                // Implementar eliminação
                            }}
                        ]
                    )}
                >
                    <Text style={styles.buttonText}>🗑️ Solicitar Eliminação de Dados</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.info}>
                <Text style={styles.infoText}>
                    ℹ️ Para mais informações sobre como tratamos os seus dados pessoais, 
                    consulte a nossa Política de Privacidade.
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        backgroundColor: '#1792FE',
        padding: 20,
        marginBottom: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5
    },
    subtitle: {
        fontSize: 14,
        color: 'white',
        opacity: 0.9
    },
    section: {
        backgroundColor: 'white',
        margin: 10,
        padding: 15,
        borderRadius: 10
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333'
    },
    consentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    consentLabel: {
        fontSize: 16,
        color: '#555'
    },
    button: {
        backgroundColor: '#1792FE',
        padding: 15,
        borderRadius: 8,
        marginVertical: 5
    },
    dangerButton: {
        backgroundColor: '#ff4444'
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600'
    },
    info: {
        margin: 10,
        padding: 15,
        backgroundColor: '#e3f2fd',
        borderRadius: 8
    },
    infoText: {
        fontSize: 14,
        color: '#1976d2',
        lineHeight: 20
    }
});

export default PrivacySettings;
