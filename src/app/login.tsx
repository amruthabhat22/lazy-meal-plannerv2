import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Mail, Phone, ShieldCheck } from "lucide-react-native";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useSessionStore } from "@/state/useSessionStore";
import { normalizePhone } from "@/utils/contacts";
import { DEMO_OTP, type SignInMethod } from "@/utils/session";
import { FONT_CLIP_FIX, FONT_CLIP_FIX_BOLD } from "@/utils/androidText";
import { PLACEHOLDER_COLOR } from "@/utils/colors";

type Step =
  | { kind: "landing" }
  | { kind: "phone" }
  | { kind: "otp"; phone: string }
  | { kind: "email" }
  | { kind: "name"; method: SignInMethod; phone?: string; email?: string };

const inputStyle =
  "rounded-xl bg-muted px-3.5 py-3 text-[15px] text-foreground";

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-xs font-medium text-muted-foreground mb-1.5 mt-3">
      {children}
    </Text>
  );
}

/**
 * Sign-in screen. The app is fully offline — no auth backend exists — so
 * every method is a local, demo-grade sign-in: the phone flow accepts the
 * demo OTP (no SMS is sent), Google is simulated, and email/password is
 * stored-name-only. Real providers need a backend + credentials.
 */
export default function Login() {
  const db = useSQLiteContext();
  const signIn = useSessionStore((s) => s.signIn);

  const [step, setStep] = useState<Step>({ kind: "landing" });
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = async (
    method: SignInMethod,
    extra: { phone?: string; email?: string },
  ) => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await signIn(db, { name, method, ...extra });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Every fresh sign-in walks through onboarding; if preferences
      // already exist its sliders start from them and finishing simply
      // rebuilds the plan.
      router.replace("/onboarding");
    } finally {
      setBusy(false);
    }
  };

  const phoneDigits = normalizePhone(phone);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {step.kind !== "landing" ? (
            <Pressable
              onPress={() => {
                setOtp("");
                setStep(
                  step.kind === "otp" ? { kind: "phone" } : { kind: "landing" },
                );
              }}
              hitSlop={8}
              accessibilityLabel="Back"
              className="h-10 w-10 rounded-full border border-border bg-card items-center justify-center"
            >
              <Icon icon={ArrowLeft} size="sm" color={ICON_COLORS.foreground} />
            </Pressable>
          ) : null}

          {/* Brand */}
          <View className="items-center mt-10 mb-8">
            <Image
              source={require("../../assets/splash-icon.png")}
              style={{ width: 96, height: 98 }}
              accessibilityIgnoresInvertColors
            />
            <Text
              className="text-3xl font-bold tracking-tight text-foreground mt-4"
              style={FONT_CLIP_FIX_BOLD}
            >
              EezyMeals
            </Text>
            <Text className="text-base text-muted-foreground mt-1 text-center">
              A week of protein-first meals, planned in minutes.
            </Text>
          </View>

          {step.kind === "landing" ? (
            <View style={{ gap: 12 }}>
              <Button
                label="Continue with Phone"
                icon={Phone}
                onPress={() => setStep({ kind: "phone" })}
              />
              <Pressable
                onPress={() => setStep({ kind: "name", method: "google" })}
                accessibilityRole="button"
                className="h-14 rounded-full border border-border bg-card flex-row items-center justify-center gap-2.5"
              >
                <Text className="text-lg font-bold text-primary" style={FONT_CLIP_FIX_BOLD}>
                  G
                </Text>
                <Text className="text-base font-semibold text-foreground" style={FONT_CLIP_FIX}>
                  Continue with Google
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setStep({ kind: "email" })}
                accessibilityRole="button"
                className="h-14 rounded-full border border-border bg-card flex-row items-center justify-center gap-2.5"
              >
                <Icon icon={Mail} size="sm" color={ICON_COLORS.foreground} />
                <Text className="text-base font-semibold text-foreground" style={FONT_CLIP_FIX}>
                  Continue with Email
                </Text>
              </Pressable>
              <Text className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
                Everything stays on your phone — no account is created on any
                server.
              </Text>
            </View>
          ) : null}

          {step.kind === "phone" ? (
            <View className="rounded-2xl border border-border bg-card p-4">
              <Text className="text-lg font-semibold text-foreground" style={FONT_CLIP_FIX}>
                Sign in with phone
              </Text>
              <FieldLabel>Phone number (with country code)</FieldLabel>
              <TextInput
                className={inputStyle}
                placeholder="+91 98765 43210"
                placeholderTextColor={PLACEHOLDER_COLOR}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
              <View className="mt-4">
                <Button
                  label="Send OTP"
                  rounded="xl"
                  height={48}
                  disabled={phoneDigits.length < 8}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setStep({ kind: "otp", phone: phoneDigits });
                  }}
                />
              </View>
            </View>
          ) : null}

          {step.kind === "otp" ? (
            <View className="rounded-2xl border border-border bg-card p-4">
              <Text className="text-lg font-semibold text-foreground" style={FONT_CLIP_FIX}>
                Enter the OTP
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">
                Sent to +{step.phone}
              </Text>
              <FieldLabel>6-digit code</FieldLabel>
              <TextInput
                className={`${inputStyle} tracking-[8px] text-center text-xl`}
                placeholder="••••••"
                placeholderTextColor={PLACEHOLDER_COLOR}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                autoFocus
              />
              <View className="flex-row items-center gap-2 rounded-xl bg-accent/60 border border-accent px-3 py-2.5 mt-3">
                <Icon
                  icon={ShieldCheck}
                  size="sm"
                  color={ICON_COLORS.accentForeground}
                />
                <Text className="flex-1 text-xs leading-snug text-accent-foreground">
                  Demo build — no SMS is sent. Use code {DEMO_OTP}.
                </Text>
              </View>
              <View className="mt-4">
                <Button
                  label="Verify"
                  rounded="xl"
                  height={48}
                  disabled={otp.length !== 6}
                  onPress={() => {
                    if (otp === DEMO_OTP) {
                      setStep({
                        kind: "name",
                        method: "phone",
                        phone: step.phone,
                      });
                    } else {
                      Alert.alert(
                        "Wrong code",
                        `This demo accepts only ${DEMO_OTP}.`,
                      );
                    }
                  }}
                />
              </View>
            </View>
          ) : null}

          {step.kind === "email" ? (
            <View className="rounded-2xl border border-border bg-card p-4">
              <Text className="text-lg font-semibold text-foreground" style={FONT_CLIP_FIX}>
                Sign in with email
              </Text>
              <FieldLabel>Email</FieldLabel>
              <TextInput
                className={inputStyle}
                placeholder="you@example.com"
                placeholderTextColor={PLACEHOLDER_COLOR}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                autoFocus
              />
              <FieldLabel>Password</FieldLabel>
              <TextInput
                className={inputStyle}
                placeholder="At least 6 characters"
                placeholderTextColor={PLACEHOLDER_COLOR}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <View className="mt-4">
                <Button
                  label="Continue"
                  rounded="xl"
                  height={48}
                  disabled={!/^\S+@\S+\.\S+$/.test(email) || password.length < 6}
                  onPress={() =>
                    setStep({ kind: "name", method: "email", email })
                  }
                />
              </View>
            </View>
          ) : null}

          {step.kind === "name" ? (
            <View className="rounded-2xl border border-border bg-card p-4">
              <Text className="text-lg font-semibold text-foreground" style={FONT_CLIP_FIX}>
                What should we call you?
              </Text>
              {step.method === "google" ? (
                <Text className="text-xs text-muted-foreground mt-1">
                  Demo build — Google isn't contacted; your name stays on this
                  phone.
                </Text>
              ) : null}
              <FieldLabel>Your name</FieldLabel>
              <TextInput
                className={inputStyle}
                placeholder="e.g. Amrutha"
                placeholderTextColor={PLACEHOLDER_COLOR}
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <View className="mt-4">
                <Button
                  label={busy ? "Signing in…" : "Let's plan my week"}
                  rounded="xl"
                  height={48}
                  disabled={!name.trim() || busy}
                  onPress={() =>
                    void finish(step.method, {
                      phone: step.phone,
                      email: step.email,
                    })
                  }
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
