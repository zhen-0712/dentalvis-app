import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, FontFamilies } from '../../constants/theme';
import { Platform, View, StyleSheet } from 'react-native';

function TabIcon({ name, color, focused }: {
  name: keyof typeof Feather.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <Feather name={name} size={23} color={color} />
      {focused && <View style={styles.dot} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.jade,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.jadeAlpha08,
          borderTopWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamilies.bodyMed,
          fontSize: 10,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '掃描',
          tabBarIcon: ({ color, focused }) => <TabIcon name="camera" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '歷史',
          tabBarIcon: ({ color, focused }) => <TabIcon name="clock" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, focused }) => <TabIcon name="user" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.jade,
  },
});
