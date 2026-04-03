import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import MainPage from '../screens/main/mainpage';
import Select from '../screens/main/select';
import Search from '../screens/main/search';
import Login from '../screens/auth/login';
import Register from '../screens/auth/register';
import ForgotPassword from '../screens/auth/forgotpassword';
import Profile from '../screens/user/profile';
import { auth } from '../services/firebase';

export type RootStackParamList = {
  main: undefined;
  select: undefined;
  search: undefined;
  login: undefined;
  forgotPassword: undefined;
  register: undefined;
  profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isSignedIn, setIsSignedIn] = React.useState(false);

  React.useEffect(() => {
    if (!auth) {
      setIsSignedIn(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
    });

    return unsubscribe;
  }, []);

  return (
    <Stack.Navigator
      initialRouteName="main"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="main">
        {({ navigation }) => (
          <MainPage
            onOpenFacilities={() => navigation.navigate('select')}
            onOpenLogin={() => navigation.navigate('login')}
            onOpenProfile={() => navigation.navigate(isSignedIn ? 'profile' : 'login')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="select">
        {({ navigation }) => (
          <Select
            onBack={() => navigation.goBack()}
            onSearch={() => navigation.navigate('search')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="search">
        {({ navigation }) => (
          <Search
            onBack={() => navigation.goBack()}
            onGoHome={() => navigation.navigate('main')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="login">
        {({ navigation }) => (
          <Login
            onBack={() => navigation.goBack()}
            onGoHome={() => navigation.navigate('main')}
            onForgotPassword={() => navigation.navigate('forgotPassword')}
            onLogin={() => navigation.navigate('main')}
            onRegister={() => navigation.navigate('register')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="forgotPassword">
        {({ navigation }) => (
          <ForgotPassword
            onBack={() => navigation.goBack()}
            onGoHome={() => navigation.navigate('main')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="register">
        {({ navigation }) => (
          <Register
            onBack={() => navigation.goBack()}
            onGoHome={() => navigation.navigate('main')}
            onRegister={() => navigation.navigate('profile')}
            onGoLogin={() => navigation.navigate('login')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="profile">
        {({ navigation }) => (
          <Profile
            onBack={() => navigation.goBack()}
            onGoHome={() => navigation.navigate('main')}
            onSignOut={() => navigation.reset({ index: 0, routes: [{ name: 'main' }] })}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
