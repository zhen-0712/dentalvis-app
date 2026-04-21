import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { AuthProvider } from '../hooks/useAuth';
import { Colors } from '../constants/theme';
import { View } from 'react-native';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSerifDisplay_400Regular,
    JFOpenHuninn: require('../assets/fonts/jf-openhuninn.ttf'),
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.surface }} />;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" backgroundColor={Colors.surface} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)/login"    options={{ presentation: 'modal' }} />
        <Stack.Screen name="(auth)/register" options={{ presentation: 'modal' }} />
        <Stack.Screen name="viewer"          options={{ presentation: 'fullScreenModal', headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
