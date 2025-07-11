import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Image, Text, ActivityIndicator, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { List } from 'react-native-paper';
import { FaHome, FaUser, FaTool, FaClock, FaBriefcase, FaSignOutAlt, FaCog } from 'react-icons/fa';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; // Importa o hook
import backgroundPattern from "./assets/pattern.png"; // Caminho para a imagem do padrão
import { MaterialCommunityIcons } from '@expo/vector-icons';




import 'bootstrap/dist/css/bootstrap.min.css';

// Importa as páginas
import Login from './src/Pages/Autenticacao/pages/Login';
import Home from './src/Home';
import ADHome from './src/Pages/BackOffice/ADHome';
import Perfil from './src/Pages/Perfil';
import PainelAdmin from './src/Pages/Autenticacao/PainelAdmin';
import UsersEmpresa from './src/Pages/Autenticacao/UsersEmpresa';
import RegistoUser from './src/Pages/Autenticacao/RegistoUser';
import RegistoAdmin from './src/Pages/Autenticacao/RegistoAdmin';
import VerificaConta from './src/Pages/Autenticacao/VerificaConta';
import SelecaoEmpresa from './src/Pages/Autenticacao/pages/SelecaoEmpresa';
import RecuperarPassword from './src/Pages/Autenticacao/RecuperarPassword';
import RedefinirPassword from './src/Pages/Autenticacao/RedefinirPassword';



import ContratosList from './src/Pages/BackOffice/ContratosList';

// SERVICOS
import PedidosAssistencia from './src/Pages/Servicos/PedidosAssistencia';
import PandIByTecnico from './src/Pages/Servicos/PandIByTecnico';
import RegistoPedido from './src/Pages/Servicos/RegistoAssistencia';
import intervencoes from './src/Pages/Servicos/Intervencoes';
import RegistoIntervencao from './src/Pages/Servicos/RegistoIntervencao';
import DashboardAnalytics from './src/Pages/Servicos/DashboardAnalytics';

// ASSIDUIDADE
import LeitorQRCode from './src/Pages/Assiduidade/LeitorQRCode';
import PontoBotao from './src/Pages/Assiduidade/PontoBotao';
import RegistoPontoAdmin from './src/Pages/Assiduidade/RegistoPontoAdmin';
import PedidosAlteracaoAdmin from './src/Pages/Assiduidade/PedidosAlteracaoAdmin';
import ListarRegistos from './src/Pages/Assiduidade/ListarRegistos';

import RegistoPontoObra from './src/Pages/Assiduidade/RegistoPontoObra';
import CalendarioHorasTrabalho from './src/Pages/Assiduidade/CalendarioHorasTrabalho';

//Aprovaçoes Pendentes
import ConcursosAprovacao from './src/Pages/Concursos/ConcursosAprovacao';

import Obras from './src/Pages/Obras/Obras';
import DetalhesObra from './src/Pages/Obras/DetalhesObra';
import AutosMedicaoExecucao from './src/Pages/Obras/AutosMedicaoExecucao';
import PartesDiarias from './src/Pages/Obras/PartesDiarias';
import AddPartesDiarias from './src/Pages/Obras/AddPartesDiarias';


import PessoalObra from './src/Pages/Obras/PessoalObra';

import CriarEquipa from './src/Pages/Obras/CriarEquipa';

import UserModulesManagement from './src/Pages/Autenticacao/UserModulesManagement';
import logo from './assets/favicon1.ico';
import i18n from './src/Pages/i18n';
import { useTranslation } from 'react-i18next';
import OficiosPage from './src/Pages/Oficios/OficiosPage';
import OficiosList from './src/Pages/Oficios/OficiosList';
import EditOficio from './src/Pages/Oficios/EditOficio';

const Drawer = createDrawerNavigator();



// Configuração de deep linking para reconhecer URLs com parâmetros dinâmicos como o token
const linking = {
    prefixes: ['https://backend.advir.pt:8081'],
    config: {
        screens: {
            RedefinirPassword: 'redefinir-password/:token',
        },
    },
};

const CustomDrawerContent = ({ isAdmin, isSuperAdmin, isLoggedIn, modules, tipoUser, ...props }) => {
    const [expanded, setExpanded] = useState(false);
    const { t } = useTranslation();
    const handlePress = () => setExpanded(!expanded);
    const [aprovacoesExpanded, setAprovacoesExpanded] = useState(false);

    const handleLogout = () => {
        localStorage.clear();
        props.navigation.navigate('Login');
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    // Se for superAdmin, mostra apenas opções específicas
    if (isSuperAdmin) {
        return (
            <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1 }}>
                <DrawerItem
                    label="ADHome"
                    onPress={() => props.navigation.navigate('ADHome')}
                    icon={() => <FontAwesome name="home" size={20} color="#1792FE" />}
                />
                <DrawerItem
                    label="RegistoAdmin"
                    onPress={() => props.navigation.navigate('RegistoAdmin')}
                    icon={() => <FontAwesome name="home" size={20} color="#1792FE" />}
                />

                <DrawerItem
                    label="Meu Perfil"
                    onPress={() => props.navigation.navigate('Perfil')}
                    icon={() => <FontAwesome name="user" size={20} color="#1792FE" />}
                />
                <DrawerItem
                    label="Logout"
                    onPress={handleLogout}
                    icon={() => <FontAwesome name="sign-out" size={20} color="#1792FE" />}
                />
            </DrawerContentScrollView>
        );
    }

    // Conteúdo do drawer para outros utilizadores

    const hasOficiosModule = modules.some(module => module.nome === "Oficios");

    const hasServicesModule = modules.some(module => module.nome === "Servicos");

    const hasConcursosModule = modules.some(
        module => module.nome === "Obras" && module.submodulos.some(sub => sub.nome === "Aprovacoes")
    );

    const hasQrCodeAssiduidadeModule = modules.some(
        module => module.nome === "Assiduidade" && module.submodulos.some(sub => sub.nome === "QrCode")
    );
    const hasBotaoAssiduidadeModule = modules.some(
        module => module.nome === "Assiduidade" && module.submodulos.some(sub => sub.nome === "Botao")
    );
    const hasObrasModule = modules.some(
        module => module.nome === "Obras" && module.submodulos.some(sub => sub.nome === "Controlo")
    );

    return (
        <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1 }}>
            <DrawerItem
                label={t("Drawer.Home")}
                onPress={() => props.navigation.navigate('Home')}
                icon={() => <FontAwesome name="home" size={20} color="#1792FE" />}
            />
            {isLoggedIn && (
                <>
                    <DrawerItem
                        label={t("Drawer.SelecaoEmpresa")}
                        onPress={() => props.navigation.navigate('SelecaoEmpresa')}
                        icon={() => <FontAwesome name="briefcase" size={20} color="#1792FE" />}
                    />
                    {hasObrasModule && (tipoUser === "Encarregado" || tipoUser === "Diretor") && (
                        <DrawerItem
                            label={t("Drawer.Obra")}
                            onPress={() => props.navigation.navigate('Obras')}
                            icon={() => <FontAwesome name="road" size={20} color="#1792FE" />}
                        />
                    )}
                    {hasObrasModule && (tipoUser === "Encarregado" || tipoUser === "Diretor") && (
                        <DrawerItem
                            label={t("Equipas")}
                            onPress={() => props.navigation.navigate('CriarEquipa')}
                            icon={() => <FontAwesome name="users" size={20} color="#1792FE" />}
                        />
                    )}

                    {hasServicesModule && (
                        <DrawerItem
                            label={t("Drawer.Servicos")}
                            onPress={() => props.navigation.navigate('PedidosAssistencia')}
                            icon={() => <FontAwesome name="wrench" size={20} color="#1792FE" />}
                        />

                    )}

                    {hasConcursosModule && (
                        <List.Accordion
                            title={t("Aprovações")}
                            left={() => (
                                <MaterialCommunityIcons name="file-check" size={20} color="#1792FE" style={{ marginLeft: 15 }} />
                            )}
                            right={() => (
                                <FontAwesome
                                    name={aprovacoesExpanded ? "angle-down" : "angle-up"}
                                    size={18}
                                    color="#1792FE"
                                  
                                />
                            )}
                            expanded={aprovacoesExpanded}
                            onPress={() => setAprovacoesExpanded(!aprovacoesExpanded)}
                            titleStyle={{ fontSize: 14, marginLeft: 0, flexDirection: 'row', alignItems: 'center' }}
                        >
                            <List.Item
                                title="Concursos Pendentes"
                                onPress={() => props.navigation.navigate('ConcursosAprovacao')}
                            />
                        </List.Accordion>
                    )}
                    {hasOficiosModule && (
                        <DrawerItem
                            label={t("Oficios")}
                            onPress={() => props.navigation.navigate('OficiosList')}
                            icon={() => <FontAwesome name="file" size={20} color="#1792FE" />}
                        />
                    )}

                    {hasQrCodeAssiduidadeModule && (
                        <DrawerItem
                            label={t("Drawer.PontoQR")}
                            onPress={() => props.navigation.navigate('LeitorQRCode')}
                            icon={() => <FontAwesome name="qrcode" size={20} color="#1792FE" />}
                        />
                    )}

                      {hasObrasModule && (
                        <DrawerItem
                            label={t("Ponto")}
                            onPress={() => props.navigation.navigate('RegistoPontoObra')}
                            icon={() => <FontAwesome name="qrcode" size={20} color="#1792FE" />}
                        />
                    )}
                    {hasObrasModule && (
                        <DrawerItem
                            label={t("Agenda")}
                            onPress={() => props.navigation.navigate('CalendarioHorasTrabalho')}
                            icon={() => <FontAwesome name="calendar" size={20} color="#1792FE" />}
                        />
                    )}


                    {hasBotaoAssiduidadeModule && (
                        <DrawerItem
                            label={t("Drawer.PontoBT")}
                            onPress={() => props.navigation.navigate('PontoBotao')}
                            icon={() => <FontAwesome name="clock-o" size={20} color="#1792FE" />}
                        />
                    )}
                    {hasServicesModule && (
                        <DrawerItem
                            label={t("Drawer.ServicosTecnicos")}
                            onPress={() => props.navigation.navigate('PandIByTecnico')}
                            icon={() => <FontAwesome name="bar-chart" size={20} color="#1792FE" />}
                        />

                    )}
                </>
            )}
            <View style={{ flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 20 }}>
                {isAdmin && (
                    <List.Accordion
                        title={t("Drawer.ADM.title")}
                        left={() => (
                            <FontAwesome name="cogs" size={18} color="#1792FE" style={{ marginLeft: 15 }} />
                        )}
                        right={() => (
                            <FontAwesome
                                name={expanded ? "angle-down" : "angle-up"} // Seta para cima ou para baixo
                                size={18}

                                color="#1792FE"
                            />
                        )}
                        expanded={expanded}
                        onPress={handlePress}
                        titleStyle={{ fontSize: 14, marginLeft: 0, flexDirection: 'row', alignItems: 'center' }}
                    >

                        <List.Item
                            title="> Contratos Ativos"
                            onPress={() => props.navigation.navigate('ContratosList')}
                        />

                        <List.Item
                            title={t("Drawer.ADM.1")}
                            onPress={() => props.navigation.navigate('PainelAdmin')}
                        />
                        <List.Item
                            title={t("Drawer.ADM.2")}
                            onPress={() => props.navigation.navigate('UsersEmpresa')}
                        />
                        <List.Item
                            title={t("Drawer.ADM.3")}
                            onPress={() => props.navigation.navigate('RegistoUser')}
                        />
                        <List.Item
                            title={t("Drawer.ADM.4")}
                            onPress={() => props.navigation.navigate('RegistoPontoAdmin')}
                        />
                        <List.Item
                            title={t("Drawer.ADM.5")}
                            onPress={() => props.navigation.navigate('PedidosAlteracaoAdmin')}
                        />
                    </List.Accordion>


                )}
                {localStorage.getItem('loginToken') && (
                    <DrawerItem
                        label={t("Drawer.Perfil")}
                        onPress={() => props.navigation.navigate('Perfil')}
                        icon={() => <FontAwesome name="user" size={20} color="#1792FE" />}
                    />
                )}
                {localStorage.getItem('loginToken') && (
                    <DrawerItem
                        label={t("Drawer.Exit")}
                        icon={() => <FontAwesome name="sign-out" size={20} color="#1792FE" />}
                        onPress={handleLogout}
                    />
                )}
            </View>
        </DrawerContentScrollView>
    );
};

const AppNavigator = () => {
    const navigation = useNavigation(); // Obtém o objeto de navegação

    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [userNome, setUserNome] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [languageSelectorVisible, setLanguageSelectorVisible] = useState(false);
    const [hoveredLanguage, setHoveredLanguage] = useState(null);
    const [initialRoute, setInitialRoute] = useState('Login'); // Define a rota inicial com Login por padrão
    const [tipoUser, setTipoUser] = useState('');



    const fetchUserModules = async () => {
        const token = localStorage.getItem('loginToken');
        const userId = localStorage.getItem('userId');
        if (userId && token) {
            try {
                const response = await fetch(`https://backend.advir.pt/api/users/${userId}/modulos-e-submodulos`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                setModules(data.modulos);
            } catch (error) {
                console.error('Erro ao buscar módulos:', error);
            }
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('loginToken');
        if (token) {
            setInitialRoute('Home'); // Se houver um token válido, define a rota inicial para Home
        }
        setLoading(false); // Termina o estado de carregamento
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('loginToken');
            setIsLoggedIn(!!token);
            setIsSuperAdmin(localStorage.getItem('superAdmin') === 'true');
            setIsAdmin(localStorage.getItem('isAdmin') === 'true');
            setUsername(localStorage.getItem('username') || '');
            setUserNome(localStorage.getItem('userNome') || '');
            setEmpresa(localStorage.getItem('empresaSelecionada') || '');
            setTipoUser(localStorage.getItem('tipoUser') || '');


            await fetchUserModules();
            setLoading(false);
        };

        fetchUserData();
    }, []);


    const toggleLanguageSelector = () => {
        setLanguageSelectorVisible(!languageSelectorVisible); // Alterna a visibilidade do combobox de idiomas
    };
    const handleLanguageHover = (language) => {
        setHoveredLanguage(language); // Atualiza o idioma que está em hover
    };

    const handleLanguageLeave = () => {
        setHoveredLanguage(null); // Restaura quando o hover sai
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#1792FE" />
                <Text>A carregar...</Text>
            </View>
        );
    }

    return (
        <Drawer.Navigator
            initialRouteName={initialRoute} // Usa a rota inicial definida com base na autenticação
            drawerContent={(props) => (
                <CustomDrawerContent
                    {...props}
                    isAdmin={isAdmin}
                    isSuperAdmin={isSuperAdmin}
                    isLoggedIn={isLoggedIn}
                    modules={modules}
                    tipoUser={tipoUser}

                />
            )}
            screenOptions={({ navigation }) => ({
                headerTitle: () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image
                            source={logo}
                            style={{ width: 40, height: 40, resizeMode: 'contain', marginLeft: 10 }}
                        />
                    </View>
                ),
                headerRight: () => (

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>


                        {/* Botão de perfil/login */}
                        <TouchableOpacity
                            onPress={() => {
                                if (isLoggedIn) {
                                    navigation.navigate('Perfil');
                                } else {
                                    navigation.navigate('Login');
                                }
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                        >
                            <FontAwesome name="user" size={20} color="#1792FE" />
                            <Text style={{ marginLeft: 8, color: '#1792FE', fontSize: 16 }}>{userNome}</Text>
                            {empresa && (
                                <Text style={{ marginLeft: 15, color: '#1792FE', fontSize: 16 }}>
                                    {empresa}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Botão de Idioma */}
                        <TouchableOpacity
                            onPress={toggleLanguageSelector} // Alterna a visibilidade do combobox de idiomas
                            style={{ marginRight: 10, marginLeft: 10 }}
                        >
                            <Text style={{ color: '#1792FE', fontSize: 16 }}>
                                {i18n.language === 'pt' ? 'PT' : 'EN'}
                            </Text>
                        </TouchableOpacity>

                        {/* Exibe o combobox de idiomas se estiver visível */}
                        {languageSelectorVisible && (
                            <View style={{
                                position: 'absolute', top: 50, right: 0, width: 75, backgroundColor: 'white', borderRadius: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3.5, elevation: 5
                            }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        i18n.changeLanguage('pt');
                                        setLanguageSelectorVisible(false); // Fecha o combobox
                                    }}
                                    onMouseEnter={() => handleLanguageHover('pt')} // Evento de hover
                                    onMouseLeave={handleLanguageLeave} // Evento de sair do hover
                                    style={{ padding: 10, backgroundColor: hoveredLanguage === 'pt' ? '#e1e1e1' : 'transparent' }}
                                >
                                    <Text style={{ fontSize: 16 }}>PT-PT</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        i18n.changeLanguage('en');
                                        setLanguageSelectorVisible(false); // Fecha o combobox
                                    }}
                                    onMouseEnter={() => handleLanguageHover('en')} // Evento de hover
                                    onMouseLeave={handleLanguageLeave} // Evento de sair do hover
                                    style={{ padding: 10, backgroundColor: hoveredLanguage === 'en' ? '#e1e1e1' : 'transparent' }}
                                >
                                    <Text style={{ fontSize: 16 }}>EN-EN</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ),
            })}
        >
            <Drawer.Screen name="Login">
                {props => (
                    <Login
                        {...props}
                        setIsLoggedIn={setIsLoggedIn}
                        setIsAdmin={setIsAdmin}
                        setUsername={setUsername}
                        setUserNome={setUserNome}
                        onLoginComplete={fetchUserModules}
                    />
                )}
            </Drawer.Screen>

            {isSuperAdmin && (
                <>
                    <Drawer.Screen name="ADHome" component={ADHome} />
                    <Drawer.Screen name="RegistoAdmin" component={RegistoAdmin} />
                </>
            )}

            <Drawer.Screen name="ListarRegistos" component={ListarRegistos} options={{ title: "AdvirLink - Registos", drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="LeitorQRCode" component={LeitorQRCode} />
                        <Drawer.Screen name="RegistoPontoObra" component={RegistoPontoObra} />
                        <Drawer.Screen name="CalendarioHorasTrabalho" component={CalendarioHorasTrabalho} />

            {(tipoUser === "Encarregado" || tipoUser === "Diretor") && (
                <>
                    <Drawer.Screen name="Obras" component={Obras} />
                    <Drawer.Screen name="CriarEquipa" component={CriarEquipa} />
                    <Drawer.Screen name="PessoalObra" component={PessoalObra} options={{ drawerItemStyle: { display: 'none' } }} />

                </>
            )}

            <Drawer.Screen name="PontoBotao" component={PontoBotao} />
            <Drawer.Screen name="Perfil" options={{ title: "AdvirLink - Perfil" }}>
                {props => (
                    <Perfil {...props} user={{ name: userNome, company: empresa }} />
                )}
            </Drawer.Screen>

            <Drawer.Screen name="ConcursosAprovacao" component={ConcursosAprovacao} options={{ title: "AdvirLink - Pedidos de Assistência" }} />
            <Drawer.Screen name="PedidosAssistencia" component={PedidosAssistencia} options={{ title: "AdvirLink - Pedidos de Assistência" }} />
            <Drawer.Screen name="PandIByTecnico" component={PandIByTecnico} options={{ title: "AdvirLink - Dashboard Técnico" }} />
            <Drawer.Screen name="RegistoIntervencao" component={RegistoIntervencao} options={{ title: "AdvirLink - Intervenção", drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="DetalhesObra" component={DetalhesObra} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="AutosMedicaoExecucao" component={AutosMedicaoExecucao} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="PartesDiarias" component={PartesDiarias} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="AddPartesDiarias" component={AddPartesDiarias} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="RegistarPedido" component={RegistoPedido} options={{ title: "AdvirLink - Pedido", drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="Intervencoes" component={intervencoes} options={{ title: "AdvirLink - Intervenção", drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="DashboardAnalytics" component={DashboardAnalytics} options={{ title: "AdvirLink - Dashboard Analytics" }} />

            <Drawer.Screen name="RegistoPontoAdmin" component={RegistoPontoAdmin} />
            <Drawer.Screen name="PedidosAlteracaoAdmin" component={PedidosAlteracaoAdmin} />
            <Drawer.Screen name="UserModulesManagement" component={UserModulesManagement} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="VerificaConta" component={VerificaConta} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="OficiosPage" component={OficiosPage} options={{ title: "AdvirLink - Oficios" }} />
            <Drawer.Screen name="OficiosList" component={OficiosList} options={{ title: "AdvirLink - Oficios" }} />
            <Drawer.Screen name="EditOficio" component={EditOficio} options={{ title: "AdvirLink - Oficios" }} />
            <Drawer.Screen name="Home" component={Home} options={{ title: "AdvirLink - Home" }} />
            {isLoggedIn && (
                <Drawer.Screen name="SelecaoEmpresa" options={{ title: "AdvirLink - Empresa" }}>
                    {props => <SelecaoEmpresa {...props} setEmpresa={setEmpresa} />}
                </Drawer.Screen>
            )}
            <Drawer.Screen name="RecuperarPassword" component={RecuperarPassword} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="RedefinirPassword" component={RedefinirPassword} options={{ drawerItemStyle: { display: 'none' } }} />

            {isAdmin && (
                <>
                    <Drawer.Screen name="PainelAdmin" component={PainelAdmin} />
                    <Drawer.Screen name="UsersEmpresa" component={UsersEmpresa} />
                    <Drawer.Screen name="ContratosList" component={ContratosList} />

                    <Drawer.Screen name="RegistoUser" component={RegistoUser} />
                </>
            )}
        </Drawer.Navigator>
    );
};

export default function App() {
    return (
        <NavigationContainer>
            <ImageBackground source={backgroundPattern} style={styles.background}>
                <View style={styles.overlay}>
                    <AppNavigator />
                </View>
            </ImageBackground>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: "100%",
        height: "100%",
        justifyContent: "center", // Garante que o conteúdo está centrado
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.7)", // Ajusta a opacidade para suavizar o padrão
    },
});