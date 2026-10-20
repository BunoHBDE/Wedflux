import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { Loading } from '../src/lib/ui';

function Gate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const inAuth = segments[0] === '(auth)';
  const inOnboarding = segments[0] === '(onboarding)';

  useEffect(() => {
    if (loading) return;
    if (!session && !inAuth && !inOnboarding) router.replace('/onboarding');
    else if (session && inAuth) router.replace('/');
  }, [session, loading, inAuth, inOnboarding, router]);

  return loading ? <Loading /> : <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
