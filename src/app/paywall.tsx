import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { ArrowLeft, BadgeCheck, Check, Sparkles } from "lucide-react-native";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import { Wordmark } from "@/components/Wordmark";
import {
  getSubscription,
  getTrialInfo,
  PLANS,
  saveSubscription,
  YEARLY_PER_MONTH,
  YEARLY_SAVINGS,
  YEARLY_SAVINGS_PCT,
  type PlanId,
  type Subscription,
  type TrialInfo,
} from "@/utils/subscription";
import { FONT_CLIP_FIX, FONT_CLIP_FIX_BOLD } from "@/utils/androidText";

const FEATURES = [
  "Unlimited weekly meal plans",
  "Every recipe, scaled to your servings",
  "Auto-built grocery lists & one-tap ordering",
  "Share plans and recipes on WhatsApp",
];

function PlanCard({
  plan,
  selected,
  onPress,
}: {
  plan: PlanId;
  selected: boolean;
  onPress: () => void;
}) {
  const meta = PLANS[plan];
  const isYearly = plan === "yearly";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`rounded-2xl border-2 bg-card p-4 ${
        selected ? "border-primary" : "border-border"
      }`}
    >
      {isYearly ? (
        <View className="absolute -top-3 left-4 rounded-full bg-primary px-2.5 py-1">
          <Text
            className="text-[10px] leading-3 font-bold tracking-widest text-primary-foreground uppercase"
            style={FONT_CLIP_FIX_BOLD}
          >
            Recommended · Save {YEARLY_SAVINGS_PCT}%
          </Text>
        </View>
      ) : null}
      <View className="flex-row items-center gap-3">
        <View
          className={`h-5 w-5 rounded-full border-2 items-center justify-center ${
            selected ? "border-primary bg-primary" : "border-border"
          }`}
        >
          {selected ? (
            <Icon icon={Check} size={12} color={ICON_COLORS.primaryForeground} />
          ) : null}
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-base font-semibold text-foreground" style={FONT_CLIP_FIX}>
            {meta.label}
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            {isYearly
              ? `≈ ₹${YEARLY_PER_MONTH}/month · save ₹${YEARLY_SAVINGS} vs monthly`
              : "Billed every month · cancel anytime"}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-xl font-bold text-foreground tabular-nums"
            style={FONT_CLIP_FIX_BOLD}
          >
            ₹{meta.price}
          </Text>
          <Text className="text-xs text-muted-foreground">/{meta.per}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Subscription screen: shown from Profile anytime, and enforced by the
 * week screen once the 3 free weeks are over. No billing backend exists
 * yet — continuing records the plan on-device (demo).
 */
export default function Paywall() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PlanId>("yearly");
  const [trial, setTrial] = useState<TrialInfo | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getTrialInfo(db).then(setTrial);
    void getSubscription(db).then(setSub);
  }, [db]);

  const locked = trial?.expired === true && sub === null;

  const subscribe = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveSubscription(db, selected);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Back is only offered while the trial is active (or already subscribed). */}
      {!locked ? (
        <View className="px-5 pt-4">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            hitSlop={8}
            accessibilityLabel="Back"
            className="h-10 w-10 rounded-full border border-border bg-card items-center justify-center"
          >
            <Icon icon={ArrowLeft} size="sm" color={ICON_COLORS.foreground} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 96 + Math.max(insets.bottom, 12),
        }}
      >
        <View className="items-center mt-6">
          <Image
            source={require("../../assets/splash-icon.png")}
            style={{ width: 72, height: 74 }}
            accessibilityIgnoresInvertColors
          />
          <Wordmark
            className="text-2xl font-bold tracking-tight text-foreground mt-3"
            style={FONT_CLIP_FIX_BOLD}
          />
          <Text
            className="text-2xl font-bold tracking-tight text-foreground text-center mt-5"
            style={FONT_CLIP_FIX_BOLD}
          >
            {sub
              ? "You're subscribed"
              : locked
                ? "Your 3 free weeks are up"
                : "Keep your weeks Eezy"}
          </Text>
          <Text className="text-sm text-muted-foreground text-center mt-2 leading-relaxed px-4">
            {sub
              ? `You're on the ${PLANS[sub.plan].label.toLowerCase()} plan. Thanks for cooking with us!`
              : locked
                ? "Loved planning your meals? Pick a plan and keep the weeks coming."
                : trial
                  ? `You have ${trial.daysLeft} free ${
                      trial.daysLeft === 1 ? "day" : "days"
                    } left. Subscribe anytime — the plan starts when your trial ends.`
                  : ""}
          </Text>
        </View>

        {/* Features */}
        <View className="rounded-2xl border border-border bg-card p-4 mt-6">
          {FEATURES.map((f, i) => (
            <View
              key={f}
              className={`flex-row items-center gap-3 ${i > 0 ? "mt-3" : ""}`}
            >
              <View className="h-6 w-6 rounded-full bg-success/10 items-center justify-center">
                <Icon icon={BadgeCheck} size={14} color="#2f7d45" />
              </View>
              <Text className="flex-1 text-sm text-foreground/90">{f}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        {!sub ? (
          <View className="mt-6" style={{ gap: 14 }}>
            <PlanCard
              plan="yearly"
              selected={selected === "yearly"}
              onPress={() => {
                void Haptics.selectionAsync();
                setSelected("yearly");
              }}
            />
            <PlanCard
              plan="monthly"
              selected={selected === "monthly"}
              onPress={() => {
                void Haptics.selectionAsync();
                setSelected("monthly");
              }}
            />
            <Text className="text-xs text-muted-foreground text-center mt-1 leading-relaxed">
              Cancel anytime. Demo build — no payment is charged; choosing a
              plan activates it on this device.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky CTA */}
      {!sub ? (
        <View
          className="absolute left-0 right-0 bottom-0 border-t border-border bg-background px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <Pressable
            onPress={() => void subscribe()}
            accessibilityRole="button"
            className="h-14 rounded-full bg-primary flex-row items-center justify-center gap-2"
            style={{
              shadowColor: "#503c28",
              shadowOpacity: 0.35,
              shadowRadius: 15,
              shadowOffset: { width: 0, height: 10 },
              elevation: 5,
            }}
          >
            <Icon icon={Sparkles} size="sm" color={ICON_COLORS.primaryForeground} />
            <Text
              className="text-base font-semibold text-primary-foreground"
              style={FONT_CLIP_FIX}
            >
              {busy
                ? "Activating…"
                : `Continue — ₹${PLANS[selected].price}/${PLANS[selected].per}`}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
