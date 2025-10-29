
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    Modal,
    ScrollView,
    RefreshControl,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { secureStorage } from '../../../utils/secureStorage';

const API_BASE = 'https://backend.advir.pt/api/externos-jpa';
const EMAIL_API = 'https://webapiprimavera.advir.pt/send-email-externos';

const ConsultaQRCodesExternos = () => {
    const [externos, setExternos] = useState([]);
    const [externosFiltrados, setExternosFiltrados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [erro, setErro] = useState('');
    const [search, setSearch] = useState('');
    const [empresaFiltro, setEmpresaFiltro] = useState('');
    
    // Modal de detalhes
    const [modalVisible, setModalVisible] = useState(false);
    const [externoSelecionado, setExternoSelecionado] = useState(null);
    
    // Modal de envio de email
    const [modalEmailVisible, setModalEmailVisible] = useState(false);
    const [emailDestinatario, setEmailDestinatario] = useState('');
    const [enviandoEmail, setEnviandoEmail] = useState(false);
    
    // Referência para o QR code
    const qrCodeRef = useRef(null);

    // Carregar externos
    const fetchExternos = useCallback(async () => {
        setLoading(true);
        setErro('');
        try {
            const loginToken = await secureStorage.getItem('loginToken');
            const empresaId = await secureStorage.getItem('empresa_id');

            const headers = {
                Authorization: `Bearer ${loginToken}`,
                'X-Empresa-ID': empresaId
            };

            const res = await fetch(`${API_BASE}/qrcodes`, { headers });
            
            if (!res.ok) {
                throw new Error('Erro ao carregar trabalhadores externos');
            }

            const data = await res.json();
            setExternos(data?.data || []);
            setExternosFiltrados(data?.data || []);
        } catch (e) {
            setErro(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExternos();
    }, [fetchExternos]);

    // Filtrar externos
    useEffect(() => {
        let filtered = externos;

        if (search.trim()) {
            filtered = filtered.filter(ext =>
                ext.nome?.toLowerCase().includes(search.toLowerCase()) ||
                ext.Qrcode?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (empresaFiltro) {
            filtered = filtered.filter(ext => ext.empresa === empresaFiltro);
        }

        setExternosFiltrados(filtered);
    }, [search, empresaFiltro, externos]);

    // Refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchExternos();
        setRefreshing(false);
    }, [fetchExternos]);

    // Abrir modal de detalhes
    const abrirDetalhes = (externo) => {
        setExternoSelecionado(externo);
        setModalVisible(true);
    };

    // Fechar modal
    const fecharModal = () => {
        setModalVisible(false);
        setExternoSelecionado(null);
    };

    // Abrir modal de email
    const abrirModalEmail = () => {
        setEmailDestinatario('');
        setModalEmailVisible(true);
    };

    // Fechar modal de email
    const fecharModalEmail = () => {
        setModalEmailVisible(false);
        setEmailDestinatario('');
    };

    // Enviar QR code por email
    const enviarQRCodePorEmail = async () => {
        if (!emailDestinatario.trim()) {
            Alert.alert('Atenção', 'Por favor, insira um email válido');
            return;
        }

        if (!externoSelecionado) {
            Alert.alert('Erro', 'Nenhum trabalhador selecionado');
            return;
        }

        setEnviandoEmail(true);

        try {
            // Obter a imagem do QR code em base64
            qrCodeRef.current.toDataURL((dataURL) => {
                enviarEmailComQRCode(dataURL);
            });
        } catch (error) {
            console.error('Erro ao gerar QR code:', error);
            Alert.alert('Erro', 'Erro ao gerar o QR code para envio');
            setEnviandoEmail(false);
        }
    };

    const enviarEmailComQRCode = async (qrCodeDataURL) => {
        try {
            // Converte data URL para base64 puro
            const base64Image = qrCodeDataURL.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
            
            const emailPayload = {
                emailDestinatario: emailDestinatario.trim(),
                assunto: `QR Code - ${externoSelecionado.nome}`,
                texto: `
                    <!DOCTYPE html>
                    <html lang="pt">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <title>QR Code - Trabalhador Externo</title>
                        <style>
                            @media only screen and (max-width: 600px) {
                                .email-container {
                                    width: 100% !important;
                                    margin: 0 !important;
                                    padding: 10px !important;
                                }
                                .email-content {
                                    padding: 20px 15px !important;
                                }
                                .email-header {
                                    padding: 20px 15px !important;
                                }
                                .email-header h1 {
                                    font-size: 20px !important;
                                }
                                .section-title {
                                    font-size: 18px !important;
                                }
                                .info-table td {
                                    display: block !important;
                                    width: 100% !important;
                                    padding: 8px 0 !important;
                                }
                                .info-table tr {
                                    display: block !important;
                                    margin-bottom: 15px !important;
                                    border-bottom: 1px solid #e5e7eb !important;
                                }
                                .info-label {
                                    font-weight: bold !important;
                                    color: #1792FE !important;
                                    margin-bottom: 5px !important;
                                }
                                .qr-container {
                                    padding: 15px !important;
                                }
                                .qr-container img {
                                    width: 100% !important;
                                    max-width: 280px !important;
                                    height: auto !important;
                                }
                                .qr-title {
                                    font-size: 16px !important;
                                }
                                .qr-instructions {
                                    font-size: 13px !important;
                                    padding: 0 10px !important;
                                }
                            }
                        </style>
                    </head>
                    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
                            <tr>
                                <td style="padding: 20px 10px;">
                                    <table class="email-container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                        <!-- Header -->
                                        <tr>
                                            <td class="email-header" style="background: linear-gradient(135deg, #1792FE 0%, #0B5ED7 100%); color: white; padding: 30px 20px; text-align: center;">
                                                <h1 style="margin: 0; font-size: 24px; font-weight: bold; line-height: 1.3;">QR Code - Trabalhador Externo</h1>
                                            </td>
                                        </tr>
                                        
                                        <!-- Content -->
                                        <tr>
                                            <td class="email-content" style="padding: 30px;">
                                                <h2 class="section-title" style="color: #1792FE; margin: 0 0 20px 0; font-size: 20px;">Informações do Trabalhador</h2>
                                                
                                                <table class="info-table" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                                    <tr style="border-bottom: 1px solid #e5e7eb;">
                                                        <td class="info-label" style="padding: 12px 0; font-weight: bold; color: #374151; vertical-align: top;">Nome:</td>
                                                        <td style="padding: 12px 0; color: #6b7280; word-break: break-word;">${externoSelecionado.nome}</td>
                                                    </tr>
                                                    <tr style="border-bottom: 1px solid #e5e7eb;">
                                                        <td class="info-label" style="padding: 12px 0; font-weight: bold; color: #374151; vertical-align: top;">Empresa:</td>
                                                        <td style="padding: 12px 0; color: #6b7280; word-break: break-word;">${externoSelecionado.empresa || 'Sem empresa'}</td>
                                                    </tr>
                                                    <tr style="border-bottom: 1px solid #e5e7eb;">
                                                        <td class="info-label" style="padding: 12px 0; font-weight: bold; color: #374151; vertical-align: top;">Código QR:</td>
                                                        <td style="padding: 12px 0; color: #6b7280; font-family: 'Courier New', monospace; word-break: break-all;">${externoSelecionado.Qrcode}</td>
                                                    </tr>
                                                </table>

                                                <!-- QR Code Section -->
                                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                                    <tr>
                                                        <td style="text-align: center; padding: 20px 0;">
                                                            <h3 class="qr-title" style="color: #1792FE; margin: 0 0 20px 0; font-size: 18px;">QR Code para Registo de Ponto</h3>
                                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                                                                <tr>
                                                                    <td class="qr-container" style="padding: 20px; background-color: #f8f9fa; border-radius: 10px;">
                                                                        <img src="data:image/png;base64,${base64Image}" alt="QR Code" style="display: block; width: 250px; height: 250px; max-width: 100%; height: auto;" />
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <p class="qr-instructions" style="margin: 20px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                                                                Use este QR code para registar entrada/saída do trabalhador
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                                                <p style="margin: 0; font-size: 12px; color: #6b7280;">Advir Plan Consultoria</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `,
                remetente: 'noreply.advir@gmail.com'
            };

            console.log('📧 Enviando email para:', emailPayload.emailDestinatario);

            const response = await fetch(EMAIL_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailPayload)
            });

            const responseData = await response.json();
            console.log('📧 Resposta do servidor:', responseData);

            if (!response.ok) {
                throw new Error(responseData.error || responseData.details || 'Erro ao enviar email');
            }

            Alert.alert('Sucesso', 'QR code enviado por email com sucesso!');
            fecharModalEmail();
        } catch (error) {
            console.error('❌ Erro ao enviar email:', error);
            Alert.alert('Erro', `Não foi possível enviar o email: ${error.message}`);
        } finally {
            setEnviandoEmail(false);
        }
    };

    // Empresas únicas para filtro
    const empresasUnicas = [...new Set(externos.map(e => e.empresa).filter(Boolean))];

    // Render de cada item
    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => abrirDetalhes(item)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Ionicons name="person" size={24} color="#1792FE" />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardNome} numberOfLines={1}>
                        {item.nome}
                    </Text>
                    <Text style={styles.cardEmpresa} numberOfLines={1}>
                        {item.empresa || 'Sem empresa'}
                    </Text>
                </View>
                <Ionicons name="qr-code" size={32} color="#1792FE" />
            </View>
            <View style={styles.cardFooter}>
                <View style={styles.qrCodeBadge}>
                    <Ionicons name="barcode-outline" size={14} color="#666" />
                    <Text style={styles.qrCodeText} numberOfLines={1}>
                        {item.Qrcode}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.loadingCard}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>A carregar QR codes...</Text>
                </LinearGradient>
            </View>
        );
    }

    if (erro) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={64} color="#dc3545" />
                    <Text style={styles.errorTitle}>Erro ao carregar</Text>
                    <Text style={styles.errorText}>{erro}</Text>
                    <TouchableOpacity onPress={fetchExternos} style={styles.retryButton}>
                        <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.buttonGradient}>
                            <Ionicons name="refresh" size={18} color="#fff" />
                            <Text style={styles.buttonText}>Tentar Novamente</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.mainContainer}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                        style={styles.headerContent}
                    >
                        <View style={styles.headerTop}>
                            <View style={styles.headerIcon}>
                                <Ionicons name="qr-code" size={28} color="#fff" />
                            </View>
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.headerTitle}>QR Codes Externos</Text>
                                <Text style={styles.headerSubtitle}>
                                    {externosFiltrados.length} {externosFiltrados.length === 1 ? 'trabalhador' : 'trabalhadores'}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Filtros */}
                <View style={styles.filtersContainer}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#1792FE" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Pesquisar por nome ou QR code..."
                            value={search}
                            onChangeText={setSearch}
                            placeholderTextColor="#999"
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {empresasUnicas.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.empresasScroll}
                            contentContainerStyle={styles.empresasContainer}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.empresaChip,
                                    !empresaFiltro && styles.empresaChipActive
                                ]}
                                onPress={() => setEmpresaFiltro('')}
                            >
                                <Text
                                    style={[
                                        styles.empresaChipText,
                                        !empresaFiltro && styles.empresaChipTextActive
                                    ]}
                                >
                                    Todas
                                </Text>
                            </TouchableOpacity>
                            {empresasUnicas.map((empresa, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.empresaChip,
                                        empresaFiltro === empresa && styles.empresaChipActive
                                    ]}
                                    onPress={() => setEmpresaFiltro(empresa)}
                                >
                                    <Text
                                        style={[
                                            styles.empresaChipText,
                                            empresaFiltro === empresa && styles.empresaChipTextActive
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {empresa}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Lista */}
                <FlatList
                    data={externosFiltrados}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#1792FE']}
                            tintColor="#1792FE"
                        />
                    }
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="qr-code-outline" size={80} color="#ccc" />
                            <Text style={styles.emptyTitle}>Nenhum trabalhador encontrado</Text>
                            <Text style={styles.emptyText}>
                                {search || empresaFiltro
                                    ? 'Tente ajustar os filtros de pesquisa'
                                    : 'Não há trabalhadores externos registados'}
                            </Text>
                        </View>
                    )}
                />

                {/* Modal de Detalhes */}
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    onRequestClose={fecharModal}
                    presentationStyle="pageSheet"
                >
                    <SafeAreaView style={styles.modalContainer}>
                        <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <View style={styles.modalTitleContainer}>
                                    <Ionicons name="qr-code" size={24} color="#fff" />
                                    <Text style={styles.modalTitle}>QR Code do Trabalhador</Text>
                                </View>
                                <TouchableOpacity onPress={fecharModal} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>

                        {externoSelecionado && (
                            <ScrollView contentContainerStyle={styles.modalContent}>
                                {/* Informações */}
                                <View style={styles.infoCard}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="person" size={20} color="#1792FE" />
                                        <View style={styles.infoTextContainer}>
                                            <Text style={styles.infoLabel}>Nome</Text>
                                            <Text style={styles.infoValue}>{externoSelecionado.nome}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="business" size={20} color="#1792FE" />
                                        <View style={styles.infoTextContainer}>
                                            <Text style={styles.infoLabel}>Empresa</Text>
                                            <Text style={styles.infoValue}>
                                                {externoSelecionado.empresa || 'Sem empresa'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="barcode" size={20} color="#1792FE" />
                                        <View style={styles.infoTextContainer}>
                                            <Text style={styles.infoLabel}>Código QR</Text>
                                            <Text style={styles.infoValue}>{externoSelecionado.Qrcode}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* QR Code */}
                                <View style={styles.qrCodeCard}>
                                    <Text style={styles.qrCodeTitle}>QR Code para Registo de Ponto</Text>
                                    <View style={styles.qrCodeContainer}>
                                        <QRCode
                                            value={externoSelecionado.Qrcode}
                                            size={250}
                                            color="#333"
                                            backgroundColor="#fff"
                                            getRef={(ref) => (qrCodeRef.current = ref)}
                                        />
                                    </View>
                                    <Text style={styles.qrCodeInstructions}>
                                        Use este QR code para registar entrada/saída do trabalhador
                                    </Text>
                                    
                                    <TouchableOpacity 
                                        style={styles.emailButton}
                                        onPress={abrirModalEmail}
                                    >
                                        <LinearGradient
                                            colors={['#1792FE', '#0B5ED7']}
                                            style={styles.emailButtonGradient}
                                        >
                                            <Ionicons name="mail" size={20} color="#fff" />
                                            <Text style={styles.emailButtonText}>Enviar por Email</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </SafeAreaView>
                </Modal>

                {/* Modal de Envio de Email */}
                <Modal
                    visible={modalEmailVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={fecharModalEmail}
                >
                    <View style={styles.modalEmailOverlay}>
                        <View style={styles.modalEmailContainer}>
                            <View style={styles.modalEmailHeader}>
                                <View style={styles.modalEmailTitleContainer}>
                                    <Ionicons name="mail" size={24} color="#1792FE" />
                                    <Text style={styles.modalEmailTitle}>Enviar QR Code por Email</Text>
                                </View>
                                <TouchableOpacity onPress={fecharModalEmail}>
                                    <Ionicons name="close-circle" size={28} color="#999" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalEmailBody}>
                                <Text style={styles.modalEmailLabel}>Email do destinatário:</Text>
                                <TextInput
                                    style={styles.modalEmailInput}
                                    placeholder="exemplo@email.com"
                                    value={emailDestinatario}
                                    onChangeText={setEmailDestinatario}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholderTextColor="#999"
                                />

                                {externoSelecionado && (
                                    <View style={styles.emailPreviewCard}>
                                        <Text style={styles.emailPreviewTitle}>Será enviado:</Text>
                                        <Text style={styles.emailPreviewText}>
                                            • QR Code de {externoSelecionado.nome}
                                        </Text>
                                        <Text style={styles.emailPreviewText}>
                                            • Empresa: {externoSelecionado.empresa || 'Sem empresa'}
                                        </Text>
                                        <Text style={styles.emailPreviewText}>
                                            • Código: {externoSelecionado.Qrcode}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.modalEmailButtons}>
                                    <TouchableOpacity
                                        style={styles.modalEmailCancelButton}
                                        onPress={fecharModalEmail}
                                    >
                                        <Text style={styles.modalEmailCancelText}>Cancelar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.modalEmailSendButton}
                                        onPress={enviarQRCodePorEmail}
                                        disabled={enviandoEmail}
                                    >
                                        <LinearGradient
                                            colors={['#1792FE', '#0B5ED7']}
                                            style={styles.modalEmailSendGradient}
                                        >
                                            {enviandoEmail ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Ionicons name="send" size={18} color="#fff" />
                                                    <Text style={styles.modalEmailSendText}>Enviar</Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingCard: {
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        gap: 15,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    errorCard: {
        backgroundColor: '#fff',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#dc3545',
        marginTop: 15,
        marginBottom: 10,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        borderRadius: 15,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        gap: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    header: {
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    headerContent: {
        borderRadius: 20,
        padding: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    filtersContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 15,
        paddingHorizontal: 15,
        marginBottom: 15,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 15,
        fontSize: 16,
        color: '#333',
    },
    empresasScroll: {
        marginBottom: 10,
    },
    empresasContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    empresaChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#e9ecef',
    },
    empresaChipActive: {
        backgroundColor: '#1792FE',
        borderColor: '#1792FE',
    },
    empresaChipText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    empresaChipTextActive: {
        color: '#fff',
    },
    listContainer: {
        padding: 20,
        paddingTop: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(23, 146, 254, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardInfo: {
        flex: 1,
    },
    cardNome: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    cardEmpresa: {
        fontSize: 14,
        color: '#666',
    },
    cardFooter: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f3f4',
    },
    qrCodeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    qrCodeText: {
        fontSize: 13,
        color: '#666',
        fontFamily: 'monospace',
        flex: 1,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginTop: 15,
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    modalHeader: {
        paddingTop: 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        padding: 20,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        gap: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    qrCodeCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
    },
    qrCodeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 20,
    },
    qrCodeContainer: {
        padding: 20,
        backgroundColor: '#f8f9fa',
        borderRadius: 15,
        marginBottom: 15,
    },
    qrCodeInstructions: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    emailButton: {
        borderRadius: 15,
        overflow: 'hidden',
        marginTop: 10,
    },
    emailButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        gap: 10,
    },
    emailButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    modalEmailOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalEmailContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
    },
    modalEmailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    modalEmailTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalEmailTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    modalEmailBody: {
        padding: 20,
    },
    modalEmailLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    modalEmailInput: {
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#f8f9fa',
    },
    emailPreviewCard: {
        backgroundColor: '#f0f9ff',
        borderRadius: 12,
        padding: 15,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#0ea5e9',
    },
    emailPreviewTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0c4a6e',
        marginBottom: 8,
    },
    emailPreviewText: {
        fontSize: 14,
        color: '#0c4a6e',
        marginBottom: 4,
    },
    modalEmailButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    modalEmailCancelButton: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e9ecef',
        paddingVertical: 15,
        alignItems: 'center',
    },
    modalEmailCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    modalEmailSendButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalEmailSendGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        gap: 8,
    },
    modalEmailSendText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ConsultaQRCodesExternos;
