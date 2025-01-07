import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Image, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { List } from 'react-native-paper';
import { FaHome, FaUser, FaTool, FaClock, FaBriefcase, FaSignOutAlt, FaCog } from 'react-icons/fa';
import { FontAwesome } from '@expo/vector-icons';



import 'bootstrap/dist/css/bootstrap.min.css';

// Importa as páginas
import Login from './src/Autenticacao/Login';
import Home from './src/Home';
import ADHome from './src/BackOffice/ADHome';
import Perfil from './src/Perfil';
import PainelAdmin from './src/Autenticacao/PainelAdmin';
import UsersEmpresa from './src/Autenticacao/UsersEmpresa';
import RegistoUser from './src/Autenticacao/RegistoUser';
import RegistoAdmin from './src/Autenticacao/RegistoAdmin';
import VerificaConta from './src/Autenticacao/VerificaConta';
import SelecaoEmpresa from './src/Autenticacao/SelecaoEmpresa';
import RecuperarPassword from './src/Autenticacao/RecuperarPassword';
import RedefinirPassword from './src/Autenticacao/RedefinirPassword';

// SERVICOS
import PedidosAssistencia from './src/Servicos/PedidosAssistencia';
import PandIByTecnico from './src/Servicos/PandIByTecnico';
import RegistoPedido from './src/Servicos/RegistoAssistencia';
import intervencoes from './src/Servicos/Intervencoes';
import RegistoIntervencao from './src/Servicos/RegistoIntervencao';

// ASSIDUIDADE
import LeitorQRCode from './src/Assiduidade/LeitorQRCode';
import PontoBotao from './src/Assiduidade/PontoBotao';
import RegistoPontoAdmin from './src/Assiduidade/RegistoPontoAdmin';
import PedidosAlteracaoAdmin from './src/Assiduidade/PedidosAlteracaoAdmin';
import ListarRegistos from './src/Assiduidade/ListarRegistos';


import Obras from './src/Obras/Obras';
import DetalhesObra from './src/Obras/DetalhesObra';
import AutosMedicaoExecucao from './src/Obras/AutosMedicaoExecucao';
import PartesDiarias from './src/Obras/PartesDiarias';
import AddPartesDiarias from './src/Obras/AddPartesDiarias';


import UserModulesManagement from './src/Autenticacao/UserModulesManagement';
import logo from './assets/img_logo.png';
import i18n from './src/i18n';
import { useTranslation } from 'react-i18next';
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

const CustomDrawerContent = ({ isAdmin, isSuperAdmin, isLoggedIn, modules, ...props }) => {
    const [expanded, setExpanded] = useState(false);
    const { t } = useTranslation();
    const handlePress = () => setExpanded(!expanded);

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
                    icon={() => <FontAwesome name="home"  size={20} color="#0022FF" />}
                />
                <DrawerItem
                    label="RegistoAdmin"
                    onPress={() => props.navigation.navigate('RegistoAdmin')}
                    icon={() => <FontAwesome name="home" size={20} color="#0022FF" />}
                />
                <DrawerItem
                    label="Meu Perfil"
                    onPress={() => props.navigation.navigate('Perfil')}
                    icon={() => <FontAwesome name="user" size={20} color="#0022FF" />}
                />
                <DrawerItem
                    label="Logout"
                    onPress={handleLogout}
                    icon={() => <FontAwesome name="sign-out" size={20} color="#0022FF" />}
                />
            </DrawerContentScrollView>
        );
    }

    // Conteúdo do drawer para outros utilizadores
    const hasServicesModule = modules.some(module => module.nome === "Servicos");
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
                icon={() => <FontAwesome name="home" size={20} color="#0022FF" />}
            />
            {isLoggedIn && (
                <>
                    <DrawerItem
                        label={t("Drawer.SelecaoEmpresa")}
                        onPress={() => props.navigation.navigate('SelecaoEmpresa')}
                        icon={() => <FontAwesome name="briefcase" size={20} color="#0022FF" />}
                    />
                    {hasObrasModule && (
                    <DrawerItem
                            label={t("Drawer.Obra")}
                        onPress={() => props.navigation.navigate('Obras')}
                        icon={() => <FontAwesome name="road" size={20} color="#0022FF" />}
                    />
                    )}
                    {hasServicesModule && (
                        <DrawerItem
                            label=  {t("Drawer.Servicos")}
                            onPress={() => props.navigation.navigate('PedidosAssistencia')}
                            icon={() => <FontAwesome name="wrench" size={20} color="#0022FF" />}
                        />
                        
                    )}
                    {hasServicesModule && (
                        <DrawerItem
                            label=  {t("Drawer.ServicosTecnicos")}
                            onPress={() => props.navigation.navigate('PandIByTecnico')}
                            icon={() => <FontAwesome name="wrench" size={20} color="#0022FF" />}
                        />
                        
                    )}
                    {hasQrCodeAssiduidadeModule && (
                        <DrawerItem
                            label={t("Drawer.PontoQR")}
                            onPress={() => props.navigation.navigate('LeitorQRCode')}
                            icon={() => <FontAwesome name="clock-o" size={20} color="#0022FF" />}
                        />
                    )}
                    {hasBotaoAssiduidadeModule && (
                        <DrawerItem
                            label={t("Drawer.PontoBT")}
                            onPress={() => props.navigation.navigate('PontoBotao')}
                            icon={() => <FontAwesome name="clock-o" size={20} color="#0022FF" />}
                        />
                    )}
                </>
            )}
            <View style={{ flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 20 }}>
                {isAdmin && (
                   <List.Accordion
                        title={t("Drawer.ADM.title")}
                   left={() => (
                       <FontAwesome name="cogs" size={18} color="#0022FF" style={{ marginLeft:15 }} />
                   )}
                   right={() => (
                       <FontAwesome
                           name={expanded ? "angle-down" : "angle-up"} // Seta para cima ou para baixo
                           size={18}
                           
                           color="#0022FF"
                       />
                   )}
                   expanded={expanded}
                   onPress={handlePress}
                   titleStyle={{ fontSize: 14, marginLeft: 0, flexDirection: 'row', alignItems: 'center' }}
               >
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
                        icon={() => <FontAwesome name="user" size={20} color="#0022FF" />}
                    />
                )}
                {localStorage.getItem('loginToken') && (
                    <DrawerItem
                        label={t("Drawer.Exit")}
                        icon={() => <FontAwesome name="sign-out" size={20} color="#0022FF" />}
                        onPress={handleLogout}
                    />
                )}
            </View>
        </DrawerContentScrollView>
    );
};

const AppNavigator = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false); 
    const [username, setUsername] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [modules, setModules] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [languageSelectorVisible, setLanguageSelectorVisible] = useState(false); 
    const [hoveredLanguage, setHoveredLanguage] = useState(null); 
    const fetchUserModules = async () => {
        const token = localStorage.getItem('loginToken');
        const userId = localStorage.getItem('userId');
        if (userId && token) {
            try {
                const response = await fetch(`https://backend.advir.pt/api/users/${userId}/modulos-e-submodulos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setModules(data.modulos);
            } catch (error) {
                console.error("Erro ao buscar módulos:", error);
            }
        }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('loginToken');
            setIsLoggedIn(!!token);
            setIsSuperAdmin(localStorage.getItem('superAdmin') === 'true');
            setIsAdmin(localStorage.getItem('isAdmin') === 'true');
            setUsername(localStorage.getItem('username') || '');
            setEmpresa(localStorage.getItem('empresaSelecionada') || '');

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
                <ActivityIndicator size="large" color="#0022FF" />
                <Text>A carregar...</Text>
            </View>
        );
    }

    return (
        <Drawer.Navigator
            initialRouteName="Login"
            drawerContent={props => (
                <CustomDrawerContent 
                    {...props} 
                    isAdmin={isAdmin} 
                    isSuperAdmin={isSuperAdmin}
                    isLoggedIn={isLoggedIn} 
                    modules={modules} 
                />
            )}
            screenOptions={({ navigation }) => ({
                headerTitle: () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image
                            source={logo}
                            style={{ width: 110, height: 110, resizeMode: 'contain', marginLeft: 10 }}
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
                            <FontAwesome name="user" size={20} color="#0022FF" />
                            <Text style={{ marginLeft: 8, color: '#0022FF', fontSize: 16 }}>{username}</Text>
                            {empresa && (
                                <Text style={{ marginLeft: 15, color: '#0022FF', fontSize: 16 }}>
                                    {empresa}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Botão de Idioma */}
                        <TouchableOpacity
                            onPress={toggleLanguageSelector} // Alterna a visibilidade do combobox de idiomas
                            style={{ marginRight: 10, marginLeft: 10 }}
                        >
                            <Text style={{ color: '#0022FF', fontSize: 16 }}>
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

            <Drawer.Screen name="ListarRegistos" component={ListarRegistos} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="LeitorQRCode" component={LeitorQRCode} />
            <Drawer.Screen name="Obras" component={Obras} />
            <Drawer.Screen name="PontoBotao" component={PontoBotao} />
            <Drawer.Screen name="Perfil">
                {props => (
                    <Perfil {...props} user={{ name: username, company: empresa }} />
                )}
            </Drawer.Screen>
            
            <Drawer.Screen name="PedidosAssistencia" component={PedidosAssistencia} /> 
            <Drawer.Screen name="PandIByTecnico" component={PandIByTecnico} />
            <Drawer.Screen name="RegistoIntervencao" component={RegistoIntervencao} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="DetalhesObra" component={DetalhesObra} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="AutosMedicaoExecucao" component={AutosMedicaoExecucao} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="PartesDiarias" component={PartesDiarias} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="AddPartesDiarias" component={AddPartesDiarias} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="RegistarPedido" component={RegistoPedido} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="Intervencoes" component={intervencoes} options={{ drawerItemStyle: { display: 'none' } }} />

            <Drawer.Screen name="RegistoPontoAdmin" component={RegistoPontoAdmin} />
            <Drawer.Screen name="PedidosAlteracaoAdmin" component={PedidosAlteracaoAdmin} />
            <Drawer.Screen name="UserModulesManagement" component={UserModulesManagement} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="VerificaConta" component={VerificaConta} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="Home" component={Home} />
            {isLoggedIn && (
                <Drawer.Screen name="SelecaoEmpresa">
                    {props => <SelecaoEmpresa {...props} setEmpresa={setEmpresa} />}
                </Drawer.Screen>
            )}
            <Drawer.Screen name="RecuperarPassword" component={RecuperarPassword} options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="RedefinirPassword" component={RedefinirPassword} options={{ drawerItemStyle: { display: 'none' } }} />

            {isAdmin && (
                <>
                    <Drawer.Screen name="PainelAdmin" component={PainelAdmin} />
                    <Drawer.Screen name="UsersEmpresa" component={UsersEmpresa} />
                    <Drawer.Screen name="RegistoUser" component={RegistoUser} />
                </>
            )}
        </Drawer.Navigator>
    );
};

export default function App() {
    return (
        <NavigationContainer linking={linking}>
            <AppNavigator />
        </NavigationContainer>
    );
}
