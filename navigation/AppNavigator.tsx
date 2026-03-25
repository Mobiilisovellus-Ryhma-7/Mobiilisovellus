import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainPage from '../screens/main/mainpage';
import Select from '../screens/main/select';
import Search from '../screens/main/search';
import Login from '../screens/auth/login';
import Register from '../screens/auth/register';
import Profile from '../screens/user/profile';

export type RootStackParamList = {
  main: undefined;
  select: undefined;
  search: undefined;
  login: undefined;
  register: undefined;
  profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
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
            onOpenProfile={() => navigation.navigate('profile')}
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
        {({ navigation }) => <Search onBack={() => navigation.goBack()} />}
      </Stack.Screen>

      <Stack.Screen name="login">
        {({ navigation }) => (
          <Login
            onBack={() => navigation.goBack()}
            onRegister={() => navigation.navigate('register')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="register">
        {({ navigation }) => <Register onGoLogin={() => navigation.navigate('login')} />}
      </Stack.Screen>

      <Stack.Screen name="profile">
        {({ navigation }) => <Profile onBack={() => navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
