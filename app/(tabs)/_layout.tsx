import { Tabs } from 'expo-router';
import { Colors, FontFamilies } from '../../constants/theme';
import { Platform } from 'react-native';

// Tab icon SVG paths (inline, no icon library needed)
function HomeIcon({ color }: { color: string }) {
  const Svg = require('react-native-svg').Svg;
  const Path = require('react-native-svg').Path;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
}

function ScanIcon({ color }: { color: string }) {
  const Svg = require('react-native-svg').Svg;
  const Path = require('react-native-svg').Path;
  const Circle = require('react-native-svg').Circle;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <Circle cx={12} cy={13} r={3} />
    </Svg>
  );
}

function HistoryIcon({ color }: { color: string }) {
  const Svg = require('react-native-svg').Svg;
  const Path = require('react-native-svg').Path;
  const Circle = require('react-native-svg').Circle;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 6v6l4 2" />
    </Svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  const Svg = require('react-native-svg').Svg;
  const Path = require('react-native-svg').Path;
  const Circle = require('react-native-svg').Circle;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </Svg>
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
          paddingTop: 4,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          height: Platform.OS === 'ios' ? 82 : 64,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamilies.bodyMed,
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '掃描',
          tabBarIcon: ({ color }) => <ScanIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '歷史',
          tabBarIcon: ({ color }) => <HistoryIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
