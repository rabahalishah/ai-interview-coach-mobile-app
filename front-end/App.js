import { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { AudioModule, setAudioModeAsync } from 'expo-audio';
import { authService } from './services/authService';
import { profileService } from './services/profileService';
import LoginScreen from './components/LoginScreen';
// ProfileForm and InterviewHistory moved to Profile and History screens
import styles from './src/styles/appStyles';
import { Ionicons } from '@expo/vector-icons';


import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import RecordScreen from './screens/RecordScreen';
import PracticeScreen from './screens/PracticeScreen';
import HistoryScreen from './screens/HistoryScreen';
import HistoryDetailScreen from './screens/HistoryDetailScreen';
import ProfileScreen from './screens/ProfileScreen';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: '',
    currentJobIndustry: '',
    currentJobTitle: '',
    targetJobIndustry: '',
    targetJobIndustryName: 'Please select an option',
    targetJobTitle: '',
    resumeUploaded: false,
    interviewHistory: [
      {
        id: 'sample-1',
        date: new Date().toISOString(),
        industry: 'Behavioral',
        jobTitle: 'Product Manager Mock',
        transcription: 'Interviewer: Tell me about a time you handled a difficult stakeholder.\nYou: In my previous role, I led the redesign of our core product...',
        feedback: '92/100\nStrong opening context with STAR method. Tone was confident; work on pacing.',
        sessionType: 'Live Record',
      },
      {
        id: 'sample-2',
        date: new Date(Date.now() - 86400000).toISOString(),
        industry: 'System Design',
        jobTitle: 'System Design Practice',
        transcription: 'Interviewer: Walk me through your system design approach.\nYou: I would start with requirements...',
        feedback: '87/100\nGood high-level structure. Add more details on scalability and trade-offs.',
        sessionType: 'Practice',
      },
    ],
  });


  const [industries, setIndustries] = useState([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [showIndustryModal, setShowIndustryModal] = useState(false);

  const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  // Check if user is already logged in
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      console.log('Checking login status...');
      const user = await authService.checkLoginStatus();
      // console.log('User from storage:', user);

      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        await loadUserProfile(user.username);
      }
    } catch (error) {
      console.error('Error in checkLoginStatus:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (username) => {
    try {
      // console.log('Loading profile for:', username);
      const loadedProfile = await profileService.loadProfile(username);
      // console.log('Loaded profile:', loadedProfile);

      if (loadedProfile) {
        setProfile(loadedProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveUserProfile = async () => {
    if (!currentUser) return;
    await profileService.saveProfile(currentUser.username, profile);
  };

  // Save profile whenever key data changes
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      saveUserProfile();
    }
  }, [profile]);

  const handleResumeUpload = async (file) => {
    // Lightweight stub for resume upload: record the filename and mark uploaded.
    // Full PDF -> text processing will be added later. This keeps the app simple and compiles reliably.
    try {
      const resumeName = file?.name || file?.uri || 'uploaded_resume';
      setProfile(prev => ({ ...prev, resumeUploaded: true, resumeName }));
      Alert.alert('Success', 'Resume uploaded (processing deferred).');
    } catch (error) {
      console.error('Resume upload error (stub):', error);
      Alert.alert('Error', 'Failed to record resume upload.');
    }
  };

  const handleLogin = async (mode, credentials) => {
    let result;
    if (mode === 'signup') {
      result = await authService.signup(
        credentials.username,
        credentials.password,
        credentials.fullName
      );
      if (result.success) {
        Alert.alert('Success', 'Account created successfully!');
      }
    } else {
      result = await authService.login(credentials.username, credentials.password);
      if (result.success) {
        Alert.alert('Success', `Welcome back, ${result.user.fullName}!`);
      }
    }

    if (result.success) {
      setCurrentUser(result.user);
      setIsLoggedIn(true);
      if (mode === 'login') {
        await loadUserProfile(result.user.username);
      }
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setIsLoggedIn(false);
    setProfile({
      name: '',
      currentJobIndustry: '',
      currentJobTitle: '',
      targetJobIndustry: '',
      targetJobIndustryName: 'Please select an option',
      targetJobTitle: '',
      resumeUploaded: false,
      interviewHistory: [],
    });
    // cleared profile state
  };


  const handleIndustrySelect = (item) => {
    setProfile(prev => ({
      ...prev,
      targetJobIndustry: item.id,
      targetJobIndustryName: item.label,
    }));
    setShowIndustryModal(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      (async () => {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          Alert.alert('Permission to access microphone was denied');
          // Permission denied; recording UI will handle this state
        }

        setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });

        // Fetch industries from API
        try {
          const response = await fetch('https://api.smartrecruiters.com/v1/industries');
          const data = await response.json();

          if (response.ok) {
            const industryList = Array.isArray(data.content)
              ? data.content
              : Array.isArray(data)
                ? data
                : [];
            setIndustries(industryList);
          } else {
            setIndustries([]);
          }
        } catch (error) {
          console.error('Error fetching industries:', error);
          setIndustries([]);
        } finally {
          setLoadingIndustries(false);
        }
      })();
    }
  }, [isLoggedIn]);

  // Loading screen
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Login/Signup screen
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Main app: render tab navigator when logged in
  const Tab = createBottomTabNavigator();
  const Stack = createNativeStackNavigator();

  const Tabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Live Record') {
            iconName = focused ? 'radio-button-on' : 'radio-button-on-outline';
          } else if (route.name === 'Practice') {
            iconName = focused ? 'chevron-down' : 'chevron-down-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <HomeScreen {...props} profile={profile} />}
      </Tab.Screen>
      <Tab.Screen name="Live Record">
        {(props) => <RecordScreen {...props} profile={profile} setProfile={setProfile} sessionType="live" />}
      </Tab.Screen>
      <Tab.Screen name="Practice">
        {(props) => <PracticeScreen {...props} profile={profile} setProfile={setProfile} sessionType="practice" />}
      </Tab.Screen>
      <Tab.Screen name="History">
        {(props) => <HistoryScreen {...props} profile={profile} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} profile={profile} setProfile={setProfile} />}
      </Tab.Screen>
    </Tab.Navigator>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="MainTabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} options={{ title: 'Session Detail' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// styles are imported from src/styles/appStyles.js