import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SwissColors } from '@/constants/theme';
import { useSignIn } from '@clerk/clerk-expo';

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const onSignInPress = useCallback(async () => {
    if (!isLoaded) return;
    setError('');

    try {
      const signInAttempt = await signIn.create({
        identifier: form.email,
        password: form.password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace('/');
      } else {
        setError("Unable to complete sign in. Please try again.");
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage || err?.message || "Unable to sign in. Please try again.";
      setError(message);
    }
  }, [isLoaded, form.email, form.password, signIn, setActive, router]);

  const handleDashboardRedirect = () => {
    // Redirect to admin-dev for now since Google OAuth is not configured for web
    if (typeof window !== 'undefined') {
      window.location.href = '/admin-dev/drivers';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'SwissColors.background' }}>
      {/* Left side - Form */}
      <View style={{
        flex: 1,
        display: 'flex' as any,
        flexDirection: 'row' as any,
        minHeight: '100vh' as any
      }}>
        {/* Left Panel - Login Form */}
        <View style={{
          flex: 1,
          padding: 48,
          display: 'flex' as any,
          flexDirection: 'column' as any,
          justifyContent: 'center' as any,
          maxWidth: 600,
          margin: '0 auto' as any,
          backgroundColor: '#fff'
        }}>
          <View style={{ marginBottom: 48 }}>
            <Text style={{
              fontSize: 48,
              fontWeight: '800',
              color: 'SwissColors.background',
              marginBottom: 12,
              fontFamily: 'Jakarta-Bold, system-ui, sans-serif',
              letterSpacing: -1
            }}>
              Welcome back
            </Text>
            <Text style={{
              fontSize: 18,
              color: 'SwissColors.textSecondary',
              fontFamily: 'Jakarta-Regular, system-ui, sans-serif'
            }}>
              Sign in to continue your journey
            </Text>
          </View>

          {error ? (
            <View style={{
              backgroundColor: '#fee2e2',
              borderLeftWidth: 4,
              borderLeftColor: 'SwissColors.error',
              padding: 16,
              marginBottom: 24,
              borderRadius: 8
            }}>
              <Text style={{ color: '#991b1b', fontSize: 14 }}>{error}</Text>
            </View>
          ) : null}

          {/* Skip to Admin Button */}
          <Pressable
            onPress={handleDashboardRedirect}
            style={({ pressed }) => ({
              width: '100%',
              padding: 18,
              borderRadius: 16,
              background: pressed
                ? 'linear-gradient(135deg, #12c46b 0%, #0f7a4a 100%)'
                : 'linear-gradient(135deg, #12c46b 0%, #0f7a4a 100%)',
              marginBottom: 32,
              display: 'flex' as any,
              alignItems: 'center' as any,
              justifyContent: 'center' as any,
              cursor: 'pointer' as any,
              boxShadow: '0 10px 25px rgba(18, 196, 107, 0.28)',
              transform: pressed ? 'translateY(1px)' : 'translateY(0)',
            } as any)}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#fff',
              fontFamily: 'Jakarta-Bold, system-ui, sans-serif'
            }}>
              Continue to Dashboard
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={{
            display: 'flex' as any,
            flexDirection: 'row' as any,
            alignItems: 'center' as any,
            marginBottom: 32
          }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'SwissColors.textPrimary' }} />
            <Text style={{
              paddingHorizontal: 16,
              color: 'SwissColors.textMuted',
              fontSize: 14,
              fontFamily: 'Jakarta-Regular, system-ui, sans-serif'
            }}>
              or
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'SwissColors.textPrimary' }} />
          </View>

          {/* Email Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: 'SwissColors.border',
              marginBottom: 8,
              fontFamily: 'Jakarta-SemiBold, system-ui, sans-serif'
            }}>
              Email
            </Text>
            <TextInput
              value={form.email}
              onChangeText={(value) => setForm({ ...form, email: value })}
              placeholder="Enter your email"
              placeholderTextColor="SwissColors.textMuted"
              style={{
                width: '100%',
                padding: 16,
                fontSize: 16,
                borderWidth: 1,
                borderColor: 'SwissColors.textPrimary',
                borderRadius: 12,
                backgroundColor: '#fff',
                outline: 'none' as any,
                fontFamily: 'Jakarta-Regular, system-ui, sans-serif'
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: 'SwissColors.border',
              marginBottom: 8,
              fontFamily: 'Jakarta-SemiBold, system-ui, sans-serif'
            }}>
              Password
            </Text>
            <TextInput
              value={form.password}
              onChangeText={(value) => setForm({ ...form, password: value })}
              placeholder="Enter your password"
              placeholderTextColor="SwissColors.textMuted"
              secureTextEntry
              style={{
                width: '100%',
                padding: 16,
                fontSize: 16,
                borderWidth: 1,
                borderColor: 'SwissColors.textPrimary',
                borderRadius: 12,
                backgroundColor: '#fff',
                outline: 'none' as any,
                fontFamily: 'Jakarta-Regular, system-ui, sans-serif'
              }}
            />
          </View>

          {/* Sign In Button */}
          <Pressable
            onPress={onSignInPress}
            style={({ pressed }) => ({
              width: '100%',
              padding: 18,
              background: pressed
                ? 'linear-gradient(135deg, #12c46b 0%, #0f7a4a 100%)'
                : 'linear-gradient(135deg, #12c46b 0%, #0f7a4a 100%)',
              borderRadius: 16,
              marginBottom: 24,
              cursor: 'pointer' as any,
              boxShadow: '0 8px 20px rgba(18, 196, 107, 0.25)',
            } as any)}
          >
            <Text style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: 16,
              fontWeight: '700',
              fontFamily: 'Jakarta-Bold, system-ui, sans-serif'
            }}>
              Sign in
            </Text>
          </Pressable>

          {/* Sign Up Link */}
          <View style={{
            display: 'flex' as any,
            flexDirection: 'row' as any,
            justifyContent: 'center' as any,
            marginBottom: 24
          }}>
            <Text style={{
              color: 'SwissColors.textMuted',
              fontSize: 14,
              fontFamily: 'Jakarta-Regular, system-ui, sans-serif'
            }}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={{
                color: '#12c46b',
                fontSize: 14,
                fontWeight: '600',
                cursor: 'pointer' as any,
                fontFamily: 'Jakarta-SemiBold, system-ui, sans-serif'
              }}>
                Sign up
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Right Panel - Hero Section */}
        <View style={{
          flex: 1,
          background: 'linear-gradient(135deg, #0b6a42 0%, SwissColors.background 100%)',
          display: 'flex' as any,
          alignItems: 'center' as any,
          justifyContent: 'center' as any,
          padding: 64,
          minWidth: 500,
          position: 'relative' as any,
        } as any}>
          {/* Decorative circles */}
          <View style={{
            position: 'absolute' as any,
            top: '10%',
            right: '10%',
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: 'rgba(18, 196, 107, 0.12)',
          }} />
          <View style={{
            position: 'absolute' as any,
            bottom: '15%',
            left: '15%',
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: 'rgba(18, 196, 107, 0.12)',
          }} />

          <View style={{
            maxWidth: 550,
            alignItems: 'center',
            zIndex: 1
          }}>
            <Text style={{
              fontSize: 64,
              fontWeight: '900',
              color: '#fff',
              marginBottom: 24,
              fontFamily: 'Jakarta-Bold, system-ui, sans-serif',
              letterSpacing: -2,
              lineHeight: 72
            }}>
              Rydo
            </Text>
            <Text style={{
              fontSize: 24,
              color: 'rgba(255, 255, 255, 0.95)',
              lineHeight: 38,
              fontFamily: 'Jakarta-Medium, system-ui, sans-serif',
              marginBottom: 48
            }}>
              Your journey starts here. Safe, reliable, and affordable rides at your fingertips.
            </Text>

            {/* Features */}
            <View style={{
              display: 'flex' as any,
              flexDirection: 'column' as any,
              gap: 20,
              alignItems: 'flex-start' as any,
              marginTop: 40
            }}>
              {['Real-time tracking', 'Verified drivers', 'Secure payments'].map((feature, i) => (
                <View key={i} style={{
                  display: 'flex' as any,
                  flexDirection: 'row' as any,
                  alignItems: 'center' as any,
                  gap: 12
                }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(18, 196, 107, 0.22)',
                    display: 'flex' as any,
                    alignItems: 'center' as any,
                    justifyContent: 'center' as any
                  }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{'\u2713'}</Text>
                  </View>
                  <Text style={{
                    color: '#fff',
                    fontSize: 18,
                    fontFamily: 'Jakarta-Medium, system-ui, sans-serif'
                  }}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SignIn;

