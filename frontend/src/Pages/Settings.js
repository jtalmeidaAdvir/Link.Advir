import React from 'react';
import { View, Text, Button } from 'react-native';

const Settings = ({ navigation }) => {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Página Settings</Text>
            <Button title="Go to Home" onPress={() => navigation.navigate('Home')} />
        </View>
    );
};

export default Settings;
