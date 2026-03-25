import { useState } from 'react';
import MainPage from '../screens/main/mainpage';
import Select from '../screens/main/select';
import Search from '../screens/main/search';
import Login from '../screens/auth/login';
import Register from '../screens/auth/register';
import Profile from '../screens/user/profile';

type RouteName = 'main' | 'select' | 'search' | 'login' | 'register' | 'profile';

export default function AppNavigator() {
  const [route, setRoute] = useState<RouteName>('main');

  if (route === 'profile') {
    return <Profile onBack={() => setRoute('main')} />;
  }

  if (route === 'register') {
    return <Register onGoLogin={() => setRoute('login')} />;
  }

  if (route === 'login') {
    return <Login onBack={() => setRoute('main')} onRegister={() => setRoute('register')} />;
  }

  if (route === 'search') {
    return <Search onBack={() => setRoute('select')} />;
  }

  if (route === 'select') {
    return <Select onBack={() => setRoute('main')} onSearch={() => setRoute('search')} />;
  }

  return (
    <MainPage
      onOpenFacilities={() => setRoute('select')}
      onOpenLogin={() => setRoute('login')}
      onOpenProfile={() => setRoute('profile')}
    />
  );
}
