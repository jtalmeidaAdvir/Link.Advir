
import { useEffect, useState } from 'react';
import OneSignalService from '../services/oneSignalService';

export const useNotifications = (userNome, userId) => {
    const [isPermissionGranted, setIsPermissionGranted] = useState(false);
    const [oneSignalUserId, setOneSignalUserId] = useState(null);

    useEffect(() => {
        const initializeNotifications = async () => {
            try {
                // Inicializar OneSignal
                await OneSignalService.initialize();

                // Verificar se já tem permissão
                if (window.OneSignal) {
                    const permission = await window.OneSignal.Notifications.permission;
                    setIsPermissionGranted(permission);

                    if (permission) {
                        // Obter ID do usuário OneSignal
                        const osUserId = await OneSignalService.getUserId();
                        setOneSignalUserId(osUserId);

                        // Definir tags do usuário
                        if (userNome && userId) {
                            await OneSignalService.setUserTags({
                                'user_id': userId,
                                'user_name': userNome,
                                'notification_type': 'registo_ponto'
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Erro ao inicializar notificações:', error);
            }
        };

        if (userNome && userId) {
            initializeNotifications();
        }
    }, [userNome, userId]);

    const requestNotificationPermission = async () => {
        try {
            const permission = await OneSignalService.requestPermission();
            setIsPermissionGranted(permission);

            if (permission) {
                const osUserId = await OneSignalService.getUserId();
                setOneSignalUserId(osUserId);

                // Definir tags após obter permissão
                if (userNome && userId) {
                    await OneSignalService.setUserTags({
                        'user_id': userId,
                        'user_name': userNome,
                        'notification_type': 'registo_ponto'
                    });
                }
            }

            return permission;
        } catch (error) {
            console.error('Erro ao solicitar permissão:', error);
            return false;
        }
    };

    const scheduleRegistoPontoReminder = async () => {
        try {
            if (!oneSignalUserId) {
                console.warn('OneSignal User ID não disponível');
                return false;
            }

            // Aqui você faria uma chamada para o seu backend
            // que agendaria a notificação usando a API do OneSignal
            const response = await fetch(`https://backend.advir.pt/api/notifications/schedule-registo-ponto`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`
                },
                body: JSON.stringify({
                    oneSignalUserId: oneSignalUserId,
                    userName: userNome,
                    userId: userId
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Erro ao agendar lembrete:', error);
            return false;
        }
    };

    return {
        isPermissionGranted,
        oneSignalUserId,
        requestNotificationPermission,
        scheduleRegistoPontoReminder
    };
};
